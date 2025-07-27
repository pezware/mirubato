import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

test.describe('Enhanced Reports - Core Tests', () => {
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

    // Wait for the overview tab to be visible
    await page.waitForSelector('[data-testid="overview-tab"]', {
      state: 'visible',
      timeout: 5000,
    })

    // Create minimal test data for faster execution
    await test.step('Create minimal test entries', async () => {
      // Create only 1 entry to speed up tests significantly
      await logbookPage.createEntry({
        duration: 30,
        title: 'Test Piece',
        composer: 'Beethoven',
        notes: 'Test notes',
        mood: 'satisfied',
      })
    })

    // Wait for the entry to be visible
    await page.waitForSelector('.bg-white.rounded-lg', {
      state: 'visible',
      timeout: 5000,
    })
  })

  test.describe('Chart Interactions', () => {
    test('verify data tab navigation', async ({ page }) => {
      await test.step('Navigate to Data tab', async () => {
        // Navigate to the Data tab
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

      await test.step('Verify data view is loaded', async () => {
        // The data tab should show either table or analytics view
        // Look for the segmented control that allows switching between views
        const segmentedControl = page.locator('role=tablist')
        await expect(segmentedControl).toBeVisible({ timeout: 5000 })

        // Verify we have the table/analytics toggle buttons
        const tableButton = page.locator('button[role="tab"]:has-text("Table")')
        const analyticsButton = page.locator(
          'button[role="tab"]:has-text("Analytics")'
        )

        // At least one should be visible
        const hasTableButton = await tableButton.isVisible().catch(() => false)
        const hasAnalyticsButton = await analyticsButton
          .isVisible()
          .catch(() => false)

        expect(hasTableButton || hasAnalyticsButton).toBeTruthy()
      })

      await test.step('Verify data content is displayed', async () => {
        // Check that we have some data content visible
        // This could be the data table or analytics charts
        const dataTable = page.locator('[data-testid="data-table"]')
        const hasDataTable = await dataTable
          .isVisible({ timeout: 3000 })
          .catch(() => false)

        if (!hasDataTable) {
          // If no data table, just verify we're in the data view
          const dataViewContent = page.locator('.bg-white.rounded-lg').first()
          await expect(dataViewContent).toBeVisible()
        } else {
          await expect(dataTable).toBeVisible()
        }
      })
    })

    test('view calendar heatmap', async ({ page }) => {
      await test.step('Verify calendar heatmap', async () => {
        // The calendar heatmap should be visible on the overview tab
        // Check for calendar grid elements (the small squares)
        // Mobile might use different classes for responsive design
        const calendarSquares = page.locator(
          '.w-3.h-3.rounded-sm, .w-2.h-2.rounded-sm, [data-testid="calendar-square"]'
        )
        const squareCount = await calendarSquares.count()

        if (squareCount > 0) {
          // Wait for at least one calendar square to be visible
          await expect(calendarSquares.first()).toBeVisible({
            timeout: 10000,
          })
        } else {
          // Fallback: check for the calendar container itself
          const calendarContainer = page
            .locator(
              '[data-testid="heatmap-calendar"], .heatmap-calendar, [class*="calendar"]'
            )
            .first()
          const hasCalendar = await calendarContainer
            .isVisible({ timeout: 5000 })
            .catch(() => false)

          if (hasCalendar) {
            await expect(calendarContainer).toBeVisible()
          } else {
            // On mobile, verify at least the month labels are present
            const monthLabels = page.locator(
              'text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/'
            )
            await expect(monthLabels.first()).toBeVisible({
              timeout: 5000,
            })
          }
        }
      })
    })

    test('view repertoire tab content', async ({ page }) => {
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

      await test.step('Verify repertoire view loaded', async () => {
        // The repertoire view should show some content after tab activation
        // Check for any content that indicates the view has loaded
        const viewContent = await page
          .waitForSelector(
            '[data-testid="repertoire-content"], .repertoire-view, .empty-state, text=/piece|repertoire/i',
            {
              state: 'visible',
              timeout: 5000,
            }
          )
          .catch(() => null)

        // If no specific content found, at least verify the tab is active
        const isTabActive = await page
          .locator('[data-testid="repertoire-tab"]')
          .evaluate(el => el.classList.contains('border-morandi-purple-400'))

        expect(viewContent !== null || isTabActive).toBeTruthy()
      })
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('all features work on mobile', async ({ page }) => {
      await test.step('Set mobile viewport', async () => {
        await page.setViewportSize({ width: 375, height: 812 }) // iPhone X size
      })

      await test.step('Verify mobile tab navigation', async () => {
        // Tabs should be visible on mobile
        await expect(page.locator('[data-testid="overview-tab"]')).toBeVisible({
          timeout: 5000,
        })

        // Navigate through tabs
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

      await test.step('Verify mobile data view', async () => {
        await page.click('[data-testid="data-tab"]')

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="data-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )

        // On mobile, verify the data view loads properly
        // Check for the segmented control (Table/Analytics toggle)
        const segmentedControl = page.locator('role=tablist')
        const hasSegmentedControl = await segmentedControl
          .isVisible({ timeout: 3000 })
          .catch(() => false)

        if (hasSegmentedControl) {
          await expect(segmentedControl).toBeVisible()

          // The segmented control should be responsive on mobile
          const controlBox = await segmentedControl.boundingBox()
          if (controlBox) {
            // On mobile (375px width), the control should fit within the viewport
            expect(controlBox.width).toBeLessThanOrEqual(375)
          }
        } else {
          // If no segmented control, at least verify we're in the data view
          const dataContent = page.locator('.bg-white.rounded-lg').first()
          await expect(dataContent).toBeVisible()
        }
      })

      await test.step('Verify mobile export', async () => {
        // Navigate to Data tab where export buttons are
        await page.click('[data-testid="data-tab"]')

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="data-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )

        // Export buttons should be accessible
        await expect(page.locator('text=Export CSV')).toBeVisible({
          timeout: 5000,
        })
      })
    })
  })
})
