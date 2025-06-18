-- Add device tracking columns to all syncable tables
ALTER TABLE practice_sessions ADD COLUMN device_id TEXT;
ALTER TABLE logbook_entries ADD COLUMN device_id TEXT;
ALTER TABLE goals ADD COLUMN device_id TEXT;

-- Create index for device_id to improve query performance
CREATE INDEX idx_practice_sessions_device ON practice_sessions(device_id);
CREATE INDEX idx_logbook_entries_device ON logbook_entries(device_id);
CREATE INDEX idx_goals_device ON goals(device_id);

-- Create device_info table for storing device metadata
CREATE TABLE IF NOT EXISTS device_info (
  device_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_device_info_user ON device_info(user_id);

-- Create sync_logs table for detailed sync history
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  operation TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL,
  message TEXT,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_logs_user ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_timestamp ON sync_logs(timestamp);