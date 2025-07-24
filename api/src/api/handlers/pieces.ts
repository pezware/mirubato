import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, type Variables } from '../middleware'
import type { Env } from '../../index'

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
    const stmt = c.env.DB.prepare(
      `
      SELECT id, type, data, updated_at
      FROM sync_data
      WHERE user_id = ?
      AND type = 'logbook_entry'
      AND data LIKE ?
    `
    ).bind(user.id, `%"title":"${oldPiece.title}"%`)

    const results = await stmt.all()
    let updatedCount = 0

    // Update each matching entry
    for (const row of results.results || []) {
      const data = JSON.parse(row.data as string)
      let wasUpdated = false

      // Update pieces array
      if (data.pieces && Array.isArray(data.pieces)) {
        data.pieces = data.pieces.map((piece: any) => {
          if (
            piece.title === oldPiece.title &&
            (piece.composer || '') === (oldPiece.composer || '')
          ) {
            wasUpdated = true
            return {
              ...piece,
              title: newPiece.title,
              composer: newPiece.composer || null,
            }
          }
          return piece
        })
      }

      // If the entry was updated, save it back
      if (wasUpdated) {
        data.updatedAt = new Date().toISOString()

        const updateStmt = c.env.DB.prepare(
          `
          UPDATE sync_data
          SET data = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `
        ).bind(JSON.stringify(data), new Date().toISOString(), row.id, user.id)

        await updateStmt.run()
        updatedCount++
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
