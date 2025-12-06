import { test, expect } from './playwright.base'
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
      // Create entries with explicit practice times to control their timestamps
      // Entries are created with different times to ensure proper sorting
      // Times are spaced 2 hours apart to guarantee clear ordering
      const entries = [
        {
          duration: 30,
          title: 'First Entry',
          notes: 'Should appear first (most recent at 14:00)',
          practiceTime: '14:00', // Most recent
        },
        {
          duration: 30,
          title: 'Second Entry',
          notes: 'Should appear middle (12:00)',
          practiceTime: '12:00', // Middle
        },
        {
          duration: 30,
          title: 'Third Entry',
          notes: 'Should appear last (oldest at 10:00)',
          practiceTime: '10:00', // Oldest
        },
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
        // Add a small delay between entries for form stability
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
      // Build the array in the actual display order
      const displayedEntries: string[] = []
      for (let i = 0; i < 3; i++) {
        const entryContent = await entryContainers.nth(i).textContent()

        // Determine which entry this is based on content
        if (entryContent?.includes('First Entry')) {
          displayedEntries.push('First Entry')
        } else if (entryContent?.includes('Second Entry')) {
          displayedEntries.push('Second Entry')
        } else if (entryContent?.includes('Third Entry')) {
          displayedEntries.push('Third Entry')
        } else {
          // If we can't identify the entry, push the content for debugging
          displayedEntries.push(`Unknown: ${entryContent}`)
        }
      }

      // Verify all three entries were found
      expect(displayedEntries).toContain('First Entry')
      expect(displayedEntries).toContain('Second Entry')
      expect(displayedEntries).toContain('Third Entry')

      // Get positions from the actual displayed order
      const firstEntryPosition = displayedEntries.indexOf('First Entry')
      const secondEntryPosition = displayedEntries.indexOf('Second Entry')
      const thirdEntryPosition = displayedEntries.indexOf('Third Entry')

      // Debug output to understand the actual order
      console.log('Displayed entries order:', displayedEntries)
      console.log(
        'Positions - First:',
        firstEntryPosition,
        'Second:',
        secondEntryPosition,
        'Third:',
        thirdEntryPosition
      )

      // Verify none of the positions are -1 (not found)
      expect(firstEntryPosition).toBeGreaterThanOrEqual(0)
      expect(secondEntryPosition).toBeGreaterThanOrEqual(0)
      expect(thirdEntryPosition).toBeGreaterThanOrEqual(0)

      // Verify entries appear in reverse chronological order (newest timestamp first)
      // Based on our explicit practice times:
      // - First Entry: 14:00 (newest) → should appear at position 0
      // - Second Entry: 12:00 (middle) → should appear at position 1
      // - Third Entry: 10:00 (oldest) → should appear at position 2
      expect(firstEntryPosition).toBe(0)
      expect(secondEntryPosition).toBe(1)
      expect(thirdEntryPosition).toBe(2)
    })
  })
})
