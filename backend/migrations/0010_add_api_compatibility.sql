-- Add API compatibility fields to users table
-- This migration makes the backend users table compatible with the API service

-- Add auth_provider column with default value
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'magic_link' CHECK (auth_provider IN ('magic_link', 'google'));

-- Add google_id column (without UNIQUE constraint - will need to handle uniqueness in application)
ALTER TABLE users ADD COLUMN google_id TEXT;

-- Create index for google_id to ensure fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Create the sync tables from API if they don't exist
-- These are safe to create as they don't exist in backend yet

-- Sync data table (generic storage for all synced entities)
CREATE TABLE IF NOT EXISTS sync_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON blob
  checksum TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, entity_type, entity_id)
);

-- Sync metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
  user_id TEXT PRIMARY KEY,
  last_sync_token TEXT,
  last_sync_time TIMESTAMP,
  device_count INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for sync tables if they don't exist
CREATE INDEX IF NOT EXISTS idx_sync_data_user ON sync_data(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_data_type ON sync_data(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_data_updated ON sync_data(updated_at);

-- Add trigger for sync_data if it doesn't exist
CREATE TRIGGER IF NOT EXISTS update_sync_data_updated_at
AFTER UPDATE ON sync_data
BEGIN
  UPDATE sync_data SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;