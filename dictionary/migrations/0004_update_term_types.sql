-- Update TermType CHECK constraint to include additional types
-- Created: 2025-07-14
-- This migration updates the dictionary_entries table to support all term types used in the frontend

-- Step 1: Create a new table with the updated constraint
CREATE TABLE dictionary_entries_new (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tempo', 'dynamics', 'articulation', 'form', 'genre', 'instrument', 'technique', 'theory', 'composer', 'period', 'notation', 'general')),
  definition TEXT NOT NULL, -- JSON
  refs TEXT NOT NULL, -- JSON
  metadata TEXT NOT NULL, -- JSON
  quality_score TEXT NOT NULL, -- JSON
  overall_score REAL NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

-- Step 2: Copy existing data from the old table
INSERT INTO dictionary_entries_new
SELECT * FROM dictionary_entries;

-- Step 3: Drop the old table
DROP TABLE dictionary_entries;

-- Step 4: Rename the new table to the original name
ALTER TABLE dictionary_entries_new RENAME TO dictionary_entries;

-- Step 5: Recreate indexes
CREATE INDEX idx_dictionary_normalized_term ON dictionary_entries(normalized_term);
CREATE INDEX idx_dictionary_type ON dictionary_entries(type);
CREATE INDEX idx_dictionary_overall_score ON dictionary_entries(overall_score);
CREATE INDEX idx_dictionary_updated_at ON dictionary_entries(updated_at);
CREATE INDEX idx_dictionary_term_type ON dictionary_entries(normalized_term, type);

-- Step 6: Update any existing 'general' type entries that might better fit the new categories
-- This is optional and can be done manually or through the enhancement queue
-- Example: UPDATE dictionary_entries SET type = 'tempo' WHERE normalized_term IN ('allegro', 'andante', 'adagio', 'presto');