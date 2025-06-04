// This file should be generated during build process
// For now, we'll use environment variables or defaults

export const version = {
  frontend:
    process.env.VITE_APP_VERSION || process.env.VITE_GIT_COMMIT || 'dev',
  gitCommit: process.env.VITE_GIT_COMMIT || 'unknown',
  buildTime: process.env.VITE_BUILD_TIME || new Date().toISOString(),
}
