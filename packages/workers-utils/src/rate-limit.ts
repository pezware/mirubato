/**
 * Rate Limiting Middleware for Cloudflare Workers
 * Supports multiple strategies: fixed window, tiered, sliding window, progressive
 */

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

/**
 * Environment bindings required for rate limiting
 * Services using this must provide a KV namespace bound as CACHE
 */
export interface RateLimitEnv {
  CACHE: KVNamespace
}

export interface RateLimitOptions {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number
  /** Max requests per window (default: 100) */
  max?: number
  /** Function to generate rate limit key */
  keyGenerator?: (c: Context) => string
  /** Function to skip rate limiting for certain requests */
  skip?: (c: Context) => boolean
  /** Custom handler for rate limit exceeded */
  handler?: (c: Context) => Response | Promise<Response>
  /** Send rate limit headers (default: true) */
  headers?: boolean
  /** Custom rate limit exceeded message */
  message?: string
}

interface RateLimitRecord {
  count: number
  resetTime: number
}

interface ViolationRecord {
  count: number
  backoffUntil: number
  lastViolation: number
}

/**
 * Generate default rate limit key based on user ID or IP
 */
function generateDefaultKey(c: Context): string {
  // Try to get user ID first
  const userId = c.get('userId' as never)
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const ip =
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0] ||
    'unknown'

  return `ip:${ip}`
}

/**
 * Basic fixed-window rate limiter using Cloudflare KV
 *
 * @example
 * ```ts
 * app.use('/api/*', rateLimit({ max: 100, windowMs: 60000 }))
 * ```
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000,
    max = 100,
    keyGenerator,
    skip,
    handler,
    headers = true,
    message = 'Too many requests, please try again later',
  } = options

  return async (c: Context<{ Bindings: RateLimitEnv }>, next: Next) => {
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
        count = record.count
        resetTime = record.resetTime
      } else {
        count = 0
      }

      // Increment count
      count++

      // Check if limit exceeded
      if (count > max) {
        if (headers) {
          c.header('X-RateLimit-Limit', max.toString())
          c.header('X-RateLimit-Remaining', '0')
          c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())
          c.header(
            'Retry-After',
            Math.ceil((resetTime - now) / 1000).toString()
          )
        }

        if (handler) {
          return await handler(c)
        }

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
      const ttl = Math.max(60, Math.ceil((resetTime - now) / 1000))
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

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }
      console.error('Rate limit error:', error)
      await next()
    }
  }
}

/**
 * Tiered rate limiting with different limits based on user type
 *
 * @example
 * ```ts
 * app.use('/api/*', tieredRateLimit({
 *   anonymous: { max: 30, windowMs: 60000 },
 *   authenticated: { max: 100, windowMs: 60000 },
 *   premium: { max: 500, windowMs: 60000 },
 * }))
 * ```
 */
export function tieredRateLimit(tiers: {
  anonymous?: RateLimitOptions
  authenticated?: RateLimitOptions
  premium?: RateLimitOptions
}) {
  return async (c: Context<{ Bindings: RateLimitEnv }>, next: Next) => {
    const userId = c.get('userId' as never)
    const userTier = (c.get('userTier' as never) || 'anonymous') as string

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
 * Sliding window rate limiter for more accurate limiting
 * Stores individual request timestamps for precise window calculation
 *
 * Note: Uses more KV operations than fixed window
 */
export function slidingWindowRateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000,
    max = 100,
    keyGenerator,
    skip,
    headers = true,
    message = 'Too many requests, please try again later',
  } = options

  return async (c: Context<{ Bindings: RateLimitEnv }>, next: Next) => {
    if (skip && skip(c)) {
      return await next()
    }

    const key = keyGenerator ? keyGenerator(c) : generateDefaultKey(c)
    const baseKey = `sliding:${key}`
    const now = Date.now()
    const windowStart = now - windowMs

    try {
      const requests: number[] = []
      const list = await c.env.CACHE.list({ prefix: `${baseKey}:` })

      for (const keyItem of list.keys) {
        const timestamp = parseInt(keyItem.name.split(':').pop() || '0')
        if (timestamp > windowStart) {
          requests.push(timestamp)
        } else {
          await c.env.CACHE.delete(keyItem.name)
        }
      }

      if (requests.length >= max) {
        const oldestRequest = Math.min(...requests)
        const resetTime = oldestRequest + windowMs

        if (headers) {
          c.header('X-RateLimit-Limit', max.toString())
          c.header('X-RateLimit-Remaining', '0')
          c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())
        }

        throw new HTTPException(429, { message })
      }

      const requestKey = `${baseKey}:${now}`
      await c.env.CACHE.put(requestKey, '1', {
        expirationTtl: Math.max(60, Math.ceil(windowMs / 1000)),
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
 * Progressive rate limiting that increases delays for repeated violations
 * Useful for preventing abuse by implementing exponential backoff
 *
 * @example
 * ```ts
 * app.use('/api/expensive/*', progressiveRateLimit({
 *   max: 10,
 *   windowMs: 60000,
 *   backoffMultiplier: 2, // Double the wait time for each violation
 *   maxBackoff: 300000,   // Max 5 minutes backoff
 * }))
 * ```
 */
export function progressiveRateLimit(
  options: RateLimitOptions & {
    /** Multiplier for each subsequent violation (default: 2) */
    backoffMultiplier?: number
    /** Maximum backoff time in ms (default: 300000 = 5 minutes) */
    maxBackoff?: number
  } = {}
) {
  const { backoffMultiplier = 2, maxBackoff = 300000, ...baseOptions } = options

  return async (c: Context<{ Bindings: RateLimitEnv }>, next: Next) => {
    const key = baseOptions.keyGenerator
      ? baseOptions.keyGenerator(c)
      : generateDefaultKey(c)
    const violationKey = `violations:${key}`

    try {
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

      const baseMiddleware = rateLimit(baseOptions)

      try {
        await baseMiddleware(c, next)

        if (violations) {
          await c.env.CACHE.delete(violationKey)
        }
      } catch (error) {
        if (error instanceof HTTPException && error.status === 429) {
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
            expirationTtl: Math.max(60, Math.ceil(newBackoff / 1000)),
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

/**
 * Create a rate limiter factory with pre-configured options
 *
 * @example
 * ```ts
 * const rateLimiters = createRateLimiters({
 *   strict: { max: 10, windowMs: 60000 },
 *   standard: { max: 60, windowMs: 60000 },
 *   authenticated: { max: 100, windowMs: 60000 },
 * })
 *
 * app.use('/api/render/*', rateLimiters.strict)
 * app.use('/api/*', rateLimiters.standard)
 * ```
 */
export function createRateLimiters<T extends Record<string, RateLimitOptions>>(
  configs: T
): { [K in keyof T]: ReturnType<typeof rateLimit> } {
  const limiters = {} as { [K in keyof T]: ReturnType<typeof rateLimit> }

  for (const [name, config] of Object.entries(configs)) {
    limiters[name as keyof T] = rateLimit(config)
  }

  return limiters
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const defaultRateLimiters = createRateLimiters({
  /** For expensive operations (10 req/min) */
  strict: {
    windowMs: 60 * 1000,
    max: 10,
    message: 'Rate limit exceeded for expensive operation',
  },
  /** For normal API endpoints (60 req/min) */
  standard: {
    windowMs: 60 * 1000,
    max: 60,
  },
  /** For authenticated users (100 req/min) */
  authenticated: {
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (c: Context) =>
      c.get('userId' as never) ||
      c.req.header('CF-Connecting-IP') ||
      'anonymous',
  },
  /** Lenient rate limiting (200 req/min) */
  lenient: {
    windowMs: 60 * 1000,
    max: 200,
  },
})
