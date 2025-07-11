-- Migration: Update CHECK constraints to accept lowercase enum values
-- Date: 2025-07-11
-- Purpose: Align with user preference for lowercase inputs

-- Drop and recreate constraints to accept lowercase values

-- 1. Users table - primary_instrument
-- Note: SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate the table
-- For D1, we'll use a transaction to ensure data safety

-- Since D1 doesn't support complex DDL operations, we'll need to handle this differently
-- The constraint update will be done through the application layer during the migration

-- For now, we'll document what constraints need to be updated:
-- 1. users.primary_instrument: CHECK (primary_instrument IN ('PIANO', 'GUITAR')) → CHECK (primary_instrument IN ('piano', 'guitar'))
-- 2. logbook_entries.type: CHECK (type IN ('PRACTICE', 'PERFORMANCE', 'LESSON', 'REHEARSAL')) → CHECK (type IN ('practice', 'performance', 'lesson', 'rehearsal', 'technique'))
-- 3. logbook_entries.instrument: CHECK (instrument IN ('PIANO', 'GUITAR')) → CHECK (instrument IN ('piano', 'guitar'))
-- 4. logbook_entries.mood: CHECK (mood IN ('FRUSTRATED', 'NEUTRAL', 'SATISFIED', 'EXCITED')) → CHECK (mood IN ('frustrated', 'neutral', 'satisfied', 'excited'))
-- 5. practice_sessions.instrument: CHECK (instrument IN ('PIANO', 'GUITAR')) → CHECK (instrument IN ('piano', 'guitar'))
-- 6. sheet_music.instrument: CHECK (instrument IN ('PIANO', 'GUITAR')) → CHECK (instrument IN ('piano', 'guitar'))

-- For D1/SQLite, we need to use a different approach since it doesn't support dropping constraints
-- We'll create new tables with the correct constraints and migrate the data

-- Create new tables with lowercase constraints

CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  primary_instrument TEXT CHECK (primary_instrument IN ('piano', 'guitar')),
  auth_provider TEXT NOT NULL DEFAULT 'magic_link',
  google_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login_at INTEGER,
  login_count INTEGER NOT NULL DEFAULT 0,
  last_active_at INTEGER
);

CREATE TABLE IF NOT EXISTS logbook_entries_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('practice', 'performance', 'lesson', 'rehearsal', 'technique')),
  instrument TEXT NOT NULL CHECK (instrument IN ('piano', 'guitar')),
  pieces TEXT NOT NULL DEFAULT '[]',
  techniques TEXT NOT NULL DEFAULT '[]',
  goal_ids TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  mood TEXT CHECK (mood IN ('frustrated', 'neutral', 'satisfied', 'excited')),
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS practice_sessions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_seconds INTEGER,
  instrument TEXT CHECK (instrument IN ('piano', 'guitar')),
  sheet_music_id TEXT,
  audio_recording_url TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sheet_music_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT,
  arranger TEXT,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
  instrument TEXT NOT NULL CHECK (instrument IN ('piano', 'guitar')),
  time_signature TEXT,
  key_signature TEXT,
  tempo_bpm INTEGER,
  duration_seconds INTEGER,
  musicxml_data TEXT,
  midi_url TEXT,
  pdf_url TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Copy data from old tables to new tables (data will be migrated in the next migration)
-- The actual data migration with lowercase conversion will be done in 0007_migrate_data_to_lowercase.sql

-- Create indexes on new tables
CREATE INDEX idx_users_new_email ON users_new(email);
CREATE INDEX idx_users_new_google_id ON users_new(google_id);
CREATE INDEX idx_logbook_entries_new_user ON logbook_entries_new(user_id);
CREATE INDEX idx_logbook_entries_new_timestamp ON logbook_entries_new(user_id, timestamp);
CREATE INDEX idx_practice_sessions_new_user ON practice_sessions_new(user_id);
CREATE INDEX idx_practice_sessions_new_started ON practice_sessions_new(user_id, started_at);
CREATE INDEX idx_sheet_music_new_instrument ON sheet_music_new(instrument);
CREATE INDEX idx_sheet_music_new_difficulty ON sheet_music_new(difficulty_level);