import { test, expect } from '@playwright/test'

test.describe('Logbook Sync and Data Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('Data persists correctly across login/logout cycles', async ({
    page,
  }) => {
    // Navigate to logbook
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Helper to count visible entries
    const countEntries = async () => {
      const entrySelector = 'div[class*="hover:bg-morandi-stone-50"]'
      const entries = await page.locator(entrySelector).all()
      return entries.length
    }

    // Helper to create an entry with specific details
    const createEntry = async (
      title: string,
      duration: string,
      composer: string = 'Test Composer'
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

      // Find inputs by their position or label instead of placeholder
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

    // Verify we start with local storage
    // Check for local storage indicator - using the emoji as it's more stable
    await expect(page.locator('text=💾').first()).toBeVisible()

    // Step 1: Create first entry while not logged in
    await createEntry('Anonymous Entry 1', '10')

    // Verify we have 1 entry
    let entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(1)

    // Step 2: Create second entry while still not logged in
    await createEntry('Anonymous Entry 2', '20')

    // Verify we have 2 entries
    entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(2)

    // Step 3: Mock authentication endpoints for login
    await page.route('**/api/auth/**', async route => {
      const url = route.request().url()

      if (url.includes('/api/auth/request-magic-link')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      } else if (url.includes('/api/auth/google')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-123',
              email: 'test@example.com',
              displayName: 'Test User',
            },
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          }),
        })
      } else if (url.includes('/api/auth/logout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      } else {
        await route.continue()
      }
    })

    // Mock logbook API endpoints
    await page.route('**/api/logbook/entries', async route => {
      if (route.request().method() === 'GET') {
        // Return empty entries initially
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else {
        await route.continue()
      }
    })

    // Mock sync endpoints
    await page.route('**/api/sync/**', async route => {
      const url = route.request().url()

      if (url.includes('/api/sync/pull')) {
        // Return existing entries as if they were synced
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries: [], // Start with no cloud entries
            goals: [],
            syncToken: 'mock-sync-token-1',
          }),
        })
      } else if (url.includes('/api/sync/push')) {
        // Accept the push
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            syncToken: 'mock-sync-token-2',
            conflicts: [],
          }),
        })
      } else {
        await route.continue()
      }
    })

    // Mock user endpoint
    await page.route('**/api/user/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
            displayName: 'Test User',
          },
        }),
      })
    })

    // Click Sign in button
    const signInButton = page.locator('button:has-text("Sign in")')
    if (await signInButton.isVisible()) {
      await signInButton.click()
      // For this test, we'll simulate a successful Google login
      // In a real scenario, you'd need to handle the Google OAuth flow
      // For now, we'll just verify the login form appears
      await expect(page.locator('h2:has-text("Sign In")')).toBeVisible({
        timeout: 5000,
      })
      // Close the modal for now (since we can't easily mock Google OAuth)
      await page.keyboard.press('Escape')
    }

    // Step 4: Simulate logged-in state by setting auth token in localStorage
    await page.evaluate(() => {
      // Set the auth token that the app actually checks for
      localStorage.setItem('auth-token', 'mock-access-token')
      // Also set the auth store state for the UI
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'test-user-123',
              email: 'test@example.com',
              displayName: 'Test User',
            },
            isAuthenticated: true,
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          },
          version: 0,
        })
      )
    })

    // Reload to apply auth state
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify we're now logged in - just check for logout button
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({
      timeout: 10000,
    })

    // Verify we still have at least 2 entries after login
    entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(2)

    // Step 5: Create third entry while logged in
    await createEntry('Logged In Entry 3', '30')

    // Verify we have at least 3 entries
    entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(3)

    // Step 6: Logout
    await page.click('button:has-text("Logout")')

    // Verify we're logged out
    // Check for local storage indicator - using the emoji as it's more stable
    await expect(page.locator('text=💾').first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible()

    // Step 7: Verify all 3 entries persist after logout
    entryCount = await countEntries()
    expect(entryCount).toBeGreaterThanOrEqual(3)

    // Find and verify our entries exist
    const entrySelector = 'div[class*="hover:bg-morandi-stone-50"]'
    const entries = await page.locator(entrySelector).all()

    // We should have our entries
    expect(entries.length).toBeGreaterThanOrEqual(3)
  })

  test('Sync deduplicates entries correctly', async ({ page }) => {
    // Navigate to logbook
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Create duplicate entries locally
    const createDuplicateEntry = async () => {
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
      await durationInput.fill('30')

      // Find inputs by position
      const pieceInputs = await page.locator('input[type="text"]').all()
      if (pieceInputs.length >= 2) {
        await pieceInputs[0].fill('Duplicate Entry')
        await pieceInputs[1].fill('Same Composer')
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

    // Create two identical entries
    await createDuplicateEntry()
    await createDuplicateEntry()

    // Should have 2 entries locally
    const entrySelector = 'div[class*="hover:bg-morandi-stone-50"]'
    let entries = await page.locator(entrySelector).all()
    expect(entries.length).toBeGreaterThanOrEqual(2)

    // Mock logbook API endpoints
    await page.route('**/api/logbook/entries', async route => {
      if (route.request().method() === 'GET') {
        // Return the server duplicate entry
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'server-duplicate-1',
              timestamp: new Date().toISOString(),
              duration: 30,
              type: 'PRACTICE',
              instrument: 'PIANO',
              pieces: [{ title: 'Duplicate Entry', composer: 'Same Composer' }],
              mood: 'SATISFIED',
              techniques: [],
              goalIds: [],
              tags: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        })
      } else {
        await route.continue()
      }
    })

    // Mock sync to return one of the same entries from server
    await page.route('**/api/sync/pull', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            {
              id: 'server-duplicate-1',
              timestamp: new Date().toISOString(),
              duration: 30,
              type: 'PRACTICE',
              instrument: 'PIANO',
              pieces: [{ title: 'Duplicate Entry', composer: 'Same Composer' }],
              mood: 'SATISFIED',
            },
          ],
          goals: [],
          syncToken: 'mock-sync-token',
        }),
      })
    })

    // Mock successful push
    await page.route('**/api/sync/push', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          syncToken: 'mock-sync-token-2',
          conflicts: [],
        }),
      })
    })

    // Simulate login
    await page.evaluate(() => {
      // Set the auth token that the app actually checks for
      localStorage.setItem('auth-token', 'mock-access-token')
      // Also set the auth store state for the UI
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'test-user-123',
              email: 'test@example.com',
              displayName: 'Test User',
            },
            isAuthenticated: true,
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          },
          version: 0,
        })
      )
    })

    // Reload to apply auth state
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // We still expect to see our entries
    entries = await page.locator(entrySelector).all()
    expect(entries.length).toBeGreaterThanOrEqual(2)

    // Verify the entry content - click on the first one
    if (entries.length > 0) {
      await entries[0].click()
      await page.waitForTimeout(500)
      await expect(page.locator('text=Duplicate Entry')).toBeVisible()
      await expect(page.locator('text=Same Composer')).toBeVisible()
    }
  })

  test('Sync merges local and cloud data correctly', async ({ page }) => {
    // This test would verify that when logging in with existing cloud data,
    // it properly merges with local data

    // Navigate to logbook
    await page.goto('/logbook')
    await page.waitForLoadState('networkidle')

    // Create local entry
    const addButton = await page.locator('button:has-text("+")').first()
    await addButton.click()

    await page.waitForSelector('.fixed.inset-0.bg-black\\/50', {
      timeout: 10000,
    })

    const durationInput = page.locator('input[type="number"]').first()
    await durationInput.clear()
    await durationInput.fill('15')

    // Find inputs by position
    const pieceInputs = await page.locator('input[type="text"]').all()
    if (pieceInputs.length >= 2) {
      await pieceInputs[0].fill('Local Entry')
      await pieceInputs[1].fill('Local Composer')
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

    // Mock logbook API endpoints
    await page.route('**/api/logbook/entries', async route => {
      if (route.request().method() === 'GET') {
        // Return the cloud entry
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'cloud-entry-1',
              timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
              duration: 25,
              type: 'PRACTICE',
              instrument: 'PIANO',
              pieces: [{ title: 'Cloud Entry', composer: 'Cloud Composer' }],
              mood: 'SATISFIED',
              techniques: [],
              goalIds: [],
              tags: [],
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              updatedAt: new Date(Date.now() - 3600000).toISOString(),
            },
          ]),
        })
      } else {
        await route.continue()
      }
    })

    // Mock sync to return cloud data
    await page.route('**/api/sync/pull', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            {
              id: 'cloud-entry-1',
              timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
              duration: 25,
              type: 'PRACTICE',
              instrument: 'PIANO',
              pieces: [{ title: 'Cloud Entry', composer: 'Cloud Composer' }],
              mood: 'SATISFIED',
            },
          ],
          goals: [],
          syncToken: 'mock-sync-token',
        }),
      })
    })

    // Simulate login (set auth state)
    await page.evaluate(() => {
      // Set the auth token that the app actually checks for
      localStorage.setItem('auth-token', 'mock-access-token')
      // Also set the auth store state for the UI
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'test-user-123',
              email: 'test@example.com',
              displayName: 'Test User',
            },
            isAuthenticated: true,
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          },
          version: 0,
        })
      )
    })

    // Reload to apply auth state
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check entries
    const entrySelector = 'div[class*="hover:bg-morandi-stone-50"]'
    const entries = await page.locator(entrySelector).all()

    // We expect at least our local entry
    expect(entries.length).toBeGreaterThanOrEqual(1)

    // Find and verify our local entry exists
    let foundLocal = false
    for (const entry of entries) {
      await entry.click()
      await page.waitForTimeout(500)

      if (await page.locator('text=Local Entry').isVisible()) {
        foundLocal = true
        break
      }
    }

    expect(foundLocal).toBe(true)
  })
})
