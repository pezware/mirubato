import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { generateId } from '../../utils/generateId'
import { getAuthUser } from '../../utils/auth-enhanced'
import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

const favoritesHandler = new Hono<{ Bindings: Env }>()

// List user's favorite scores
favoritesHandler.get('/', async c => {
  try {
    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Context<{
        Bindings: { JWT_SECRET: string; DB: D1Database }
      }>
    )
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Get user's favorites with score details
    const favorites = await c.env.DB.prepare(
      `SELECT
        f.id as favorite_id,
        f.created_at as favorited_at,
        s.*
       FROM user_score_favorites f
       JOIN scores s ON f.score_id = s.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`
    )
      .bind(user.id)
      .all()

    // Format results
    const formattedFavorites = favorites.results.map(row => ({
      favoriteId: row.favorite_id,
      favoritedAt: row.favorited_at,
      score: {
        id: row.id,
        title: row.title,
        composer: row.composer,
        opus: row.opus,
        instrument: row.instrument,
        difficulty: row.difficulty,
        difficulty_level: row.difficulty_level,
        grade_level: row.grade_level,
        time_signature: row.time_signature,
        key_signature: row.key_signature,
        style_period: row.style_period,
        source: row.source,
        source_type: row.source_type,
        page_count: row.page_count,
        tags: row.tags ? JSON.parse(row.tags as string) : [],
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    }))

    return c.json({
      success: true,
      data: formattedFavorites,
      total: formattedFavorites.length,
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error listing favorites:', error)
    throw new HTTPException(500, { message: 'Failed to list favorites' })
  }
})

// Get favorite score IDs only (for quick checks)
favoritesHandler.get('/ids', async c => {
  try {
    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Context<{
        Bindings: { JWT_SECRET: string; DB: D1Database }
      }>
    )
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Get just the score IDs
    const favorites = await c.env.DB.prepare(
      `SELECT score_id FROM user_score_favorites WHERE user_id = ?`
    )
      .bind(user.id)
      .all()

    const scoreIds = favorites.results.map(row => row.score_id as string)

    return c.json({
      success: true,
      data: scoreIds,
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error getting favorite IDs:', error)
    throw new HTTPException(500, { message: 'Failed to get favorite IDs' })
  }
})

// Check if a score is favorited
favoritesHandler.get('/check/:scoreId', async c => {
  try {
    const scoreId = c.req.param('scoreId')

    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Context<{
        Bindings: { JWT_SECRET: string; DB: D1Database }
      }>
    )
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    const favorite = await c.env.DB.prepare(
      `SELECT id FROM user_score_favorites WHERE user_id = ? AND score_id = ?`
    )
      .bind(user.id, scoreId)
      .first()

    return c.json({
      success: true,
      data: {
        isFavorited: !!favorite,
      },
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error checking favorite status:', error)
    throw new HTTPException(500, { message: 'Failed to check favorite status' })
  }
})

// Add score to favorites
favoritesHandler.post('/:scoreId', async c => {
  try {
    const scoreId = c.req.param('scoreId')

    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Context<{
        Bindings: { JWT_SECRET: string; DB: D1Database }
      }>
    )
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Check if score exists and user has access
    const score = await c.env.DB.prepare(
      'SELECT id FROM scores WHERE id = ? AND (user_id = ? OR visibility = ?)'
    )
      .bind(scoreId, user.id, 'public')
      .first()

    if (!score) {
      throw new HTTPException(404, {
        message: 'Score not found or access denied',
      })
    }

    // Check if already favorited
    const existing = await c.env.DB.prepare(
      'SELECT id FROM user_score_favorites WHERE user_id = ? AND score_id = ?'
    )
      .bind(user.id, scoreId)
      .first()

    if (existing) {
      // Already favorited, return success (idempotent)
      return c.json({
        success: true,
        message: 'Score is already in favorites',
        data: { isFavorited: true },
      })
    }

    // Add to favorites
    const id = generateId()
    await c.env.DB.prepare(
      'INSERT INTO user_score_favorites (id, user_id, score_id) VALUES (?, ?, ?)'
    )
      .bind(id, user.id, scoreId)
      .run()

    return c.json(
      {
        success: true,
        message: 'Score added to favorites',
        data: { isFavorited: true },
      },
      201
    )
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error adding favorite:', error)
    throw new HTTPException(500, { message: 'Failed to add favorite' })
  }
})

// Remove score from favorites
favoritesHandler.delete('/:scoreId', async c => {
  try {
    const scoreId = c.req.param('scoreId')

    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Context<{
        Bindings: { JWT_SECRET: string; DB: D1Database }
      }>
    )
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Remove from favorites
    await c.env.DB.prepare(
      'DELETE FROM user_score_favorites WHERE user_id = ? AND score_id = ?'
    )
      .bind(user.id, scoreId)
      .run()

    return c.json({
      success: true,
      message: 'Score removed from favorites',
      data: { isFavorited: false },
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error removing favorite:', error)
    throw new HTTPException(500, { message: 'Failed to remove favorite' })
  }
})

// Toggle favorite status (convenience endpoint)
favoritesHandler.post('/:scoreId/toggle', async c => {
  try {
    const scoreId = c.req.param('scoreId')

    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Context<{
        Bindings: { JWT_SECRET: string; DB: D1Database }
      }>
    )
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Check if score exists and user has access
    const score = await c.env.DB.prepare(
      'SELECT id FROM scores WHERE id = ? AND (user_id = ? OR visibility = ?)'
    )
      .bind(scoreId, user.id, 'public')
      .first()

    if (!score) {
      throw new HTTPException(404, {
        message: 'Score not found or access denied',
      })
    }

    // Check current favorite status
    const existing = await c.env.DB.prepare(
      'SELECT id FROM user_score_favorites WHERE user_id = ? AND score_id = ?'
    )
      .bind(user.id, scoreId)
      .first()

    if (existing) {
      // Remove from favorites
      await c.env.DB.prepare(
        'DELETE FROM user_score_favorites WHERE user_id = ? AND score_id = ?'
      )
        .bind(user.id, scoreId)
        .run()

      return c.json({
        success: true,
        message: 'Score removed from favorites',
        data: { isFavorited: false },
      })
    } else {
      // Add to favorites
      const id = generateId()
      await c.env.DB.prepare(
        'INSERT INTO user_score_favorites (id, user_id, score_id) VALUES (?, ?, ?)'
      )
        .bind(id, user.id, scoreId)
        .run()

      return c.json({
        success: true,
        message: 'Score added to favorites',
        data: { isFavorited: true },
      })
    }
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error toggling favorite:', error)
    throw new HTTPException(500, { message: 'Failed to toggle favorite' })
  }
})

// Batch: Check favorite status for multiple scores at once (eliminates N+1 queries)
favoritesHandler.post('/batch/check', async c => {
  try {
    const body = await c.req.json()
    const { scoreIds } = body

    if (!Array.isArray(scoreIds) || scoreIds.length === 0) {
      throw new HTTPException(400, {
        message: 'scoreIds array is required and must not be empty',
      })
    }

    // Limit batch size to prevent abuse
    if (scoreIds.length > 100) {
      throw new HTTPException(400, {
        message: 'Maximum 100 score IDs per batch request',
      })
    }

    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Context<{
        Bindings: { JWT_SECRET: string; DB: D1Database }
      }>
    )
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Get all favorites for requested scores in a single query
    const placeholders = scoreIds.map(() => '?').join(',')
    const favorites = await c.env.DB.prepare(
      `SELECT score_id FROM user_score_favorites
       WHERE user_id = ? AND score_id IN (${placeholders})`
    )
      .bind(user.id, ...scoreIds)
      .all()

    // Build a map of scoreId -> isFavorited
    const favoriteStatus: Record<string, boolean> = {}

    // Initialize all requested scoreIds as not favorited
    for (const scoreId of scoreIds) {
      favoriteStatus[scoreId] = false
    }

    // Mark favorited ones
    for (const row of favorites.results) {
      const scoreId = row.score_id as string
      favoriteStatus[scoreId] = true
    }

    return c.json({
      success: true,
      data: favoriteStatus,
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error batch checking favorites:', error)
    throw new HTTPException(500, {
      message: 'Failed to batch check favorites',
    })
  }
})

export { favoritesHandler }
