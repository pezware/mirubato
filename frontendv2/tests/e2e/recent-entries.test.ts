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
      // Check that the entry is visible in the list
      await expect(page.locator('[data-testid="logbook-entry"]')).toBeVisible({
        timeout: 5000,
      })

      // Piece titles and composers are now shown inline in the list view
      const entryContent = await page
        .locator('[data-testid="logbook-entry"]')
        .first()
        .textContent()
      expect(entryContent).toContain('Test Piece')
      expect(entryContent).toContain('Test Composer')

      // Click on the entry to expand notes (notes are collapsed by default)
      await page.locator('[data-testid="logbook-entry"]').first().click()
      await page.waitForTimeout(300) // Wait for notes to expand

      // Verify notes are now visible
      await expect(
        page.locator('text=Test notes for recent entry')
      ).toBeVisible({
        timeout: 5000,
      })
    })
  })

  test('shows multiple recent entries in order', async ({ page }) => {
    await test.step('Create multiple entries with unique timestamps', async () => {
      // Create entries with DECREASING durations so newer entries have more recent timestamps
      // The form calculates timestamp as "now - duration minutes"
      // To ensure proper ordering despite the delay between creating entries:
      // - Third Entry: 60 min ago (oldest)
      // - Second Entry: 30 min ago (middle)
      // - First Entry: 10 min ago (newest)
      const entries = [
        { duration: 60, title: 'Third Entry', notes: 'Should appear last' },
        { duration: 30, title: 'Second Entry', notes: 'Should appear middle' },
        { duration: 10, title: 'First Entry', notes: 'Should appear first' },
      ]

      for (let i = 0; i < entries.length; i++) {
        await logbookPage.createEntry(entries[i])
        // Wait for entry to be saved - check for entry count
        // (titles are now shown inline in list view)
        await page.waitForFunction(
          expectedCount =>
            document.querySelectorAll('[data-testid="logbook-entry"]').length >=
            expectedCount,
          i + 1, // Expected count after creating this entry
          { timeout: 5000 }
        )
        // Add a small delay between entries to ensure different timestamps
        if (i < entries.length - 1) {
          await page.waitForTimeout(500)
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
      // Note: Piece titles are now shown inline in the list view

      // Get all entry containers using the specific data-testid
      const entryContainers = page.locator('[data-testid="logbook-entry"]')
      await expect(entryContainers).toHaveCount(3, { timeout: 5000 })

      // Get entry titles directly from the list (now inline in CompactEntryRow)
      const foundTitles: string[] = []
      for (let i = 0; i < 3; i++) {
        const entryContent = await entryContainers.nth(i).textContent()

        if (entryContent.includes('First Entry')) {
          foundTitles.push('First Entry')
        } else if (entryContent.includes('Second Entry')) {
          foundTitles.push('Second Entry')
        } else if (entryContent.includes('Third Entry')) {
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
      // Based on our durations:
      // - First Entry: 10 min ago (newest) → should appear at position 0
      // - Second Entry: 30 min ago (middle) → should appear at position 1
      // - Third Entry: 60 min ago (oldest) → should appear at position 2
      // So in the displayed list, we expect:
      // First Entry should appear before Second Entry
      // Second Entry should appear before Third Entry
      expect(firstEntryPosition).toBeLessThan(secondEntryPosition)
      expect(secondEntryPosition).toBeLessThan(thirdEntryPosition)
    })
  })
})
