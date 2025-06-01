#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get git information with fallbacks for CI environment
let commitHash = 'unknown'
let branch = 'unknown'

try {
  commitHash = execSync('git rev-parse HEAD').toString().trim()
  branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
} catch (error) {
  console.warn('Git commands failed, using environment variables or defaults')
  // Try to get from environment variables (Cloudflare provides these)
  commitHash =
    process.env.CF_PAGES_COMMIT_SHA || process.env.COMMIT_REF || 'unknown'
  branch = process.env.CF_PAGES_BRANCH || process.env.BRANCH || 'unknown'
}

const buildTime = new Date().toISOString()

// Create version object
const version = {
  buildTime,
  commitHash,
  branch,
  shortHash: commitHash.substring(0, 8),
}

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// Write to public/version.json
const versionPath = path.join(__dirname, '../public/version.json')
fs.writeFileSync(versionPath, JSON.stringify(version, null, 2))

console.log('Version info updated:', version)
