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
    const results = (syncData as any).results || []

    for (const item of results) {
      try {
        // Parse the JSON data safely
        const data =
          typeof item.data === 'string' ? JSON.parse(item.data) : item.data

        if (item.entity_type === 'logbook_entry') {
          entries.push(data)
        } else if (item.entity_type === 'goal') {
          goals.push(data)
        }
      } catch (parseError) {
        console.error(
          `Error parsing sync data for ${item.entity_type} ${item.entity_id}:`,
          parseError
        )
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
    console.error('Error pulling sync data:', error)
    throw Errors.InternalError('Failed to pull sync data')
  }
})

/**
 * Push local changes to cloud
 * POST /api/sync/push
 */
syncHandler.post('/push', validateBody(schemas.syncChanges), async c => {
  const userId = c.get('userId') as string
  const { changes } = c.get('validatedBody') as any
  const db = new DatabaseHelpers(c.env.DB)

  // Add detailed logging for debugging
  console.log('[Sync Push] Starting sync for user:', userId)
  console.log('[Sync Push] Received changes:', JSON.stringify(changes, null, 2))

  try {
    // Process changes
    const conflicts: any[] = []

    // Process entries
    if (changes.entries && changes.entries.length > 0) {
      console.log(`[Sync Push] Processing ${changes.entries.length} entries`)

      for (const entry of changes.entries) {
        try {
          console.log(`[Sync Push] Processing entry ${entry.id}`)
          console.log('[Sync Push] Entry data:', JSON.stringify(entry, null, 2))

          const checksum = await calculateChecksum(entry)
          console.log(`[Sync Push] Calculated checksum: ${checksum}`)

          await db.upsertSyncData({
            userId,
            entityType: 'logbook_entry',
            entityId: entry.id,
            data: entry,
            checksum,
          })

          console.log(`[Sync Push] Successfully stored entry ${entry.id}`)
        } catch (entryError) {
          console.error(
            `[Sync Push] Error processing entry ${entry.id}:`,
            entryError
          )
          // Continue processing other entries but track the error
          conflicts.push({
            entityId: entry.id,
            entityType: 'logbook_entry',
            error:
              entryError instanceof Error
                ? entryError.message
                : 'Unknown error',
          })
        }
      }
    }

    // Process goals
    if (changes.goals && changes.goals.length > 0) {
      console.log(`[Sync Push] Processing ${changes.goals.length} goals`)

      for (const goal of changes.goals) {
        try {
          console.log(`[Sync Push] Processing goal ${goal.id}`)
          console.log('[Sync Push] Goal data:', JSON.stringify(goal, null, 2))

          const checksum = await calculateChecksum(goal)
          console.log(`[Sync Push] Calculated checksum: ${checksum}`)

          await db.upsertSyncData({
            userId,
            entityType: 'goal',
            entityId: goal.id,
            data: goal,
            checksum,
          })

          console.log(`[Sync Push] Successfully stored goal ${goal.id}`)
        } catch (goalError) {
          console.error(
            `[Sync Push] Error processing goal ${goal.id}:`,
            goalError
          )
          // Continue processing other goals but track the error
          conflicts.push({
            entityId: goal.id,
            entityType: 'goal',
            error:
              goalError instanceof Error ? goalError.message : 'Unknown error',
          })
        }
      }
    }

    // Update sync metadata
    const newSyncToken = generateId('sync')
    console.log(
      `[Sync Push] Updating sync metadata with token: ${newSyncToken}`
    )

    await db.updateSyncMetadata(userId, newSyncToken)

    console.log('[Sync Push] Sync completed successfully')
    console.log(`[Sync Push] Conflicts: ${conflicts.length}`)

    return c.json({
      success: true,
      syncToken: newSyncToken,
      conflicts,
    })
  } catch (error) {
    console.error('[Sync Push] Fatal error:', error)
    console.error(
      '[Sync Push] Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    )

    // Return more detailed error for debugging
    if (c.env.ENVIRONMENT !== 'production') {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        500
      )
    }

    throw Errors.InternalError('Failed to push sync data')
  }
})

/**
 * Batch sync operation
 * POST /api/sync/batch
 */
syncHandler.post('/batch', validateBody(schemas.syncBatch), async c => {
  const userId = c.get('userId') as string
  const { entities } = c.get('validatedBody') as any
  const db = new DatabaseHelpers(c.env.DB)

  try {
    let uploaded = 0
    let downloaded = 0
    const conflicts = []

    // Get current cloud data for comparison
    const cloudData = await db.getSyncData(userId)
    const cloudMap = new Map()

    for (const item of (cloudData as any).results) {
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
    console.error('Error in batch sync:', error)
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
      entityCount: (syncData as any).results.length,
    })
  } catch (error) {
    console.error('Error getting sync status:', error)
    throw Errors.InternalError('Failed to get sync status')
  }
})
