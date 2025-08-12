import { Hono } from 'hono'
import type { Env } from '../../index'
import { authMiddleware, validateBody, type Variables } from '../middleware'
import { Errors } from '../../utils/errors'
import { z } from 'zod'
import { nanoid } from 'nanoid'

// Validation schemas
const repertoireStatusSchema = z.enum([
  'planned',
  'learning',
  'polished',
  'dropped',
])

const createRepertoireSchema = z.object({
  scoreId: z.string(),
  status: repertoireStatusSchema.optional(),
  difficultyRating: z
    .union([
      z.number().min(1).max(5),
      z.null().transform(() => undefined),
      z.undefined(),
    ])
    .optional(),
  personalNotes: z.string().optional(),
  referenceLinks: z.array(z.string().url()).optional(),
})

const updateRepertoireSchema = z.object({
  status: repertoireStatusSchema.optional(),
  difficultyRating: z
    .union([
      z.number().min(1).max(5),
      z.null().transform(() => undefined),
      z.undefined(),
    ])
    .optional(),
  personalNotes: z.string().optional(),
  referenceLinks: z.array(z.string().url()).optional(),
})

export const repertoireHandler = new Hono<{
  Bindings: Env
  Variables: Variables
}>()

// All repertoire endpoints require authentication
repertoireHandler.use('/*', authMiddleware)

/**
 * List user's repertoire
 * GET /api/repertoire
 */
repertoireHandler.get('/', async c => {
  const userId = c.get('userId') as string

  try {
    // Get all repertoire items for the user
    const repertoire = await c.env.DB.prepare(
      `
        SELECT 
          r.*,
          COUNT(DISTINCT json_extract(sd.data, '$.id')) as practice_count,
          SUM(json_extract(sd.data, '$.duration')) as total_practice_time,
          MAX(json_extract(sd.data, '$.timestamp')) as last_practiced
        FROM user_repertoire r
        LEFT JOIN sync_data sd ON sd.user_id = r.user_id
          AND json_extract(sd.data, '$.scoreId') = r.score_id
          AND sd.entity_type = 'logbook_entry'
        WHERE r.user_id = ?
        GROUP BY r.id
        ORDER BY r.updated_at DESC
      `
    )
      .bind(userId)
      .all()

    return c.json({
      items: repertoire.results.map((item: Record<string, unknown>) => ({
        id: item.id,
        scoreId: item.score_id,
        status: item.status,
        difficultyRating: item.difficulty_rating,
        personalNotes: item.personal_notes,
        referenceLinks: item.reference_links
          ? JSON.parse(item.reference_links as string)
          : [],
        practiceCount: item.practice_count || 0,
        totalPracticeTime: item.total_practice_time || 0,
        lastPracticed: item.last_practiced,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
    })
  } catch (error) {
    console.error('Error listing repertoire:', error)
    throw Errors.InternalError()
  }
})

/**
 * Get repertoire stats for a specific score
 * GET /api/repertoire/:scoreId/stats
 */
repertoireHandler.get('/:scoreId/stats', async c => {
  const userId = c.get('userId') as string
  const scoreId = c.req.param('scoreId')

  try {
    // Get repertoire item with detailed stats
    const result = await c.env.DB.prepare(
      `
        SELECT 
          r.*,
          COUNT(DISTINCT json_extract(sd.data, '$.id')) as practice_count,
          SUM(json_extract(sd.data, '$.duration')) as total_practice_time,
          MAX(json_extract(sd.data, '$.timestamp')) as last_practiced,
          MIN(json_extract(sd.data, '$.timestamp')) as first_practiced,
          AVG(json_extract(sd.data, '$.duration')) as avg_session_duration
        FROM user_repertoire r
        LEFT JOIN sync_data sd ON sd.user_id = r.user_id
          AND json_extract(sd.data, '$.scoreId') = r.score_id
          AND sd.entity_type = 'logbook_entry'
        WHERE r.user_id = ? AND r.score_id = ?
        GROUP BY r.id
      `
    )
      .bind(userId, scoreId)
      .first()

    if (!result) {
      throw Errors.NotFound('Repertoire item not found')
    }

    // Get practice sessions over time
    const sessions = await c.env.DB.prepare(
      `
        SELECT 
          json_extract(sd.data, '$.timestamp') as timestamp,
          json_extract(sd.data, '$.duration') as duration,
          json_extract(sd.data, '$.notes') as notes
        FROM sync_data sd
        WHERE sd.user_id = ? 
          AND json_extract(sd.data, '$.scoreId') = ?
          AND sd.entity_type = 'logbook_entry'
        ORDER BY json_extract(sd.data, '$.timestamp') DESC
        LIMIT 50
      `
    )
      .bind(userId, scoreId)
      .all()

    return c.json({
      repertoire: {
        id: result.id,
        scoreId: result.score_id,
        status: result.status,
        difficultyRating: result.difficulty_rating,
        personalNotes: result.personal_notes,
        referenceLinks: result.reference_links
          ? JSON.parse(result.reference_links as string)
          : [],
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      },
      stats: {
        practiceCount: result.practice_count || 0,
        totalPracticeTime: result.total_practice_time || 0,
        avgSessionDuration: result.avg_session_duration || 0,
        lastPracticed: result.last_practiced,
        firstPracticed: result.first_practiced,
        recentSessions: sessions.results,
      },
    })
  } catch (error) {
    console.error('Error getting repertoire stats:', error)
    throw error
  }
})

/**
 * Add piece to repertoire
 * POST /api/repertoire
 */
repertoireHandler.post('/', validateBody(createRepertoireSchema), async c => {
  const userId = c.get('userId') as string
  const body = c.get('validatedBody') as z.infer<typeof createRepertoireSchema>

  try {
    const now = Math.floor(Date.now() / 1000) // Unix timestamp
    const id = nanoid()

    await c.env.DB.prepare(
      `
        INSERT INTO user_repertoire (
          id, user_id, score_id, status, difficulty_rating,
          personal_notes, reference_links, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, score_id) DO UPDATE SET
          status = excluded.status,
          difficulty_rating = excluded.difficulty_rating,
          personal_notes = excluded.personal_notes,
          reference_links = excluded.reference_links,
          updated_at = excluded.updated_at
      `
    )
      .bind(
        id,
        userId,
        body.scoreId,
        body.status || 'planned',
        body.difficultyRating || null,
        body.personalNotes || null,
        body.referenceLinks ? JSON.stringify(body.referenceLinks) : null,
        now,
        now
      )
      .run()

    return c.json(
      {
        id,
        scoreId: body.scoreId,
        status: body.status || 'planned',
        difficultyRating: body.difficultyRating || null,
        personalNotes: body.personalNotes || null,
        referenceLinks: body.referenceLinks || [],
        createdAt: now,
        updatedAt: now,
      },
      201
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message?.includes('UNIQUE constraint failed')
    ) {
      throw Errors.InvalidInput('This piece is already in your repertoire')
    }
    console.error('Error adding to repertoire:', error)
    throw Errors.InternalError('Failed to add to repertoire')
  }
})

/**
 * Update repertoire item
 * PUT /api/repertoire/:scoreId
 */
repertoireHandler.put(
  '/:scoreId',
  validateBody(updateRepertoireSchema),
  async c => {
    const userId = c.get('userId') as string
    const scoreId = c.req.param('scoreId')
    const body = c.get('validatedBody') as z.infer<
      typeof updateRepertoireSchema
    >

    try {
      // First check if the item exists
      const existing = await c.env.DB.prepare(
        'SELECT * FROM user_repertoire WHERE user_id = ? AND score_id = ?'
      )
        .bind(userId, scoreId)
        .first()

      if (!existing) {
        throw Errors.NotFound('Repertoire item not found')
      }

      // Update the item
      const updateFields: string[] = []
      const updateValues: (string | number | null)[] = []

      // Handle status change with automatic tracking
      if (body.status !== undefined && body.status !== existing.status) {
        updateFields.push('status = ?')
        updateValues.push(body.status)

        // Append status change to personal notes
        const currentNotes = existing.personal_notes || ''
        const timestamp = new Date().toISOString()
        // Add newline only if there are existing notes
        const separator = currentNotes ? '\n' : ''
        const statusChangeEntry = `${separator}[STATUS_CHANGE:${timestamp}:${existing.status}:${body.status}]`

        // If personalNotes is also being updated, append to that; otherwise update separately
        if (body.personalNotes !== undefined) {
          body.personalNotes = body.personalNotes + statusChangeEntry
        } else {
          const updatedNotes = currentNotes + statusChangeEntry
          updateFields.push('personal_notes = ?')
          updateValues.push(updatedNotes)
        }
      } else if (body.status !== undefined) {
        // Status provided but unchanged - still update in case of data sync
        updateFields.push('status = ?')
        updateValues.push(body.status)
      }

      if (body.difficultyRating !== undefined) {
        updateFields.push('difficulty_rating = ?')
        updateValues.push(body.difficultyRating)
      }
      if (body.personalNotes !== undefined) {
        updateFields.push('personal_notes = ?')
        updateValues.push(body.personalNotes)
      }
      if (body.referenceLinks !== undefined) {
        updateFields.push('reference_links = ?')
        updateValues.push(JSON.stringify(body.referenceLinks))
      }

      if (updateFields.length === 0) {
        return c.json({ message: 'No fields to update' })
      }

      updateFields.push('updated_at = ?')
      updateValues.push(Math.floor(Date.now() / 1000))

      await c.env.DB.prepare(
        `
        UPDATE user_repertoire 
        SET ${updateFields.join(', ')}
        WHERE user_id = ? AND score_id = ?
      `
      )
        .bind(...updateValues, userId, scoreId)
        .run()

      return c.json({ message: 'Repertoire updated successfully' })
    } catch (error) {
      console.error('Error updating repertoire:', error)
      throw error
    }
  }
)

/**
 * Remove from repertoire
 * DELETE /api/repertoire/:scoreId
 */
repertoireHandler.delete('/:scoreId', async c => {
  const userId = c.get('userId') as string
  const scoreId = c.req.param('scoreId')

  try {
    const result = await c.env.DB.prepare(
      'DELETE FROM user_repertoire WHERE user_id = ? AND score_id = ?'
    )
      .bind(userId, scoreId)
      .run()

    if (result.meta.changes === 0) {
      throw Errors.NotFound('Repertoire item not found')
    }

    return c.json({ message: 'Removed from repertoire' })
  } catch (error) {
    console.error('Error removing from repertoire:', error)
    throw error
  }
})

/**
 * Dissociate piece from repertoire while preserving practice logs
 * DELETE /api/repertoire/:scoreId/dissociate
 */
repertoireHandler.delete('/:scoreId/dissociate', async c => {
  const userId = c.get('userId') as string
  const scoreId = c.req.param('scoreId')

  try {
    // Start a transaction to ensure data consistency
    const result = await c.env.DB.batch([
      // First, get the repertoire item to extract piece metadata
      c.env.DB.prepare(
        'SELECT * FROM user_repertoire WHERE user_id = ? AND score_id = ?'
      ).bind(userId, scoreId),

      // Get all logbook entries that reference this scoreId
      c.env.DB.prepare(
        `SELECT id, data FROM sync_data 
         WHERE user_id = ? 
         AND entity_type = 'logbook_entry' 
         AND json_extract(data, '$.scoreId') = ?`
      ).bind(userId, scoreId),
    ])

    const repertoireItem = result[0].results[0] as
      | Record<string, unknown>
      | undefined
    const logbookEntries = result[1].results as Array<{
      id: string
      data: string
    }>

    if (!repertoireItem) {
      throw Errors.NotFound('Repertoire item not found')
    }

    // Extract piece metadata from the first logbook entry or derive from scoreId
    let pieceTitle = 'Unknown Piece'
    let pieceComposer = ''

    if (logbookEntries.length > 0) {
      const firstEntry = JSON.parse(logbookEntries[0].data)
      pieceTitle =
        firstEntry.scoreTitle || firstEntry.pieces?.[0]?.title || pieceTitle
      pieceComposer =
        firstEntry.scoreComposer || firstEntry.pieces?.[0]?.composer || ''
    } else if (scoreId.includes('-')) {
      // Parse from normalized scoreId format
      const parts = scoreId.split('-')
      if (parts.length >= 2) {
        pieceTitle = parts[0]
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        pieceComposer = parts
          .slice(1)
          .join('-')
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
    }

    // Prepare batch operations to update logbook entries
    const updateOperations = []

    // Remove from repertoire
    updateOperations.push(
      c.env.DB.prepare(
        'DELETE FROM user_repertoire WHERE user_id = ? AND score_id = ?'
      ).bind(userId, scoreId)
    )

    // Update all logbook entries to remove scoreId and embed piece data
    for (const entry of logbookEntries) {
      const entryData = JSON.parse(entry.data)

      // Remove scoreId and ensure piece data is embedded
      delete entryData.scoreId
      entryData.scoreTitle = pieceTitle
      entryData.scoreComposer = pieceComposer

      // Ensure pieces array exists with the piece data
      if (!entryData.pieces || entryData.pieces.length === 0) {
        entryData.pieces = [
          {
            title: pieceTitle,
            composer: pieceComposer,
          },
        ]
      } else {
        // Update existing piece data
        entryData.pieces = entryData.pieces.map((piece: any) => ({
          title: piece.title || pieceTitle,
          composer: piece.composer || pieceComposer,
        }))
      }

      updateOperations.push(
        c.env.DB.prepare(
          'UPDATE sync_data SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(JSON.stringify(entryData), entry.id)
      )
    }

    // Execute all operations in a batch
    await c.env.DB.batch(updateOperations)

    return c.json({
      message: 'Piece dissociated from repertoire',
      preservedLogs: logbookEntries.length,
      pieceTitle,
      pieceComposer,
    })
  } catch (error) {
    console.error('Error dissociating piece from repertoire:', error)
    throw error
  }
})
