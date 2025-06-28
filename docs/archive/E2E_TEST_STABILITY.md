# E2E Test Stability Guide

## Overview

This guide provides best practices and patterns for writing stable, reliable E2E tests that work across different viewports and devices.

## Common Issues and Solutions

### 1. Responsive Design Elements

**Problem**: Elements that are hidden/shown based on viewport size cause tests to fail on different devices.

**Solution**:

- Use viewport-agnostic selectors
- Look for text content that's always visible
- Add data-testid attributes for critical elements

```typescript
// ❌ Bad - Relies on responsive element
await expect(page.locator('text=💾').first()).toBeVisible()

// ✅ Good - Uses text that's always visible
await expect(page.locator('text=Local storage')).toBeVisible()

// ✅ Better - Uses data-testid
await expect(page.locator('[data-testid="storage-status"]')).toBeVisible()
```

### 2. Timing Issues

**Problem**: Tests fail due to race conditions or timing issues.

**Solution**:

- Use Playwright's auto-waiting features
- Avoid hardcoded timeouts
- Wait for specific conditions

```typescript
// ❌ Bad - Hardcoded timeout
await page.waitForTimeout(5000)

// ✅ Good - Wait for specific condition
await page.waitForLoadState('networkidle')
await expect(page.locator('text=Entry saved')).toBeVisible()
```

### 3. Flaky Selectors

**Problem**: Selectors that are too specific or rely on dynamic content.

**Solution**:

- Use semantic selectors (role, text)
- Prefer data-testid for critical elements
- Use Playwright's selector engines

```typescript
// ❌ Bad - Brittle class-based selector
await page.click('.btn-primary-2xl-rounded')

// ✅ Good - Semantic selector
await page.click('button:has-text("Save")')

// ✅ Better - Role-based selector
await page.click('button[role="button"]:has-text("Save")')
```

## Best Practices

### 1. Use Helper Functions

Create reusable helper functions for common operations:

```typescript
import {
  waitForStorageStatus,
  checkAuthStatus,
} from './utils/responsive-helpers'

// Use helpers instead of repetitive code
await waitForStorageStatus(page, 'local')
await checkAuthStatus(page, 'anonymous')
```

### 2. Handle Different Viewports

Test viewport-specific behavior explicitly:

```typescript
test('responsive behavior', async ({ page, isMobile }) => {
  if (isMobile) {
    // Mobile-specific assertions
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  } else {
    // Desktop-specific assertions
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible()
  }
})
```

### 3. Mock External Dependencies

Reduce flakiness by mocking external services:

```typescript
// Mock API responses for consistent behavior
await page.route('**/api/auth/verify', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ success: true }),
  })
})
```

### 4. Use Proper Assertions

Leverage Playwright's web-first assertions:

```typescript
// ✅ Auto-retrying assertions
await expect(page.locator('text=Success')).toBeVisible()
await expect(page.locator('input')).toHaveValue('expected value')
await expect(page).toHaveURL('/dashboard')
```

### 5. Implement Retry Logic

For critical operations, implement custom retry logic:

```typescript
async function retryOperation(fn: () => Promise<void>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await fn()
      return
    } catch (error) {
      if (i === retries - 1) throw error
      await page.waitForTimeout(1000)
    }
  }
}
```

## Testing Checklist

Before committing E2E tests, ensure:

- [ ] Tests pass on all configured viewports
- [ ] No hardcoded timeouts (waitForTimeout)
- [ ] Selectors work across responsive breakpoints
- [ ] Tests are independent and can run in parallel
- [ ] Proper cleanup between tests
- [ ] Meaningful test descriptions
- [ ] Error messages are descriptive

## Debugging Failed Tests

### 1. Use Playwright's Debug Tools

```bash
# Run with debug mode
npx playwright test --debug

# Run with UI mode
npx playwright test --ui

# Generate trace on failure
npx playwright test --trace on
```

### 2. Add Debug Information

```typescript
// Add screenshots on failure
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({
      path: `test-results/failure-${Date.now()}.png`,
      fullPage: true,
    })
  }
})
```

### 3. Use Verbose Logging

```typescript
// Log key information during test execution
console.log('Current URL:', page.url())
console.log('Viewport:', page.viewportSize())
console.log(
  'Storage status:',
  await page.textContent('[data-testid="storage-status"]')
)
```

## Common Patterns

### Authentication Flow

```typescript
async function loginUser(page: Page, email: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.click('button:has-text("Send Magic Link")')
  // Mock the verification for testing
  await page.goto(`/auth/verify?token=test-token`)
  await expect(page).toHaveURL('/logbook')
}
```

### Data Creation

```typescript
async function createTestEntry(page: Page, title: string) {
  await page.click('button:has-text("Add Entry")')
  await page.fill('input[placeholder="Title"]', title)
  await page.click('button:has-text("Save")')
  await expect(page.locator(`text="${title}"`)).toBeVisible()
}
```

### Cleanup

```typescript
test.beforeEach(async ({ page }) => {
  // Clear local storage
  await page.evaluate(() => localStorage.clear())

  // Reset to known state
  await page.goto('/logbook')
})
```

## Performance Tips

1. **Parallel Execution**: Configure tests to run in parallel when possible
2. **Reuse Authentication**: Use Playwright's storage state to reuse auth
3. **Minimize Navigation**: Group related assertions to reduce page loads
4. **Smart Waits**: Use specific conditions instead of generic timeouts

## Maintenance

1. **Regular Reviews**: Review flaky tests weekly
2. **Update Selectors**: Keep selectors up-to-date with UI changes
3. **Monitor Metrics**: Track test execution time and failure rates
4. **Document Changes**: Update this guide with new patterns

## Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Web-First Assertions](https://playwright.dev/docs/test-assertions)
- [Debugging Tests](https://playwright.dev/docs/debug)
