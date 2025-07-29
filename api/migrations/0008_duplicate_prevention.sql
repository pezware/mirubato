-- Migration: Add duplicate prevention mechanisms
-- This migration adds the necessary schema changes to prevent duplicate entries during sync

-- 1. Add composite unique constraint to prevent duplicate content
-- Note: We need to drop and recreate the constraint if it exists
DROP INDEX IF EXISTS idx_sync_data_unique_content;

-- Create a composite index for duplicate prevention based on content
CREATE UNIQUE INDEX idx_sync_data_unique_content 
ON sync_data(user_id, entity_type, checksum)
WHERE deleted_at IS NULL;

-- 2. Add device_id column for tracking sync sources
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

-- 8. Add composite constraint for exact timestamp matching
-- This prevents entries with identical content and timestamps
CREATE UNIQUE INDEX idx_sync_data_exact_match
ON sync_data(user_id, entity_type, entity_id, checksum)
WHERE deleted_at IS NULL;