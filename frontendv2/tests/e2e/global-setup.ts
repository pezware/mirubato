import { FullConfig } from '@playwright/test'

async function globalSetup(_config: FullConfig) {
  console.log('Starting global E2E test setup...')

  // Store the start time for performance monitoring
  const startTime = Date.now()

  // Clean up any leftover test artifacts before starting
  if (process.env.CI) {
    console.log('Running in CI - minimal setup')
  } else {
    console.log('Running locally - full setup')
  }

  // Return a teardown function
  return async () => {
    console.log('Running global E2E test teardown...')
    const duration = Date.now() - startTime
    console.log(`Total E2E test duration: ${duration}ms`)

    // Force garbage collection if available (requires --expose-gc flag)
    if (global.gc) {
      console.log('Running garbage collection...')
      global.gc()
    }
  }
}

export default globalSetup
