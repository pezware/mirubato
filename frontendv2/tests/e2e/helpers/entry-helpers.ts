import { Page, expect } from '@playwright/test'

/**
 * Wait for entries to appear in the UI with multiple fallback strategies
 */
export async function waitForEntriesToAppear(
  page: Page,
  expectedCount?: number,
  options?: { timeout?: number }
) {
  const timeout = options?.timeout || 20000
  const startTime = Date.now()

  // First, verify entries exist in localStorage
  let entriesInStorage = 0
  while (Date.now() - startTime < timeout / 2) {
    entriesInStorage = await page.evaluate(() => {
      const stored = localStorage.getItem('mirubato:logbook:entries')
      const entries = stored ? JSON.parse(stored) : []
      return entries.length
    })

    if (entriesInStorage > 0) {
      console.log(`Found ${entriesInStorage} entries in localStorage`)
      break
    }

    await page.waitForTimeout(500)
  }

  if (entriesInStorage === 0) {
    throw new Error('No entries found in localStorage after creation')
  }

  // Strategy 1: Wait for the standard entry container
  try {
    await page.waitForSelector('div[class*="hover:bg-morandi-stone-50"]', {
      state: 'visible',
      timeout: timeout / 3,
    })
    return true
  } catch (e) {
    console.log('Standard selector failed, trying alternatives...')
  }

  // Strategy 2: Wait for any element that looks like an entry
  const alternativeSelectors = [
    '[class*="group flex"]',
    '[class*="p-4"][class*="hover:bg"]',
    '[class*="transition-all"][class*="duration-200"]',
    'div:has(> div > div > span:has-text("minute"))',
    'div:has(> div > div > span:has-text("PRACTICE"))',
    'div:has(> div > div > span:has-text("LESSON"))',
  ]

  for (const selector of alternativeSelectors) {
    try {
      const element = await page.waitForSelector(selector, {
        state: 'visible',
        timeout: 2000,
      })
      if (element) {
        console.log(`Found entry using selector: ${selector}`)
        return true
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  // Strategy 3: Wait for specific content
  const contentToFind = [
    'minutes',
    'minute',
    'PRACTICE',
    'LESSON',
    'Test Piece',
    'Test Composer',
  ]

  for (const text of contentToFind) {
    try {
      await page.waitForSelector(`text="${text}"`, {
        state: 'visible',
        timeout: 2000,
      })
      console.log(`Found entry by text: ${text}`)
      return true
    } catch (e) {
      // Continue to next text
    }
  }

  // Final strategy: Check if the page has any content at all
  const pageContent = await page.textContent('body')
  console.log('Page content preview:', pageContent?.substring(0, 500))

  // If we have expected count, verify it matches
  if (expectedCount !== undefined) {
    const actualCount = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        '[class*="hover:bg-morandi-stone"]'
      )
      return elements.length
    })

    if (actualCount >= expectedCount) {
      return true
    }
  }

  throw new Error(
    `Could not find entries in UI after ${timeout}ms. Found ${entriesInStorage} in storage.`
  )
}

/**
 * Navigate to Overview tab and wait for content
 */
export async function navigateToOverviewAndWait(page: Page) {
  // Check if Overview tab exists and is not already active
  const overviewTab = page
    .locator('button:has-text("Overview"), [role="tab"]:has-text("Overview")')
    .first()

  const isVisible = await overviewTab
    .isVisible({ timeout: 2000 })
    .catch(() => false)
  if (!isVisible) {
    console.log('Overview tab not found, might already be on overview page')
    return
  }

  // Check if already active
  const isActive = await overviewTab
    .getAttribute('class')
    .then(
      classes =>
        classes?.includes('bg-white') ||
        classes?.includes('text-morandi-stone-900')
    )
    .catch(() => false)

  if (!isActive) {
    await overviewTab.click()
    // Wait for tab content to load
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(() => {})
    await page.waitForTimeout(500) // Small delay for React to update
  }
}

/**
 * Verify entry was created successfully
 */
export async function verifyEntryCreated(
  page: Page,
  expectedData?: {
    duration?: number
    title?: string
    composer?: string
  }
) {
  // Check localStorage
  const entries = await page.evaluate(() => {
    const stored = localStorage.getItem('mirubato:logbook:entries')
    return stored ? JSON.parse(stored) : []
  })

  if (entries.length === 0) {
    throw new Error('No entries found in localStorage')
  }

  const latestEntry = entries[entries.length - 1]

  if (expectedData) {
    if (
      expectedData.duration &&
      latestEntry.duration !== expectedData.duration
    ) {
      throw new Error(
        `Expected duration ${expectedData.duration}, got ${latestEntry.duration}`
      )
    }

    if (
      expectedData.title &&
      !latestEntry.pieces.some((p: any) => p.title === expectedData.title)
    ) {
      throw new Error(
        `Expected title "${expectedData.title}" not found in entry`
      )
    }
  }

  return latestEntry
}
