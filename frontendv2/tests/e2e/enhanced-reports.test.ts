import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'
import {
  waitForChartRender,
  waitForListItems,
  waitForElementStable,
  waitForTabContent,
} from './helpers/wait-helpers'

test.describe('Enhanced Reports', () => {
  test.setTimeout(60000) // Increase timeout to 60 seconds
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)
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
      timeout: 10000,
    })

    // Create minimal test data
    await test.step('Create test entries', async () => {
      // Create just 3 entries to speed up the test
      await logbookPage.createEntry({
        duration: 30,
        title: 'Moonlight Sonata',
        composer: 'Beethoven',
        notes: 'First movement practice',
        mood: 'satisfied',
      })

      await logbookPage.createEntry({
        duration: 45,
        title: 'Clair de Lune',
        composer: 'Debussy',
        notes: 'Working on dynamics',
        mood: 'excited',
      })

      await logbookPage.createEntry({
        duration: 60,
        title: 'Scales',
        notes: 'Technical practice',
        mood: 'neutral',
      })
    })

    // Switch to overview tab with a simpler approach
    await page.click('[data-testid="overview-tab"]')
    // Wait for the summary stats to be visible which indicates the tab is loaded
    await page.waitForSelector('[data-testid="summary-stats"]', {
      state: 'visible',
      timeout: 10000,
    })
  })

  test.describe('Report Views', () => {
    test('navigate between report tabs', async ({ page }) => {
      await test.step('Check all tabs are visible', async () => {
        await expect(page.locator('[data-testid="overview-tab"]')).toBeVisible()
        await expect(page.locator('[data-testid="pieces-tab"]')).toBeVisible()
        await expect(
          page.locator('[data-testid="analytics-tab"]')
        ).toBeVisible()
        await expect(page.locator('[data-testid="data-tab"]')).toBeVisible()
        await expect(page.locator('[data-testid="newEntry-tab"]')).toBeVisible()
      })

      await test.step('Navigate to pieces view', async () => {
        await logbookPage.switchToPiecesTab()
        // Verify pieces view loaded - check for active state
        const piecesTabClasses = await page
          .locator('[data-testid="pieces-tab"]')
          .getAttribute('class')
        expect(piecesTabClasses).toContain('border-morandi-purple-400')
      })

      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await waitForTabContent(page, 'analytics-tab', 'analytics-content')
        const analyticsTabClasses = await page
          .locator('[data-testid="analytics-tab"]')
          .getAttribute('class')
        expect(analyticsTabClasses).toContain('border-morandi-purple-400')
      })

      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await waitForTabContent(page, 'data-tab', 'data-table')
        const dataTabClasses = await page
          .locator('[data-testid="data-tab"]')
          .getAttribute('class')
        expect(dataTabClasses).toContain('border-morandi-purple-400')
      })
    })

    test('overview view displays statistics @smoke', async ({ page }) => {
      await test.step('Verify summary statistics', async () => {
        // Wait for stats to be visible
        const summaryStats = page.locator('[data-testid="summary-stats"]')
        await expect(summaryStats).toBeVisible()

        // Check total practice time using specific testid
        const totalTimeElement = page.locator(
          '[data-testid="total-practice-time"]'
        )
        await expect(totalTimeElement).toBeVisible()
        await expect(totalTimeElement).toContainText(/2h\s*15m/i)

        // Check session count using specific testid
        const sessionCountElement = page.locator(
          '[data-testid="session-count"]'
        )
        await expect(sessionCountElement).toBeVisible()
        await expect(sessionCountElement).toContainText('3')
      })

      await test.step('Verify practice streak info', async () => {
        await expect(page.getByText('Current Streak').first()).toBeVisible()
        await expect(page.getByText('Longest Streak').first()).toBeVisible()
        await expect(page.getByText('Total Days').first()).toBeVisible()
      })

      await test.step('Verify key sections are present', async () => {
        // Just verify the main sections are visible without checking specific implementation details
        await expect(
          page.getByRole('heading', { name: 'Practice Calendar' })
        ).toBeVisible()

        // Verify charts section
        await expect(
          page.getByRole('heading', { name: 'Practice Trend' })
        ).toBeVisible()

        // Verify distribution charts
        await expect(
          page.getByRole('heading', { name: 'Instrument Distribution' })
        ).toBeVisible()
      })
    })

    test('pieces view shows piece statistics', async ({ page }) => {
      await test.step('Navigate to pieces view', async () => {
        await logbookPage.switchToPiecesTab()
      })

      await test.step('Verify pieces are listed', async () => {
        // Check that pieces are displayed
        await expect(page.locator('text=Moonlight Sonata')).toBeVisible()
        await expect(page.locator('text=Clair de Lune')).toBeVisible()
        await expect(page.locator('text=Nocturne Op. 9 No. 2')).toBeVisible()
      })

      await test.step('Verify composers are shown', async () => {
        await expect(page.locator('text=Beethoven')).toBeVisible()
        await expect(page.locator('text=Debussy')).toBeVisible()
        await expect(page.locator('text=Chopin')).toBeVisible()
      })
    })

    test('analytics view allows filtering', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Check filter tabs', async () => {
        // Analytics view should have filter/grouping/sorting tabs
        await expect(
          page.getByRole('heading', { name: 'Filters' })
        ).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'Grouping' })
        ).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'Sorting' })
        ).toBeVisible()
      })

      await test.step('Verify analytics charts', async () => {
        // Should show trend analysis
        await expect(
          page.getByRole('heading', { name: 'Trend Analysis' })
        ).toBeVisible()

        // Key metrics should be visible
        await expect(
          page.locator('text=Average Session Duration')
        ).toBeVisible()
        await expect(page.locator('text=Practice Frequency')).toBeVisible()
      })
    })

    test('data view shows tabular data', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await waitForTabContent(page, 'data-tab', 'data-table')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Verify data table is displayed', async () => {
        // Should show entries in table format
        await expect(page.locator('table, [role="table"]').first()).toBeVisible(
          {
            timeout: 10000,
          }
        )
      })
    })
  })

  test.describe('Export Functionality', () => {
    test('export reports as CSV', async ({ page }) => {
      await test.step('Check export buttons', async () => {
        await expect(page.locator('text=Export CSV')).toBeVisible()
        await expect(page.locator('text=Export JSON')).toBeVisible()
      })

      await test.step('Export as CSV', async () => {
        // Set up download promise before clicking
        const downloadPromise = page.waitForEvent('download')
        await page.click('text=Export CSV')

        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(
          /mirubato-practice-report.*\.csv/
        )
      })
    })

    test('export reports as JSON', async ({ page }) => {
      await test.step('Export as JSON', async () => {
        // Set up download promise before clicking
        const downloadPromise = page.waitForEvent('download')
        await page.click('text=Export JSON')

        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(
          /mirubato-practice-report.*\.json/
        )
      })
    })
  })

  test.describe('Chart Rendering', () => {
    test('charts render without errors', async ({ page }) => {
      // Monitor console for Chart.js errors
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await test.step('Wait for charts to render', async () => {
        // Overview tab should be active by default
        await page.waitForLoadState('networkidle')
        // Wait for chart containers to be visible
        await waitForChartRender(page, '[data-testid="chart-canvas-wrapper"]')
      })

      await test.step('Verify no Chart.js errors', async () => {
        // Check that no "controller not registered" errors occurred
        const chartErrors = consoleErrors.filter(
          error =>
            error.includes('not a registered controller') ||
            error.includes('Chart.js')
        )
        expect(chartErrors).toHaveLength(0)
      })

      await test.step('Verify chart elements exist', async () => {
        // Canvas elements should be present for charts
        const canvasElements = await page.locator('canvas').count()
        expect(canvasElements).toBeGreaterThan(0)
      })
    })
  })

  test.describe('Responsive Design', () => {
    test('reports work on mobile viewport', async ({ page }) => {
      await test.step('Set mobile viewport', async () => {
        await page.setViewportSize({ width: 375, height: 667 })
      })

      await test.step('Verify mobile layout', async () => {
        // Tabs should still be visible
        await expect(page.locator('[data-testid="overview-tab"]')).toBeVisible()

        // Export buttons should be accessible
        await expect(page.locator('text=Export CSV')).toBeVisible()
      })

      await test.step('Navigate tabs on mobile', async () => {
        // Should be able to switch tabs
        await page.click('[data-testid="pieces-tab"]')
        await expect(page.locator('[data-testid="pieces-tab"]')).toHaveClass(
          /border-morandi-purple-400/
        )
      })
    })
  })

  test.describe('Performance', () => {
    test('reports load within acceptable time', async ({ page }) => {
      const startTime = Date.now()

      await test.step('Wait for reports to load', async () => {
        await expect(page.locator('[data-testid="summary-stats"]')).toBeVisible(
          {
            timeout: 5000,
          }
        )
      })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    })
  })

  test.describe('Data Accuracy', () => {
    test('statistics match actual data', async ({ page }) => {
      await test.step('Verify total practice time', async () => {
        // Total: 30+45+60+20+35 = 190 minutes = 3h 10m
        await expect(
          page
            .locator('[data-testid="summary-stats"]')
            .locator('text=/3h\\s*10m/i')
        ).toBeVisible()
      })

      await test.step('Verify session count', async () => {
        // Should show 5 sessions somewhere on the page
        const hasSessionCount = await page
          .locator('text=/5\\s*(sessions?)?/i')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        expect(hasSessionCount).toBeTruthy()
      })

      await test.step('Verify entry filtering', async () => {
        // Entry count should be displayed - updated to match the actual UI text
        await expect(page.locator('text=/5 entries/')).toBeVisible()
      })
    })
  })
})
