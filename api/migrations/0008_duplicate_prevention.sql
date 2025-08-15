-- Migration: Add duplicate prevention mechanisms
-- This migration adds the necessary schema changes to prevent duplicate entries during sync

-- 1. Clean up any existing conflicting constraints
-- Note: We'll create the proper constraints later in step 8
DROP INDEX IF EXISTS idx_sync_data_unique_content;
DROP INDEX IF EXISTS idx_sync_data_exact_match;

-- 2. Add device_id column for tracking sync sources (if not exists)
ALTER TABLE sync_data ADD COLUMN device_id TEXT;

-- 3. Create idempotency tracking table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast idempotency lookups
CREATE INDEX idx_idempotency_lookup 
ON idempotency_keys(key, user_id);

-- Index for cleanup of expired keys
CREATE INDEX idx_idempotency_expires 
ON idempotency_keys(expires_at);

-- 4. Add sync event logging table for debugging
CREATE TABLE IF NOT EXISTS sync_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  entries_processed INTEGER DEFAULT 0,
  duplicates_prevented INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for querying recent sync events
CREATE INDEX idx_sync_events_user_time 
ON sync_events(user_id, created_at DESC);

-- 5. Update sync_metadata to track device information
ALTER TABLE sync_metadata ADD COLUMN last_device_id TEXT;
ALTER TABLE sync_metadata ADD COLUMN sync_conflict_count INTEGER DEFAULT 0;

-- 6. Create a view for duplicate detection monitoring
CREATE VIEW IF NOT EXISTS duplicate_detection_stats AS
SELECT 
  user_id,
  entity_type,
  COUNT(*) as total_entries,
  COUNT(DISTINCT checksum) as unique_checksums,
  COUNT(*) - COUNT(DISTINCT checksum) as potential_duplicates,
  MAX(updated_at) as last_update
FROM sync_data
WHERE deleted_at IS NULL
GROUP BY user_id, entity_type
HAVING COUNT(*) > COUNT(DISTINCT checksum);

-- 7. Add trigger to auto-expire old idempotency keys
CREATE TRIGGER IF NOT EXISTS cleanup_expired_idempotency_keys
AFTER INSERT ON idempotency_keys
BEGIN
  DELETE FROM idempotency_keys 
  WHERE expires_at < datetime('now');
END;

-- 8. Replace content-based constraint with entity-specific constraint
-- This prevents duplicate entity IDs for the same user and type
-- Drop the content-based constraint as it can conflict with entity-based uniqueness
DROP INDEX IF EXISTS idx_sync_data_unique_content;

-- Create entity-specific uniqueness constraint instead
CREATE UNIQUE INDEX idx_sync_data_entity_unique
ON sync_data(user_id, entity_type, entity_id)
WHERE deleted_at IS NULL;

-- Create separate index for content-based duplicate detection (non-unique)
CREATE INDEX idx_sync_data_content_detection
ON sync_data(user_id, entity_type, checksum)
WHERE deleted_at IS NULL;