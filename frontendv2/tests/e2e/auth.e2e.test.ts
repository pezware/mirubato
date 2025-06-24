import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login options on home page', async ({ page }) => {
    // Check that the home page loads
    await expect(page.locator('h1')).toContainText('mirubato')

    // Check for login button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should navigate to logbook and show login prompt', async ({ page }) => {
    // Navigate to logbook
    await page.getByRole('link', { name: /logbook/i }).click()

    // Should be on logbook page
    await expect(page).toHaveURL('/logbook')

    // Should show local storage indicator
    await expect(page.getByText(/local storage/i)).toBeVisible()

    // Should have sign in button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should open login form when sign in is clicked', async ({ page }) => {
    await page.goto('/logbook')

    // Click sign in button
    await page.getByRole('button', { name: /sign in/i }).click()

    // Login form should appear
    await expect(page.getByText(/sign in to sync/i)).toBeVisible()
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()

    // Should have both email and Google login options
    await expect(
      page.getByRole('button', { name: /send magic link/i })
    ).toBeVisible()
    await expect(page.getByText(/sign in with google/i)).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/logbook')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Enter invalid email
    await page.getByPlaceholder(/email/i).fill('invalid-email')
    await page.getByRole('button', { name: /send magic link/i }).click()

    // Should show validation error
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test('should send magic link with valid email', async ({ page }) => {
    await page.goto('/logbook')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Enter valid email
    await page.getByPlaceholder(/email/i).fill('test@example.com')

    // Mock the API response
    await page.route('**/api/auth/magic-link', async route => {
      await route.fulfill({
        status: 200,
        json: { success: true },
      })
    })

    await page.getByRole('button', { name: /send magic link/i }).click()

    // Should show success message
    await expect(page.getByText(/check your email/i)).toBeVisible()
  })

  test('should handle magic link verification', async ({ page }) => {
    // Mock successful verification
    await page.route('**/api/auth/verify', async route => {
      await route.fulfill({
        status: 200,
        json: {
          user: { id: 'user-123', email: 'test@example.com' },
          token: 'fake-jwt-token',
        },
      })
    })

    // Navigate with magic link token
    await page.goto('/auth/verify?token=valid-token')

    // Should redirect to logbook after successful verification
    await expect(page).toHaveURL('/logbook')

    // Should show synced status
    await expect(page.getByText(/synced/i)).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('should handle invalid magic link', async ({ page }) => {
    // Mock failed verification
    await page.route('**/api/auth/verify', async route => {
      await route.fulfill({
        status: 401,
        json: { error: 'Invalid or expired token' },
      })
    })

    // Navigate with invalid token
    await page.goto('/auth/verify?token=invalid-token')

    // Should show error message
    await expect(page.getByText(/invalid or expired/i)).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'fake-token')
    })

    // Mock getCurrentUser for initial auth check
    await page.route('**/api/auth/current-user', async route => {
      await route.fulfill({
        status: 200,
        json: { id: 'user-123', email: 'test@example.com' },
      })
    })

    // Mock logout endpoint
    await page.route('**/api/auth/logout', async route => {
      await route.fulfill({ status: 200 })
    })

    await page.goto('/logbook')

    // Should show logout button
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()

    // Click logout
    await page.getByRole('button', { name: /logout/i }).click()

    // Should revert to local storage mode
    await expect(page.getByText(/local storage/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should persist auth across page reloads', async ({ page }) => {
    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'fake-token')
    })

    // Mock getCurrentUser
    await page.route('**/api/auth/current-user', async route => {
      await route.fulfill({
        status: 200,
        json: { id: 'user-123', email: 'test@example.com' },
      })
    })

    await page.goto('/logbook')

    // Should be authenticated
    await expect(page.getByText(/synced/i)).toBeVisible()

    // Reload page
    await page.reload()

    // Should still be authenticated
    await expect(page.getByText(/synced/i)).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/logbook')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Mock network error
    await page.route('**/api/auth/magic-link', async route => {
      await route.abort('failed')
    })

    await page.getByPlaceholder(/email/i).fill('test@example.com')
    await page.getByRole('button', { name: /send magic link/i }).click()

    // Should show error message
    await expect(
      page.getByText(/network error|something went wrong/i)
    ).toBeVisible()
  })
})
