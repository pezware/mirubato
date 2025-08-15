import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../types'

interface RateLimitOptions {
  requests: number
  window: number // seconds
  keyPrefix?: string
}

/**
 * Rate limiting middleware using KV storage
 * Implements sliding window algorithm
 */
export const rateLimiter = (options: RateLimitOptions) => {
  const { requests, window, keyPrefix = 'rate-limit' } = options

  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    // Skip rate limiting in local environment
    if (c.env.ENVIRONMENT === 'local') {
      await next()
      return
    }

    // Get client identifier (IP or user ID)
    const clientIp = c.req.header('CF-Connecting-IP') || 'unknown'
    const userId = c.get('jwtPayload')?.sub
    const identifier = userId || clientIp

    // Create rate limit key
    const key = `${keyPrefix}:${identifier}:${c.req.path}`

    try {
      // Get current count from KV
      const data = (await c.env.CACHE.get(key, 'json')) as { count: number; resetAt: number } | null

      const now = Date.now()
      const resetAt = now + window * 1000

      if (!data || now > data.resetAt) {
        // First request or window expired
        await c.env.CACHE.put(key, JSON.stringify({ count: 1, resetAt }), { expirationTtl: window })
      } else if (data.count >= requests) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((data.resetAt - now) / 1000)
        c.header('Retry-After', retryAfter.toString())
        c.header('X-RateLimit-Limit', requests.toString())
        c.header('X-RateLimit-Remaining', '0')
        c.header('X-RateLimit-Reset', data.resetAt.toString())

        throw new HTTPException(429, {
          message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
        })
      } else {
        // Increment counter
        await c.env.CACHE.put(
          key,
          JSON.stringify({ count: data.count + 1, resetAt: data.resetAt }),
          { expirationTtl: Math.ceil((data.resetAt - now) / 1000) }
        )

        // Set rate limit headers
        c.header('X-RateLimit-Limit', requests.toString())
        c.header('X-RateLimit-Remaining', (requests - data.count - 1).toString())
        c.header('X-RateLimit-Reset', data.resetAt.toString())
      }

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }

      // Log error but don't block request on rate limit errors
      console.error('Rate limit error:', error)
      await next()
    }
  })
}

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = rateLimiter({
  requests: 5,
  window: 300, // 5 minutes
  keyPrefix: 'strict-limit',
})

/**
 * Standard rate limiter for general API usage
 */
export const standardRateLimiter = rateLimiter({
  requests: 60,
  window: 60, // 1 minute
  keyPrefix: 'standard-limit',
})
