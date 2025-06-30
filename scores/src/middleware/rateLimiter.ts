import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
  keyGenerator?: (c: Context) => string // Function to generate rate limit key
  skipSuccessfulRequests?: boolean // Skip counting successful requests
  skipFailedRequests?: boolean // Skip counting failed requests
}

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    keyGenerator = c => c.req.header('cf-connecting-ip') || 'anonymous',
    skipSuccessfulRequests = false,
    skipFailedRequests = true,
  } = config

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const key = `rate_limit:${keyGenerator(c)}`
    const now = Date.now()
    const windowStart = now - windowMs

    try {
      // Get current count from KV
      const data = await c.env.CACHE.get(key, { type: 'json' })
      let requests: number[] = data ? (data as number[]) : []

      // Filter out old requests outside the window
      requests = requests.filter(timestamp => timestamp > windowStart)

      // Check if limit exceeded
      if (requests.length >= max) {
        const resetTime = Math.min(...requests) + windowMs
        const retryAfter = Math.ceil((resetTime - now) / 1000)

        c.header('X-RateLimit-Limit', max.toString())
        c.header('X-RateLimit-Remaining', '0')
        c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())
        c.header('Retry-After', retryAfter.toString())

        throw new HTTPException(429, {
          message: 'Too many requests. Please try again later.',
        })
      }

      // Add current request timestamp
      requests.push(now)

      // Store updated count
      await c.env.CACHE.put(key, JSON.stringify(requests), {
        expirationTtl: Math.ceil(windowMs / 1000),
      })

      // Add rate limit headers
      c.header('X-RateLimit-Limit', max.toString())
      c.header('X-RateLimit-Remaining', (max - requests.length).toString())
      c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString())

      // Process request
      await next()

      // If skipSuccessfulRequests is true and request was successful, remove this request
      if (skipSuccessfulRequests && c.res.status < 400) {
        requests.pop()
        await c.env.CACHE.put(key, JSON.stringify(requests), {
          expirationTtl: Math.ceil(windowMs / 1000),
        })
      }
    } catch (error) {
      if (error instanceof HTTPException && error.status === 429) {
        throw error
      }

      // If skipFailedRequests is false and request failed, ensure it's counted
      if (!skipFailedRequests && error instanceof HTTPException) {
        // Request is already counted
      }

      throw error
    }
  }
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // For expensive operations like PDF rendering
  strict: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
  }),

  // For normal API endpoints
  standard: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
  }),

  // For authenticated users (using user ID as key)
  authenticated: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    keyGenerator: c =>
      c.get('userId') || c.req.header('cf-connecting-ip') || 'anonymous',
  }),

  // Per-score rate limiting
  perScore: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute per score
    keyGenerator: c => {
      const scoreId = c.req.param('scoreId') || 'unknown'
      const ip = c.req.header('cf-connecting-ip') || 'anonymous'
      return `${ip}:${scoreId}`
    },
  }),
}
