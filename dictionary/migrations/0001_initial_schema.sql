-- Music Dictionary Service - Initial Schema (D1 Compatible)
-- Created: 2024-01-15
-- Modified: 2025-07-13 for D1 compatibility

-- Main dictionary entries table
CREATE TABLE IF NOT EXISTS dictionary_entries (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('instrument', 'genre', 'technique', 'composer', 'theory', 'general')),
  definition TEXT NOT NULL, -- JSON
  refs TEXT NOT NULL, -- JSON
  metadata TEXT NOT NULL, -- JSON
  quality_score TEXT NOT NULL, -- JSON
  overall_score REAL NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

-- Indexes for efficient querying
CREATE INDEX idx_dictionary_normalized_term ON dictionary_entries(normalized_term);
CREATE INDEX idx_dictionary_type ON dictionary_entries(type);
CREATE INDEX idx_dictionary_overall_score ON dictionary_entries(overall_score);
CREATE INDEX idx_dictionary_updated_at ON dictionary_entries(updated_at);
CREATE INDEX idx_dictionary_term_type ON dictionary_entries(normalized_term, type);

-- Quality checkpoints tracking table
CREATE TABLE IF NOT EXISTS quality_checkpoints (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('ai_validation', 'human_review', 'enhancement', 'user_feedback')),
  score_before REAL NOT NULL,
  score_after REAL NOT NULL,
  improvements TEXT, -- JSON array of improvement suggestions
  model_used TEXT NOT NULL,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  checked_by TEXT -- User ID for human reviews
);

CREATE INDEX idx_quality_entry_id ON quality_checkpoints(entry_id);
CREATE INDEX idx_quality_checked_at ON quality_checkpoints(checked_at);
CREATE INDEX idx_quality_check_type ON quality_checkpoints(check_type);

-- Search analytics for understanding user needs
CREATE TABLE IF NOT EXISTS search_analytics (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  found INTEGER NOT NULL, -- Changed from BOOLEAN to INTEGER for D1
  entry_id TEXT, -- NULL if not found
  response_time_ms INTEGER NOT NULL,
  searched_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_session_id TEXT,
  user_id TEXT,
  search_source TEXT DEFAULT 'web' CHECK (search_source IN ('web', 'api', 'mobile', 'extension'))
);

CREATE INDEX idx_search_normalized_term ON search_analytics(normalized_term);
CREATE INDEX idx_search_searched_at ON search_analytics(searched_at);
CREATE INDEX idx_search_found ON search_analytics(found);
CREATE INDEX idx_search_user_id ON search_analytics(user_id);

-- User feedback and ratings
CREATE TABLE IF NOT EXISTS user_feedback (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  user_id TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  helpful INTEGER, -- Changed from BOOLEAN to INTEGER for D1
  feedback_text TEXT,
  feedback_type TEXT CHECK (feedback_type IN ('accuracy', 'clarity', 'completeness', 'other')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_feedback_entry_id ON user_feedback(entry_id);
CREATE INDEX idx_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_feedback_created_at ON user_feedback(created_at);

-- Related terms mapping
CREATE TABLE IF NOT EXISTS related_terms (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  related_entry_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('synonym', 'antonym', 'see_also', 'broader', 'narrower', 'related')),
  confidence_score REAL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entry_id, related_entry_id, relationship_type)
);

CREATE INDEX idx_related_entry_id ON related_terms(entry_id);
CREATE INDEX idx_related_related_id ON related_terms(related_entry_id);

-- Enhancement queue for batch processing
CREATE TABLE IF NOT EXISTS enhancement_queue (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  reason TEXT NOT NULL CHECK (reason IN ('low_score', 'high_usage', 'user_request', 'scheduled', 'new_entry')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_enhancement_status ON enhancement_queue(status);
CREATE INDEX idx_enhancement_priority ON enhancement_queue(priority DESC);
CREATE INDEX idx_enhancement_created_at ON enhancement_queue(created_at);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  tokens_used INTEGER,
  cost_estimate REAL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_api_usage_key ON api_usage(api_key);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);

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