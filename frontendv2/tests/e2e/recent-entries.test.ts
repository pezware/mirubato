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
      // Target the preview text specifically to avoid duplicates
      await expect(
        page
          .locator('.line-clamp-2')
          .filter({ hasText: 'Test notes for recent entry' })
          .first()
      ).toBeVisible()
    })
  })

  test('shows multiple recent entries in order', async ({ page }) => {
    await test.step('Create multiple entries with unique timestamps', async () => {
      // Create entries with INCREASING durations so that when the form
      // calculates "current time - duration", entries created later will have older timestamps
      // This is because the form sets practice time to "now - duration minutes"
      // Entry created last with longest duration will have the oldest timestamp
      const entries = [
        { duration: 20, title: 'First Entry', notes: 'Created first' },
        { duration: 30, title: 'Second Entry', notes: 'Created second' },
        { duration: 40, title: 'Third Entry', notes: 'Created third' },
      ]

      for (let i = 0; i < entries.length; i++) {
        await logbookPage.createEntry(entries[i])
        // Wait for entry to be saved and UI to update
        await page.waitForSelector(`text="${entries[i].title}"`, {
          state: 'visible',
          timeout: 5000,
        })
        // Add a small delay between entries to ensure different timestamps
        if (i < entries.length - 1) {
          await page.waitForTimeout(1000)
        }
      }
    })

    await test.step('Verify entries appear in reverse chronological order', async () => {
      // Switch to overview tab to see recent entries
      await page.click('[data-testid="overview-tab"]')

      // Wait for the overview content to load
      await page.waitForSelector('text=Recent Entries', {
        state: 'visible',
        timeout: 5000,
      })

      // Wait for all entries to be visible
      await page.waitForSelector('text=Third Entry', {
        state: 'visible',
        timeout: 5000,
      })

      // Get all entry containers using the specific data-testid
      const entryContainers = page.locator('[data-testid="logbook-entry"]')
      await expect(entryContainers).toHaveCount(3, { timeout: 5000 })

      // Get the entry titles in order
      const entryTitles: string[] = []
      const count = await entryContainers.count()

      for (let i = 0; i < count; i++) {
        const titleElement = entryContainers.nth(i).locator('h3').first()
        const title = await titleElement.textContent()
        if (title) {
          entryTitles.push(title.trim())
        }
      }

      // Verify we found all entries
      expect(entryTitles).toContain('First Entry')
      expect(entryTitles).toContain('Second Entry')
      expect(entryTitles).toContain('Third Entry')

      // Get positions
      const firstEntryPosition = entryTitles.indexOf('First Entry')
      const secondEntryPosition = entryTitles.indexOf('Second Entry')
      const thirdEntryPosition = entryTitles.indexOf('Third Entry')

      // Verify they appear in reverse chronological order (newest timestamp first)
      // Since durations are increasing, First Entry has newest timestamp
      // First Entry should appear before Second Entry
      // Second Entry should appear before Third Entry
      expect(firstEntryPosition).toBeLessThan(secondEntryPosition)
      expect(secondEntryPosition).toBeLessThan(thirdEntryPosition)
    })
  })
})
