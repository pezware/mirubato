-- Fix sync_metadata table schema to match API expectations
-- This migration is specifically for staging which has the old schema

-- Create a new table with the correct schema
CREATE TABLE sync_metadata_fixed (
  user_id TEXT PRIMARY KEY,
  last_sync_token TEXT,
  last_sync_time TIMESTAMP,
  device_count INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Drop the old table and rename the new one
DROP TABLE IF EXISTS sync_metadata;
ALTER TABLE sync_metadata_fixed RENAME TO sync_metadata;