import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { Env } from '../../types/env'
import { createDb } from '../../db'
import {
  dictionaryEntries,
  type NewDictionaryEntry,
} from '../../db/schema/dictionary'
import { eq, like, and, or, desc, asc } from 'drizzle-orm'
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
  DictionaryEntrySchema,
  PaginationSchema,
} from '../openapi'
import { DictionaryGenerator } from '../../services/ai/dictionary-generator'
import { TermType } from '../../types/dictionary'

const app = new OpenAPIHono<{ Bindings: Env }>()

// Helper function to format database entry for API response
function formatDictionaryEntry(result: any) {
  return {
    id: result.id,
    type: result.type,
    term: result.term,
    normalizedTerm: result.normalizedTerm,
    conciseDefinition: result.conciseDefinition,
    detailedDefinition: result.detailedDefinition,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    instrument: result.instrument || undefined,
    difficultyLevel: result.difficultyLevel || undefined,
    etymology: result.etymology || undefined,
    usageExample: result.usageExample || undefined,
    status: result.status || 'draft',
    language: result.language || 'en',
    region: result.region || undefined,
    historicalPeriod: result.historical_period || undefined,
    version: result.version,
    previousVersionId: result.previousVersionId || undefined,
    pronunciation: result.pronunciationIpa
      ? {
          ipa: result.pronunciationIpa,
          syllables: result.pronunciationSyllables
            ? JSON.parse(result.pronunciationSyllables)
            : undefined,
          stressPattern: result.pronunciationStressPattern || undefined,
        }
      : undefined,
    scores: {
      overall: result.overallScore || 0,
      accuracy: result.accuracyScore || 0,
      clarity: result.clarityScore || 0,
      completeness: result.completenessScore || 0,
      educationalValue: result.educationalValueScore || 0,
    },
    relatedTerms: result.relatedTerms
      ? JSON.parse(result.relatedTerms)
      : undefined,
    externalReferences: result.externalReferences
      ? JSON.parse(result.externalReferences)
      : undefined,
    notableExamples: result.notableExamples
      ? JSON.parse(result.notableExamples)
      : undefined,
    commonMisconceptions: result.commonMisconceptions
      ? JSON.parse(result.commonMisconceptions)
      : undefined,
    learningTips: result.learningTips
      ? JSON.parse(result.learningTips)
      : undefined,
    culturalContext: result.culturalContext
      ? JSON.parse(result.culturalContext)
      : undefined,
  }
}

// Get term by ID or slug
const getTermRoute = createRoute({
  method: 'get',
  path: '/api/v1/terms/{term}',
  tags: ['Terms'],
  summary: 'Get a dictionary term',
  description: 'Retrieve a single dictionary term by ID or slug',
  request: {
    params: z.object({
      term: z.string().describe('Term ID or slug'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema.extend({
            data: DictionaryEntrySchema,
          }),
        },
      },
      description: 'Term found',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Term not found',
    },
  },
})

app.openapi(getTermRoute, async c => {
  const { term } = c.req.valid('param')
  const db = createDb(c.env.DB)

  // Try to find by ID first, then by normalized term
  const entry = await db
    .select()
    .from(dictionaryEntries)
    .where(
      or(
        eq(dictionaryEntries.id, term),
        eq(
          dictionaryEntries.normalizedTerm,
          term.toLowerCase().replace(/\s+/g, '_')
        )
      )
    )
    .limit(1)

  if (!entry || entry.length === 0) {
    return c.json(
      {
        success: false,
        error: 'Term not found',
        details: {
          term,
          normalized_term: term.toLowerCase().replace(/\s+/g, '_'),
          suggestions: [], // TODO: Add fuzzy search suggestions
        },
      },
      404
    )
  }

  // Parse JSON fields
  const result = entry[0]
  const formattedEntry = formatDictionaryEntry(result)

  return c.json(
    {
      success: true,
      data: formattedEntry,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    },
    200
  )
})

// Create new term
const createTermRoute = createRoute({
  method: 'post',
  path: '/api/v1/terms',
  tags: ['Terms'],
  summary: 'Create a new dictionary term',
  description: 'Generate and store a new dictionary term definition using AI',
  middleware: async (c, next) => {
    // Add auth middleware here if needed
    await next()
  },
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            term: z.string().min(1).max(200),
            type: z.string().default('general'),
            instrument: z.string().optional(),
            difficultyLevel: z
              .enum(['beginner', 'intermediate', 'advanced'])
              .optional(),
            language: z.string().default('en'),
            generateRelated: z.boolean().default(true),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema.extend({
            data: DictionaryEntrySchema,
          }),
        },
      },
      description: 'Term created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Term already exists',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

app.openapi(createTermRoute, async c => {
  const body = c.req.valid('json')
  const db = createDb(c.env.DB)

  // Check if term already exists
  const normalizedTerm = body.term.toLowerCase().replace(/\s+/g, '_')
  const existing = await db
    .select()
    .from(dictionaryEntries)
    .where(eq(dictionaryEntries.normalizedTerm, normalizedTerm))
    .limit(1)

  if (existing && existing.length > 0) {
    return c.json(
      {
        success: false,
        error: 'Term already exists',
        details: {
          id: existing[0].id,
          term: existing[0].term,
        },
      },
      409
    )
  }

  // Generate definition using AI
  const generator = new DictionaryGenerator(c.env)

  try {
    const generatedEntry = await generator.generateEntry({
      term: body.term,
      type: body.type as TermType,
      context: {
        instruments: body.instrument ? [body.instrument] : undefined,
        difficulty_level: body.difficultyLevel,
      },
    })

    if (!generatedEntry) {
      return c.json(
        {
          success: false,
          error: 'Failed to generate definition',
          details: 'AI generation returned null',
        },
        500
      )
    }

    // Create entry
    const entry: NewDictionaryEntry = {
      id: generatedEntry.id,
      term: body.term,
      normalizedTerm,
      type: body.type,
      instrument: body.instrument || null,
      difficultyLevel: body.difficultyLevel || null,
      conciseDefinition: generatedEntry.definition.concise,
      detailedDefinition: generatedEntry.definition.detailed,
      etymology: generatedEntry.definition.etymology || null,
      usageExample: generatedEntry.definition.usage_example || null,
      pronunciationIpa: generatedEntry.definition.pronunciation?.ipa || null,
      pronunciationSyllables: generatedEntry.definition.pronunciation?.syllables
        ? JSON.stringify(generatedEntry.definition.pronunciation.syllables)
        : null,
      pronunciationStressPattern:
        generatedEntry.definition.pronunciation?.stress_pattern || null,
      overallScore: generatedEntry.quality_score.overall,
      accuracyScore: generatedEntry.quality_score.accuracy_verification,
      clarityScore: generatedEntry.quality_score.definition_clarity,
      completenessScore: generatedEntry.quality_score.reference_completeness,
      educationalValueScore: 0,
      status: 'published',
      language: body.language || 'en',
      relatedTerms:
        body.generateRelated && generatedEntry.metadata.related_terms
          ? JSON.stringify(generatedEntry.metadata.related_terms)
          : null,
      externalReferences: generatedEntry.references
        ? JSON.stringify(generatedEntry.references)
        : null,
      generationMetadata: JSON.stringify({
        timestamp: new Date().toISOString(),
      }),
    }

    await db.insert(dictionaryEntries).values(entry)

    // Format response - use the database result after insert
    const [insertedEntry] = await db
      .select()
      .from(dictionaryEntries)
      .where(eq(dictionaryEntries.id, entry.id))
      .limit(1)

    const formattedEntry = formatDictionaryEntry(insertedEntry)

    return c.json(
      {
        success: true,
        data: formattedEntry,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      },
      201
    )
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to generate definition',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// List terms with pagination and filtering
const listTermsRoute = createRoute({
  method: 'get',
  path: '/api/v1/terms',
  tags: ['Terms'],
  summary: 'List dictionary terms',
  description:
    'Get a paginated list of dictionary terms with optional filtering',
  request: {
    query: PaginationSchema.extend({
      type: z.string().optional(),
      instrument: z.string().optional(),
      difficultyLevel: z
        .enum(['beginner', 'intermediate', 'advanced'])
        .optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              items: z.array(DictionaryEntrySchema),
              pagination: z.object({
                page: z.number(),
                limit: z.number(),
                total: z.number(),
                totalPages: z.number(),
              }),
            }),
          }),
        },
      },
      description: 'List of terms',
    },
  },
})

app.openapi(listTermsRoute, async c => {
  const query = c.req.valid('query')
  const db = createDb(c.env.DB)

  // Build where conditions
  const conditions = []

  if (query.type) {
    conditions.push(eq(dictionaryEntries.type, query.type))
  }

  if (query.instrument) {
    conditions.push(eq(dictionaryEntries.instrument, query.instrument))
  }

  if (query.difficultyLevel) {
    conditions.push(
      eq(dictionaryEntries.difficultyLevel, query.difficultyLevel)
    )
  }

  if (query.status) {
    conditions.push(eq(dictionaryEntries.status, query.status))
  }

  if (query.search) {
    const searchTerm = `%${query.search}%`
    conditions.push(
      or(
        like(dictionaryEntries.term, searchTerm),
        like(dictionaryEntries.conciseDefinition, searchTerm),
        like(dictionaryEntries.detailedDefinition, searchTerm)
      )
    )
  }

  // Get total count
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  const totalQuery = await db
    .select({ count: dictionaryEntries.id })
    .from(dictionaryEntries)
    .where(whereClause)

  const total = totalQuery.length
  const totalPages = Math.ceil(total / query.limit)

  // Get paginated results
  const offset = (query.page - 1) * query.limit
  const orderBy =
    query.sort === 'alphabetical'
      ? query.order === 'desc'
        ? desc(dictionaryEntries.term)
        : asc(dictionaryEntries.term)
      : query.sort === 'recent'
        ? query.order === 'desc'
          ? desc(dictionaryEntries.createdAt)
          : asc(dictionaryEntries.createdAt)
        : query.sort === 'score'
          ? query.order === 'desc'
            ? desc(dictionaryEntries.overallScore)
            : asc(dictionaryEntries.overallScore)
          : desc(dictionaryEntries.overallScore) // Default to relevance (score)

  const results = await db
    .select()
    .from(dictionaryEntries)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(query.limit)
    .offset(offset)

  // Format results
  const formattedResults = results.map(formatDictionaryEntry)

  return c.json({
    success: true,
    data: {
      items: formattedResults,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  })
})

export default app
