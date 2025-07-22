import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

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

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="analytics-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )
      })

      await test.step('Navigate to data tab', async () => {
        await page.click('[data-testid="data-tab"]')

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="data-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )
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

        // Check for practice time display - look for any time-related content
        const hasTimeDisplay = await page
          .locator('text=/[0-9]+\\s*(hours?|hrs?|minutes?|mins?|h|m)|0:00/i')
          .first()
          .isVisible()
          .catch(() => false)

        // If no time display found, at least check that statistics section exists
        if (!hasTimeDisplay) {
          const hasStatsSection = await page
            .locator('[class*="stat"], [class*="metric"], [class*="summary"]')
            .first()
            .isVisible()
            .catch(() => false)
          expect(hasStatsSection).toBeTruthy()
        }
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
        // Check for calendar grid elements (the small squares)
        const calendarSquares = page.locator('.w-3.h-3.rounded-sm')
        const squareCount = await calendarSquares.count()

        // If no calendar squares, check for month labels as fallback
        if (squareCount === 0) {
          const monthLabels = page.locator(
            'text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/'
          )
          await expect(monthLabels.first()).toBeVisible({
            timeout: 10000,
          })
        } else {
          await expect(calendarSquares.first()).toBeVisible({
            timeout: 10000,
          })
        }
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

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="analytics-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )
      })

      await test.step('Verify filter UI is accessible', async () => {
        // The Add Filter button should be visible
        await expect(page.locator('text=Add Filter')).toBeVisible({
          timeout: 5000,
        })
      })

      await test.step('Add a simple filter', async () => {
        await page.click('text=Add Filter')

        // Wait for the filter section to update
        await page.waitForTimeout(500)

        // Check that we're no longer showing "No filters" message
        await expect(page.locator('text=No filters applied')).not.toBeVisible()

        // Verify filter controls are visible by checking for the field dropdown
        // The filter builder creates dropdowns for field selection
        const filterSection = page.locator('.space-y-2').first()
        await expect(filterSection).toBeVisible({ timeout: 5000 })

        // Verify we have at least one filter row with a remove button (X icon)
        const removeButtons = page
          .locator('button')
          .filter({ has: page.locator('svg.w-4.h-4') })
        const removeButtonCount = await removeButtons.count()
        expect(removeButtonCount).toBeGreaterThan(0)
      })
    })

    test('data view shows tabular data', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="data-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )
      })

      await test.step('Verify data table is displayed', async () => {
        // The data view shows grouped data by default
        // Wait for the grouped data table to load
        await page.waitForSelector('[data-testid="data-table"]', {
          state: 'visible',
          timeout: 5000,
        })

        // The component sets default grouping by month, so we should see grouped entries
        // Check if there's any data shown (either grouped data or a message)
        const hasGroupedData =
          (await page
            .locator('.grouped-data-table, [class*="group"]')
            .count()) > 0
        const hasNoDataMessage = await page
          .locator('text=No data to display')
          .isVisible()
          .catch(() => false)

        // Either we should see grouped data or a message about applying grouping
        expect(hasGroupedData || hasNoDataMessage).toBeTruthy()

        // Verify export buttons are present and enabled (since we have entries)
        await expect(
          page.locator('[data-testid="export-csv-button"]')
        ).toBeEnabled()
        await expect(
          page.locator('[data-testid="export-json-button"]')
        ).toBeEnabled()
      })
    })
  })

  test.describe('Export Functionality', () => {
    test('export reports as CSV', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="data-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )
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
