import { vi, afterEach, beforeEach } from 'vitest'

// Mock environment variables
vi.stubEnv('ENVIRONMENT', 'test')
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-that-is-long-enough-for-validation')
vi.stubEnv('API_SERVICE_URL', 'https://api.mirubato.com')

// Mock Cloudflare Workers globals
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn(async (algorithm: string, data: ArrayBuffer) => {
        // Simple mock implementation
        const view = new Uint8Array(data)
        let hash = 0
        for (let i = 0; i < view.length; i++) {
          hash = (hash << 5) - hash + view[i]
          hash = hash & hash
        }
        const result = new ArrayBuffer(32)
        const resultView = new Uint8Array(result)
        for (let i = 0; i < 32; i++) {
          resultView[i] = (hash >>> ((i % 4) * 8)) & 0xff
        }
        return result
      }),
    } as unknown as SubtleCrypto,
    // codeql[js/insecure-randomness]: This is test code - cryptographic security not required for test mocks
    getRandomValues: vi.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
    // codeql[js/insecure-randomness]: This is test code - cryptographic security not required for test UUIDs
    randomUUID: () => {
      const hex = '0123456789abcdef'
      let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      uuid = uuid.replace(/[xy]/g, c => {
        const r = Math.floor(Math.random() * 16)
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return hex[v]
      })
      return uuid
    },
  },
  writable: true,
  configurable: true,
})

// Setup fetch mock
global.fetch = vi.fn()

// Add TextEncoder/TextDecoder for Node environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Comprehensive cleanup after each test to prevent memory leaks
afterEach(() => {
  // Clear all mocks and timers
  vi.clearAllMocks()
  vi.clearAllTimers()
  // Note: vi.restoreAllMocks() removed as it breaks module-level mocks
  // vi.clearAllMocks() is sufficient for clearing call history

  // Clear any intervals or timeouts that might be running
  for (let i = 1; i < 99999; i++) {
    clearInterval(i)
    clearTimeout(i)
  }

  // Reset fetch mock
  if (global.fetch && typeof global.fetch === 'function') {
    ;(global.fetch as any).mockReset?.()
  }

  // Force garbage collection if available (requires --expose-gc flag)
  if (global.gc) {
    global.gc()
  }
})
