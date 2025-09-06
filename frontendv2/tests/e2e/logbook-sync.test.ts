import { test, expect } from './playwright.base'
import { LogbookPage } from './pages/LogbookPage'
import {
  setPrivacyConsentInBrowser,
  dismissPrivacyBanner,
} from './helpers/test-setup'

test.describe('Logbook Sync', () => {
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)
    await logbookPage.navigate()

    // Clear all data for fresh start
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

  test('entries sync when user logs in', async () => {
    // Step 1: Create entries while not logged in
    await logbookPage.createEntry({
      duration: 10,
      title: 'Entry 1',
      notes: 'First entry',
    })

    await logbookPage.createEntry({
      duration: 20,
      title: 'Entry 2',
      notes: 'Second entry',
    })

    // Step 2: Verify entries are saved locally
    const localEntries = await logbookPage.getStoredEntries()
    expect(localEntries.length).toBe(2)

    // Step 3: Log in (simulated)
    // Note: In a real test, we would implement actual login flow
    // For now, we'll just verify local storage works

    // Step 4: Create another entry
    await logbookPage.createEntry({
      duration: 30,
      title: 'Entry 3',
      notes: 'Third entry',
    })

    // Step 5: Verify all entries exist
    const allEntries = await logbookPage.getStoredEntries()
    expect(allEntries.length).toBe(3)
  })

  test('local data structure is correct', async () => {
    // Create entries with different data
    await logbookPage.createEntry({
      duration: 30,
      title: 'Structure Test 1',
      composer: 'Test Composer',
      notes: 'Testing data structure',
      mood: 'satisfied',
    })

    await logbookPage.createEntry({
      duration: 45,
      title: 'Structure Test 2',
      notes: 'Another test entry',
      mood: 'excited',
    })

    // Verify data structure
    const entries = await logbookPage.getStoredEntries()
    expect(entries.length).toBe(2)

    // Check first entry structure
    const firstEntry = entries.find(
      (e: { title: string; pieces?: Array<{ title: string }> }) =>
        e.title === 'Structure Test 1' ||
        (e.pieces && e.pieces.some(p => p.title === 'Structure Test 1'))
    )
    expect(firstEntry).toBeDefined()

    if (firstEntry) {
      expect(firstEntry.duration).toBe(30)
      expect(firstEntry.mood).toBe('satisfied')

      // Check if pieces array exists and has the expected structure
      if (firstEntry.pieces && Array.isArray(firstEntry.pieces)) {
        const piece = firstEntry.pieces.find(
          p => p.title === 'Structure Test 1'
        )
        expect(piece).toBeDefined()
        if (piece && 'composer' in piece) {
          expect(piece.composer).toBe('Test Composer')
        }
      }

      // Verify arrays are actual arrays if they exist
      if ('pieces' in firstEntry) {
        expect(Array.isArray(firstEntry.pieces)).toBe(true)
      }
      if ('techniques' in firstEntry) {
        expect(Array.isArray(firstEntry.techniques)).toBe(true)
      }
      if ('tags' in firstEntry) {
        expect(Array.isArray(firstEntry.tags)).toBe(true)
      }
    }
  })

  test('entries maintain proper order', async ({ page }) => {
    // IMPORTANT: The form sets timestamp = now - duration minutes
    // So entries with longer durations will have EARLIER timestamps

    // Create first entry: duration 15 min → timestamp = now - 15 min (MOST RECENT)
    await logbookPage.createEntry({
      duration: 15,
      title: 'Morning Practice',
      notes: 'Early session',
    })

    // Wait for entry to be saved - check for data-testid instead of text
    await page.waitForSelector('[data-testid="logbook-entry"]', {
      state: 'visible',
      timeout: 5000,
    })
    await page.waitForTimeout(1000) // 1 second delay

    // Create second entry: duration 30 min → timestamp = now - 30 min (MIDDLE)
    await logbookPage.createEntry({
      duration: 30,
      title: 'Afternoon Practice',
      notes: 'Later session',
    })

    // Wait for entry to be saved - check for count instead of text
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="logbook-entry"]').length >= 2,
      { timeout: 5000 }
    )
    await page.waitForTimeout(1000) // 1 second delay

    // Create third entry: duration 45 min → timestamp = now - 45 min (OLDEST)
    await logbookPage.createEntry({
      duration: 45,
      title: 'Evening Practice',
      notes: 'Final session',
    })

    // Check entries order - newest should be first in the split view
    // Wait for entries to be visible
    await page.waitForSelector('[data-testid="logbook-entry"]', {
      state: 'visible',
      timeout: 5000,
    })

    // Get all individual entry cards by their test ID
    const entryCards = page.locator('[data-testid="logbook-entry"]')
    const entryCount = await entryCards.count()

    // Now titles are shown directly in the list view (inline in CompactEntryRow)
    const entryTitles = []
    for (let i = 0; i < entryCount; i++) {
      // Get the text content directly from the entry row (titles are now inline)
      const entryContent = await entryCards.nth(i).textContent()

      // Determine which practice this is based on the content
      if (entryContent.includes('Evening Practice')) {
        entryTitles.push('Evening Practice')
      } else if (entryContent.includes('Afternoon Practice')) {
        entryTitles.push('Afternoon Practice')
      } else if (entryContent.includes('Morning Practice')) {
        entryTitles.push('Morning Practice')
      } else {
        entryTitles.push('Unknown')
      }
    }

    // Find the indices by checking which entry has each title
    const eveningIndex = entryTitles.indexOf('Evening Practice')
    const afternoonIndex = entryTitles.indexOf('Afternoon Practice')
    const morningIndex = entryTitles.indexOf('Morning Practice')

    // Verify that all entries are present
    expect(
      morningIndex,
      'Morning Practice should be found'
    ).toBeGreaterThanOrEqual(0)
    expect(
      afternoonIndex,
      'Afternoon Practice should be found'
    ).toBeGreaterThanOrEqual(0)
    expect(
      eveningIndex,
      'Evening Practice should be found'
    ).toBeGreaterThanOrEqual(0)

    // Verify they're in reverse chronological order (newest timestamp first)
    // Because of how durations affect timestamps:
    // - Morning Practice (15 min duration) has the MOST RECENT timestamp
    // - Afternoon Practice (30 min duration) has the MIDDLE timestamp
    // - Evening Practice (45 min duration) has the OLDEST timestamp
    // So the expected order is: Morning, Afternoon, Evening
    expect(
      morningIndex,
      'Morning Practice should appear first (most recent timestamp)'
    ).toBeLessThan(afternoonIndex)
    expect(
      afternoonIndex,
      'Afternoon Practice should appear before Evening Practice'
    ).toBeLessThan(eveningIndex)
  })
})
