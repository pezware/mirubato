import { test, expect } from '@playwright/test'

test.describe('Logbook Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Anonymous user can create and view logbook entries', async ({
    page,
  }) => {
    // Navigate directly to logbook page
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Look for add entry button - it should have a + sign
    const addButton = await page.locator('button:has-text("+")').first()
    await addButton.click()

    // Wait for form modal to appear - look for the modal overlay
    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      timeout: 10000,
    })

    // Ensure form is ready - wait for specific form elements
    await page.waitForSelector('form', { timeout: 5000 })
    await page.waitForSelector('input[type="number"]', { timeout: 5000 })

    // Fill out the form - the duration field already has value 30 by default
    // Just clear and re-enter to be sure
    const durationInput = page.locator('input[type="number"]').first()
    await durationInput.clear()
    await durationInput.fill('30')

    // Add a piece - find inputs by their position
    const pieceInputs = await page.locator('input[type="text"]').all()
    if (pieceInputs.length >= 2) {
      await pieceInputs[0].fill('Moonlight Sonata')
      await pieceInputs[1].fill('Beethoven')
    }

    // Add notes - find textarea
    const notesTextarea = page.locator('textarea').first()
    await notesTextarea.fill('Worked on first movement, focusing on dynamics')

    // Select mood - use emoji
    await page.click('button:has-text("😊")')

    // Save the entry - look for submit button
    const saveButton = page.locator('button[type="submit"]').last()
    await saveButton.click()

    // Wait for the modal to close by checking it's not visible
    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      state: 'hidden',
      timeout: 10000,
    })

    // Give the list time to update
    await page.waitForTimeout(1000)

    // Clear any search that might be there
    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.clear()
    await page.waitForTimeout(500)

    // Verify entry appears in the list - look for the duration we just created
    // Use more specific selector for the entry container
    const entrySelector = 'div[class*="hover:bg-morandi-stone-50"]'
    await page.waitForSelector(entrySelector, { timeout: 10000 })

    // Find the entry with our duration
    const entries = await page.locator(entrySelector).all()
    let foundEntry = false

    for (const entry of entries) {
      const text = await entry.textContent()
      if (text && text.includes('30') && text.includes('minute')) {
        await entry.click()
        foundEntry = true
        break
      }
    }

    expect(foundEntry).toBe(true)

    // Wait for the entry to expand
    await page.waitForTimeout(500)

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
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Helper function to create an entry
    const createEntry = async (
      title: string,
      composer: string,
      duration: string
    ) => {
      // Look for add button with + sign
      const addButton = await page.locator('button:has-text("+")').first()
      await addButton.click()

      // Wait for form modal
      await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
        timeout: 10000,
      })
      await page.waitForSelector('form', { timeout: 5000 })

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

      // Wait for modal to close
      await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
        state: 'hidden',
        timeout: 10000,
      })

      await page.waitForTimeout(1000)
    }

    // Create two entries
    await createEntry('Moonlight Sonata', 'Beethoven', '30')
    await createEntry('Sonata No. 11', 'Mozart', '25')

    // Now test search - find the search input
    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.clear()
    await searchInput.fill('Beethoven')

    // Wait a bit for search to filter
    await page.waitForTimeout(1000)

    // Verify filtered results - look for visible entries
    const entrySelector = 'div[class*="hover:bg-morandi-stone-50"]'
    const visibleEntries = await page.locator(entrySelector).all()

    // Should have at least one entry visible
    expect(visibleEntries.length).toBeGreaterThanOrEqual(1)

    // Click on the first visible entry
    if (visibleEntries.length > 0) {
      await visibleEntries[0].click()
      await page.waitForTimeout(500)

      // Verify it contains Beethoven
      await expect(page.locator('text=Beethoven')).toBeVisible()
      await expect(page.locator('text=Moonlight Sonata')).toBeVisible()
    }

    // Clear search and verify we see both entries again
    await searchInput.clear()
    await page.waitForTimeout(1000)

    const allEntries = await page.locator(entrySelector).all()
    expect(allEntries.length).toBeGreaterThanOrEqual(2)
  })

  test('Data persists across page reloads', async ({ page }) => {
    // Navigate directly to logbook
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Helper to count visible entries
    const countEntries = async () => {
      const entrySelector = 'div[class*="hover:bg-morandi-stone-50"]'
      const entries = await page.locator(entrySelector).all()
      return entries.length
    }

    // Helper to create an entry with specific details
    const createEntryWithDetails = async (title: string, duration: string) => {
      // Look for add button with + sign
      const addButton = await page.locator('button:has-text("+")').first()
      await addButton.click()

      // Wait for form modal
      await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
        timeout: 10000,
      })
      await page.waitForSelector('form', { timeout: 5000 })

      const durationInput = page.locator('input[type="number"]').first()
      await durationInput.clear()
      await durationInput.fill(duration)

      // Find inputs by position
      const pieceInputs = await page.locator('input[type="text"]').all()
      if (pieceInputs.length >= 2) {
        await pieceInputs[0].fill(title)
        await pieceInputs[1].fill('Test Composer')
      }
      // Select mood
      await page.click('button:has-text("😊")')

      // Save the entry
      const saveButton = page
        .locator('button[type="submit"]')
        .filter({ hasText: /save/i })
      await saveButton.click()

      // Wait for modal to close
      await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
        state: 'hidden',
        timeout: 10000,
      })

      await page.waitForTimeout(1000)
    }

    // Step 1: Create first entry while not logged in
    await createEntryWithDetails('Entry 1 - Anonymous', '10')

    // Verify we have at least 1 entry
    let entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(1)

    // Step 2: Create second entry while still not logged in
    await createEntryWithDetails('Entry 2 - Anonymous', '20')

    // Verify we have at least 2 entries
    entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(2)

    // Step 3: Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Step 4: Verify entries persist after reload
    entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(2)

    // Step 5: Create third entry after reload
    await createEntryWithDetails('Entry 3 - After Reload', '30')

    // Verify we have at least 3 entries
    entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(3)

    // Expand entries to verify titles by clicking on each
    const entrySelector = 'div[class*="hover:bg-morandi-stone-50"]'
    const entries = await page.locator(entrySelector).all()

    // Click through entries to find our created ones
    const foundTitles = []
    for (const entry of entries) {
      await entry.click()
      await page.waitForTimeout(500)

      // Check if any of our titles are visible
      const titles = [
        'Entry 1 - Anonymous',
        'Entry 2 - Anonymous',
        'Entry 3 - After Reload',
      ]
      for (const title of titles) {
        const titleLocator = page.locator(`text="${title}"`)
        if (await titleLocator.isVisible()) {
          foundTitles.push(title)
        }
      }
    }

    // We should find at least some of our entries
    expect(foundTitles.length).toBeGreaterThanOrEqual(2)
  })

  test('User can view reports', async ({ page }) => {
    // Navigate directly to logbook
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Create an entry first
    const addButton = await page.locator('button:has-text("+")').first()
    await addButton.click()

    // Wait for form modal to appear
    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      timeout: 10000,
    })
    await page.waitForSelector('form', { timeout: 5000 })

    const durationInput = page.locator('input[type="number"]').first()
    await durationInput.clear()
    await durationInput.fill('30')

    // Find inputs by position
    const pieceInputs = await page.locator('input[type="text"]').all()
    if (pieceInputs.length >= 2) {
      await pieceInputs[0].fill('Moonlight Sonata')
      await pieceInputs[1].fill('Beethoven')
    }

    await page.click('button:has-text("😊")')

    const saveButton = page
      .locator('button[type="submit"]')
      .filter({ hasText: /save/i })
    await saveButton.click()

    // Wait for modal to close
    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      state: 'hidden',
      timeout: 10000,
    })

    await page.waitForTimeout(1000)

    // Navigate to reports - look for the reports button
    const reportsButton = page.locator('button', {
      hasText: /View Reports|Reports/i,
    })
    await reportsButton.click()

    // Wait for reports page to load
    await page.waitForSelector('text=Practice Reports', { timeout: 10000 })

    // Verify we can see some report content
    await expect(page.locator('text=Total Practice')).toBeVisible()
    await expect(page.locator('text=Export JSON')).toBeVisible()
    await expect(page.locator('text=Export CSV')).toBeVisible()

    // Verify we're on the reports page - use first() to avoid strict mode violation
    await expect(
      page.locator('text=/Most Practiced|Practice Statistics|Report/i').first()
    ).toBeVisible()
  })
})
