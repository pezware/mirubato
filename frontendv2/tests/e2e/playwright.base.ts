/* eslint-disable no-empty-pattern */
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test'

// Extend basic test with automatic isolation
export const test = base.extend({
  // Automatically isolate storage state for each test
  storageState: async ({}, use) => {
    await use(undefined) // Each test starts with clean storage
  },

  // Add custom test fixtures if needed
  testData: async ({}, use) => {
    // Setup test data
    const data = {
      testUser: `test-${Date.now()}@example.com`,
      testPiece: `Test Piece ${Date.now()}`,
    }

    await use(data)

    // Cleanup if needed
  },
})

export { expect } from '@playwright/test'
