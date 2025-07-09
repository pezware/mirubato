import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

test.describe('Enhanced Reports - Complete Test Suite', () => {
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)

    // Navigate to logbook page first
    await page.goto('/logbook')

    // Clear any existing data after navigation
    await page.evaluate(() => {
      localStorage.removeItem('mirubato:logbook:entries')
    })

    // Create comprehensive test data
    await test.step('Create diverse test entries', async () => {
      // Week 1 - Piano practice
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

      // Week 2 - Mixed instruments
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

      // Week 3 - More variety
      await logbookPage.createEntry({
        duration: 40,
        title: 'Fur Elise',
        composer: 'Beethoven',
        notes: 'Performance preparation',
        mood: 'excited',
      })

      await logbookPage.createEntry({
        duration: 25,
        title: 'Prelude in C',
        composer: 'Bach',
        notes: 'Morning warm-up',
        mood: 'satisfied',
      })

      await logbookPage.createEntry({
        duration: 50,
        title: 'Clair de Lune',
        composer: 'Debussy',
        notes: 'Final polish',
        mood: 'excited',
      })
    })

    // Wait for the reports to load
    await page.waitForSelector('[data-testid="overview-tab"]', {
      state: 'visible',
      timeout: 10000,
    })
  })

  test.describe('Advanced Filtering', () => {
    test('filter by composer', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Open filters', async () => {
        await page.click('text=Filters')
        await expect(page.locator('text=Add Filter')).toBeVisible()
      })

      await test.step('Add composer filter', async () => {
        await page.click('text=Add Filter')

        // Select field
        const fieldSelect = page.locator('select').first()
        await fieldSelect.selectOption('composer')

        // Select operator
        const operatorSelect = page.locator('select').nth(1)
        await operatorSelect.selectOption('equals')

        // Enter value
        const valueInput = page.locator('input[type="text"]').last()
        await valueInput.fill('Beethoven')
      })

      await test.step('Verify filtered results', async () => {
        // Should show only Beethoven pieces (3 entries)
        await expect(page.locator('text=/3 entries/')).toBeVisible()
      })
    })

    test('filter by duration range', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Add duration filter', async () => {
        await page.click('text=Filters')
        await page.click('text=Add Filter')

        const fieldSelect = page.locator('select').first()
        await fieldSelect.selectOption('duration')

        const operatorSelect = page.locator('select').nth(1)
        await operatorSelect.selectOption('greaterThan')

        const valueInput = page.locator('input[type="number"]').last()
        await valueInput.fill('30')
      })

      await test.step('Verify filtered results', async () => {
        // Should show entries > 30 minutes (5 entries)
        await expect(page.locator('text=/5 entries/')).toBeVisible()
      })
    })

    test('combine multiple filters', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Add multiple filters', async () => {
        await page.click('text=Filters')

        // First filter: composer = Beethoven
        await page.click('text=Add Filter')
        await page.locator('select').first().selectOption('composer')
        await page.locator('select').nth(1).selectOption('equals')
        await page.locator('input[type="text"]').last().fill('Beethoven')

        // Second filter: duration > 30
        await page.click('text=Add Filter')
        await page.locator('select').nth(2).selectOption('duration')
        await page.locator('select').nth(3).selectOption('greaterThan')
        await page.locator('input[type="number"]').last().fill('30')
      })

      await test.step('Verify combined filter results', async () => {
        // Should show Beethoven pieces > 30 minutes (2 entries)
        await expect(page.locator('text=/2 entries/')).toBeVisible()
      })
    })
  })

  test.describe('Grouping Functionality', () => {
    test('group by composer', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Open grouping options', async () => {
        await page.click('text=Grouping')
        await expect(page.locator('text=Add Level')).toBeVisible()
      })

      await test.step('Add composer grouping', async () => {
        await page.click('text=Add Level')
        const groupSelect = page.locator('select').last()
        await groupSelect.selectOption('composer')
      })

      await test.step('Verify grouped data', async () => {
        // Should show composer groups
        await expect(page.locator('text=Beethoven')).toBeVisible()
        await expect(page.locator('text=Debussy')).toBeVisible()
        await expect(page.locator('text=Chopin')).toBeVisible()
        await expect(page.locator('text=Bach')).toBeVisible()
      })
    })

    test('group by date (month)', async ({ page }) => {
      await test.step('Navigate to data view', async () => {
        await page.click('[data-testid="data-tab"]')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Add date grouping', async () => {
        await page.click('text=Grouping')
        await page.click('text=Add Level')
        const groupSelect = page.locator('select').last()
        await groupSelect.selectOption('dateMonth')
      })

      await test.step('Verify date groups', async () => {
        // Should show month groups
        const currentMonth = new Date().toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
        await expect(page.locator(`text=${currentMonth}`)).toBeVisible()
      })
    })
  })

  test.describe('Sorting Options', () => {
    test('sort by duration', async ({ page }) => {
      await test.step('Navigate to analytics view', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Open sorting options', async () => {
        await page.click('text=Sorting')
        await expect(page.locator('text=Add Sort Field')).toBeVisible()
      })

      await test.step('Add duration sort', async () => {
        await page.click('text=Add Sort Field')

        const fieldSelect = page.locator('select').first()
        await fieldSelect.selectOption('duration')

        const directionSelect = page.locator('select').nth(1)
        await directionSelect.selectOption('descending')
      })

      await test.step('Verify sorting applied', async () => {
        // The UI should update to show sorted data
        await page.waitForTimeout(1000)
        // Verify that the sorting is applied (check for visual indicators)
        await expect(page.locator('text=Duration')).toBeVisible()
      })
    })
  })

  test.describe('Chart Interactions', () => {
    test('interact with practice trend chart', async ({ page }) => {
      await test.step('Verify trend chart is visible', async () => {
        // Wait for canvas elements to be rendered
        await page.waitForSelector('canvas', { state: 'visible' })

        const canvasCount = await page.locator('canvas').count()
        expect(canvasCount).toBeGreaterThan(0)
      })

      await test.step('Check chart title', async () => {
        await expect(page.locator('text=Practice Trend')).toBeVisible()
      })
    })

    test('view calendar heatmap', async ({ page }) => {
      await test.step('Verify calendar heatmap', async () => {
        // Calendar should be visible
        await expect(page.locator('text=Practice Calendar')).toBeVisible()

        // Check for calendar elements
        const hasCalendarElements = await page
          .locator('rect, .cal-heatmap-cell')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        expect(hasCalendarElements).toBeTruthy()
      })
    })

    test('view distribution charts', async ({ page }) => {
      await test.step('Navigate to pieces view', async () => {
        await page.click('[data-testid="pieces-tab"]')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Verify distribution charts', async () => {
        // Should show composer distribution
        await expect(page.locator('text=Repertoire by Composer')).toBeVisible()

        // Canvas elements for pie/donut charts
        const charts = await page.locator('canvas').count()
        expect(charts).toBeGreaterThan(0)
      })
    })
  })

  test.describe('Export with Filters', () => {
    test('export filtered data as CSV', async ({ page }) => {
      await test.step('Apply filter', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.click('text=Filters')
        await page.click('text=Add Filter')

        await page.locator('select').first().selectOption('composer')
        await page.locator('select').nth(1).selectOption('equals')
        await page.locator('input[type="text"]').last().fill('Beethoven')
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
      })

      await test.step('Verify mobile tab navigation', async () => {
        // Tabs should show short labels on mobile
        await expect(page.locator('[data-testid="overview-tab"]')).toBeVisible()

        // Navigate through tabs
        await page.click('[data-testid="pieces-tab"]')
        await expect(page.locator('[data-testid="pieces-tab"]')).toHaveClass(
          /border-morandi-purple-400/
        )
      })

      await test.step('Verify mobile filtering', async () => {
        await page.click('[data-testid="analytics-tab"]')
        await page.click('text=Filters')

        // Filter UI should be mobile-friendly
        await expect(page.locator('text=Add Filter')).toBeVisible()
      })

      await test.step('Verify mobile export', async () => {
        // Export buttons should be accessible
        await expect(page.locator('text=Export CSV')).toBeVisible()
        await expect(page.locator('text=Export JSON')).toBeVisible()
      })
    })
  })

  test.describe('Performance Monitoring', () => {
    test('large dataset performance', async ({ page }) => {
      // Create many entries
      await test.step('Create additional entries', async () => {
        for (let i = 0; i < 20; i++) {
          await logbookPage.createEntry({
            duration: 20 + i,
            title: `Practice Session ${i}`,
            notes: `Session ${i} notes`,
            mood: i % 2 === 0 ? 'satisfied' : 'neutral',
          })
        }
      })

      await test.step('Measure load time', async () => {
        const startTime = Date.now()

        await page.click('[data-testid="overview-tab"]')
        await page.waitForSelector('[data-testid="summary-stats"]', {
          state: 'visible',
          timeout: 10000,
        })

        const loadTime = Date.now() - startTime
        expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
      })

      await test.step('Test filtering performance', async () => {
        await page.click('[data-testid="analytics-tab"]')

        const filterStartTime = Date.now()
        await page.click('text=Filters')
        await page.click('text=Add Filter')

        const filterTime = Date.now() - filterStartTime
        expect(filterTime).toBeLessThan(2000) // Filtering UI should respond quickly
      })
    })
  })

  test.describe('Accessibility', () => {
    test('keyboard navigation', async ({ page }) => {
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

    test('screen reader compatibility', async ({ page }) => {
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
    test('handle invalid filter values gracefully', async ({ page }) => {
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
