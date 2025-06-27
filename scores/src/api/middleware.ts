import { Context, Next } from 'hono'
import { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCookie } from 'hono/cookie'
import { verifyToken } from '../utils/auth'
import {
  addCacheHeaders,
  getCachedResponse,
  cacheResponse,
} from '../utils/cache'

// Rate limiting using KV
export async function rateLimiter(c: Context<{ Bindings: Env }>, next: Next) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const key = `rate_limit:${ip}`

  // Get current count
  const current = await c.env.CACHE.get(key)
  const count = current ? parseInt(current) : 0

  // Check limit (100 requests per minute)
  if (count >= 100) {
    throw new HTTPException(429, {
      message: 'Too many requests. Please try again later.',
    })
  }

  // Increment count
  await c.env.CACHE.put(key, (count + 1).toString(), {
    expirationTtl: 60, // 1 minute
  })

  await next()
}

// Cache middleware for GET requests - uses both KV and Edge caching
export async function cacheMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
) {
  // Only cache GET requests
  if (c.req.method !== 'GET') {
    return next()
  }

  // Skip caching for authenticated requests
  if (c.req.header('Authorization') || getCookie(c, 'auth-token')) {
    return next()
  }

  // Check Cloudflare edge cache first
  const cachedResponse = await getCachedResponse(c.req.raw, c)
  if (cachedResponse) {
    return cachedResponse
  }

  // Check KV cache as fallback
  const cacheKey = `cache:${c.req.url}`
  const cached = await c.env.CACHE.get(cacheKey)
  if (cached) {
    const data = JSON.parse(cached)
    // Create response with cache headers
    const jsonResponse = new Response(JSON.stringify(data.body), {
      status: data.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const cachedResponse = addCacheHeaders(jsonResponse, 'application/json', {
      isPublic: true,
    })
    // Also cache in edge for next time
    await cacheResponse(c.req.raw, cachedResponse.clone(), c)
    return cachedResponse
  }

  // Proceed with request
  await next()

  // Cache successful responses
  if (c.res.status === 200) {
    try {
      // Clone response to read body
      const clonedResponse = c.res.clone()
      const body = await clonedResponse.json()

      // Store in KV cache
      await c.env.CACHE.put(
        cacheKey,
        JSON.stringify({
          body,
          status: c.res.status,
        }),
        {
          expirationTtl: 300, // 5 minutes
        }
      )

      // Add cache headers to original response
      const newHeaders = new Headers(c.res.headers)
      const cacheConfig = {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'CDN-Cache-Control': 'public, max-age=300',
      }
      Object.entries(cacheConfig).forEach(([key, value]) => {
        newHeaders.set(key, value)
      })

      // Create new response with cache headers
      const cachedResponse = new Response(c.res.body, {
        status: c.res.status,
        statusText: c.res.statusText,
        headers: newHeaders,
      })

      // Cache at edge
      await cacheResponse(c.req.raw, cachedResponse.clone(), c)

      // Update the context response
      c.res = cachedResponse
    } catch (error) {
      // Don't fail the request if caching fails
      console.warn('Failed to cache response:', error)
    }
  }
}

// Request logging
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now()
  const method = c.req.method
  const path = new URL(c.req.url).pathname

  await next()

  const duration = Date.now() - start
  console.warn(`${method} ${path} - ${c.res.status} (${duration}ms)`)
}

// CORS headers for specific routes
export function corsHeaders(origin: string | null) {
  const headers = new Headers()

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin)
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  headers.set('Access-Control-Allow-Credentials', 'true')

  return headers
}

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
 * Uses the same JWT_SECRET as the main API service
 */
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env
  Variables: Variables
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, 'auth-token')

  const token = authHeader?.replace('Bearer ', '') || cookieToken

  if (!token) {
    throw new HTTPException(401, {
      message: 'No authentication token provided',
    })
  }

  if (!c.env.JWT_SECRET) {
    throw new HTTPException(500, {
      message: 'JWT secret not configured',
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
 * Optional authentication middleware
 * Sets user context if token is provided and valid, but doesn't require it
 */
export const optionalAuthMiddleware: MiddlewareHandler<{
  Bindings: Env
  Variables: Partial<Variables>
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, 'auth-token')

  const token = authHeader?.replace('Bearer ', '') || cookieToken

  if (token && c.env.JWT_SECRET) {
    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET)

      // Add user info to context variables
      c.set('userId', payload.sub as string)
      c.set('user', {
        id: payload.sub as string,
        email: payload.email as string,
      })
    } catch (error) {
      // Ignore auth errors for optional auth
      console.warn('Optional auth failed:', error)
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
