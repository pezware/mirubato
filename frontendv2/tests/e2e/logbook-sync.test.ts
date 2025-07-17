import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

test.describe('Logbook Sync and Data Persistence', () => {
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)

    // Clear localStorage to start fresh
    await page.goto('/')
    await logbookPage.clearAllEntries()

    // Mock autocomplete API to prevent timeouts
    await page.route('**/api/autocomplete/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      })
    })
  })

  test('Data persists correctly across page reloads', async ({ page }) => {
    // Navigate to logbook
    await logbookPage.navigate()

    // Step 1: Create entries while not logged in
    await logbookPage.createEntry({
      duration: 10,
      title: 'Entry 1',
      composer: 'Test Composer',
      notes: 'First entry',
    })

    await logbookPage.createEntry({
      duration: 20,
      title: 'Entry 2',
      composer: 'Test Composer',
      notes: 'Second entry',
    })

    // Switch to overview to see all entries
    await logbookPage.switchToOverviewTab()

    // Verify we have 2 entries
    await logbookPage.verifyEntryCount(2)

    // Step 2: Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Navigate back to logbook
    await logbookPage.navigate()
    await logbookPage.switchToOverviewTab()

    // Step 3: Verify entries persist after reload
    await logbookPage.verifyEntryCount(2)
    await logbookPage.verifyEntryContainsText('First entry')
    await logbookPage.verifyEntryContainsText('Second entry')

    // Step 4: Create another entry
    await logbookPage.createEntry({
      duration: 30,
      title: 'Entry 3',
      composer: 'Test Composer',
      notes: 'Third entry after reload',
    })

    await logbookPage.switchToOverviewTab()
    await logbookPage.verifyEntryCount(3)
  })

  test('Entries are stored with correct structure', async () => {
    // Navigate to logbook
    await logbookPage.navigate()

    // Create entries with different data
    await logbookPage.createEntry({
      duration: 30,
      title: 'Structure Test 1',
      composer: 'Composer A',
      notes: 'Testing data structure',
      mood: 'satisfied',
    })

    await logbookPage.createEntry({
      duration: 45,
      title: 'Structure Test 2',
      composer: 'Composer B',
      notes: 'Another structure test',
      mood: 'excited',
    })

    // Get stored data
    const entries = await logbookPage.getStoredEntries()

    // Verify we have 2 entries
    expect(entries).toHaveLength(2)

    // Verify first entry structure
    const firstEntry = entries[0]
    expect(firstEntry).toHaveProperty('id')
    expect(firstEntry).toHaveProperty('timestamp')
    expect(firstEntry).toHaveProperty('type', 'practice')
    expect(firstEntry).toHaveProperty('duration', 30)
    expect(firstEntry).toHaveProperty('mood', 'satisfied')
    expect(firstEntry.pieces[0]).toMatchObject({
      title: 'Structure Test 1',
      composer: 'Composer A',
    })
    expect(firstEntry).toHaveProperty('notes', 'Testing data structure')

    // Verify second entry
    const secondEntry = entries[1]
    expect(secondEntry).toHaveProperty('duration', 45)
    expect(secondEntry).toHaveProperty('mood', 'excited')
    expect(secondEntry.pieces[0]).toMatchObject({
      title: 'Structure Test 2',
      composer: 'Composer B',
    })
  })

  test('Entries maintain chronological order', async ({ page }) => {
    // Navigate to logbook
    await logbookPage.navigate()

    // Create entries with specific timestamps
    // Important: Due to auto-time adjustment, entries with longer durations
    // get earlier timestamps. So we need to create them in reverse duration order
    // to ensure proper chronological order.

    // Create first entry (longest duration = earliest timestamp)
    await logbookPage.createEntry({
      duration: 45,
      title: 'Morning Practice',
      notes: 'Early session',
    })

    // Wait to ensure different timestamp
    await page.waitForTimeout(2000)

    // Create second entry (medium duration = middle timestamp)
    await logbookPage.createEntry({
      duration: 30,
      title: 'Afternoon Practice',
      notes: 'Later session',
    })

    // Wait to ensure different timestamp
    await page.waitForTimeout(2000)

    // Create third entry (shortest duration = latest timestamp)
    await logbookPage.createEntry({
      duration: 15,
      title: 'Evening Practice',
      notes: 'Final session',
    })

    // Switch to overview
    await logbookPage.switchToOverviewTab()

    // Verify count
    await logbookPage.verifyEntryCount(3)

    // Get stored entries
    const entries = await logbookPage.getStoredEntries()

    // Verify we have 3 entries
    expect(entries).toHaveLength(3)

    // Find entries by their titles regardless of order in storage
    const morningEntry = entries.find(
      e => e.pieces?.[0]?.title === 'Morning Practice'
    )
    const afternoonEntry = entries.find(
      e => e.pieces?.[0]?.title === 'Afternoon Practice'
    )
    const eveningEntry = entries.find(
      e => e.pieces?.[0]?.title === 'Evening Practice'
    )

    expect(morningEntry).toBeDefined()
    expect(afternoonEntry).toBeDefined()
    expect(eveningEntry).toBeDefined()

    // Verify timestamps are in the correct chronological order
    const morningTime = new Date(morningEntry.timestamp).getTime()
    const afternoonTime = new Date(afternoonEntry.timestamp).getTime()
    const eveningTime = new Date(eveningEntry.timestamp).getTime()

    expect(morningTime).toBeLessThan(afternoonTime)
    expect(afternoonTime).toBeLessThan(eveningTime)
  })
})
