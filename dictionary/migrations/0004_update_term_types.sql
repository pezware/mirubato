-- Update TermType CHECK constraint to include additional types
-- Created: 2025-07-14
-- This migration updates the dictionary_entries table to support all term types used in the frontend

-- Step 0: Drop views that depend on dictionary_entries
DROP VIEW IF EXISTS popular_searches;
DROP VIEW IF EXISTS low_quality_entries;
DROP VIEW IF EXISTS term_trends;

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

-- Step 6: Recreate views
-- Create a view for popular searches
CREATE VIEW IF NOT EXISTS popular_searches AS
SELECT 
  normalized_term,
  COUNT(*) as search_count,
  SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_count,
  AVG(response_time_ms) as avg_response_time,
  MAX(searched_at) as last_searched
FROM search_analytics
WHERE searched_at > datetime('now', '-30 days')
GROUP BY normalized_term
ORDER BY search_count DESC
LIMIT 100;

-- Create a view for low quality entries needing attention
CREATE VIEW IF NOT EXISTS low_quality_entries AS
SELECT 
  de.id,
  de.term,
  de.type,
  de.overall_score,
  de.updated_at,
  COUNT(DISTINCT sa.id) as search_count,
  AVG(uf.rating) as avg_rating
FROM dictionary_entries de
LEFT JOIN search_analytics sa ON sa.entry_id = de.id
LEFT JOIN user_feedback uf ON uf.entry_id = de.id
WHERE de.overall_score < 70
  OR (de.updated_at < datetime('now', '-30 days') AND de.overall_score < 80)
GROUP BY de.id
ORDER BY search_count DESC, de.overall_score ASC;

-- Create view for term popularity trends
CREATE VIEW IF NOT EXISTS term_trends AS
SELECT 
  sa.normalized_term,
  DATE(sa.searched_at) as date,
  COUNT(*) as daily_searches,
  de.overall_score,
  de.type
FROM search_analytics sa
LEFT JOIN dictionary_entries de ON sa.entry_id = de.id
WHERE sa.searched_at > datetime('now', '-90 days')
GROUP BY sa.normalized_term, DATE(sa.searched_at)
ORDER BY date DESC, daily_searches DESC;

-- Step 7: Update any existing 'general' type entries that might better fit the new categories
-- This is optional and can be done manually or through the enhancement queue
-- Example: UPDATE dictionary_entries SET type = 'tempo' WHERE normalized_term IN ('allegro', 'andante', 'adagio', 'presto');