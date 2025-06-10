#!/usr/bin/env node

/**
 * Single File MXL Converter
 * 
 * Converts a single MXL file to multi-voice format
 * Usage: node convertSingle.js <path-to-mxl-file>
 */

import { existsSync, mkdirSync } from 'fs'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { convertMXLFile } from './convertMXL.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  // Check if file path is provided
  if (process.argv.length < 3) {
    console.error('Usage: node convertSingle.js <path-to-mxl-file>')
    console.error('Example: node convertSingle.js ~/Documents/piece.mxl')
    process.exit(1)
  }

  const inputPath = process.argv[2]
  
  // Check if file exists
  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`)
    process.exit(1)
  }

  // Check if it's an MXL file
  if (!inputPath.endsWith('.mxl')) {
    console.error('Error: File must have .mxl extension')
    process.exit(1)
  }

  // Set up output directory
  const outputDir = join(dirname(__dirname), 'output')
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  console.log('🎵 Converting single MXL file...')
  console.log(`Input: ${inputPath}`)
  console.log(`Output directory: ${outputDir}`)

  try {
    await convertMXLFile(inputPath, outputDir)
    console.log('✨ Conversion complete!')
  } catch (error) {
    console.error('❌ Conversion failed:', error.message)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})