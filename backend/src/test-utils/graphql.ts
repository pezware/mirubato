import { ApolloServer } from '@apollo/server'
import type { GraphQLContext } from '../types/context'
import { createMockDB } from './db'
import { nanoid } from 'nanoid'

export function createMockContext(
  overrides?: Partial<GraphQLContext>
): GraphQLContext {
  const defaultEnv = {
    DB: createMockDB(),
    MIRUBATO_MAGIC_LINKS: createMockKV(),
    RATE_LIMITER: {} as any,
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'development' as const,
  }

  const env = {
    ...defaultEnv,
    ...(overrides?.env || {}),
  }

  return {
    env,
    requestId: nanoid(),
    db: env.DB,
    ...overrides,
  }
}

export function createMockKV(): any {
  const store = new Map<string, string>()

  return {
    async get(key: string) {
      return store.get(key) || null
    },
    async put(key: string, value: string, _options?: any) {
      store.set(key, value)
    },
    async delete(key: string) {
      store.delete(key)
    },
    async list(_options?: any) {
      return {
        keys: Array.from(store.keys()).map(name => ({ name })),
      }
    },
  }
}

export async function executeGraphQLQuery(
  server: ApolloServer<GraphQLContext>,
  query: string,
  variables?: any,
  context?: Partial<GraphQLContext>
) {
  const result = await server.executeOperation(
    {
      query,
      variables,
    },
    {
      contextValue: createMockContext(context),
    }
  )

  return result
}

export const mockUser = {
  id: 'user_123',
  email: 'test@example.com',
  displayName: 'Test User',
  primaryInstrument: 'PIANO' as const,
  preferences: {
    theme: 'LIGHT' as const,
    notationSize: 'MEDIUM' as const,
    practiceReminders: true,
    dailyGoalMinutes: 30,
  },
  stats: {
    totalPracticeTime: 0,
    consecutiveDays: 0,
    piecesCompleted: 0,
    accuracyAverage: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
