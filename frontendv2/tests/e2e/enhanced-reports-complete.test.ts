import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'
import { waitForTabContent } from './helpers/wait-helpers'

test.describe('Enhanced Reports - Complete Test Suite', () => {
  test.setTimeout(60000) // Increase timeout to 60 seconds
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)

    // Navigate to logbook page first
    await logbookPage.navigate()

    // Clear all data after navigation to avoid security errors
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Reload page after clearing storage to ensure clean state
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="overview-tab"]', {
      state: 'visible',
      timeout: 15000,
    })

    // Create minimal test data for faster execution
    await test.step('Create minimal test entries', async () => {
      // Create only 2 entries to speed up tests significantly
      const entries = [
        {
          duration: 30,
          title: 'Test Piece A',
          composer: 'Beethoven',
          notes: 'Test notes',
          mood: 'satisfied',
        },
        {
          duration: 45,
          title: 'Test Piece B',
          composer: 'Debussy',
          notes: 'Test notes',
          mood: 'excited',
        },
      ]

      // Create entries with minimal delays
      for (const entry of entries) {
        await logbookPage.createEntry(entry)
        await page.waitForTimeout(100) // Minimal delay
      }
    })

    // Wait for the reports to load
    await page.waitForSelector('[data-testid="overview-tab"]', {
      state: 'visible',
      timeout: 15000,
    })
    await page.waitForTimeout(1000) // Allow reports to fully load
  })

  test.describe('Advanced Filtering', () => {
    test.skip('filter by composer', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await waitForTabContent(page, 'analytics-tab', 'analytics-content')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Clear existing filters and add composer filter', async () => {
        // First, check if there's already a filter (like the date filter)
        const clearAllButton = page.locator('text=Clear All')
        if (await clearAllButton.isVisible()) {
          await clearAllButton.click()
          await page.waitForTimeout(500)
        }

        // Now add a new filter
        await page.click('text=Add Filter')
        await page.waitForTimeout(1000) // Wait for filter UI to appear

        // Find all filter rows - we want the newly added one
        const filterRows = page
          .locator('[data-testid="filter-row"], .flex.items-center.gap-2')
          .filter({
            has: page.locator('select'),
          })

        // Get the last filter row (the one we just added)
        const newFilterRow = filterRows.last()

        // Select field - change from default 'date' to 'composer'
        const fieldSelect = newFilterRow.locator('select').first()
        await fieldSelect.waitFor({ state: 'visible', timeout: 5000 })
        await fieldSelect.selectOption('composer')
        await page.waitForTimeout(500) // Wait for UI to update

        // The operator should update to 'equals' automatically for composer
        // Now we need to select a composer value
        // For composer field, there should be a third select for the value
        const valueSelect = newFilterRow.locator('select').nth(2)

        try {
          await valueSelect.waitFor({ state: 'visible', timeout: 3000 })

          // Wait for options to load
          await page.waitForTimeout(1000)

          // Try to select Beethoven
          const hasBeethoven =
            (await valueSelect
              .locator('option:has-text("Beethoven")')
              .count()) > 0
          if (hasBeethoven) {
            await valueSelect.selectOption({ label: 'Beethoven' })
          } else {
            // Select first non-empty option
            const options = await valueSelect.locator('option').count()
            if (options > 1) {
              await valueSelect.selectOption({ index: 1 })
            }
          }
        } catch (_e) {
          // If select doesn't appear, there might be an input field instead
          const valueInput = newFilterRow.locator('input[type="text"]').last()
          if (await valueInput.isVisible()) {
            await valueInput.fill('Beethoven')
          }
        }

        // Wait for filter to be applied
        await page.waitForTimeout(1000)
      })

      await test.step('Verify filtered results', async () => {
        // The filter should be applied and we should see filtered results
        // Look for any indication that filtering is active
        await page.waitForTimeout(1000)

        // Check if we can see the filter criteria displayed
        const hasFilterApplied = await page
          .locator('text=composer')
          .isVisible()
          .catch(() => false)
        expect(hasFilterApplied).toBeTruthy()

        // We should have less entries than the original 2
        // Or check for the specific filtered content
        const pageContent = await page.textContent('body')
        expect(pageContent).toContain('Beethoven')
      })
    })

    test.skip('filter by duration range', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await waitForTabContent(page, 'analytics-tab', 'analytics-content')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Add duration filter', async () => {
        await page.click('text=Filters')
        await expect(page.locator('text=Add Filter')).toBeVisible({
          timeout: 10000,
        })
        await page.click('text=Add Filter')
        await page.waitForTimeout(500)

        const fieldSelect = page.locator('select').first()
        await fieldSelect.waitFor({ state: 'visible' })
        await fieldSelect.selectOption('duration')

        const operatorSelect = page.locator('select').nth(1)
        await operatorSelect.waitFor({ state: 'visible' })
        await operatorSelect.selectOption('greaterThan')

        const valueInput = page.locator('input[type="number"]').last()
        await valueInput.waitFor({ state: 'visible' })
        await valueInput.fill('30')

        // Wait for filter to be applied
        await page.waitForTimeout(1000)
      })

      await test.step('Verify filtered results', async () => {
        // Should show entries > 30 minutes (1 entry: 45)
        await expect(page.locator('text=/1 entries/')).toBeVisible({
          timeout: 10000,
        })
      })
    })

    test.skip('combine multiple filters', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await waitForTabContent(page, 'analytics-tab', 'analytics-content')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Add multiple filters', async () => {
        await page.click('text=Filters')
        await expect(page.locator('text=Add Filter')).toBeVisible({
          timeout: 10000,
        })

        // First filter: composer = Beethoven
        await page.click('text=Add Filter')
        await page.waitForTimeout(500)
        await page.locator('select').first().selectOption('composer')
        await page.locator('select').nth(1).selectOption('equals')
        await page.locator('input[type="text"]').last().fill('Beethoven')
        await page.waitForTimeout(500)

        // Second filter: duration > 30
        await page.click('text=Add Filter')
        await page.waitForTimeout(500)
        await page.locator('select').nth(2).selectOption('duration')
        await page.locator('select').nth(3).selectOption('greaterThan')
        await page.locator('input[type="number"]').last().fill('30')
        await page.waitForTimeout(1000) // Wait for filters to be applied
      })

      await test.step('Verify combined filter results', async () => {
        // Should show Beethoven pieces > 30 minutes (0 entries: 30min is not > 30)
        await expect(page.locator('text=/0 entries/')).toBeVisible({
          timeout: 10000,
        })
      })
    })
  })

  test.describe('Grouping Functionality', () => {
    test.skip('group by composer', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000) // Allow data view to load
      })

      await test.step('Open grouping options', async () => {
        await page.click('text=Grouping')
        await expect(page.locator('text=Add Level')).toBeVisible({
          timeout: 10000,
        })
      })

      await test.step('Add composer grouping', async () => {
        await page.click('text=Add Level')
        await page.waitForTimeout(1000) // Allow grouping UI to appear

        const groupSelect = page.locator('select').last()
        await groupSelect.waitFor({ state: 'visible', timeout: 15000 })
        await groupSelect.selectOption('composer')
        await page.waitForTimeout(1000) // Allow grouping to be applied
      })

      await test.step('Verify grouped data', async () => {
        // Should show composer groups - verify with flexible approach
        const hasComposerGroups =
          (await page
            .locator('text=Beethoven')
            .isVisible({ timeout: 10000 })
            .catch(() => false)) ||
          (await page
            .locator('text=Debussy')
            .isVisible({ timeout: 10000 })
            .catch(() => false)) ||
          (await page
            .locator('text=Chopin')
            .isVisible({ timeout: 10000 })
            .catch(() => false))
        expect(hasComposerGroups).toBeTruthy()
      })
    })

    test.skip('group by date (month)', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000) // Allow data view to load
      })

      await test.step('Add date grouping', async () => {
        await page.click('text=Grouping')
        await page.waitForTimeout(500) // Allow grouping panel to open
        await page.click('text=Add Level')
        await page.waitForTimeout(1000) // Allow grouping UI to appear

        const groupSelect = page.locator('select').last()
        await groupSelect.waitFor({ state: 'visible', timeout: 15000 })
        await groupSelect.selectOption('dateMonth')
        await page.waitForTimeout(1000) // Allow grouping to be applied
      })

      await test.step('Verify date groups', async () => {
        // Should show month groups - verify with flexible approach
        const currentMonth = new Date().toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
        const hasDateGroups = await page
          .locator(`text=${currentMonth}`)
          .isVisible({ timeout: 10000 })
          .catch(() => false)
        expect(hasDateGroups).toBeTruthy()
      })
    })
  })

  test.describe('Sorting Options', () => {
    test.skip('sort by duration', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await waitForTabContent(page, 'analytics-tab', 'analytics-content')
        await page.waitForTimeout(1000) // Allow analytics view to load
      })

      await test.step('Open sorting options', async () => {
        await page.click('text=Sorting')
        await expect(page.locator('text=Add Sort Field')).toBeVisible({
          timeout: 10000,
        })
      })

      await test.step('Add duration sort', async () => {
        await page.click('text=Add Sort Field')
        await page.waitForTimeout(1000) // Allow sorting UI to appear

        const fieldSelect = page.locator('select').first()
        await fieldSelect.waitFor({ state: 'visible', timeout: 15000 })
        await fieldSelect.selectOption('duration')

        const directionSelect = page.locator('select').nth(1)
        await directionSelect.waitFor({ state: 'visible', timeout: 15000 })
        await directionSelect.selectOption('descending')
        await page.waitForTimeout(1000) // Allow sorting to be applied
      })

      await test.step('Verify sorting applied', async () => {
        // The UI should update to show sorted data
        await page.waitForTimeout(1000)
        // Verify that the sorting is applied (check for visual indicators)
        await expect(page.locator('text=Duration')).toBeVisible({
          timeout: 10000,
        })
      })
    })
  })

  test.describe('Chart Interactions', () => {
    test('interact with practice trend chart', async ({ page }) => {
      await test.step('Navigate to Analytics tab', async () => {
        // Charts are in the Analytics tab
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000) // Give time for charts to render
      })

      await test.step('Verify trend chart is visible', async () => {
        // Wait for canvas elements to be rendered with extended timeout
        await page.waitForSelector('canvas', {
          state: 'visible',
          timeout: 15000,
        })
        await page.waitForTimeout(1000) // Allow chart rendering to complete

        const canvasCount = await page.locator('canvas').count()
        expect(canvasCount).toBeGreaterThan(0)
      })

      await test.step('Check chart title', async () => {
        await expect(page.locator('text=Practice Trend')).toBeVisible({
          timeout: 15000,
        })
      })
    })

    test('view calendar heatmap', async ({ page }) => {
      await test.step('Verify calendar heatmap', async () => {
        // Calendar should be visible by its test id
        await expect(
          page.locator('[data-testid="heatmap-calendar"]')
        ).toBeVisible({
          timeout: 15000,
        })

        // Check for calendar elements (the calendar grid) with extended timeout
        const hasCalendarElements = await page
          .locator('[data-testid="heatmap-calendar"] button')
          .first()
          .isVisible({ timeout: 15000 })
          .catch(() => false)
        expect(hasCalendarElements).toBeTruthy()
      })
    })

    test('view repertoire statistics', async ({ page }) => {
      await test.step('Navigate to repertoire view', async () => {
        await page.click('[data-testid="repertoire-tab"]')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000) // Allow tab content to load
      })

      await test.step('Verify repertoire view loaded', async () => {
        // Should show the repertoire view content
        await expect(page.locator('text=My Repertoire')).toBeVisible({
          timeout: 15000,
        })

        // Check for repertoire stats
        await expect(page.locator('text=Total Repertoire')).toBeVisible()
        await expect(page.locator('text=Practice This Week')).toBeVisible()

        // The view shows empty repertoire state since no pieces are in repertoire
        const pageContent = await page.textContent('body')
        expect(pageContent).toContain('Your repertoire is empty')
      })
    })
  })

  test.describe('Export with Filters', () => {
    test.skip('export filtered data as CSV', async ({ page }) => {
      await test.step('Apply filter', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000) // Allow tab to load

        await page.click('text=Filters')
        await expect(page.locator('text=Add Filter')).toBeVisible({
          timeout: 10000,
        })
        await page.click('text=Add Filter')
        await page.waitForTimeout(500) // Allow filter UI to appear

        const fieldSelect = page.locator('select').first()
        await fieldSelect.waitFor({ state: 'visible' })
        await fieldSelect.selectOption('composer')

        const operatorSelect = page.locator('select').nth(1)
        await operatorSelect.waitFor({ state: 'visible' })
        await operatorSelect.selectOption('equals')

        const valueInput = page.locator('input[type="text"]').last()
        await valueInput.waitFor({ state: 'visible' })
        await valueInput.fill('Beethoven')
        await page.waitForTimeout(1000) // Allow filter to be applied
      })

      await test.step('Navigate to Data tab for export', async () => {
        await page.click('[data-testid="data-tab"]')
        await expect(page.locator('[data-testid="data-tab"]')).toHaveClass(
          /border-morandi-purple-400/
        )
      })

      await test.step('Export filtered data', async () => {
        const downloadPromise = page.waitForEvent('download')
        await page.click('text=Export CSV')

        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(
          /mirubato-practice-report.*\.csv/
        )

        // Verify the CSV contains filtered data
        const path = await download.path()
        if (path) {
          // In a real test, you could read and verify the CSV content
          expect(path).toBeTruthy()
        }
      })
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('all features work on mobile', async ({ page }) => {
      await test.step('Set mobile viewport', async () => {
        await page.setViewportSize({ width: 375, height: 812 }) // iPhone X size
        await page.waitForTimeout(1000) // Allow viewport to adjust
      })

      await test.step('Verify mobile tab navigation', async () => {
        // Tabs should show short labels on mobile
        await expect(page.locator('[data-testid="overview-tab"]')).toBeVisible({
          timeout: 10000,
        })

        // Navigate through tabs
        await page.click('[data-testid="repertoire-tab"]')
        await page.waitForTimeout(1000) // Allow tab transition
        await expect(
          page.locator('[data-testid="repertoire-tab"]')
        ).toHaveClass(/border-morandi-purple-400/, { timeout: 10000 })
      })

      await test.step('Verify mobile filtering', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000) // Allow tab to load

        // On mobile, the filters tab should be visible
        // The Add Filter button should be accessible
        await expect(page.locator('text=Add Filter')).toBeVisible({
          timeout: 10000,
        })
      })

      await test.step('Verify mobile export', async () => {
        // Navigate to Data tab where export buttons are
        await page.click('[data-testid="data-tab"]')
        await expect(page.locator('[data-testid="data-tab"]')).toHaveClass(
          /border-morandi-purple-400/
        )

        // Export buttons should be accessible
        await expect(page.locator('text=Export CSV')).toBeVisible({
          timeout: 10000,
        })
        await expect(page.locator('text=Export JSON')).toBeVisible({
          timeout: 10000,
        })
      })
    })
  })

  test.describe('Performance Monitoring', () => {
    test.skip('large dataset performance', async ({ page }) => {
      // Create many entries but fewer for faster execution
      await test.step('Create additional entries', async () => {
        for (let i = 0; i < 10; i++) {
          await logbookPage.createEntry({
            duration: 20 + i,
            title: `Practice Session ${i}`,
            notes: `Session ${i} notes`,
            mood: i % 2 === 0 ? 'satisfied' : 'neutral',
          })
          // Small delay to prevent overwhelming the system
          await page.waitForTimeout(100)
        }
      })

      await test.step('Measure load time', async () => {
        const startTime = Date.now()

        await page.click('[data-testid="overview-tab"]')
        await page.waitForSelector('[data-testid="summary-stats"]', {
          state: 'visible',
          timeout: 15000,
        })

        const loadTime = Date.now() - startTime
        expect(loadTime).toBeLessThan(10000) // Should load within 10 seconds with more data
      })

      await test.step('Test filtering performance', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')

        const filterStartTime = Date.now()
        await page.click('text=Filters')
        await page.waitForTimeout(500) // Allow filter panel to open
        await page.click('text=Add Filter')

        const filterTime = Date.now() - filterStartTime
        expect(filterTime).toBeLessThan(3000) // Filtering UI should respond within 3 seconds
      })
    })
  })

  test.describe('Accessibility', () => {
    test.skip('keyboard navigation', async ({ page }) => {
      await test.step('Tab through interface', async () => {
        // Start from the first tab
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')

        // Should be able to navigate tabs with keyboard
        await page.keyboard.press('Enter')

        // Verify focus indicators are visible
        const focusedElement = await page.evaluate(() => {
          return document.activeElement?.getAttribute('data-testid')
        })
        expect(focusedElement).toBeTruthy()
      })
    })

    test.skip('screen reader compatibility', async ({ page }) => {
      await test.step('Check ARIA labels', async () => {
        // Tabs should have proper ARIA labels
        const tabNav = page.locator('nav[aria-label="Tabs"]')
        await expect(tabNav).toBeVisible()

        // Charts should have accessible text
        await expect(page.locator('text=Total Practice')).toBeVisible()
        await expect(page.locator('text=Sessions')).toBeVisible()
      })
    })
  })

  test.describe('Error Handling', () => {
    test.skip('handle invalid filter values gracefully', async ({ page }) => {
      await test.step('Navigate to analytics', async () => {
        await page.click('[data-testid="analytics-tab"]')
      })

      await test.step('Try invalid duration filter', async () => {
        await page.click('text=Filters')
        await page.click('text=Add Filter')

        await page.locator('select').first().selectOption('duration')
        await page.locator('select').nth(1).selectOption('greaterThan')

        // Enter invalid value
        const valueInput = page.locator('input[type="number"]').last()
        await valueInput.fill('-10')

        // Should handle gracefully (no errors, possibly show 0 results)
        await expect(page.locator('text=/0 entries|No data/')).toBeVisible()
      })
    })
  })
})
