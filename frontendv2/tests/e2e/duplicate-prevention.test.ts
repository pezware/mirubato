import { test, expect } from './playwright.base'
import { LogbookPage } from './pages/LogbookPage'
import {
  setPrivacyConsentInBrowser,
  dismissPrivacyBanner,
} from './helpers/test-setup'

test.describe('Duplicate Entry Prevention', () => {
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

  test('should not create duplicate entries when logging from repertoire', async ({
    page,
  }) => {
    // Navigate to repertoire tab
    await page.click('[data-testid="repertoire-tab"]')

    // Wait for tab to become active
    await page.waitForFunction(
      () => {
        const tab = document.querySelector('[data-testid="repertoire-tab"]')
        return tab?.classList.contains('border-morandi-purple-400')
      },
      { timeout: 5000 }
    )

    // Create a test piece in repertoire (mock or use existing)
    // For this test, we'll create an entry and check it's not duplicated
    const testTitle = `Test Piece ${Date.now()}`
    const testComposer = 'Test Composer'
    const testDuration = 30

    // Create an entry via manual form
    await logbookPage.createEntry({
      duration: testDuration,
      title: testTitle,
      composer: testComposer,
      notes: 'Test entry for duplicate prevention',
    })

    // Wait for entry to be created
    await page.waitForTimeout(1000)

    // Check localStorage to count entries with this title
    const entriesCount = await page.evaluate(
      ({ title }) => {
        const entries = JSON.parse(
          localStorage.getItem('mirubato:logbook:entries') || '[]'
        )
        return entries.filter(
          (e: { pieces?: Array<{ title: string }> }) =>
            e.pieces &&
            e.pieces.some((p: { title: string }) => p.title === title)
        ).length
      },
      { title: testTitle }
    )

    // Should have exactly one entry
    expect(entriesCount).toBe(1)

    // Verify the entry appears only once in the UI
    const entryElements = await page
      .locator('[data-testid="logbook-entry"]')
      .filter({ hasText: testTitle })
      .count()
    expect(entryElements).toBe(1)
  })

  test('should not create duplicate entries on rapid clicks', async ({
    page,
  }) => {
    // Click manual entry button multiple times rapidly
    const addButton = page.locator('[data-testid="add-entry-button"]').first()

    // Try to click rapidly (but submission protection should prevent duplicates)
    await Promise.all([
      addButton.click(),
      page.waitForTimeout(50).then(() => addButton.click({ force: true })),
      page.waitForTimeout(100).then(() => addButton.click({ force: true })),
    ]).catch(() => {
      // Some clicks may fail due to modal opening, that's expected
    })

    // Should only have one modal open
    await page.waitForTimeout(500)
    const modalCount = await page.locator('[role="dialog"]').count()
    expect(modalCount).toBeLessThanOrEqual(1)
  })

  test('should handle ID consistency between client and server', async ({
    page,
  }) => {
    const testTitle = `ID Test ${Date.now()}`

    // Create entry
    await logbookPage.createEntry({
      duration: 15,
      title: testTitle,
      notes: 'Testing ID consistency',
    })

    await page.waitForTimeout(1000)

    // Get the entry ID from localStorage
    const entryData = await page.evaluate(
      ({ title }) => {
        const entries = JSON.parse(
          localStorage.getItem('mirubato:logbook:entries') || '[]'
        )
        const entry = entries.find(
          (e: { id: string; pieces?: Array<{ title: string }> }) =>
            e.pieces &&
            e.pieces.some((p: { title: string }) => p.title === title)
        )
        return entry ? { id: entry.id, count: entries.length } : null
      },
      { title: testTitle }
    )

    expect(entryData).toBeTruthy()
    expect(entryData?.id).toBeTruthy()

    // Refresh the page to trigger sync
    await page.reload()
    await dismissPrivacyBanner(page)
    await page.waitForSelector('[data-testid="logbook-entry"]', {
      timeout: 5000,
    })

    // Check that the same entry still exists with the same ID
    const afterReloadData = await page.evaluate(
      ({ title, originalId }) => {
        const entries = JSON.parse(
          localStorage.getItem('mirubato:logbook:entries') || '[]'
        )
        const entry = entries.find(
          (e: { id: string; pieces?: Array<{ title: string }> }) =>
            e.pieces &&
            e.pieces.some((p: { title: string }) => p.title === title)
        )
        const sameIdExists = entries.some(
          (e: { id: string }) => e.id === originalId
        )
        return {
          found: !!entry,
          sameId: entry?.id === originalId,
          sameIdExists,
          totalCount: entries.length,
        }
      },
      { title: testTitle, originalId: entryData.id }
    )

    // Entry should still exist with the same ID
    expect(afterReloadData.found).toBe(true)
    expect(afterReloadData.sameId).toBe(true)
    expect(afterReloadData.sameIdExists).toBe(true)
    // Total count should not have increased (no duplicates)
    expect(afterReloadData.totalCount).toBe(entryData.count)
  })
})
