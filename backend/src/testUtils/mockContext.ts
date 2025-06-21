import type { GraphQLContext, Env } from '../types/context'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types'

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
    MIRUBATO_MAGIC_LINKS: createMockKVNamespace(),
    JWT_SECRET: 'test-jwt-secret',
    RESEND_API_KEY: 'test-resend-key',
    ENVIRONMENT: 'development' as const,
    RATE_LIMITER: undefined,
    CF_VERSION_METADATA: { id: 'test-version' },
  }

  return {
    env: { ...defaultEnv, ...options.env },
    user: options.user || undefined,
    requestId: options.requestId || 'test-request-123',
    ip: options.ip || '127.0.0.1',
    db: options.db || createMockDatabase(),
    request: options.request || new Request('http://localhost:8787/graphql'),
  }
}

export function createMockDatabase(): D1Database {
  const mockResults = new Map<string, any>()

  const createPreparedStatement = (query: string) => {
    const statement = {
      bind: (..._params: any[]) => statement,
      first: async () => mockResults.get(`${query}:first`) || null,
      all: async () => ({
        success: true,
        results: mockResults.get(`${query}:all`) || [],
        meta: {
          duration: 1,
          rows_read: 0,
          rows_written: 0,
          size_after: 0,
          last_row_id: 0,
          changed_db: false,
          changes: 0,
        },
      }),
      run: async () => ({
        success: true,
        results: [],
        meta: {
          duration: 1,
          rows_read: 0,
          rows_written: 0,
          size_after: 0,
          last_row_id: 0,
          changed_db: false,
          changes: 0,
        },
      }),
      raw: async () => [[], []] as [string[], ...any[]],
    }
    return statement
  }

  return {
    prepare: createPreparedStatement,
    batch: async (statements: any[]) =>
      statements.map(() => ({
        success: true,
        results: [],
        meta: {
          duration: 1,
          rows_read: 0,
          rows_written: 0,
          size_after: 0,
          last_row_id: 0,
          changed_db: false,
          changes: 0,
        },
      })),
    exec: async (_query: string) => ({
      count: 1,
      duration: 1,
    }),
    dump: async () => new ArrayBuffer(0),
    withSession: () => createMockDatabase(),
  } as unknown as D1Database
}

export function createMockKVNamespace(): KVNamespace {
  const store = new Map<string, string>()

  return {
    get: async (key: string) => store.get(key) || null,
    put: async (key: string, value: string) => {
      store.set(key, value)
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    list: async () => ({
      keys: Array.from(store.keys()).map(name => ({ name })),
      complete: true,
      cursor: undefined,
    }),
  } as unknown as KVNamespace
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
