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
import { withIdempotency } from '../../utils/idempotency'

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

  // Get idempotency key and device ID from headers
  const idempotencyKey = c.req.header('X-Idempotency-Key')
  const deviceId = c.req.header('X-Device-ID')

  // Enhanced debug logging for staging
  if (c.env.ENVIRONMENT === 'staging' || c.env.ENVIRONMENT === 'local') {
    console.log('[Sync Push] Starting sync for user:', userId)
    console.log('[Sync Push] Environment:', c.env.ENVIRONMENT)
    console.log('[Sync Push] Device ID:', deviceId || 'not provided')
    console.log(
      '[Sync Push] Idempotency Key:',
      idempotencyKey || 'not provided'
    )
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

  // Process with idempotency if key provided
  const processSync = async () => {
    try {
      // Process changes
      const conflicts: Array<{
        entityId: string
        entityType: string
        reason: string
      }> = []

      // Track duplicate prevention stats
      const stats = {
        entriesProcessed: 0,
        duplicatesPrevented: 0,
        goalsProcessed: 0,
      }

      // Process entries
      if (changes.entries && changes.entries.length > 0) {
        for (const entry of changes.entries as Array<{
          id: string
          instrument?: string
          type?: string
          mood?: string
          goalIds?: string[]
          goal_ids?: string[]
          user_id?: string
          [key: string]: unknown
        }>) {
          try {
            // Transform field names from frontend format to backend format
            const transformedEntry = { ...entry }

            // Add user_id if not present
            if (!transformedEntry.user_id) {
              transformedEntry.user_id = userId
            }

            // Transform goalIds to goal_ids if needed
            if (transformedEntry.goalIds && !transformedEntry.goal_ids) {
              transformedEntry.goal_ids = transformedEntry.goalIds
              delete transformedEntry.goalIds
            }

            // Check if this is a deletion request
            if (transformedEntry.deletedAt) {
              // Handle soft delete more efficiently
              await db.softDeleteSyncData(
                userId,
                'logbook_entry',
                transformedEntry.id,
                transformedEntry.deletedAt as string
              )

              stats.entriesProcessed++
              if (c.env.ENVIRONMENT === 'staging') {
                console.log(
                  '[Sync Push] Soft deleted entry:',
                  transformedEntry.id
                )
              }
            } else {
              // Normalize enum fields to lowercase for database compatibility
              if (
                transformedEntry.instrument &&
                typeof transformedEntry.instrument === 'string'
              ) {
                transformedEntry.instrument =
                  transformedEntry.instrument.toLowerCase()
              }
              if (
                transformedEntry.type &&
                typeof transformedEntry.type === 'string'
              ) {
                transformedEntry.type = transformedEntry.type.toLowerCase()
              }
              if (
                transformedEntry.mood &&
                typeof transformedEntry.mood === 'string'
              ) {
                transformedEntry.mood = transformedEntry.mood.toLowerCase()
              }

              const checksum = await calculateChecksum(transformedEntry)

              const result = await db.upsertSyncData({
                userId,
                entityType: 'logbook_entry',
                entityId: transformedEntry.id,
                data: transformedEntry,
                checksum,
                deviceId,
              })

              stats.entriesProcessed++
              if (result.action === 'duplicate_prevented') {
                stats.duplicatesPrevented++
                console.log(
                  `[Sync Push] Duplicate prevented for entry ${entry.id}, ` +
                    `using existing ${result.entity_id}`
                )
              }

              if (c.env.ENVIRONMENT === 'staging') {
                console.log(
                  '[Sync Push] Successfully upserted entry:',
                  entry.id
                )
              }
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
              deviceId,
            })

            stats.goalsProcessed++
          } catch (goalError) {
            // Error: Failed to process goal
            // Continue processing other goals but track the error
            conflicts.push({
              entityId: goal.id,
              entityType: 'goal',
              reason:
                goalError instanceof Error
                  ? goalError.message
                  : 'Unknown error',
            })
          }
        }
      }

      // Update sync metadata with device info
      const newSyncToken = generateId('sync')
      await db.updateSyncMetadata(userId, newSyncToken)

      // Log sync event if we have the tracking
      if (deviceId && stats.entriesProcessed > 0) {
        console.log('[Sync Push] Sync completed:', {
          userId,
          deviceId,
          entriesProcessed: stats.entriesProcessed,
          duplicatesPrevented: stats.duplicatesPrevented,
          goalsProcessed: stats.goalsProcessed,
        })
      }

      return {
        success: true,
        syncToken: newSyncToken,
        conflicts,
        stats: {
          entriesProcessed: stats.entriesProcessed,
          duplicatesPrevented: stats.duplicatesPrevented,
          goalsProcessed: stats.goalsProcessed,
        },
      }
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
      throw error
    }
  }

  // Apply idempotency wrapper if key provided
  if (idempotencyKey) {
    const { response, wasReplayed } = await withIdempotency(
      c.env.DB,
      idempotencyKey,
      userId,
      c.get('validatedBody'),
      processSync
    )

    if (wasReplayed) {
      console.log(
        `[Sync Push] Returned cached response for idempotency key: ${idempotencyKey}`
      )
      return c.json(response, {
        headers: {
          'X-Idempotent-Replay': 'true',
        },
      })
    }

    return c.json(response)
  }

  // No idempotency key, process directly
  try {
    const result = await processSync()
    return c.json(result)
  } catch (error) {
    // Enhanced error details for all environments temporarily
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = {
      userId,
      deviceId,
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
