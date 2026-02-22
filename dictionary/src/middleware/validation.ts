/**
 * Validation middleware using Zod schemas
 */

import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { Env, Variables } from '../types/env'

/**
 * Validate request body against a Zod schema
 */
export const validateBody = <T extends z.ZodType>(schema: T) => {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(
    async (c, next) => {
      try {
        const body = await c.req.json()
        const validated = schema.parse(body)

        // Replace request body with validated data
        c.req.bodyCache = validated

        await next()
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new HTTPException(400, {
            message: 'Validation failed',
            cause: error.errors,
          })
        }
        throw error
      }
    }
  )
}

/**
 * Validate query parameters against a Zod schema
 */
export const validateQuery = <T extends z.ZodType>(schema: T) => {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(
    async (c, next) => {
      try {
        const query = c.req.query()
        const validated = schema.parse(query)

        // Store validated query params
        c.set('validatedQuery', validated)

        await next()
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new HTTPException(400, {
            message: 'Invalid query parameters',
            cause: error.errors,
          })
        }
        throw error
      }
    }
  )
}

/**
 * Validate route parameters against a Zod schema
 */
export const validateParams = <T extends z.ZodType>(schema: T) => {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(
    async (c, next) => {
      try {
        const params = c.req.param()
        const validated = schema.parse(params)

        // Store validated params
        c.set('validatedParams', validated)

        await next()
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new HTTPException(400, {
            message: 'Invalid route parameters',
            cause: error.errors,
          })
        }
        throw error
      }
    }
  )
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc'),
  }),

  // Search
  search: z.object({
    q: z.string().min(1).max(200),
    type: z.enum(['term', 'definition', 'all']).optional().default('all'),
    limit: z.coerce.number().int().positive().max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }),

  // UUID
  uuid: z.string().uuid(),

  // ID (string or number)
  id: z.union([z.string().min(1), z.coerce.number().int().positive()]),

  // Date range
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
}

/**
 * Dictionary-specific validation schemas
 */
export const dictionarySchemas = {
  // Term parameter
  term: z.object({
    term: z.string().min(1).max(200),
  }),

  // Batch query
  batchQuery: z.object({
    terms: z.array(z.string().min(1).max(200)).min(1).max(50),
    options: z
      .object({
        force_refresh: z.boolean().optional(),
        include_low_quality: z.boolean().optional(),
        min_quality_score: z.number().min(0).max(100).optional(),
      })
      .optional(),
  }),

  // Semantic search
  semanticSearch: z.object({
    query: z.string().min(1).max(500),
    limit: z.number().int().positive().max(50).default(10),
    similarity_threshold: z.number().min(0).max(1).default(0.7),
  }),

  // Enhancement request
  enhanceRequest: z.object({
    mode: z.enum(['batch', 'single']),
    term: z.string().optional(),
    criteria: z
      .object({
        min_age_days: z.number().int().positive().optional(),
        max_quality_score: z.number().min(0).max(100).optional(),
        limit: z.number().int().positive().max(1000).optional(),
      })
      .optional(),
  }),

  // Feedback submission
  feedback: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    suggestions: z.array(z.string().max(200)).optional(),
  }),

  // Export options
  exportOptions: z.object({
    format: z.enum(['json', 'csv', 'sqlite']).default('json'),
    min_quality: z.coerce.number().min(0).max(100).optional(),
    types: z.string().optional(), // Comma-separated types
    include_metadata: z.boolean().default(true),
  }),
}

/**
 * Get validated body from request
 */
export function getValidatedBody<T>(c: Context): T {
  return (c.req as unknown as { bodyCache: T }).bodyCache
}

/**
 * Get validated query from context
 */
export function getValidatedQuery<T>(c: Context): T {
  return c.get('validatedQuery' as never) as T
}

/**
 * Get validated params from context
 */
export function getValidatedParams<T>(c: Context): T {
  return c.get('validatedParams' as never) as T
}
