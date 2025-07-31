-- Migration: Create entity_changes table for delta-based sync
-- This table serves as the canonical log of all data changes

CREATE TABLE IF NOT EXISTS entity_changes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  
  -- Version tracking (per user, globally incrementing)
  version INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Change identification
  change_id TEXT NOT NULL, -- Client-generated UUID for idempotency
  device_id TEXT, -- Device that originated the change
  
  -- Change details
  change_type TEXT NOT NULL CHECK (change_type IN ('CREATED', 'UPDATED', 'DELETED')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('logbook_entry', 'goal')),
  entity_id TEXT NOT NULL, -- ID of the entity being changed
  
  -- Change data
  change_data TEXT NOT NULL, -- JSON: full object for CREATED, delta for UPDATED, empty for DELETED
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_entity_changes_user_version 
ON entity_changes(user_id, version);

CREATE INDEX IF NOT EXISTS idx_entity_changes_user_entity 
ON entity_changes(user_id, entity_type, entity_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_changes_change_id 
ON entity_changes(user_id, change_id);

-- Sync metadata table to track user sync state
CREATE TABLE IF NOT EXISTS sync_metadata (
  user_id TEXT PRIMARY KEY,
  last_known_version INTEGER DEFAULT 0,
  device_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-increment version per user
CREATE TRIGGER IF NOT EXISTS auto_increment_version
AFTER INSERT ON entity_changes
BEGIN
  UPDATE entity_changes 
  SET version = (
    SELECT COALESCE(MAX(version), 0) + 1 
    FROM entity_changes 
    WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.id AND version = NEW.version;
  
  -- Update sync metadata
  INSERT OR REPLACE INTO sync_metadata (user_id, last_known_version, updated_at)
  VALUES (
    NEW.user_id,
    (SELECT MAX(version) FROM entity_changes WHERE user_id = NEW.user_id),
    CURRENT_TIMESTAMP
  );
END;

-- Migration helper: Seed existing data as CREATE events
-- This will be run once during migration to preserve existing user data
-- Note: This should be run by a separate migration script, not automatically

/*
-- Seed logbook entries (run manually during migration)
INSERT INTO entity_changes (user_id, change_id, change_type, entity_type, entity_id, change_data, version)
SELECT 
  user_id,
  'migrate_' || lower(hex(randomblob(8))) as change_id,
  'CREATED' as change_type,
  'logbook_entry' as entity_type,
  entity_id,
  data as change_data,
  0 as version
FROM sync_data 
WHERE entity_type = 'logbook_entry' 
AND deleted_at IS NULL;

-- Seed goals (run manually during migration)  
INSERT INTO entity_changes (user_id, change_id, change_type, entity_type, entity_id, change_data, version)
SELECT 
  user_id,
  'migrate_' || lower(hex(randomblob(8))) as change_id,
  'CREATED' as change_type,
  'goal' as entity_type,
  entity_id,
  data as change_data,
  0 as version
FROM sync_data 
WHERE entity_type = 'goal' 
AND deleted_at IS NULL;
*/