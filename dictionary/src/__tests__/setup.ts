import { vi, afterEach, beforeEach } from 'vitest'

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // log: console.log, // Keep log for debugging
  log: vi.fn(), // Mock to avoid lint warnings
  error: console.error, // Keep error for debugging
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => {
      // Generate a proper UUID v4 format for testing
      const hex = '0123456789abcdef'
      let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      uuid = uuid.replace(/[xy]/g, c => {
        const r = Math.floor(Math.random() * 16)
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return hex[v]
      })
      return uuid
    },
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      digest: async (algorithm: string, data: ArrayBuffer) => {
        // Deterministic mock for SHA-256 based on input
        const view = new Uint8Array(data)
        const bytes = new Uint8Array(32)

        // Create a simple hash by summing bytes
        let sum = 0
        for (let i = 0; i < view.length; i++) {
          sum = (sum + view[i]) % 256
        }

        // Fill with deterministic values based on sum
        for (let i = 0; i < 32; i++) {
          bytes[i] = (sum + i) % 256
        }
        return bytes.buffer
      },
    },
  },
  writable: true,
})

// Mock fetch globally
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

  // Clear console mocks
  if (global.console.log && typeof global.console.log === 'function') {
    ;(global.console.log as any).mockClear?.()
  }
  if (global.console.warn && typeof global.console.warn === 'function') {
    ;(global.console.warn as any).mockClear?.()
  }
  if (global.console.info && typeof global.console.info === 'function') {
    ;(global.console.info as any).mockClear?.()
  }
  if (global.console.debug && typeof global.console.debug === 'function') {
    ;(global.console.debug as any).mockClear?.()
  }

  // Force garbage collection if available (requires --expose-gc flag)
  if (global.gc) {
    global.gc()
  }
})
