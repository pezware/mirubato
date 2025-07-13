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
import { CloudflareAIService } from '../../services/ai/cloudflare-ai-service'
import { DictionaryGenerator } from '../../services/ai/dictionary-generator'
import { generateId } from '../../utils/id'

const app = new OpenAPIHono<{ Bindings: Env }>()

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
        data: {
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
  const formattedEntry = {
    ...result,
    pronunciation: result.pronunciationIpa
      ? {
          ipa: result.pronunciationIpa,
          syllables: result.pronunciationSyllables
            ? JSON.parse(result.pronunciationSyllables)
            : undefined,
          stressPattern: result.pronunciationStressPattern,
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
  }

  return c.json({
    success: true,
    data: formattedEntry,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  })
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
  const aiService = new CloudflareAIService(c.env)
  const generator = new DictionaryGenerator(aiService, db, c.env.CACHE)

  try {
    const definition = await generator.generateDefinition(
      body.term,
      body.type,
      {
        instruments: body.instrument ? [body.instrument] : undefined,
        difficulty_level: body.difficultyLevel,
      }
    )

    // Create entry
    const entry: NewDictionaryEntry = {
      id: generateId(),
      term: body.term,
      normalizedTerm,
      type: body.type,
      instrument: body.instrument,
      difficultyLevel: body.difficultyLevel,
      conciseDefinition: definition.concise,
      detailedDefinition: definition.detailed,
      etymology: definition.etymology,
      usageExample: definition.usage_example,
      pronunciationIpa: definition.pronunciation?.ipa,
      pronunciationSyllables: definition.pronunciation?.syllables
        ? JSON.stringify(definition.pronunciation.syllables)
        : undefined,
      pronunciationStressPattern: definition.pronunciation?.stress_pattern,
      overallScore: definition.quality_score,
      status: 'published',
      language: body.language,
      relatedTerms:
        body.generateRelated && definition.related_terms
          ? JSON.stringify(definition.related_terms)
          : undefined,
      externalReferences: definition.references
        ? JSON.stringify(definition.references)
        : undefined,
      generationMetadata: JSON.stringify({
        model: definition.model_used,
        latency: definition.generation_time_ms,
        timestamp: new Date().toISOString(),
      }),
    }

    await db.insert(dictionaryEntries).values(entry)

    // Format response
    const formattedEntry = {
      ...entry,
      pronunciation: definition.pronunciation,
      scores: {
        overall: definition.quality_score || 0,
        accuracy: 0,
        clarity: 0,
        completeness: 0,
        educationalValue: 0,
      },
      relatedTerms: definition.related_terms,
      externalReferences: definition.references,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

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
  const formattedResults = results.map(result => ({
    ...result,
    pronunciation: result.pronunciationIpa
      ? {
          ipa: result.pronunciationIpa,
          syllables: result.pronunciationSyllables
            ? JSON.parse(result.pronunciationSyllables)
            : undefined,
          stressPattern: result.pronunciationStressPattern,
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
  }))

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
