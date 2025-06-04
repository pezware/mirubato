// This file should be generated during build process
// For now, we'll use environment variables or defaults

let frontend = 'dev'
let gitCommit = 'unknown'
let buildTime = new Date().toISOString()

// Only access import.meta in non-test environment
try {
  // @ts-ignore
  if (import.meta?.env) {
    // @ts-ignore
    frontend =
      import.meta.env.VITE_APP_VERSION ||
      import.meta.env.VITE_GIT_COMMIT ||
      'dev'
    // @ts-ignore
    gitCommit = import.meta.env.VITE_GIT_COMMIT || 'unknown'
    // @ts-ignore
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
