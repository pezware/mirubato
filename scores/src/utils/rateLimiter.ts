// Simple KV-based rate limiter for Cloudflare Workers
// This replaces the RATE_LIMITER binding approach with a KV-based solution

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export class RateLimiter {
  private kv: KVNamespace
  private config: RateLimitConfig

  constructor(kv: KVNamespace, config: RateLimitConfig) {
    this.kv = kv
    this.config = config
  }

  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now()
    const recordKey = `ratelimit:${key}`

    // Get current record
    const record = (await this.kv.get(recordKey, 'json')) as {
      count: number
      resetAt: number
    } | null

    // If no record or window expired, allow and create new record
    if (!record || record.resetAt < now) {
      await this.kv.put(
        recordKey,
        JSON.stringify({
          count: 1,
          resetAt: now + this.config.windowMs,
        }),
        {
          expirationTtl: Math.ceil(this.config.windowMs / 1000), // Convert to seconds
        }
      )
      return true
    }

    // Check if under limit
    if (record.count < this.config.maxRequests) {
      // Increment counter
      await this.kv.put(
        recordKey,
        JSON.stringify({
          count: record.count + 1,
          resetAt: record.resetAt,
        }),
        {
          expirationTtl: Math.ceil((record.resetAt - now) / 1000), // Remaining time in seconds
        }
      )
      return true
    }

    // Over limit
    return false
  }

  async getRemainingTime(key: string): Promise<number> {
    const now = Date.now()
    const recordKey = `ratelimit:${key}`
    const record = (await this.kv.get(recordKey, 'json')) as {
      count: number
      resetAt: number
    } | null

    if (!record || record.resetAt < now) {
      return 0
    }

    return record.resetAt - now
  }
}
