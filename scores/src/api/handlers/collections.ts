import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { CreateCollectionSchema, ApiResponse } from '../../types/api'
import { Collection, Score } from '../../types/score'

export const collectionsHandler = new Hono<{ Bindings: Env }>()

// List all collections
collectionsHandler.get('/', async c => {
  try {
    const instrument = c.req.query('instrument')
    const difficulty = c.req.query('difficulty')
    const featured = c.req.query('featured')

    let query = 'SELECT * FROM collections'
    const conditions: string[] = []
    const params: any[] = []

    if (instrument) {
      conditions.push('(instrument = ? OR instrument IS NULL)')
      params.push(instrument)
    }

    if (difficulty) {
      conditions.push('(difficulty = ? OR difficulty IS NULL)')
      params.push(difficulty)
    }

    if (featured === 'true') {
      conditions.push('is_featured = 1')
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY display_order ASC, created_at DESC'

    const { results } = await c.env.DB.prepare(query)
      .bind(...params)
      .all()

    const collections = results.map((row: any) => ({
      ...row,
      scoreIds: JSON.parse(row.score_ids),
      isFeatured: Boolean(row.is_featured),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }))

    const response: ApiResponse<Collection[]> = {
      success: true,
      data: collections as Collection[],
    }

    return c.json(response)
  } catch (error) {
    console.error('Error listing collections:', error)
    throw new HTTPException(500, { message: 'Failed to list collections' })
  }
})

// Get collection by slug
collectionsHandler.get('/:slug', async c => {
  try {
    const slug = c.req.param('slug')

    const collection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE slug = ?'
    )
      .bind(slug)
      .first()

    if (!collection) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    // Parse score IDs
    const scoreIds = JSON.parse(collection.score_ids as string)

    // Fetch scores in the collection
    let scores: Score[] = []
    if (scoreIds.length > 0) {
      const placeholders = scoreIds.map(() => '?').join(',')
      const scoreQuery = `SELECT * FROM scores WHERE id IN (${placeholders})`
      const { results } = await c.env.DB.prepare(scoreQuery)
        .bind(...scoreIds)
        .all()

      scores = results.map((row: any) => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }))
    }

    const formattedCollection = {
      ...collection,
      scoreIds,
      isFeatured: Boolean(collection.is_featured),
      createdAt: new Date(collection.created_at as string),
      updatedAt: new Date(collection.updated_at as string),
    }

    const response: ApiResponse<{ collection: Collection; scores: Score[] }> = {
      success: true,
      data: {
        collection: formattedCollection as Collection,
        scores,
      },
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error getting collection:', error)
    throw new HTTPException(500, { message: 'Failed to get collection' })
  }
})

// Create new collection
collectionsHandler.post('/', async c => {
  try {
    const body = await c.req.json()

    // Validate input
    const validatedData = CreateCollectionSchema.parse(body)

    // Generate ID and slug
    const id = nanoid()
    const slug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check if slug already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM collections WHERE slug = ?'
    )
      .bind(slug)
      .first()

    if (existing) {
      throw new HTTPException(400, {
        message: 'Collection with this name already exists',
      })
    }

    // Verify all score IDs exist
    if (validatedData.scoreIds.length > 0) {
      const placeholders = validatedData.scoreIds.map(() => '?').join(',')
      const checkQuery = `SELECT COUNT(*) as count FROM scores WHERE id IN (${placeholders})`
      const result = await c.env.DB.prepare(checkQuery)
        .bind(...validatedData.scoreIds)
        .first()

      if (result?.count !== validatedData.scoreIds.length) {
        throw new HTTPException(400, { message: 'Some score IDs do not exist' })
      }
    }

    // Insert collection
    await c.env.DB.prepare(
      `
      INSERT INTO collections (
        id, name, slug, description, instrument, difficulty,
        score_ids, display_order, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        id,
        validatedData.name,
        slug,
        validatedData.description || null,
        validatedData.instrument || null,
        validatedData.difficulty || null,
        JSON.stringify(validatedData.scoreIds),
        validatedData.displayOrder,
        validatedData.isFeatured ? 1 : 0
      )
      .run()

    // Fetch created collection
    const newCollection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    )
      .bind(id)
      .first()

    const formattedCollection = {
      ...newCollection,
      scoreIds: JSON.parse(newCollection!.score_ids as string),
      isFeatured: Boolean(newCollection!.is_featured),
      createdAt: new Date(newCollection!.created_at as string),
      updatedAt: new Date(newCollection!.updated_at as string),
    }

    const response: ApiResponse<Collection> = {
      success: true,
      data: formattedCollection as Collection,
      message: 'Collection created successfully',
    }

    return c.json(response, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, {
        message: 'Invalid input',
        cause: error.errors,
      })
    }
    console.error('Error creating collection:', error)
    throw new HTTPException(500, { message: 'Failed to create collection' })
  }
})

// Update collection
collectionsHandler.put('/:id', async c => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    // Check if collection exists
    const existing = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    )
      .bind(id)
      .first()

    if (!existing) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    // Build update query
    const updates: string[] = []
    const params: any[] = []

    if (body.name !== undefined) {
      updates.push('name = ?')
      params.push(body.name)

      // Update slug if name changed
      const newSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      updates.push('slug = ?')
      params.push(newSlug)
    }

    if (body.description !== undefined) {
      updates.push('description = ?')
      params.push(body.description || null)
    }

    if (body.scoreIds !== undefined) {
      // Verify score IDs exist
      if (body.scoreIds.length > 0) {
        const placeholders = body.scoreIds.map(() => '?').join(',')
        const checkQuery = `SELECT COUNT(*) as count FROM scores WHERE id IN (${placeholders})`
        const result = await c.env.DB.prepare(checkQuery)
          .bind(...body.scoreIds)
          .first()

        if (result?.count !== body.scoreIds.length) {
          throw new HTTPException(400, {
            message: 'Some score IDs do not exist',
          })
        }
      }

      updates.push('score_ids = ?')
      params.push(JSON.stringify(body.scoreIds))
    }

    if (body.displayOrder !== undefined) {
      updates.push('display_order = ?')
      params.push(body.displayOrder)
    }

    if (body.isFeatured !== undefined) {
      updates.push('is_featured = ?')
      params.push(body.isFeatured ? 1 : 0)
    }

    if (updates.length === 0) {
      throw new HTTPException(400, { message: 'No fields to update' })
    }

    params.push(id)

    await c.env.DB.prepare(
      `UPDATE collections SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...params)
      .run()

    // Fetch updated collection
    const updatedCollection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    )
      .bind(id)
      .first()

    const formattedCollection = {
      ...updatedCollection,
      scoreIds: JSON.parse(updatedCollection!.score_ids as string),
      isFeatured: Boolean(updatedCollection!.is_featured),
      createdAt: new Date(updatedCollection!.created_at as string),
      updatedAt: new Date(updatedCollection!.updated_at as string),
    }

    const response: ApiResponse<Collection> = {
      success: true,
      data: formattedCollection as Collection,
      message: 'Collection updated successfully',
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error updating collection:', error)
    throw new HTTPException(500, { message: 'Failed to update collection' })
  }
})

// Delete collection
collectionsHandler.delete('/:id', async c => {
  try {
    const id = c.req.param('id')

    // Check if collection exists
    const existing = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    )
      .bind(id)
      .first()

    if (!existing) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    // Delete collection
    await c.env.DB.prepare('DELETE FROM collections WHERE id = ?')
      .bind(id)
      .run()

    const response: ApiResponse<null> = {
      success: true,
      message: 'Collection deleted successfully',
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error deleting collection:', error)
    throw new HTTPException(500, { message: 'Failed to delete collection' })
  }
})
