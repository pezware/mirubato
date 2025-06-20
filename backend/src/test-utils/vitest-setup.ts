import { beforeAll, afterEach, vi } from 'vitest'

// Mock nanoid globally
vi.mock('nanoid', () => ({
  nanoid: (size?: number) => {
    const id = `mock_id_${Math.random().toString(36).substring(7)}`
    return size ? id.padEnd(size, '0') : id
  },
}))

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
