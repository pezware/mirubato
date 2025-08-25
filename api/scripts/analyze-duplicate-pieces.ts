#!/usr/bin/env tsx

/**
 * Script to analyze duplicate pieces in the database
 * This script will identify pieces that are the same but stored with different capitalizations
 */

import { execSync } from 'child_process'

interface PieceData {
  title: string
  composer: string | null
  scoreId?: string
}

interface EntryPiece {
  id: string
  entry_id: string
  pieces: PieceData[]
  raw_data: string
}

// Normalization functions (matching frontend exactly)
function normalizePieceTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/[–—]/g, '-') // Normalize dashes
}

function normalizeComposer(composer: string): string {
  return composer
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/\./g, '') // Remove periods (e.g., "J.S. Bach" -> "js bach")
}

function generateNormalizedScoreId(
  title: string,
  composer?: string | null
): string {
  const normalizedTitle = normalizePieceTitle(title)

  if (composer) {
    const normalizedComposer = normalizeComposer(composer)
    return `${normalizedTitle}-${normalizedComposer}`
  }

  return normalizedTitle
}

async function executeD1Query(
  query: string,
  env: string = 'staging'
): Promise<any> {
  try {
    const dbName = env === 'production' ? 'mirubato-prod' : 'mirubato-dev'
    const command = `wrangler d1 execute ${dbName} --env ${env} --remote --command "${query.replace(/"/g, '\\"')}"`
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    // Parse the wrangler output - look for JSON array in the output
    const lines = result.split('\n')

    // Find the line that contains the results (starts with '[')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('[') && trimmed.includes('"results"')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed) && parsed[0]?.results) {
            return parsed[0].results
          }
        } catch (e) {
          // Continue to next line if JSON parse fails
        }
      }
    }

    return []
  } catch (error: any) {
    console.error('Error executing query:', error.message || error)
    return []
  }
}

async function analyzeDuplicates() {
  const env = process.argv[2] || 'staging'
  const dbName = env === 'production' ? 'mirubato-prod' : 'mirubato-dev'
  console.log(
    `🔍 Analyzing duplicate pieces in ${env} database (${dbName})...\n`
  )

  // Step 1: Get all entries with pieces
  console.log('📊 Fetching all logbook entries with pieces...')
  const entriesQuery = `
    SELECT id, data
    FROM sync_data
    WHERE entity_type = 'logbook_entry'
    AND json_extract(data, '$.pieces') IS NOT NULL
    LIMIT 1000
  `

  const entries = await executeD1Query(entriesQuery, env)
  console.log(`Found ${entries.length} entries with pieces\n`)

  // Step 2: Extract and normalize all pieces
  const pieceMap = new Map<
    string,
    Array<{
      original: PieceData
      entryId: string
    }>
  >()

  const allPieces: PieceData[] = []

  for (const entry of entries) {
    try {
      const data =
        typeof entry.data === 'string' ? JSON.parse(entry.data) : entry.data

      if (data.pieces && Array.isArray(data.pieces)) {
        for (const piece of data.pieces) {
          if (piece.title) {
            const normalizedId = generateNormalizedScoreId(
              piece.title,
              piece.composer
            )

            if (!pieceMap.has(normalizedId)) {
              pieceMap.set(normalizedId, [])
            }

            pieceMap.get(normalizedId)!.push({
              original: piece,
              entryId: entry.id,
            })

            allPieces.push(piece)
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing entry ${entry.id}:`, error)
    }
  }

  // Step 3: Find duplicates (same normalized ID but different original text)
  console.log('🔎 Analyzing duplicates...\n')

  const duplicates = new Map<string, Set<string>>()
  let totalDuplicateGroups = 0
  let totalDuplicateEntries = 0

  for (const [normalizedId, pieces] of pieceMap.entries()) {
    if (pieces.length > 1) {
      // Check if there are different variations
      const variations = new Set<string>()

      for (const { original } of pieces) {
        const key = `${original.title}|${original.composer || ''}`
        variations.add(key)
      }

      if (variations.size > 1) {
        totalDuplicateGroups++
        totalDuplicateEntries += pieces.length

        duplicates.set(normalizedId, variations)

        console.log(`📝 Duplicate found: "${normalizedId}"`)
        console.log(`   Variations (${variations.size}):`)

        for (const variation of variations) {
          const [title, composer] = variation.split('|')
          const count = pieces.filter(
            p =>
              `${p.original.title}|${p.original.composer || ''}` === variation
          ).length
          console.log(
            `     - "${title}"${composer ? ` by "${composer}"` : ''} (${count} entries)`
          )
        }
        console.log()
      }
    }
  }

  // Step 4: Summary statistics
  console.log('📈 Summary Statistics:')
  console.log('━'.repeat(50))
  console.log(`Total entries analyzed: ${entries.length}`)
  console.log(`Total pieces found: ${allPieces.length}`)
  console.log(`Unique normalized pieces: ${pieceMap.size}`)
  console.log(`Duplicate groups found: ${totalDuplicateGroups}`)
  console.log(`Total duplicate entries: ${totalDuplicateEntries}`)

  if (totalDuplicateGroups > 0) {
    console.log(
      `\n⚠️  Found ${totalDuplicateGroups} pieces with inconsistent capitalization`
    )
    console.log(
      'These need to be normalized to prevent duplicates in search results.'
    )
  } else {
    console.log('\n✅ No duplicates found!')
  }

  // Step 5: Generate migration recommendations
  if (duplicates.size > 0) {
    console.log('\n📋 Migration Recommendations:')
    console.log('━'.repeat(50))
    console.log(
      '1. Run the normalization migration script to fix these duplicates'
    )
    console.log('2. Update all references to use normalized IDs')
    console.log('3. Add validation to prevent future duplicates')

    // Export duplicate data for migration script
    const duplicateData = Array.from(duplicates.entries()).map(
      ([id, variations]) => ({
        normalizedId: id,
        variations: Array.from(variations).map(v => {
          const [title, composer] = v.split('|')
          return { title, composer: composer || null }
        }),
      })
    )

    // Save to file for migration script
    const fs = await import('fs')
    const outputPath = './duplicate-pieces-report.json'
    fs.writeFileSync(outputPath, JSON.stringify(duplicateData, null, 2))
    console.log(`\n💾 Duplicate data saved to: ${outputPath}`)
  }
}

// Run the analysis
analyzeDuplicates().catch(console.error)
