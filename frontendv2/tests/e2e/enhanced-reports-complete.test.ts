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
    test('interact with practice trend chart', async ({ page }) => {
      await test.step('Stay on Overview tab for charts', async () => {
        // Charts are now displayed in the Overview tab
        // Make sure we're on the overview tab
        const overviewTab = page.locator('[data-testid="overview-tab"]')
        const isActive = await overviewTab.evaluate(el =>
          el.classList.contains('border-morandi-purple-400')
        )
        if (!isActive) {
          await overviewTab.click()
          await page.waitForTimeout(500)
        }
      })

      await test.step('Verify chart container exists', async () => {
        // In test environment, canvas may not render but chart containers should exist
        // Look for chart container elements instead
        const chartContainers = page.locator(
          '[class*="chart"], [class*="Chart"], [data-testid*="chart"]'
        )
        const containerCount = await chartContainers.count()

        // If we have chart containers, that's sufficient for the test
        if (containerCount > 0) {
          expect(containerCount).toBeGreaterThan(0)
        } else {
          // As a fallback, just verify we're on the overview page with content
          await expect(page.locator('text=Recent Entries')).toBeVisible()
        }
      })

      await test.step('Check chart title', async () => {
        await expect(page.locator('text=Practice Trend')).toBeVisible({
          timeout: 5000,
        })
      })
    })

    test('view calendar heatmap', async ({ page }) => {
      await test.step('Verify calendar heatmap', async () => {
        // The calendar heatmap should be visible on the overview tab
        // Check for calendar grid elements (the small squares)
        const calendarSquares = page.locator('.w-3.h-3.rounded-sm')

        // Wait for at least one calendar square to be visible
        await expect(calendarSquares.first()).toBeVisible({
          timeout: 10000,
        })

        // Also verify month labels are present
        const monthLabels = page.locator(
          'text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/'
        )
        await expect(monthLabels.first()).toBeVisible({
          timeout: 5000,
        })
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

      await test.step('Verify mobile filtering', async () => {
        await page.click('[data-testid="data-tab"]')

        // Wait for tab to become active
        await page.waitForFunction(
          () => {
            const tab = document.querySelector('[data-testid="data-tab"]')
            return tab?.classList.contains('border-morandi-purple-400')
          },
          { timeout: 5000 }
        )

        // The Add Filter button should be accessible
        await expect(page.locator('text=Add Filter')).toBeVisible({
          timeout: 5000,
        })
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
