#!/usr/bin/env node

/**
 * Script to upload actual test PDFs to local R2 storage
 * Usage: node upload-real-pdfs.js
 */

const fs = require('fs')
const path = require('path')

// Configuration
const API_URL = 'http://scores-mirubato.localhost:9788'
const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data')

// Test files configuration
const TEST_FILES = [
  {
    filename: 'score_01.pdf',
    key: 'test-data/score_01.pdf',
    metadata: {
      title: 'Aire Sureño',
      composer: 'Agustín Barrios Mangoré',
      instrument: 'GUITAR',
      difficulty: 'ADVANCED',
    },
  },
  {
    filename: 'score_02.pdf',
    key: 'test-data/score_02.pdf',
    metadata: {
      title: 'Romance (Spanish Romance)',
      composer: 'Anonymous (arr. Eythor Thorlaksson)',
      instrument: 'GUITAR',
      difficulty: 'INTERMEDIATE',
    },
  },
]

async function uploadFile(fileConfig) {
  const filePath = path.join(TEST_DATA_DIR, fileConfig.filename)

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    return false
  }

  // Read file and convert to base64
  const fileBuffer = fs.readFileSync(filePath)
  const base64Content = fileBuffer.toString('base64')

  console.log(`📤 Uploading ${fileConfig.filename}...`)

  try {
    // Upload via the dev endpoint
    const response = await fetch(`${API_URL}/api/dev/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: fileConfig.filename,
        content: `data:application/pdf;base64,${base64Content}`,
        metadata: fileConfig.metadata,
        customKey: fileConfig.key, // Use the exact key expected by frontend
      }),
    })

    const result = await response.json()

    if (result.success) {
      console.log(`✅ ${fileConfig.filename} uploaded successfully`)
      console.log(`   URL: ${result.url || `${API_URL}/api/${result.key}`}`)
      return true
    } else {
      console.error(
        `❌ Failed to upload ${fileConfig.filename}: ${result.error}`
      )
      return false
    }
  } catch (error) {
    console.error(`❌ Error uploading ${fileConfig.filename}:`, error.message)
    return false
  }
}

async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  console.log('🎵 Mirubato PDF Upload Tool')
  console.log('===========================\n')

  // Check if API is running
  console.log('🔍 Checking API health...')
  const isHealthy = await checkHealth()

  if (!isHealthy) {
    console.error(
      '❌ API is not running! Please start the scores service first:'
    )
    console.error('   cd scores && npm run dev')
    process.exit(1)
  }

  console.log('✅ API is healthy\n')

  // Upload each file
  let successCount = 0
  for (const fileConfig of TEST_FILES) {
    const success = await uploadFile(fileConfig)
    if (success) successCount++
    console.log('') // Empty line between files
  }

  // Summary
  console.log('===========================')
  console.log(
    `📊 Upload Summary: ${successCount}/${TEST_FILES.length} files uploaded successfully`
  )

  if (successCount === TEST_FILES.length) {
    console.log('\n🎉 All test PDFs uploaded successfully!')
    console.log('\n📍 You can now view the scores at:')
    console.log('   - http://localhost:3000/scorebook/test_aire_sureno')
    console.log('   - http://localhost:3000/scorebook/test_romance_anonimo')
  } else {
    console.log('\n⚠️  Some uploads failed. Please check the errors above.')
  }
}

// Run the script
main().catch(console.error)
