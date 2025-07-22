import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

test.describe('Recent Entries', () => {
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)
    await logbookPage.navigate()

    // Clear data for fresh start
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="overview-tab"]', {
      state: 'visible',
      timeout: 5000,
    })
  })

  test('shows recent entries in overview tab', async ({ page }) => {
    await test.step('Create a single test entry', async () => {
      await logbookPage.createEntry({
        duration: 30,
        title: 'Test Piece',
        composer: 'Test Composer',
        notes: 'Test notes for recent entry',
      })
    })

    await test.step('Verify entry appears in Recent Entries section', async () => {
      await expect(page.locator('text=Recent Entries')).toBeVisible({
        timeout: 5000,
      })
      await expect(page.locator('text=Test Piece')).toBeVisible()
      await expect(page.locator('text=Test Composer')).toBeVisible()
      await expect(
        page.locator('text=Test notes for recent entry')
      ).toBeVisible()
    })
  })

  test('shows multiple recent entries in order', async ({ page }) => {
    await test.step('Create multiple entries with unique timestamps', async () => {
      // Create entries with different data to ensure they're distinguishable
      const entries = [
        { duration: 20, title: 'First Entry', notes: 'Created first' },
        { duration: 30, title: 'Second Entry', notes: 'Created second' },
        { duration: 40, title: 'Third Entry', notes: 'Created third' },
      ]

      for (const entry of entries) {
        await logbookPage.createEntry(entry)
        // Wait for entry to be saved and UI to update
        await page.waitForSelector(`text="${entry.title}"`, {
          state: 'visible',
          timeout: 5000,
        })
      }
    })

    await test.step('Verify entries appear in reverse chronological order', async () => {
      // Wait for all entries to be visible
      await page.waitForSelector('text=Third Entry', {
        state: 'visible',
        timeout: 5000,
      })

      // Get all entry titles
      const entryTitles = await page
        .locator('.bg-white.rounded-lg')
        .locator('text=/First Entry|Second Entry|Third Entry/')
        .allTextContents()

      // Recent entries should show newest first
      expect(entryTitles.length).toBeGreaterThanOrEqual(3)

      // Find the indices of our entries
      const thirdIndex = entryTitles.findIndex(title =>
        title.includes('Third Entry')
      )
      const secondIndex = entryTitles.findIndex(title =>
        title.includes('Second Entry')
      )
      const firstIndex = entryTitles.findIndex(title =>
        title.includes('First Entry')
      )

      // Verify they appear in reverse order (newest first)
      expect(thirdIndex).toBeLessThan(secondIndex)
      expect(secondIndex).toBeLessThan(firstIndex)
    })
  })
})
