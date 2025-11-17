import { test } from '@playwright/test'
import path from 'path'
import { seedPracticeData, seedRepertoireData } from './seed-data'

const SCREENSHOT_DIR = path.resolve(__dirname, '../../../remotion-tutorial/public/screenshots/logbook')

test.describe('Logbook Screenshots for Tutorial Video', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to match video resolution
    await page.setViewportSize({ width: 1920, height: 1080 })

    // Seed sample data for realistic screenshots
    await page.goto('/')
    await seedPracticeData(page)
    await seedRepertoireData(page)
    await page.reload()
  })

  test('capture overview with stats', async ({ page }) => {
    await page.goto('/logbook')

    // Wait for the main content to load
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.p-3', { timeout: 10000 })

    // Give charts time to render
    await page.waitForTimeout(2000)

    // Capture the full overview section
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'overview-full.png'),
      fullPage: false
    })

    // Try to capture just the stats section if it exists
    const statsElement = page.locator('[data-testid="summary-stats"]').first()
    if (await statsElement.isVisible()) {
      await statsElement.screenshot({
        path: path.join(SCREENSHOT_DIR, 'summary-stats.png')
      })
    }
  })

  test('capture data view with entries', async ({ page }) => {
    await page.goto('/logbook?tab=data')

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Capture the data view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'data-view.png'),
      fullPage: false
    })

    // Capture entry list if visible
    const entryList = page.locator('[data-testid="logbook-entry"]').first()
    if (await entryList.isVisible()) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'entries-list.png'),
        fullPage: false,
        clip: {
          x: 0,
          y: 100,
          width: 1920,
          height: 700
        }
      })
    }
  })

  test('capture repertoire view', async ({ page }) => {
    await page.goto('/logbook?tab=repertoire')

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'repertoire-view.png'),
      fullPage: false
    })
  })

  test('capture charts and analytics', async ({ page }) => {
    await page.goto('/logbook')

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Find chart container (Chart.js canvas elements)
    const chartCanvas = page.locator('canvas').first()
    if (await chartCanvas.isVisible()) {
      const chartContainer = chartCanvas.locator('..')
      await chartContainer.screenshot({
        path: path.join(SCREENSHOT_DIR, 'practice-chart.png')
      })
    }
  })
})
