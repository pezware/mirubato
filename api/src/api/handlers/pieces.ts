import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, type Variables } from '../middleware'
import type { Env } from '../../index'
import { generateNormalizedScoreId } from '../../utils/scoreIdNormalizer'

export const piecesHandler = new Hono<{ Bindings: Env; Variables: Variables }>()

// Schema for piece update request
const updatePieceNameSchema = z.object({
  oldPiece: z.object({
    title: z.string().min(1),
    composer: z.string().optional(),
  }),
  newPiece: z.object({
    title: z.string().min(1),
    composer: z.string().optional(),
  }),
})

// Update piece name across all entries
piecesHandler.put('/update-name', authMiddleware, async c => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Parse and validate request body
    const body = await c.req.json()
    const { oldPiece, newPiece } = updatePieceNameSchema.parse(body)

    // Query all sync_data for the user
    // Use JSON extraction to properly search within the pieces array
    const stmt = c.env.DB.prepare(
      `
      SELECT id, entity_type, data, updated_at
      FROM sync_data
      WHERE user_id = ?
      AND entity_type = 'logbook_entry'
      AND json_extract(data, '$.pieces') IS NOT NULL
    `
    ).bind(user.id)

    const results = await stmt.all()
    let updatedCount = 0
    console.warn(
      `[Pieces] Found ${results.results?.length || 0} logbook entries to check`
    )
    console.warn(`[Pieces] Looking for pieces matching:`, oldPiece)

    // Update each matching entry
    for (const row of results.results || []) {
      try {
        const data = JSON.parse(row.data as string)
        let wasUpdated = false

        // Update pieces array
        if (data.pieces && Array.isArray(data.pieces)) {
          data.pieces = data.pieces.map((piece: Record<string, unknown>) => {
            if (
              piece.title === oldPiece.title &&
              (piece.composer || '') === (oldPiece.composer || '')
            ) {
              wasUpdated = true
              console.warn(
                `[Pieces] Updating piece in entry ${row.id}: "${oldPiece.title}" → "${newPiece.title}"`
              )
              return {
                ...piece,
                title: newPiece.title,
                composer: newPiece.composer || null,
              }
            }
            return piece
          })
        }

        // Also update scoreId if it matches the old piece
        const oldScoreId = generateNormalizedScoreId(
          oldPiece.title,
          oldPiece.composer
        )
        const newScoreId = generateNormalizedScoreId(
          newPiece.title,
          newPiece.composer
        )

        if (data.scoreId === oldScoreId) {
          data.scoreId = newScoreId
          wasUpdated = true
          console.warn(
            `[Pieces] Updating scoreId in entry ${row.id}: "${oldScoreId}" → "${newScoreId}"`
          )
        }

        // If the entry was updated, save it back
        if (wasUpdated) {
          data.updatedAt = new Date().toISOString()

          const updateStmt = c.env.DB.prepare(
            `
            WITH next_seq AS (
              UPDATE sync_sequence
              SET current_value = current_value + 1
              WHERE id = 1
              RETURNING current_value
            )
            UPDATE sync_data
            SET data = ?, updated_at = ?, seq = (SELECT current_value FROM next_seq)
            WHERE id = ? AND user_id = ?
          `
          ).bind(
            JSON.stringify(data),
            new Date().toISOString(),
            row.id,
            user.id
          )

          await updateStmt.run()
          updatedCount++
        }
      } catch (error) {
        console.error(`[Pieces] Error processing entry ${row.id}:`, error)
      }
    }

    return c.json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} entries`,
    })
  } catch (error) {
    console.error('Error updating piece names:', error)

    if (error instanceof z.ZodError) {
      return c.json(
        { error: 'Invalid request data', details: error.errors },
        400
      )
    }

    return c.json({ error: 'Failed to update piece names' }, 500)
  }
})
