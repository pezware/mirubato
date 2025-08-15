-- Migration: Migrate existing data to lowercase enum values
-- Date: 2025-07-11
-- Purpose: Convert all uppercase enum values to lowercase
-- FIXED: Match actual staging database schema

-- Step 1: Migrate users table (has data)
INSERT INTO users_new (
  id, email, display_name, primary_instrument, auth_provider, 
  google_id, created_at, updated_at, last_login_at, login_count, role
)
SELECT 
  id, email, display_name, 
  CASE 
    WHEN primary_instrument IS NULL THEN NULL
    WHEN UPPER(primary_instrument) = 'BOTH' THEN 'both'
    WHEN UPPER(primary_instrument) = 'PIANO' THEN 'piano'
    WHEN UPPER(primary_instrument) = 'GUITAR' THEN 'guitar'
    ELSE LOWER(primary_instrument)
  END as primary_instrument,
  auth_provider, google_id, created_at, updated_at, 
  last_login_at, login_count, role
FROM users;

-- Skip logbook_entries, practice_sessions, and sheet_music tables as they are empty on staging
-- The new tables were already created by 0006_lowercase_enums.sql

-- Step 2: Update sync_data JSON content for logbook entries
UPDATE sync_data
SET data = json_set(
  json_set(
    json_set(
      data,
      '$.type', LOWER(json_extract(data, '$.type'))
    ),
    '$.instrument', LOWER(json_extract(data, '$.instrument'))
  ),
  '$.mood', CASE 
    WHEN json_extract(data, '$.mood') IS NOT NULL 
    THEN LOWER(json_extract(data, '$.mood'))
    ELSE NULL
  END
)
WHERE entity_type = 'logbook_entry'
AND deleted_at IS NULL
AND (
  json_extract(data, '$.type') != LOWER(json_extract(data, '$.type'))
  OR json_extract(data, '$.instrument') != LOWER(json_extract(data, '$.instrument'))
  OR (json_extract(data, '$.mood') IS NOT NULL AND json_extract(data, '$.mood') != LOWER(json_extract(data, '$.mood')))
);

-- Step 3: Update sync_data JSON content for goals (instrument field)
UPDATE sync_data
SET data = json_set(
  data,
  '$.instrument', LOWER(json_extract(data, '$.instrument'))
)
WHERE entity_type = 'goal'
AND deleted_at IS NULL
AND json_extract(data, '$.instrument') IS NOT NULL
AND json_extract(data, '$.instrument') != LOWER(json_extract(data, '$.instrument'));

-- Step 3: Drop old tables and rename new tables
-- IMPORTANT: Disable foreign key checks to prevent CASCADE deletes
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS logbook_entries;
DROP TABLE IF EXISTS practice_sessions;
DROP TABLE IF EXISTS sheet_music;

ALTER TABLE users_new RENAME TO users;
ALTER TABLE logbook_entries_new RENAME TO logbook_entries;
ALTER TABLE practice_sessions_new RENAME TO practice_sessions;
ALTER TABLE sheet_music_new RENAME TO sheet_music;

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;

-- Note: The indexes will be automatically carried over with the renamed tables