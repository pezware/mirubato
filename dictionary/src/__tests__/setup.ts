import { vi } from 'vitest'

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: console.log, // Keep log for debugging
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
