// Vitest setup file for backend tests
import { vi } from 'vitest'

// Mock global crypto API for tests
if (!(globalThis as any).crypto) {
  ;(globalThis as any).crypto = {
    randomUUID: () => 'mock-uuid-123',
    getRandomValues: (array: any) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    },
  } as any
}

// Mock Buffer for jsonwebtoken in Cloudflare Workers environment
if (!globalThis.Buffer) {
  class BufferPolyfill {
    static from(str: string, encoding?: string): any {
      if (encoding === 'base64') {
        return atob(str)
      }
      const encoder = new TextEncoder()
      return encoder.encode(str)
    }

    static isBuffer(): boolean {
      return false
    }

    static alloc(size: number): Uint8Array {
      return new Uint8Array(size)
    }

    static concat(list: Uint8Array[]): Uint8Array {
      const totalLength = list.reduce((acc, arr) => acc + arr.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const arr of list) {
        result.set(arr, offset)
        offset += arr.length
      }
      return result
    }
  }

  ;(globalThis as any).Buffer = BufferPolyfill
}

// Ensure global is defined
if (typeof global === 'undefined') {
  ;(globalThis as any).global = globalThis
}

// Mock process for Node.js dependencies
if (!globalThis.process) {
  ;(globalThis as any).process = {
    env: {},
    version: 'v18.0.0',
    versions: {
      node: '18.0.0',
    },
    cwd: () => '/',
    nextTick: (fn: Function) => Promise.resolve().then(() => fn()),
  }
}

// Mock nanoid for tests
vi.mock('nanoid', () => ({
  nanoid: vi.fn((size?: number) => {
    // Return a string of the requested size for tests
    if (size) {
      return 'test-id-'.padEnd(size, '1234567890')
    }
    return 'test-id-123'
  }),
}))

// Suppress console errors during tests unless explicitly needed
const originalError = console.error
beforeAll(() => {
  console.error = vi.fn()
})

afterAll(() => {
  console.error = originalError
})

// Add custom matchers if needed
expect.extend({
  // Add any custom matchers here
})

// Clear all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
