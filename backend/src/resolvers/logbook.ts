import type { LogbookEntry, Goal, Resolvers } from '../types/generated/graphql'
import { nanoid } from 'nanoid'

export const logbookResolvers: Resolvers = {
  Query: {
    logbookEntry: async (_parent, { id }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        const result = await context.env.DB.prepare(
          'SELECT * FROM logbook_entries WHERE id = ? AND user_id = ?'
        )
          .bind(id, context.user.id)
          .first()

        if (!result) {
          return null
        }

        // Parse JSON fields
        return {
          ...result,
          pieces: JSON.parse(result.pieces as string),
          techniques: JSON.parse(result.techniques as string),
          goalIds: JSON.parse(result.goal_ids as string),
          tags: JSON.parse(result.tags as string),
          metadata: result.metadata
            ? JSON.parse(result.metadata as string)
            : null,
          timestamp: new Date(result.timestamp as number).toISOString(),
          createdAt: new Date(result.created_at as number).toISOString(),
          updatedAt: new Date(result.updated_at as number).toISOString(),
          user: context.user, // Include the user object to satisfy TypeScript
        } as LogbookEntry
      } catch (error) {
        console.error('Error fetching logbook entry:', error)
        throw new Error('Failed to fetch logbook entry')
      }
    },

    myLogbookEntries: async (_parent, { filter, offset, limit }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        // Set defaults for pagination
        const actualOffset = offset ?? 0
        const actualLimit = limit ?? 20

        // Build query with filters
        let query = 'SELECT * FROM logbook_entries WHERE user_id = ?'
        const params: unknown[] = [context.user.id]

        if (filter) {
          if (filter.type && filter.type.length > 0) {
            query +=
              ' AND type IN (' + filter.type.map(() => '?').join(',') + ')'
            params.push(...filter.type)
          }

          if (filter.instrument) {
            query += ' AND instrument = ?'
            params.push(filter.instrument)
          }

          if (filter.startDate) {
            query += ' AND timestamp >= ?'
            params.push(new Date(filter.startDate).getTime())
          }

          if (filter.endDate) {
            query += ' AND timestamp <= ?'
            params.push(new Date(filter.endDate).getTime())
          }

          if (filter.mood && filter.mood.length > 0) {
            query +=
              ' AND mood IN (' + filter.mood.map(() => '?').join(',') + ')'
            params.push(...filter.mood)
          }
        }

        // Get total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
        const countResult = (await context.env.DB.prepare(countQuery)
          .bind(...params)
          .first()) as { count: number }

        const totalCount = countResult?.count || 0

        // Add ordering and pagination
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
        params.push(actualLimit, actualOffset)

        // Execute query
        const { results } = await context.env.DB.prepare(query)
          .bind(...params)
          .all()

        // Transform results
        const entries = results.map((row: Record<string, unknown>) => ({
          ...row,
          pieces: JSON.parse(row.pieces as string),
          techniques: JSON.parse(row.techniques as string),
          goalIds: JSON.parse(row.goal_ids as string),
          tags: JSON.parse(row.tags as string),
          metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
          timestamp: new Date(row.timestamp as number).toISOString(),
          createdAt: new Date(row.created_at as number).toISOString(),
          updatedAt: new Date(row.updated_at as number).toISOString(),
          user: context.user, // Include the user object to satisfy TypeScript
        })) as LogbookEntry[]

        // Build edges with cursors
        const edges = entries.map((entry, index) => ({
          node: entry,
          cursor: Buffer.from(`${actualOffset + index}`).toString('base64'),
        }))

        return {
          edges,
          pageInfo: {
            hasNextPage: actualOffset + actualLimit < totalCount,
            hasPreviousPage: actualOffset > 0,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          totalCount,
        }
      } catch (error) {
        console.error('Error listing logbook entries:', error)
        throw new Error('Failed to list logbook entries')
      }
    },

    goal: async (_parent, { id }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        const result = await context.env.DB.prepare(
          'SELECT * FROM goals WHERE id = ? AND user_id = ?'
        )
          .bind(id, context.user.id)
          .first()

        if (!result) {
          return null
        }

        // Parse JSON fields
        return {
          ...result,
          milestones: JSON.parse(result.milestones as string),
          linkedEntries: JSON.parse(result.linked_entries as string),
          targetDate: result.target_date
            ? new Date(result.target_date as number).toISOString()
            : null,
          createdAt: new Date(result.created_at as number).toISOString(),
          updatedAt: new Date(result.updated_at as number).toISOString(),
          completedAt: result.completed_at
            ? new Date(result.completed_at as number).toISOString()
            : null,
          user: context.user, // Include the user object to satisfy TypeScript
        } as Goal
      } catch (error) {
        console.error('Error fetching goal:', error)
        throw new Error('Failed to fetch goal')
      }
    },

    myGoals: async (_parent, { status, offset, limit }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        // Set defaults for pagination
        const actualOffset = offset ?? 0
        const actualLimit = limit ?? 20

        // Build query with filters
        let query = 'SELECT * FROM goals WHERE user_id = ?'
        const params: unknown[] = [context.user.id]

        if (status) {
          query += ' AND status = ?'
          params.push(status)
        }

        // Get total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
        const countResult = (await context.env.DB.prepare(countQuery)
          .bind(...params)
          .first()) as { count: number }

        const totalCount = countResult?.count || 0

        // Add ordering and pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.push(actualLimit, actualOffset)

        // Execute query
        const { results } = await context.env.DB.prepare(query)
          .bind(...params)
          .all()

        // Transform results
        const goals = results.map((row: Record<string, unknown>) => ({
          ...row,
          milestones: JSON.parse(row.milestones as string),
          linkedEntries: JSON.parse(row.linked_entries as string),
          targetDate: row.target_date
            ? new Date(row.target_date as number).toISOString()
            : null,
          createdAt: new Date(row.created_at as number).toISOString(),
          updatedAt: new Date(row.updated_at as number).toISOString(),
          completedAt: row.completed_at
            ? new Date(row.completed_at as number).toISOString()
            : null,
          user: context.user, // Include the user object to satisfy TypeScript
        })) as Goal[]

        // Build edges with cursors
        const edges = goals.map((goal, index) => ({
          node: goal,
          cursor: Buffer.from(`${actualOffset + index}`).toString('base64'),
        }))

        return {
          edges,
          pageInfo: {
            hasNextPage: actualOffset + actualLimit < totalCount,
            hasPreviousPage: actualOffset > 0,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          totalCount,
        }
      } catch (error) {
        console.error('Error listing goals:', error)
        throw new Error('Failed to list goals')
      }
    },
  },

  Mutation: {
    createLogbookEntry: async (_parent, { input }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        const id = nanoid()
        const now = Date.now()
        const timestamp = input.timestamp
          ? new Date(input.timestamp).getTime()
          : now

        await context.env.DB.prepare(
          `
            INSERT INTO logbook_entries (
              id, user_id, timestamp, duration, type, instrument,
              pieces, techniques, goal_ids, notes, mood, tags,
              session_id, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
          .bind(
            id,
            context.user.id,
            timestamp,
            input.duration,
            input.type,
            input.instrument,
            JSON.stringify(input.pieces),
            JSON.stringify(input.techniques || []),
            JSON.stringify(input.goalIds || []),
            input.notes || null,
            input.mood || null,
            JSON.stringify(input.tags || []),
            input.sessionId || null,
            input.metadata ? JSON.stringify(input.metadata) : null,
            now,
            now
          )
          .run()

        // Return the created entry
        // The user field will be resolved by the LogbookEntry.user field resolver
        return {
          id,
          userId: context.user.id,
          timestamp: new Date(timestamp).toISOString(),
          duration: input.duration,
          type: input.type,
          instrument: input.instrument,
          pieces: input.pieces,
          techniques: input.techniques || [],
          goalIds: input.goalIds || [],
          notes: input.notes || null,
          mood: input.mood || null,
          tags: input.tags || [],
          sessionId: input.sessionId || null,
          metadata: input.metadata || null,
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
          user: context.user, // Include the user object to satisfy TypeScript
        } as LogbookEntry
      } catch (error) {
        console.error('Error creating logbook entry:', error)
        throw new Error('Failed to create logbook entry')
      }
    },

    updateLogbookEntry: async (_parent, { id, input }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        // First, check if the entry exists and belongs to the user
        const existing = await context.env.DB.prepare(
          'SELECT * FROM logbook_entries WHERE id = ? AND user_id = ?'
        )
          .bind(id, context.user.id)
          .first()

        if (!existing) {
          throw new Error('Logbook entry not found')
        }

        const now = Date.now()
        const updates: string[] = ['updated_at = ?']
        const values: unknown[] = [now]

        // Build dynamic update query based on provided fields
        if (input.timestamp !== undefined && input.timestamp !== null) {
          updates.push('timestamp = ?')
          values.push(new Date(input.timestamp).getTime())
        }
        if (input.duration !== undefined) {
          updates.push('duration = ?')
          values.push(input.duration)
        }
        if (input.type !== undefined) {
          updates.push('type = ?')
          values.push(input.type)
        }
        if (input.instrument !== undefined) {
          updates.push('instrument = ?')
          values.push(input.instrument)
        }
        if (input.pieces !== undefined) {
          updates.push('pieces = ?')
          values.push(JSON.stringify(input.pieces))
        }
        if (input.techniques !== undefined) {
          updates.push('techniques = ?')
          values.push(JSON.stringify(input.techniques))
        }
        if (input.goalIds !== undefined) {
          updates.push('goal_ids = ?')
          values.push(JSON.stringify(input.goalIds))
        }
        if (input.notes !== undefined) {
          updates.push('notes = ?')
          values.push(input.notes || null)
        }
        if (input.mood !== undefined) {
          updates.push('mood = ?')
          values.push(input.mood || null)
        }
        if (input.tags !== undefined) {
          updates.push('tags = ?')
          values.push(JSON.stringify(input.tags))
        }

        // Add id and user_id to the end of values array
        values.push(id, context.user.id)

        await context.env.DB.prepare(
          `UPDATE logbook_entries SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
        )
          .bind(...values)
          .run()

        // Fetch and return the updated entry
        const result = await context.env.DB.prepare(
          'SELECT * FROM logbook_entries WHERE id = ? AND user_id = ?'
        )
          .bind(id, context.user.id)
          .first()

        return {
          ...result,
          pieces: JSON.parse(result!.pieces as string),
          techniques: JSON.parse(result!.techniques as string),
          goalIds: JSON.parse(result!.goal_ids as string),
          tags: JSON.parse(result!.tags as string),
          metadata: result!.metadata
            ? JSON.parse(result!.metadata as string)
            : null,
          timestamp: new Date(result!.timestamp as number).toISOString(),
          createdAt: new Date(result!.created_at as number).toISOString(),
          updatedAt: new Date(result!.updated_at as number).toISOString(),
          user: context.user, // Include the user object to satisfy TypeScript
        } as LogbookEntry
      } catch (error) {
        console.error('Error updating logbook entry:', error)
        throw new Error('Failed to update logbook entry')
      }
    },

    deleteLogbookEntry: async (_parent, { id }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        const result = await context.env.DB.prepare(
          'DELETE FROM logbook_entries WHERE id = ? AND user_id = ?'
        )
          .bind(id, context.user.id)
          .run()

        if (result.meta.changes === 0) {
          throw new Error('Logbook entry not found')
        }

        return true
      } catch (error) {
        console.error('Error deleting logbook entry:', error)
        // Re-throw specific errors (like not found)
        if (
          error instanceof Error &&
          error.message === 'Logbook entry not found'
        ) {
          throw error
        }
        throw new Error('Failed to delete logbook entry')
      }
    },

    createGoal: async (_parent, { input }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        const id = nanoid()
        const now = Date.now()
        const targetDate = input.targetDate
          ? new Date(input.targetDate).getTime()
          : null

        // Ensure milestones have IDs
        const milestones = (input.milestones || []).map(m => ({
          ...m,
          id: m.id || nanoid(),
          completed: m.completed || false,
        }))

        await context.env.DB.prepare(
          `
            INSERT INTO goals (
              id, user_id, title, description, target_date,
              progress, milestones, status, linked_entries,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
          .bind(
            id,
            context.user.id,
            input.title,
            input.description || null,
            targetDate,
            0, // Initial progress is 0
            JSON.stringify(milestones),
            'ACTIVE',
            JSON.stringify([]), // No linked entries initially
            now,
            now
          )
          .run()

        // Return the created goal
        // The user field will be resolved by the Goal.user field resolver
        return {
          id,
          userId: context.user.id,
          title: input.title,
          description: input.description || null,
          targetDate: targetDate ? new Date(targetDate).toISOString() : null,
          progress: 0,
          milestones,
          status: 'ACTIVE' as const,
          linkedEntries: [],
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
          completedAt: null,
          user: context.user, // Include the user object to satisfy TypeScript
        } as Goal
      } catch (error) {
        console.error('Error creating goal:', error)
        throw new Error('Failed to create goal')
      }
    },

    updateGoal: async (_parent, { id, input }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        // First, check if the goal exists and belongs to the user
        const existing = await context.env.DB.prepare(
          'SELECT * FROM goals WHERE id = ? AND user_id = ?'
        )
          .bind(id, context.user.id)
          .first()

        if (!existing) {
          throw new Error('Goal not found')
        }

        const now = Date.now()
        const updates: string[] = ['updated_at = ?']
        const values: unknown[] = [now]

        // Build dynamic update query based on provided fields
        if (input.title !== undefined) {
          updates.push('title = ?')
          values.push(input.title)
        }
        if (input.description !== undefined) {
          updates.push('description = ?')
          values.push(input.description || null)
        }
        if (input.targetDate !== undefined) {
          updates.push('target_date = ?')
          values.push(
            input.targetDate && input.targetDate !== null
              ? new Date(input.targetDate).getTime()
              : null
          )
        }
        if (input.progress !== undefined) {
          updates.push('progress = ?')
          values.push(Math.min(100, Math.max(0, input.progress || 0)))

          // If progress reaches 100, mark as completed
          if (
            input.progress &&
            input.progress >= 100 &&
            existing.status === 'ACTIVE'
          ) {
            updates.push('status = ?')
            values.push('COMPLETED')
            updates.push('completed_at = ?')
            values.push(now)
          }
        }
        if (input.status !== undefined) {
          updates.push('status = ?')
          values.push(input.status)

          // If status is COMPLETED, ensure completed_at is set
          if (input.status === 'COMPLETED' && !existing.completed_at) {
            updates.push('completed_at = ?')
            values.push(now)
          }
        }

        // Add id and user_id to the end of values array
        values.push(id, context.user.id)

        await context.env.DB.prepare(
          `UPDATE goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
        )
          .bind(...values)
          .run()

        // Fetch and return the updated goal
        const result = await context.env.DB.prepare(
          'SELECT * FROM goals WHERE id = ? AND user_id = ?'
        )
          .bind(id, context.user.id)
          .first()

        return {
          ...result,
          milestones: JSON.parse(result!.milestones as string),
          linkedEntries: JSON.parse(result!.linked_entries as string),
          targetDate: result!.target_date
            ? new Date(result!.target_date as number).toISOString()
            : null,
          createdAt: new Date(result!.created_at as number).toISOString(),
          updatedAt: new Date(result!.updated_at as number).toISOString(),
          completedAt: result!.completed_at
            ? new Date(result!.completed_at as number).toISOString()
            : null,
          user: context.user, // Include the user object to satisfy TypeScript
        } as Goal
      } catch (error) {
        console.error('Error updating goal:', error)
        throw new Error('Failed to update goal')
      }
    },

    updateGoalMilestone: async (
      _parent,
      { goalId, milestoneId, completed },
      context
    ) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        // Fetch the goal
        const goal = await context.env.DB.prepare(
          'SELECT * FROM goals WHERE id = ? AND user_id = ?'
        )
          .bind(goalId, context.user.id)
          .first()

        if (!goal) {
          throw new Error('Goal not found')
        }

        // Update the milestone
        const milestones = JSON.parse(goal.milestones as string)
        const milestoneIndex = milestones.findIndex(
          (m: { id: string }) => m.id === milestoneId
        )

        if (milestoneIndex === -1) {
          throw new Error('Milestone not found')
        }

        milestones[milestoneIndex] = {
          ...milestones[milestoneIndex],
          completed,
          completedAt: completed ? Date.now() : null,
        }

        // Calculate new progress based on completed milestones
        const completedCount = milestones.filter(
          (m: { completed: boolean }) => m.completed
        ).length
        const newProgress =
          milestones.length > 0
            ? Math.round((completedCount / milestones.length) * 100)
            : 0

        const now = Date.now()
        const updates = ['milestones = ?', 'progress = ?', 'updated_at = ?']
        const values = [JSON.stringify(milestones), newProgress, now]

        // If progress reaches 100, mark as completed
        if (newProgress >= 100 && goal.status === 'ACTIVE') {
          updates.push('status = ?', 'completed_at = ?')
          values.push('COMPLETED', now)
        }

        values.push(goalId, context.user.id)

        await context.env.DB.prepare(
          `UPDATE goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
        )
          .bind(...values)
          .run()

        // Fetch and return the updated goal
        const result = await context.env.DB.prepare(
          'SELECT * FROM goals WHERE id = ? AND user_id = ?'
        )
          .bind(goalId, context.user.id)
          .first()

        return {
          ...result,
          milestones: JSON.parse(result!.milestones as string),
          linkedEntries: JSON.parse(result!.linked_entries as string),
          targetDate: result!.target_date
            ? new Date(result!.target_date as number).toISOString()
            : null,
          createdAt: new Date(result!.created_at as number).toISOString(),
          updatedAt: new Date(result!.updated_at as number).toISOString(),
          completedAt: result!.completed_at
            ? new Date(result!.completed_at as number).toISOString()
            : null,
          user: context.user, // Include the user object to satisfy TypeScript
        } as Goal
      } catch (error) {
        console.error('Error updating goal milestone:', error)
        throw new Error('Failed to update goal milestone')
      }
    },

    deleteGoal: async (_parent, { id }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        const result = await context.env.DB.prepare(
          'DELETE FROM goals WHERE id = ? AND user_id = ?'
        )
          .bind(id, context.user.id)
          .run()

        if (result.meta.changes === 0) {
          throw new Error('Goal not found')
        }

        return true
      } catch (error) {
        console.error('Error deleting goal:', error)
        // Re-throw specific errors (like not found)
        if (error instanceof Error && error.message === 'Goal not found') {
          throw error
        }
        throw new Error('Failed to delete goal')
      }
    },

    linkEntryToGoal: async (_parent, { entryId, goalId }, context) => {
      // Note: Following our principle - this works for authenticated users only
      // Anonymous users use localStorage on frontend
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      try {
        // Verify both entry and goal exist and belong to the user
        const [entry, goal] = await Promise.all([
          context.env.DB.prepare(
            'SELECT id FROM logbook_entries WHERE id = ? AND user_id = ?'
          )
            .bind(entryId, context.user.id)
            .first(),
          context.env.DB.prepare(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?'
          )
            .bind(goalId, context.user.id)
            .first(),
        ])

        if (!entry) {
          throw new Error('Logbook entry not found')
        }
        if (!goal) {
          throw new Error('Goal not found')
        }

        // Update the goal's linked entries
        const linkedEntries = JSON.parse(goal.linked_entries as string)
        if (!linkedEntries.includes(entryId)) {
          linkedEntries.push(entryId)
        }

        await context.env.DB.prepare(
          'UPDATE goals SET linked_entries = ?, updated_at = ? WHERE id = ? AND user_id = ?'
        )
          .bind(
            JSON.stringify(linkedEntries),
            Date.now(),
            goalId,
            context.user.id
          )
          .run()

        // Also update the entry's goal_ids
        const entryData = await context.env.DB.prepare(
          'SELECT goal_ids FROM logbook_entries WHERE id = ? AND user_id = ?'
        )
          .bind(entryId, context.user.id)
          .first()

        const goalIds = JSON.parse(entryData!.goal_ids as string)
        if (!goalIds.includes(goalId)) {
          goalIds.push(goalId)

          await context.env.DB.prepare(
            'UPDATE logbook_entries SET goal_ids = ?, updated_at = ? WHERE id = ? AND user_id = ?'
          )
            .bind(JSON.stringify(goalIds), Date.now(), entryId, context.user.id)
            .run()
        }

        // Fetch and return the updated goal
        const result = await context.env.DB.prepare(
          'SELECT * FROM goals WHERE id = ? AND user_id = ?'
        )
          .bind(goalId, context.user.id)
          .first()

        return {
          ...result,
          milestones: JSON.parse(result!.milestones as string),
          linkedEntries: JSON.parse(result!.linked_entries as string),
          targetDate: result!.target_date
            ? new Date(result!.target_date as number).toISOString()
            : null,
          createdAt: new Date(result!.created_at as number).toISOString(),
          updatedAt: new Date(result!.updated_at as number).toISOString(),
          completedAt: result!.completed_at
            ? new Date(result!.completed_at as number).toISOString()
            : null,
          user: context.user, // Include the user object to satisfy TypeScript
        } as Goal
      } catch (error) {
        console.error('Error linking entry to goal:', error)
        throw new Error('Failed to link entry to goal')
      }
    },
  },

  LogbookEntry: {
    user: async (parent, _args, context) => {
      // If the user is already resolved, return it
      if ('user' in parent && parent.user) {
        return parent.user
      }

      // For entries loaded from database, fetch the user
      if ('userId' in parent && parent.userId) {
        // For now, return the current user if it matches
        if (context.user && context.user.id === parent.userId) {
          return context.user
        }

        // TODO: Fetch user from database
        throw new Error('User not found')
      }

      throw new Error('Unable to resolve user for logbook entry')
    },
  },

  Goal: {
    user: async (parent, _args, context) => {
      // If the user is already resolved, return it
      if ('user' in parent && parent.user) {
        return parent.user
      }

      // For goals loaded from database, fetch the user
      if ('userId' in parent && parent.userId) {
        // For now, return the current user if it matches
        if (context.user && context.user.id === parent.userId) {
          return context.user
        }

        // TODO: Fetch user from database
        throw new Error('User not found')
      }

      throw new Error('Unable to resolve user for goal')
    },
  },
}
