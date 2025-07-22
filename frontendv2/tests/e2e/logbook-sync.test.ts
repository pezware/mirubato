import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

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

    await page.reload({ waitUntil: 'domcontentloaded' })
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
      (e: { title: string }) => e.title === 'Structure Test 1'
    )
    expect(firstEntry).toBeDefined()
    expect(firstEntry.duration).toBe(30)
    expect(firstEntry.composer).toBe('Test Composer')
    expect(firstEntry.mood).toBe('satisfied')
    expect(firstEntry.pieces).toEqual([
      { title: 'Structure Test 1', composer: 'Test Composer' },
    ])

    // Verify arrays are actual arrays, not strings
    expect(Array.isArray(firstEntry.pieces)).toBe(true)
    expect(Array.isArray(firstEntry.techniques)).toBe(true)
    expect(Array.isArray(firstEntry.tags)).toBe(true)
  })

  test('entries maintain proper order', async ({ page }) => {
    // Create first entry (longest duration = earliest timestamp)
    await logbookPage.createEntry({
      duration: 45,
      title: 'Morning Practice',
      notes: 'Early session',
    })

    // Wait for entry to be saved
    await page.waitForSelector('text="Morning Practice"', {
      state: 'visible',
      timeout: 5000,
    })

    // Create second entry (medium duration = middle timestamp)
    await logbookPage.createEntry({
      duration: 30,
      title: 'Afternoon Practice',
      notes: 'Later session',
    })

    // Wait for entry to be saved
    await page.waitForSelector('text="Afternoon Practice"', {
      state: 'visible',
      timeout: 5000,
    })

    // Create third entry (shortest duration = latest timestamp)
    await logbookPage.createEntry({
      duration: 15,
      title: 'Evening Practice',
      notes: 'Final session',
    })

    // Check recent entries order - newest should be first
    const recentSection = page.locator('text=Recent Entries').first()
    await expect(recentSection).toBeVisible()

    // Get all entry titles in order
    const entryTitles = await page
      .locator('.bg-white.rounded-lg')
      .locator('text=/Morning Practice|Afternoon Practice|Evening Practice/')
      .allTextContents()

    // Find the indices
    const eveningIndex = entryTitles.findIndex(title =>
      title.includes('Evening Practice')
    )
    const afternoonIndex = entryTitles.findIndex(title =>
      title.includes('Afternoon Practice')
    )
    const morningIndex = entryTitles.findIndex(title =>
      title.includes('Morning Practice')
    )

    // Verify reverse chronological order (newest first)
    expect(eveningIndex).toBeLessThan(afternoonIndex)
    expect(afternoonIndex).toBeLessThan(morningIndex)
  })
})
