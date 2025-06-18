#!/usr/bin/env node

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

try {
  // Check if the built schema file exists and uses ES modules
  const schemaPath = join(
    __dirname,
    '../dist/backend/src/schema/schema-content.js'
  )
  const content = readFileSync(schemaPath, 'utf-8')

  if (!content.includes('export const schemaContent')) {
    throw new Error('Built schema file is not using ES modules!')
  }

  // Try to import it to verify it's valid ES module syntax
  await import(schemaPath)

  console.log(
    '✅ Build verification passed: ES modules are correctly generated'
  )
  process.exit(0)
} catch (error) {
  console.error('❌ Build verification failed:', error.message)
  process.exit(1)
}
