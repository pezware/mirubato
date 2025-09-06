# Database Migrations Specification

## Overview

Mirubato uses Cloudflare D1's migration system to manage database schema changes across all services. Each service maintains its own migration history, ensuring isolated and versioned database evolution.

## Migration Architecture

### D1 Migration System

```
migrations/
├── api/
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_sync_columns.sql
│   ├── 0003_add_repertoire_tables.sql
│   └── 0004_add_indexes.sql
├── scores/
│   ├── 0001_scores_schema.sql
│   └── 0002_add_collections.sql
├── dictionary/
│   └── 0001_terms_schema.sql
└── sync-worker/
    └── 0001_sync_tables.sql
```

## Migration Workflow

### Creating Migrations

```bash
# Generate new migration file
wrangler d1 migrations create DB "add_user_preferences"

# This creates: migrations/0005_add_user_preferences.sql
```

### Migration File Format

```sql
-- Migration: 0005_add_user_preferences.sql
-- Created: 2024-12-01
-- Description: Add user preferences table

-- Up Migration
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_interval INTEGER DEFAULT 30000,
  notifications TEXT DEFAULT '{}', -- JSON
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_preferences_updated
ON user_preferences(updated_at);

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_timestamp
AFTER UPDATE ON user_preferences
BEGIN
  UPDATE user_preferences
  SET updated_at = unixepoch()
  WHERE user_id = NEW.user_id;
END;
```

### Applying Migrations

```bash
# Local development
wrangler d1 migrations apply DB --local

# Staging environment
wrangler d1 migrations apply DB --env staging

# Production (with confirmation)
wrangler d1 migrations apply DB --env production
```

## Migration Schemas

### API Service Migrations

#### Initial Schema (0001)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  primary_instrument TEXT,
  instruments TEXT DEFAULT '[]', -- JSON array
  role TEXT DEFAULT 'user',
  provider TEXT DEFAULT 'email',
  provider_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  deleted_at INTEGER
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  last_activity_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

#### Sync Columns Migration (0002)

```sql
-- Add sync tracking columns
ALTER TABLE logbook_entries ADD COLUMN sync_version INTEGER DEFAULT 0;
ALTER TABLE logbook_entries ADD COLUMN sync_hash TEXT;
ALTER TABLE logbook_entries ADD COLUMN last_synced_at INTEGER;

ALTER TABLE repertoire_items ADD COLUMN sync_version INTEGER DEFAULT 0;
ALTER TABLE repertoire_items ADD COLUMN sync_hash TEXT;
ALTER TABLE repertoire_items ADD COLUMN last_synced_at INTEGER;

-- Sync status table
CREATE TABLE sync_status (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version INTEGER DEFAULT 0,
  hash TEXT,
  last_modified INTEGER,
  conflict_data TEXT, -- JSON
  PRIMARY KEY (entity_type, entity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_status_user ON sync_status(user_id);
CREATE INDEX idx_sync_status_modified ON sync_status(last_modified);
```

#### Repertoire Tables Migration (0003)

```sql
-- Repertoire items
CREATE TABLE repertoire_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT,
  score_title TEXT NOT NULL,
  score_composer TEXT NOT NULL,
  normalized_composer TEXT,
  status TEXT DEFAULT 'planned',
  status_history TEXT DEFAULT '[]', -- JSON
  difficulty INTEGER CHECK(difficulty >= 1 AND difficulty <= 10),
  notes TEXT,
  goal_ids TEXT DEFAULT '[]', -- JSON array
  practice_count INTEGER DEFAULT 0,
  total_practice_time INTEGER DEFAULT 0,
  last_practiced_at INTEGER,
  target_tempo INTEGER,
  current_tempo INTEGER,
  performance_date INTEGER,
  added_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_repertoire_user ON repertoire_items(user_id);
CREATE INDEX idx_repertoire_status ON repertoire_items(status);
CREATE INDEX idx_repertoire_composer ON repertoire_items(normalized_composer);
CREATE INDEX idx_repertoire_last_practiced ON repertoire_items(last_practiced_at DESC);
```

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
