#!/usr/bin/env node
/**
 * D1-compatible migration script for Cloudflare Workers
 * This can be run directly with wrangler d1 execute
 *
 * Usage:
 *   wrangler d1 execute mirubato-dev --local --command="SELECT 1" --file=scripts/d1-migrate-sync.js
 *   wrangler d1 execute mirubato-prod --command="SELECT 1" --file=scripts/d1-migrate-sync.js
 */

const crypto = require('crypto')

// Helper function to calculate checksum
function calculateChecksum(data) {
  const jsonString = JSON.stringify(data)
  return crypto.createHash('sha256').update(jsonString).digest('hex')
}

// Helper function to generate sync ID
function generateSyncId() {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Transform logbook entry
function transformLogbookEntry(row) {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp).toISOString(),
    duration: row.duration,
    type: row.type,
    instrument: row.instrument,
    pieces: JSON.parse(row.pieces || '[]'),
    techniques: JSON.parse(row.techniques || '[]'),
    goalIds: JSON.parse(row.goal_ids || '[]'),
    notes: row.notes || null,
    mood: row.mood || null,
    tags: JSON.parse(row.tags || '[]'),
    sessionId: row.session_id || null,
    metadata: row.metadata ? JSON.parse(row.metadata) : { source: 'manual' },
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

// Transform goal
function transformGoal(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || null,
    targetDate: row.target_date
      ? new Date(row.target_date).toISOString()
      : null,
    progress: row.progress || 0,
    milestones: JSON.parse(row.milestones || '[]'),
    status: row.status || 'ACTIVE',
    linkedEntries: JSON.parse(row.linked_entries || '[]'),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    completedAt: row.completed_at
      ? new Date(row.completed_at).toISOString()
      : null,
  }
}

// Main migration function
async function migrate(db, options = {}) {
  const { dryRun = false, batchSize = 100, entityType = null } = options

  console.log('Starting migration with options:', options)

  const stats = {
    logbook_entries: {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    },
    goals: { processed: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
  }

  // Migrate logbook entries
  if (!entityType || entityType === 'logbook_entry') {
    console.log('\nMigrating logbook entries...')

    let offset = 0
    let hasMore = true

    while (hasMore) {
      const batch = await db
        .prepare(
          `
        SELECT * FROM logbook_entries 
        ORDER BY id 
        LIMIT ? OFFSET ?
      `
        )
        .bind(batchSize, offset)
        .all()

      if (batch.results.length === 0) {
        hasMore = false
        break
      }

      for (const entry of batch.results) {
        stats.logbook_entries.processed++

        try {
          const transformed = transformLogbookEntry(entry)
          const checksum = calculateChecksum(transformed)

          // Check if already exists
          const existing = await db
            .prepare(
              `
            SELECT checksum FROM sync_data 
            WHERE user_id = ? AND entity_type = ? AND entity_id = ?
          `
            )
            .bind(entry.user_id, 'logbook_entry', entry.id)
            .first()

          if (existing && existing.checksum === checksum) {
            stats.logbook_entries.skipped++
            continue
          }

          if (!dryRun) {
            const syncId = generateSyncId()
            await db
              .prepare(
                `
              INSERT INTO sync_data (id, user_id, entity_type, entity_id, data, checksum, version)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, entity_type, entity_id)
              DO UPDATE SET 
                data = excluded.data,
                checksum = excluded.checksum,
                version = sync_data.version + 1,
                updated_at = datetime('now')
              WHERE sync_data.checksum != excluded.checksum
            `
              )
              .bind(
                syncId,
                entry.user_id,
                'logbook_entry',
                entry.id,
                JSON.stringify(transformed),
                checksum,
                1
              )
              .run()
          }

          if (existing) {
            stats.logbook_entries.updated++
          } else {
            stats.logbook_entries.inserted++
          }
        } catch (error) {
          console.error(`Error processing logbook entry ${entry.id}:`, error)
          stats.logbook_entries.errors++
        }
      }

      offset += batchSize
      console.log(`  Processed ${stats.logbook_entries.processed} entries...`)
    }
  }

  // Migrate goals
  if (!entityType || entityType === 'goal') {
    console.log('\nMigrating goals...')

    let offset = 0
    let hasMore = true

    while (hasMore) {
      const batch = await db
        .prepare(
          `
        SELECT * FROM goals 
        ORDER BY id 
        LIMIT ? OFFSET ?
      `
        )
        .bind(batchSize, offset)
        .all()

      if (batch.results.length === 0) {
        hasMore = false
        break
      }

      for (const goal of batch.results) {
        stats.goals.processed++

        try {
          const transformed = transformGoal(goal)
          const checksum = calculateChecksum(transformed)

          // Check if already exists
          const existing = await db
            .prepare(
              `
            SELECT checksum FROM sync_data 
            WHERE user_id = ? AND entity_type = ? AND entity_id = ?
          `
            )
            .bind(goal.user_id, 'goal', goal.id)
            .first()

          if (existing && existing.checksum === checksum) {
            stats.goals.skipped++
            continue
          }

          if (!dryRun) {
            const syncId = generateSyncId()
            await db
              .prepare(
                `
              INSERT INTO sync_data (id, user_id, entity_type, entity_id, data, checksum, version)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, entity_type, entity_id)
              DO UPDATE SET 
                data = excluded.data,
                checksum = excluded.checksum,
                version = sync_data.version + 1,
                updated_at = datetime('now')
              WHERE sync_data.checksum != excluded.checksum
            `
              )
              .bind(
                syncId,
                goal.user_id,
                'goal',
                goal.id,
                JSON.stringify(transformed),
                checksum,
                1
              )
              .run()
          }

          if (existing) {
            stats.goals.updated++
          } else {
            stats.goals.inserted++
          }
        } catch (error) {
          console.error(`Error processing goal ${goal.id}:`, error)
          stats.goals.errors++
        }
      }

      offset += batchSize
      console.log(`  Processed ${stats.goals.processed} goals...`)
    }
  }

  // Print summary
  console.log('\n📊 Migration Summary')
  console.log('===================')

  for (const [entityType, entityStats] of Object.entries(stats)) {
    if (entityStats.processed > 0) {
      console.log(`\n${entityType}:`)
      console.log(`  Total processed: ${entityStats.processed}`)
      console.log(`  Inserted: ${entityStats.inserted}`)
      console.log(`  Updated: ${entityStats.updated}`)
      console.log(`  Skipped (unchanged): ${entityStats.skipped}`)
      console.log(`  Errors: ${entityStats.errors}`)
    }
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No data was actually modified')
  }

  return stats
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { migrate, transformLogbookEntry, transformGoal }
}
