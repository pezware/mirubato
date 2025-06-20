// Add crypto polyfill FIRST before any imports
if (typeof globalThis.crypto === 'undefined') {
  const crypto = {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
  } as any
  ;(globalThis as any).crypto = crypto
  ;(global as any).crypto = crypto
}

import { beforeAll, afterEach, vi } from 'vitest'

// Mock console methods to reduce noise in tests
beforeAll(() => {
  global.console = {
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
