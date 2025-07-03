import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { generateId } from '../../utils/generateId'
import { getAuthUser } from '../../utils/auth-enhanced'
import { generateSlug } from '../../utils/database'
import { VisibilityService } from '../../services/visibilityService'

const userCollectionsHandler = new Hono<{ Bindings: Env }>()

// Debug route
userCollectionsHandler.all('/debug', async c => {
  return c.json({
    message: 'User collections handler debug',
    method: c.req.method,
    path: c.req.path,
    url: c.req.url,
    routePath: c.req.routePath,
  })
})

// Schema for creating a collection
const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  visibility: z.enum(['private', 'public', 'unlisted']).default('private'),
  tags: z.array(z.string()).optional(),
})

// Schema for updating a collection
const UpdateCollectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  visibility: z.enum(['private', 'public', 'unlisted']).optional(),
  tags: z.array(z.string()).optional(),
  displayOrder: z.number().optional(),
})

// List user's collections
userCollectionsHandler.get('/', async c => {
  try {
    // Get authenticated user
    const user = await getAuthUser(c as any)
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Get user's collections
    const collections = await c.env.DB.prepare(
      `SELECT * FROM user_collections 
       WHERE user_id = ? 
       ORDER BY is_default DESC, display_order ASC, created_at DESC`
    )
      .bind(user.id)
      .all()

    console.log('User collections query result:', {
      userId: user.id,
      count: collections.results.length,
      firstCollection: collections.results[0],
    })

    // If user has no collections, create a default "General" collection
    if (collections.results.length === 0) {
      const defaultCollectionId = generateId()
      await c.env.DB.prepare(
        `INSERT INTO user_collections (
          id, user_id, name, description, slug, 
          visibility, is_default, collection_type, score_ids, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          defaultCollectionId,
          user.id,
          'General',
          'Your default collection',
          'general',
          'private',
          1, // is_default = true
          'personal',
          '[]',
          '[]'
        )
        .run()

      // Re-fetch collections
      const updatedCollections = await c.env.DB.prepare(
        `SELECT * FROM user_collections WHERE id = ?`
      )
        .bind(defaultCollectionId)
        .all()

      collections.results = updatedCollections.results
    }

    // Format results - convert snake_case to camelCase for frontend
    const formattedCollections = collections.results.map(col => ({
      id: col.id,
      userId: col.user_id,
      name: col.name,
      description: col.description,
      slug: col.slug,
      visibility: col.visibility,
      isDefault: col.is_default,
      collectionType: col.collection_type,
      scoreIds: JSON.parse((col.score_ids as string) || '[]'),
      tags: JSON.parse((col.tags as string) || '[]'),
      displayOrder: col.display_order,
      ownerType: col.owner_type,
      sharedWith: JSON.parse((col.shared_with as string) || '[]'),
      featuredAt: col.featured_at,
      featuredBy: col.featured_by,
      createdAt: new Date(col.created_at as string).toISOString(),
      updatedAt: new Date(col.updated_at as string).toISOString(),
    }))

    return c.json({
      success: true,
      data: formattedCollections,
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error listing user collections:', error)
    throw new HTTPException(500, { message: 'Failed to list collections' })
  }
})

// Get single collection
userCollectionsHandler.get('/:id', async c => {
  try {
    const collectionId = c.req.param('id')

    // Get authenticated user
    const user = await getAuthUser(c as any)
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Get collection
    const collection = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ? AND user_id = ?'
    )
      .bind(collectionId, user.id)
      .first()

    if (!collection) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    // Get scores in collection with full details
    const scoreIds = JSON.parse((collection.score_ids as string) || '[]')
    let scores: any[] = []

    if (scoreIds.length > 0) {
      const placeholders = scoreIds.map(() => '?').join(',')
      const scoresResult = await c.env.DB.prepare(
        `SELECT * FROM scores 
         WHERE id IN (${placeholders}) 
         ORDER BY created_at DESC`
      )
        .bind(...scoreIds)
        .all()

      scores = scoresResult.results.map(score => ({
        ...score,
        tags: JSON.parse((score.tags as string) || '[]'),
        metadata: JSON.parse((score.metadata as string) || '{}'),
      }))
    }

    // Format collection
    const formattedCollection = {
      ...collection,
      scoreIds: scoreIds,
      tags: JSON.parse((collection.tags as string) || '[]'),
      scores: scores, // Include full score details
      createdAt: new Date(collection.created_at as string),
      updatedAt: new Date(collection.updated_at as string),
    }

    return c.json({
      success: true,
      data: formattedCollection,
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error getting collection:', error)
    throw new HTTPException(500, { message: 'Failed to get collection' })
  }
})

// Create new collection
userCollectionsHandler.post('/', async c => {
  try {
    // Get authenticated user
    const user = await getAuthUser(c as any)
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Parse and validate request body
    const body = await c.req.json()
    const validatedData = CreateCollectionSchema.parse(body)

    // Generate ID and slug
    const id = generateId()
    const slug = generateSlug(validatedData.name)

    // Check if slug already exists for this user
    const existing = await c.env.DB.prepare(
      'SELECT id FROM user_collections WHERE user_id = ? AND slug = ?'
    )
      .bind(user.id, slug)
      .first()

    if (existing) {
      throw new HTTPException(400, {
        message: 'A collection with this name already exists',
      })
    }

    // Create collection
    await c.env.DB.prepare(
      `INSERT INTO user_collections (
        id, user_id, name, description, slug, visibility,
        collection_type, score_ids, tags, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        user.id,
        validatedData.name,
        validatedData.description || null,
        slug,
        validatedData.visibility,
        'personal', // User collections are always personal
        '[]', // Start with empty scores
        JSON.stringify(validatedData.tags || []),
        0
      )
      .run()

    // Return created collection
    const newCollection = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ?'
    )
      .bind(id)
      .first()

    return c.json(
      {
        success: true,
        data: {
          ...newCollection,
          scoreIds: [],
          tags: validatedData.tags || [],
          createdAt: new Date(newCollection!.created_at as string),
          updatedAt: new Date(newCollection!.updated_at as string),
        },
        message: 'Collection created successfully',
      },
      201
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, {
        message: 'Invalid request data',
        // @ts-expect-error - zod error has errors property
        errors: error.errors,
      })
    }
    if (error instanceof HTTPException) throw error
    console.error('Error creating collection:', error)
    throw new HTTPException(500, { message: 'Failed to create collection' })
  }
})

// Update collection
userCollectionsHandler.put('/:id', async c => {
  try {
    const collectionId = c.req.param('id')

    // Get authenticated user
    const user = await getAuthUser(c as any)
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Check if collection exists and belongs to user
    const existing = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ? AND user_id = ?'
    )
      .bind(collectionId, user.id)
      .first()

    if (!existing) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    if (existing.is_default) {
      throw new HTTPException(400, {
        message: 'Cannot modify default collection',
      })
    }

    // Parse and validate request body
    const body = await c.req.json()
    const validatedData = UpdateCollectionSchema.parse(body)

    // Build update query
    const updates: string[] = []
    const params: any[] = []

    if (validatedData.name !== undefined) {
      updates.push('name = ?')
      params.push(validatedData.name)

      // Update slug if name changed
      const newSlug = generateSlug(validatedData.name)
      updates.push('slug = ?')
      params.push(newSlug)
    }

    if (validatedData.description !== undefined) {
      updates.push('description = ?')
      params.push(validatedData.description)
    }

    let visibilityChanged = false
    if (
      validatedData.visibility !== undefined &&
      validatedData.visibility !== existing.visibility
    ) {
      updates.push('visibility = ?')
      params.push(validatedData.visibility)
      visibilityChanged = true
    }

    if (validatedData.tags !== undefined) {
      updates.push('tags = ?')
      params.push(JSON.stringify(validatedData.tags))
    }

    if (validatedData.displayOrder !== undefined) {
      updates.push('display_order = ?')
      params.push(validatedData.displayOrder)
    }

    if (updates.length === 0) {
      throw new HTTPException(400, { message: 'No updates provided' })
    }

    // Execute update
    params.push(collectionId)
    await c.env.DB.prepare(
      `UPDATE user_collections SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...params)
      .run()

    // If visibility changed, update all scores in the collection
    if (visibilityChanged) {
      const visibilityService = new VisibilityService(c.env.DB)
      await visibilityService.updateCollectionScoresVisibility(
        collectionId,
        user.id
      )
    }

    // Return updated collection
    const updated = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ?'
    )
      .bind(collectionId)
      .first()

    return c.json({
      success: true,
      data: {
        ...updated,
        scoreIds: JSON.parse((updated!.score_ids as string) || '[]'),
        tags: JSON.parse((updated!.tags as string) || '[]'),
        createdAt: new Date(updated!.created_at as string),
        updatedAt: new Date(updated!.updated_at as string),
      },
      message: 'Collection updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, {
        message: 'Invalid request data',
        // @ts-expect-error - zod error has errors property
        errors: error.errors,
      })
    }
    if (error instanceof HTTPException) throw error
    console.error('Error updating collection:', error)
    throw new HTTPException(500, { message: 'Failed to update collection' })
  }
})

// Delete collection
userCollectionsHandler.delete('/:id', async c => {
  try {
    const collectionId = c.req.param('id')

    // Get authenticated user
    const user = await getAuthUser(c as any)
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Check if collection exists and belongs to user
    const existing = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ? AND user_id = ?'
    )
      .bind(collectionId, user.id)
      .first()

    if (!existing) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    if (existing.is_default) {
      throw new HTTPException(400, {
        message: 'Cannot delete default collection',
      })
    }

    // Delete collection (cascade will handle collection_members)
    await c.env.DB.prepare('DELETE FROM user_collections WHERE id = ?')
      .bind(collectionId)
      .run()

    return c.json({
      success: true,
      message: 'Collection deleted successfully',
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error deleting collection:', error)
    throw new HTTPException(500, { message: 'Failed to delete collection' })
  }
})

// Add score to collection
userCollectionsHandler.post('/:id/scores', async c => {
  try {
    const collectionId = c.req.param('id')
    const body = await c.req.json()
    const { scoreId } = body

    console.log('Add to collection request:', {
      collectionId,
      body,
      scoreId,
      path: c.req.path,
      url: c.req.url,
    })

    if (!scoreId) {
      throw new HTTPException(400, { message: 'Score ID required' })
    }

    // Get authenticated user
    const user = await getAuthUser(c as any)
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Check if collection exists and belongs to user
    const collection = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ? AND user_id = ?'
    )
      .bind(collectionId, user.id)
      .first()

    if (!collection) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    // Check if score exists and user has access
    const score = await c.env.DB.prepare(
      'SELECT * FROM scores WHERE id = ? AND (visibility = ? OR user_id = ?)'
    )
      .bind(scoreId, 'public', user.id)
      .first()

    if (!score) {
      throw new HTTPException(404, {
        message: 'Score not found or access denied',
      })
    }

    // Check if score already in collection
    const existing = await c.env.DB.prepare(
      'SELECT id FROM collection_members WHERE collection_id = ? AND score_id = ?'
    )
      .bind(collectionId, scoreId)
      .first()

    if (existing) {
      throw new HTTPException(400, { message: 'Score already in collection' })
    }

    // Add to collection_members
    await c.env.DB.prepare(
      'INSERT INTO collection_members (id, collection_id, score_id) VALUES (?, ?, ?)'
    )
      .bind(generateId(), collectionId, scoreId)
      .run()

    // Update score_ids JSON
    const scoreIds = JSON.parse((collection.score_ids as string) || '[]')
    scoreIds.push(scoreId)

    await c.env.DB.prepare(
      'UPDATE user_collections SET score_ids = ? WHERE id = ?'
    )
      .bind(JSON.stringify(scoreIds), collectionId)
      .run()

    // Update score visibility if collection is public
    const visibilityService = new VisibilityService(c.env.DB)
    await visibilityService.updateScoreVisibility(scoreId, user.id)

    return c.json({
      success: true,
      message: 'Score added to collection',
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error adding score to collection:', error)
    throw new HTTPException(500, {
      message: 'Failed to add score to collection',
    })
  }
})

// Remove score from collection
userCollectionsHandler.delete('/:id/scores/:scoreId', async c => {
  try {
    const collectionId = c.req.param('id')
    const scoreId = c.req.param('scoreId')

    // Get authenticated user
    const user = await getAuthUser(c as any)
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Check if collection exists and belongs to user
    const collection = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ? AND user_id = ?'
    )
      .bind(collectionId, user.id)
      .first()

    if (!collection) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    // Remove from collection_members
    await c.env.DB.prepare(
      'DELETE FROM collection_members WHERE collection_id = ? AND score_id = ?'
    )
      .bind(collectionId, scoreId)
      .run()

    // Update score_ids JSON
    const scoreIds = JSON.parse((collection.score_ids as string) || '[]')
    const filtered = scoreIds.filter((id: string) => id !== scoreId)

    await c.env.DB.prepare(
      'UPDATE user_collections SET score_ids = ? WHERE id = ?'
    )
      .bind(JSON.stringify(filtered), collectionId)
      .run()

    // Update score visibility after removal
    const visibilityService = new VisibilityService(c.env.DB)
    await visibilityService.updateScoreVisibility(scoreId, user.id)

    return c.json({
      success: true,
      message: 'Score removed from collection',
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error removing score from collection:', error)
    throw new HTTPException(500, {
      message: 'Failed to remove score from collection',
    })
  }
})

export { userCollectionsHandler }
