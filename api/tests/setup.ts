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
        // Simple mock implementation that generates different hashes for different inputs
        const view = new Uint8Array(data)
        let hash = 0
        for (let i = 0; i < view.length; i++) {
          hash = (hash << 5) - hash + view[i]
          hash = hash & hash // Convert to 32bit integer
        }

        // Create a 32-byte array with values based on the hash
        const result = new ArrayBuffer(32)
        const resultView = new Uint8Array(result)
        for (let i = 0; i < 32; i++) {
          resultView[i] = (hash >>> ((i % 4) * 8)) & 0xff
        }
        return result
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
