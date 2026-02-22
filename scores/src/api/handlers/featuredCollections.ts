import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { getAuthUser, isAdmin } from '../../utils/auth-enhanced'

const featuredCollectionsHandler = new Hono<{ Bindings: Env }>()

// Schema for featuring a collection
const FeatureCollectionSchema = z.object({
  collectionId: z.string().min(1),
  displayOrder: z.number().int().min(0).optional(),
})

// Get all featured collections (public endpoint)
featuredCollectionsHandler.get('/', async c => {
  try {
    // Featured collections are public, no auth required
    const collections = await c.env.DB.prepare(
      `SELECT 
        uc.*,
        COUNT(DISTINCT cm.score_id) as score_count,
        u.display_name as owner_name
       FROM user_collections uc
       LEFT JOIN collection_members cm ON uc.id = cm.collection_id
       LEFT JOIN users u ON uc.featured_by = u.id
       WHERE uc.featured_at IS NOT NULL
       GROUP BY uc.id
       ORDER BY uc.display_order ASC, uc.featured_at DESC`
    ).all()

    // Format results
    const formattedCollections = await Promise.all(
      collections.results.map(async col => {
        // Get a sample of scores for preview
        const sampleScores = await c.env.DB.prepare(
          `SELECT s.* FROM scores s
           JOIN collection_members cm ON s.id = cm.score_id
           WHERE cm.collection_id = ?
           LIMIT 3`
        )
          .bind(col.id)
          .all()

        return {
          id: col.id,
          name: col.name,
          description: col.description,
          slug: col.slug,
          scoreCount: col.score_count,
          tags: JSON.parse((col.tags as string) || '[]'),
          featuredAt: new Date(col.featured_at as string),
          featuredBy: col.owner_name,
          displayOrder: col.display_order,
          sampleScores: sampleScores.results.map(score => ({
            id: score.id,
            title: score.title,
            composer: score.composer,
            instrument: score.instrument,
            difficulty: score.difficulty,
          })),
        }
      })
    )

    return c.json({
      success: true,
      data: formattedCollections,
    })
  } catch (error) {
    console.error('Error fetching featured collections:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch featured collections',
    })
  }
})

// Feature a collection (admin only)
featuredCollectionsHandler.post('/feature', async c => {
  try {
    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Parameters<typeof getAuthUser>[0]
    )
    if (!user || !isAdmin(user)) {
      throw new HTTPException(403, { message: 'Admin access required' })
    }

    // Parse and validate request
    const body = await c.req.json()
    const validatedData = FeatureCollectionSchema.parse(body)

    // Check if collection exists
    const collection = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ?'
    )
      .bind(validatedData.collectionId)
      .first()

    if (!collection) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    if (collection.featured_at) {
      throw new HTTPException(400, {
        message: 'Collection is already featured',
      })
    }

    // Feature the collection
    await c.env.DB.prepare(
      `UPDATE user_collections 
       SET featured_at = CURRENT_TIMESTAMP,
           featured_by = ?,
           visibility = 'public',
           display_order = ?
       WHERE id = ?`
    )
      .bind(
        user.id,
        validatedData.displayOrder ?? 999,
        validatedData.collectionId
      )
      .run()

    // Update all scores in the collection to public
    await c.env.DB.prepare(
      `UPDATE scores 
       SET derived_visibility = 'public'
       WHERE id IN (
         SELECT score_id FROM collection_members WHERE collection_id = ?
       )`
    )
      .bind(validatedData.collectionId)
      .run()

    return c.json({
      success: true,
      message: 'Collection featured successfully',
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
    console.error('Error featuring collection:', error)
    throw new HTTPException(500, { message: 'Failed to feature collection' })
  }
})

// Unfeature a collection (admin only)
featuredCollectionsHandler.delete('/feature/:id', async c => {
  try {
    const collectionId = c.req.param('id')

    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Parameters<typeof getAuthUser>[0]
    )
    if (!user || !isAdmin(user)) {
      throw new HTTPException(403, { message: 'Admin access required' })
    }

    // Check if collection exists and is featured
    const collection = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ? AND featured_at IS NOT NULL'
    )
      .bind(collectionId)
      .first()

    if (!collection) {
      throw new HTTPException(404, { message: 'Featured collection not found' })
    }

    // Unfeature the collection
    await c.env.DB.prepare(
      `UPDATE user_collections 
       SET featured_at = NULL,
           featured_by = NULL
       WHERE id = ?`
    )
      .bind(collectionId)
      .run()

    // Note: We don't automatically make scores private again
    // as they might be in other public collections

    return c.json({
      success: true,
      message: 'Collection unfeatured successfully',
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error unfeaturing collection:', error)
    throw new HTTPException(500, { message: 'Failed to unfeature collection' })
  }
})

// Update featured collection order (admin only)
featuredCollectionsHandler.put('/order', async c => {
  try {
    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Parameters<typeof getAuthUser>[0]
    )
    if (!user || !isAdmin(user)) {
      throw new HTTPException(403, { message: 'Admin access required' })
    }

    // Expect array of { id, displayOrder }
    const body = await c.req.json()
    const updates = z
      .array(
        z.object({
          id: z.string(),
          displayOrder: z.number().int().min(0),
        })
      )
      .parse(body)

    // Update each collection's display order
    const batch = updates.map(update =>
      c.env.DB.prepare(
        'UPDATE user_collections SET display_order = ? WHERE id = ? AND featured_at IS NOT NULL'
      ).bind(update.displayOrder, update.id)
    )

    await c.env.DB.batch(batch)

    return c.json({
      success: true,
      message: 'Collection order updated successfully',
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
    console.error('Error updating collection order:', error)
    throw new HTTPException(500, {
      message: 'Failed to update collection order',
    })
  }
})

export { featuredCollectionsHandler }
