import type { MutationResolvers } from '../types/generated/graphql'
import { AuthService } from '../services/auth'
import { UserService } from '../services/user'
import { EmailService } from '../services/email'
import { isValidEmail } from '../utils/auth'
import { Instrument, Theme, NotationSize } from '../types/shared'
import {
  serializeCookie,
  getAuthCookieOptions,
  getRefreshCookieOptions,
  createClearCookie,
} from '../utils/cookies'

export const authResolvers: { Mutation: Partial<MutationResolvers> } = {
  Mutation: {
    requestMagicLink: async (_, { email }, context) => {
      if (!isValidEmail(email)) {
        throw new Error('Invalid email address')
      }

      const authService = new AuthService(
        context.env.MIRUBATO_MAGIC_LINKS,
        context.env.JWT_SECRET
      )
      const emailService = new EmailService(context.env)

      // Generate and store magic link
      const magicLink = await authService.createMagicLink(email)

      // Send email
      await emailService.sendMagicLinkEmail(email, magicLink)

      return {
        success: true,
        message: 'Magic link sent to your email',
      }
    },

    verifyMagicLink: async (_, { token }, context) => {
      // Log in development
      if (context.env.ENVIRONMENT === 'development') {
        console.log('\n' + '='.repeat(80))
        console.log('🔑 MAGIC LINK VERIFICATION ATTEMPT')
        console.log('='.repeat(80))
        console.log(`Token: ${token}`)
        console.log(`Time: ${new Date().toISOString()}`)
        console.log('='.repeat(80) + '\n')
      }

      const authService = new AuthService(
        context.env.MIRUBATO_MAGIC_LINKS,
        context.env.JWT_SECRET
      )

      // Verify magic link token
      const email = await authService.verifyMagicLink(token)

      if (!email) {
        if (context.env.ENVIRONMENT === 'development') {
          console.log(
            '❌ Magic link verification failed - token not found or expired'
          )
        }
        throw new Error('Invalid or expired magic link')
      }

      if (context.env.ENVIRONMENT === 'development') {
        console.log(`✅ Magic link verified for email: ${email}`)
      }

      // Try to use D1 database for full authentication
      try {
        const userService = new UserService(context.env.DB)

        // Get or create user
        let user = await userService.getUserByEmail(email)
        if (!user) {
          user = await userService.createUser({ email })
        }

        // Add hasCloudStorage flag
        const userWithCloudStorage = { ...user, hasCloudStorage: true }

        // Generate tokens
        const { accessToken, refreshToken } =
          await authService.generateTokens(userWithCloudStorage)

        // Set cookies in the response context
        const authCookieOptions = getAuthCookieOptions(context.env)
        const refreshCookieOptions = getRefreshCookieOptions(context.env)

        // Store cookies to be set in the response
        context.cookies = [
          serializeCookie('auth-token', accessToken, authCookieOptions),
          serializeCookie('refresh-token', refreshToken, refreshCookieOptions),
        ]

        return {
          success: true,
          user: userWithCloudStorage,
          message: 'Authentication successful',
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes in seconds
        }
      } catch (d1Error) {
        // D1 unavailable - create temporary user

        const tempUser = {
          id: `temp_${email.replace('@', '_')}_${Date.now()}`,
          email,
          displayName: undefined,
          primaryInstrument: Instrument.PIANO,
          preferences: {
            theme: Theme.LIGHT,
            notationSize: NotationSize.MEDIUM,
            practiceReminders: true,
            dailyGoalMinutes: 30,
          },
          stats: {
            totalPracticeTime: 0,
            consecutiveDays: 0,
            piecesCompleted: 0,
            accuracyAverage: 0,
          },
          hasCloudStorage: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Generate tokens for temp user
        const { accessToken, refreshToken } =
          await authService.generateTokens(tempUser)

        // Set cookies for temp user
        const authCookieOptions = getAuthCookieOptions(context.env)
        const refreshCookieOptions = getRefreshCookieOptions(context.env)

        context.cookies = [
          serializeCookie('auth-token', accessToken, authCookieOptions),
          serializeCookie('refresh-token', refreshToken, refreshCookieOptions),
        ]

        return {
          success: true,
          user: tempUser,
          message: 'Authentication successful (temporary user)',
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes in seconds
        }
      }
    },

    refreshToken: async (_, __, context) => {
      // Get refresh token from cookies
      const cookieHeader = context.request.headers.get('Cookie')
      if (!cookieHeader) {
        throw new Error('No refresh token provided')
      }

      // Parse cookies
      const cookies: Record<string, string> = {}
      cookieHeader.split(';').forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=')
        if (name && valueParts.length > 0) {
          cookies[name] = valueParts.join('=')
        }
      })

      const refreshToken = cookies['refresh-token']
      if (!refreshToken) {
        throw new Error('No refresh token provided')
      }

      const authService = new AuthService(
        context.env.MIRUBATO_MAGIC_LINKS,
        context.env.JWT_SECRET
      )

      // Verify refresh token and get payload
      const { sub: userId, user: tempUser } =
        await authService.verifyRefreshToken(refreshToken)

      // Check if this is a temp user
      if (userId.startsWith('temp_') && tempUser) {
        // For temp users, use the embedded user data
        // Generate new tokens
        const tokens = await authService.generateTokens(tempUser)

        // Set new cookies
        const authCookieOptions = getAuthCookieOptions(context.env)
        const refreshCookieOptions = getRefreshCookieOptions(context.env)

        context.cookies = [
          serializeCookie('auth-token', tokens.accessToken, authCookieOptions),
          serializeCookie(
            'refresh-token',
            tokens.refreshToken,
            refreshCookieOptions
          ),
        ]

        return {
          success: true,
          user: tempUser,
          message: 'Token refreshed successfully',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 604800, // 7 days in seconds
        }
      }

      // For regular users, fetch from D1
      try {
        const userService = new UserService(context.env.DB)
        const user = await userService.getUserById(userId)

        if (!user) {
          throw new Error('User not found')
        }

        // Generate new tokens
        const tokens = await authService.generateTokens(user)

        // Set new cookies
        const authCookieOptions = getAuthCookieOptions(context.env)
        const refreshCookieOptions = getRefreshCookieOptions(context.env)

        context.cookies = [
          serializeCookie('auth-token', tokens.accessToken, authCookieOptions),
          serializeCookie(
            'refresh-token',
            tokens.refreshToken,
            refreshCookieOptions
          ),
        ]

        return {
          success: true,
          user,
          message: 'Token refreshed successfully',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 604800, // 7 days in seconds
        }
      } catch (error) {
        throw new Error('Unable to refresh token')
      }
    },

    logout: async (_parent, _args, context) => {
      // Clear cookies by setting them with maxAge 0
      const authCookieOptions = getAuthCookieOptions(context.env)
      const refreshCookieOptions = getRefreshCookieOptions(context.env)

      context.cookies = [
        createClearCookie('auth-token', authCookieOptions),
        createClearCookie('refresh-token', refreshCookieOptions),
      ]

      return {
        success: true,
        message: 'Logged out successfully',
      }
    },
  },
}
