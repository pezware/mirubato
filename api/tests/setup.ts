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

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
