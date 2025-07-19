import { Hono } from 'hono'
import type { Env } from '../../index'
import { authMiddleware, validateBody, type Variables } from '../middleware'
import { Errors } from '../../utils/errors'
import { z } from 'zod'
import { nanoid } from 'nanoid'

// Validation schemas
const goalTypeSchema = z.enum([
  'practice_time',
  'accuracy',
  'repertoire',
  'custom',
])
const goalStatusSchema = z.enum(['active', 'completed', 'abandoned'])

const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: goalTypeSchema,
  targetValue: z.number().optional(),
  targetDate: z.string().optional(), // ISO date string
  scoreId: z.string().optional(),
  measures: z.array(z.string()).optional(),
  practicePlan: z
    .object({
      dailyMinutes: z.number().optional(),
      focusAreas: z.array(z.string()).optional(),
      techniques: z.array(z.string()).optional(),
    })
    .optional(),
  milestones: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        targetDate: z.string().optional(),
        completed: z.boolean().default(false),
        completedAt: z.string().optional(),
      })
    )
    .optional(),
})

const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  targetDate: z.string().optional(),
  status: goalStatusSchema.optional(),
  measures: z.array(z.string()).optional(),
  practicePlan: z
    .object({
      dailyMinutes: z.number().optional(),
      focusAreas: z.array(z.string()).optional(),
      techniques: z.array(z.string()).optional(),
    })
    .optional(),
  milestones: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        targetDate: z.string().optional(),
        completed: z.boolean(),
        completedAt: z.string().optional(),
      })
    )
    .optional(),
})

const trackProgressSchema = z.object({
  value: z.number(),
  notes: z.string().optional(),
  sessionId: z.string().optional(), // Link to practice session
})

export const goalsHandler = new Hono<{ Bindings: Env; Variables: Variables }>()

// All goals endpoints require authentication
goalsHandler.use('/*', authMiddleware)

/**
 * List user's goals
 * GET /api/goals
 */
goalsHandler.get('/', async c => {
  const userId = c.get('userId') as string

  // Query parameters
  const status = c.req.query('status') as string | undefined
  const type = c.req.query('type') as string | undefined
  const scoreId = c.req.query('scoreId') as string | undefined

  try {
    let query = `
      SELECT 
        g.*,
        COUNT(DISTINCT json_extract(sd.data, '$.id')) as related_sessions
      FROM goals g
      LEFT JOIN sync_data sd ON sd.user_id = g.user_id
        AND sd.type = 'logbook_entry'
        AND json_extract(sd.data, '$.goalIds') LIKE '%' || g.id || '%'
      WHERE g.user_id = ?
    `
    const params: (string | number)[] = [userId]

    if (status) {
      query += ' AND g.status = ?'
      params.push(status)
    }
    if (type) {
      query += ' AND g.type = ?'
      params.push(type)
    }
    if (scoreId) {
      query += ' AND g.score_id = ?'
      params.push(scoreId)
    }

    query += ' GROUP BY g.id ORDER BY g.created_at DESC'

    const goals = await c.env.DB.prepare(query)
      .bind(...params)
      .all()

    return c.json({
      goals: goals.results.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        type: goal.type,
        targetValue: goal.target_value,
        currentValue: goal.current_value,
        targetDate: goal.target_date,
        status: goal.status,
        scoreId: goal.score_id,
        measures: goal.measures ? JSON.parse(goal.measures as string) : null,
        practicePlan: goal.practice_plan
          ? JSON.parse(goal.practice_plan as string)
          : null,
        milestones: goal.milestones
          ? JSON.parse(goal.milestones as string)
          : null,
        relatedSessions: goal.related_sessions || 0,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
      })),
    })
  } catch (error) {
    console.error('Error listing goals:', error)
    throw Errors.InternalError('Failed to list goals')
  }
})

/**
 * Get specific goal
 * GET /api/goals/:id
 */
goalsHandler.get('/:id', async c => {
  const userId = c.get('userId') as string
  const goalId = c.req.param('id')

  try {
    const goal = await c.env.DB.prepare(
      `
        SELECT 
          g.*,
          COUNT(DISTINCT json_extract(sd.data, '$.id')) as related_sessions,
          SUM(json_extract(sd.data, '$.duration')) as total_practice_time
        FROM goals g
        LEFT JOIN sync_data sd ON sd.user_id = g.user_id
          AND sd.type = 'logbook_entry'
          AND json_extract(sd.data, '$.goalIds') LIKE '%' || g.id || '%'
        WHERE g.id = ? AND g.user_id = ?
        GROUP BY g.id
      `
    )
      .bind(goalId, userId)
      .first()

    if (!goal) {
      throw Errors.NotFound('Goal not found')
    }

    // Get recent practice sessions for this goal
    const sessions = await c.env.DB.prepare(
      `
        SELECT 
          json_extract(sd.data, '$.id') as id,
          json_extract(sd.data, '$.timestamp') as timestamp,
          json_extract(sd.data, '$.duration') as duration,
          json_extract(sd.data, '$.notes') as notes
        FROM sync_data sd
        WHERE sd.user_id = ? 
          AND sd.type = 'logbook_entry'
          AND json_extract(sd.data, '$.goalIds') LIKE '%' || ? || '%'
        ORDER BY json_extract(sd.data, '$.timestamp') DESC
        LIMIT 10
      `
    )
      .bind(userId, goalId)
      .all()

    return c.json({
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        type: goal.type,
        targetValue: goal.target_value,
        currentValue: goal.current_value,
        targetDate: goal.target_date,
        status: goal.status,
        scoreId: goal.score_id,
        measures: goal.measures ? JSON.parse(goal.measures as string) : null,
        practicePlan: goal.practice_plan
          ? JSON.parse(goal.practice_plan as string)
          : null,
        milestones: goal.milestones
          ? JSON.parse(goal.milestones as string)
          : null,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
      },
      stats: {
        relatedSessions: goal.related_sessions || 0,
        totalPracticeTime: goal.total_practice_time || 0,
        recentSessions: sessions.results,
      },
    })
  } catch (error) {
    console.error('Error getting goal:', error)
    throw error
  }
})

/**
 * Create new goal
 * POST /api/goals
 */
goalsHandler.post('/', validateBody(createGoalSchema), async c => {
  const userId = c.get('userId') as string
  const body = c.get('validatedBody') as z.infer<typeof createGoalSchema>

  try {
    const now = Date.now()
    const id = nanoid()

    // If it's a repertoire goal with a scoreId, ensure the piece is in repertoire
    if (body.type === 'repertoire' && body.scoreId) {
      const repertoireItem = await c.env.DB.prepare(
        'SELECT id FROM user_repertoire WHERE user_id = ? AND score_id = ?'
      )
        .bind(userId, body.scoreId)
        .first()

      if (!repertoireItem) {
        // Auto-add to repertoire
        await c.env.DB.prepare(
          `
            INSERT INTO user_repertoire (
              id, user_id, score_id, status, created_at, updated_at
            ) VALUES (?, ?, ?, 'planned', ?, ?)
          `
        )
          .bind(nanoid(), userId, body.scoreId, now, now)
          .run()
      }
    }

    await c.env.DB.prepare(
      `
        INSERT INTO goals (
          id, user_id, title, description, type, target_value,
          target_date, status, score_id, measures, practice_plan,
          milestones, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        id,
        userId,
        body.title,
        body.description || null,
        body.type,
        body.targetValue || null,
        body.targetDate || null,
        body.scoreId || null,
        body.measures ? JSON.stringify(body.measures) : null,
        body.practicePlan ? JSON.stringify(body.practicePlan) : null,
        body.milestones ? JSON.stringify(body.milestones) : null,
        now,
        now
      )
      .run()

    return c.json(
      {
        id,
        title: body.title,
        description: body.description || null,
        type: body.type,
        targetValue: body.targetValue || null,
        currentValue: 0,
        targetDate: body.targetDate || null,
        status: 'active',
        scoreId: body.scoreId || null,
        measures: body.measures || null,
        practicePlan: body.practicePlan || null,
        milestones: body.milestones || null,
        createdAt: now,
        updatedAt: now,
      },
      201
    )
  } catch (error) {
    console.error('Error creating goal:', error)
    throw Errors.InternalError('Failed to create goal')
  }
})

/**
 * Update goal
 * PUT /api/goals/:id
 */
goalsHandler.put('/:id', validateBody(updateGoalSchema), async c => {
  const userId = c.get('userId') as string
  const goalId = c.req.param('id')
  const body = c.get('validatedBody') as z.infer<typeof updateGoalSchema>

  try {
    // Check if goal exists
    const existing = await c.env.DB.prepare(
      'SELECT * FROM goals WHERE id = ? AND user_id = ?'
    )
      .bind(goalId, userId)
      .first()

    if (!existing) {
      throw Errors.NotFound('Goal not found')
    }

    // Build update query
    const updateFields: string[] = []
    const updateValues: (string | number | null)[] = []

    if (body.title !== undefined) {
      updateFields.push('title = ?')
      updateValues.push(body.title)
    }
    if (body.description !== undefined) {
      updateFields.push('description = ?')
      updateValues.push(body.description)
    }
    if (body.targetValue !== undefined) {
      updateFields.push('target_value = ?')
      updateValues.push(body.targetValue)
    }
    if (body.currentValue !== undefined) {
      updateFields.push('current_value = ?')
      updateValues.push(body.currentValue)
    }
    if (body.targetDate !== undefined) {
      updateFields.push('target_date = ?')
      updateValues.push(body.targetDate)
    }
    if (body.status !== undefined) {
      updateFields.push('status = ?')
      updateValues.push(body.status)
    }
    if (body.measures !== undefined) {
      updateFields.push('measures = ?')
      updateValues.push(JSON.stringify(body.measures))
    }
    if (body.practicePlan !== undefined) {
      updateFields.push('practice_plan = ?')
      updateValues.push(JSON.stringify(body.practicePlan))
    }
    if (body.milestones !== undefined) {
      updateFields.push('milestones = ?')
      updateValues.push(JSON.stringify(body.milestones))
    }

    if (updateFields.length === 0) {
      return c.json({ message: 'No fields to update' })
    }

    updateFields.push('updated_at = ?')
    updateValues.push(Date.now())

    await c.env.DB.prepare(
      `
        UPDATE goals 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND user_id = ?
      `
    )
      .bind(...updateValues, goalId, userId)
      .run()

    return c.json({ message: 'Goal updated successfully' })
  } catch (error) {
    console.error('Error updating goal:', error)
    throw error
  }
})

/**
 * Track progress on a goal
 * POST /api/goals/:id/progress
 */
goalsHandler.post(
  '/:id/progress',
  validateBody(trackProgressSchema),
  async c => {
    const userId = c.get('userId') as string
    const goalId = c.req.param('id')
    const body = c.get('validatedBody') as z.infer<typeof trackProgressSchema>

    try {
      // Get current goal
      const goal = await c.env.DB.prepare(
        'SELECT * FROM goals WHERE id = ? AND user_id = ?'
      )
        .bind(goalId, userId)
        .first()

      if (!goal) {
        throw Errors.NotFound('Goal not found')
      }

      // Update current value
      const newValue = ((goal.current_value as number) || 0) + body.value

      // Check if goal is completed
      let status = goal.status
      if (goal.target_value && newValue >= (goal.target_value as number)) {
        status = 'completed'
      }

      await c.env.DB.prepare(
        `
        UPDATE goals 
        SET current_value = ?, status = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `
      )
        .bind(newValue, status, Date.now(), goalId, userId)
        .run()

      // If sessionId provided, link this goal to the practice session
      if (body.sessionId) {
        // This would update the logbook entry to include this goal
        // Implementation depends on how logbook entries are stored
      }

      return c.json({
        message: 'Progress tracked successfully',
        currentValue: newValue,
        targetValue: goal.target_value,
        status,
        completed: status === 'completed',
      })
    } catch (error) {
      console.error('Error tracking progress:', error)
      throw error
    }
  }
)

/**
 * Delete goal
 * DELETE /api/goals/:id
 */
goalsHandler.delete('/:id', async c => {
  const userId = c.get('userId') as string
  const goalId = c.req.param('id')

  try {
    const result = await c.env.DB.prepare(
      'DELETE FROM goals WHERE id = ? AND user_id = ?'
    )
      .bind(goalId, userId)
      .run()

    if (result.meta.changes === 0) {
      throw Errors.NotFound('Goal not found')
    }

    return c.json({ message: 'Goal deleted successfully' })
  } catch (error) {
    console.error('Error deleting goal:', error)
    throw error
  }
})
