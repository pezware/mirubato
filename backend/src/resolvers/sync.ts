import { AuthenticationError } from '../utils/errors'
import { nanoid } from 'nanoid'
import type { GraphQLContext as Context } from '../types/context'
import type {
  SyncEntityInput,
  SyncBatchInput,
  UserData,
  SyncEntity,
} from '../types/generated/graphql'

export const syncResolvers = {
  Query: {
    syncMetadata: async (
      _: unknown,
      { userId }: { userId: string },
      ctx: Context
    ) => {
      console.log('[Sync Debug] Context user:', JSON.stringify(ctx.user))
      console.log('[Sync Debug] Requested userId:', userId)

      if (!ctx.user) {
        throw new AuthenticationError('Not authenticated')
      }

      // Get user's sync metadata from database
      const metadata = await ctx.env.DB.prepare(
        'SELECT * FROM sync_metadata WHERE user_id = ?'
      )
        .bind(userId)
        .first()

      if (!metadata) {
        // Return default metadata for new user
        return {
          lastSyncTimestamp: 0,
          syncToken: null,
          pendingSyncCount: 0,
          lastSyncStatus: 'never_synced',
          lastSyncError: null,
        }
      }

      interface DbSyncMetadata {
        last_sync_timestamp?: number
        sync_token?: string | null
        pending_sync_count?: number
        last_sync_status?: string
        last_sync_error?: string | null
      }
      const dbMetadata = metadata as DbSyncMetadata
      return {
        lastSyncTimestamp: dbMetadata.last_sync_timestamp || 0,
        syncToken: dbMetadata.sync_token || null,
        pendingSyncCount: dbMetadata.pending_sync_count || 0,
        lastSyncStatus: dbMetadata.last_sync_status || 'never',
        lastSyncError: dbMetadata.last_sync_error || null,
      }
    },

    syncChangesSince: async (
      _: unknown,
      { syncToken }: { syncToken: string },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new AuthenticationError('Not authenticated')
      }

      // Parse sync token to get timestamp and user ID
      const [userId, timestamp] = syncToken.split(':')

      if (!userId || !timestamp) {
        throw new Error('Invalid sync token format')
      }

      if (userId !== ctx.user.id) {
        throw new AuthenticationError('Invalid sync token')
      }

      const timestampNumber = parseInt(timestamp, 10)
      if (isNaN(timestampNumber)) {
        throw new Error('Invalid timestamp in sync token')
      }

      const since = new Date(timestampNumber).toISOString()

      // Query for changes since timestamp
      const [sessions, goals, entries, deleted] = await Promise.all([
        ctx.env.DB.prepare(
          'SELECT * FROM practice_sessions WHERE user_id = ? AND updated_at > ? AND deleted_at IS NULL'
        )
          .bind(userId, since)
          .all(),
        ctx.env.DB.prepare(
          'SELECT * FROM practice_goals WHERE user_id = ? AND updated_at > ? AND deleted_at IS NULL'
        )
          .bind(userId, since)
          .all(),
        ctx.env.DB.prepare(
          'SELECT * FROM logbook_entries WHERE user_id = ? AND updated_at > ? AND deleted_at IS NULL'
        )
          .bind(userId, since)
          .all(),
        ctx.env.DB.prepare(
          'SELECT entity_id FROM deleted_entities WHERE user_id = ? AND deleted_at > ?'
        )
          .bind(userId, since)
          .all(),
      ])

      // Convert to sync entities
      const entities: SyncEntity[] = []

      // Add practice sessions
      interface DbPracticeSession {
        id: string
        started_at?: string
        created_at?: string
        updated_at: string
        sync_version?: number
        checksum?: string
        [key: string]: unknown
      }
      if (sessions.results) {
        sessions.results.forEach(session => {
          const typedSession = session as DbPracticeSession
          entities.push({
            id: typedSession.id,
            entityType: 'practiceSession',
            createdAt: new Date(
              typedSession.started_at || typedSession.created_at || 0
            ).getTime(),
            updatedAt: new Date(typedSession.updated_at).getTime(),
            syncVersion: typedSession.sync_version || 1,
            checksum: typedSession.checksum || '',
            data: typedSession,
          } as SyncEntity)
        })
      }

      // Add goals
      interface DbGoal {
        id: string
        created_at: number
        updated_at: number
        sync_version?: number
        checksum?: string
        [key: string]: unknown
      }
      if (goals.results) {
        goals.results.forEach(goal => {
          const typedGoal = goal as DbGoal
          entities.push({
            id: typedGoal.id,
            entityType: 'goal',
            createdAt: new Date(typedGoal.created_at).getTime(),
            updatedAt: new Date(typedGoal.updated_at).getTime(),
            syncVersion: typedGoal.sync_version || 1,
            checksum: typedGoal.checksum || '',
            data: typedGoal,
          } as SyncEntity)
        })
      }

      // Add logbook entries
      interface DbLogbookEntry {
        id: string
        created_at: number
        updated_at: number
        sync_version?: number
        checksum?: string
        [key: string]: unknown
      }
      if (entries.results) {
        entries.results.forEach(entry => {
          const typedEntry = entry as DbLogbookEntry
          entities.push({
            id: typedEntry.id,
            entityType: 'logbookEntry',
            createdAt: new Date(typedEntry.created_at).getTime(),
            updatedAt: new Date(typedEntry.updated_at).getTime(),
            syncVersion: typedEntry.sync_version || 1,
            checksum: typedEntry.checksum || '',
            data: typedEntry,
          } as SyncEntity)
        })
      }

      // Generate new sync token
      const newSyncToken = `${userId}:${Date.now()}`

      return {
        entities,
        deletedIds:
          deleted.results?.map(d => (d as { entity_id: string }).entity_id) ||
          [],
        newSyncToken,
      }
    },

    allUserData: async (
      _: unknown,
      { userId }: { userId: string },
      ctx: Context
    ) => {
      if (!ctx.user || ctx.user.id !== userId) {
        throw new AuthenticationError('Not authorized')
      }

      // Fetch all user data (excluding soft-deleted items)
      const [sessions, goals, entries] = await Promise.all([
        ctx.env.DB.prepare(
          'SELECT * FROM practice_sessions WHERE user_id = ? AND deleted_at IS NULL'
        )
          .bind(userId)
          .all(),
        ctx.env.DB.prepare(
          'SELECT * FROM practice_goals WHERE user_id = ? AND deleted_at IS NULL'
        )
          .bind(userId)
          .all(),
        ctx.env.DB.prepare(
          'SELECT * FROM logbook_entries WHERE user_id = ? AND deleted_at IS NULL'
        )
          .bind(userId)
          .all(),
      ])

      // Return properly typed results for GraphQL
      // The field resolvers will handle the transformation from database format
      return {
        practiceSessions: sessions.results || [],
        practiceGoals: goals.results || [],
        logbookEntries: entries.results || [],
      } as unknown as UserData
    },
  },

  Mutation: {
    syncBatch: async (
      _: unknown,
      { batch }: { batch: SyncBatchInput },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new AuthenticationError('Not authenticated')
      }

      // Verify user owns the data they're trying to sync
      if (batch.userId !== ctx.user.id) {
        throw new AuthenticationError(
          'Unauthorized to sync data for another user'
        )
      }

      const results = {
        uploaded: 0,
        failed: 0,
        errors: [] as Array<{ entityId: string; error: string }>,
      }

      // Process each entity
      for (const entity of batch.entities) {
        try {
          switch (entity.entityType) {
            case 'practiceSession':
              await syncPracticeSession(entity, ctx)
              break
            case 'goal':
              await syncGoal(entity, ctx)
              break
            case 'logbookEntry':
              await syncLogbookEntry(entity, ctx)
              break
            default:
              throw new Error(`Unknown entity type: ${entity.entityType}`)
          }
          results.uploaded++
        } catch (error) {
          results.failed++
          results.errors.push({
            entityId: entity.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      // Generate new sync token
      const newSyncToken = `${ctx.user.id}:${Date.now()}`

      // Update sync metadata in database
      await ctx.env.DB.prepare(
        `INSERT INTO sync_metadata (user_id, last_sync_timestamp, sync_token, 
         pending_sync_count, last_sync_status, last_sync_error, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
         last_sync_timestamp = excluded.last_sync_timestamp,
         sync_token = excluded.sync_token,
         pending_sync_count = excluded.pending_sync_count,
         last_sync_status = excluded.last_sync_status,
         last_sync_error = excluded.last_sync_error,
         updated_at = CURRENT_TIMESTAMP`
      )
        .bind(
          ctx.user.id,
          Date.now(),
          newSyncToken,
          0,
          results.failed > 0 ? 'partial' : 'success',
          results.failed > 0 ? `${results.failed} entities failed` : null
        )
        .run()

      return {
        ...results,
        newSyncToken,
      }
    },

    updateSyncMetadata: async (
      _: unknown,
      args: {
        userId: string
        lastSyncTimestamp: number
        syncToken: string
        status: string
      },
      ctx: Context
    ) => {
      if (!ctx.user || ctx.user.id !== args.userId) {
        throw new AuthenticationError('Not authorized')
      }

      // Update sync metadata in database
      await ctx.env.DB.prepare(
        `INSERT INTO sync_metadata (user_id, last_sync_timestamp, sync_token, 
         pending_sync_count, last_sync_status, last_sync_error, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
         last_sync_timestamp = excluded.last_sync_timestamp,
         sync_token = excluded.sync_token,
         pending_sync_count = excluded.pending_sync_count,
         last_sync_status = excluded.last_sync_status,
         last_sync_error = excluded.last_sync_error,
         updated_at = CURRENT_TIMESTAMP`
      )
        .bind(
          args.userId,
          args.lastSyncTimestamp,
          args.syncToken,
          0,
          args.status,
          null
        )
        .run()

      // Also store in KV for quick access
      const metadata = {
        lastSyncTimestamp: args.lastSyncTimestamp,
        syncToken: args.syncToken,
        pendingSyncCount: 0,
        lastSyncStatus: args.status,
        lastSyncError: null,
      }

      await ctx.env.MIRUBATO_MAGIC_LINKS.put(
        `sync:metadata:${args.userId}`,
        JSON.stringify(metadata)
      )

      return metadata
    },
  },
}

// Helper functions for syncing different entity types

async function syncPracticeSession(entity: SyncEntityInput, ctx: Context) {
  const data =
    typeof entity.data === 'string' ? JSON.parse(entity.data) : entity.data
  const id = entity.remoteId || nanoid()

  // Check if exists
  const existing = await ctx.env.DB.prepare(
    'SELECT id, sync_version, checksum FROM practice_sessions WHERE id = ?'
  )
    .bind(id)
    .first()

  interface DbExistingSession {
    id: string
    sync_version?: number
    checksum?: string
  }

  if (existing) {
    // Check for conflicts
    const existingSession = existing as unknown as DbExistingSession
    const existingSyncVersion = existingSession.sync_version || 0
    const existingChecksum = existingSession.checksum || ''
    if (
      existingChecksum !== entity.checksum &&
      existingSyncVersion >= entity.syncVersion
    ) {
      // Conflict detected - for now, last write wins
      // In a production system, you'd implement proper conflict resolution
    }

    // Update existing
    await ctx.env.DB.prepare(
      `UPDATE practice_sessions 
       SET instrument = ?, sheet_music_id = ?, session_type = ?, 
           started_at = ?, completed_at = ?, paused_duration = ?,
           accuracy_percentage = ?, notes_attempted = ?, notes_correct = ?,
           sync_version = ?, checksum = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        data.instrument,
        data.sheetMusicId,
        data.sessionType || 'FREE_PRACTICE',
        data.startedAt,
        data.completedAt,
        data.pausedDuration || 0,
        data.accuracyPercentage,
        data.notesAttempted || 0,
        data.notesCorrect || 0,
        entity.syncVersion + 1,
        entity.checksum,
        id
      )
      .run()
  } else {
    // Insert new
    await ctx.env.DB.prepare(
      `INSERT INTO practice_sessions 
       (id, user_id, instrument, sheet_music_id, session_type,
        started_at, completed_at, paused_duration, accuracy_percentage,
        notes_attempted, notes_correct, sync_version, checksum, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
      .bind(
        id,
        ctx.user!.id,
        data.instrument,
        data.sheetMusicId,
        data.sessionType || 'FREE_PRACTICE',
        data.startedAt,
        data.completedAt,
        data.pausedDuration || 0,
        data.accuracyPercentage,
        data.notesAttempted || 0,
        data.notesCorrect || 0,
        entity.syncVersion,
        entity.checksum
      )
      .run()
  }
}

async function syncGoal(entity: SyncEntityInput, ctx: Context) {
  const data =
    typeof entity.data === 'string' ? JSON.parse(entity.data) : entity.data
  const id = entity.remoteId || nanoid()

  const existing = await ctx.env.DB.prepare(
    'SELECT id, sync_version, checksum FROM practice_goals WHERE id = ?'
  )
    .bind(id)
    .first()

  interface DbExistingGoal {
    id: string
    sync_version?: number
    checksum?: string
  }

  if (existing) {
    // Check for conflicts
    const existingGoal = existing as unknown as DbExistingGoal
    const existingSyncVersion = existingGoal.sync_version || 0
    const existingChecksum = existingGoal.checksum || ''
    if (
      existingChecksum !== entity.checksum &&
      existingSyncVersion >= entity.syncVersion
    ) {
      // Conflict detected - for now, last write wins
    }

    await ctx.env.DB.prepare(
      `UPDATE practice_goals 
       SET title = ?, description = ?, target_date = ?, 
           progress = ?, status = ?, milestones = ?,
           completed_at = ?, sync_version = ?, checksum = ?, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        data.title,
        data.description,
        data.targetDate,
        data.progress || 0,
        data.status || 'ACTIVE',
        JSON.stringify(data.milestones || []),
        data.completedAt,
        entity.syncVersion + 1,
        entity.checksum,
        id
      )
      .run()
  } else {
    await ctx.env.DB.prepare(
      `INSERT INTO practice_goals 
       (id, user_id, title, description, target_date, progress,
        status, milestones, linked_entries, created_at, updated_at,
        completed_at, sync_version, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        ctx.user!.id,
        data.title,
        data.description,
        data.targetDate,
        data.progress || 0,
        data.status || 'ACTIVE',
        JSON.stringify(data.milestones || []),
        JSON.stringify(data.linkedEntries || []),
        Date.now(),
        Date.now(),
        data.completedAt,
        entity.syncVersion,
        entity.checksum
      )
      .run()
  }
}

async function syncLogbookEntry(entity: SyncEntityInput, ctx: Context) {
  const data =
    typeof entity.data === 'string' ? JSON.parse(entity.data) : entity.data
  const id = entity.remoteId || nanoid()

  const existing = await ctx.env.DB.prepare(
    'SELECT id, sync_version, checksum FROM logbook_entries WHERE id = ?'
  )
    .bind(id)
    .first()

  interface DbExistingEntry {
    id: string
    sync_version?: number
    checksum?: string
  }

  if (existing) {
    // Check for conflicts
    const existingEntry = existing as unknown as DbExistingEntry
    const existingSyncVersion = existingEntry.sync_version || 0
    const existingChecksum = existingEntry.checksum || ''
    if (
      existingChecksum !== entity.checksum &&
      existingSyncVersion >= entity.syncVersion
    ) {
      // Conflict detected - for now, last write wins
    }

    await ctx.env.DB.prepare(
      `UPDATE logbook_entries 
       SET timestamp = ?, duration = ?, type = ?, instrument = ?,
           pieces = ?, techniques = ?, goal_ids = ?, notes = ?,
           mood = ?, tags = ?, session_id = ?, metadata = ?,
           sync_version = ?, checksum = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        data.timestamp,
        data.duration,
        data.type || 'PRACTICE',
        data.instrument,
        JSON.stringify(data.pieces || []),
        JSON.stringify(data.techniques || []),
        JSON.stringify(data.goalIds || []),
        data.notes,
        data.mood,
        JSON.stringify(data.tags || []),
        data.sessionId,
        JSON.stringify(data.metadata || {}),
        entity.syncVersion + 1,
        entity.checksum,
        Date.now(),
        id
      )
      .run()
  } else {
    await ctx.env.DB.prepare(
      `INSERT INTO logbook_entries 
       (id, user_id, timestamp, duration, type, instrument,
        pieces, techniques, goal_ids, notes, mood, tags,
        session_id, metadata, created_at, updated_at,
        sync_version, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        ctx.user!.id,
        data.timestamp,
        data.duration,
        data.type || 'PRACTICE',
        data.instrument,
        JSON.stringify(data.pieces || []),
        JSON.stringify(data.techniques || []),
        JSON.stringify(data.goalIds || []),
        data.notes,
        data.mood,
        JSON.stringify(data.tags || []),
        data.sessionId,
        JSON.stringify(data.metadata || {}),
        Date.now(),
        Date.now(),
        entity.syncVersion,
        entity.checksum
      )
      .run()
  }
}
