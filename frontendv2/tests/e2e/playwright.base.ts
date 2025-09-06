/* eslint-disable no-empty-pattern */
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test'

// Extend basic test with automatic isolation and cleanup
export const test = base.extend({
  // Automatically isolate storage state for each test
  storageState: async ({}, use) => {
    await use(undefined) // Each test starts with clean storage
  },

  // Override context to add cleanup
  context: async ({ context }, use) => {
    // Use the context
    await use(context)

    // Cleanup after test
    await context.clearCookies()
    await context.clearPermissions()

    // Close all pages to free memory
    const pages = context.pages()
    for (const page of pages) {
      await page.close()
    }
  },

  // Override page to add cleanup
  page: async ({ page }, use) => {
    // Use the page
    await use(page)

    // Cleanup: Clear data and close resources after test completes
    // Only clear if page has a valid context (has navigated to a URL)
    try {
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
        // Clear any intervals or timeouts that might be running
        for (let i = 1; i < 99999; i++) {
          clearInterval(i)
          clearTimeout(i)
        }
      })
    } catch (error) {
      // Ignore errors if page context is invalid
      // This can happen if the test didn't navigate to any page
    }
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

// Add global hooks for additional cleanup
test.afterEach(async ({ page }, testInfo) => {
  // Log test status for debugging
  if (testInfo.status !== 'passed') {
    console.log(`Test "${testInfo.title}" did not pass: ${testInfo.status}`)
  }

  // Additional cleanup if test failed
  if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
    // Take a screenshot for debugging
    await page.screenshot({
      path: `test-results/failure-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`,
      fullPage: true,
    })
  }
})

export { expect } from '@playwright/test'
