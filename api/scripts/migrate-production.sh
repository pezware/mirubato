#!/bin/bash
# Migration script for production using wrangler D1 commands
# IMPORTANT: Run this during low traffic periods

echo "⚠️  WARNING: This will migrate production data!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

echo "Starting migration from backend tables to sync_data on PRODUCTION..."

# Step 1: Count existing data
echo "Checking existing data..."
wrangler d1 execute DB --remote --command "
SELECT 
  'logbook_entries' as source, COUNT(*) as total_count 
FROM logbook_entries
UNION ALL
SELECT 
  'sync_data_before' as source, COUNT(*) as total_count 
FROM sync_data;"

# Step 2: Migrate logbook entries
echo "Migrating logbook entries..."
wrangler d1 execute DB --remote --command "
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

# Step 3: Migrate goals (if any)
echo "Migrating goals..."
wrangler d1 execute DB --remote --command "
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

# Step 4: Verify migration
echo "Verifying migration results..."
wrangler d1 execute DB --remote --command "
SELECT 
  entity_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM sync_data
GROUP BY entity_type
ORDER BY entity_type;"

# Step 5: Check for any users without sync data
echo "Checking for users without sync data..."
wrangler d1 execute DB --remote --command "
SELECT COUNT(DISTINCT u.id) as users_without_sync_data
FROM users u
LEFT JOIN sync_data sd ON u.id = sd.user_id
WHERE sd.user_id IS NULL;"

echo "Migration completed!"
echo "Please verify that frontendv2 sync is working correctly."