-- Add support for automatic dictionary term seeding
-- Created: 2025-12-10
-- This migration adds tables for token usage tracking and manual review queue

-- Step 1: Create token usage tracking table
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  terms_processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for efficient queries
CREATE INDEX idx_token_usage_date ON ai_token_usage(date);
CREATE INDEX idx_token_usage_model ON ai_token_usage(model);
CREATE INDEX idx_token_usage_date_model ON ai_token_usage(date, model);

-- Step 2: Create manual review queue table
CREATE TABLE IF NOT EXISTS manual_review_queue (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  generated_content TEXT NOT NULL, -- JSON of the generated DictionaryEntry
  quality_score REAL NOT NULL,
  reason TEXT NOT NULL, -- Why it needs manual review
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  reviewer_notes TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for review queue
CREATE INDEX idx_review_queue_status ON manual_review_queue(status);
CREATE INDEX idx_review_queue_created ON manual_review_queue(created_at);
CREATE INDEX idx_review_queue_term ON manual_review_queue(term);

-- Step 3: Update seed_queue table to add missing columns
ALTER TABLE seed_queue ADD COLUMN category TEXT;
ALTER TABLE seed_queue ADD COLUMN source TEXT DEFAULT 'manual';
ALTER TABLE seed_queue ADD COLUMN related_terms TEXT; -- JSON array

-- Step 4: Create term relationships table for future use
CREATE TABLE IF NOT EXISTS term_relationships (
  id TEXT PRIMARY KEY,
  term_id TEXT NOT NULL,
  related_term_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('synonym', 'antonym', 'related', 'parent', 'child', 'see_also')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('wikipedia', 'ai_generated', 'manual', 'user_contributed')),
  confidence REAL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (term_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (related_term_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  UNIQUE(term_id, related_term_id, relationship_type)
);

-- Create indexes for relationships
CREATE INDEX idx_relationships_term_id ON term_relationships(term_id);
CREATE INDEX idx_relationships_related_id ON term_relationships(related_term_id);
CREATE INDEX idx_relationships_type ON term_relationships(relationship_type);

-- Step 5: Update AI metadata structure in dictionary_entries to track seed source
-- This is done at the application level, but we'll add an index for efficient queries
CREATE INDEX idx_dictionary_ai_source ON dictionary_entries(
  json_extract(ai_metadata, '$.generation_context.requested_by')
);