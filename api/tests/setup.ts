import { vi } from 'vitest'

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
        // Simple mock implementation
        return new ArrayBuffer(32)
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

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
