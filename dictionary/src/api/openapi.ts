import { OpenAPIHono, z } from '@hono/zod-openapi'
import { Env } from '../types/env'
import { SERVICE_VERSION } from '../utils/version'

// Create OpenAPI app instance
export const createOpenAPIApp = () => {
  const app = new OpenAPIHono<{ Bindings: Env }>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: 'Validation error',
            details: result.error.flatten(),
          },
          400
        )
      }
    },
  })

  // Configure OpenAPI documentation
  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'Mirubato Dictionary API',
      version: SERVICE_VERSION,
      description: 'AI-powered music terminology dictionary service',
    },
    servers: [
      {
        url: 'https://dictionary.mirubato.com',
        description: 'Production server',
      },
      {
        url: 'https://dictionary-staging.mirubato.com',
        description: 'Staging server',
      },
      {
        url: 'http://dictionary-mirubato.localhost:9799',
        description: 'Local development server',
      },
    ],
    tags: [
      {
        name: 'Terms',
        description: 'Dictionary term operations',
      },
      {
        name: 'Search',
        description: 'Search operations',
      },
      {
        name: 'Analytics',
        description: 'Analytics and insights',
      },
      {
        name: 'Admin',
        description: 'Administrative operations',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  })

  return app
}

// Common schemas
export const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.string(),
  details: z.any().optional(), // Must use z.any() for OpenAPI schema generation
})

export const SuccessResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.any(), // Must use z.any() for OpenAPI schema generation
  metadata: z
    .object({
      timestamp: z.string(),
      version: z.string().optional(),
    })
    .optional(),
})

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z
    .enum(['relevance', 'alphabetical', 'recent', 'score'])
    .default('relevance'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export const DictionaryEntrySchema = z.object({
  id: z.string(),
  term: z.string(),
  normalizedTerm: z.string(),
  type: z.string(),
  instrument: z.string().optional(),
  difficultyLevel: z.string().optional(),
  conciseDefinition: z.string(),
  detailedDefinition: z.string(),
  etymology: z.string().optional(),
  usageExample: z.string().optional(),
  pronunciation: z
    .object({
      ipa: z.string().optional(),
      syllables: z.array(z.string()).optional(),
      stressPattern: z.string().optional(),
    })
    .optional(),
  scores: z
    .object({
      overall: z.number().min(0).max(100),
      accuracy: z.number().min(0).max(100),
      clarity: z.number().min(0).max(100),
      completeness: z.number().min(0).max(100),
      educationalValue: z.number().min(0).max(100),
    })
    .optional(),
  relatedTerms: z
    .array(
      z.object({
        term: z.string(),
        relationship: z.enum([
          'synonym',
          'antonym',
          'see_also',
          'broader',
          'narrower',
        ]),
        relevance: z.number().min(0).max(1),
      })
    )
    .optional(),
  externalReferences: z
    .array(
      z.object({
        type: z.string(),
        title: z.string(),
        url: z.string().url(),
      })
    )
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
