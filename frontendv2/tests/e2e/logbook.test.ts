import { test, expect } from '@playwright/test'

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

    // Click add entry button - handle both states (empty and with entries)
    const addButton = page
      .locator(
        'button:has-text("Add Entry"), button:has-text("Add Your First Entry")'
      )
      .first()
    await addButton.click()

    // Wait for form to appear
    await page.waitForSelector('text=New Practice Entry', { timeout: 5000 })

    // Fill out the form - the duration field already has value 30 by default
    // Just clear and re-enter to be sure
    const durationInput = page.locator('input[type="number"]').first()
    await durationInput.clear()
    await durationInput.fill('30')

    // Instrument and Type are already set to Piano and Practice by default
    // But we can verify/change them if needed

    // Add a piece
    await page.fill('input[placeholder="Piece title"]', 'Moonlight Sonata')
    await page.fill('input[placeholder="Composer"]', 'Beethoven')

    // Add notes
    await page.fill(
      'textarea[placeholder="What did you work on? Any observations?"]',
      'Worked on first movement, focusing on dynamics'
    )

    // Select mood
    await page.click('button:has-text("Satisfied")')

    // Save the entry
    await page.click('button:has-text("Save Entry")')

    // Wait for the modal to close and entry to appear
    await page.waitForTimeout(1000)

    // Verify entry appears in the list - the duration is always visible
    await expect(page.locator('text=30 minutes')).toBeVisible()

    // Click on the entry to expand it (click on the entry card)
    await page.locator('text=30 minutes').click()

    // Now verify the pieces are visible in the expanded view
    await expect(page.locator('text=Moonlight Sonata')).toBeVisible()
    await expect(page.locator('text=Beethoven')).toBeVisible()

    // Also verify the notes are visible
    await expect(
      page.locator('text=Worked on first movement, focusing on dynamics')
    ).toBeVisible()
  })

  test('User can search logbook entries', async ({ page }) => {
    // Navigate to logbook
    await page.click('text=Logbook')
    await expect(page).toHaveURL('/logbook')

    // Helper function to create an entry
    const createEntry = async (
      title: string,
      composer: string,
      duration: string
    ) => {
      const addButton = page
        .locator(
          'button:has-text("Add Entry"), button:has-text("Add Your First Entry")'
        )
        .first()
      await addButton.click()
      await page.waitForSelector('text=New Practice Entry', { timeout: 5000 })

      const durationInput = page.locator('input[type="number"]').first()
      await durationInput.clear()
      await durationInput.fill(duration)

      await page.fill('input[placeholder="Piece title"]', title)
      await page.fill('input[placeholder="Composer"]', composer)
      await page.click('button:has-text("Satisfied")')
      await page.click('button:has-text("Save Entry")')
      await page.waitForTimeout(1000)
    }

    // Create two entries
    await createEntry('Moonlight Sonata', 'Beethoven', '30')
    await createEntry('Sonata No. 11', 'Mozart', '25')

    // Now test search
    await page.fill('input[placeholder="Search entries..."]', 'Beethoven')

    // Wait a bit for search to filter
    await page.waitForTimeout(500)

    // Verify filtered results - we should see 1 entry with 30 minutes
    await expect(page.locator('text=30 minutes')).toBeVisible()
    // And we should NOT see the Mozart entry (25 minutes)
    await expect(page.locator('text=25 minutes')).not.toBeVisible()

    // Click to expand the Beethoven entry and verify content
    await page.locator('text=30 minutes').click()
    await expect(page.locator('text=Beethoven')).toBeVisible()
    await expect(page.locator('text=Moonlight Sonata')).toBeVisible()
  })

  test('User can view reports', async ({ page }) => {
    // Navigate to logbook
    await page.click('text=Logbook')
    await expect(page).toHaveURL('/logbook')

    // Create an entry first
    const addButton = page
      .locator(
        'button:has-text("Add Entry"), button:has-text("Add Your First Entry")'
      )
      .first()
    await addButton.click()
    await page.waitForSelector('text=New Practice Entry', { timeout: 5000 })

    const durationInput = page.locator('input[type="number"]').first()
    await durationInput.clear()
    await durationInput.fill('30')

    await page.fill('input[placeholder="Piece title"]', 'Moonlight Sonata')
    await page.fill('input[placeholder="Composer"]', 'Beethoven')
    await page.click('button:has-text("Satisfied")')
    await page.click('button:has-text("Save Entry")')
    await page.waitForTimeout(1000)

    // Navigate to reports - updated button text
    await page.click('text=View Reports →')

    // Wait for reports page to load
    await page.waitForSelector('text=Practice Reports', { timeout: 5000 })

    // Verify we can see some report content
    await expect(page.locator('text=Total Practice')).toBeVisible()
    await expect(page.locator('text=Export JSON')).toBeVisible()
    await expect(page.locator('text=Export CSV')).toBeVisible()
    // Just verify we're on the reports page
    await expect(page.locator('text=Most Practiced Pieces')).toBeVisible()
  })
})
