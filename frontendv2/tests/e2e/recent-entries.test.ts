import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

test.describe('Recent Entries Display', () => {
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)

    // Navigate first
    await page.goto('/logbook')

    // Clear any existing data after navigation
    await page.evaluate(() => {
      localStorage.removeItem('mirubato:logbook:entries')
    })
  })

  test('shows recent entries in overview tab', async ({ page }) => {
    await test.step('Create a single test entry', async () => {
      await logbookPage.createEntry({
        duration: 30,
        title: 'Test Piece',
        notes: 'Test notes for recent entry',
        mood: 'satisfied',
      })
    })

    await test.step('Verify entry appears in recent entries section', async () => {
      // The overview tab should be active by default
      await page.waitForLoadState('networkidle')

      // Check for the recent entries section
      await expect(page.locator('text=Recent Entries')).toBeVisible()

      // Check that our entry is visible
      await expect(page.locator('[data-testid="logbook-entry"]')).toBeVisible()
      await expect(page.locator('text=Test Piece')).toBeVisible()
      await expect(
        page.locator('text=Test notes for recent entry')
      ).toBeVisible()
    })
  })

  test('shows multiple recent entries in order', async ({ page }) => {
    await test.step('Create multiple entries', async () => {
      await logbookPage.createEntry({
        duration: 20,
        title: 'First Entry',
        notes: 'Created first',
      })

      // Add small delay to ensure different timestamps
      await page.waitForTimeout(100)

      await logbookPage.createEntry({
        duration: 30,
        title: 'Second Entry',
        notes: 'Created second',
      })

      // Add small delay to ensure different timestamps
      await page.waitForTimeout(100)

      await logbookPage.createEntry({
        duration: 40,
        title: 'Third Entry',
        notes: 'Created third',
      })
    })

    await test.step('Verify entries appear in reverse chronological order', async () => {
      await page.waitForLoadState('networkidle')

      const entries = page.locator('[data-testid="logbook-entry"]')
      await expect(entries).toHaveCount(3)

      // Most recent entry should be first
      await expect(entries.first()).toContainText('Third Entry')
      await expect(entries.nth(1)).toContainText('Second Entry')
      await expect(entries.last()).toContainText('First Entry')
    })
  })
})
