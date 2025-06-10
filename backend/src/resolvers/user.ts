import type {
  QueryResolvers,
  MutationResolvers,
  UserResolvers,
} from '../types/generated/graphql'
import { UserService } from '../services/user'

const Query: Partial<QueryResolvers> = {
  me: async (_parent, _args, context) => {
    if (!context.user) {
      return null
    }

    const userService = new UserService(context.env.DB)
    const user = await userService.getUserById(context.user.id)
    return user as any // Cast to GraphQL User type
  },

  user: async (_parent, { id }, context) => {
    const userService = new UserService(context.env.DB)
    const user = await userService.getUserById(id)
    return user as any // Cast to GraphQL User type
  },
}

const Mutation: Partial<MutationResolvers> = {
  updateUser: async (_parent, { input }, context) => {
    if (!context.user) {
      throw new Error('Authentication required')
    }

    const userService = new UserService(context.env.DB)
    const user = await userService.updateUser(context.user.id, input)
    return user as any // Cast to GraphQL User type
  },

  deleteAccount: async (_parent, _args, context) => {
    if (!context.user) {
      throw new Error('Authentication required')
    }

    const userService = new UserService(context.env.DB)
    await userService.deleteUser(context.user.id)

    return {
      success: true,
      message: 'Account deleted successfully',
    }
  },
}

const User: UserResolvers = {
  primaryInstrument: parent => {
    // Ensure primaryInstrument is always returned as uppercase enum value
    return (parent.primaryInstrument?.toUpperCase() || 'PIANO') as
      | 'GUITAR'
      | 'PIANO'
  },

  preferences: async (parent, _args, _context) => {
    // Preferences are stored as JSON in the database
    return (
      parent.preferences || {
        theme: 'LIGHT',
        notationSize: 'MEDIUM',
        practiceReminders: true,
        dailyGoalMinutes: 30,
      }
    )
  },

  stats: async (parent, _args, context) => {
    const userService = new UserService(context.env.DB)
    return userService.getUserStats(parent.id)
  },
}

export const userResolvers = {
  Query,
  Mutation,
  User,
}
