import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { Env } from '../types'

/**
 * Validate request body against a Zod schema
 */
export const validateBody = <T extends z.ZodType>(schema: T) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
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
  })
}

/**
 * Validate query parameters against a Zod schema
 */
export const validateQuery = <T extends z.ZodType>(schema: T) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
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
  })
}

/**
 * Validate route parameters against a Zod schema
 */
export const validateParams = <T extends z.ZodType>(schema: T) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
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
  })
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
 * Get validated body from request
 */
export function getValidatedBody<T>(c: any): T {
  return c.req.bodyCache as T
}

/**
 * Get validated query from context
 */
export function getValidatedQuery<T>(c: any): T {
  return c.get('validatedQuery') as T
}

/**
 * Get validated params from context
 */
export function getValidatedParams<T>(c: any): T {
  return c.get('validatedParams') as T
}
