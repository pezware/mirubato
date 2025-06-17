#!/usr/bin/env node

/**
 * Development Server for Mirubato Backend
 *
 * This script provides a proper development workflow that avoids circular loops
 * by managing the build and server processes separately.
 */

import { spawn } from 'child_process'
import { watch } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
// Simple debounce implementation (no external dependencies)
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(dirname(__filename)) // Go up to backend directory

// Logging utilities
const log = {
  info: msg => console.log(`🔧 ${msg}`),
  success: msg => console.log(`✅ ${msg}`),
  warn: msg => console.warn(`⚠️  ${msg}`),
  error: msg => console.error(`❌ ${msg}`),
}

let wranglerProcess = null
let isBuilding = false

/**
 * Run the development build (TypeScript compilation)
 */
async function runDevBuild() {
  if (isBuilding) {
    log.info('Build already in progress, skipping...')
    return
  }

  isBuilding = true
  log.info('Running TypeScript compilation...')

  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npx', ['tsc'], {
      cwd: __dirname,
      stdio: 'inherit',
    })

    buildProcess.on('close', code => {
      isBuilding = false
      if (code === 0) {
        log.success('TypeScript compilation completed')
        resolve()
      } else {
        log.error(`TypeScript compilation failed with code ${code}`)
        reject(new Error(`Build failed with code ${code}`))
      }
    })

    buildProcess.on('error', error => {
      isBuilding = false
      log.error(`Build process error: ${error.message}`)
      reject(error)
    })
  })
}

/**
 * Start the wrangler development server
 */
function startWranglerServer() {
  if (wranglerProcess) {
    log.info('Stopping existing wrangler process...')
    wranglerProcess.kill('SIGTERM')
  }

  log.info('Starting wrangler development server...')

  wranglerProcess = spawn('npx', ['wrangler', 'dev', '--env', 'local'], {
    cwd: __dirname,
    stdio: 'inherit',
  })

  wranglerProcess.on('close', code => {
    if (code !== null && code !== 0) {
      log.error(`Wrangler process exited with code ${code}`)
    }
    wranglerProcess = null
  })

  wranglerProcess.on('error', error => {
    log.error(`Wrangler process error: ${error.message}`)
    wranglerProcess = null
  })
}

/**
 * Restart the development server
 */
const restartServer = debounce(async () => {
  try {
    await runDevBuild()
    startWranglerServer()
  } catch (error) {
    log.error(`Failed to restart server: ${error.message}`)
  }
}, 1000) // Debounce for 1 second

/**
 * Set up file watching
 */
function setupFileWatcher() {
  const srcPath = join(__dirname, 'src')

  log.info('Setting up file watcher...')

  const watcher = watch(srcPath, { recursive: true }, (eventType, filename) => {
    if (
      filename &&
      (filename.endsWith('.ts') || filename.endsWith('.graphql'))
    ) {
      log.info(`File changed: ${filename}`)
      restartServer()
    }
  })

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log.info('Shutting down development server...')
    watcher.close()
    if (wranglerProcess) {
      wranglerProcess.kill('SIGTERM')
    }
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    log.info('Shutting down development server...')
    watcher.close()
    if (wranglerProcess) {
      wranglerProcess.kill('SIGTERM')
    }
    process.exit(0)
  })

  log.success('File watcher set up, watching for changes...')
}

/**
 * Main development server function
 */
async function startDevelopmentServer() {
  log.info('Starting Mirubato Backend Development Server...')

  try {
    // Initial build
    await runDevBuild()

    // Start the wrangler server
    startWranglerServer()

    // Set up file watching for auto-restart
    setupFileWatcher()

    log.success('Development server is ready!')
    log.info('Press Ctrl+C to stop the server')
  } catch (error) {
    log.error(`Failed to start development server: ${error.message}`)
    process.exit(1)
  }
}

// Start the development server
startDevelopmentServer()
