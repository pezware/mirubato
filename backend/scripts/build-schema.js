#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read the GraphQL schema
const schemaPath = join(__dirname, '../src/schema/schema.graphql')
const schemaContent = readFileSync(schemaPath, 'utf-8')

// Generate the JavaScript module
// Use ES modules for production (Cloudflare), CommonJS for tests
const isProduction =
  process.env.NODE_ENV === 'production' || process.env.CF_PAGES === '1'
const jsContent = isProduction
  ? `// Auto-generated file. Do not edit directly.
// Generated from schema.graphql

export const schemaContent = ${JSON.stringify(schemaContent)};
`
  : `// Auto-generated file. Do not edit directly.
// Generated from schema.graphql

module.exports.schemaContent = ${JSON.stringify(schemaContent)};
`

// Write to schema-content.js in src
const outputPath = join(__dirname, '../src/schema/schema-content.js')
writeFileSync(outputPath, jsContent, 'utf-8')

// Also write to dist if it exists (for post-build)
try {
  const distPath = join(
    __dirname,
    '../dist/backend/src/schema/schema-content.js'
  )
  const distDir = dirname(distPath)

  // Check if dist directory exists
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true })
  }

  writeFileSync(distPath, jsContent, 'utf-8')
  console.log('✅ Generated schema-content.js in src/ and dist/')
} catch (e) {
  console.log('✅ Generated schema-content.js in src/')
}
