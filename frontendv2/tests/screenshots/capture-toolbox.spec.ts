import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


const SCREENSHOT_DIR = path.resolve(__dirname, '../../../remotion-tutorial/public/screenshots/toolbox')

test.describe('Toolbox Screenshots for Tutorial Video', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to match video resolution
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  // Helper to dismiss any modal overlay that might appear
  async function dismissModalIfPresent(page: import('@playwright/test').Page) {
    const modalOverlay = page.locator('.fixed.inset-0.z-50.bg-black\\/30')
    if (await modalOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try to close the modal by clicking its close button or pressing Escape
      const closeButton = page.locator('[aria-label="Close"], button:has-text("Close"), button:has-text("Got it"), button:has-text("OK")').first()
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click()
      } else {
        // Press Escape as fallback
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(500)
    }
  }

  test('capture metronome tab', async ({ page }) => {
    await page.goto('/toolbox')

    await page.waitForLoadState('networkidle')
    await dismissModalIfPresent(page)

    // Metronome is the default tab - wait for the metronome content to be visible
    await page.waitForSelector('[data-testid="metronome-tab"], text=Metronome', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // Capture full metronome view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'metronome-full.png'),
      fullPage: false
    })

    // Capture just the control panel (left side)
    const controlPanel = page.locator('.lg\\:w-1\\/3').first()
    if (await controlPanel.isVisible()) {
      await controlPanel.screenshot({
        path: path.join(SCREENSHOT_DIR, 'metronome-controls.png')
      })
    }

    // Capture the beat pattern grid (right side)
    const patternGrid = page.locator('.lg\\:w-2\\/3').first()
    if (await patternGrid.isVisible()) {
      await patternGrid.screenshot({
        path: path.join(SCREENSHOT_DIR, 'metronome-pattern.png')
      })
    }

    // Capture just the play button and BPM display
    const bpmSection = page.locator('.text-4xl.font-bold').first().locator('..').locator('..')
    if (await bpmSection.isVisible()) {
      await bpmSection.screenshot({
        path: path.join(SCREENSHOT_DIR, 'metronome-bpm.png')
      })
    }
  })

  test('capture practice counter tab', async ({ page }) => {
    await page.goto('/toolbox')

    await page.waitForLoadState('networkidle')
    await dismissModalIfPresent(page)
    await page.waitForTimeout(1000)

    // Click on Counter tab
    const counterTab = page.locator('[data-testid="counter-tab"]')
    await counterTab.click()
    await page.waitForTimeout(1500)

    // Capture full counter view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'counter-full.png'),
      fullPage: false
    })

    // Try to capture the counter component
    const counterComponent = page.locator('text=Practice Counter').locator('..').locator('..')
    if (await counterComponent.count() > 0) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'counter-active.png'),
        fullPage: false,
        clip: {
          x: 200,
          y: 150,
          width: 1520,
          height: 800
        }
      })
    }
  })

  test('capture circle of fifths tab', async ({ page }) => {
    await page.goto('/toolbox')

    await page.waitForLoadState('networkidle')
    await dismissModalIfPresent(page)
    await page.waitForTimeout(1000)

    // Click on Circle of Fifths tab
    const circleTab = page.locator('[data-testid="circle-of-fifths-tab"]')
    await circleTab.click()
    await page.waitForTimeout(1500)

    // Capture full circle of fifths view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'circle-of-fifths-full.png'),
      fullPage: false
    })

    // Try to capture just the circle
    const circleElement = page.locator('svg').first()
    if (await circleElement.isVisible()) {
      const circleContainer = circleElement.locator('..')
      await circleContainer.screenshot({
        path: path.join(SCREENSHOT_DIR, 'circle-of-fifths-diagram.png')
      })
    }
  })

  test('capture dictionary tab', async ({ page }) => {
    await page.goto('/toolbox')

    await page.waitForLoadState('networkidle')
    await dismissModalIfPresent(page)
    await page.waitForTimeout(1000)

    // Click on Dictionary tab
    const dictionaryTab = page.locator('[data-testid="dictionary-tab"]')
    await dictionaryTab.click()
    await page.waitForTimeout(1500)

    // Capture dictionary view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dictionary-full.png'),
      fullPage: false
    })
  })

  test('capture all tabs in sequence', async ({ page }) => {
    await page.goto('/toolbox')
    await page.waitForLoadState('networkidle')
    await dismissModalIfPresent(page)

    // Capture navigation header with all tabs visible
    const tabsContainer = page.locator('nav').first()
    if (await tabsContainer.isVisible()) {
      await tabsContainer.screenshot({
        path: path.join(SCREENSHOT_DIR, '../common/toolbox-tabs.png')
      })
    }
  })
})
