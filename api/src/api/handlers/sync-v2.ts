import { Hono } from 'hono'
import type { Env } from '../../index'
import { authMiddleware, validateBody, type Variables } from '../middleware'
import { generateId } from '../../utils/database'
import { Errors } from '../../utils/errors'
import { schemas } from '../../utils/validation'
import { nanoid } from 'nanoid'

export const syncV2Handler = new Hono<{ Bindings: Env; Variables: Variables }>()

// All sync endpoints require authentication
syncV2Handler.use('/*', authMiddleware)

// Types for the new sync system
interface ChangeRecord {
  changeId: string // Client-generated UUID for idempotency
  type: 'CREATED' | 'UPDATED' | 'DELETED'
  entityType: 'logbook_entry' | 'goal'
  entityId: string
  data?: unknown // Full object for CREATED, delta for UPDATED, omitted for DELETED
}

interface SyncRequest {
  lastKnownServerVersion: number
  changes: ChangeRecord[]
}

interface SyncResponse {
  newChanges: ChangeRecord[]
  latestServerVersion: number
  conflicts?: Array<{
    changeId: string
    reason: string
  }>
}

/**
 * Unified sync endpoint - handles both push and pull in one atomic operation
 * POST /api/sync/v2
 */
syncV2Handler.post('/', validateBody(schemas.syncV2), async c => {
  const userId = c.get('userId') as string
  const { lastKnownServerVersion, changes } = c.get(
    'validatedBody'
  ) as SyncRequest
  const deviceId = c.req.header('X-Device-ID') || 'unknown'

  const db = c.env.DB

  try {
    console.log(`[Sync V2] Processing sync for user ${userId}`, {
      lastKnownServerVersion,
      incomingChanges: changes.length,
      deviceId,
    })

    const conflicts: Array<{ changeId: string; reason: string }> = []

    // Step 1: Apply incoming changes from client
    for (const change of changes) {
      try {
        // Check for duplicate changeId (idempotency)
        const existing = await db
          .prepare(
            'SELECT id FROM entity_changes WHERE user_id = ? AND change_id = ?'
          )
          .bind(userId, change.changeId)
          .first()

        if (existing) {
          console.log(`[Sync V2] Skipping duplicate change: ${change.changeId}`)
          continue
        }

        // Apply the change
        await applyChange(db, userId, change, deviceId)

        console.log(
          `[Sync V2] Applied change: ${change.type} ${change.entityType} ${change.entityId}`
        )
      } catch (error) {
        console.error(
          `[Sync V2] Failed to apply change ${change.changeId}:`,
          error
        )
        conflicts.push({
          changeId: change.changeId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Step 2: Get changes client hasn't seen yet
    const newChanges = await getChangesAfterVersion(
      db,
      userId,
      lastKnownServerVersion
    )

    // Step 3: Get latest server version
    const latestVersion = await getLatestVersion(db, userId)

    const response: SyncResponse = {
      newChanges,
      latestServerVersion: latestVersion,
      ...(conflicts.length > 0 && { conflicts }),
    }

    console.log(`[Sync V2] Sync completed for user ${userId}`, {
      appliedChanges: changes.length - conflicts.length,
      conflicts: conflicts.length,
      newChangesToClient: newChanges.length,
      latestServerVersion: latestVersion,
    })

    return c.json(response)
  } catch (error) {
    console.error('[Sync V2] Sync failed:', error)
    throw Errors.InternalError('Sync operation failed')
  }
})

/**
 * Get user's current sync status
 * GET /api/sync/v2/status
 */
syncV2Handler.get('/status', async c => {
  const userId = c.get('userId') as string
  const db = c.env.DB

  try {
    const metadata = await db
      .prepare('SELECT * FROM sync_metadata WHERE user_id = ?')
      .bind(userId)
      .first<{
        last_known_version: number
        device_count: number
        created_at: string
        updated_at: string
      }>()

    const entityCount = await db
      .prepare('SELECT COUNT(*) as count FROM entity_changes WHERE user_id = ?')
      .bind(userId)
      .first<{ count: number }>()

    return c.json({
      lastKnownVersion: metadata?.last_known_version || 0,
      deviceCount: metadata?.device_count || 0,
      totalChanges: entityCount?.count || 0,
      lastSync: metadata?.updated_at || null,
    })
  } catch (error) {
    console.error('[Sync V2] Failed to get status:', error)
    throw Errors.InternalError('Failed to get sync status')
  }
})

// Helper functions

async function applyChange(
  db: D1Database,
  userId: string,
  change: ChangeRecord,
  deviceId: string
): Promise<void> {
  // Insert into entity_changes log
  await db
    .prepare(
      `
      INSERT INTO entity_changes (
        user_id, change_id, device_id, change_type, entity_type, entity_id, change_data, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `
    )
    .bind(
      userId,
      change.changeId,
      deviceId,
      change.type,
      change.entityType,
      change.entityId,
      JSON.stringify(change.data || {})
    )
    .run()

  // Apply to main data tables for backwards compatibility (if needed)
  // This maintains the current sync_data table until we fully migrate
  if (change.type === 'CREATED' || change.type === 'UPDATED') {
    const checksum = await calculateSimpleChecksum(change.data)

    await db
      .prepare(
        `
        INSERT OR REPLACE INTO sync_data (
          id, user_id, entity_type, entity_id, data, checksum, device_id, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
      )
      .bind(
        nanoid(),
        userId,
        change.entityType,
        change.entityId,
        JSON.stringify(change.data),
        checksum,
        deviceId
      )
      .run()
  } else if (change.type === 'DELETED') {
    // Soft delete in sync_data table
    await db
      .prepare(
        `
        UPDATE sync_data 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND entity_type = ? AND entity_id = ?
      `
      )
      .bind(userId, change.entityType, change.entityId)
      .run()
  }
}

async function getChangesAfterVersion(
  db: D1Database,
  userId: string,
  afterVersion: number
): Promise<ChangeRecord[]> {
  const results = await db
    .prepare(
      `
      SELECT change_id, change_type, entity_type, entity_id, change_data
      FROM entity_changes 
      WHERE user_id = ? AND version > ?
      ORDER BY version ASC
    `
    )
    .bind(userId, afterVersion)
    .all<{
      change_id: string
      change_type: string
      entity_type: string
      entity_id: string
      change_data: string
    }>()

  return results.results.map(row => ({
    changeId: row.change_id,
    type: row.change_type as 'CREATED' | 'UPDATED' | 'DELETED',
    entityType: row.entity_type as 'logbook_entry' | 'goal',
    entityId: row.entity_id,
    ...(row.change_data &&
      row.change_data !== '{}' && {
        data: JSON.parse(row.change_data),
      }),
  }))
}

async function getLatestVersion(
  db: D1Database,
  userId: string
): Promise<number> {
  const result = await db
    .prepare(
      'SELECT COALESCE(MAX(version), 0) as latest FROM entity_changes WHERE user_id = ?'
    )
    .bind(userId)
    .first<{ latest: number }>()

  return result?.latest || 0
}

async function calculateSimpleChecksum(data: unknown): Promise<string> {
  // Simple hash for backwards compatibility
  const str = JSON.stringify(data || {})
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Migration endpoint - converts existing sync_data to entity_changes format
 * POST /api/sync/v2/migrate
 * Should be called once per user to seed their change log
 */
syncV2Handler.post('/migrate', async c => {
  const userId = c.get('userId') as string
  const db = c.env.DB

  try {
    // Check if user already migrated
    const existing = await db
      .prepare('SELECT COUNT(*) as count FROM entity_changes WHERE user_id = ?')
      .bind(userId)
      .first<{ count: number }>()

    if (existing && existing.count > 0) {
      return c.json({
        migrated: false,
        reason: 'User already has change log data',
        existingChanges: existing.count,
      })
    }

    // Get existing data from sync_data table
    const existingData = await db
      .prepare(
        `
        SELECT entity_type, entity_id, data 
        FROM sync_data 
        WHERE user_id = ? AND deleted_at IS NULL
      `
      )
      .bind(userId)
      .all<{
        entity_type: string
        entity_id: string
        data: string
      }>()

    let migratedCount = 0

    // Convert each existing entry to a CREATED change
    for (const item of existingData.results) {
      const changeId = `migrate_${generateId('change')}`

      await db
        .prepare(
          `
          INSERT INTO entity_changes (
            user_id, change_id, device_id, change_type, entity_type, entity_id, change_data, version
          ) VALUES (?, ?, 'migration', 'CREATED', ?, ?, ?, 0)
        `
        )
        .bind(userId, changeId, item.entity_type, item.entity_id, item.data)
        .run()

      migratedCount++
    }

    console.log(
      `[Sync V2] Migrated ${migratedCount} entries for user ${userId}`
    )

    return c.json({
      migrated: true,
      entriesConverted: migratedCount,
    })
  } catch (error) {
    console.error('[Sync V2] Migration failed:', error)
    throw Errors.InternalError('Migration failed')
  }
})
