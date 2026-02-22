import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { getAuthUser, isTeacher } from '../../utils/auth-enhanced'

const sharedCollectionsHandler = new Hono<{ Bindings: Env }>()

// Schema for sharing a collection
const ShareCollectionSchema = z.object({
  userIds: z.array(z.string()).min(1),
  message: z.string().optional(),
})

// Get collections shared with the current user
sharedCollectionsHandler.get('/with-me', async c => {
  try {
    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Parameters<typeof getAuthUser>[0]
    )
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    // Find collections where user is in shared_with array
    // Note: SQLite doesn't have native JSON array operations, so we use LIKE
    const collections = await c.env.DB.prepare(
      `SELECT 
        uc.*,
        u.display_name as owner_name,
        u.email as owner_email,
        COUNT(DISTINCT cm.score_id) as score_count
       FROM user_collections uc
       JOIN users u ON uc.user_id = u.id
       LEFT JOIN collection_members cm ON uc.id = cm.collection_id
       WHERE uc.shared_with LIKE ?
       GROUP BY uc.id
       ORDER BY uc.updated_at DESC`
    )
      .bind(`%"${user.id}"%`)
      .all()

    // Format results
    const formattedCollections = collections.results.map(col => ({
      id: col.id,
      name: col.name,
      description: col.description,
      slug: col.slug,
      owner: {
        id: col.user_id,
        name: col.owner_name,
        email: col.owner_email,
      },
      scoreCount: col.score_count,
      tags: JSON.parse((col.tags as string) || '[]'),
      sharedAt: new Date(col.updated_at as string), // Approximation
    }))

    return c.json({
      success: true,
      data: formattedCollections,
    })
  } catch (error) {
    console.error('Error fetching shared collections:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch shared collections',
    })
  }
})

// Share a collection with other users (teacher/admin only)
sharedCollectionsHandler.post('/:id/share', async c => {
  try {
    const collectionId = c.req.param('id')

    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Parameters<typeof getAuthUser>[0]
    )
    if (!user || !isTeacher(user)) {
      throw new HTTPException(403, {
        message: 'Teacher or admin access required',
      })
    }

    // Parse and validate request
    const body = await c.req.json()
    const validatedData = ShareCollectionSchema.parse(body)

    // Check if collection exists and belongs to user
    const collection = await c.env.DB.prepare(
      'SELECT * FROM user_collections WHERE id = ? AND user_id = ?'
    )
      .bind(collectionId, user.id)
      .first()

    if (!collection) {
      throw new HTTPException(404, { message: 'Collection not found' })
    }

    // Get current shared_with array
    const currentShared = JSON.parse((collection.shared_with as string) || '[]')

    // Add new user IDs (avoiding duplicates)
    const newShared = Array.from(
      new Set([...currentShared, ...validatedData.userIds])
    )

    // Update collection
    await c.env.DB.prepare(
      'UPDATE user_collections SET shared_with = ? WHERE id = ?'
    )
      .bind(JSON.stringify(newShared), collectionId)
      .run()

    // TODO(#680): Send notification emails to shared users if message provided

    return c.json({
      success: true,
      message: `Collection shared with ${validatedData.userIds.length} users`,
      data: {
        sharedWith: newShared,
      },
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
    console.error('Error sharing collection:', error)
    throw new HTTPException(500, { message: 'Failed to share collection' })
  }
})

// Unshare a collection with specific users
sharedCollectionsHandler.delete('/:id/share', async c => {
  try {
    const collectionId = c.req.param('id')
    const { userIds } = await c.req.json()

    if (!userIds || !Array.isArray(userIds)) {
      throw new HTTPException(400, { message: 'User IDs array required' })
    }

    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Parameters<typeof getAuthUser>[0]
    )
    if (!user || !isTeacher(user)) {
      throw new HTTPException(403, {
        message: 'Teacher or admin access required',
      })
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

    // Get current shared_with array
    const currentShared = JSON.parse((collection.shared_with as string) || '[]')

    // Remove specified user IDs
    const newShared = currentShared.filter(
      (id: string) => !userIds.includes(id)
    )

    // Update collection
    await c.env.DB.prepare(
      'UPDATE user_collections SET shared_with = ? WHERE id = ?'
    )
      .bind(JSON.stringify(newShared), collectionId)
      .run()

    return c.json({
      success: true,
      message: `Collection unshared with ${userIds.length} users`,
      data: {
        sharedWith: newShared,
      },
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error unsharing collection:', error)
    throw new HTTPException(500, { message: 'Failed to unshare collection' })
  }
})

// Get all collections I've shared (teacher view)
sharedCollectionsHandler.get('/by-me', async c => {
  try {
    // Get authenticated user
    const user = await getAuthUser(
      c as unknown as Parameters<typeof getAuthUser>[0]
    )
    if (!user || !isTeacher(user)) {
      throw new HTTPException(403, {
        message: 'Teacher or admin access required',
      })
    }

    // Get collections with non-empty shared_with
    const collections = await c.env.DB.prepare(
      `SELECT 
        *,
        (SELECT COUNT(*) FROM collection_members WHERE collection_id = uc.id) as score_count
       FROM user_collections uc
       WHERE user_id = ? AND shared_with != '[]'
       ORDER BY updated_at DESC`
    )
      .bind(user.id)
      .all()

    // Format results with share information
    const formattedCollections = await Promise.all(
      collections.results.map(async col => {
        const sharedWith = JSON.parse((col.shared_with as string) || '[]')

        // Get user details for shared users
        if (sharedWith.length > 0) {
          const placeholders = sharedWith.map(() => '?').join(',')
          const sharedUsers = await c.env.DB.prepare(
            `SELECT id, email, display_name FROM users WHERE id IN (${placeholders})`
          )
            .bind(...sharedWith)
            .all()

          return {
            id: col.id,
            name: col.name,
            description: col.description,
            slug: col.slug,
            scoreCount: col.score_count,
            tags: JSON.parse((col.tags as string) || '[]'),
            sharedWith: sharedUsers.results.map(u => ({
              id: u.id,
              email: u.email,
              displayName: u.display_name,
            })),
            updatedAt: new Date(col.updated_at as string),
          }
        }

        return {
          id: col.id,
          name: col.name,
          description: col.description,
          slug: col.slug,
          scoreCount: col.score_count,
          tags: JSON.parse((col.tags as string) || '[]'),
          sharedWith: [],
          updatedAt: new Date(col.updated_at as string),
        }
      })
    )

    return c.json({
      success: true,
      data: formattedCollections,
    })
  } catch (error) {
    console.error('Error fetching shared collections:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch shared collections',
    })
  }
})

export { sharedCollectionsHandler }
