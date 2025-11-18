import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Playwright configuration specifically for capturing screenshots for Remotion tutorial videos.
 * This is NOT for E2E testing - it's for generating visual assets.
 */
export default defineConfig({
  testDir: './tests/screenshots',
  fullyParallel: false, // Run sequentially for consistent screenshot capture
  forbidOnly: true,
  retries: 0,
  workers: 1, // Single worker for deterministic output
  reporter: [['list']],
  timeout: 120000, // 2 minutes per test

  use: {
    baseURL: 'http://www-mirubato.localhost:4000',
    trace: 'off',
    screenshot: 'off', // We'll capture manually
    video: 'off',
    headless: true,
    launchOptions: {
      headless: true,
    },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }, // Match video resolution
        headless: true,
      },
    },
    // Mobile project disabled - screenshots are only for desktop Remotion video
    // {
    //   name: 'mobile',
    //   use: {
    //     ...devices['Pixel 5'],
    //     headless: true,
    //   },
    // },
  ],

  // Output directory for screenshots - goes directly to remotion-tutorial
  outputDir: path.resolve(__dirname, '../remotion-tutorial/public/screenshots'),

  webServer: {
    command: 'pnpm run dev',
    url: 'http://www-mirubato.localhost:4000',
    reuseExistingServer: true, // Reuse if already running
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
