import { userResolvers } from './user'
import { authResolvers } from './auth'
import { sheetMusicResolvers } from './sheetMusic'
import { practiceResolvers } from './practice'
import { logbookResolvers } from './logbook'
import { scalarResolvers } from './scalars'
import type { Resolvers } from '../types/generated/graphql'

export const resolvers: Resolvers = {
  ...scalarResolvers,
  Query: {
    ...userResolvers.Query,
    ...sheetMusicResolvers.Query,
    ...practiceResolvers.Query,
    ...logbookResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...practiceResolvers.Mutation,
    ...logbookResolvers.Mutation,
  },
  User: userResolvers.User,
  SheetMusic: sheetMusicResolvers.SheetMusic,
  PracticeSession: practiceResolvers.PracticeSession,
  LogbookEntry: logbookResolvers.LogbookEntry,
  Goal: logbookResolvers.Goal,
}
