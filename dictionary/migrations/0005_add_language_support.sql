-- Add multi-language support to dictionary
-- Created: 2025-07-14
-- This migration adds language fields and updates constraints to support multiple languages

-- Step 0: Drop views that depend on dictionary_entries
DROP VIEW IF EXISTS popular_searches;
DROP VIEW IF EXISTS low_quality_entries;
DROP VIEW IF EXISTS term_trends;

-- Step 1: Create a new table with language support
CREATE TABLE dictionary_entries_new (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW')),
  source_lang TEXT CHECK (source_lang IN ('en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW', 'it', 'la', NULL)),
  lang_confidence REAL DEFAULT 1.0 CHECK (lang_confidence >= 0 AND lang_confidence <= 1),
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

-- Step 2: Copy existing data from the old table (all entries default to English)
INSERT INTO dictionary_entries_new (
  id, term, normalized_term, type, definition, refs, metadata, 
  quality_score, overall_score, created_at, updated_at, version
)
SELECT 
  id, term, normalized_term, type, definition, refs, metadata,
  quality_score, overall_score, created_at, updated_at, version
FROM dictionary_entries;

-- Step 3: Drop the old table
DROP TABLE dictionary_entries;

-- Step 4: Rename the new table to the original name
ALTER TABLE dictionary_entries_new RENAME TO dictionary_entries;

-- Step 5: Create new indexes including language support
-- Unique constraint on normalized_term + lang combination
CREATE UNIQUE INDEX idx_dictionary_term_lang ON dictionary_entries(normalized_term, lang);

-- Performance indexes
CREATE INDEX idx_dictionary_normalized_term ON dictionary_entries(normalized_term);
CREATE INDEX idx_dictionary_type ON dictionary_entries(type);
CREATE INDEX idx_dictionary_overall_score ON dictionary_entries(overall_score);
CREATE INDEX idx_dictionary_updated_at ON dictionary_entries(updated_at);
CREATE INDEX idx_dictionary_term_type ON dictionary_entries(normalized_term, type);
CREATE INDEX idx_dictionary_lang ON dictionary_entries(lang);
CREATE INDEX idx_dictionary_source_lang ON dictionary_entries(source_lang);

-- Step 6: Create seed queue table for background term generation
CREATE TABLE IF NOT EXISTS seed_queue (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  languages TEXT NOT NULL, -- JSON array of language codes
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_seed_queue_status ON seed_queue(status);
CREATE INDEX idx_seed_queue_priority ON seed_queue(priority DESC);

-- Step 7: Recreate views with language awareness
-- Popular searches view (now includes language)
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

-- Low quality entries view (now considers language)
CREATE VIEW IF NOT EXISTS low_quality_entries AS
SELECT 
  de.id,
  de.term,
  de.lang,
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

-- Term trends view (now includes language context)
CREATE VIEW IF NOT EXISTS term_trends AS
SELECT 
  sa.normalized_term,
  DATE(sa.searched_at) as date,
  COUNT(*) as daily_searches,
  de.overall_score,
  de.type,
  de.lang
FROM search_analytics sa
LEFT JOIN dictionary_entries de ON sa.entry_id = de.id
WHERE sa.searched_at > datetime('now', '-90 days')
GROUP BY sa.normalized_term, DATE(sa.searched_at), de.lang
ORDER BY date DESC, daily_searches DESC;

-- Step 8: Add language to search_analytics for tracking
ALTER TABLE search_analytics ADD COLUMN search_lang TEXT DEFAULT 'en';
ALTER TABLE search_analytics ADD COLUMN result_lang TEXT;

-- Step 9: Update search analytics indexes
CREATE INDEX idx_search_search_lang ON search_analytics(search_lang);
CREATE INDEX idx_search_result_lang ON search_analytics(result_lang);