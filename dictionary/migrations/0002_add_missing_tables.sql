-- Add missing tables for API functionality

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  user_id TEXT,
  scopes TEXT NOT NULL DEFAULT '[]', -- JSON array
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  last_used_at TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_id TEXT,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  granted_by TEXT,
  expires_at TEXT,
  UNIQUE(user_id, resource, action, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON user_permissions(resource, action);

-- Embeddings table for semantic search
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE,
  embedding TEXT NOT NULL, -- JSON array of floats
  model_name TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embeddings_entry ON embeddings(entry_id);