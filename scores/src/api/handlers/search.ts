import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ScoreSearchSchema, ApiResponse } from '../../types/api'
import { Score, ScoreSearchResult } from '../../types/score'

export const searchHandler = new Hono<{ Bindings: Env }>()

// Advanced search endpoint
searchHandler.get('/', async c => {
  try {
    // Parse and validate query parameters
    const searchParams = ScoreSearchSchema.parse({
      query: c.req.query('query'),
      instrument: c.req.query('instrument'),
      difficulty: c.req.query('difficulty'),
      minDifficultyLevel: c.req.query('minDifficultyLevel')
        ? parseInt(c.req.query('minDifficultyLevel')!)
        : undefined,
      maxDifficultyLevel: c.req.query('maxDifficultyLevel')
        ? parseInt(c.req.query('maxDifficultyLevel')!)
        : undefined,
      stylePeriod: c.req.query('stylePeriod'),
      composer: c.req.query('composer'),
      tags: c.req.query('tags')?.split(',').filter(Boolean),
      maxDuration: c.req.query('maxDuration')
        ? parseInt(c.req.query('maxDuration')!)
        : undefined,
      gradeLevel: c.req.query('gradeLevel'),
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0,
      sortBy: c.req.query('sortBy') as
        | 'title'
        | 'composer'
        | 'difficulty'
        | 'createdAt'
        | 'popularity'
        | undefined,
      sortOrder: c.req.query('sortOrder') as 'asc' | 'desc' | undefined,
    })

    // Build search query
    const conditions: string[] = []
    const params: unknown[] = []

    // Full-text search on title and composer
    if (searchParams.query) {
      conditions.push('(title LIKE ? OR composer LIKE ?)')
      const searchTerm = `%${searchParams.query}%`
      params.push(searchTerm, searchTerm)
    }

    // Instrument filter
    if (searchParams.instrument) {
      conditions.push('(instrument = ? OR instrument = ?)')
      params.push(searchParams.instrument, 'BOTH')
    }

    // Difficulty filter
    if (searchParams.difficulty) {
      conditions.push('difficulty = ?')
      params.push(searchParams.difficulty)
    }

    // Difficulty level range
    if (searchParams.minDifficultyLevel !== undefined) {
      conditions.push('difficulty_level >= ?')
      params.push(searchParams.minDifficultyLevel)
    }

    if (searchParams.maxDifficultyLevel !== undefined) {
      conditions.push('difficulty_level <= ?')
      params.push(searchParams.maxDifficultyLevel)
    }

    // Style period filter
    if (searchParams.stylePeriod) {
      conditions.push('style_period = ?')
      params.push(searchParams.stylePeriod)
    }

    // Composer filter
    if (searchParams.composer) {
      conditions.push('composer LIKE ?')
      params.push(`%${searchParams.composer}%`)
    }

    // Duration filter
    if (searchParams.maxDuration) {
      conditions.push('duration_seconds <= ?')
      params.push(searchParams.maxDuration)
    }

    // Grade level filter
    if (searchParams.gradeLevel) {
      conditions.push('grade_level = ?')
      params.push(searchParams.gradeLevel)
    }

    // Tag filter (requires JSON search)
    if (searchParams.tags && searchParams.tags.length > 0) {
      const tagConditions = searchParams.tags.map(() => 'tags LIKE ?')
      conditions.push(`(${tagConditions.join(' OR ')})`)
      searchParams.tags.forEach(tag => {
        params.push(`%"${tag}"%`)
      })
    }

    // Build final query
    let query = 'SELECT * FROM scores'
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
    const countResult = await c.env.DB.prepare(countQuery)
      .bind(...params)
      .first()
    const total = Number(countResult?.count) || 0

    // Add sorting
    const sortBy = searchParams.sortBy || 'createdAt'
    const sortOrder = searchParams.sortOrder || 'desc'
    const sortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`

    // Add pagination
    query += ' LIMIT ? OFFSET ?'
    params.push(searchParams.limit, searchParams.offset)

    // Execute query
    const { results } = await c.env.DB.prepare(query)
      .bind(...params)
      .all()

    // Parse JSON fields and format results
    const scores = results.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }))

    const searchResult: ScoreSearchResult = {
      scores: scores as Score[],
      total,
      limit: searchParams.limit,
      offset: searchParams.offset,
    }

    const response: ApiResponse<ScoreSearchResult> = {
      success: true,
      data: searchResult,
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      throw new HTTPException(400, {
        message: 'Invalid search parameters',
        cause: error,
      })
    }
    console.error('Error searching scores:', error)
    throw new HTTPException(500, { message: 'Failed to search scores' })
  }
})

// Get popular scores
searchHandler.get('/popular', async c => {
  try {
    const limit = parseInt(c.req.query('limit') || '10')

    const query = `
      SELECT s.*, COALESCE(sa.view_count, 0) as view_count
      FROM scores s
      LEFT JOIN score_analytics sa ON s.id = sa.score_id
      ORDER BY view_count DESC
      LIMIT ?
    `

    const { results } = await c.env.DB.prepare(query).bind(limit).all()

    const scores = results.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }))

    const response: ApiResponse<Score[]> = {
      success: true,
      data: scores as Score[],
    }

    return c.json(response)
  } catch (error) {
    console.error('Error getting popular scores:', error)
    throw new HTTPException(500, { message: 'Failed to get popular scores' })
  }
})

// Get recently added scores
searchHandler.get('/recent', async c => {
  try {
    const limit = parseInt(c.req.query('limit') || '10')

    const query = `
      SELECT * FROM scores
      ORDER BY created_at DESC
      LIMIT ?
    `

    const { results } = await c.env.DB.prepare(query).bind(limit).all()

    const scores = results.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }))

    const response: ApiResponse<Score[]> = {
      success: true,
      data: scores as Score[],
    }

    return c.json(response)
  } catch (error) {
    console.error('Error getting recent scores:', error)
    throw new HTTPException(500, { message: 'Failed to get recent scores' })
  }
})
