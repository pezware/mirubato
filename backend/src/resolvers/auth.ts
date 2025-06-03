import type { MutationResolvers } from '../types/generated/graphql'
import { AuthService } from '../services/auth'
import { UserService } from '../services/user'
import { EmailService } from '../services/email'
import { isValidEmail } from '../utils/auth'

export const authResolvers: { Mutation: MutationResolvers } = {
  Mutation: {
    requestMagicLink: async (_, { email }, context) => {
      console.log('requestMagicLink called with:', email)

      if (!isValidEmail(email)) {
        throw new Error('Invalid email address')
      }

      try {
        console.log('Context env:', {
          hasMagicLinksKV: !!context.env.MIRUBATO_MAGIC_LINKS,
          hasJwtSecret: !!context.env.JWT_SECRET,
          environment: context.env.ENVIRONMENT,
        })

        const authService = new AuthService(
          context.env.MIRUBATO_MAGIC_LINKS,
          context.env.JWT_SECRET
        )
        const emailService = new EmailService(context.env)

        // Generate and store magic link
        const magicLink = await authService.createMagicLink(email)
        console.log('Magic link created:', magicLink)

        // Send email
        await emailService.sendMagicLinkEmail(email, magicLink)

        return {
          success: true,
          message: 'Magic link sent to your email',
        }
      } catch (error) {
        console.error('requestMagicLink error:', error)
        throw error
      }
    },

    verifyMagicLink: async (_, { token }, context) => {
      console.log(
        'verifyMagicLink called with token:',
        token?.slice(0, 8) + '...'
      )

      try {
        const authService = new AuthService(
          context.env.MIRUBATO_MAGIC_LINKS,
          context.env.JWT_SECRET
        )
        const userService = new UserService(context.env.DB)

        // Verify magic link token
        console.log('Verifying magic link token...')
        const email = await authService.verifyMagicLink(token)
        console.log(
          'Magic link verification result:',
          email ? 'success' : 'failed'
        )

        if (!email) {
          throw new Error('Invalid or expired magic link')
        }

        // Get or create user
        console.log('Getting or creating user for email:', email)
        let user = await userService.getUserByEmail(email)
        if (!user) {
          console.log('Creating new user')
          user = await userService.createUser({ email })
        } else {
          console.log('Found existing user:', user.id)
        }

        // Generate tokens
        console.log('Generating tokens for user:', user.id)
        const { accessToken, refreshToken } =
          await authService.generateTokens(user)

        console.log('verifyMagicLink completed successfully')
        return {
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes
          user,
        }
      } catch (error) {
        console.error('verifyMagicLink error:', error)
        throw error
      }
    },

    refreshToken: async (_, { refreshToken }, context) => {
      const authService = new AuthService(
        context.env.MIRUBATO_MAGIC_LINKS,
        context.env.JWT_SECRET
      )
      const userService = new UserService(context.env.DB)

      // Verify refresh token
      const userId = await authService.verifyRefreshToken(refreshToken)
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
