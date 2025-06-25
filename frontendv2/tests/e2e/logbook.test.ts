import { test, expect } from '@playwright/test'
// Note: Stagehand integration would be added here once the package is available

test.describe('Logbook Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Anonymous user can create and view logbook entries', async ({
    page,
  }) => {
    // Navigate to logbook
    await page.click('text=Logbook')
    await expect(page).toHaveURL('/logbook')

    // Click add entry button
    await page.click('button:has-text("Add Entry")')

    // Fill out the form
    await page.fill('input[name="duration"]', '30')
    await page.selectOption('select[name="instrument"]', 'PIANO')
    await page.selectOption('select[name="type"]', 'PRACTICE')

    // Add a piece
    await page.fill('input[placeholder="Piece title"]', 'Moonlight Sonata')
    await page.fill('input[placeholder="Composer"]', 'Beethoven')

    // Add notes
    await page.fill(
      'textarea[name="notes"]',
      'Worked on first movement, focusing on dynamics'
    )

    // Select mood
    await page.click('text=Satisfied')

    // Save the entry
    await page.click('button:has-text("Save")')

    // Verify entry appears in the list
    await expect(page.locator('text=Moonlight Sonata')).toBeVisible()
    await expect(page.locator('text=30 minutes')).toBeVisible()
    await expect(page.locator('text=Beethoven')).toBeVisible()
  })

  test('User can search logbook entries', async ({ page }) => {
    // Navigate to logbook
    await page.click('text=Logbook')

    // Search for specific entry
    await page.fill('input[placeholder="Search entries..."]', 'Beethoven')

    // Verify filtered results
    await expect(page.locator('text=Beethoven')).toBeVisible()
    await expect(page.locator('text=Mozart')).not.toBeVisible()
  })

  test('User can edit logbook entry', async ({ page }) => {
    // Navigate to logbook
    await page.click('text=Logbook')

    // Click on an existing entry
    await page.click('text=Moonlight Sonata')

    // Click edit button
    await page.click('button[aria-label="Edit entry"]')

    // Update duration
    await page.fill('input[name="duration"]', '45')

    // Save changes
    await page.click('button:has-text("Save")')

    // Verify updated entry
    await expect(page.locator('text=45 minutes')).toBeVisible()
  })

  test('User can delete logbook entry', async ({ page }) => {
    // Navigate to logbook
    await page.click('text=Logbook')

    // Click on an existing entry
    await page.click('text=Moonlight Sonata')

    // Click delete button
    await page.click('button[aria-label="Delete entry"]')

    // Confirm deletion
    await page.click('button:has-text("Confirm")')

    // Verify entry is removed
    await expect(page.locator('text=Moonlight Sonata')).not.toBeVisible()
  })

  test('User can export logbook data', async ({ page }) => {
    // Navigate to logbook
    await page.click('text=Logbook')

    // Click export button
    await page.click('button:has-text("Export")')

    // Choose CSV format
    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Export as CSV')

    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('logbook')
    expect(download.suggestedFilename()).toContain('.csv')
  })
})

// Stagehand-specific test example (to be implemented when package is available)
test.describe('AI-Driven Tests with Stagehand', () => {
  test.skip('AI can navigate and create a practice entry', async ({
    page: _page,
  }) => {
    // This would use Stagehand's AI capabilities
    // Example:
    // const stagehand = new Stagehand(page)
    // await stagehand.navigate('Go to the logbook section')
    // await stagehand.perform('Create a new practice entry for 30 minutes of piano practice')
    // await stagehand.verify('The entry was created successfully')
  })
})
