import { Hono } from 'hono'
import type { Env } from '../../index'
import { authMiddleware, validateBody, type Variables } from '../middleware'
import {
  DatabaseHelpers,
  calculateChecksum,
  generateId,
} from '../../utils/database'
import {
  schemas,
  parseRecurrenceRule,
  normalizeRecurrenceMetadata,
} from '../../utils/validation'
import { Errors } from '../../utils/errors'
import { withIdempotency } from '../../utils/idempotency'
import {
  generateNormalizedScoreId,
  normalizeExistingScoreId,
} from '../../utils/scoreIdNormalizer'
import {
  broadcastPlanningEvents,
  type PlanningBroadcastEvent,
} from '../../services/syncWorkerBroadcaster'

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
    const practicePlans = []
    const planOccurrences = []

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
        } else if (item.entity_type === 'practice_plan') {
          practicePlans.push(data)
        } else if (item.entity_type === 'plan_occurrence') {
          planOccurrences.push(data)
        }
      } catch {
        // Error: Failed to parse sync data
        // Continue processing other items
      }
    }

    const syncToken = metadata?.last_sync_token || generateId('sync')

    return c.json({
      entries,
      goals,
      practicePlans,
      planOccurrences,
      syncToken,
      timestamp: new Date().toISOString(),
    })
  } catch {
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
    changes: {
      entries?: unknown[]
      goals?: unknown[]
      practicePlans?: unknown[]
      planOccurrences?: unknown[]
    }
  }
  const db = new DatabaseHelpers(c.env.DB)

  // Get idempotency key and device ID from headers
  const idempotencyKey = c.req.header('X-Idempotency-Key')
  const deviceId = c.req.header('X-Device-ID')

  // Enhanced debug logging for staging - commented out to avoid console warnings
  // Uncomment for debugging if needed
  // if (c.env.ENVIRONMENT === 'staging' || c.env.ENVIRONMENT === 'local') {
  //   console.log('[Sync Push] Starting sync for user:', userId)
  //   console.log('[Sync Push] Environment:', c.env.ENVIRONMENT)
  //   console.log('[Sync Push] Device ID:', deviceId || 'not provided')
  //   console.log(
  //     '[Sync Push] Idempotency Key:',
  //     idempotencyKey || 'not provided'
  //   )
  //   console.log('[Sync Push] Received changes:', {
  //     entriesCount: changes.entries?.length || 0,
  //     goalsCount: changes.goals?.length || 0,
  //     practicePlansCount: changes.practicePlans?.length || 0,
  //     planOccurrencesCount: changes.planOccurrences?.length || 0,
  //   })
  //   if (changes.entries && changes.entries.length > 0) {
  //     console.log(
  //       '[Sync Push] First entry sample:',
  //       JSON.stringify(changes.entries[0], null, 2)
  //     )
  //   }
  // }

  // Process with idempotency if key provided
  const processSync = async () => {
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
      practicePlansProcessed: 0,
      planOccurrencesProcessed: 0,
    }

    const planEventIndex = new Map<string, number>()
    const planEvents: Array<{
      type: 'PLAN_CREATED' | 'PLAN_UPDATED'
      plan: Record<string, unknown>
      occurrences: Record<string, unknown>[]
      seqs: number[]
    }> = []
    const occurrenceCompletionEvents: Array<{
      occurrence: Record<string, unknown>
      seq?: number
    }> = []

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

          // Normalize createdAt/updatedAt field names
          const timestampFields = transformedEntry as {
            createdAt?: string
            created_at?: string
            updatedAt?: string
            updated_at?: string
          }

          if (timestampFields.createdAt && !timestampFields.created_at) {
            timestampFields.created_at = timestampFields.createdAt
          }

          if (timestampFields.updatedAt && !timestampFields.updated_at) {
            timestampFields.updated_at = timestampFields.updatedAt
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
            // if (c.env.ENVIRONMENT === 'staging') {
            //   console.log(
            //     '[Sync Push] Soft deleted entry:',
            //     transformedEntry.id
            //   )
            // }
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

            // Normalize score IDs if pieces are present
            if (
              transformedEntry.pieces &&
              Array.isArray(transformedEntry.pieces)
            ) {
              // Normalize scoreId for each piece, preserving existing canonical IDs
              transformedEntry.pieces = transformedEntry.pieces.map(
                (piece: any) => {
                  if (piece && typeof piece === 'object') {
                    let scoreId: string | undefined

                    // Check if piece already has an ID
                    if (typeof piece.id === 'string' && piece.id.trim()) {
                      // Preserve existing ID (including canonical IDs from Scorebook)
                      scoreId = normalizeExistingScoreId(piece.id)
                    } else if (piece.title) {
                      // Only generate new ID if piece doesn't have one
                      scoreId = generateNormalizedScoreId(
                        piece.title,
                        piece.composer
                      )
                    }

                    return {
                      ...piece,
                      id: scoreId,
                    }
                  }
                  return piece
                }
              )
            }

            // Also normalize standalone scoreId field if present
            if (
              transformedEntry.scoreId &&
              typeof transformedEntry.scoreId === 'string'
            ) {
              // Use normalizeExistingScoreId to preserve canonical IDs
              transformedEntry.scoreId = normalizeExistingScoreId(
                transformedEntry.scoreId
              )
            }

            // Normalize scoreTitle and scoreComposer if present (for backward compatibility)
            if (
              transformedEntry.scoreTitle &&
              typeof transformedEntry.scoreTitle === 'string'
            ) {
              const scoreComposer =
                typeof transformedEntry.scoreComposer === 'string'
                  ? transformedEntry.scoreComposer
                  : ''
              const normalizedScoreId = generateNormalizedScoreId(
                transformedEntry.scoreTitle as string,
                scoreComposer
              )
              // Add the normalized scoreId to the entry
              transformedEntry.scoreId = normalizedScoreId
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
              // console.log(
              //   `[Sync Push] Duplicate prevented for entry ${entry.id}, ` +
              //     `using existing ${result.entity_id}`
              // )
            }

            // if (c.env.ENVIRONMENT === 'staging') {
            //   console.log(
            //     '[Sync Push] Successfully upserted entry:',
            //     entry.id
            //   )
            // }
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

    // Process practice plans
    if (changes.practicePlans && changes.practicePlans.length > 0) {
      for (const plan of changes.practicePlans as Array<{
        id: string
        [key: string]: unknown
      }>) {
        try {
          const transformedPlan = { ...plan }

          if (!transformedPlan.user_id) {
            transformedPlan.user_id = userId
          }

          if (transformedPlan.deletedAt) {
            await db.softDeleteSyncData(
              userId,
              'practice_plan',
              transformedPlan.id as string,
              transformedPlan.deletedAt as string
            )

            stats.practicePlansProcessed++
            continue
          }

          const timestampFields = transformedPlan as {
            createdAt?: string
            created_at?: string
            updatedAt?: string
            updated_at?: string
          }

          if (timestampFields.createdAt && !timestampFields.created_at) {
            timestampFields.created_at = timestampFields.createdAt
          }

          if (timestampFields.updatedAt && !timestampFields.updated_at) {
            timestampFields.updated_at = timestampFields.updatedAt
          }

          const schedule = transformedPlan.schedule as
            | {
                kind?: string
                rule?: unknown
                metadata?: unknown
              }
            | undefined

          if (schedule) {
            if (schedule.metadata && typeof schedule.metadata !== 'object') {
              schedule.metadata = {}
            }

            if (schedule.kind === 'recurring') {
              if (
                typeof schedule.rule !== 'string' ||
                schedule.rule.trim().length === 0
              ) {
                throw new Error('Invalid recurrence rule')
              }

              const normalizedRule = parseRecurrenceRule(schedule.rule)
              if (!normalizedRule) {
                throw new Error('Invalid recurrence rule')
              }

              const recurrenceMetadata = (
                schedule.metadata as {
                  recurrence?: unknown
                }
              )?.recurrence

              if (recurrenceMetadata) {
                const normalizedMetadata =
                  normalizeRecurrenceMetadata(recurrenceMetadata)
                if (!normalizedMetadata) {
                  throw new Error('Invalid recurrence metadata')
                }
              }
            }
          }

          const checksum = await calculateChecksum(transformedPlan)

          const result = await db.upsertSyncData({
            userId,
            entityType: 'practice_plan',
            entityId: transformedPlan.id as string,
            data: transformedPlan,
            checksum,
            deviceId,
          })

          stats.practicePlansProcessed++

          if (
            (result.action === 'created' || result.action === 'updated') &&
            transformedPlan.id
          ) {
            const eventType =
              result.action === 'created' ? 'PLAN_CREATED' : 'PLAN_UPDATED'
            const recordIndex = planEventIndex.get(transformedPlan.id as string)

            if (recordIndex !== undefined) {
              const existing = planEvents[recordIndex]
              existing.plan = transformedPlan
              if (typeof result.seq === 'number') {
                existing.seqs.push(result.seq)
              }
            } else {
              planEventIndex.set(
                transformedPlan.id as string,
                planEvents.length
              )
              planEvents.push({
                type: eventType,
                plan: transformedPlan,
                occurrences: [],
                seqs: typeof result.seq === 'number' ? [result.seq] : [],
              })
            }
          }
        } catch (planError) {
          conflicts.push({
            entityId: plan.id,
            entityType: 'practice_plan',
            reason:
              planError instanceof Error ? planError.message : 'Unknown error',
          })
        }
      }
    }

    // Process plan occurrences
    if (changes.planOccurrences && changes.planOccurrences.length > 0) {
      for (const occurrence of changes.planOccurrences as Array<{
        id: string
        planId?: string
        [key: string]: unknown
      }>) {
        try {
          const transformedOccurrence = { ...occurrence }

          if (!transformedOccurrence.user_id) {
            transformedOccurrence.user_id = userId
          }

          const planLinkFields = transformedOccurrence as {
            planId?: string
            plan_id?: string
          }

          if (planLinkFields.planId && !planLinkFields.plan_id) {
            planLinkFields.plan_id = planLinkFields.planId
          }

          if (transformedOccurrence.deletedAt) {
            await db.softDeleteSyncData(
              userId,
              'plan_occurrence',
              transformedOccurrence.id as string,
              transformedOccurrence.deletedAt as string
            )

            stats.planOccurrencesProcessed++
            continue
          }

          const timestampFields = transformedOccurrence as {
            createdAt?: string
            created_at?: string
            updatedAt?: string
            updated_at?: string
          }

          if (timestampFields.createdAt && !timestampFields.created_at) {
            timestampFields.created_at = timestampFields.createdAt
          }

          if (timestampFields.updatedAt && !timestampFields.updated_at) {
            timestampFields.updated_at = timestampFields.updatedAt
          }

          const checksum = await calculateChecksum(transformedOccurrence)

          const result = await db.upsertSyncData({
            userId,
            entityType: 'plan_occurrence',
            entityId: transformedOccurrence.id as string,
            data: transformedOccurrence,
            checksum,
            deviceId,
          })

          stats.planOccurrencesProcessed++

          if (result.action === 'created' || result.action === 'updated') {
            if (planLinkFields.plan_id) {
              const recordIndex = planEventIndex.get(planLinkFields.plan_id)
              if (recordIndex !== undefined) {
                planEvents[recordIndex].occurrences.push(transformedOccurrence)
                if (typeof result.seq === 'number') {
                  planEvents[recordIndex].seqs.push(result.seq)
                }
              }
            }

            if (
              transformedOccurrence.status === 'completed' &&
              !transformedOccurrence.deletedAt
            ) {
              occurrenceCompletionEvents.push({
                occurrence: transformedOccurrence,
                seq: result.seq,
              })
            }
          }
        } catch (occurrenceError) {
          conflicts.push({
            entityId: occurrence.id,
            entityType: 'plan_occurrence',
            reason:
              occurrenceError instanceof Error
                ? occurrenceError.message
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
              goalError instanceof Error ? goalError.message : 'Unknown error',
          })
        }
      }
    }

    const planningBroadcastEvents: PlanningBroadcastEvent[] = []

    for (const candidate of planEvents) {
      const validSeqs = candidate.seqs.filter(seq =>
        Number.isFinite(seq)
      ) as number[]

      if (validSeqs.length === 0) {
        continue
      }

      const highestSeq = Math.max(...validSeqs)
      planningBroadcastEvents.push({
        type: candidate.type,
        plan: candidate.plan,
        occurrences:
          candidate.occurrences.length > 0 ? candidate.occurrences : undefined,
        seq: highestSeq,
      })
    }

    for (const completion of occurrenceCompletionEvents) {
      if (typeof completion.seq === 'number') {
        planningBroadcastEvents.push({
          type: 'PLAN_OCCURRENCE_COMPLETED',
          occurrence: completion.occurrence,
          seq: completion.seq,
        })
      }
    }

    if (planningBroadcastEvents.length > 0) {
      await broadcastPlanningEvents(c.env, userId, planningBroadcastEvents)
    }

    // Update sync metadata with device info
    const newSyncToken = generateId('sync')
    await db.updateSyncMetadata(userId, newSyncToken)

    // Log sync event if we have the tracking
    if (
      deviceId &&
      (stats.entriesProcessed > 0 ||
        stats.practicePlansProcessed > 0 ||
        stats.planOccurrencesProcessed > 0 ||
        stats.goalsProcessed > 0)
    ) {
      // console.log('[Sync Push] Sync completed:', {
      //   userId,
      //   deviceId,
      //   entriesProcessed: stats.entriesProcessed,
      //   duplicatesPrevented: stats.duplicatesPrevented,
      //   goalsProcessed: stats.goalsProcessed,
      //   practicePlansProcessed: stats.practicePlansProcessed,
      //   planOccurrencesProcessed: stats.planOccurrencesProcessed,
      // })
    }

    return {
      success: true,
      syncToken: newSyncToken,
      conflicts,
      stats: {
        entriesProcessed: stats.entriesProcessed,
        duplicatesPrevented: stats.duplicatesPrevented,
        goalsProcessed: stats.goalsProcessed,
        practicePlansProcessed: stats.practicePlansProcessed,
        planOccurrencesProcessed: stats.planOccurrencesProcessed,
      },
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
      // console.log(
      //   `[Sync Push] Returned cached response for idempotency key: ${idempotencyKey}`
      // )
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
      practicePlansCount: changes.practicePlans?.length || 0,
      planOccurrencesCount: changes.planOccurrences?.length || 0,
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
  } catch {
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
  } catch {
    throw Errors.InternalError('Failed to get sync status')
  }
})
