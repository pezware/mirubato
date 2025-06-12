import type {
  QueryResolvers,
  MutationResolvers,
  PracticeSessionResolvers,
  PracticeSession,
  PracticeLog,
} from '../types/generated/graphql'
import { UserService } from '../services/user'
import { D1Database } from '@cloudflare/workers-types'

export const practiceResolvers = {
  Query: {
    practiceSession: async (_parent, { id }, context) => {
      try {
        const result = await context.env.DB.prepare(
          'SELECT * FROM practice_sessions WHERE id = ?'
        )
          .bind(id)
          .first<PracticeSession>()

        return result || null
      } catch (error) {
        console.error('Error fetching practice session:', error)
        return null
      }
    },

    myPracticeSessions: async (
      _parent,
      { instrument, offset = 0, limit = 20 },
      context
    ) => {
      if (!context.user) {
        throw new Error('Authentication required')
      }

      try {
        let query = 'SELECT * FROM practice_sessions WHERE user_id = ?'
        const params: (string | number)[] = [context.user.id]

        if (instrument) {
          query += ' AND instrument = ?'
          params.push(instrument)
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.push(limit ?? 10, offset ?? 0)

        const sessions = await context.env.DB.prepare(query)
          .bind(...params)
          .all<PracticeSession>()

        const countQuery = instrument
          ? 'SELECT COUNT(*) as count FROM practice_sessions WHERE user_id = ? AND instrument = ?'
          : 'SELECT COUNT(*) as count FROM practice_sessions WHERE user_id = ?'

        const countParams = instrument
          ? [context.user.id, instrument]
          : [context.user.id]
        const countResult = await context.env.DB.prepare(countQuery)
          .bind(...countParams)
          .first<{ count: number }>()

        const totalCount = countResult?.count || 0
        const hasNextPage = (offset ?? 0) + (limit ?? 10) < totalCount

        return {
          edges: sessions.results.map((session, index) => ({
            node: session,
            cursor: Buffer.from(`${(offset ?? 0) + index}`).toString('base64'),
          })),
          pageInfo: {
            hasNextPage,
            hasPreviousPage: (offset ?? 0) > 0,
            startCursor:
              sessions.results.length > 0
                ? Buffer.from(`${offset ?? 0}`).toString('base64')
                : null,
            endCursor:
              sessions.results.length > 0
                ? Buffer.from(
                    `${(offset ?? 0) + sessions.results.length - 1}`
                  ).toString('base64')
                : null,
          },
          totalCount,
        }
      } catch (error) {
        console.error('Error fetching practice sessions:', error)
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        }
      }
    },
  } as QueryResolvers,

  Mutation: {
    startPracticeSession: async (_parent, { input }, context) => {
      if (!context.user) {
        throw new Error('Authentication required')
      }

      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      try {
        await context.env.DB.prepare(
          `INSERT INTO practice_sessions (
            id, user_id, sheet_music_id, instrument, 
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'IN_PROGRESS', ?, ?)`
        )
          .bind(
            id,
            context.user.id,
            input.sheetMusicId,
            input.instrument,
            now,
            now
          )
          .run()

        // Fetch and return the created session
        const session = await context.env.DB.prepare(
          'SELECT * FROM practice_sessions WHERE id = ?'
        )
          .bind(id)
          .first<PracticeSession>()

        if (!session) {
          throw new Error('Failed to create practice session')
        }

        return session
      } catch (error) {
        console.error('Error starting practice session:', error)
        throw new Error('Failed to start practice session')
      }
    },

    pausePracticeSession: async (_parent, { sessionId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required')
      }

      try {
        await context.env.DB.prepare(
          `UPDATE practice_sessions 
           SET status = 'PAUSED', updated_at = ? 
           WHERE id = ? AND user_id = ? AND status = 'IN_PROGRESS'`
        )
          .bind(new Date().toISOString(), sessionId, context.user.id)
          .run()

        // Fetch and return the updated session
        const session = await context.env.DB.prepare(
          'SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?'
        )
          .bind(sessionId, context.user.id)
          .first<PracticeSession>()

        if (!session) {
          throw new Error('Practice session not found')
        }

        return session
      } catch (error) {
        console.error('Error pausing practice session:', error)
        throw new Error('Failed to pause practice session')
      }
    },

    resumePracticeSession: async (_parent, { sessionId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required')
      }

      try {
        await context.env.DB.prepare(
          `UPDATE practice_sessions 
           SET status = 'IN_PROGRESS', updated_at = ? 
           WHERE id = ? AND user_id = ? AND status = 'PAUSED'`
        )
          .bind(new Date().toISOString(), sessionId, context.user.id)
          .run()

        // Fetch and return the updated session
        const session = await context.env.DB.prepare(
          'SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?'
        )
          .bind(sessionId, context.user.id)
          .first<PracticeSession>()

        if (!session) {
          throw new Error('Practice session not found')
        }

        return session
      } catch (error) {
        console.error('Error resuming practice session:', error)
        throw new Error('Failed to resume practice session')
      }
    },

    completePracticeSession: async (_parent, { input }, context) => {
      if (!context.user) {
        throw new Error('Authentication required')
      }

      const now = new Date().toISOString()

      try {
        await context.env.DB.prepare(
          `UPDATE practice_sessions 
           SET status = 'COMPLETED', accuracy = ?, 
               notes_attempted = ?, notes_correct = ?, completed_at = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`
        )
          .bind(
            input.accuracy,
            input.notesAttempted || null,
            input.notesCorrect || null,
            now,
            now,
            input.sessionId,
            context.user.id
          )
          .run()

        const session = await context.env.DB.prepare(
          'SELECT * FROM practice_sessions WHERE id = ?'
        )
          .bind(input.sessionId)
          .first<PracticeSession>()

        if (!session) {
          throw new Error('Practice session not found')
        }

        return session
      } catch (error) {
        console.error('Error completing practice session:', error)
        throw new Error('Failed to complete practice session')
      }
    },

    createPracticeLog: async (_parent, { input }, context) => {
      if (!context.user) {
        throw new Error('Authentication required')
      }

      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      try {
        await context.env.DB.prepare(
          `INSERT INTO practice_logs (
            id, session_id, activity_type, duration_seconds,
            tempo_practiced, target_tempo, focus_areas, self_rating,
            notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            input.sessionId,
            input.activityType,
            input.durationSeconds,
            input.tempoPracticed || null,
            input.targetTempo || null,
            JSON.stringify(input.focusAreas || []),
            input.selfRating || null,
            input.notes || null,
            now
          )
          .run()

        const log = await context.env.DB.prepare(
          'SELECT * FROM practice_logs WHERE id = ?'
        )
          .bind(id)
          .first<PracticeLog>()

        if (!log) {
          throw new Error('Failed to create practice log')
        }

        return log
      } catch (error) {
        console.error('Error creating practice log:', error)
        throw new Error('Failed to create practice log')
      }
    },

    syncAnonymousData: async (
      _parent: any,
      { input }: { input: any },
      context: any
    ) => {
      if (!context.user) {
        throw new Error('Authentication required')
      }

      const errors: string[] = []
      let syncedSessions = 0
      let syncedLogs = 0
      let syncedEntries = 0
      let syncedGoals = 0

      const db = context.env.DB as D1Database

      try {
        // Start a transaction for atomic sync
        await db.batch([])

        // Sync practice sessions
        for (const session of input.sessions) {
          try {
            const sessionId = crypto.randomUUID()
            await db
              .prepare(
                `INSERT INTO practice_sessions (
                id, user_id, sheet_music_id, tempo, instrument,
                duration_minutes, status, accuracy, notes,
                created_at, updated_at, completed_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                sessionId,
                context.user.id,
                session.sheetMusicId,
                session.tempo,
                session.instrument,
                session.durationMinutes || 0,
                'COMPLETED', // Anonymous sessions are already completed
                session.accuracy || null,
                session.notes || null,
                session.createdAt || new Date().toISOString(),
                new Date().toISOString(),
                session.completedAt || new Date().toISOString()
              )
              .run()

            syncedSessions++
          } catch (error) {
            errors.push(`Failed to sync session: ${error}`)
          }
        }

        // Sync practice logs
        for (const log of input.logs) {
          try {
            await db
              .prepare(
                `INSERT INTO practice_logs (
                id, session_id, measure_number, mistake_type,
                mistake_details, tempo_achievement, notes, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                crypto.randomUUID(),
                log.sessionId,
                log.measureNumber,
                log.mistakeType || null,
                log.mistakeDetails || null,
                log.tempoAchievement || null,
                log.notes || null,
                log.createdAt || new Date().toISOString()
              )
              .run()

            syncedLogs++
          } catch (error) {
            errors.push(`Failed to sync log: ${error}`)
          }
        }

        // Sync logbook entries
        for (const entry of input.entries) {
          try {
            await db
              .prepare(
                `INSERT INTO logbook_entries (
                id, user_id, title, content, category,
                mood, energy_level, focus_level, progress_rating,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                crypto.randomUUID(),
                context.user.id,
                entry.title,
                entry.content,
                entry.category || 'practice',
                entry.mood || null,
                entry.energyLevel || null,
                entry.focusLevel || null,
                entry.progressRating || null,
                entry.createdAt || new Date().toISOString(),
                new Date().toISOString()
              )
              .run()

            syncedEntries++
          } catch (error) {
            errors.push(`Failed to sync entry: ${error}`)
          }
        }

        // Sync goals
        for (const goal of input.goals) {
          try {
            const goalId = crypto.randomUUID()
            await db
              .prepare(
                `INSERT INTO goals (
                id, user_id, title, description, target_value,
                current_value, unit, deadline, status,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                goalId,
                context.user.id,
                goal.title,
                goal.description || null,
                goal.targetValue,
                goal.currentValue || 0,
                goal.unit || null,
                goal.deadline || null,
                goal.status || 'active',
                new Date().toISOString(),
                new Date().toISOString()
              )
              .run()

            syncedGoals++
          } catch (error) {
            errors.push(`Failed to sync goal: ${error}`)
          }
        }

        return {
          success: errors.length === 0,
          syncedSessions,
          syncedLogs,
          syncedEntries,
          syncedGoals,
          errors,
        }
      } catch (error) {
        console.error('Error syncing anonymous data:', error)
        throw new Error('Failed to sync anonymous data')
      }
    },
  } as MutationResolvers,

  PracticeSession: {
    user: async (parent, _args, context) => {
      const userService = new UserService(context.env.DB)
      return userService.getUserById(
        (parent as any).user_id || (parent as any).userId
      )
    },

    sheetMusic: async (parent, _args, context) => {
      const sheetMusicId =
        (parent as any).sheet_music_id || (parent as any).sheetMusicId
      if (!sheetMusicId) return null

      try {
        const result = await context.env.DB.prepare(
          'SELECT * FROM sheet_music WHERE id = ?'
        )
          .bind(sheetMusicId)
          .first()

        return result || null
      } catch (error) {
        console.error('Error fetching sheet music:', error)
        return null
      }
    },

    logs: async (parent, _args, context) => {
      try {
        const result = await context.env.DB.prepare(
          'SELECT * FROM practice_logs WHERE session_id = ? ORDER BY created_at ASC'
        )
          .bind(parent.id)
          .all<PracticeLog>()

        return result.results || []
      } catch (error) {
        console.error('Error fetching practice logs:', error)
        return []
      }
    },
  } as PracticeSessionResolvers,
}
