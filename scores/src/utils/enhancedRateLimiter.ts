interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  failureMultiplier?: number
  maxFailures?: number
  banDurationMs?: number
}

interface RateLimitRecord {
  count: number
  failureCount: number
  resetTime: number
  bannedUntil?: number
}

export class EnhancedRateLimiter {
  constructor(
    private kv: KVNamespace,
    private config: RateLimitConfig = {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 1,
      failureMultiplier: 2, // Double the wait time for each failure
      maxFailures: 5, // Ban after 5 failures
      banDurationMs: 60 * 60 * 1000, // 1 hour ban
    }
  ) {}

  async checkLimit(
    key: string
  ): Promise<{ allowed: boolean; remainingMs?: number; reason?: string }> {
    const now = Date.now()
    const recordKey = `ratelimit:${key}`

    // Get existing record
    const recordStr = await this.kv.get(recordKey)
    let record: RateLimitRecord = recordStr
      ? JSON.parse(recordStr)
      : { count: 0, failureCount: 0, resetTime: now + this.config.windowMs }

    // Check if banned
    if (record.bannedUntil && record.bannedUntil > now) {
      return {
        allowed: false,
        remainingMs: record.bannedUntil - now,
        reason: `Too many failed attempts. Banned until ${new Date(record.bannedUntil).toISOString()}`,
      }
    }

    // Reset if window expired
    if (now > record.resetTime) {
      record = {
        count: 0,
        failureCount: 0,
        resetTime: now + this.config.windowMs,
      }
    }

    // Check rate limit
    if (record.count >= this.config.maxRequests) {
      // Calculate extended wait time based on failures
      const multiplier = Math.pow(
        this.config.failureMultiplier || 2,
        record.failureCount
      )
      const remainingMs = (record.resetTime - now) * multiplier

      return {
        allowed: false,
        remainingMs,
        reason:
          record.failureCount > 0
            ? `Rate limited with ${record.failureCount} previous failures`
            : 'Rate limit exceeded',
      }
    }

    // Increment count
    record.count++
    await this.kv.put(recordKey, JSON.stringify(record), {
      expirationTtl: Math.ceil(this.config.windowMs / 1000),
    })

    return { allowed: true }
  }

  async recordFailure(key: string, isCritical: boolean = false): Promise<void> {
    const now = Date.now()
    const recordKey = `ratelimit:${key}`

    const recordStr = await this.kv.get(recordKey)
    const record: RateLimitRecord = recordStr
      ? JSON.parse(recordStr)
      : { count: 0, failureCount: 0, resetTime: now + this.config.windowMs }

    record.failureCount++

    // Ban if too many failures or critical failure
    if (isCritical || record.failureCount >= (this.config.maxFailures || 5)) {
      record.bannedUntil = now + (this.config.banDurationMs || 60 * 60 * 1000)
    }

    await this.kv.put(recordKey, JSON.stringify(record), {
      expirationTtl: Math.ceil(
        (this.config.banDurationMs || this.config.windowMs) / 1000
      ),
    })
  }

  async recordSuccess(key: string): Promise<void> {
    const recordKey = `ratelimit:${key}`
    const recordStr = await this.kv.get(recordKey)

    if (recordStr) {
      const record: RateLimitRecord = JSON.parse(recordStr)
      // Reset failure count on success
      record.failureCount = Math.max(0, record.failureCount - 1)

      await this.kv.put(recordKey, JSON.stringify(record), {
        expirationTtl: Math.ceil(this.config.windowMs / 1000),
      })
    }
  }
}
