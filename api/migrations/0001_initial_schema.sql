-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  auth_provider TEXT DEFAULT 'magic_link' CHECK (auth_provider IN ('magic_link', 'google')),
  google_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sync_data_user ON sync_data(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_data_type ON sync_data(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_data_updated ON sync_data(updated_at);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_sync_data_updated_at
AFTER UPDATE ON sync_data
BEGIN
  UPDATE sync_data SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;