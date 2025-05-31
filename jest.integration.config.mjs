/** @type {import('jest').Config} */
export default {
  displayName: 'integration',
  preset: './jest.config.mjs',
  testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,tsx}'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.ts'],
  // Integration tests don't need coverage thresholds
  coverageThreshold: undefined
}