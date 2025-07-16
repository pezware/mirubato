-- Migration: Add error recovery support for auto-seeding
-- Purpose: Create dead letter queue and recovery tracking

-- Dead letter queue for permanently failed items
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id TEXT PRIMARY KEY,
  original_id TEXT NOT NULL,
  term TEXT NOT NULL,
  languages TEXT NOT NULL, -- JSON array
  priority INTEGER DEFAULT 5,
  failure_reason TEXT NOT NULL,
  failure_analysis TEXT, -- JSON object with error_type, is_retryable, etc.
  attempts INTEGER DEFAULT 0,
  original_created_at DATETIME NOT NULL,
  moved_to_dlq_at DATETIME NOT NULL,
  UNIQUE(original_id)
);

-- Add retry tracking to seed_queue
ALTER TABLE seed_queue ADD COLUMN retry_after DATETIME;

-- Index for efficient recovery queries
CREATE INDEX IF NOT EXISTS idx_seed_queue_failed_retry ON seed_queue(status, retry_after)
  WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_dlq_created ON dead_letter_queue(moved_to_dlq_at);

-- Recovery history for tracking success rates
CREATE TABLE IF NOT EXISTS recovery_history (
  id TEXT PRIMARY KEY,
  recovery_run_id TEXT NOT NULL,
  term TEXT NOT NULL,
  action TEXT CHECK(action IN ('retry_scheduled', 'moved_to_dlq', 'recovered')) NOT NULL,
  error_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for recovery analytics
CREATE INDEX IF NOT EXISTS idx_recovery_history_date ON recovery_history(created_at, action);