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
    return await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
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
    const existingUser = await this.findUserByEmail(data.email)

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
          data.email,
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
   * Upsert sync data
   */
  async upsertSyncData(data: {
    userId: string
    entityType: string
    entityId: string
    data: unknown
    checksum: string
    version?: number
  }) {
    const jsonData = JSON.stringify(data.data)
    // Check if this is a soft delete
    const deletedAt = (data.data as Record<string, unknown>).deletedAt || null

    try {
      // First check if record exists
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
                deleted_at = ?
            WHERE user_id = ? AND entity_type = ? AND entity_id = ?
          `
          )
          .bind(
            jsonData,
            data.checksum,
            deletedAt,
            data.userId,
            data.entityType,
            data.entityId
          )
          .run()
      } else {
        // Insert new record
        const id = generateId('sync')
        await this.db
          .prepare(
            `
            INSERT INTO sync_data (id, user_id, entity_type, entity_id, data, checksum, version, deleted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
            deletedAt
          )
          .run()
      }
    } catch (error) {
      console.error('[Database] upsertSyncData error:', error)
      console.error('[Database] Query params:', {
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        dataLength: jsonData.length,
        checksum: data.checksum,
        version: data.version || 1,
        deletedAt,
        dataKeys: Object.keys(data.data as any),
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
        .bind(userId, syncToken, deviceCount || 1, deviceCount)
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
