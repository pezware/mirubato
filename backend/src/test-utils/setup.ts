// Jest setup file for backend tests
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for Cloudflare Workers environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Mock crypto for JWT operations
global.crypto = {
  subtle: {
    digest: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
  },
  getRandomValues: jest.fn(arr => {
    return arr.map(() => Math.floor(Math.random() * 256))
  }),
} as any

// Suppress console errors during tests unless explicitly needed
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})
