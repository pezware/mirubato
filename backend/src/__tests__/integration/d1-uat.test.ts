/**
 * User Acceptance Testing (UAT) with real D1 database
 * Uses Wrangler's local D1 to provide a real SQLite experience
 */

import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { AuthService } from '../../services/auth'
import { UserService } from '../../services/user'
import { nanoid } from 'nanoid'

describe('D1 UAT - Complete User Journey', () => {
  let authService: AuthService
  let userService: UserService

  beforeAll(async () => {
    // Initialize services with real D1 database
    authService = new AuthService(env.MIRUBATO_MAGIC_LINKS, env.JWT_SECRET)
    userService = new UserService(env.DB)

    // Apply migrations to create tables
    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        primary_instrument TEXT DEFAULT 'PIANO',
        has_cloud_storage BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    ).run()

    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        preferences TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `
    ).run()

    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS practice_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sheet_music_id TEXT NOT NULL,
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        paused_duration INTEGER DEFAULT 0,
        tempo INTEGER,
        notes_attempted INTEGER DEFAULT 0,
        notes_correct INTEGER DEFAULT 0,
        accuracy_percentage REAL DEFAULT 0,
        instrument TEXT DEFAULT 'PIANO',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `
    ).run()

    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS practice_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        tempo_practiced INTEGER,
        measure_number INTEGER,
        mistake_type TEXT,
        mistake_details TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES practice_sessions(id)
      )
    `
    ).run()

    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS logbook_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        duration INTEGER NOT NULL,
        type TEXT NOT NULL,
        instrument TEXT NOT NULL,
        pieces TEXT,
        techniques TEXT,
        goal_ids TEXT,
        notes TEXT,
        mood TEXT,
        tags TEXT,
        session_id TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `
    ).run()

    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target_date DATETIME,
        progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        milestones TEXT,
        linked_entries TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `
    ).run()

    // Create indexes
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_sessions_user ON practice_sessions(user_id)'
    ).run()
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_logs_session ON practice_logs(session_id)'
    ).run()
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_entries_user ON logbook_entries(user_id)'
    ).run()
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)'
    ).run()
  })

  afterEach(async () => {
    // Clean up data after each test
    await env.DB.prepare('DELETE FROM practice_logs').run()
    await env.DB.prepare('DELETE FROM practice_sessions').run()
    await env.DB.prepare('DELETE FROM logbook_entries').run()
    await env.DB.prepare('DELETE FROM goals').run()
    await env.DB.prepare('DELETE FROM user_preferences').run()
    await env.DB.prepare('DELETE FROM users').run()
  })

  describe('Anonymous User Journey', () => {
    it('should handle complete anonymous user flow', async () => {
      // 1. Create anonymous user
      const anonUserId = `anon_${nanoid()}`

      // 2. Create practice session
      const sessionId = `session_${nanoid()}`
      await env.DB.prepare(
        `
        INSERT INTO practice_sessions (
          id, user_id, sheet_music_id, started_at, completed_at,
          notes_attempted, notes_correct, accuracy_percentage, instrument
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          sessionId,
          anonUserId,
          'sheet_001',
          new Date().toISOString(),
          new Date(Date.now() + 1800000).toISOString(), // 30 min later
          100,
          85,
          85.0,
          'PIANO'
        )
        .run()

      // 3. Create logbook entry
      const entryId = `entry_${nanoid()}`
      await env.DB.prepare(
        `
        INSERT INTO logbook_entries (
          id, user_id, timestamp, duration, type, instrument,
          pieces, techniques, notes, mood, tags, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          entryId,
          anonUserId,
          new Date().toISOString(),
          1800, // 30 minutes in seconds
          'PRACTICE',
          'PIANO',
          JSON.stringify([
            {
              id: 'piece_001',
              title: 'Moonlight Sonata',
              composer: 'Beethoven',
            },
          ]),
          JSON.stringify(['scales', 'arpeggios']),
          'Focused on dynamics',
          'SATISFIED',
          JSON.stringify(['classical', 'evening']),
          sessionId
        )
        .run()

      // 4. Verify data was saved
      const sessions = await env.DB.prepare(
        'SELECT * FROM practice_sessions WHERE user_id = ?'
      )
        .bind(anonUserId)
        .all()

      expect(sessions.results).toHaveLength(1)
      expect(sessions.results[0].accuracy_percentage).toBe(85)

      const entries = await env.DB.prepare(
        'SELECT * FROM logbook_entries WHERE user_id = ?'
      )
        .bind(anonUserId)
        .all()

      expect(entries.results).toHaveLength(1)
      expect(entries.results[0].mood).toBe('SATISFIED')
    })
  })

  describe('Authentication Flow', () => {
    it('should handle magic link authentication', async () => {
      const email = 'test@example.com'

      // 1. Create magic link
      const token = await authService.createMagicLink(email)
      expect(token).toBeTruthy()

      // 2. Create or get user
      let user = await userService.findByEmail(email)
      if (!user) {
        user = await userService.createUser({
          email,
          displayName: 'Test User',
          primaryInstrument: 'PIANO',
        })
      }

      // 3. Verify user was created
      expect(user).toBeTruthy()
      expect(user.email).toBe(email)

      // 4. Generate auth tokens
      const tokens = await authService.generateTokens(user)
      expect(tokens.accessToken).toBeTruthy()
      expect(tokens.refreshToken).toBeTruthy()
    })
  })

  describe('Data Sync Flow', () => {
    it('should sync anonymous data to authenticated user', async () => {
      const anonUserId = `anon_${nanoid()}`
      const email = 'sync-test@example.com'

      // 1. Create anonymous data
      const sessionId = `session_${nanoid()}`
      await env.DB.prepare(
        `
        INSERT INTO practice_sessions (
          id, user_id, sheet_music_id, started_at, completed_at,
          notes_attempted, notes_correct, accuracy_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          sessionId,
          anonUserId,
          'sheet_001',
          new Date().toISOString(),
          new Date(Date.now() + 1800000).toISOString(),
          100,
          85,
          85.0
        )
        .run()

      const entryId = `entry_${nanoid()}`
      await env.DB.prepare(
        `
        INSERT INTO logbook_entries (
          id, user_id, timestamp, duration, type, instrument,
          pieces, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          entryId,
          anonUserId,
          new Date().toISOString(),
          1800,
          'PRACTICE',
          'PIANO',
          JSON.stringify([{ id: 'piece_001', title: 'Test Piece' }]),
          sessionId
        )
        .run()

      // 2. Create authenticated user
      const user = await userService.createUser({
        email,
        displayName: 'Sync Test User',
        primaryInstrument: 'PIANO',
      })

      // 3. Update anonymous data to authenticated user
      await env.DB.prepare(
        'UPDATE practice_sessions SET user_id = ? WHERE user_id = ?'
      )
        .bind(user.id, anonUserId)
        .run()

      await env.DB.prepare(
        'UPDATE logbook_entries SET user_id = ? WHERE user_id = ?'
      )
        .bind(user.id, anonUserId)
        .run()

      // 4. Verify sync
      const userSessions = await env.DB.prepare(
        'SELECT * FROM practice_sessions WHERE user_id = ?'
      )
        .bind(user.id)
        .all()

      expect(userSessions.results).toHaveLength(1)

      const userEntries = await env.DB.prepare(
        'SELECT * FROM logbook_entries WHERE user_id = ?'
      )
        .bind(user.id)
        .all()

      expect(userEntries.results).toHaveLength(1)
    })
  })

  describe('Complex Queries', () => {
    it('should handle complex reporting queries', async () => {
      const userId = `user_${nanoid()}`

      // Create user
      await env.DB.prepare(
        `
        INSERT INTO users (id, email, display_name, primary_instrument)
        VALUES (?, ?, ?, ?)
      `
      )
        .bind(userId, 'report@example.com', 'Report User', 'PIANO')
        .run()

      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        const sessionId = `session_${nanoid()}`
        await env.DB.prepare(
          `
          INSERT INTO practice_sessions (
            id, user_id, sheet_music_id, started_at, completed_at,
            notes_attempted, notes_correct, accuracy_percentage
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
          .bind(
            sessionId,
            userId,
            `sheet_00${i}`,
            new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            new Date(
              Date.now() - i * 24 * 60 * 60 * 1000 + 1800000
            ).toISOString(),
            100 + i * 10,
            80 + i * 2,
            80 + i * 2
          )
          .run()
      }

      // Query aggregate statistics
      const stats = await env.DB.prepare(
        `
        SELECT 
          COUNT(*) as total_sessions,
          AVG(accuracy_percentage) as avg_accuracy,
          SUM((julianday(completed_at) - julianday(started_at)) * 24 * 60) as total_minutes
        FROM practice_sessions
        WHERE user_id = ?
      `
      )
        .bind(userId)
        .first()

      expect(stats.total_sessions).toBe(5)
      expect(stats.avg_accuracy).toBeGreaterThan(80)
      expect(stats.total_minutes).toBeGreaterThan(0)

      // Query practice streaks
      const dates = await env.DB.prepare(
        `
        SELECT DISTINCT DATE(started_at) as practice_date
        FROM practice_sessions
        WHERE user_id = ?
        ORDER BY practice_date DESC
      `
      )
        .bind(userId)
        .all()

      expect(dates.results).toHaveLength(5)
    })
  })

  describe('Performance Testing', () => {
    it('should handle bulk operations efficiently', async () => {
      const userId = `user_${nanoid()}`

      // Create user
      await env.DB.prepare(
        `
        INSERT INTO users (id, email, display_name)
        VALUES (?, ?, ?)
      `
      )
        .bind(userId, 'bulk@example.com', 'Bulk User')
        .run()

      // Bulk insert using batch
      const statements = []
      for (let i = 0; i < 100; i++) {
        statements.push(
          env.DB.prepare(
            `
            INSERT INTO logbook_entries (
              id, user_id, timestamp, duration, type, instrument
            ) VALUES (?, ?, ?, ?, ?, ?)
          `
          ).bind(
            `entry_${nanoid()}`,
            userId,
            new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
            1800 + i * 60,
            'PRACTICE',
            i % 2 === 0 ? 'PIANO' : 'GUITAR'
          )
        )
      }

      const start = Date.now()
      await env.DB.batch(statements)
      const elapsed = Date.now() - start

      // Verify bulk insert completed quickly
      expect(elapsed).toBeLessThan(1000) // Should complete in under 1 second

      // Verify all entries were created
      const count = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM logbook_entries WHERE user_id = ?'
      )
        .bind(userId)
        .first()

      expect(count.count).toBe(100)
    })
  })
})
