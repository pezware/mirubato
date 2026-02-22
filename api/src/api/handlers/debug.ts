import { Hono } from 'hono'
import type { Env } from '../../index'

export const debugHandler = new Hono<{ Bindings: Env }>()

/**
 * Run migrations manually
 * GET /api/debug/migrate
 */
debugHandler.get('/migrate', async c => {
  try {
    console.warn('🔧 Running manual migrations...')

    // Read migration files
    const migrations = [
      // 0001_initial_schema.sql
      `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        auth_provider TEXT DEFAULT 'magic_link' CHECK (auth_provider IN ('magic_link', 'google')),
        google_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Sync data table
      CREATE TABLE IF NOT EXISTS sync_data (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        checksum TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, entity_type, entity_id)
      );

      -- Sync metadata table
      CREATE TABLE IF NOT EXISTS sync_metadata (
        user_id TEXT PRIMARY KEY,
        last_sync_token TEXT,
        last_sync_time TIMESTAMP,
        device_count INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sync_data_user ON sync_data(user_id);
      CREATE INDEX IF NOT EXISTS idx_sync_data_type ON sync_data(entity_type);
      CREATE INDEX IF NOT EXISTS idx_sync_data_updated ON sync_data(updated_at);
      `,
      // Add user tracking fields
      `
      ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
      `,
    ]

    // Execute migrations
    for (const migration of migrations) {
      const statements = migration
        .trim()
        .split(';')
        .filter(s => s.trim())
      for (const statement of statements) {
        if (statement.trim()) {
          await c.env.DB.prepare(statement).run()
        }
      }
    }

    // Check tables
    const tables = await c.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all()

    return c.json({
      success: true,
      message: 'Migrations completed',
      tables: tables.results.map(t => t.name),
    })
  } catch (error: unknown) {
    console.error('Migration error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      500
    )
  }
})

/**
 * Check database status
 * GET /api/debug/db-status
 */
debugHandler.get('/db-status', async c => {
  try {
    const tables = await c.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all()

    const results: Record<string, unknown> = {
      tables: tables.results.map(t => t.name),
      tableDetails: {} as Record<string, unknown>,
    }

    // Get details for each table
    const tableDetails = results.tableDetails as Record<string, unknown>
    for (const table of tables.results) {
      const tableName = table.name as string
      try {
        const count = await c.env.DB.prepare(
          `SELECT COUNT(*) as count FROM ${tableName}`
        ).first()
        tableDetails[tableName] = {
          rowCount: count?.count || 0,
        }
      } catch {
        tableDetails[tableName] = {
          error: 'Could not get count',
        }
      }
    }

    return c.json(results)
  } catch (error: unknown) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
