// Integration test setup
import { beforeAll, afterAll, beforeEach } from '@jest/globals'
import { TextEncoder, TextDecoder } from 'util'
import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for jsdom
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'test-database-url'
process.env.JWT_SECRET = 'test-jwt-secret'

// Global test timeout
jest.setTimeout(30000) // 30 seconds for integration tests

// Setup test database
beforeAll(async () => {
  // Initialize test database
  console.log('Setting up test database...')
  // TODO: Run migrations for test database
})

// Clean up after tests
afterAll(async () => {
  // Clean up test database
  console.log('Cleaning up test database...')
  // TODO: Drop test database
})

// Reset database state before each test
beforeEach(async () => {
  // TODO: Truncate all tables or reset to known state
})
