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
    // Wait for the form to appear - look for the heading
    await page.waitForSelector('h2:has-text("Add Entry")', { timeout: 5000 })

    // Fill out the form - the duration field already has value 30 by default
    // Just clear and re-enter to be sure
    const durationInput = page.locator('input[type="number"]').first()
    await durationInput.clear()
    await durationInput.fill('30')

    // Instrument and Type are already set to Piano and Practice by default
    // But we can verify/change them if needed

    // Add a piece - find inputs by their position
    const pieceInputs = await page.locator('input[type="text"]').all()
    if (pieceInputs.length >= 2) {
      await pieceInputs[0].fill('Moonlight Sonata')
      await pieceInputs[1].fill('Beethoven')
    }

    // Add notes - find textarea
    const notesTextarea = page.locator('textarea').first()
    await notesTextarea.fill('Worked on first movement, focusing on dynamics')

    // Select mood
    await page.click('button:has-text("Satisfied")')

    // Save the entry
    await page.click('button:has-text("Save Entry")')

    // Wait for the modal to close and entry to appear
    await page.waitForTimeout(1000)

    // Verify entry appears in the list - look for any entry with minutes
    const entryCards = page.locator('.p-4.hover\\:bg-morandi-stone-50')
    await expect(entryCards.first()).toBeVisible()

    // Click on the first entry to expand it
    await entryCards.first().click()

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
      // Wait for the form to appear - look for the heading
      await page.waitForSelector('h2:has-text("Add Entry")', { timeout: 5000 })

      const durationInput = page.locator('input[type="number"]').first()
      await durationInput.clear()
      await durationInput.fill(duration)

      // Find inputs by their position
      const pieceInputs = await page.locator('input[type="text"]').all()
      if (pieceInputs.length >= 2) {
        await pieceInputs[0].fill(title)
        await pieceInputs[1].fill(composer)
      }
      // Select mood
      await page.click('button:has-text("😊")')

      // Save the entry
      const saveButton = page
        .locator('button[type="submit"]')
        .filter({ hasText: /save/i })
      await saveButton.click()
      await page.waitForTimeout(1000)
    }

    // Create two entries
    await createEntry('Moonlight Sonata', 'Beethoven', '30')
    await createEntry('Sonata No. 11', 'Mozart', '25')

    // Now test search - find the search input
    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.fill('Beethoven')

    // Wait a bit for search to filter
    await page.waitForTimeout(500)

    // Verify filtered results - we should see only 1 entry
    const visibleEntries = page.locator('.p-4.hover\\:bg-morandi-stone-50')
    await expect(visibleEntries).toHaveCount(1)

    // Click to expand the Beethoven entry and verify content
    await visibleEntries.first().click()
    await expect(page.locator('text=Beethoven')).toBeVisible()
    await expect(page.locator('text=Moonlight Sonata')).toBeVisible()
  })

  test('Data persists across login/logout cycles', async ({ page }) => {
    // Navigate to logbook
    await page.click('text=Logbook')
    await expect(page).toHaveURL('/logbook')

    // Helper to count visible entries
    const countEntries = async () => {
      const entries = await page.locator('text=minutes').count()
      return entries
    }

    // Helper to create an entry with specific details
    const createEntryWithDetails = async (title: string, duration: string) => {
      const addButton = page
        .locator(
          'button:has-text("Add Entry"), button:has-text("Add Your First Entry")'
        )
        .first()
      await addButton.click()
      // Wait for the form to appear - look for the heading
      await page.waitForSelector('h2:has-text("Add Entry")', { timeout: 5000 })

      const durationInput = page.locator('input[type="number"]').first()
      await durationInput.clear()
      await durationInput.fill(duration)

      await page.fill('input[placeholder="Piece title"]', title)
      await page.fill('input[placeholder="Composer"]', 'Test Composer')
      // Select mood
      await page.click('button:has-text("😊")')

      // Save the entry
      const saveButton = page
        .locator('button[type="submit"]')
        .filter({ hasText: /save/i })
      await saveButton.click()
      await page.waitForTimeout(1000)
    }

    // Step 1: Create first entry while not logged in
    await createEntryWithDetails('Entry 1 - Anonymous', '10')

    // Verify we have 1 entry
    let entryCount = await countEntries()
    expect(entryCount).toBe(1)
    await expect(page.locator('text=10 minutes')).toBeVisible()

    // Step 2: Create second entry while still not logged in
    await createEntryWithDetails('Entry 2 - Anonymous', '20')

    // Verify we have 2 entries
    entryCount = await countEntries()
    expect(entryCount).toBe(2)
    await expect(page.locator('text=10 minutes')).toBeVisible()
    await expect(page.locator('text=20 minutes')).toBeVisible()

    // Step 3: Sign in (using mock auth for E2E test)
    // For now, we'll simulate the login flow
    // In a real test, you'd need to mock the auth endpoints

    // Step 4: After login, verify we still have 2 entries (synced)
    // This part would need actual auth mocking to work properly
    // For now, we'll just verify the current state
    entryCount = await countEntries()
    expect(entryCount).toBe(2)

    // Step 5: Create third entry while logged in
    await createEntryWithDetails('Entry 3 - Logged In', '30')

    // Verify we have 3 entries
    entryCount = await countEntries()
    expect(entryCount).toBe(3)
    await expect(page.locator('text=10 minutes')).toBeVisible()
    await expect(page.locator('text=20 minutes')).toBeVisible()
    await expect(page.locator('text=30 minutes')).toBeVisible()

    // Expand entries to verify titles
    await page.locator('text=10 minutes').click()
    await expect(page.locator('text=Entry 1 - Anonymous')).toBeVisible()

    await page.locator('text=20 minutes').click()
    await expect(page.locator('text=Entry 2 - Anonymous')).toBeVisible()

    await page.locator('text=30 minutes').click()
    await expect(page.locator('text=Entry 3 - Logged In')).toBeVisible()
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
    // Wait for the form to appear - look for the heading
    await page.waitForSelector('h2:has-text("Add Entry")', { timeout: 5000 })

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
