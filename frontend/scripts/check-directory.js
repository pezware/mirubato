#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Check if we're in the correct directory
const frontendRoot = path.join(__dirname, '..')
const projectRoot = path.join(frontendRoot, '..')

// Check for redundant frontend/frontend folder
const redundantPath = path.join(frontendRoot, 'frontend')
if (fs.existsSync(redundantPath)) {
  console.error('❌ Found redundant frontend/frontend folder!')
  console.error('This folder should not exist and will be removed.')

  // Remove the redundant folder
  fs.rmSync(redundantPath, { recursive: true, force: true })
  console.log('✅ Redundant folder removed.')
}

// Ensure we're running from the correct directory
if (!fs.existsSync(path.join(frontendRoot, 'package.json'))) {
  console.error('❌ Error: This script must be run from the frontend directory')
  process.exit(1)
}

console.log('✅ Directory structure is correct')
