import { test, expect } from '@playwright/test'
import {
  navigateToOverviewTab,
  waitForEntries,
  createLogbookEntry,
} from './helpers/logbook-helpers'
import { setupTest, navigateToPage } from './helpers/test-setup'

test.describe('Logbook Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to ensure consistent UI
    await page.setViewportSize({ width: 1280, height: 720 })

    // Common test setup with mocked APIs
    await setupTest(page)

    // Navigate to logbook page
    await navigateToPage(page, '/logbook')
  })

  test('Can create and view a simple logbook entry', async ({ page }) => {
    // Create an entry
    await createLogbookEntry(
      page,
      '30',
      'Test Sonata',
      'Test Composer',
      'Test notes for the entry'
    )

    // Verify entry appears
    const entryExists = await waitForEntries(page, 1)
    expect(entryExists).toBe(true)

    // Verify we can see the notes (which are visible in collapsed view)
    // First wait for the entry container to be rendered
    await page.waitForSelector('.p-4.hover\\:bg-morandi-stone-50', {
      state: 'visible',
      timeout: 10000,
    })

    // Then verify notes are visible
    await expect(page.locator('text="Test notes for the entry"')).toBeVisible({
      timeout: 10000,
    })

    // Check localStorage to confirm entry was saved
    const entries = await page.evaluate(() => {
      const stored = localStorage.getItem('mirubato:logbook:entries')
      return stored ? JSON.parse(stored) : []
    })

    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].duration).toBe(30)
    expect(entries[0].pieces[0].title).toBe('Test Sonata')
  })

  test('Multiple entries are displayed correctly', async ({ page }) => {
    // Create first entry
    await createLogbookEntry(page, '15', 'Entry 1', 'Composer 1', 'Notes 1')

    // Create second entry
    await createLogbookEntry(page, '45', 'Entry 2', 'Composer 2', 'Notes 2')

    // Verify both entries appear
    const hasEntries = await waitForEntries(page, 2)
    expect(hasEntries).toBe(true)

    // Verify we can see both sets of notes
    await expect(page.locator('text="Notes 1"')).toBeVisible()
    await expect(page.locator('text="Notes 2"')).toBeVisible()
  })

  test('Entry data persists after page reload', async ({ page }) => {
    // Create an entry
    await createLogbookEntry(
      page,
      '60',
      'Persistent Entry',
      'Persistent Composer',
      'This should persist'
    )

    // Reload the page
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Navigate to Overview tab
    await navigateToOverviewTab(page)

    // Verify entry still appears
    const hasEntry = await waitForEntries(page, 1)
    expect(hasEntry).toBe(true)

    // Verify notes are still visible
    // Wait for entry container first after reload
    await page.waitForSelector('.p-4.hover\\:bg-morandi-stone-50', {
      state: 'visible',
      timeout: 10000,
    })

    await expect(page.locator('text="This should persist"')).toBeVisible({
      timeout: 10000,
    })
  })

  test('Can view reports after creating entries', async ({ page }) => {
    // Create an entry first
    await createLogbookEntry(
      page,
      '25',
      'Report Test',
      'Report Composer',
      'For reports'
    )

    // Wait for UI to stabilize
    await page.waitForTimeout(2000)

    // Check if we're already on the reports view (some implementations auto-switch)
    const onReports = await page
      .locator('text="Total Practice"')
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    if (!onReports) {
      // Try to navigate to reports
      const reportsTab = page
        .locator(
          'button:has-text("Reports"), [role="tab"]:has-text("Reports"), button:has-text("View Reports")'
        )
        .first()
      if (await reportsTab.isVisible({ timeout: 2000 })) {
        await reportsTab.click()
        await page.waitForTimeout(1000)
      }
    }

    // Verify report elements are visible
    await expect(page.locator('text="Total Practice"')).toBeVisible({
      timeout: 10000,
    })

    // Check for export buttons - look for both individually since there are 2
    const exportJsonButton = page.locator('button:has-text("Export JSON")')
    const exportCsvButton = page.locator('button:has-text("Export CSV")')

    await expect(exportJsonButton).toBeVisible({ timeout: 5000 })
    await expect(exportCsvButton).toBeVisible({ timeout: 5000 })
  })
})
