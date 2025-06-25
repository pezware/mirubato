import { Hono } from 'hono'
import type { Env } from '../../index'
import { authMiddleware, validateBody, type Variables } from '../middleware'
import { DatabaseHelpers } from '../../utils/database'
import { schemas } from '../../utils/validation'
import { Errors } from '../../utils/errors'

export const userHandler = new Hono<{ Bindings: Env; Variables: Variables }>()

// All user endpoints require authentication
userHandler.use('/*', authMiddleware)

/**
 * Get current user
 * GET /api/user/me
 */
userHandler.get('/me', async c => {
  const userId = c.get('userId') as string
  const db = new DatabaseHelpers(c.env.DB)

  try {
    const user = await db.findUserById(userId)

    if (!user) {
      throw Errors.UserNotFound()
    }

    return c.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      authProvider: user.auth_provider,
      createdAt: user.created_at,
    })
  } catch (error) {
    console.error('Error getting user:', error)
    throw error
  }
})

/**
 * Update user preferences
 * PUT /api/user/preferences
 */
userHandler.put(
  '/preferences',
  validateBody(schemas.userPreferences),
  async c => {
    const userId = c.get('userId') as string
    const preferences = c.get('validatedBody') as Record<string, unknown>
    const db = new DatabaseHelpers(c.env.DB)

    try {
      // Store preferences in sync_data as a special entity
      await db.upsertSyncData({
        userId,
        entityType: 'user_preferences',
        entityId: userId,
        data: preferences,
        checksum: await calculateChecksum(preferences),
      })

      return c.json({
        success: true,
        preferences,
      })
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw Errors.InternalError('Failed to update preferences')
    }
  }
)

/**
 * Delete user account
 * DELETE /api/user/me
 */
userHandler.delete('/me', async c => {
  const userId = c.get('userId') as string
  const db = new DatabaseHelpers(c.env.DB)

  try {
    // Delete all user data
    await db.deleteUser(userId)

    // Clear cookies
    setCookie(c, 'auth-token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 0,
      path: '/',
    })

    setCookie(c, 'refresh-token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 0,
      path: '/',
    })

    return c.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    throw Errors.InternalError('Failed to delete account')
  }
})

// Import necessary functions
import { setCookie } from 'hono/cookie'
import { calculateChecksum } from '../../utils/database'
