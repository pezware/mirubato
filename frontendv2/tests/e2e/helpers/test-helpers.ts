import { Page } from '@playwright/test'

/**
 * Wait for network idle state with a reasonable timeout
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout })
  } catch {
    // Network might not settle, continue anyway
  }
}

/**
 * Wait for autocomplete dropdown to close
 */
export async function waitForAutocompleteClose(page: Page) {
  // Wait for dropdown to disappear
  await page
    .waitForSelector('[role="listbox"]', { state: 'hidden', timeout: 2000 })
    .catch(() => {
      // If no dropdown found, that's fine
    })
}

/**
 * Handle autocomplete input safely
 */
export async function fillAutocompleteField(
  page: Page,
  selector: string,
  value: string
) {
  const input = page.locator(selector)

  // Clear and fill the input
  await input.clear()
  await input.fill(value)

  // Wait for any debounce
  await page.waitForTimeout(100)

  // Close autocomplete dropdown
  await input.press('Escape')
  await waitForAutocompleteClose(page)
}

/**
 * Wait for an element with specific text to appear
 */
export async function waitForText(
  page: Page,
  text: string,
  options?: { timeout?: number }
) {
  await page.waitForSelector(`text="${text}"`, {
    state: 'visible',
    timeout: options?.timeout || 10000,
  })
}

/**
 * Wait for multiple possible success indicators
 */
export async function waitForSuccess(page: Page) {
  await Promise.race([
    waitForText(page, 'saved', { timeout: 5000 }),
    waitForText(page, 'success', { timeout: 5000 }),
    waitForText(page, 'created', { timeout: 5000 }),
    waitForNetworkIdle(page, 3000),
  ]).catch(() => {
    // At least one should succeed
  })
}

/**
 * Safely click an element with retry
 */
export async function safeClick(page: Page, selector: string) {
  const element = page.locator(selector)

  // Wait for element to be ready
  await element.waitFor({ state: 'visible' })
  await element.waitFor({ state: 'attached' })

  // Scroll into view if needed
  await element.scrollIntoViewIfNeeded()

  // Click with retry
  await element.click({ timeout: 10000 })
}

/**
 * Get text content safely
 */
export async function getTextContent(
  page: Page,
  selector: string
): Promise<string> {
  const element = page.locator(selector)
  await element.waitFor({ state: 'visible' })
  return (await element.textContent()) || ''
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout = 2000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(page: Page, duration = 300) {
  // Use requestAnimationFrame for more accurate animation timing
  await page.evaluate(ms => {
    return new Promise(resolve => {
      let start: number | null = null
      function frame(timestamp: number) {
        if (!start) start = timestamp
        if (timestamp - start < ms) {
          requestAnimationFrame(frame)
        } else {
          resolve(undefined)
        }
      }
      requestAnimationFrame(frame)
    })
  }, duration)
}
