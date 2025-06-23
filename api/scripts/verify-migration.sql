-- Verify migration results
-- Run this after migration to check data integrity

-- Check sync_data counts by entity type
SELECT 
  entity_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM sync_data
GROUP BY entity_type;

-- Compare with source table counts
SELECT 'logbook_entries' as table_name, COUNT(*) as count FROM logbook_entries
UNION ALL
SELECT 'goals' as table_name, COUNT(*) as count FROM goals
UNION ALL
SELECT 'practice_sessions' as table_name, COUNT(*) as count FROM practice_sessions;

-- Check for any missing users
SELECT DISTINCT u.id, u.email
FROM users u
LEFT JOIN sync_data sd ON u.id = sd.user_id
WHERE sd.user_id IS NULL;

-- Sample transformed data
SELECT 
  entity_type,
  entity_id,
  json_extract(data, '$.timestamp') as timestamp,
  json_extract(data, '$.type') as type,
  checksum,
  version,
  updated_at
FROM sync_data
LIMIT 10;

-- Check for any duplicate entries (should be none due to unique constraint)
SELECT 
  user_id,
  entity_type,
  entity_id,
  COUNT(*) as duplicates
FROM sync_data
GROUP BY user_id, entity_type, entity_id
HAVING COUNT(*) > 1;