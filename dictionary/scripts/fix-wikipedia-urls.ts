#!/usr/bin/env tsx

/**
 * Script to fix Wikipedia URLs in existing dictionary entries
 * This will update URLs that have incorrect formats like "The_Magic_Flute_Mozart"
 * to the correct format like "The_Magic_Flute"
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client'
import {
  generateWikipediaUrl,
  validateWikipediaUrl,
} from '../src/utils/wikipedia-url'

// Load environment variables
config({ path: '.env.local' })

const DB_URL = process.env.DATABASE_URL || 'file:local.db'
const DB_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN

if (!DB_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

// Create database client
const db = createClient({
  url: DB_URL,
  authToken: DB_AUTH_TOKEN,
})

interface EntryToFix {
  id: string
  term: string
  type: string
  references: any
}

async function fixWikipediaUrls() {
  console.log('Starting Wikipedia URL fix...')

  try {
    // Get all entries with Wikipedia references
    const result = await db.execute(`
      SELECT id, term, type, references
      FROM dictionary_entries
      WHERE json_extract(references, '$.wikipedia') IS NOT NULL
    `)

    const entries = result.rows as unknown as EntryToFix[]
    console.log(`Found ${entries.length} entries with Wikipedia references`)

    let fixedCount = 0
    let errorCount = 0

    for (const entry of entries) {
      try {
        const references = JSON.parse(entry.references as string)

        if (!references.wikipedia?.url) {
          continue
        }

        const currentUrl = references.wikipedia.url
        console.log(`\nChecking: ${entry.term} (${entry.type})`)
        console.log(`Current URL: ${currentUrl}`)

        // Generate the correct URL
        const correctUrl = generateWikipediaUrl(entry.term, entry.type)

        // If URLs are different, we need to fix it
        if (currentUrl !== correctUrl) {
          console.log(`Suggested fix: ${correctUrl}`)

          // Validate the new URL
          const isValid = await validateWikipediaUrl(correctUrl)

          if (isValid) {
            // Update the references
            references.wikipedia.url = correctUrl
            references.wikipedia.last_verified = new Date().toISOString()

            // Update the database
            await db.execute({
              sql: `
                UPDATE dictionary_entries
                SET references = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `,
              args: [JSON.stringify(references), entry.id],
            })

            console.log(`✅ Fixed: ${entry.term}`)
            fixedCount++
          } else {
            console.log(`❌ New URL is not valid, keeping original`)
            errorCount++
          }
        } else {
          console.log(`✓ URL is already correct`)
        }
      } catch (error) {
        console.error(`Error processing entry ${entry.id}:`, error)
        errorCount++
      }
    }

    console.log(`\n\nSummary:`)
    console.log(`- Total entries checked: ${entries.length}`)
    console.log(`- URLs fixed: ${fixedCount}`)
    console.log(`- Errors: ${errorCount}`)
  } catch (error) {
    console.error('Error fixing Wikipedia URLs:', error)
    process.exit(1)
  } finally {
    await db.close()
  }
}

// Add command line flags
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

if (dryRun) {
  console.log('DRY RUN MODE - No changes will be made')
}

// Run the script
fixWikipediaUrls().catch(console.error)
