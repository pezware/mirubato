-- Add global sequence tracking for sync_data changes

-- 1. Add seq column to sync_data to track change order
ALTER TABLE sync_data ADD COLUMN seq INTEGER;

-- 2. Backfill seq values based on historical ordering (updated_at, entity_id)
WITH ordered AS (
  SELECT
    rowid,
    ROW_NUMBER() OVER (ORDER BY datetime(updated_at) ASC, entity_id ASC, id ASC) AS seq_value
  FROM sync_data
)
UPDATE sync_data
SET seq = ordered.seq_value
FROM ordered
WHERE sync_data.rowid = ordered.rowid;

-- 3. Ensure a sequence table exists and initialize it to the current max seq
CREATE TABLE IF NOT EXISTS sync_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_value INTEGER NOT NULL DEFAULT 0
);

INSERT INTO sync_sequence (id, current_value)
VALUES (1, IFNULL((SELECT MAX(seq) FROM sync_data), 0))
ON CONFLICT(id) DO UPDATE SET current_value = excluded.current_value;

-- 4. Indexes for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_data_seq_unique ON sync_data(seq);
CREATE INDEX IF NOT EXISTS idx_sync_data_user_seq ON sync_data(user_id, entity_type, seq);
