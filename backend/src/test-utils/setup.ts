// Jest setup file for backend tests
import { TextEncoder, TextDecoder } from 'util'
import { vi } from 'vitest'

// Polyfill for Cloudflare Workers environment
;(global as any).TextEncoder = TextEncoder
;(global as any).TextDecoder = TextDecoder as any

// Mock crypto for JWT operations
;(global as any).crypto = {
  subtle: {
    digest: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
  },
  getRandomValues: vi.fn(arr => {
    return arr.map(() => Math.floor(Math.random() * 256))
  }),
} as any

// Suppress console errors during tests unless explicitly needed
const originalError = console.error
beforeAll(() => {
  console.error = vi.fn()
})

afterAll(() => {
  console.error = originalError
})
