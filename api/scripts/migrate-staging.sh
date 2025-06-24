#!/bin/bash
# Migration script for staging using wrangler D1 commands

echo "Starting migration from backend tables to sync_data on staging..."

# Step 1: Migrate logbook entries
echo "Migrating logbook entries..."
wrangler d1 execute DB --env staging --remote --command "
INSERT OR REPLACE INTO sync_data (
  id,
  user_id,
  entity_type,
  entity_id,
  data,
  checksum,
  version,
  created_at,
  updated_at
)
SELECT
  lower(hex(randomblob(16))) as id,
  user_id,
  'logbook_entry' as entity_type,
  id as entity_id,
  json_object(
    'id', id,
    'timestamp', datetime(timestamp/1000, 'unixepoch'),
    'duration', duration,
    'type', type,
    'instrument', instrument,
    'pieces', COALESCE(pieces, '[]'),
    'techniques', COALESCE(techniques, '[]'),
    'goalIds', COALESCE(goal_ids, '[]'),
    'notes', COALESCE(notes, ''),
    'tags', COALESCE(tags, '[]'),
    'metadata', COALESCE(metadata, '{\"source\":\"manual\"}'),
    'createdAt', created_at,
    'updatedAt', updated_at
  ) as data,
  -- Simple checksum based on id and timestamp
  substr(hex(id || timestamp), 1, 16) as checksum,
  1 as version,
  datetime('now') as created_at,
  datetime('now') as updated_at
FROM logbook_entries
WHERE NOT EXISTS (
  SELECT 1 FROM sync_data 
  WHERE sync_data.user_id = logbook_entries.user_id 
  AND sync_data.entity_type = 'logbook_entry'
  AND sync_data.entity_id = logbook_entries.id
);"

# Step 2: Migrate goals
echo "Migrating goals..."
wrangler d1 execute DB --env staging --remote --command "
INSERT OR REPLACE INTO sync_data (
  id,
  user_id,
  entity_type,
  entity_id,
  data,
  checksum,
  version,
  created_at,
  updated_at
)
SELECT
  lower(hex(randomblob(16))) as id,
  user_id,
  'goal' as entity_type,
  id as entity_id,
  json_object(
    'id', id,
    'title', title,
    'description', description,
    'targetDate', target_date,
    'status', COALESCE(status, 'ACTIVE'),
    'progress', COALESCE(progress, 0),
    'milestones', COALESCE(milestones, '[]'),
    'linkedEntries', COALESCE(linked_entries, '[]'),
    'createdAt', created_at,
    'updatedAt', updated_at
  ) as data,
  substr(hex(id || title), 1, 16) as checksum,
  1 as version,
  datetime('now') as created_at,
  datetime('now') as updated_at
FROM goals
WHERE NOT EXISTS (
  SELECT 1 FROM sync_data 
  WHERE sync_data.user_id = goals.user_id 
  AND sync_data.entity_type = 'goal'
  AND sync_data.entity_id = goals.id
);"

# Step 3: Update sync metadata
echo "Updating sync metadata..."
wrangler d1 execute DB --env staging --remote --command "
INSERT OR REPLACE INTO sync_metadata (
  user_id,
  last_sync_time,
  last_sync_token,
  device_count,
  updated_at
)
SELECT DISTINCT
  user_id,
  datetime('now') as last_sync_time,
  lower(hex(randomblob(16))) as last_sync_token,
  1 as device_count,
  datetime('now') as updated_at
FROM sync_data
WHERE NOT EXISTS (
  SELECT 1 FROM sync_metadata WHERE sync_metadata.user_id = sync_data.user_id
);"

# Step 4: Verify migration
echo "Verifying migration results..."
wrangler d1 execute DB --env staging --remote --command "
SELECT 
  entity_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM sync_data
GROUP BY entity_type;"

echo "Migration completed!"