import { nanoid } from 'nanoid'
import type { D1Database } from '@cloudflare/workers-types'

export interface IdempotencyRecord {
  id: string
  key: string
  user_id: string
  request_hash: string
  response: string
  created_at: string
  expires_at: string
}

export class IdempotencyManager {
  constructor(private readonly db: D1Database) {}

  /**
   * Check if a request has already been processed
   */
  async checkIdempotency(
    key: string,
    userId: string,
    requestBody: unknown
  ): Promise<{ exists: true; response: unknown } | { exists: false }> {
    const requestHash = await this.createRequestHash(requestBody)

    try {
      const existing = await this.db
        .prepare(
          `SELECT * FROM idempotency_keys 
           WHERE key = ? AND user_id = ? AND expires_at > datetime('now')`
        )
        .bind(key, userId)
        .first<IdempotencyRecord>()

      if (!existing) {
        return { exists: false }
      }

      // Check if same request
      if (existing.request_hash === requestHash) {
        console.log(`[Idempotency] Returning cached response for key: ${key}`)
        return {
          exists: true,
          response: JSON.parse(existing.response),
        }
      } else {
        // Different request with same key
        throw new Error(
          'Idempotency key already used with different request. ' +
            'Please use a new idempotency key for this request.'
        )
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Idempotency key')) {
        throw error
      }
      console.error('[Idempotency] Error checking idempotency:', error)
      // On error, allow request to proceed
      return { exists: false }
    }
  }

  /**
   * Save an idempotent response
   */
  async saveIdempotentResponse(
    key: string,
    userId: string,
    requestBody: unknown,
    response: unknown,
    ttlHours: number = 24
  ): Promise<void> {
    const requestHash = await this.createRequestHash(requestBody)
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

    try {
      await this.db
        .prepare(
          `INSERT INTO idempotency_keys 
           (id, key, user_id, request_hash, response, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          nanoid(),
          key,
          userId,
          requestHash,
          JSON.stringify(response),
          expiresAt.toISOString()
        )
        .run()
    } catch (error) {
      // Log but don't fail the request
      console.error('[Idempotency] Error saving idempotent response:', error)
    }
  }

  /**
   * Clean up expired idempotency keys
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await this.db
        .prepare(
          `DELETE FROM idempotency_keys WHERE expires_at < datetime('now')`
        )
        .run()

      return result.meta.changes
    } catch (error) {
      console.error('[Idempotency] Error cleaning up expired keys:', error)
      return 0
    }
  }

  /**
   * Create a hash of the request body for comparison
   */
  private async createRequestHash(requestBody: unknown): Promise<string> {
    // Normalize the request body to ensure consistent hashing
    const normalized = this.normalizeRequestBody(requestBody)
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(normalized))
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Normalize request body for consistent hashing
   */
  private normalizeRequestBody(body: unknown): unknown {
    if (body === null || body === undefined) {
      return ''
    }

    if (Array.isArray(body)) {
      return body.map(item => this.normalizeRequestBody(item))
    }

    if (typeof body === 'object') {
      const obj = body as Record<string, unknown>
      const normalized: Record<string, unknown> = {}

      // Sort keys for consistent ordering
      const keys = Object.keys(obj).sort()

      for (const key of keys) {
        // Skip certain fields that shouldn't affect idempotency
        if (key === 'timestamp' || key === 'requestId') {
          continue
        }
        normalized[key] = this.normalizeRequestBody(obj[key])
      }

      return normalized
    }

    return body
  }

  /**
   * Generate a unique idempotency key
   */
  static generateKey(): string {
    return `idem_${nanoid()}`
  }

  /**
   * Create a deterministic key based on content
   */
  static async createDeterministicKey(
    userId: string,
    operation: string,
    content: unknown
  ): Promise<string> {
    const encoder = new TextEncoder()
    const payload = `${userId}:${operation}:${JSON.stringify(content)}`
    const data = encoder.encode(payload)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
    return `idem_${hashHex.substring(0, 16)}`
  }
}

/**
 * Middleware to handle idempotency
 */
export async function withIdempotency<T>(
  db: D1Database,
  key: string | undefined,
  userId: string,
  requestBody: unknown,
  handler: () => Promise<T>
): Promise<{ response: T; wasReplayed: boolean }> {
  const manager = new IdempotencyManager(db)

  // If no key provided, proceed without idempotency
  if (!key) {
    const response = await handler()
    return { response, wasReplayed: false }
  }

  // Check if request was already processed
  const existing = await manager.checkIdempotency(key, userId, requestBody)

  if (existing.exists) {
    return {
      response: existing.response as T,
      wasReplayed: true,
    }
  }

  // Process the request
  const response = await handler()

  // Save the response for future idempotency checks
  await manager.saveIdempotentResponse(key, userId, requestBody, response)

  return { response, wasReplayed: false }
}
