-- Migration: Migrate existing data to lowercase enum values
-- Date: 2025-07-11
-- Purpose: Convert all uppercase enum values to lowercase

-- Step 1: Migrate data from old tables to new tables with lowercase conversion

-- Migrate users table
INSERT INTO users_new (
  id, email, display_name, primary_instrument, auth_provider, 
  google_id, created_at, updated_at, last_login_at, login_count, last_active_at
)
SELECT 
  id, email, display_name, 
  LOWER(primary_instrument) as primary_instrument,
  auth_provider, google_id, created_at, updated_at, 
  last_login_at, login_count, last_active_at
FROM users;

-- Migrate logbook_entries table (if any data exists)
INSERT INTO logbook_entries_new (
  id, user_id, timestamp, duration, type, instrument, pieces, 
  techniques, goal_ids, notes, mood, tags, created_at, updated_at
)
SELECT 
  id, user_id, timestamp, duration,
  LOWER(type) as type,
  LOWER(instrument) as instrument,
  pieces, techniques, goal_ids, notes,
  LOWER(mood) as mood,
  tags, created_at, updated_at
FROM logbook_entries;

-- Migrate practice_sessions table (if any data exists)
INSERT INTO practice_sessions_new (
  id, user_id, started_at, ended_at, duration_seconds, 
  instrument, sheet_music_id, audio_recording_url, notes, created_at
)
SELECT 
  id, user_id, started_at, ended_at, duration_seconds,
  LOWER(instrument) as instrument,
  sheet_music_id, audio_recording_url, notes, created_at
FROM practice_sessions;

-- Migrate sheet_music table (if any data exists)
INSERT INTO sheet_music_new (
  id, title, composer, arranger, difficulty_level, instrument,
  time_signature, key_signature, tempo_bpm, duration_seconds,
  musicxml_data, midi_url, pdf_url, tags, created_at, updated_at
)
SELECT 
  id, title, composer, arranger, difficulty_level,
  LOWER(instrument) as instrument,
  time_signature, key_signature, tempo_bpm, duration_seconds,
  musicxml_data, midi_url, pdf_url, tags, created_at, updated_at
FROM sheet_music;

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

-- Step 4: Drop old tables and rename new tables
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS logbook_entries;
DROP TABLE IF EXISTS practice_sessions;
DROP TABLE IF EXISTS sheet_music;

ALTER TABLE users_new RENAME TO users;
ALTER TABLE logbook_entries_new RENAME TO logbook_entries;
ALTER TABLE practice_sessions_new RENAME TO practice_sessions;
ALTER TABLE sheet_music_new RENAME TO sheet_music;

-- Note: The indexes will be automatically carried over with the renamed tables