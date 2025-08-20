import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'
import {
  setPrivacyConsentInBrowser,
  dismissPrivacyBanner,
} from './helpers/test-setup'

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

    // Set privacy consent to prevent privacy banner interference
    await setPrivacyConsentInBrowser(page)

    await page.reload({ waitUntil: 'domcontentloaded' })

    // Dismiss privacy banner if it still appears
    await dismissPrivacyBanner(page)
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

    await test.step('Verify entry appears in the overview', async () => {
      // Check that the entry is visible in the split view list
      await expect(page.locator('[data-testid="logbook-entry"]')).toBeVisible({
        timeout: 5000,
      })

      // Click on the entry to see details (piece titles not shown in list view)
      await page.locator('[data-testid="logbook-entry"]').first().click()
      await page.waitForTimeout(500) // Wait for detail panel to update

      // Now check for piece and composer in the detail panel
      const detailContent = await page.textContent('body')
      expect(detailContent).toContain('Test Piece')
      expect(detailContent).toContain('Test Composer')
      // Notes are visible in the detail panel when expanded
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
        // Wait for entry to be saved - check for entry count instead of text
        // (titles aren't shown in list view, only in detail panel)
        await page.waitForFunction(
          expectedCount =>
            document.querySelectorAll('[data-testid="logbook-entry"]').length >=
            expectedCount,
          i + 1, // Expected count after creating this entry
          { timeout: 5000 }
        )
        // Add a small delay between entries to ensure different timestamps
        if (i < entries.length - 1) {
          await page.waitForTimeout(1000)
        }
      }
    })

    await test.step('Verify entries appear in reverse chronological order', async () => {
      // Switch to overview tab to see entries
      await page.click('[data-testid="overview-tab"]')

      // Wait for the entries to load in the split view
      await page.waitForSelector('[data-testid="logbook-entry"]', {
        state: 'visible',
        timeout: 5000,
      })

      // Wait for all entries to be visible in the list
      // Note: Piece titles are not shown in the list view, only in detail panel

      // Get all entry containers using the specific data-testid
      const entryContainers = page.locator('[data-testid="logbook-entry"]')
      await expect(entryContainers).toHaveCount(3, { timeout: 5000 })

      // Click through entries to verify they contain the expected pieces
      const foundTitles: string[] = []
      for (let i = 0; i < 3; i++) {
        await entryContainers.nth(i).click()
        await page.waitForTimeout(300) // Wait for detail panel
        const detailContent = await page.textContent('body')

        if (detailContent.includes('First Entry')) {
          foundTitles.push('First Entry')
        } else if (detailContent.includes('Second Entry')) {
          foundTitles.push('Second Entry')
        } else if (detailContent.includes('Third Entry')) {
          foundTitles.push('Third Entry')
        }
      }

      // Verify all three entries were found
      expect(foundTitles).toContain('First Entry')
      expect(foundTitles).toContain('Second Entry')
      expect(foundTitles).toContain('Third Entry')

      // Since we clicked through entries in order, foundTitles contains them in displayed order
      // Get positions for verification
      const firstEntryPosition = foundTitles.indexOf('First Entry')
      const secondEntryPosition = foundTitles.indexOf('Second Entry')
      const thirdEntryPosition = foundTitles.indexOf('Third Entry')

      // Verify they appear in reverse chronological order (newest timestamp first)
      // Due to the way the form works (timestamp = now - duration minutes):
      // - First Entry: 20 min duration → most recent timestamp
      // - Second Entry: 30 min duration → middle timestamp
      // - Third Entry: 40 min duration → oldest timestamp
      // So in reverse chronological order (newest first), we expect:
      // First Entry should appear before Second Entry
      // Second Entry should appear before Third Entry
      expect(firstEntryPosition).toBeLessThan(secondEntryPosition)
      expect(secondEntryPosition).toBeLessThan(thirdEntryPosition)
    })
  })
})
