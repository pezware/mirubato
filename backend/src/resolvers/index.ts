import { userResolvers } from './user'
import { authResolvers } from './auth'
import { sheetMusicResolvers } from './sheetMusic'
import { practiceResolvers } from './practice'
import { scalarResolvers } from './scalars'
import type { Resolvers } from '../types/generated/graphql'

export const resolvers: Resolvers = {
  ...scalarResolvers,
  Query: {
    ...userResolvers.Query,
    ...sheetMusicResolvers.Query,
    ...practiceResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...practiceResolvers.Mutation,
  },
  User: userResolvers.User,
  SheetMusic: sheetMusicResolvers.SheetMusic,
  PracticeSession: practiceResolvers.PracticeSession,
}
