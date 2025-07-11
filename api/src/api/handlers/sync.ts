import { Hono } from 'hono'
import type { Env } from '../../index'
import { authMiddleware, validateBody, type Variables } from '../middleware'
import {
  DatabaseHelpers,
  calculateChecksum,
  generateId,
} from '../../utils/database'
import { schemas } from '../../utils/validation'
import { Errors } from '../../utils/errors'

export const syncHandler = new Hono<{ Bindings: Env; Variables: Variables }>()

// All sync endpoints require authentication
syncHandler.use('/*', authMiddleware)

/**
 * Pull user data from cloud
 * POST /api/sync/pull
 */
syncHandler.post('/pull', async c => {
  const userId = c.get('userId') as string
  const db = new DatabaseHelpers(c.env.DB)

  try {
    // Get all user data
    const syncData = await db.getSyncData(userId)

    // Get sync metadata
    const metadata = await db.getSyncMetadata(userId)

    // Transform sync data to user-friendly format
    const entries = []
    const goals = []

    // Handle the results properly
    const results = (syncData as { results?: unknown[] }).results || []

    for (const item of results as Array<{
      entity_type: string
      entity_id: string
      data: string | unknown
    }>) {
      try {
        // Parse the JSON data safely
        const data =
          typeof item.data === 'string' ? JSON.parse(item.data) : item.data

        if (item.entity_type === 'logbook_entry') {
          // Normalize enum fields to lowercase
          if (data.instrument && typeof data.instrument === 'string') {
            data.instrument = data.instrument.toLowerCase()
          }
          if (data.type && typeof data.type === 'string') {
            data.type = data.type.toLowerCase()
          }
          if (data.mood && typeof data.mood === 'string') {
            data.mood = data.mood.toLowerCase()
          }
          entries.push(data)
        } else if (item.entity_type === 'goal') {
          // Normalize instrument field for goals
          if (data.instrument && typeof data.instrument === 'string') {
            data.instrument = data.instrument.toLowerCase()
          }
          goals.push(data)
        }
      } catch (parseError) {
        // Error: Failed to parse sync data
        // Continue processing other items
      }
    }

    const syncToken = metadata?.last_sync_token || generateId('sync')

    return c.json({
      entries,
      goals,
      syncToken,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    throw Errors.InternalError('Failed to pull sync data')
  }
})

/**
 * Push local changes to cloud
 * POST /api/sync/push
 */
syncHandler.post('/push', validateBody(schemas.syncChanges), async c => {
  const userId = c.get('userId') as string
  const { changes } = c.get('validatedBody') as {
    changes: { entries?: unknown[]; goals?: unknown[] }
  }
  const db = new DatabaseHelpers(c.env.DB)

  // Enhanced debug logging for staging
  if (c.env.ENVIRONMENT === 'staging' || c.env.ENVIRONMENT === 'local') {
    console.log('[Sync Push] Starting sync for user:', userId)
    console.log('[Sync Push] Environment:', c.env.ENVIRONMENT)
    console.log('[Sync Push] Received changes:', {
      entriesCount: changes.entries?.length || 0,
      goalsCount: changes.goals?.length || 0,
    })
    if (changes.entries && changes.entries.length > 0) {
      console.log(
        '[Sync Push] First entry sample:',
        JSON.stringify(changes.entries[0], null, 2)
      )
    }
  }

  try {
    // Process changes
    const conflicts: Array<{
      entityId: string
      entityType: string
      reason: string
    }> = []

    // Process entries
    if (changes.entries && changes.entries.length > 0) {
      for (const entry of changes.entries as Array<{
        id: string
        instrument?: string
        type?: string
        mood?: string
        [key: string]: unknown
      }>) {
        try {
          // Normalize enum fields to lowercase for database compatibility
          if (entry.instrument && typeof entry.instrument === 'string') {
            entry.instrument = entry.instrument.toLowerCase()
          }
          if (entry.type && typeof entry.type === 'string') {
            entry.type = entry.type.toLowerCase()
          }
          if (entry.mood && typeof entry.mood === 'string') {
            entry.mood = entry.mood.toLowerCase()
          }

          const checksum = await calculateChecksum(entry)

          await db.upsertSyncData({
            userId,
            entityType: 'logbook_entry',
            entityId: entry.id,
            data: entry,
            checksum,
          })

          if (c.env.ENVIRONMENT === 'staging') {
            console.log('[Sync Push] Successfully upserted entry:', entry.id)
          }
        } catch (entryError) {
          // Error: Failed to process entry
          // Continue processing other entries but track the error
          conflicts.push({
            entityId: entry.id,
            entityType: 'logbook_entry',
            reason:
              entryError instanceof Error
                ? entryError.message
                : 'Unknown error',
          })
        }
      }
    }

    // Process goals
    if (changes.goals && changes.goals.length > 0) {
      for (const goal of changes.goals as Array<{
        id: string
        [key: string]: unknown
      }>) {
        try {
          const checksum = await calculateChecksum(goal)

          await db.upsertSyncData({
            userId,
            entityType: 'goal',
            entityId: goal.id,
            data: goal,
            checksum,
          })
        } catch (goalError) {
          // Error: Failed to process goal
          // Continue processing other goals but track the error
          conflicts.push({
            entityId: goal.id,
            entityType: 'goal',
            reason:
              goalError instanceof Error ? goalError.message : 'Unknown error',
          })
        }
      }
    }

    // Update sync metadata
    const newSyncToken = generateId('sync')
    // Debug: Updating sync metadata

    await db.updateSyncMetadata(userId, newSyncToken)

    return c.json({
      success: true,
      syncToken: newSyncToken,
      conflicts,
    })
  } catch (error) {
    // Error: Sync push failed
    console.error('[Sync Push] Error occurred:', error)
    console.error('[Sync Push] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      entriesCount: changes.entries?.length || 0,
      goalsCount: changes.goals?.length || 0,
    })

    // Enhanced error details for all environments temporarily
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = {
      userId,
      entriesCount: changes.entries?.length || 0,
      goalsCount: changes.goals?.length || 0,
      // Add first entry details for debugging
      firstEntry: changes.entries?.[0]
        ? {
            id: (changes.entries[0] as any).id,
            hasDeletedAt: 'deletedAt' in (changes.entries[0] as any),
            keys: Object.keys(changes.entries[0] as any),
          }
        : null,
    }

    // Return detailed error response
    return c.json(
      {
        success: false,
        error: errorMessage,
        stack:
          c.env.ENVIRONMENT !== 'production'
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
        details: errorDetails,
      },
      500
    )
  }
})

/**
 * Batch sync operation
 * POST /api/sync/batch
 */
syncHandler.post('/batch', validateBody(schemas.syncBatch), async c => {
  const userId = c.get('userId') as string
  const { entities } = c.get('validatedBody') as {
    entities: Array<{
      type: string
      id: string
      data: unknown
      checksum: string
      version: number
    }>
  }
  const db = new DatabaseHelpers(c.env.DB)

  try {
    let uploaded = 0
    let downloaded = 0
    const conflicts = []

    // Get current cloud data for comparison
    const cloudData = await db.getSyncData(userId)
    const cloudMap = new Map()

    for (const item of (
      cloudData as {
        results: Array<{
          entity_type: string
          entity_id: string
          checksum: string
          version: number
          data: string | unknown
        }>
      }
    ).results) {
      const key = `${item.entity_type}:${item.entity_id}`
      cloudMap.set(key, {
        checksum: item.checksum,
        version: item.version,
        data: JSON.parse(item.data as string),
      })
    }

    // Process incoming entities
    for (const entity of entities) {
      const key = `${entity.type}:${entity.id}`
      const cloudEntity = cloudMap.get(key)

      if (!cloudEntity) {
        // New entity - upload
        await db.upsertSyncData({
          userId,
          entityType: entity.type,
          entityId: entity.id,
          data: entity.data,
          checksum: entity.checksum,
          version: 1,
        })
        uploaded++
      } else if (cloudEntity.checksum !== entity.checksum) {
        // Conflict - use last-write-wins
        if (entity.version >= cloudEntity.version) {
          await db.upsertSyncData({
            userId,
            entityType: entity.type,
            entityId: entity.id,
            data: entity.data,
            checksum: entity.checksum,
            version: entity.version + 1,
          })
          uploaded++
        } else {
          conflicts.push({
            entityId: entity.id,
            localVersion: entity.version,
            remoteVersion: cloudEntity.version,
          })
        }
      }

      // Mark as processed
      cloudMap.delete(key)
    }

    // Remaining cloud entities are new to local
    downloaded = cloudMap.size

    // Update sync metadata
    const newSyncToken = generateId('sync')
    await db.updateSyncMetadata(userId, newSyncToken)

    return c.json({
      uploaded,
      downloaded,
      conflicts,
      newSyncToken,
    })
  } catch (error) {
    throw Errors.InternalError('Failed to perform batch sync')
  }
})

/**
 * Get sync status
 * GET /api/sync/status
 */
syncHandler.get('/status', async c => {
  const userId = c.get('userId') as string
  const db = new DatabaseHelpers(c.env.DB)

  try {
    const metadata = await db.getSyncMetadata(userId)

    // Count entities
    const syncData = await db.getSyncData(userId)

    return c.json({
      lastSyncTime: metadata?.last_sync_time || null,
      syncToken: metadata?.last_sync_token || null,
      pendingChanges: 0, // Would need to track this separately
      deviceCount: metadata?.device_count || 1,
      entityCount: (syncData as { results: unknown[] }).results.length,
    })
  } catch (error) {
    throw Errors.InternalError('Failed to get sync status')
  }
})
