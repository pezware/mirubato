/**
 * Rate Limiting Middleware for Dictionary API
 */

import { Context, Next } from 'hono'
import { Env } from '../types/env'
import { HTTPException } from 'hono/http-exception'

export interface RateLimitOptions {
  windowMs?: number // Time window in milliseconds
  max?: number // Max requests per window
  keyGenerator?: (c: Context) => string
  skip?: (c: Context) => boolean
  handler?: (c: Context) => Response | Promise<Response>
  headers?: boolean // Send rate limit headers
  message?: string
}

/**
 * Rate limit middleware using Cloudflare KV
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000, // 1 minute default
    max = 100, // 100 requests per window
    keyGenerator,
    skip,
    handler,
    headers = true,
    message = 'Too many requests, please try again later',
  } = options

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Skip if condition is met
    if (skip && skip(c)) {
      return await next()
    }

    // Generate rate limit key
    const key = keyGenerator ? keyGenerator(c) : generateDefaultKey(c)
    const rateLimitKey = `ratelimit:${key}`

    try {
      // Get current count
      const record = (await c.env.CACHE.get(
        rateLimitKey,
        'json'
      )) as RateLimitRecord | null
      const now = Date.now()

      let count = 0
      let resetTime = now + windowMs

      if (record && record.resetTime > now) {
        // Window still active
        count = record.count
        resetTime = record.resetTime
      } else {
        // New window
        count = 0
      }

      // Increment count
      count++

      // Check if limit exceeded
      if (count > max) {
        // Add rate limit headers
        if (headers) {
          c.header('X-RateLimit-Limit', max.toString())
          c.header('X-RateLimit-Remaining', '0')
          c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())
          c.header(
            'Retry-After',
            Math.ceil((resetTime - now) / 1000).toString()
          )
        }

        // Use custom handler if provided
        if (handler) {
          return await handler(c)
        }

        // Default rate limit response
        throw new HTTPException(429, {
          message,
          res: c.json(
            {
              error: 'Too Many Requests',
              message,
              retryAfter: Math.ceil((resetTime - now) / 1000),
            },
            429
          ),
        })
      }

      // Update count in KV
      const ttl = Math.ceil((resetTime - now) / 1000)
      await c.env.CACHE.put(
        rateLimitKey,
        JSON.stringify({ count, resetTime } as RateLimitRecord),
        { expirationTtl: ttl }
      )

      // Add rate limit headers
      if (headers) {
        c.header('X-RateLimit-Limit', max.toString())
        c.header('X-RateLimit-Remaining', (max - count).toString())
        c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())
      }

      // Continue with request
      await next()
    } catch (error) {
      // Re-throw HTTP exceptions
      if (error instanceof HTTPException) {
        throw error
      }

      // Log other errors but don't block request
      console.error('Rate limit error:', error)
      await next()
    }
  }
}

/**
 * Tiered rate limiting with different limits based on user type
 */
export function tieredRateLimit(tiers: {
  anonymous?: RateLimitOptions
  authenticated?: RateLimitOptions
  premium?: RateLimitOptions
}) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get('userId' as any)
    const userTier = c.get('userTier' as any) || 'anonymous'

    let options: RateLimitOptions | undefined

    if (!userId && tiers.anonymous) {
      options = tiers.anonymous
    } else if (userId && userTier === 'premium' && tiers.premium) {
      options = tiers.premium
    } else if (userId && tiers.authenticated) {
      options = tiers.authenticated
    }

    if (options) {
      const middleware = rateLimit(options)
      return await middleware(c, next)
    }

    await next()
  }
}

/**
 * API key based rate limiting
 */
export function apiKeyRateLimit(
  options: RateLimitOptions & {
    apiKeyHeader?: string
    apiKeyLimits?: Record<string, number>
  } = {}
) {
  const {
    apiKeyHeader = 'X-API-Key',
    apiKeyLimits = {},
    ...rateLimitOptions
  } = options

  return rateLimit({
    ...rateLimitOptions,
    keyGenerator: c => {
      const apiKey = c.req.header(apiKeyHeader)
      if (apiKey && apiKeyLimits[apiKey]) {
        // Use API key specific limit
        return `apikey:${apiKey}`
      }
      // Fall back to default key generation
      return generateDefaultKey(c)
    },
    max: rateLimitOptions.max || 100,
  } as RateLimitOptions)
}

/**
 * Sliding window rate limiter for more accurate limiting
 */
export function slidingWindowRateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000,
    max = 100,
    keyGenerator,
    skip,
    headers = true,
  } = options

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    if (skip && skip(c)) {
      return await next()
    }

    const key = keyGenerator ? keyGenerator(c) : generateDefaultKey(c)
    const baseKey = `sliding:${key}`
    const now = Date.now()
    const windowStart = now - windowMs

    try {
      // Get all request timestamps in the current window
      const requests: number[] = []
      const list = await c.env.CACHE.list({ prefix: `${baseKey}:` })

      for (const key of list.keys) {
        const timestamp = parseInt(key.name.split(':').pop() || '0')
        if (timestamp > windowStart) {
          requests.push(timestamp)
        } else {
          // Clean up old entries
          await c.env.CACHE.delete(key.name)
        }
      }

      // Check limit
      if (requests.length >= max) {
        const oldestRequest = Math.min(...requests)
        const resetTime = oldestRequest + windowMs

        if (headers) {
          c.header('X-RateLimit-Limit', max.toString())
          c.header('X-RateLimit-Remaining', '0')
          c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())
        }

        throw new HTTPException(429, { message: options.message })
      }

      // Add current request
      const requestKey = `${baseKey}:${now}`
      await c.env.CACHE.put(requestKey, '1', {
        expirationTtl: Math.ceil(windowMs / 1000),
      })

      if (headers) {
        c.header('X-RateLimit-Limit', max.toString())
        c.header(
          'X-RateLimit-Remaining',
          (max - requests.length - 1).toString()
        )
      }

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      console.error('Sliding window rate limit error:', error)
      await next()
    }
  }
}

/**
 * Generate default rate limit key
 */
function generateDefaultKey(c: Context): string {
  // Try to get user ID first
  const userId = c.get('userId' as any)
  if (userId) {
    return `user:${userId}`
  }

  // Try to get API key
  const apiKey = c.req.header('X-API-Key')
  if (apiKey) {
    return `api:${apiKey.substring(0, 16)}`
  }

  // Fall back to IP address
  const ip =
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0] ||
    'unknown'

  return `ip:${ip}`
}

interface RateLimitRecord {
  count: number
  resetTime: number
}

/**
 * Progressive rate limiting that increases delays for repeated violations
 */
export function progressiveRateLimit(
  options: RateLimitOptions & {
    backoffMultiplier?: number
    maxBackoff?: number
  } = {}
) {
  const { backoffMultiplier = 2, maxBackoff = 300000, ...baseOptions } = options

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const key = baseOptions.keyGenerator
      ? baseOptions.keyGenerator(c)
      : generateDefaultKey(c)
    const violationKey = `violations:${key}`

    try {
      // Check for previous violations
      const violations = (await c.env.CACHE.get(
        violationKey,
        'json'
      )) as ViolationRecord | null

      if (violations && violations.backoffUntil > Date.now()) {
        const remainingBackoff = Math.ceil(
          (violations.backoffUntil - Date.now()) / 1000
        )

        c.header('Retry-After', remainingBackoff.toString())
        throw new HTTPException(429, {
          message: `Rate limit exceeded. Backoff period active: ${remainingBackoff}s remaining`,
        })
      }

      // Apply base rate limiting
      const baseMiddleware = rateLimit(baseOptions)

      try {
        await baseMiddleware(c, next)

        // Clear violations on successful request
        if (violations) {
          await c.env.CACHE.delete(violationKey)
        }
      } catch (error) {
        if (error instanceof HTTPException && error.status === 429) {
          // Rate limit exceeded - apply progressive backoff
          const currentViolations = violations?.count || 0
          const newBackoff = Math.min(
            (baseOptions.windowMs || 60000) *
              Math.pow(backoffMultiplier, currentViolations),
            maxBackoff
          )

          const newViolation: ViolationRecord = {
            count: currentViolations + 1,
            backoffUntil: Date.now() + newBackoff,
            lastViolation: Date.now(),
          }

          await c.env.CACHE.put(violationKey, JSON.stringify(newViolation), {
            expirationTtl: Math.ceil(newBackoff / 1000),
          })

          c.header('X-RateLimit-Violation-Count', newViolation.count.toString())
          c.header(
            'X-RateLimit-Backoff-Until',
            new Date(newViolation.backoffUntil).toISOString()
          )
        }

        throw error
      }
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      console.error('Progressive rate limit error:', error)
      await next()
    }
  }
}

interface ViolationRecord {
  count: number
  backoffUntil: number
  lastViolation: number
}
