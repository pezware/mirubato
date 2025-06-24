import { beforeAll, afterEach, vi } from 'vitest'
import { webcrypto } from 'crypto'

// Polyfill crypto for test environment
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any
}

// Mock console methods to reduce noise in tests
beforeAll(() => {
  ;(global as any).console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
})

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Mock environment variables for tests
process.env.ENVIRONMENT = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.RESEND_API_KEY = 'test-resend-key'
