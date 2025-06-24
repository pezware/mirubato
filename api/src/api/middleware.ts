import { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCookie } from 'hono/cookie'
import { verifyToken } from '../utils/auth'
import type { Env } from '../index'

// Define the variables that will be set by middleware
export type Variables = {
  userId: string
  user: {
    id: string
    email: string
  }
  validatedBody?: unknown
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user to context
 */
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env
  Variables: Variables
}> = async (c, next) => {
  // Skip auth in test mode for integration tests
  if (
    c.env.ENVIRONMENT === 'test' &&
    c.req.header('Authorization') === 'Bearer test-integration-token'
  ) {
    c.set('userId', 'test-user-123')
    c.set('user', {
      id: 'test-user-123',
      email: 'test@example.com',
    })
    await next()
    return
  }

  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, 'auth-token')

  const token = authHeader?.replace('Bearer ', '') || cookieToken

  if (!token) {
    throw new HTTPException(401, {
      message: 'No authentication token provided',
    })
  }

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET)

    // Add user info to context variables
    c.set('userId', payload.sub as string)
    c.set('user', {
      id: payload.sub as string,
      email: payload.email as string,
    })

    await next()
  } catch (error) {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }
}

/**
 * Rate limiting middleware
 * Uses Cloudflare's rate limiter if available
 */
export const rateLimitMiddleware: MiddlewareHandler<{
  Bindings: Env
}> = async (c, next) => {
  if (c.env.RATE_LIMITER) {
    const { success } = await c.env.RATE_LIMITER.limit({
      key: c.req.header('CF-Connecting-IP') || 'anonymous',
    })

    if (!success) {
      throw new HTTPException(429, { message: 'Too many requests' })
    }
  }

  await next()
}

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a schema
 */
export function validateBody<T>(schema: {
  parse: (data: unknown) => T
}): MiddlewareHandler<{
  Bindings: Env
  Variables: Variables
}> {
  return async (c, next) => {
    try {
      const body = await c.req.json()
      const validated = schema.parse(body)
      c.set('validatedBody', validated)
      await next()
    } catch (error) {
      throw new HTTPException(400, {
        message: 'Invalid request body',
        cause: error,
      })
    }
  }
}
