import { Page } from '@playwright/test'

/**
 * Common test setup to reduce redundant operations
 */
export async function setupTest(page: Page) {
  // Mock all external API calls to prevent timeouts
  await Promise.all([
    // Mock autocomplete API
    page.route('**/api/autocomplete/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      })
    }),

    // Mock any analytics or tracking calls
    page.route('**/api/analytics/**', route => {
      route.fulfill({ status: 204 })
    }),

    // Mock any external CDN resources that might be slow
    page.route('**/*.woff2', route => {
      route.fulfill({ status: 200, body: '' })
    }),
  ])

  // Navigate to home and clear storage in parallel
  await Promise.all([
    page.goto('/', { waitUntil: 'domcontentloaded' }), // Don't wait for all network requests
    page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    }),
  ])
}

/**
 * Optimized navigation with reduced wait time
 */
export async function navigateToPage(page: Page, path: string) {
  await page.goto(path, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  })
  // Only wait for specific critical elements instead of networkidle
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Fast element interaction with built-in retry
 */
export async function clickElement(
  page: Page,
  selector: string,
  options?: { timeout?: number }
) {
  const element = page.locator(selector).first()
  await element.waitFor({ state: 'visible', timeout: options?.timeout || 5000 })
  await element.click()
}

/**
 * Batch fill multiple form fields
 */
export async function fillForm(page: Page, fields: Record<string, string>) {
  const promises = Object.entries(fields).map(async ([selector, value]) => {
    const element = page.locator(selector).first()
    await element.waitFor({ state: 'visible', timeout: 3000 })
    await element.fill(value)
  })
  await Promise.all(promises)
}
