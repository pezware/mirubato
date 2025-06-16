-- Create sync metadata table to track sync state for each user
CREATE TABLE IF NOT EXISTS sync_metadata (
  user_id TEXT PRIMARY KEY,
  last_sync_timestamp INTEGER NOT NULL DEFAULT 0,
  sync_token TEXT,
  pending_sync_count INTEGER NOT NULL DEFAULT 0,
  last_sync_status TEXT NOT NULL DEFAULT 'never' CHECK (last_sync_status IN ('never', 'success', 'partial', 'failed')),
  last_sync_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create deleted entities table to track soft deletes
CREATE TABLE IF NOT EXISTS deleted_entities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add sync-related columns to existing tables
-- Note: SQLite doesn't support adding multiple columns in one ALTER statement

-- Add sync columns to practice_sessions
ALTER TABLE practice_sessions ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE practice_sessions ADD COLUMN checksum TEXT;
ALTER TABLE practice_sessions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE practice_sessions ADD COLUMN deleted_at DATETIME;

-- Add sync columns to goals
ALTER TABLE goals ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE goals ADD COLUMN checksum TEXT;
ALTER TABLE goals ADD COLUMN deleted_at DATETIME;

-- Add sync columns to logbook_entries
ALTER TABLE logbook_entries ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE logbook_entries ADD COLUMN checksum TEXT;
ALTER TABLE logbook_entries ADD COLUMN deleted_at DATETIME;

-- Create indexes for sync operations
CREATE INDEX idx_sync_metadata_user_id ON sync_metadata(user_id);
CREATE INDEX idx_deleted_entities_user_id ON deleted_entities(user_id);
CREATE INDEX idx_deleted_entities_deleted_at ON deleted_entities(deleted_at);
CREATE INDEX idx_practice_sessions_updated_at ON practice_sessions(updated_at);
CREATE INDEX idx_goals_updated_at ON goals(updated_at);
CREATE INDEX idx_logbook_entries_updated_at ON logbook_entries(updated_at);