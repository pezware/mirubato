import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'
import type { Env, JWTPayload } from '../types'

/**
 * JWT authentication middleware
 * Validates JWT tokens using the shared secret
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7)
    if (!token) {
      throw new HTTPException(401, { message: 'No token provided' })
    }

    // Verify JWT
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    // Store payload in context
    c.set('jwtPayload', payload as JWTPayload)

    await next()
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }

    // Handle JWT verification errors
    const message = error instanceof Error ? error.message : 'Invalid token'
    throw new HTTPException(401, { message })
  }
})

/**
 * Optional auth middleware
 * Validates JWT if present but doesn't require it
 */
export const optionalAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      if (token) {
        const secret = new TextEncoder().encode(c.env.JWT_SECRET)
        const { payload } = await jwtVerify(token, secret, {
          algorithms: ['HS256'],
        })
        c.set('jwtPayload', payload as JWTPayload)
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
    console.warn('Optional auth failed:', error)
  }

  await next()
})

/**
 * Get user ID from JWT payload
 */
export function getUserId(c: any): string | null {
  const payload = c.get('jwtPayload') as JWTPayload | undefined
  return payload?.sub || null
}

/**
 * Require user to be authenticated
 */
export function requireAuth(c: any): string {
  const userId = getUserId(c)
  if (!userId) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }
  return userId
}
