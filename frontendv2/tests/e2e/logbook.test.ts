import { test, expect } from '@playwright/test'

test.describe('Logbook Features', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    // Mock autocomplete API to prevent timeouts
    await page.route('**/api/autocomplete/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      })
    })
  })

  test('Anonymous user can create and view logbook entries', async ({
    page,
  }) => {
    // Navigate directly to logbook page
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Look for add entry button - it should have a + sign
    await page.waitForSelector('button:has-text("+")', { timeout: 10000 })
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()

    // Wait for form modal to appear
    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      timeout: 10000,
    })

    // Ensure form is ready
    await page.waitForSelector('form', { timeout: 5000 })
    await page.waitForSelector('input[type="number"]', { timeout: 5000 })

    // Fill out the form - the duration field already has value 30 by default
    const durationInput = page.locator('input[type="number"]').first()
    await durationInput.clear()
    await durationInput.fill('30')

    // Add a piece - wait for inputs and fill them
    await page.waitForSelector('input[placeholder="Piece title"]', {
      timeout: 5000,
    })

    // Fill piece title and wait for autocomplete to settle
    await page.fill('input[placeholder="Piece title"]', 'Moonlight Sonata')
    await page.waitForTimeout(400) // Wait for debounce + buffer

    // Close autocomplete dropdown if open by pressing Escape
    await page.press('input[placeholder="Piece title"]', 'Escape')

    // Fill composer and wait for autocomplete to settle
    await page.fill('input[placeholder="Composer"]', 'Beethoven')
    await page.waitForTimeout(400) // Wait for debounce + buffer

    // Close autocomplete dropdown if open by pressing Escape
    await page.press('input[placeholder="Composer"]', 'Escape')

    // Add notes
    const notesTextarea = page.locator('textarea').first()
    await notesTextarea.fill('Worked on first movement, focusing on dynamics')

    // Select mood
    await page.click('button:has-text("😊")')

    // Save the entry
    const saveButton = page.locator('button[type="submit"]').last()
    await saveButton.click()

    // Wait for the modal to close
    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      state: 'hidden',
      timeout: 10000,
    })

    // Wait for the UI to update
    await page.waitForTimeout(2000)

    // Clear search input if it exists
    const searchInput = page.locator('input[placeholder*="Search"]')
    if (await searchInput.isVisible()) {
      await searchInput.clear()
      await page.waitForTimeout(500)
    }

    // Look for the entry - it should show "30 minutes"
    const minuteText = page.locator('span').filter({ hasText: /30 minute/i })
    await expect(minuteText).toBeVisible({ timeout: 10000 })

    // Click on the parent div that contains this text to expand the entry
    const entryDiv = page
      .locator('div[class*="hover:bg-morandi-stone-50"]')
      .filter({ has: minuteText })
      .first()
    await entryDiv.click()

    // Wait for expansion
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

      // Fill piece information using placeholders - handle autocomplete
      await page.fill('input[placeholder="Piece title"]', title)
      await page.waitForTimeout(400) // Wait for debounce + buffer
      await page.press('input[placeholder="Piece title"]', 'Escape')

      await page.fill('input[placeholder="Composer"]', composer)
      await page.waitForTimeout(400) // Wait for debounce + buffer
      await page.press('input[placeholder="Composer"]', 'Escape')

      // Select mood
      await page.click('button:has-text("😊")')

      // Save the entry
      const saveButton = page.locator('button[type="submit"]').last()
      await saveButton.click()

      // Wait for modal to close
      await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
        state: 'hidden',
        timeout: 10000,
      })

      await page.waitForTimeout(1500)
    }

    // Create two entries
    await createEntry('Moonlight Sonata', 'Beethoven', '30')
    await createEntry('Sonata No. 11', 'Mozart', '25')

    // Now test search - find the search input
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.clear()
    await searchInput.fill('Beethoven')

    // Wait a bit for search to filter
    await page.waitForTimeout(1000)

    // Verify we can see Beethoven entry
    await expect(
      page.locator('span').filter({ hasText: /30 minute/i })
    ).toBeVisible()

    // Verify Mozart entry is not visible
    await expect(
      page.locator('span').filter({ hasText: /25 minute/i })
    ).not.toBeVisible()

    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(1000)

    // Now both should be visible
    await expect(
      page.locator('span').filter({ hasText: /30 minute/i })
    ).toBeVisible()
    await expect(
      page.locator('span').filter({ hasText: /25 minute/i })
    ).toBeVisible()
  })

  test('Data persists across page reloads', async ({ page }) => {
    // Navigate directly to logbook
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

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

      // Fill piece info - handle autocomplete
      await page.fill('input[placeholder="Piece title"]', title)
      await page.waitForTimeout(400) // Wait for debounce + buffer
      await page.press('input[placeholder="Piece title"]', 'Escape')

      await page.fill('input[placeholder="Composer"]', 'Test Composer')
      await page.waitForTimeout(400) // Wait for debounce + buffer
      await page.press('input[placeholder="Composer"]', 'Escape')

      // Select mood
      await page.click('button:has-text("😊")')

      // Save the entry
      const saveButton = page.locator('button[type="submit"]').last()
      await saveButton.click()

      // Wait for modal to close
      await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
        state: 'hidden',
        timeout: 10000,
      })

      await page.waitForTimeout(1500)
    }

    // Step 1: Create first entry
    await createEntryWithDetails('Entry 1 - Anonymous', '10')

    // Verify we can see the entry
    await expect(
      page.locator('span').filter({ hasText: /10 minute/i })
    ).toBeVisible()

    // Step 2: Create second entry
    await createEntryWithDetails('Entry 2 - Anonymous', '20')

    // Verify we can see both entries
    await expect(
      page.locator('span').filter({ hasText: /10 minute/i })
    ).toBeVisible()
    await expect(
      page.locator('span').filter({ hasText: /20 minute/i })
    ).toBeVisible()

    // Step 3: Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Step 4: Verify entries persist after reload
    await expect(
      page.locator('span').filter({ hasText: /10 minute/i })
    ).toBeVisible()
    await expect(
      page.locator('span').filter({ hasText: /20 minute/i })
    ).toBeVisible()

    // Step 5: Create third entry after reload
    await createEntryWithDetails('Entry 3 - After Reload', '30')

    // Verify all three entries are visible
    await expect(
      page.locator('span').filter({ hasText: /10 minute/i })
    ).toBeVisible()
    await expect(
      page.locator('span').filter({ hasText: /20 minute/i })
    ).toBeVisible()
    await expect(
      page.locator('span').filter({ hasText: /30 minute/i })
    ).toBeVisible()
  })

  test('User can view reports', async ({ page }) => {
    // Navigate directly to logbook
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Create an entry first
    await page.waitForSelector('button:has-text("+")', { timeout: 10000 })
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()

    // Wait for form modal to appear
    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      timeout: 10000,
    })
    await page.waitForSelector('form', { timeout: 5000 })

    const durationInput = page.locator('input[type="number"]').first()
    await durationInput.clear()
    await durationInput.fill('30')

    // Handle autocomplete properly
    await page.fill('input[placeholder="Piece title"]', 'Moonlight Sonata')
    await page.waitForTimeout(400) // Wait for debounce + buffer
    await page.press('input[placeholder="Piece title"]', 'Escape')

    await page.fill('input[placeholder="Composer"]', 'Beethoven')
    await page.waitForTimeout(400) // Wait for debounce + buffer
    await page.press('input[placeholder="Composer"]', 'Escape')

    await page.click('button:has-text("😊")')

    const saveButton = page.locator('button[type="submit"]').last()
    await saveButton.click()

    // Wait for modal to close
    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      state: 'hidden',
      timeout: 10000,
    })

    await page.waitForTimeout(2000)

    // Navigate to reports
    const reportsButton = page
      .locator('button')
      .filter({ hasText: /View Reports/i })
    await reportsButton.click()

    // Wait for reports page to load
    await page.waitForSelector('text=Practice Reports', { timeout: 10000 })

    // Verify we can see report content
    await expect(page.locator('text=Total Practice')).toBeVisible()
    await expect(page.locator('text=Export JSON')).toBeVisible()
    await expect(page.locator('text=Export CSV')).toBeVisible()

    // Verify statistics are shown
    await expect(
      page.locator('text=/Most Practiced|Practice Statistics/i').first()
    ).toBeVisible()
  })
})
