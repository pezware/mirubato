#!/usr/bin/env tsx

/**
 * Script to upload test score PDFs to the scores service
 * Usage: npm run upload-test-scores
 */

import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

const SCORES_API_URL = process.env.SCORES_API_URL || 'http://localhost:8787'

interface ScoreMetadata {
  title: string
  composer: string
  instrument: 'PIANO' | 'GUITAR'
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  tags: string[]
}

const testScores: { file: string; metadata: ScoreMetadata }[] = [
  {
    file: 'score_01.pdf',
    metadata: {
      title: 'Test Score 1 - Piano Etude',
      composer: 'Test Composer',
      instrument: 'PIANO',
      difficulty: 'INTERMEDIATE',
      tags: ['test', 'etude', 'practice'],
    },
  },
  {
    file: 'score_02.pdf',
    metadata: {
      title: 'Test Score 2 - Guitar Study',
      composer: 'Test Composer',
      instrument: 'GUITAR',
      difficulty: 'BEGINNER',
      tags: ['test', 'study', 'classical'],
    },
  },
]

async function uploadScore(filePath: string, metadata: ScoreMetadata) {
  const formData = new FormData()

  // Add the PDF file
  const fileStream = fs.createReadStream(filePath)
  formData.append('file', fileStream, path.basename(filePath))

  // Add metadata as JSON string
  formData.append('metadata', JSON.stringify(metadata))

  try {
    const response = await fetch(`${SCORES_API_URL}/api/import/pdf`, {
      method: 'POST',
      body: formData as any,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Upload failed: ${response.status} - ${error}`)
    }

    const result = await response.json()
    console.log(`✅ Uploaded ${metadata.title}:`, result)
    return result
  } catch (error) {
    console.error(`❌ Failed to upload ${metadata.title}:`, error)
    throw error
  }
}

async function main() {
  console.log(`📤 Uploading test scores to ${SCORES_API_URL}`)
  console.log('---')

  const testDataDir = path.join(__dirname, '..', 'test-data')

  for (const testScore of testScores) {
    const filePath = path.join(testDataDir, testScore.file)

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`)
      continue
    }

    try {
      await uploadScore(filePath, testScore.metadata)
    } catch (error) {
      // Continue with next file even if one fails
    }
  }

  console.log('---')
  console.log('📋 Upload complete!')

  // List all scores to verify
  try {
    const listResponse = await fetch(`${SCORES_API_URL}/api/scores`)
    if (listResponse.ok) {
      const scores = await listResponse.json()
      console.log(`\n📚 Total scores in database: ${scores.data?.length || 0}`)
    }
  } catch (error) {
    console.error('Failed to list scores:', error)
  }
}

// Run the script
main().catch(console.error)
