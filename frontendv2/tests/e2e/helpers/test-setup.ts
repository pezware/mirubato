import { Page } from '@playwright/test'

/**
 * Set privacy consent to prevent privacy banner from showing during tests
 */
export function setPrivacyConsent() {
  const privacyConsent = {
    essential: true,
    functional: true,
    consentDate: new Date().toISOString(),
    version: '2025-01',
  }
  localStorage.setItem(
    'mirubato:privacy-consent',
    JSON.stringify(privacyConsent)
  )
}

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

  // Navigate to home first, then clear storage
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  // Clear storage and set privacy consent
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  // Set privacy consent after clearing storage
  await setPrivacyConsentInBrowser(page)
}

/**
 * Set privacy consent in browser context
 */
export async function setPrivacyConsentInBrowser(page: Page) {
  await page.evaluate(() => {
    const privacyConsent = {
      essential: true,
      functional: true,
      consentDate: new Date().toISOString(),
      version: '2025-01',
    }
    localStorage.setItem(
      'mirubato:privacy-consent',
      JSON.stringify(privacyConsent)
    )
  })
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

/**
 * Dismiss privacy banner if it appears
 */
export async function dismissPrivacyBanner(page: Page) {
  try {
    // Check if privacy banner is visible and dismiss it
    const acceptButton = page.locator('button:has-text("Accept All")')
    if (await acceptButton.isVisible({ timeout: 1000 })) {
      await acceptButton.click()
      await page.waitForTimeout(500) // Wait for banner to dismiss
    }
  } catch (_error) {
    // Banner not present, continue
  }
}
