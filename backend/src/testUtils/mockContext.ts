import type { GraphQLContext, Env } from '../types/context'
import type { D1Database } from '@cloudflare/workers-types'

interface MockContextOptions {
  user?: GraphQLContext['user']
  db?: D1Database
  env?: Partial<Env>
  requestId?: string
  ip?: string
  request?: Request
}

export function createMockContext(
  options: MockContextOptions = {}
): GraphQLContext {
  const defaultEnv: Env = {
    DB: options.db || createMockDatabase(),
    JWT_SECRET: 'test-jwt-secret',
    RESEND_API_KEY: 'test-resend-key',
    ENVIRONMENT: 'test',
    RATE_LIMITER: undefined,
    CF_VERSION_METADATA: { id: 'test-version' },
  }

  return {
    env: { ...defaultEnv, ...options.env },
    user: options.user || null,
    requestId: options.requestId || 'test-request-123',
    ip: options.ip || '127.0.0.1',
    db: options.db || createMockDatabase(),
    request: options.request || new Request('http://localhost:8787/graphql'),
  }
}

export function createMockDatabase(): D1Database {
  const mockResults = new Map<string, any>()

  return {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        first: async () => mockResults.get(`${query}:first`) || null,
        all: async () => ({
          results: mockResults.get(`${query}:all`) || [],
          meta: { duration: 1, rows_read: 0, rows_written: 0 },
        }),
        run: async () => ({
          success: true,
          meta: { duration: 1, rows_read: 0, rows_written: 0 },
        }),
        raw: async () => [],
      }),
    }),
    batch: async (statements: any[]) =>
      statements.map(() => ({
        success: true,
        meta: { duration: 1, rows_read: 0, rows_written: 0 },
      })),
    exec: async (query: string) => ({
      count: 1,
      duration: 1,
    }),
    dump: async () => new ArrayBuffer(0),
  } as D1Database
}

export function createMockUser(overrides: any = {}) {
  return {
    id: 'test-user-123',
    email: 'test@example.com',
    hasCloudStorage: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    ...overrides,
  }
}
