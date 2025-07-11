-- Rollback Migration: Revert lowercase enum values back to uppercase
-- Date: 2025-07-11
-- Purpose: Emergency rollback script if lowercase migration causes issues

-- WARNING: This is a rollback script. Only use in case of emergency.

-- Step 1: Update sync_data JSON content back to uppercase for logbook entries
UPDATE sync_data
SET data = json_set(
  json_set(
    json_set(
      data,
      '$.type', UPPER(json_extract(data, '$.type'))
    ),
    '$.instrument', UPPER(json_extract(data, '$.instrument'))
  ),
  '$.mood', CASE 
    WHEN json_extract(data, '$.mood') IS NOT NULL 
    THEN UPPER(json_extract(data, '$.mood'))
    ELSE NULL
  END
)
WHERE entity_type = 'logbook_entry'
AND deleted_at IS NULL;

-- Step 2: Update sync_data JSON content for goals (instrument field)
UPDATE sync_data
SET data = json_set(
  data,
  '$.instrument', UPPER(json_extract(data, '$.instrument'))
)
WHERE entity_type = 'goal'
AND deleted_at IS NULL
AND json_extract(data, '$.instrument') IS NOT NULL;

-- Step 3: Create tables with uppercase constraints (similar to migration 0006 but with uppercase)
CREATE TABLE IF NOT EXISTS users_rollback (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  primary_instrument TEXT CHECK (primary_instrument IN ('PIANO', 'GUITAR')),
  auth_provider TEXT NOT NULL DEFAULT 'magic_link',
  google_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login_at INTEGER,
  login_count INTEGER NOT NULL DEFAULT 0,
  last_active_at INTEGER
);

CREATE TABLE IF NOT EXISTS logbook_entries_rollback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PRACTICE', 'PERFORMANCE', 'LESSON', 'REHEARSAL', 'TECHNIQUE')),
  instrument TEXT NOT NULL CHECK (instrument IN ('PIANO', 'GUITAR')),
  pieces TEXT NOT NULL DEFAULT '[]',
  techniques TEXT NOT NULL DEFAULT '[]',
  goal_ids TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  mood TEXT CHECK (mood IN ('FRUSTRATED', 'NEUTRAL', 'SATISFIED', 'EXCITED')),
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step 4: Migrate data back to uppercase
INSERT INTO users_rollback
SELECT 
  id, email, display_name, 
  UPPER(primary_instrument) as primary_instrument,
  auth_provider, google_id, created_at, updated_at, 
  last_login_at, login_count, last_active_at
FROM users;

INSERT INTO logbook_entries_rollback
SELECT 
  id, user_id, timestamp, duration,
  UPPER(type) as type,
  UPPER(instrument) as instrument,
  pieces, techniques, goal_ids, notes,
  UPPER(mood) as mood,
  tags, created_at, updated_at
FROM logbook_entries;

-- Step 5: Drop lowercase tables and rename rollback tables
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS logbook_entries;

ALTER TABLE users_rollback RENAME TO users;
ALTER TABLE logbook_entries_rollback RENAME TO logbook_entries;

-- Note: Similar steps would be needed for practice_sessions and sheet_music tables