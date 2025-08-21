import { nanoid } from 'nanoid'
import type { DbUser, DbSyncMetadata } from '../types/models'

/**
 * Generate a unique ID for database records
 */
export function generateId(prefix?: string): string {
  const id = nanoid()
  return prefix ? `${prefix}_${id}` : id
}

/**
 * Database query helpers
 */
export class DatabaseHelpers {
  constructor(private db: D1Database) {}

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<DbUser | null> {
    // Use case-insensitive comparison to handle existing tokens with mixed-case emails
    return await this.db
      .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
      .bind(email.toLowerCase().trim())
      .first<DbUser>()
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<DbUser | null> {
    return await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<DbUser>()
  }

  /**
   * Create or update user
   */
  async upsertUser(data: {
    email: string
    displayName?: string | null
    authProvider: string
    googleId?: string | null
  }) {
    // Normalize email to lowercase
    const normalizedEmail = data.email.toLowerCase().trim()
    const existingUser = await this.findUserByEmail(normalizedEmail)

    if (existingUser) {
      // Update existing user
      await this.db
        .prepare(
          `
          UPDATE users 
          SET display_name = ?, auth_provider = ?, google_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `
        )
        .bind(
          data.displayName ?? existingUser.display_name,
          data.authProvider,
          data.googleId ?? existingUser.google_id,
          existingUser.id
        )
        .run()

      return existingUser.id
    } else {
      // Create new user
      const userId = generateId('user')

      await this.db
        .prepare(
          `
          INSERT INTO users (id, email, display_name, auth_provider, google_id)
          VALUES (?, ?, ?, ?, ?)
        `
        )
        .bind(
          userId,
          normalizedEmail,
          data.displayName ?? null,
          data.authProvider,
          data.googleId ?? null
        )
        .run()

      return userId
    }
  }

  /**
   * Get sync data for user
   */
  async getSyncData(userId: string, entityType?: string) {
    let query =
      'SELECT * FROM sync_data WHERE user_id = ? AND deleted_at IS NULL'
    const params: unknown[] = [userId]

    if (entityType) {
      query += ' AND entity_type = ?'
      params.push(entityType)
    }

    query += ' ORDER BY updated_at DESC'

    try {
      const result = await this.db
        .prepare(query)
        .bind(...params)
        .all()

      return result
    } catch (error) {
      console.error('Error fetching sync data:', error)
      // Return empty result set instead of throwing
      return { results: [], success: true, meta: {} }
    }
  }

  /**
   * Upsert sync data with enhanced duplicate detection
   */
  async upsertSyncData(data: {
    userId: string
    entityType: string
    entityId: string
    data: unknown
    checksum: string
    version?: number
    deviceId?: string
  }): Promise<{
    id: string
    entity_id: string
    action: 'created' | 'updated' | 'duplicate_prevented'
  }> {
    // Sanitize data to ensure D1 compatibility (no undefined values)
    const sanitizedData = sanitizeForD1(data.data)
    const jsonData = JSON.stringify(sanitizedData)
    // Check if this is a soft delete
    const deletedAt =
      (sanitizedData as Record<string, unknown>).deletedAt || null

    try {
      // First check for duplicate by checksum
      const duplicate = await this.db
        .prepare(
          `SELECT id, entity_id FROM sync_data 
           WHERE user_id = ? AND entity_type = ? AND checksum = ?
           AND deleted_at IS NULL`
        )
        .bind(data.userId, data.entityType, data.checksum)
        .first<{ id: string; entity_id: string }>()

      if (duplicate && duplicate.entity_id !== data.entityId) {
        console.warn(
          `[Duplicate] Found duplicate content with different ID. ` +
            `Existing: ${duplicate.entity_id}, New: ${data.entityId}, ` +
            `Device: ${data.deviceId || 'unknown'}`
        )

        // Return existing entry instead of creating duplicate
        return {
          id: duplicate.id,
          entity_id: duplicate.entity_id,
          action: 'duplicate_prevented',
        }
      }

      // Check if record exists by entity_id
      const existing = await this.db
        .prepare(
          'SELECT id, version FROM sync_data WHERE user_id = ? AND entity_type = ? AND entity_id = ?'
        )
        .bind(data.userId, data.entityType, data.entityId)
        .first<{ id: string; version: number }>()

      if (existing) {
        // Update existing record
        await this.db
          .prepare(
            `
            UPDATE sync_data 
            SET data = ?, 
                checksum = ?, 
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP,
                deleted_at = ?,
                device_id = ?
            WHERE user_id = ? AND entity_type = ? AND entity_id = ?
          `
          )
          .bind(
            jsonData,
            data.checksum,
            deletedAt,
            data.deviceId || null,
            data.userId,
            data.entityType,
            data.entityId
          )
          .run()

        return {
          id: existing.id,
          entity_id: data.entityId,
          action: 'updated',
        }
      } else {
        // Insert new record
        const id = generateId('sync')
        await this.db
          .prepare(
            `
            INSERT INTO sync_data (id, user_id, entity_type, entity_id, data, checksum, version, deleted_at, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
          .bind(
            id,
            data.userId,
            data.entityType,
            data.entityId,
            jsonData,
            data.checksum,
            data.version || 1,
            deletedAt,
            data.deviceId || null
          )
          .run()

        return {
          id,
          entity_id: data.entityId,
          action: 'created',
        }
      }
    } catch (error) {
      // Handle unique constraint violation
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed')
      ) {
        console.error('[Duplicate] Constraint violation:', {
          userId: data.userId,
          entityType: data.entityType,
          entityId: data.entityId,
          checksum: data.checksum,
          deviceId: data.deviceId,
        })

        // Return existing entry
        const existing = await this.db
          .prepare(
            `SELECT id, entity_id FROM sync_data 
             WHERE user_id = ? AND entity_type = ? AND checksum = ?`
          )
          .bind(data.userId, data.entityType, data.checksum)
          .first<{ id: string; entity_id: string }>()

        if (existing) {
          return {
            id: existing.id,
            entity_id: existing.entity_id,
            action: 'duplicate_prevented',
          }
        }
      }

      console.error('[Database] upsertSyncData error:', error)
      console.error('[Database] Query params:', {
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        dataLength: jsonData.length,
        checksum: data.checksum,
        version: data.version || 1,
        deletedAt,
        deviceId: data.deviceId,
        dataKeys: Object.keys(data.data as any),
      })
      throw error
    }
  }

  /**
   * Soft delete sync data entry
   * More efficient than full upsert for deletions
   */
  async softDeleteSyncData(
    userId: string,
    entityType: string,
    entityId: string,
    deletedAt: string
  ): Promise<void> {
    try {
      await this.db
        .prepare(
          `UPDATE sync_data 
           SET deleted_at = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND entity_type = ? AND entity_id = ?`
        )
        .bind(deletedAt, userId, entityType, entityId)
        .run()

      console.log(
        `[Database] Soft deleted ${entityType} ${entityId} for user ${userId}`
      )
    } catch (error) {
      console.error('[Database] softDeleteSyncData error:', error)
      console.error('[Database] Params:', {
        userId,
        entityType,
        entityId,
        deletedAt,
      })
      throw error
    }
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(userId: string): Promise<DbSyncMetadata | null> {
    return await this.db
      .prepare('SELECT * FROM sync_metadata WHERE user_id = ?')
      .bind(userId)
      .first<DbSyncMetadata>()
  }

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(
    userId: string,
    syncToken: string,
    deviceCount?: number
  ) {
    try {
      // Ensure deviceCount is never undefined for D1 compatibility
      const count = deviceCount ?? 1

      await this.db
        .prepare(
          `
          INSERT INTO sync_metadata (user_id, last_sync_token, last_sync_time, device_count)
          VALUES (?, ?, datetime('now'), ?)
          ON CONFLICT(user_id)
          DO UPDATE SET 
            last_sync_token = excluded.last_sync_token,
            last_sync_time = excluded.last_sync_time,
            device_count = COALESCE(?, device_count)
        `
        )
        .bind(userId, syncToken, count, count)
        .run()
    } catch (error) {
      console.error('[Database] updateSyncMetadata error:', error)
      console.error('[Database] Params:', { userId, syncToken, deviceCount })
      throw error
    }
  }

  /**
   * Delete user and all associated data
   */
  async deleteUser(userId: string) {
    // Start transaction
    const batch = [
      this.db.prepare('DELETE FROM sync_data WHERE user_id = ?').bind(userId),
      this.db
        .prepare('DELETE FROM sync_metadata WHERE user_id = ?')
        .bind(userId),
      this.db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
    ]

    await this.db.batch(batch)
  }
}

/**
 * Sanitize data to ensure D1 compatibility by converting undefined to null
 */
export function sanitizeForD1(data: unknown, visited = new WeakSet()): unknown {
  if (data === undefined) return null
  if (data === null) return null
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForD1(item, visited))
  }
  if (typeof data === 'object' && data !== null) {
    // Prevent infinite recursion on circular references
    if (visited.has(data)) {
      return {}
    }
    visited.add(data)

    const sanitized: Record<string, unknown> = {}
    Object.entries(data).forEach(([key, value]) => {
      sanitized[key] = sanitizeForD1(value, visited)
    })
    return sanitized
  }
  return data
}

/**
 * Calculate checksum for data
 */
export async function calculateChecksum(data: unknown): Promise<string> {
  // Sort object keys to ensure consistent checksums regardless of key order
  const sortObject = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(sortObject)

    const sorted: Record<string, unknown> = {}
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = sortObject((obj as Record<string, unknown>)[key])
      })
    return sorted
  }

  const sortedData = sortObject(data)
  const jsonString = JSON.stringify(sortedData)
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(jsonString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
