#!/usr/bin/env tsx

/**
 * Script to reprocess imported PDFs that were marked as completed without page rendering
 * This identifies scores imported via the import API that don't have rendered pages
 * and requeues them for processing.
 */

import { fileURLToPath } from 'node:url'
import { Miniflare } from 'miniflare'

// The state directory that `wrangler dev --env local` persists to
const LOCAL_STATE = fileURLToPath(
  new URL('../.wrangler/state/v3', import.meta.url)
)

interface Score {
  id: string
  slug: string
  title: string
  source: string
  processing_status: string
  pdf_url: string
  file_name: string
  created_at: string
}

async function main() {
  const env = process.argv[2] || 'local'
  console.log(`🔄 Reprocessing imported PDFs for environment: ${env}`)

  // Open the local state that `wrangler dev --env local` uses
  let mf: Miniflare | undefined
  let db: D1Database
  let queue: Queue | undefined
  let bucket: R2Bucket

  if (env === 'local') {
    // The binding IDs match [env.local] in wrangler.toml, which declares no queue
    mf = new Miniflare({
      modules: true,
      script: 'export default {}',
      d1Databases: { DB: 'local' },
      d1Persist: `${LOCAL_STATE}/d1`,
      r2Buckets: { SCORES_BUCKET: 'mirubato-scores-local' },
      r2Persist: `${LOCAL_STATE}/r2`,
    })
    const bindings = await mf.getBindings<{
      DB: D1Database
      SCORES_BUCKET: R2Bucket
      PDF_QUEUE?: Queue
    }>()
    db = bindings.DB
    queue = bindings.PDF_QUEUE
    bucket = bindings.SCORES_BUCKET
  } else {
    console.error('❌ This script currently only supports local environment')
    console.log('For production/staging, use the admin API endpoint instead')
    process.exit(1)
  }

  try {
    // Find scores that were imported (source = 'manual') and marked as completed
    // but likely don't have rendered pages
    const result = await db
      .prepare(
        `SELECT id, slug, title, source, processing_status, pdf_url, file_name, created_at
         FROM scores 
         WHERE source = 'manual' 
         AND processing_status = 'completed'
         ORDER BY created_at DESC`
      )
      .all<Score>()

    console.log(
      `📊 Found ${result.results.length} imported scores marked as completed`
    )

    if (result.results.length === 0) {
      console.log('✅ No scores need reprocessing')
      return
    }

    // Check each score to see if it has rendered pages
    const scoresToReprocess: Score[] = []

    for (const score of result.results) {
      // Extract R2 key from pdf_url (format: /files/imports/{scoreId}/{filename})
      const r2Key = score.pdf_url.replace('/files/', '')

      // Check if the first rendered page exists
      const firstPageKey = `rendered/${score.id}/page-1.webp`
      const firstPage = await bucket.head(firstPageKey)

      if (!firstPage) {
        console.log(
          `❌ Score ${score.id} (${score.title}) has no rendered pages`
        )
        scoresToReprocess.push(score)
      } else {
        console.log(
          `✅ Score ${score.id} (${score.title}) already has rendered pages`
        )
      }
    }

    console.log(`\n📋 ${scoresToReprocess.length} scores need reprocessing`)

    if (scoresToReprocess.length === 0) {
      console.log('✅ All imported scores have rendered pages')
      return
    }

    // Without a queue nothing renders the pages, and a pending status would never clear
    if (!queue) {
      console.log(
        '\n⚠️  [env.local] declares no PDF_QUEUE, so this script changes nothing.'
      )
      console.log(
        'Use POST /api/admin/reprocess-imports on staging or production instead.'
      )
      return
    }

    // Ask for confirmation
    console.log('\nScores to reprocess:')
    scoresToReprocess.forEach(score => {
      console.log(`  - ${score.title} (${score.id})`)
    })

    console.log('\n⚠️  This will:')
    console.log('  1. Update processing_status to "pending"')
    console.log('  2. Queue PDFs for page rendering')
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...')

    await new Promise(resolve => setTimeout(resolve, 5000))

    // Update status and queue for reprocessing
    let processed = 0
    let failed = 0

    for (const score of scoresToReprocess) {
      try {
        // Update status to pending
        await db
          .prepare('UPDATE scores SET processing_status = ? WHERE id = ?')
          .bind('pending', score.id)
          .run()

        // Extract R2 key from pdf_url
        const r2Key = score.pdf_url.replace('/files/', '')

        // Queue for processing
        await queue.send({
          type: 'process-new-score',
          scoreId: score.id,
          r2Key: r2Key,
          uploadedAt: score.created_at,
        })

        console.log(`✅ Queued ${score.title} for reprocessing`)
        processed++
      } catch (error) {
        console.error(`❌ Failed to reprocess ${score.title}:`, error)
        failed++
      }
    }

    console.log(`\n📊 Reprocessing complete:`)
    console.log(`  ✅ Successfully queued: ${processed}`)
    console.log(`  ❌ Failed: ${failed}`)
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  } finally {
    await mf?.dispose()
  }
}

// Run the script
main().catch(console.error)
