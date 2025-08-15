-- Music Dictionary Service - Analytics Tables
-- Created: 2024-01-15

-- AI model usage tracking
CREATE TABLE IF NOT EXISTS ai_model_usage (
  id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_provider TEXT NOT NULL CHECK (model_provider IN ('cloudflare', 'openai', 'anthropic', 'google')),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('generation', 'validation', 'enhancement', 'embedding')),
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_usd REAL,
  latency_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  entry_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ai_usage_model ON ai_model_usage(model_name);
CREATE INDEX idx_ai_usage_created_at ON ai_model_usage(created_at);
CREATE INDEX idx_ai_usage_operation ON ai_model_usage(operation_type);
CREATE INDEX idx_ai_usage_success ON ai_model_usage(success);

-- Cache performance metrics
CREATE TABLE IF NOT EXISTS cache_metrics (
  id TEXT PRIMARY KEY,
  cache_key TEXT NOT NULL,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('kv', 'edge', 'd1')),
  operation TEXT NOT NULL CHECK (operation IN ('hit', 'miss', 'set', 'delete', 'expire')),
  size_bytes INTEGER,
  ttl_seconds INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cache_metrics_key ON cache_metrics(cache_key);
CREATE INDEX idx_cache_metrics_created_at ON cache_metrics(created_at);
CREATE INDEX idx_cache_metrics_operation ON cache_metrics(operation);

-- Aggregate daily statistics
CREATE TABLE IF NOT EXISTS daily_statistics (
  date TEXT PRIMARY KEY,
  total_searches INTEGER DEFAULT 0,
  successful_searches INTEGER DEFAULT 0,
  new_entries_created INTEGER DEFAULT 0,
  entries_enhanced INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  ai_cost_usd REAL DEFAULT 0,
  avg_response_time_ms REAL,
  cache_hit_rate REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Export history
CREATE TABLE IF NOT EXISTS export_history (
  id TEXT PRIMARY KEY,
  export_type TEXT NOT NULL CHECK (export_type IN ('full', 'filtered', 'custom')),
  format TEXT NOT NULL CHECK (format IN ('json', 'csv', 'sqlite')),
  filters TEXT, -- JSON
  total_entries INTEGER NOT NULL,
  file_size_bytes INTEGER,
  storage_url TEXT,
  requested_by TEXT,
  download_count INTEGER DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_export_created_at ON export_history(created_at);
CREATE INDEX idx_export_requested_by ON export_history(requested_by);

-- Term embeddings for semantic search
CREATE TABLE IF NOT EXISTS term_embeddings (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding_vector BLOB NOT NULL, -- Store as binary for efficiency
  vector_dimensions INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_embeddings_entry_id ON term_embeddings(entry_id);
CREATE INDEX idx_embeddings_model ON term_embeddings(embedding_model);

-- System health metrics
CREATE TABLE IF NOT EXISTS health_checks (
  id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  latency_ms INTEGER,
  details TEXT, -- JSON
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_health_checked_at ON health_checks(checked_at);
CREATE INDEX idx_health_service ON health_checks(service_name);
CREATE INDEX idx_health_status ON health_checks(status);

-- Create materialized view for AI cost tracking
CREATE VIEW IF NOT EXISTS ai_cost_summary AS
SELECT 
  DATE(created_at) as date,
  model_provider,
  model_name,
  operation_type,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
FROM ai_model_usage
GROUP BY DATE(created_at), model_provider, model_name, operation_type;

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