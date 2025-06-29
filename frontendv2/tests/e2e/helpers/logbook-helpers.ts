import { Page } from '@playwright/test'

export async function navigateToOverviewTab(page: Page) {
  const overviewTab = page
    .locator('button:has-text("Overview"), [role="tab"]:has-text("Overview")')
    .first()
  if (await overviewTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await overviewTab.click()
    await page.waitForTimeout(1000)
  }
}

export async function waitForEntries(page: Page, expectedCount?: number) {
  await page.waitForSelector('div[class*="hover:bg-morandi-stone-50"]', {
    state: 'visible',
    timeout: 15000,
  })

  if (expectedCount !== undefined) {
    const count = await page
      .locator('div[class*="hover:bg-morandi-stone-50"]')
      .count()
    return count >= expectedCount
  }

  return true
}

export async function createLogbookEntry(
  page: Page,
  duration: string,
  title: string = 'Test Piece',
  composer: string = 'Test Composer',
  notes: string = 'Test notes'
) {
  // Look for add button
  const addButton = page
    .locator(
      'button:has-text("New Entry"), button:has-text("Add New Entry"), button:has-text("Add Entry")'
    )
    .first()
  await addButton.waitFor({ state: 'visible', timeout: 10000 })
  await addButton.click()

  // Wait for form to be ready
  await page.waitForSelector('form', { timeout: 10000 })
  await page.waitForSelector('input[type="number"]', { timeout: 5000 })

  // Fill duration
  const durationInput = page.locator('input[type="number"]').first()
  await durationInput.clear()
  await durationInput.fill(duration)

  // Fill piece information - handle autocomplete
  await page.fill(
    'input[placeholder="Piece title"], input[placeholder*="piece"], input[placeholder*="title"]',
    title
  )
  await page.waitForTimeout(400) // Wait for debounce
  await page.keyboard.press('Escape') // Close autocomplete

  await page.fill(
    'input[placeholder="Composer"], input[placeholder*="composer"]',
    composer
  )
  await page.waitForTimeout(400) // Wait for debounce
  await page.keyboard.press('Escape') // Close autocomplete

  // Add notes if provided
  if (notes) {
    const notesTextarea = page.locator('textarea').first()
    await notesTextarea.fill(notes)
  }

  // Select mood
  const moodButton = page.locator('button:has-text("😊")').first()
  if (await moodButton.isVisible({ timeout: 2000 })) {
    await moodButton.click()
  }

  // Save the entry
  const saveButton = page.locator('button[type="submit"]').last()
  await saveButton.click()

  // Wait for save to complete
  await page.waitForTimeout(2000)

  // Navigate to Overview tab to see the entry
  await navigateToOverviewTab(page)
}
