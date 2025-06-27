import { Page, expect, Locator } from '@playwright/test'

/**
 * Helper utilities for handling responsive design in E2E tests
 */

/**
 * Check if the current viewport is mobile-sized
 */
export const isMobileViewport = (page: Page): boolean => {
  const viewport = page.viewportSize()
  // Tailwind's 'sm' breakpoint is 640px
  return viewport ? viewport.width < 640 : false
}

/**
 * Wait for and verify storage status indicator
 */
export const waitForStorageStatus = async (
  page: Page,
  status: 'local' | 'synced'
): Promise<void> => {
  const expectedText = status === 'local' ? 'Local storage' : 'Synced'

  // Use a more flexible locator that works across viewports
  const storageIndicator = page
    .locator(`text=${expectedText}, text=💾, text=☁️`)
    .first()

  await expect(storageIndicator).toBeVisible({ timeout: 10000 })
}

/**
 * Get a viewport-aware locator for elements with responsive visibility
 */
export const getResponsiveLocator = (
  page: Page,
  desktopSelector: string,
  mobileSelector: string
): Locator => {
  const isMobile = isMobileViewport(page)
  return page.locator(isMobile ? mobileSelector : desktopSelector)
}

/**
 * Check authentication status with viewport-aware selectors
 */
export const checkAuthStatus = async (
  page: Page,
  expectedStatus: 'authenticated' | 'anonymous'
): Promise<void> => {
  if (expectedStatus === 'anonymous') {
    // For anonymous users, check for either local storage indicator or sign in button
    const anonymousIndicators = page
      .locator('text=Local storage')
      .or(page.locator('button:has-text("Sign in")'))

    await expect(anonymousIndicators).toBeVisible({ timeout: 10000 })
  } else {
    // For authenticated users, check for sign out button or synced indicator
    const authIndicators = page
      .locator('button:has-text("Sign out")')
      .or(page.locator('text=Synced'))

    await expect(authIndicators).toBeVisible({ timeout: 10000 })
  }
}

/**
 * Wait for page to be fully loaded and stable
 */
export const waitForPageStability = async (page: Page): Promise<void> => {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle')

  // Wait for any animations to complete
  await page.waitForTimeout(500)

  // Ensure no pending requests
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Create a test-friendly selector that works across viewports
 */
export const createTestId = (id: string): string => {
  return `[data-testid="${id}"]`
}
