import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true, // Enable parallel execution for better performance
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Reduce retries to save time
  workers: process.env.CI ? 2 : undefined, // Optimized for 2 shards in CI
  reporter: process.env.CI ? [['list'], ['html']] : 'html',
  timeout: 60000, // Increase global timeout to 60 seconds for complex tests
  use: {
    baseURL: 'http://localhost:4000',
    trace: process.env.CI ? 'retain-on-failure' : 'on',
    screenshot: process.env.CI ? 'only-on-failure' : 'on',
    video: process.env.CI ? 'retain-on-failure' : 'on',
    // Force headless mode
    headless: true,
    // Disable any headed mode options
    launchOptions: {
      headless: true,
    },
    // Add actionTimeout for individual actions
    actionTimeout: 10000,
    // Add navigationTimeout for page navigation
    navigationTimeout: 30000,
  },

  // In CI, only run Chromium to save time. Locally, test all browsers.
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            headless: true,
          },
        },
      ]
    : [
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            headless: true,
          },
        },
        {
          name: 'firefox',
          use: {
            ...devices['Desktop Firefox'],
            headless: true,
          },
        },
        {
          name: 'webkit',
          use: {
            ...devices['Desktop Safari'],
            headless: true,
          },
        },
        {
          name: 'Mobile Chrome',
          use: {
            ...devices['Pixel 5'],
            headless: true,
          },
        },
        {
          name: 'Mobile Safari',
          use: {
            ...devices['iPhone 12'],
            headless: true,
          },
        },
      ],

  webServer: {
    command: 'pnpm run dev',
    port: 4000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
