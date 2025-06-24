import { vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import { Miniflare } from 'miniflare'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Mock environment variables
vi.stubEnv('JWT_SECRET', 'test-jwt-secret')
vi.stubEnv('MAGIC_LINK_SECRET', 'test-magic-link-secret')
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-client-id')
vi.stubEnv('ENVIRONMENT', 'test')

// Mock Cloudflare Workers globals
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn(async (algorithm: string, data: ArrayBuffer) => {
        // Create a hash-like value based on the input
        const view = new Uint8Array(data)
        const hashBuffer = new ArrayBuffer(32)
        const hashView = new Uint8Array(hashBuffer)

        // Simple hash simulation - just sum bytes and spread across output
        let sum = 0
        for (let i = 0; i < view.length; i++) {
          sum += view[i]
        }

        for (let i = 0; i < 32; i++) {
          hashView[i] = (sum + i * 7) % 256
        }

        return hashBuffer
      }),
    } as unknown as SubtleCrypto,
    getRandomValues: vi.fn((arr: any) => {
      // Simple mock - fill with pseudo-random values
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
  },
  writable: true,
  configurable: true,
})

// Setup fetch mock
global.fetch = vi.fn()

// Global Miniflare instance for integration tests
let mf: Miniflare | undefined

// Helper to get Miniflare instance
export function getMiniflare(): Miniflare | undefined {
  return mf
}

// Setup Miniflare for integration tests
beforeAll(async () => {
  // Only setup Miniflare for integration tests
  if (process.env.VITEST_INTEGRATION_TEST === 'true') {
    mf = new Miniflare({
      script: '',
      modules: true,
      d1Databases: {
        DB: ':memory:',
      },
      bindings: {
        ENVIRONMENT: 'test',
        JWT_SECRET: 'test-jwt-secret',
        SENDGRID_API_KEY: 'test-sendgrid-key',
        FRONTEND_URL: 'http://localhost:3000',
      },
    })

    // Initialize D1 database
    const db = await mf.getD1Database('DB')

    try {
      // Read and execute migration files
      const migrationFiles = [
        '0001_initial_schema.sql',
        '0002_add_backend_compatibility.sql',
        '0003_add_user_tracking_fields.sql',
      ]

      for (const file of migrationFiles) {
        try {
          const sql = readFileSync(
            join(__dirname, '../migrations', file),
            'utf-8'
          )
          // Split by semicolon and execute each statement
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0)

          for (const statement of statements) {
            await db.prepare(statement).run()
          }
        } catch (e) {
          console.log(`Migration ${file} might already be applied`)
        }
      }
    } catch (error) {
      console.error('Failed to setup test database:', error)
    }
  }
})

// Clean up test data after each test for integration tests
afterEach(async () => {
  if (mf && process.env.VITEST_INTEGRATION_TEST === 'true') {
    const db = await mf.getD1Database('DB')
    try {
      // Clean up test data but keep schema and test user
      await db.prepare('DELETE FROM sync_data').run()
      await db.prepare('DELETE FROM sync_metadata').run()

      // Create test user for integration tests
      await db
        .prepare(
          `
        INSERT OR REPLACE INTO users (id, email, display_name, auth_provider)
        VALUES ('test-user-123', 'test@example.com', 'Test User', 'magic_link')
      `
        )
        .run()
    } catch (error) {
      // Ignore errors in cleanup
    }
  }
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Cleanup Miniflare after all tests
afterAll(async () => {
  if (mf) {
    await mf.dispose()
  }
})
