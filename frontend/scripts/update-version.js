#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Get git information
const commitHash = execSync('git rev-parse HEAD').toString().trim()
const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
const buildTime = new Date().toISOString()

// Create version object
const version = {
  buildTime,
  commitHash,
  branch,
  shortHash: commitHash.substring(0, 8),
}

// Write to public/version.json
const versionPath = path.join(__dirname, '../public/version.json')
fs.writeFileSync(versionPath, JSON.stringify(version, null, 2))

console.log('Version info updated:', version)
