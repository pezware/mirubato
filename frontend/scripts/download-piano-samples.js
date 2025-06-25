#!/usr/bin/env node

/**
 * Downloads Salamander Grand Piano samples for local hosting
 * This avoids CSP issues when deployed to Cloudflare
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const SAMPLES_BASE_URL = 'https://tonejs.github.io/audio/salamander/'
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'salamander')

// List of sample files needed for basic piano functionality
// We'll download a subset to reduce size
const SAMPLE_FILES = [
  'A0.mp3',
  'A1.mp3',
  'A2.mp3',
  'A3.mp3',
  'A4.mp3',
  'A5.mp3',
  'A6.mp3',
  'C1.mp3',
  'C2.mp3',
  'C3.mp3',
  'C4.mp3',
  'C5.mp3',
  'C6.mp3',
  'C7.mp3',
  'D#1.mp3',
  'D#2.mp3',
  'D#3.mp3',
  'D#4.mp3',
  'D#5.mp3',
  'D#6.mp3',
  'F#1.mp3',
  'F#2.mp3',
  'F#3.mp3',
  'F#4.mp3',
  'F#5.mp3',
  'F#6.mp3',
]

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Download a file
function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const url = SAMPLES_BASE_URL + filename
    const outputPath = path.join(OUTPUT_DIR, filename)

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${filename} already exists`)
      resolve()
      return
    }

    const file = fs.createWriteStream(outputPath)

    https
      .get(url, response => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`Failed to download ${filename}: ${response.statusCode}`)
          )
          return
        }

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          console.log(`✓ Downloaded ${filename}`)
          resolve()
        })
      })
      .on('error', err => {
        fs.unlink(outputPath, () => {}) // Delete partial file
        reject(err)
      })
  })
}

// Download all samples
async function downloadAllSamples() {
  console.log('Downloading Salamander Grand Piano samples...')
  console.log(`Output directory: ${OUTPUT_DIR}`)

  try {
    // Download in batches to avoid overwhelming the server
    const batchSize = 5
    for (let i = 0; i < SAMPLE_FILES.length; i += batchSize) {
      const batch = SAMPLE_FILES.slice(i, i + batchSize)
      await Promise.all(batch.map(downloadFile))
    }

    console.log('\n✅ All samples downloaded successfully!')
    console.log('You can now update audioManager.ts to use local samples.')
  } catch (error) {
    console.error('\n❌ Error downloading samples:', error.message)
    process.exit(1)
  }
}

downloadAllSamples()
