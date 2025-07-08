import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

test.describe('Enhanced Reports', () => {
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)

    // Clear any existing data
    await page.evaluate(() => {
      localStorage.removeItem('mirubato:logbook:entries')
    })

    // Navigate directly to logbook page
    await page.goto('/logbook')

    // Create test data with various entries
    await test.step('Create test entries', async () => {
      // Week 1 entries
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

      // Week 2 entries
      await logbookPage.createEntry({
        duration: 60,
        title: 'Moonlight Sonata',
        composer: 'Beethoven',
        notes: 'Second movement',
        mood: 'satisfied',
      })

      await logbookPage.createEntry({
        duration: 20,
        title: 'Scales and Arpeggios',
        notes: 'Technical practice',
        mood: 'neutral',
      })

      await logbookPage.createEntry({
        duration: 35,
        title: 'Nocturne Op. 9 No. 2',
        composer: 'Chopin',
        notes: 'New piece sight reading',
        mood: 'satisfied',
      })
    })

    // Wait for the reports to load
    await page.waitForSelector('[data-testid="overview-tab"]', {
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
        await expect(
          page.locator('[data-testid="new-entry-tab"]')
        ).toBeVisible()
      })

      await test.step('Navigate to pieces view', async () => {
        await page.click('[data-testid="pieces-tab"]')
        await page.waitForTimeout(1000)
        // Verify pieces view loaded - check for active state
        const piecesTabClasses = await page
          .locator('[data-testid="pieces-tab"]')
          .getAttribute('class')
        expect(piecesTabClasses).toContain('bg-white')
      })

      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForTimeout(1000)
        const analyticsTabClasses = await page
          .locator('[data-testid="analytics-tab"]')
          .getAttribute('class')
        expect(analyticsTabClasses).toContain('bg-white')
      })

      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await page.waitForTimeout(1000)
        const dataTabClasses = await page
          .locator('[data-testid="data-tab"]')
          .getAttribute('class')
        expect(dataTabClasses).toContain('bg-white')
      })
    })

    test('overview view displays statistics @smoke', async ({ page }) => {
      await test.step('Verify summary statistics', async () => {
        // Wait for stats to load - look for the total practice time text
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000) // Give time for data to render

        // Check total practice time (30+45+60+20+35 = 190 minutes = 3h 10m)
        await expect(page.locator('text=/3h\\s*10m/i')).toBeVisible()

        // Check session count - look for "5 sessions" or just "5"
        await expect(
          page.locator('text=/5\\s*(sessions?)?/i').first()
        ).toBeVisible()
      })

      await test.step('Verify practice streak info', async () => {
        await expect(page.locator('text=Current Streak')).toBeVisible()
        await expect(page.locator('text=Longest Streak')).toBeVisible()
        await expect(page.locator('text=Total Days')).toBeVisible()
      })

      await test.step('Verify calendar heatmap', async () => {
        // Calendar should be visible - look for canvas or svg elements
        const hasCalendar = await page
          .locator('canvas, svg')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        expect(hasCalendar).toBeTruthy()
      })
    })

    test('pieces view shows piece statistics', async ({ page }) => {
      await test.step('Navigate to pieces view', async () => {
        await page.click('[data-testid="pieces-tab"]')
        await page.waitForLoadState('networkidle')
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
        await expect(page.locator('text=Filters')).toBeVisible()
        await expect(page.locator('text=Grouping')).toBeVisible()
        await expect(page.locator('text=Sorting')).toBeVisible()
      })

      await test.step('Verify analytics charts', async () => {
        // Should show trend analysis
        await expect(page.locator('text=Trend Analysis')).toBeVisible()

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
        await page.waitForTimeout(2000) // Give charts time to render
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
          /bg-white/
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
        await expect(page.locator('text=/3h\\s*10m/i')).toBeVisible()
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
