#!/usr/bin/env tsx
/**
 * Migration script to copy data from backend tables to API sync_data table
 * This script is idempotent and can be run multiple times safely
 *
 * Usage:
 *   npm run migrate:backend-to-sync -- [options]
 *
 * Options:
 *   --dry-run        Preview changes without modifying data
 *   --batch-size=N   Process N records at a time (default: 1000)
 *   --user=ID        Migrate specific user only
 *   --entity=TYPE    Migrate specific entity type only
 *   --env=ENV        Environment (local|staging|production)
 */

import { D1Database, ExecutionContext } from '@cloudflare/workers-types'
import { createHash } from 'crypto'
import { parseArgs } from 'util'

interface MigrationOptions {
  dryRun: boolean
  batchSize: number
  userFilter?: string
  entityTypes?: ('logbook_entry' | 'goal' | 'practice_session')[]
  environment: 'local' | 'staging' | 'production'
}

interface MigrationStats {
  processed: number
  inserted: number
  updated: number
  skipped: number
  errors: number
  startTime: number
}

interface DbLogbookEntry {
  id: string
  user_id: string
  timestamp: number
  duration: number
  type: string
  instrument: string
  pieces: string
  techniques: string
  goal_ids: string
  notes: string | null
  mood: string | null
  tags: string
  session_id: string | null
  metadata: string | null
  created_at: number
  updated_at: number
}

interface DbGoal {
  id: string
  user_id: string
  title: string
  description: string | null
  target_date: number | null
  progress: number
  milestones: string
  status: string
  linked_entries: string
  created_at: number
  updated_at: number
  completed_at: number | null
}

interface DbPracticeSession {
  id: string
  user_id: string
  instrument: string
  sheet_music_id: string | null
  session_type: string
  started_at: string
  completed_at: string | null
  paused_duration: number
  accuracy_percentage: number | null
  notes_attempted: number
  notes_correct: number
}

class BackendToSyncDataMigration {
  private db: D1Database
  private options: MigrationOptions
  private stats: Record<string, MigrationStats> = {}

  constructor(db: D1Database, options: MigrationOptions) {
    this.db = db
    this.options = options
  }

  async run() {
    console.log('🚀 Starting Backend to Sync Data Migration')
    console.log('Options:', this.options)
    console.log('-----------------------------------')

    try {
      // Initialize migration tracking table
      await this.initializeMigrationTracking()

      // Get entity types to migrate
      const entityTypes = this.options.entityTypes || [
        'logbook_entry',
        'goal',
        'practice_session',
      ]

      for (const entityType of entityTypes) {
        await this.migrateEntityType(entityType)
      }

      // Print summary
      this.printSummary()
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  private async initializeMigrationTracking() {
    if (this.options.dryRun) return

    await this.db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS migration_runs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        last_processed_id TEXT,
        processed_count INTEGER,
        error_count INTEGER,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `
      )
      .run()
  }

  private async migrateEntityType(entityType: string) {
    console.log(`\n📋 Migrating ${entityType}...`)

    this.stats[entityType] = {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      startTime: Date.now(),
    }

    const migrationRunId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Record migration start
      if (!this.options.dryRun) {
        await this.db
          .prepare(
            `
          INSERT INTO migration_runs (id, entity_type, started_at)
          VALUES (?, ?, datetime('now'))
        `
          )
          .bind(migrationRunId, entityType)
          .run()
      }

      // Get last processed ID for incremental migration
      const lastRun = await this.getLastMigrationRun(entityType)

      switch (entityType) {
        case 'logbook_entry':
          await this.migrateLogbookEntries(lastRun?.last_processed_id)
          break
        case 'goal':
          await this.migrateGoals(lastRun?.last_processed_id)
          break
        case 'practice_session':
          await this.migratePracticeSessions(lastRun?.last_processed_id)
          break
      }

      // Record migration completion
      if (!this.options.dryRun) {
        await this.db
          .prepare(
            `
          UPDATE migration_runs 
          SET completed_at = datetime('now'),
              processed_count = ?,
              error_count = ?
          WHERE id = ?
        `
          )
          .bind(
            this.stats[entityType].processed,
            this.stats[entityType].errors,
            migrationRunId
          )
          .run()
      }
    } catch (error) {
      console.error(`❌ Error migrating ${entityType}:`, error)
      throw error
    }
  }

  private async getLastMigrationRun(entityType: string) {
    const result = await this.db
      .prepare(
        `
      SELECT * FROM migration_runs 
      WHERE entity_type = ? AND completed_at IS NOT NULL
      ORDER BY completed_at DESC 
      LIMIT 1
    `
      )
      .bind(entityType)
      .first<{ last_processed_id: string }>()

    return result
  }

  private async migrateLogbookEntries(lastProcessedId?: string) {
    let query = `
      SELECT * FROM logbook_entries 
      WHERE 1=1
    `
    const params: any[] = []

    // Filter by user if specified
    if (this.options.userFilter) {
      query += ` AND user_id = ?`
      params.push(this.options.userFilter)
    }

    // For incremental migration, only get updated records
    if (lastProcessedId) {
      query += ` AND id > ?`
      params.push(lastProcessedId)
    }

    query += ` ORDER BY id ASC LIMIT ?`
    params.push(this.options.batchSize)

    let hasMore = true
    let lastId = lastProcessedId

    while (hasMore) {
      const batch = await this.db
        .prepare(query)
        .bind(...params)
        .all<DbLogbookEntry>()

      if (batch.results.length === 0) {
        hasMore = false
        break
      }

      for (const entry of batch.results) {
        try {
          await this.processSingleLogbookEntry(entry)
          lastId = entry.id
        } catch (error) {
          console.error(`❌ Error processing logbook entry ${entry.id}:`, error)
          this.stats.logbook_entry.errors++
        }
      }

      // Update params for next batch
      if (lastId) {
        if (lastProcessedId) {
          params[params.length - 2] = lastId
        } else {
          query = query.replace('WHERE 1=1', 'WHERE id > ?')
          params.splice(params.length - 1, 0, lastId)
        }
      }

      // Log progress
      if (this.stats.logbook_entry.processed % 100 === 0) {
        console.log(
          `  Processed ${this.stats.logbook_entry.processed} logbook entries...`
        )
      }
    }
  }

  private async processSingleLogbookEntry(entry: DbLogbookEntry) {
    this.stats.logbook_entry.processed++

    try {
      // Transform the data
      const transformedData = {
        id: entry.id,
        timestamp: new Date(entry.timestamp).toISOString(),
        duration: entry.duration,
        type: entry.type, // Keep uppercase (PRACTICE, PERFORMANCE, etc.)
        instrument: entry.instrument, // Keep uppercase (PIANO, GUITAR)
        pieces: JSON.parse(entry.pieces || '[]'),
        techniques: JSON.parse(entry.techniques || '[]'),
        goalIds: JSON.parse(entry.goal_ids || '[]'),
        notes: entry.notes || null,
        mood: entry.mood || null, // Keep uppercase if present
        tags: JSON.parse(entry.tags || '[]'),
        sessionId: entry.session_id || null,
        metadata: entry.metadata
          ? JSON.parse(entry.metadata)
          : { source: 'manual' },
        createdAt: new Date(entry.created_at).toISOString(),
        updatedAt: new Date(entry.updated_at).toISOString(),
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(transformedData)

      // Check if already exists in sync_data
      const existing = await this.db
        .prepare(
          `
        SELECT checksum, version FROM sync_data 
        WHERE user_id = ? AND entity_type = ? AND entity_id = ?
      `
        )
        .bind(entry.user_id, 'logbook_entry', entry.id)
        .first<{ checksum: string; version: number }>()

      if (existing && existing.checksum === checksum) {
        this.stats.logbook_entry.skipped++
        return // No changes needed
      }

      if (this.options.dryRun) {
        console.log(
          `  Would ${existing ? 'update' : 'insert'} logbook entry ${entry.id}`
        )
        if (existing) {
          this.stats.logbook_entry.updated++
        } else {
          this.stats.logbook_entry.inserted++
        }
        return
      }

      // Insert or update in sync_data
      const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await this.db
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
          JSON.stringify(transformedData),
          checksum,
          1
        )
        .run()

      if (existing) {
        this.stats.logbook_entry.updated++
      } else {
        this.stats.logbook_entry.inserted++
      }
    } catch (error) {
      throw error
    }
  }

  private async migrateGoals(lastProcessedId?: string) {
    let query = `
      SELECT * FROM goals 
      WHERE 1=1
    `
    const params: any[] = []

    // Filter by user if specified
    if (this.options.userFilter) {
      query += ` AND user_id = ?`
      params.push(this.options.userFilter)
    }

    // For incremental migration, only get updated records
    if (lastProcessedId) {
      query += ` AND id > ?`
      params.push(lastProcessedId)
    }

    query += ` ORDER BY id ASC LIMIT ?`
    params.push(this.options.batchSize)

    let hasMore = true
    let lastId = lastProcessedId

    while (hasMore) {
      const batch = await this.db
        .prepare(query)
        .bind(...params)
        .all<DbGoal>()

      if (batch.results.length === 0) {
        hasMore = false
        break
      }

      for (const goal of batch.results) {
        try {
          await this.processSingleGoal(goal)
          lastId = goal.id
        } catch (error) {
          console.error(`❌ Error processing goal ${goal.id}:`, error)
          this.stats.goal.errors++
        }
      }

      // Update params for next batch
      if (lastId) {
        if (lastProcessedId) {
          params[params.length - 2] = lastId
        } else {
          query = query.replace('WHERE 1=1', 'WHERE id > ?')
          params.splice(params.length - 1, 0, lastId)
        }
      }

      // Log progress
      if (this.stats.goal.processed % 100 === 0) {
        console.log(`  Processed ${this.stats.goal.processed} goals...`)
      }
    }
  }

  private async processSingleGoal(goal: DbGoal) {
    this.stats.goal.processed++

    try {
      // Transform the data
      const transformedData = {
        id: goal.id,
        title: goal.title,
        description: goal.description || null,
        targetDate: goal.target_date
          ? new Date(goal.target_date).toISOString()
          : null,
        progress: goal.progress || 0,
        milestones: JSON.parse(goal.milestones || '[]'),
        status: goal.status || 'ACTIVE', // Keep uppercase
        linkedEntries: JSON.parse(goal.linked_entries || '[]'),
        createdAt: new Date(goal.created_at).toISOString(),
        updatedAt: new Date(goal.updated_at).toISOString(),
        completedAt: goal.completed_at
          ? new Date(goal.completed_at).toISOString()
          : null,
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(transformedData)

      // Check if already exists in sync_data
      const existing = await this.db
        .prepare(
          `
        SELECT checksum, version FROM sync_data 
        WHERE user_id = ? AND entity_type = ? AND entity_id = ?
      `
        )
        .bind(goal.user_id, 'goal', goal.id)
        .first<{ checksum: string; version: number }>()

      if (existing && existing.checksum === checksum) {
        this.stats.goal.skipped++
        return // No changes needed
      }

      if (this.options.dryRun) {
        console.log(`  Would ${existing ? 'update' : 'insert'} goal ${goal.id}`)
        if (existing) {
          this.stats.goal.updated++
        } else {
          this.stats.goal.inserted++
        }
        return
      }

      // Insert or update in sync_data
      const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await this.db
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
          JSON.stringify(transformedData),
          checksum,
          1
        )
        .run()

      if (existing) {
        this.stats.goal.updated++
      } else {
        this.stats.goal.inserted++
      }
    } catch (error) {
      throw error
    }
  }

  private async migratePracticeSessions(lastProcessedId?: string) {
    let query = `
      SELECT * FROM practice_sessions 
      WHERE 1=1
    `
    const params: any[] = []

    // Filter by user if specified
    if (this.options.userFilter) {
      query += ` AND user_id = ?`
      params.push(this.options.userFilter)
    }

    // For incremental migration, only get updated records
    if (lastProcessedId) {
      query += ` AND id > ?`
      params.push(lastProcessedId)
    }

    query += ` ORDER BY id ASC LIMIT ?`
    params.push(this.options.batchSize)

    let hasMore = true
    let lastId = lastProcessedId

    while (hasMore) {
      const batch = await this.db
        .prepare(query)
        .bind(...params)
        .all<DbPracticeSession>()

      if (batch.results.length === 0) {
        hasMore = false
        break
      }

      for (const session of batch.results) {
        try {
          await this.processSinglePracticeSession(session)
          lastId = session.id
        } catch (error) {
          console.error(
            `❌ Error processing practice session ${session.id}:`,
            error
          )
          this.stats.practice_session.errors++
        }
      }

      // Update params for next batch
      if (lastId) {
        if (lastProcessedId) {
          params[params.length - 2] = lastId
        } else {
          query = query.replace('WHERE 1=1', 'WHERE id > ?')
          params.splice(params.length - 1, 0, lastId)
        }
      }

      // Log progress
      if (this.stats.practice_session.processed % 100 === 0) {
        console.log(
          `  Processed ${this.stats.practice_session.processed} practice sessions...`
        )
      }
    }
  }

  private async processSinglePracticeSession(session: DbPracticeSession) {
    this.stats.practice_session.processed++

    try {
      // Transform the data
      const transformedData = {
        id: session.id,
        instrument: session.instrument, // Keep uppercase
        sheetMusicId: session.sheet_music_id || null,
        sessionType: session.session_type, // Keep uppercase
        startedAt: session.started_at,
        completedAt: session.completed_at || null,
        pausedDuration: session.paused_duration || 0,
        accuracyPercentage: session.accuracy_percentage || null,
        notesAttempted: session.notes_attempted || 0,
        notesCorrect: session.notes_correct || 0,
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(transformedData)

      // Check if already exists in sync_data
      const existing = await this.db
        .prepare(
          `
        SELECT checksum, version FROM sync_data 
        WHERE user_id = ? AND entity_type = ? AND entity_id = ?
      `
        )
        .bind(session.user_id, 'practice_session', session.id)
        .first<{ checksum: string; version: number }>()

      if (existing && existing.checksum === checksum) {
        this.stats.practice_session.skipped++
        return // No changes needed
      }

      if (this.options.dryRun) {
        console.log(
          `  Would ${existing ? 'update' : 'insert'} practice session ${session.id}`
        )
        if (existing) {
          this.stats.practice_session.updated++
        } else {
          this.stats.practice_session.inserted++
        }
        return
      }

      // Insert or update in sync_data
      const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await this.db
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
          session.user_id,
          'practice_session',
          session.id,
          JSON.stringify(transformedData),
          checksum,
          1
        )
        .run()

      if (existing) {
        this.stats.practice_session.updated++
      } else {
        this.stats.practice_session.inserted++
      }
    } catch (error) {
      throw error
    }
  }

  private async calculateChecksum(data: any): Promise<string> {
    const jsonString = JSON.stringify(data)
    const hash = createHash('sha256')
    hash.update(jsonString)
    return hash.digest('hex')
  }

  private printSummary() {
    console.log('\n📊 Migration Summary')
    console.log('===================')

    for (const [entityType, stats] of Object.entries(this.stats)) {
      const duration = Date.now() - stats.startTime
      console.log(`\n${entityType}:`)
      console.log(`  Total processed: ${stats.processed}`)
      console.log(`  Inserted: ${stats.inserted}`)
      console.log(`  Updated: ${stats.updated}`)
      console.log(`  Skipped (unchanged): ${stats.skipped}`)
      console.log(`  Errors: ${stats.errors}`)
      console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`)
    }

    if (this.options.dryRun) {
      console.log('\n⚠️  DRY RUN - No data was actually modified')
    }
  }
}

// Parse command line arguments
function parseArguments(): MigrationOptions {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'dry-run': { type: 'boolean', default: false },
      'batch-size': { type: 'string', default: '1000' },
      user: { type: 'string' },
      entity: { type: 'string' },
      env: { type: 'string', default: 'local' },
    },
  })

  const entityTypes = values.entity
    ? [values.entity as 'logbook_entry' | 'goal' | 'practice_session']
    : undefined

  return {
    dryRun: values['dry-run'] || false,
    batchSize: parseInt(values['batch-size'] || '1000'),
    userFilter: values.user,
    entityTypes,
    environment: (values.env || 'local') as 'local' | 'staging' | 'production',
  }
}

// Main execution
async function main() {
  const options = parseArguments()

  // TODO: Setup D1 database connection based on environment
  // For now, this is a template that needs to be integrated with your D1 setup
  console.log(
    '⚠️  Note: This script needs to be integrated with your D1 database connection'
  )
  console.log('Options parsed:', options)

  // Example of how it would be used:
  // const db = getD1Database(options.environment)
  // const migration = new BackendToSyncDataMigration(db, options)
  // await migration.run()
}

// Only run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { BackendToSyncDataMigration, MigrationOptions }
