import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

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

// Cache middleware for GET requests
export async function cacheMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
) {
  // Only cache GET requests
  if (c.req.method !== 'GET') {
    return next()
  }

  const cacheKey = `cache:${c.req.url}`

  // Check cache
  const cached = await c.env.CACHE.get(cacheKey)
  if (cached) {
    const data = JSON.parse(cached)
    return c.json(data.body, data.status)
  }

  // Proceed with request
  await next()

  // Cache successful responses
  if (c.res.status === 200) {
    const body = await c.res.json()
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
  }
}

// Request logging
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now()
  const method = c.req.method
  const path = new URL(c.req.url).pathname

  await next()

  const duration = Date.now() - start
  console.log(`${method} ${path} - ${c.res.status} (${duration}ms)`)
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
