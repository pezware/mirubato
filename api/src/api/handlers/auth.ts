import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
// We'll verify Google tokens manually to avoid dependency issues
import type { Env } from '../../index'
import {
  authMiddleware,
  rateLimitMiddleware,
  validateBody,
  type Variables,
} from '../middleware'
import { AuthService } from '../../services/auth'
import { EmailService } from '../../services/email'
import { DatabaseHelpers } from '../../utils/database'
import { schemas } from '../../utils/validation'
import {
  AuthenticationError,
  NotFoundError,
  InternalError,
} from '@mirubato/workers-utils'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyMagicLinkToken,
  verifyToken,
} from '../../utils/auth'

export const authHandler = new Hono<{ Bindings: Env; Variables: Variables }>()

/**
 * Request magic link
 * POST /api/auth/request-magic-link
 */
authHandler.post(
  '/request-magic-link',
  rateLimitMiddleware,
  validateBody(schemas.requestMagicLink),
  async c => {
    const { email } = c.get('validatedBody') as { email: string }
    const authService = new AuthService(c.env)
    const emailService = new EmailService(c.env)

    try {
      // Generate magic link
      const token = await authService.generateMagicLink(email)
      const magicLink = `${c.req.header('origin') || 'https://mirubato.com'}/auth/verify?token=${token}`

      // Send email
      try {
        await emailService.sendMagicLink(email, magicLink)
      } catch (emailError) {
        // In staging, if email fails, still return success but log the link
        if (c.env.ENVIRONMENT === 'staging') {
          console.warn('Email send failed in staging, magic link:', magicLink)
          return c.json({
            success: true,
            message: 'Magic link sent to your email (check logs in staging)',
            debugLink: magicLink, // Only for staging
          })
        }
        throw emailError
      }

      return c.json({
        success: true,
        message: 'Magic link sent to your email',
      })
    } catch (error) {
      console.error('Error sending magic link:', error)
      throw new InternalError('Failed to send magic link')
    }
  }
)

/**
 * Verify magic link
 * POST /api/auth/verify-magic-link
 */
authHandler.post(
  '/verify-magic-link',
  validateBody(schemas.verifyMagicLink),
  async c => {
    const { token } = c.get('validatedBody') as { token: string }
    const db = new DatabaseHelpers(c.env.DB)

    try {
      // Verify token
      const { email } = await verifyMagicLinkToken(
        token,
        c.env.MAGIC_LINK_SECRET
      )

      // Create or update user
      const userId = await db.upsertUser({
        email,
        authProvider: 'magic_link',
        displayName: null,
        googleId: null,
      })

      // Get user details
      const user = await db.findUserById(userId)
      if (!user) {
        throw new NotFoundError('User not found')
      }

      // Generate tokens
      const accessToken = await generateAccessToken(
        userId,
        email.toLowerCase().trim(),
        c.env.JWT_SECRET
      )
      const refreshToken = await generateRefreshToken(userId, c.env.JWT_SECRET)

      // Set cookies
      setCookie(c, 'auth-token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      setCookie(c, 'refresh-token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      return c.json({
        success: true,
        user: {
          id: user.id as string,
          email: user.email as string,
          displayName: user.display_name as string,
          authProvider: user.auth_provider as string,
          role: user.role || 'user',
          createdAt: user.created_at as string,
        },
        accessToken,
        refreshToken,
        expiresIn: 2592000, // 30 days in seconds
      })
    } catch (error: unknown) {
      console.error('Error verifying magic link:', error)

      // Handle specific error cases
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (errorMessage?.includes('JWT expired')) {
        throw new AuthenticationError('Token has expired')
      } else if (errorMessage?.includes('invalid signature')) {
        throw new AuthenticationError('Invalid or expired token')
      } else if (errorMessage?.includes('D1_TYPE_ERROR')) {
        // This shouldn't happen anymore, but log it clearly
        console.error('Database type error:', error)
        throw new InternalError('Database error')
      }

      throw new AuthenticationError('Invalid or expired token')
    }
  }
)

/**
 * Google OAuth login
 * POST /api/auth/google
 */
authHandler.post(
  '/google',
  rateLimitMiddleware,
  validateBody(schemas.googleAuth),
  async c => {
    const { credential } = c.get('validatedBody') as { credential: string }
    const db = new DatabaseHelpers(c.env.DB)

    try {
      // Verify Google token by calling Google's tokeninfo endpoint
      const tokenInfoResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
      )

      if (!tokenInfoResponse.ok) {
        throw new AuthenticationError('Invalid credentials')
      }

      const tokenInfo = (await tokenInfoResponse.json()) as {
        aud: string
        exp: string
        email: string
        name?: string
        sub: string
      }

      // Verify the token is for our app
      if (tokenInfo.aud !== c.env.GOOGLE_CLIENT_ID) {
        throw new AuthenticationError('Invalid credentials')
      }

      // Verify the token is not expired
      if (tokenInfo.exp && parseInt(tokenInfo.exp) < Date.now() / 1000) {
        throw new AuthenticationError('Invalid credentials')
      }

      const { email, name, sub: googleId } = tokenInfo

      // Create or update user
      const userId = await db.upsertUser({
        email: email!,
        displayName: name,
        authProvider: 'google',
        googleId,
      })

      // Get user details
      const user = await db.findUserById(userId)
      if (!user) {
        throw new NotFoundError('User not found')
      }

      // Generate tokens
      const accessToken = await generateAccessToken(
        userId,
        email!.toLowerCase().trim(),
        c.env.JWT_SECRET
      )
      const refreshToken = await generateRefreshToken(userId, c.env.JWT_SECRET)

      // Set cookies
      setCookie(c, 'auth-token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      setCookie(c, 'refresh-token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      return c.json({
        success: true,
        user: {
          id: user.id as string,
          email: user.email as string,
          displayName: user.display_name as string,
          authProvider: user.auth_provider as string,
          role: user.role || 'user',
          createdAt: user.created_at as string,
        },
        accessToken,
        refreshToken,
        expiresIn: 2592000, // 30 days in seconds
      })
    } catch (error) {
      console.error('Error with Google auth:', error)
      throw new AuthenticationError('Invalid credentials')
    }
  }
)

/**
 * Refresh token
 * POST /api/auth/refresh
 */
authHandler.post('/refresh', async c => {
  const refreshToken = getCookie(c, 'refresh-token')

  if (!refreshToken) {
    throw new AuthenticationError('Invalid or expired token')
  }

  try {
    // Verify refresh token
    const payload = await verifyToken(refreshToken, c.env.JWT_SECRET)
    const userId = payload.sub as string

    // Get user
    const db = new DatabaseHelpers(c.env.DB)
    const user = await db.findUserById(userId)

    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Generate new access token
    const accessToken = await generateAccessToken(
      userId,
      user.email as string,
      c.env.JWT_SECRET
    )

    // Set new cookie
    setCookie(c, 'auth-token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return c.json({
      accessToken,
      expiresIn: 604800, // 7 days in seconds
    })
  } catch {
    throw new AuthenticationError('Invalid or expired token')
  }
})

/**
 * Logout
 * POST /api/auth/logout
 */
authHandler.post('/logout', authMiddleware, async c => {
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
    message: 'Logged out successfully',
  })
})

// Import getCookie for refresh endpoint
import { getCookie } from 'hono/cookie'
