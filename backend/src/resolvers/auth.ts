import type { MutationResolvers } from '../types/generated/graphql'
import { AuthService } from '../services/auth'
import { UserService } from '../services/user'
import { EmailService } from '../services/email'
import { isValidEmail } from '../utils/auth'
import { Instrument, Theme, NotationSize } from '../types/shared'

export const authResolvers: { Mutation: MutationResolvers } = {
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
      const authService = new AuthService(
        context.env.MIRUBATO_MAGIC_LINKS,
        context.env.JWT_SECRET
      )

      // Verify magic link token
      const email = await authService.verifyMagicLink(token)

      if (!email) {
        throw new Error('Invalid or expired magic link')
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

        return {
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes
          user: userWithCloudStorage,
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

        return {
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes
          user: tempUser,
        }
      }
    },

    refreshToken: async (_, { refreshToken }, context) => {
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

        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 900,
          user: tempUser,
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

        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 900,
          user,
        }
      } catch (error) {
        throw new Error('Unable to refresh token')
      }
    },

    logout: async (_parent, _args, _context) => {
      // In a stateless JWT system, logout is handled client-side
      // We could implement token blacklisting here if needed
      return {
        success: true,
        message: 'Logged out successfully',
      }
    },
  },
}
