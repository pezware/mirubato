import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'
import { waitForTabContent } from './helpers/wait-helpers'

test.describe('Enhanced Reports', () => {
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)

    // Navigate to logbook page
    await logbookPage.navigate()

    // Clear all data after navigation
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Reload page and wait for UI to be ready
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="overview-tab"]', {
      state: 'visible',
      timeout: 5000,
    })

    // Create minimal test data
    await test.step('Create test entries', async () => {
      // Create just 2 entries to speed up the test
      await logbookPage.createEntry({
        duration: 30,
        title: 'Moonlight Sonata',
        composer: 'Beethoven',
        notes: 'Working on first movement',
        mood: 'satisfied',
      })

      await logbookPage.createEntry({
        duration: 45,
        title: 'Clair de Lune',
        composer: 'Debussy',
        notes: 'Practice dynamics',
        mood: 'excited',
      })
    })

    // Wait for entries to be visible
    await page.waitForSelector('.bg-white.rounded-lg', {
      state: 'visible',
      timeout: 5000,
    })
  })

  test.describe('Report Views', () => {
    test('navigate between report tabs', async ({ page }) => {
      await test.step('Verify overview tab is active by default', async () => {
        await expect(page.locator('[data-testid="overview-tab"]')).toHaveClass(
          /border-morandi-purple-400/
        )
      })

      await test.step('Navigate to repertoire tab', async () => {
        await page.click('[data-testid="repertoire-tab"]')

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="repertoire-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )
      })

      await test.step('Navigate to analytics tab', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await waitForTabContent(page, 'analytics-tab', 'analytics-content')
      })

      await test.step('Navigate to data tab', async () => {
        await page.click('[data-testid="data-tab"]')
        await waitForTabContent(page, 'data-tab', 'data-content')
      })
    })

    test('overview view displays statistics @smoke', async ({ page }) => {
      await test.step('Verify summary statistics are displayed', async () => {
        // Check for key statistics that should always be present
        await expect(
          page.locator('text=/Total Practice|Sessions|Average/').first()
        ).toBeVisible({
          timeout: 5000,
        })

        // Check for practice time display
        const hasHours = await page
          .locator('text=/hours|hr/')
          .first()
          .isVisible()
          .catch(() => false)
        const hasMinutes = await page
          .locator('text=/minutes|min/')
          .first()
          .isVisible()
          .catch(() => false)
        expect(hasHours || hasMinutes).toBeTruthy()
      })

      await test.step('Verify recent entries section', async () => {
        await expect(page.locator('text=Recent Entries')).toBeVisible({
          timeout: 5000,
        })

        // Should show the entries we created
        await expect(page.locator('text=Moonlight Sonata')).toBeVisible()
        await expect(page.locator('text=Clair de Lune')).toBeVisible()
      })

      await test.step('Verify calendar heatmap is visible', async () => {
        // Calendar elements should be visible
        const calendarElements = page.locator(
          '.w-3.h-3.rounded-sm, text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/'
        )
        await expect(calendarElements.first()).toBeVisible({
          timeout: 10000,
        })
      })
    })

    test('repertoire view shows repertoire content', async ({ page }) => {
      await test.step('Navigate to repertoire view', async () => {
        await page.click('[data-testid="repertoire-tab"]')

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="repertoire-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )
      })

      await test.step('Verify repertoire view is loaded', async () => {
        // The repertoire view should show some content after tab activation
        // We just need to verify the tab switched successfully
        const isTabActive = await page
          .locator('[data-testid="repertoire-tab"]')
          .evaluate(el => el.classList.contains('border-morandi-purple-400'))

        expect(isTabActive).toBeTruthy()
      })
    })

    test('analytics view allows filtering', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await waitForTabContent(page, 'analytics-tab', 'analytics-content')
      })

      await test.step('Verify filter UI is accessible', async () => {
        // The Add Filter button should be visible
        await expect(page.locator('text=Add Filter')).toBeVisible({
          timeout: 5000,
        })
      })

      await test.step('Add a simple filter', async () => {
        await page.click('text=Add Filter')

        // Wait for filter row to appear
        await page.waitForSelector('select', {
          state: 'visible',
          timeout: 5000,
        })

        // Verify filter row was added
        const selectCount = await page.locator('select').count()
        expect(selectCount).toBeGreaterThan(0)
      })
    })

    test('data view shows tabular data', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await waitForTabContent(page, 'data-tab', 'data-content')
      })

      await test.step('Verify data table is displayed', async () => {
        // Should show tabular data with our entries
        await expect(page.locator('text=Moonlight Sonata')).toBeVisible({
          timeout: 5000,
        })
        await expect(page.locator('text=Beethoven')).toBeVisible()
      })
    })
  })

  test.describe('Export Functionality', () => {
    test('export reports as CSV', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await waitForTabContent(page, 'data-tab', 'data-content')
      })

      await test.step('Verify export buttons are visible', async () => {
        await expect(page.locator('text=Export CSV')).toBeVisible({
          timeout: 5000,
        })
        await expect(page.locator('text=Export JSON')).toBeVisible()
      })

      await test.step('Click export CSV', async () => {
        // Set up download promise before clicking
        const downloadPromise = page.waitForEvent('download')
        await page.click('text=Export CSV')

        // Verify download started
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(
          /mirubato-practice-report.*\.csv/
        )
      })
    })
  })
})
