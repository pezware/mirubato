// This file should be generated during build process
// For now, we'll use environment variables or defaults

let frontend = 'dev'
let gitCommit = 'unknown'
let buildTime = new Date().toISOString()

// Only access import.meta in non-test environment
try {
  if (import.meta?.env) {
    frontend =
      import.meta.env.VITE_APP_VERSION ||
      import.meta.env.VITE_GIT_COMMIT ||
      'dev'
    gitCommit = import.meta.env.VITE_GIT_COMMIT || 'unknown'
    buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString()
  }
} catch (e) {
  // In test environment, use defaults
}

export const version = {
  frontend,
  gitCommit,
  buildTime,
}
