import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import {
  CreateScoreSchema,
  UpdateScoreSchema,
  ApiResponse,
  PaginatedResponse,
} from '../../types/api'
import { Score } from '../../types/score'
import { authMiddleware, type Variables } from '../middleware'

export const scoresHandler = new Hono<{ Bindings: Env; Variables: Variables }>()

// List all scores with pagination
scoresHandler.get('/', async c => {
  try {
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = parseInt(c.req.query('offset') || '0')

    // Get user ID from auth if available
    let userId: string | null = null
    try {
      const authHeader = c.req.header('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { getUserIdFromAuth } = await import('../../utils/auth')
        userId = await getUserIdFromAuth(c as any)
      }
    } catch {
      // Continue without auth
    }

    // Build query
    let query = 'SELECT * FROM scores'
    const conditions: string[] = []
    const params: any[] = []

    // Add visibility filter
    if (userId) {
      // Authenticated users can see public scores and their own private scores
      conditions.push('(visibility = ? OR (visibility = ? AND user_id = ?))')
      params.push('public', 'private', userId)
    } else {
      // Anonymous users can only see public scores
      conditions.push('visibility = ?')
      params.push('public')
    }

    // Add filters if provided
    const instrument = c.req.query('instrument')
    if (instrument) {
      conditions.push('instrument = ?')
      params.push(instrument)
    }

    const difficulty = c.req.query('difficulty')
    if (difficulty) {
      conditions.push('difficulty = ?')
      params.push(difficulty)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    // Add ordering
    query += ' ORDER BY created_at DESC'

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
    const countResult = await c.env.DB.prepare(countQuery)
      .bind(...params)
      .first()
    const total = Number(countResult?.count) || 0

    // Add pagination
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    // Execute query
    const { results } = await c.env.DB.prepare(query)
      .bind(...params)
      .all()

    // Parse JSON fields
    const scores = results.map((row: any) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }))

    const response: ApiResponse<PaginatedResponse<Score>> = {
      success: true,
      data: {
        items: scores,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    }

    return c.json(response)
  } catch (error) {
    console.error('Error listing scores:', error)
    throw new HTTPException(500, { message: 'Failed to list scores' })
  }
})

// Get user's own scores
scoresHandler.get('/user/library', async c => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    // Get user ID from auth (required)
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    const { getUserIdFromAuth } = await import('../../utils/auth')
    const userId = await getUserIdFromAuth(c as any)
    if (!userId) {
      throw new HTTPException(401, { message: 'Invalid authentication' })
    }

    // Get user's scores
    const query = `
      SELECT * FROM scores 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const results = await c.env.DB.prepare(query)
      .bind(userId, limit, offset)
      .all()

    // Get total count
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM scores WHERE user_id = ?'
    )
      .bind(userId)
      .first()

    const total = (countResult?.count as number) || 0

    // Format results
    const scores = results.results.map(score => ({
      ...score,
      tags: score.tags ? JSON.parse(score.tags as string) : [],
      metadata: score.metadata ? JSON.parse(score.metadata as string) : {},
      createdAt: new Date(score.created_at as string),
      updatedAt: new Date(score.updated_at as string),
    }))

    const response = {
      success: true,
      data: scores as Score[],
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error fetching user library:', error)
    throw new HTTPException(500, { message: 'Failed to fetch user library' })
  }
})

// Get single score by ID
scoresHandler.get('/:id', async c => {
  try {
    const id = c.req.param('id')

    const score = await c.env.DB.prepare('SELECT * FROM scores WHERE id = ?')
      .bind(id)
      .first()

    if (!score) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // Check visibility permissions
    if (score.visibility === 'private') {
      // Get user ID from auth if available
      let userId: string | null = null
      try {
        const authHeader = c.req.header('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const { getUserIdFromAuth } = await import('../../utils/auth')
          userId = await getUserIdFromAuth(c as any)
        }
      } catch {
        // Continue without auth
      }

      if (userId !== score.user_id) {
        throw new HTTPException(403, { message: 'Access denied' })
      }
    }

    // Parse JSON fields
    const formattedScore = {
      ...score,
      tags: score.tags ? JSON.parse(score.tags as string) : [],
      metadata: score.metadata ? JSON.parse(score.metadata as string) : {},
      createdAt: new Date(score.created_at as string),
      updatedAt: new Date(score.updated_at as string),
    }

    const response: ApiResponse<Score> = {
      success: true,
      data: formattedScore as Score,
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error getting score:', error)
    throw new HTTPException(500, { message: 'Failed to get score' })
  }
})

// Get score metadata including page count
scoresHandler.get('/:id/metadata', async c => {
  try {
    const id = c.req.param('id')

    // Check if score exists
    const score = await c.env.DB.prepare(
      'SELECT id, title FROM scores WHERE id = ?'
    )
      .bind(id)
      .first()

    if (!score) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // Special handling for test scores
    let numPages: number = 0

    if (id.startsWith('test_')) {
      // Hardcoded page counts for test scores
      const testPageCounts: Record<string, number> = {
        test_aire_sureno: 1,
        test_romance_anonimo: 3,
      }
      numPages = testPageCounts[id] || 0
    } else {
      // Get the PDF version page count for real scores
      const pdfVersion = await c.env.DB.prepare(
        'SELECT page_count FROM score_versions WHERE score_id = ? AND format = ? AND processing_status = ?'
      )
        .bind(id, 'pdf', 'completed')
        .first()

      numPages = Number(pdfVersion?.page_count) || 0
    }

    const response: ApiResponse<{
      numPages: number
      scoreId: string
      title: string
    }> = {
      success: true,
      data: {
        numPages,
        scoreId: score.id as string,
        title: score.title as string,
      },
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error getting score metadata:', error)
    throw new HTTPException(500, { message: 'Failed to get score metadata' })
  }
})

// Create new score
scoresHandler.post('/', authMiddleware, async c => {
  try {
    const body = await c.req.json()

    // Validate input
    const validatedData = CreateScoreSchema.parse(body)

    // Generate ID
    const id = nanoid()

    // Insert into database
    await c.env.DB.prepare(
      `
      INSERT INTO scores (
        id, title, composer, opus, movement, instrument, difficulty,
        difficulty_level, grade_level, duration_seconds, time_signature,
        key_signature, tempo_marking, suggested_tempo, style_period,
        source, imslp_url, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        id,
        validatedData.title,
        validatedData.composer,
        validatedData.opus || null,
        validatedData.movement || null,
        validatedData.instrument,
        validatedData.difficulty,
        validatedData.difficultyLevel || null,
        validatedData.gradeLevel || null,
        validatedData.durationSeconds || null,
        validatedData.timeSignature || null,
        validatedData.keySignature || null,
        validatedData.tempoMarking || null,
        validatedData.suggestedTempo || null,
        validatedData.stylePeriod || null,
        validatedData.source,
        validatedData.imslpUrl || null,
        JSON.stringify(validatedData.tags),
        JSON.stringify(validatedData.metadata || {})
      )
      .run()

    // Fetch created score
    const newScore = await c.env.DB.prepare('SELECT * FROM scores WHERE id = ?')
      .bind(id)
      .first()

    const formattedScore = {
      ...newScore,
      tags: JSON.parse(newScore!.tags as string),
      metadata: JSON.parse(newScore!.metadata as string),
      createdAt: new Date(newScore!.created_at as string),
      updatedAt: new Date(newScore!.updated_at as string),
    }

    const response: ApiResponse<Score> = {
      success: true,
      data: formattedScore as Score,
      message: 'Score created successfully',
    }

    return c.json(response, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, {
        message: 'Invalid input',
        cause: error.errors,
      })
    }
    console.error('Error creating score:', error)
    throw new HTTPException(500, { message: 'Failed to create score' })
  }
})

// Update score
scoresHandler.put('/:id', authMiddleware, async c => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    // Validate input
    const validatedData = UpdateScoreSchema.parse(body)

    // Check if score exists
    const existing = await c.env.DB.prepare('SELECT * FROM scores WHERE id = ?')
      .bind(id)
      .first()

    if (!existing) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // Build update query
    const updates: string[] = []
    const params: any[] = []

    Object.entries(validatedData).forEach(([key, value]) => {
      if (key === 'tags' || key === 'metadata') {
        updates.push(`${key} = ?`)
        params.push(JSON.stringify(value))
      } else {
        updates.push(`${key} = ?`)
        params.push(value)
      }
    })

    if (updates.length === 0) {
      throw new HTTPException(400, { message: 'No fields to update' })
    }

    params.push(id)

    await c.env.DB.prepare(
      `UPDATE scores SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...params)
      .run()

    // Fetch updated score
    const updatedScore = await c.env.DB.prepare(
      'SELECT * FROM scores WHERE id = ?'
    )
      .bind(id)
      .first()

    const formattedScore = {
      ...updatedScore,
      tags: JSON.parse(updatedScore!.tags as string),
      metadata: JSON.parse(updatedScore!.metadata as string),
      createdAt: new Date(updatedScore!.created_at as string),
      updatedAt: new Date(updatedScore!.updated_at as string),
    }

    const response: ApiResponse<Score> = {
      success: true,
      data: formattedScore as Score,
      message: 'Score updated successfully',
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, {
        message: 'Invalid input',
        cause: error.errors,
      })
    }
    console.error('Error updating score:', error)
    throw new HTTPException(500, { message: 'Failed to update score' })
  }
})

// Delete score
scoresHandler.delete('/:id', authMiddleware, async c => {
  try {
    const id = c.req.param('id')

    // Check if score exists
    const existing = await c.env.DB.prepare('SELECT * FROM scores WHERE id = ?')
      .bind(id)
      .first()

    if (!existing) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // Delete score versions from R2
    const versions = await c.env.DB.prepare(
      'SELECT r2_key FROM score_versions WHERE score_id = ?'
    )
      .bind(id)
      .all()

    for (const version of versions.results) {
      try {
        await c.env.SCORES_BUCKET.delete(version.r2_key as string)
      } catch (error) {
        console.error('Error deleting R2 object:', error)
      }
    }

    // Delete from database (cascade will handle score_versions)
    await c.env.DB.prepare('DELETE FROM scores WHERE id = ?').bind(id).run()

    const response: ApiResponse<null> = {
      success: true,
      message: 'Score deleted successfully',
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error deleting score:', error)
    throw new HTTPException(500, { message: 'Failed to delete score' })
  }
})

// Batch delete scores
scoresHandler.post('/batch/delete', authMiddleware, async c => {
  try {
    const userId = c.get('userId')
    const body = await c.req.json()

    // Validate input
    const { scoreIds } = z
      .object({
        scoreIds: z.array(z.string()).min(1).max(100),
      })
      .parse(body)

    // Verify all scores belong to the user
    const placeholders = scoreIds.map(() => '?').join(',')
    const scores = await c.env.DB.prepare(
      `SELECT id, user_id, pdf_url FROM scores WHERE id IN (${placeholders})`
    )
      .bind(...scoreIds)
      .all()

    // Check ownership
    const userScoreIds = new Set<string>()
    const scorePdfUrls = new Map<string, string>()
    for (const score of scores.results) {
      if (score.user_id !== userId) {
        throw new HTTPException(403, {
          message: `You don't have permission to delete score ${score.id}`,
        })
      }
      userScoreIds.add(score.id as string)
      if (score.pdf_url) {
        scorePdfUrls.set(score.id as string, score.pdf_url as string)
      }
    }

    // Check for any missing scores
    const missingScores = scoreIds.filter(id => !userScoreIds.has(id))
    if (missingScores.length > 0) {
      throw new HTTPException(404, {
        message: `Scores not found: ${missingScores.join(', ')}`,
      })
    }

    // Delete R2 files for each score
    const deletePromises: Promise<void>[] = []

    for (const scoreId of scoreIds) {
      // Delete PDF file
      const pdfUrl = scorePdfUrls.get(scoreId)
      if (pdfUrl) {
        const r2Key = pdfUrl.replace('/files/', '')
        deletePromises.push(
          c.env.SCORES_BUCKET.delete(r2Key).catch(err =>
            console.error(`Failed to delete PDF for ${scoreId}:`, err)
          )
        )
      }

      // Delete rendered pages
      deletePromises.push(
        (async () => {
          // List and delete all rendered pages
          const pagePrefix = `rendered/${scoreId}/`
          const pageList = await c.env.SCORES_BUCKET.list({
            prefix: pagePrefix,
          })
          for (const obj of pageList.objects) {
            await c.env.SCORES_BUCKET.delete(obj.key).catch(err =>
              console.error(`Failed to delete ${obj.key}:`, err)
            )
          }
        })()
      )

      // Delete thumbnail
      deletePromises.push(
        c.env.SCORES_BUCKET.delete(`thumbnails/${scoreId}/thumb.webp`).catch(
          err =>
            console.error(`Failed to delete thumbnail for ${scoreId}:`, err)
        )
      )
    }

    // Wait for all R2 deletions
    await Promise.allSettled(deletePromises)

    // Delete from database (batch delete)
    await c.env.DB.prepare(`DELETE FROM scores WHERE id IN (${placeholders})`)
      .bind(...scoreIds)
      .run()

    // Also remove from user collections
    const collections = await c.env.DB.prepare(
      'SELECT id, score_ids FROM user_collections WHERE user_id = ?'
    )
      .bind(userId)
      .all()

    const scoreIdSet = new Set(scoreIds)
    for (const col of collections.results) {
      const currentScoreIds = JSON.parse((col.score_ids as string) || '[]')
      const filteredIds = currentScoreIds.filter(
        (id: string) => !scoreIdSet.has(id)
      )
      if (filteredIds.length !== currentScoreIds.length) {
        await c.env.DB.prepare(
          'UPDATE user_collections SET score_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
          .bind(JSON.stringify(filteredIds), col.id)
          .run()
      }
    }

    return c.json({
      success: true,
      message: `Successfully deleted ${scoreIds.length} scores`,
      deletedCount: scoreIds.length,
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, {
        message: 'Invalid input',
        cause: error.errors,
      })
    }
    console.error('Error batch deleting scores:', error)
    throw new HTTPException(500, { message: 'Failed to delete scores' })
  }
})

// Serve image pages for multi-image scores
scoresHandler.get('/:id/pages/:pageNumber', async c => {
  try {
    const scoreId = c.req.param('id')
    const pageNumber = parseInt(c.req.param('pageNumber'))

    if (isNaN(pageNumber) || pageNumber < 1) {
      throw new HTTPException(400, { message: 'Invalid page number' })
    }

    // Get score to check visibility
    const score = await c.env.DB.prepare(
      'SELECT user_id, visibility, source_type FROM scores WHERE id = ?'
    )
      .bind(scoreId)
      .first()

    if (!score) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // Check access permissions
    if (score.visibility === 'private') {
      // Get user ID from auth if available
      let userId: string | null = null
      try {
        const authHeader = c.req.header('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const { getUserIdFromAuth } = await import('../../utils/auth')
          userId = await getUserIdFromAuth(c as any)
        }
      } catch {
        // Continue without auth
      }

      if (userId !== score.user_id) {
        throw new HTTPException(403, { message: 'Access denied' })
      }
    }

    // Get page info from database
    const page = await c.env.DB.prepare(
      'SELECT r2_key, mime_type FROM score_pages WHERE score_id = ? AND page_number = ?'
    )
      .bind(scoreId, pageNumber)
      .first()

    if (!page) {
      throw new HTTPException(404, { message: 'Page not found' })
    }

    // Get image from R2
    const imageObject = await c.env.SCORES_BUCKET.get(page.r2_key as string)
    if (!imageObject) {
      throw new HTTPException(404, { message: 'Image file not found' })
    }

    // Return image with appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', page.mime_type as string)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    headers.set('Access-Control-Allow-Origin', '*') // Allow cross-origin requests

    return new Response(imageObject.body, { headers })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error serving image page:', error)
    throw new HTTPException(500, { message: 'Failed to serve image' })
  }
})
