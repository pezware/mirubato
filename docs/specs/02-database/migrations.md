# Database Migrations Specification

## Overview

All schema changes are applied via per-service D1 migrations. We do not perform manual database operations. Evolution is additive and non-intrusive; destructive changes are avoided and, if ever necessary, use safe recreate-and-copy patterns in a single migration.

## Where Migrations Live

- API: `api/migrations/`
- Scores: `scores/migrations/`
- Dictionary: `dictionary/migrations/`
- Sync Worker: uses the API database; no separate migrations directory

## Creating Migrations

Run Wrangler from the service directory you’re modifying:

```bash
# Example: add a new index to API DB
cd api
wrangler d1 migrations create DB "add_goal_progress_index"
```

## Applying Migrations

Always test locally and in staging before production:

```bash
# Local (Miniflare)
wrangler d1 migrations apply DB --local

# Staging (remote)
wrangler d1 migrations apply DB --env staging --remote

# Production (remote)
wrangler d1 migrations apply DB --env production --remote
```

## Patterns and Guidelines

- Non-intrusive: prefer additive columns/tables; avoid renames/drops
- Backward-compatible: keep old data readable until clients are updated
- JSON-friendly: store complex structures as TEXT (JSON)
- Indexed wisely: add indexes for observed query patterns
- Triggers: use `updated_at` triggers sparingly to avoid heavy writes

## Examples (High-Level)

### Add a new history table (API)

```sql
-- goal_progress: historical tracking for goals
CREATE TABLE IF NOT EXISTS goal_progress (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  value REAL NOT NULL,
  notes TEXT,
  session_id TEXT,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_recorded_at ON goal_progress(recorded_at);
```

### Add a new index (Scores)

```sql
-- Improve composer queries
CREATE INDEX IF NOT EXISTS idx_scores_composer ON scores(composer);
```

### Add analytics support (Dictionary)

```sql
CREATE TABLE IF NOT EXISTS ai_token_usage (
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, model)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_date ON ai_token_usage(date);
```

## Safety and Policy

- No manual DB access. All changes via migrations.
- Test locally; verify in staging; then apply to production.
- Favor additive changes; when unavoidable, use recreate-and-copy in one migration.
- Keep migrations small, focused, and well-commented.


### Scores Service Migrations

#### Scores Schema (0001)

```sql
-- Scores metadata
CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  composer TEXT,
  normalized_composer TEXT,
  opus TEXT,
  key_signature TEXT,
  time_signature TEXT,
  tempo_marking TEXT,
  difficulty INTEGER,
  pages INTEGER,
  duration INTEGER, -- seconds
  instruments TEXT, -- JSON array
  tags TEXT, -- JSON array
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  source TEXT, -- 'upload', 'imslp', 'import'
  source_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  ai_metadata TEXT, -- JSON from AI extraction
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_scores_user ON scores(user_id);
CREATE INDEX idx_scores_composer ON scores(normalized_composer);
CREATE INDEX idx_scores_public ON scores(is_public);
CREATE INDEX idx_scores_created ON scores(created_at DESC);

-- Score pages for multi-page PDFs
CREATE TABLE score_pages (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  ocr_text TEXT,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  UNIQUE(score_id, page_number)
);
```

#### Collections Migration (0002)

```sql
-- Score collections
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  score_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_collections_public ON collections(is_public);

-- Collection items junction table
CREATE TABLE collection_items (
  collection_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  position INTEGER,
  added_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (collection_id, score_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE
);

CREATE INDEX idx_collection_items_score ON collection_items(score_id);
```

### Dictionary Service Migrations

```sql
-- Terms table
CREATE TABLE terms (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  definition TEXT NOT NULL,
  pronunciation TEXT,
  etymology TEXT,
  category TEXT, -- 'tempo', 'dynamics', 'technique', etc.
  related_terms TEXT, -- JSON array
  examples TEXT, -- JSON array
  translations TEXT, -- JSON object
  source TEXT DEFAULT 'manual', -- 'manual', 'ai', 'import'
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(normalized_term, language)
);

CREATE INDEX idx_terms_normalized ON terms(normalized_term);
CREATE INDEX idx_terms_category ON terms(category);
CREATE INDEX idx_terms_language ON terms(language);
CREATE INDEX idx_terms_usage ON terms(usage_count DESC);

-- Search index
CREATE VIRTUAL TABLE terms_fts USING fts5(
  term,
  definition,
  content=terms,
  content_rowid=id
);

-- Trigger to keep FTS index updated
CREATE TRIGGER terms_ai AFTER INSERT ON terms
BEGIN
  INSERT INTO terms_fts(rowid, term, definition)
  VALUES (NEW.id, NEW.term, NEW.definition);
END;
```

### Sync Worker Migrations

```sql
-- Active sync sessions
CREATE TABLE sync_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  connection_id TEXT UNIQUE NOT NULL,
  device_info TEXT,
  connected_at INTEGER DEFAULT (unixepoch()),
  last_activity INTEGER DEFAULT (unixepoch()),
  pending_messages INTEGER DEFAULT 0
);

CREATE INDEX idx_sync_sessions_user ON sync_sessions(user_id);
CREATE INDEX idx_sync_sessions_activity ON sync_sessions(last_activity);

-- Sync queue for offline changes
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'create', 'update', 'delete'
  data TEXT NOT NULL, -- JSON
  version INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT DEFAULT 'pending' -- 'pending', 'processing', 'failed'
);

CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_created ON sync_queue(created_at);
```

## Migration Best Practices

### Backward Compatibility

```sql
-- Add nullable columns first
ALTER TABLE users ADD COLUMN new_feature TEXT;

-- Backfill data in application code
-- Then add constraints in next migration
ALTER TABLE users ALTER COLUMN new_feature SET NOT NULL;
```

### Safe Index Creation

```sql
-- Create index concurrently (D1 handles this automatically)
CREATE INDEX IF NOT EXISTS idx_large_table_column
ON large_table(column);

-- Drop unused indexes
DROP INDEX IF EXISTS idx_old_unused;
```

### Data Migration Pattern

```sql
-- Step 1: Add new column
ALTER TABLE scores ADD COLUMN normalized_title TEXT;

-- Step 2: Populate with data
UPDATE scores
SET normalized_title = LOWER(TRIM(title))
WHERE normalized_title IS NULL;

-- Step 3: Add index
CREATE INDEX idx_scores_normalized_title
ON scores(normalized_title);
```

## Rollback Strategy

### Manual Rollback

```sql
-- Keep rollback scripts for each migration
-- migrations/rollback/0005_rollback.sql

DROP TABLE IF EXISTS user_preferences;
DROP INDEX IF EXISTS idx_user_preferences_updated;
DROP TRIGGER IF EXISTS update_user_preferences_timestamp;
```

### Safe Rollback Process

```bash
# 1. Take backup
wrangler d1 export DB --output backup.sql --env production

# 2. Apply rollback
wrangler d1 execute DB --file rollback/0005_rollback.sql --env production

# 3. Verify rollback
wrangler d1 execute DB --command "SELECT * FROM sqlite_master WHERE type='table'" --env production
```

## Migration Testing

### Local Testing

```bash
# Reset local database
rm .wrangler/state/d1/DB.sqlite3

# Apply all migrations fresh
wrangler d1 migrations apply DB --local

# Test with seed data
wrangler d1 execute DB --file seed.sql --local
```

### Staging Validation

```bash
# Clone production to staging
wrangler d1 export DB --output prod-backup.sql --env production
wrangler d1 execute DB --file prod-backup.sql --env staging

# Apply new migration
wrangler d1 migrations apply DB --env staging

# Run validation tests
npm run test:migrations -- --env=staging
```

## Migration Monitoring

### Health Checks

```typescript
// Check migration status
async function checkMigrationHealth(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT name, sql FROM sqlite_master 
    WHERE type = 'table' 
    ORDER BY name
  `
  ).all()

  const expectedTables = [
    'users',
    'sessions',
    'logbook_entries',
    'repertoire_items',
    'goals',
    'sync_status',
  ]

  const existingTables = result.results.map(r => r.name)
  const missingTables = expectedTables.filter(t => !existingTables.includes(t))

  return {
    healthy: missingTables.length === 0,
    missingTables,
    tableCount: existingTables.length,
  }
}
```

### Migration Metrics

```sql
-- Track migration performance
CREATE TABLE migration_history (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER DEFAULT (unixepoch()),
  execution_time_ms INTEGER,
  rows_affected INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);
```

## Troubleshooting

### Common Issues

| Issue                         | Cause                         | Solution                                 |
| ----------------------------- | ----------------------------- | ---------------------------------------- |
| Migration already applied     | Duplicate migration number    | Check migration history, use next number |
| Foreign key constraint failed | Referencing non-existent data | Add data checks before constraints       |
| Index already exists          | Duplicate index creation      | Use IF NOT EXISTS clause                 |
| Column already exists         | Re-running migration          | Use IF NOT EXISTS or check first         |

### Recovery Procedures

```bash
# Corrupted database
wrangler d1 export DB --output recovery.sql --env production
# Create new database and import

# Failed migration
# 1. Identify failed migration
wrangler d1 execute DB --command "SELECT * FROM migration_history WHERE success = 0"

# 2. Fix and reapply
wrangler d1 execute DB --file fixed-migration.sql --env production
```

## Related Documentation

- [Database Schema](./schema.md) - Complete schema reference
- [Sync Strategy](./sync-strategy.md) - Data synchronization approach
- [Cloudflare Services](../01-architecture/cloudflare-services.md) - D1 configuration

---

_Last updated: December 2024 | Version 1.7.6_
