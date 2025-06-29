import { Page } from '@playwright/test'

export async function navigateToOverviewTab(page: Page) {
  const overviewTab = page
    .locator('button:has-text("Overview"), [role="tab"]:has-text("Overview")')
    .first()
  if (await overviewTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await overviewTab.click()
    // Wait for content to load instead of fixed timeout
    await page.waitForLoadState('domcontentloaded')
  }
}

export async function waitForEntries(page: Page, expectedCount?: number) {
  // Use multiple strategies to find entries
  const entrySelectors = [
    '.p-4.hover\\:bg-morandi-stone-50', // Escaped colon for Tailwind classes
    '[class*="p-4"][class*="hover"][class*="bg-morandi"]',
    '.group.cursor-pointer',
    'div:has(> div > div > span)', // Structure-based selector
  ]

  // Try each selector until one works
  for (const selector of entrySelectors) {
    try {
      if (expectedCount !== undefined) {
        // Wait for specific count of entries
        await page.waitForFunction(
          args => {
            const elements = document.querySelectorAll(args.selector)
            return elements.length >= args.count
          },
          { selector, count: expectedCount },
          { timeout: 3000 }
        )
        return true
      } else {
        // Just wait for at least one entry
        await page.waitForSelector(selector, {
          state: 'visible',
          timeout: 3000,
        })
        return true
      }
    } catch (e) {
      // Try next selector
      continue
    }
  }

  // If all selectors fail, wait for text content
  await page.waitForSelector('text=/\\d+\\s*(minutes?|m)/', {
    state: 'visible',
    timeout: 10000,
  })
  return true
}

export async function createLogbookEntry(
  page: Page,
  duration: string,
  title: string = 'Test Piece',
  composer: string = 'Test Composer',
  notes: string = 'Test notes'
) {
  // Look for add button with shorter timeout
  const addButton = page
    .locator(
      'button:has-text("New Entry"), button:has-text("Add New Entry"), button:has-text("Add Entry")'
    )
    .first()
  await addButton.waitFor({ state: 'visible', timeout: 5000 })
  await addButton.click()

  // Wait for form to be ready - use Promise.all for parallel waiting
  await Promise.all([
    page.waitForSelector('form', { timeout: 5000 }),
    page.waitForSelector('input[type="number"]', { timeout: 5000 }),
  ])

  // Fill all form fields in parallel where possible
  const fillPromises = []

  // Duration
  const durationInput = page.locator('input[type="number"]').first()
  fillPromises.push(
    durationInput.clear().then(() => durationInput.fill(duration))
  )

  // Piece title
  const titleInput = page
    .locator(
      'input[placeholder="Piece title"], input[placeholder*="piece"], input[placeholder*="title"]'
    )
    .first()
  fillPromises.push(
    titleInput.fill(title).then(() => page.keyboard.press('Escape'))
  )

  // Composer
  const composerInput = page
    .locator('input[placeholder="Composer"], input[placeholder*="composer"]')
    .first()
  fillPromises.push(
    composerInput.fill(composer).then(() => page.keyboard.press('Escape'))
  )

  // Notes
  if (notes) {
    const notesTextarea = page.locator('textarea').first()
    fillPromises.push(notesTextarea.fill(notes))
  }

  // Execute all fills in parallel
  await Promise.all(fillPromises)

  // Select mood if visible
  const moodButton = page.locator('button:has-text("😊")').first()
  if (await moodButton.isVisible({ timeout: 1000 })) {
    await moodButton.click()
  }

  // Save the entry
  const saveButton = page.locator('button[type="submit"]').last()
  await saveButton.click()

  // Wait for save indication - use multiple strategies
  await Promise.race([
    page.waitForSelector('text=saved', { timeout: 3000 }).catch(() => {}),
    page.waitForSelector('text=success', { timeout: 3000 }).catch(() => {}),
    page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {}),
    page.waitForTimeout(2000), // Increased fallback timeout
  ])

  // Verify the entry was saved to localStorage
  const savedEntries = await page.evaluate(() => {
    const stored = localStorage.getItem('mirubato:logbook:entries')
    return stored ? JSON.parse(stored) : []
  })

  if (savedEntries.length === 0) {
    throw new Error('Entry was not saved to localStorage')
  }

  // Navigate to Overview tab to see the entry
  await navigateToOverviewTab(page)
}
