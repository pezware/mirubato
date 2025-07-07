-- Metrics aggregation tables
CREATE TABLE IF NOT EXISTS metrics_hourly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL,
  worker TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  sum REAL DEFAULT 0,
  min REAL,
  max REAL,
  p50 REAL,
  p95 REAL,
  p99 REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_hourly_timestamp ON metrics_hourly(timestamp);
CREATE INDEX idx_metrics_hourly_worker_metric ON metrics_hourly(worker, metric);

-- Cost tracking
CREATE TABLE IF NOT EXISTS cost_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  worker TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'requests', 'cpu_time', 'd1_reads', 'r2_storage', etc
  usage REAL NOT NULL,
  cost_usd REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_tracking_date ON cost_tracking(date);
CREATE INDEX idx_cost_tracking_worker ON cost_tracking(worker);

-- Alert configuration
CREATE TABLE IF NOT EXISTS alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  worker TEXT,
  metric TEXT NOT NULL,
  condition TEXT NOT NULL, -- 'greater_than', 'less_than', 'equals'
  threshold REAL NOT NULL,
  window_minutes INTEGER DEFAULT 5,
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  enabled BOOLEAN DEFAULT 1,
  notification_channels TEXT, -- JSON array of channels
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alert history
CREATE TABLE IF NOT EXISTS alert_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL,
  triggered_at DATETIME NOT NULL,
  resolved_at DATETIME,
  value REAL NOT NULL,
  notification_sent BOOLEAN DEFAULT 0,
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
);

-- SLO tracking
CREATE TABLE IF NOT EXISTS slo_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  worker TEXT NOT NULL,
  target_percentage REAL NOT NULL, -- e.g., 99.9
  window_days INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slo_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slo_id INTEGER NOT NULL,
  date DATE NOT NULL,
  success_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  FOREIGN KEY (slo_id) REFERENCES slo_definitions(id)
);

-- Default alert rules
INSERT INTO alert_rules (name, metric, condition, threshold, window_minutes, severity, notification_channels) VALUES
  ('High Error Rate', 'error_rate', 'greater_than', 0.01, 5, 'critical', '["slack", "pagerduty"]'),
  ('High Response Time', 'response_time_p95', 'greater_than', 1000, 10, 'warning', '["slack"]'),
  ('Low Success Rate', 'success_rate', 'less_than', 0.999, 15, 'warning', '["slack"]'),
  ('Queue Depth High', 'queue_depth', 'greater_than', 1000, 5, 'warning', '["slack"]'),
  ('High Cost Alert', 'daily_cost', 'greater_than', 10, 60, 'warning', '["slack", "email"]');

-- Default SLO definitions
INSERT INTO slo_definitions (name, worker, target_percentage, window_days) VALUES
  ('API Availability', 'api', 99.9, 30),
  ('Frontend Availability', 'frontend', 99.9, 30),
  ('Scores Service Availability', 'scores', 99.5, 30);