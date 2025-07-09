import { Page, Locator } from '@playwright/test'

/**
 * Wait for an element to be stable (not moving/animating)
 */
export async function waitForElementStable(
  locator: Locator,
  options = { timeout: 5000 }
) {
  await locator.waitFor({ state: 'visible', ...options })

  // Wait for element to stop moving
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element not found')

  await locator.page().waitForFunction(
    ([selector, initialBox]) => {
      const element = document.querySelector(selector)
      if (!element) return false

      const currentBox = element.getBoundingClientRect()
      return (
        currentBox.x === initialBox.x &&
        currentBox.y === initialBox.y &&
        currentBox.width === initialBox.width &&
        currentBox.height === initialBox.height
      )
    },
    [
      await locator
        .elementHandle()
        .then(h => h?.getAttribute('data-testid') || ''),
      box,
    ],
    { timeout: options.timeout }
  )
}

/**
 * Wait for data to load in a list
 */
export async function waitForListItems(
  page: Page,
  selector: string,
  minCount: number,
  options = { timeout: 10000 }
) {
  await page.waitForFunction(
    ([sel, count]) => {
      const items = document.querySelectorAll(sel)
      return items.length >= count
    },
    [selector, minCount],
    options
  )
}

/**
 * Wait for charts to render
 */
export async function waitForChartRender(
  page: Page,
  chartSelector = 'canvas',
  options = { timeout: 5000, retries: 3 }
) {
  for (let i = 0; i < options.retries; i++) {
    try {
      // Wait for canvas element
      await page.waitForSelector(chartSelector, {
        state: 'visible',
        timeout: options.timeout,
      })

      // Wait for chart to have content
      await page.waitForFunction(
        selector => {
          const canvas = document.querySelector(selector) as HTMLCanvasElement
          if (!canvas) return false

          const ctx = canvas.getContext('2d')
          if (!ctx) return false

          // Check if canvas has been drawn on
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          return imageData.data.some(pixel => pixel !== 0)
        },
        chartSelector,
        { timeout: options.timeout }
      )

      return
    } catch (error) {
      if (i === options.retries - 1) throw error
      // Wait a bit before retry
      await page.waitForTimeout(500)
    }
  }
}

/**
 * Wait for network idle with custom conditions
 */
export async function waitForDataLoad(
  page: Page,
  options = {
    timeout: 10000,
    waitForSelector: '[data-testid="data-loaded"]',
    waitForNetwork: true,
  }
) {
  const promises: Promise<unknown>[] = []

  if (options.waitForNetwork) {
    promises.push(
      page.waitForLoadState('networkidle', { timeout: options.timeout })
    )
  }

  if (options.waitForSelector) {
    promises.push(
      page.waitForSelector(options.waitForSelector, {
        state: 'visible',
        timeout: options.timeout,
      })
    )
  }

  await Promise.all(promises)
}

/**
 * Wait for animations to complete
 */
export async function waitForAnimations(page: Page) {
  await page.waitForFunction(() => {
    const animations = document.getAnimations()
    return (
      animations.length === 0 ||
      animations.every(a => a.playState !== 'running')
    )
  })
}

/**
 * Smart wait for tab content
 */
export async function waitForTabContent(
  page: Page,
  tabTestId: string,
  contentTestId: string,
  options = { timeout: 5000 }
) {
  // Click the tab
  await page.click(`[data-testid="${tabTestId}"]`)

  // Wait for tab to be active
  await page.waitForSelector(
    `[data-testid="${tabTestId}"][class*="border-morandi-purple"]`,
    { timeout: options.timeout }
  )

  // Wait for content to be visible
  await page.waitForSelector(`[data-testid="${contentTestId}"]`, {
    state: 'visible',
    timeout: options.timeout,
  })

  // Wait for any animations
  await waitForAnimations(page)
}

/**
 * Retry an action with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options = {
    retries: 3,
    initialDelay: 100,
    maxDelay: 2000,
    backoffFactor: 2,
  }
): Promise<T> {
  let lastError: Error
  let delay = options.initialDelay

  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < options.retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * options.backoffFactor, options.maxDelay)
      }
    }
  }

  throw lastError!
}
