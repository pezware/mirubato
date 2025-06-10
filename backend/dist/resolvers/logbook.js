import { nanoid } from 'nanoid';
const mapLogbookEntry = (entry, user) => ({
    id: entry.id,
    user,
    timestamp: new Date(Number(entry.timestamp)).toISOString(),
    duration: Number(entry.duration),
    type: entry.type,
    instrument: entry.instrument,
    pieces: JSON.parse(entry.pieces || '[]'),
    techniques: JSON.parse(entry.techniques || '[]'),
    goalIds: JSON.parse(entry.goal_ids || '[]'),
    goals: [], // Resolved separately
    notes: entry.notes,
    mood: entry.mood,
    tags: JSON.parse(entry.tags || '[]'),
    sessionId: entry.session_id,
    session: null, // Resolved separately
    metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
    createdAt: new Date(Number(entry.created_at)).toISOString(),
    updatedAt: new Date(Number(entry.updated_at)).toISOString(),
});
const mapGoal = (goal, user) => ({
    id: goal.id,
    user,
    title: goal.title,
    description: goal.description,
    targetDate: new Date(Number(goal.target_date)).toISOString(),
    progress: Number(goal.progress),
    milestones: JSON.parse(goal.milestones || '[]'),
    status: goal.status,
    linkedEntryIds: JSON.parse(goal.linked_entry_ids || '[]'),
    linkedEntries: [], // Resolved separately
    createdAt: new Date(Number(goal.created_at)).toISOString(),
    updatedAt: new Date(Number(goal.updated_at)).toISOString(),
    completedAt: goal.completed_at
        ? new Date(Number(goal.completed_at)).toISOString()
        : null,
});
const Query = {
    logbookEntry: async (_, { id }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        const entry = await context.env.DB.prepare(`
      SELECT * FROM logbook_entries WHERE id = ? AND user_id = ?
    `)
            .bind(id, context.user.id)
            .first();
        if (!entry) {
            throw new Error('Logbook entry not found');
        }
        return mapLogbookEntry(entry, context.user);
    },
    myLogbookEntries: async (_, { filter, offset = 0, limit = 20 }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        let whereClause = 'WHERE user_id = ?';
        let params = [context.user.id];
        // Apply filters
        if (filter) {
            if (filter.startDate) {
                whereClause += ' AND timestamp >= ?';
                params.push(new Date(filter.startDate).getTime());
            }
            if (filter.endDate) {
                whereClause += ' AND timestamp <= ?';
                params.push(new Date(filter.endDate).getTime());
            }
            if (filter.types?.length) {
                whereClause += ` AND type IN (${filter.types.map(() => '?').join(', ')})`;
                params.push(...filter.types);
            }
            if (filter.instruments?.length) {
                whereClause += ` AND instrument IN (${filter.instruments.map(() => '?').join(', ')})`;
                params.push(...filter.instruments);
            }
            if (filter.moods?.length) {
                whereClause += ` AND mood IN (${filter.moods.map(() => '?').join(', ')})`;
                params.push(...filter.moods);
            }
        }
        // Count total entries
        const countResult = await context.env.DB.prepare(`SELECT COUNT(*) as count FROM logbook_entries ${whereClause}`)
            .bind(...params)
            .first();
        const totalCount = Number(countResult?.count || 0);
        // Get entries
        const result = await context.env.DB.prepare(`
      SELECT * FROM logbook_entries 
      ${whereClause}
      ORDER BY timestamp DESC, created_at DESC
      LIMIT ? OFFSET ?
    `)
            .bind(...params, limit, offset)
            .all();
        const entries = result.results || [];
        const edges = entries.map((entry, index) => ({
            cursor: Buffer.from(`${offset + index}`).toString('base64'),
            node: mapLogbookEntry(entry, context.user),
        }));
        return {
            edges,
            pageInfo: {
                hasNextPage: offset + limit < totalCount,
                hasPreviousPage: offset > 0,
                startCursor: edges.length > 0 ? edges[0].cursor : null,
                endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            },
            totalCount,
        };
    },
    goal: async (_, { id }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        const goal = await context.env.DB.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?')
            .bind(id, context.user.id)
            .first();
        if (!goal) {
            throw new Error('Goal not found');
        }
        return mapGoal(goal, context.user);
    },
    myGoals: async (_, { status, offset = 0, limit = 20 }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        let whereClause = 'WHERE user_id = ?';
        let params = [context.user.id];
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        // Count total goals
        const countResult = await context.env.DB.prepare(`SELECT COUNT(*) as count FROM goals ${whereClause}`)
            .bind(...params)
            .first();
        const totalCount = Number(countResult?.count || 0);
        // Get goals
        const result = await context.env.DB.prepare(`
      SELECT * FROM goals 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
            .bind(...params, limit, offset)
            .all();
        const goals = result.results || [];
        const edges = goals.map((goal, index) => ({
            cursor: Buffer.from(`${offset + index}`).toString('base64'),
            node: mapGoal(goal, context.user),
        }));
        return {
            edges,
            pageInfo: {
                hasNextPage: offset + limit < totalCount,
                hasPreviousPage: offset > 0,
                startCursor: edges.length > 0 ? edges[0].cursor : null,
                endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            },
            totalCount,
        };
    },
};
const Mutation = {
    createLogbookEntry: async (_, { input }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        const id = nanoid();
        const now = Date.now();
        await context.env.DB.prepare(`
      INSERT INTO logbook_entries (
        id, user_id, timestamp, duration, type, instrument,
        pieces, techniques, goal_ids, notes, mood, tags,
        session_id, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
            .bind(id, context.user.id, new Date(input.timestamp).getTime(), input.duration, input.type, input.instrument, JSON.stringify(input.pieces), JSON.stringify(input.techniques), JSON.stringify(input.goalIds), input.notes, input.mood, JSON.stringify(input.tags), input.sessionId, input.metadata ? JSON.stringify(input.metadata) : null, now, now)
            .run();
        return {
            id,
            user: context.user,
            timestamp: input.timestamp,
            duration: input.duration,
            type: input.type,
            instrument: input.instrument,
            pieces: input.pieces,
            techniques: input.techniques,
            goalIds: input.goalIds,
            goals: [],
            notes: input.notes,
            mood: input.mood,
            tags: input.tags,
            sessionId: input.sessionId,
            session: null,
            metadata: input.metadata,
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString(),
        };
    },
    updateLogbookEntry: async (_, { input }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        // Check if entry exists
        const existingEntry = await context.env.DB.prepare('SELECT id FROM logbook_entries WHERE id = ? AND user_id = ?')
            .bind(input.id, context.user.id)
            .first();
        if (!existingEntry) {
            throw new Error('Logbook entry not found');
        }
        const now = Date.now();
        const updates = [];
        const params = [];
        // Build dynamic update query
        Object.entries(input).forEach(([key, value]) => {
            if (key === 'id')
                return;
            if (value === undefined)
                return;
            switch (key) {
                case 'timestamp':
                    updates.push('timestamp = ?');
                    params.push(new Date(value).getTime());
                    break;
                case 'pieces':
                case 'techniques':
                case 'goalIds':
                case 'tags':
                    updates.push(`${key === 'goalIds' ? 'goal_ids' : key} = ?`);
                    params.push(JSON.stringify(value));
                    break;
                case 'metadata':
                    updates.push('metadata = ?');
                    params.push(value ? JSON.stringify(value) : null);
                    break;
                default:
                    updates.push(`${key} = ?`);
                    params.push(value);
            }
        });
        updates.push('updated_at = ?');
        params.push(now);
        params.push(input.id, context.user.id);
        await context.env.DB.prepare(`
      UPDATE logbook_entries 
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `)
            .bind(...params)
            .run();
        // Return updated entry
        const updatedEntry = await context.env.DB.prepare('SELECT * FROM logbook_entries WHERE id = ? AND user_id = ?')
            .bind(input.id, context.user.id)
            .first();
        return mapLogbookEntry(updatedEntry, context.user);
    },
    deleteLogbookEntry: async (_, { id }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        const result = await context.env.DB.prepare('DELETE FROM logbook_entries WHERE id = ? AND user_id = ?')
            .bind(id, context.user.id)
            .run();
        return result.changes > 0;
    },
    createGoal: async (_, { input }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        const id = nanoid();
        const now = Date.now();
        // Ensure milestones have IDs
        const milestonesWithIds = input.milestones.map((milestone) => ({
            ...milestone,
            id: milestone.id || nanoid(),
        }));
        await context.env.DB.prepare(`
      INSERT INTO goals (
        id, user_id, title, description, target_date, progress,
        milestones, status, linked_entry_ids, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
            .bind(id, context.user.id, input.title, input.description, new Date(input.targetDate).getTime(), 0, JSON.stringify(milestonesWithIds), 'ACTIVE', JSON.stringify([]), now, now)
            .run();
        return {
            id,
            user: context.user,
            title: input.title,
            description: input.description,
            targetDate: input.targetDate,
            progress: 0,
            milestones: milestonesWithIds,
            status: 'ACTIVE',
            linkedEntryIds: [],
            linkedEntries: [],
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString(),
            completedAt: null,
        };
    },
    updateGoal: async (_, { input }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        // Check if goal exists
        const existingGoal = await context.env.DB.prepare('SELECT id, status, progress FROM goals WHERE id = ? AND user_id = ?')
            .bind(input.id, context.user.id)
            .first();
        if (!existingGoal) {
            throw new Error('Goal not found');
        }
        const now = Date.now();
        const updates = [];
        const params = [];
        // Build dynamic update query
        Object.entries(input).forEach(([key, value]) => {
            if (key === 'id')
                return;
            if (value === undefined || value === null)
                return;
            switch (key) {
                case 'targetDate':
                    updates.push('target_date = ?');
                    params.push(new Date(value).getTime());
                    break;
                case 'progress':
                    updates.push('progress = ?');
                    params.push(value);
                    // Auto-complete goal if progress reaches 100
                    if (Number(value) >= 100 && existingGoal.status !== 'COMPLETED') {
                        updates.push('status = ?');
                        params.push('COMPLETED');
                        updates.push('completed_at = ?');
                        params.push(now);
                    }
                    break;
                case 'milestones':
                    const milestonesWithIds = value.map(milestone => ({
                        ...milestone,
                        id: milestone.id || nanoid(),
                    }));
                    updates.push('milestones = ?');
                    params.push(JSON.stringify(milestonesWithIds));
                    break;
                case 'status':
                    updates.push('status = ?');
                    params.push(value);
                    if (value === 'COMPLETED' && existingGoal.status !== 'COMPLETED') {
                        updates.push('completed_at = ?');
                        params.push(now);
                    }
                    break;
                default:
                    updates.push(`${key} = ?`);
                    params.push(value);
            }
        });
        updates.push('updated_at = ?');
        params.push(now);
        params.push(input.id, context.user.id);
        await context.env.DB.prepare(`
      UPDATE goals 
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `)
            .bind(...params)
            .run();
        // Return updated goal
        const updatedGoal = await context.env.DB.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?')
            .bind(input.id, context.user.id)
            .first();
        return mapGoal(updatedGoal, context.user);
    },
    deleteGoal: async (_, { id }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        const result = await context.env.DB.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?')
            .bind(id, context.user.id)
            .run();
        return result.changes > 0;
    },
    linkLogbookEntryToGoal: async (_, { entryId, goalId }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        // Verify both entry and goal belong to user
        const [entry, goal] = await Promise.all([
            context.env.DB.prepare('SELECT id FROM logbook_entries WHERE id = ? AND user_id = ?')
                .bind(entryId, context.user.id)
                .first(),
            context.env.DB.prepare('SELECT id, linked_entry_ids FROM goals WHERE id = ? AND user_id = ?')
                .bind(goalId, context.user.id)
                .first(),
        ]);
        if (!entry || !goal) {
            throw new Error('Entry or goal not found');
        }
        // Update goal's linked entries
        const linkedEntryIds = JSON.parse(goal.linked_entry_ids || '[]');
        if (!linkedEntryIds.includes(entryId)) {
            linkedEntryIds.push(entryId);
            await context.env.DB.prepare('UPDATE goals SET linked_entry_ids = ?, updated_at = ? WHERE id = ?')
                .bind(JSON.stringify(linkedEntryIds), Date.now(), goalId)
                .run();
        }
        // Return updated goal
        const updatedGoal = await context.env.DB.prepare('SELECT * FROM goals WHERE id = ?')
            .bind(goalId)
            .first();
        return mapGoal(updatedGoal, context.user);
    },
    unlinkLogbookEntryFromGoal: async (_, { entryId, goalId }, context) => {
        if (!context.user) {
            throw new Error('Authentication required');
        }
        // Verify goal belongs to user
        const goal = await context.env.DB.prepare('SELECT id, linked_entry_ids FROM goals WHERE id = ? AND user_id = ?')
            .bind(goalId, context.user.id)
            .first();
        if (!goal) {
            throw new Error('Goal not found');
        }
        // Update goal's linked entries
        const linkedEntryIds = JSON.parse(goal.linked_entry_ids || '[]');
        const filteredIds = linkedEntryIds.filter((id) => id !== entryId);
        await context.env.DB.prepare('UPDATE goals SET linked_entry_ids = ?, updated_at = ? WHERE id = ?')
            .bind(JSON.stringify(filteredIds), Date.now(), goalId)
            .run();
        // Return updated goal
        const updatedGoal = await context.env.DB.prepare('SELECT * FROM goals WHERE id = ?')
            .bind(goalId)
            .first();
        return mapGoal(updatedGoal, context.user);
    },
};
// Field resolvers
const LogbookEntry = {
    goals: async (parent, _, context) => {
        if (!parent.goalIds || parent.goalIds.length === 0) {
            return [];
        }
        const placeholders = parent.goalIds.map(() => '?').join(', ');
        const result = await context.env.DB.prepare(`
      SELECT * FROM goals WHERE id IN (${placeholders})
    `)
            .bind(...parent.goalIds)
            .all();
        const goals = result.results || [];
        return goals.map((goal) => mapGoal(goal, parent.user));
    },
    session: async (parent, _, context) => {
        if (!parent.sessionId) {
            return null;
        }
        const session = await context.env.DB.prepare(`
      SELECT * FROM practice_sessions WHERE id = ?
    `)
            .bind(parent.sessionId)
            .first();
        if (!session) {
            return null;
        }
        return {
            id: session.id,
            user: parent.user,
            instrument: session.instrument,
            sheetMusic: null,
            sessionType: session.session_type,
            startedAt: new Date(Number(session.started_at)).toISOString(),
            completedAt: session.completed_at
                ? new Date(Number(session.completed_at)).toISOString()
                : null,
            pausedDuration: Number(session.paused_duration),
            accuracy: Number(session.accuracy),
            notesAttempted: Number(session.notes_attempted),
            notesCorrect: Number(session.notes_correct),
            logs: [],
        };
    },
};
const Goal = {
    linkedEntries: async (parent, _, context) => {
        if (!parent.linkedEntryIds || parent.linkedEntryIds.length === 0) {
            return [];
        }
        const placeholders = parent.linkedEntryIds.map(() => '?').join(', ');
        const result = await context.env.DB.prepare(`
      SELECT * FROM logbook_entries 
      WHERE id IN (${placeholders})
      ORDER BY timestamp DESC
    `)
            .bind(...parent.linkedEntryIds)
            .all();
        const entries = result.results || [];
        return entries.map((entry) => mapLogbookEntry(entry, parent.user));
    },
};
export const logbookResolvers = {
    Query,
    Mutation,
    LogbookEntry,
    Goal,
};
//# sourceMappingURL=logbook.js.map