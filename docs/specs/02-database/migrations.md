# Database Migrations

**What**: Migration-driven schema evolution using Cloudflare D1 migrations.

**Why**:

- Reproducible schema changes across environments
- Rollback capability for failed deployments
- Version control for database evolution
- No manual database operations allowed

**How**:

- Numbered SQL files in service migration directories
- Wrangler CLI for creation and application
- Test locally → staging → production workflow
- Additive changes preferred over destructive

## Migration Locations

| Service     | Directory                | Count    | Purpose                        |
| ----------- | ------------------------ | -------- | ------------------------------ |
| API         | `api/migrations/`        | 11 files | Users, sync, repertoire, goals |
| Scores      | `scores/migrations/`     | 18 files | Scores, collections, analytics |
| Dictionary  | `dictionary/migrations/` | 8 files  | Terms, embeddings, queues      |
| Sync Worker | (uses API DB)            | N/A      | Shares API database            |

**Code References**:

- Migration files: `*/migrations/*.sql`
- Wrangler configs: `*/wrangler.toml` (database bindings)

## Creating Migrations

**Command Structure**:

```bash
cd [service]
wrangler d1 migrations create DB "descriptive_name"
```

**Naming Conventions**:

- Use snake_case: `add_user_preferences`
- Be descriptive: `add_dropped_status_to_repertoire`
- Include table name when specific
- Numbered automatically by Wrangler

**Examples**:

```bash
# API service
cd api
wrangler d1 migrations create DB "add_goal_progress_table"

# Scores service
cd scores
wrangler d1 migrations create DB "add_normalized_id_column"
```

## Applying Migrations

**Environment Progression**:

```bash
# 1. Local (Miniflare/SQLite)
wrangler d1 migrations apply DB --local

# 2. Staging (remote D1)
wrangler d1 migrations apply DB --env staging

# 3. Production (remote D1)
wrangler d1 migrations apply DB --env production
```

**Verification**:

```bash
# List applied migrations
wrangler d1 migrations list DB --env production

# Query database directly
wrangler d1 execute DB --command "SELECT * FROM d1_migrations" --env production
```

## Migration Patterns

### Additive Changes (Preferred)

**Add Column**:

```sql
-- Safe: nullable or with default
ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';
```

**Add Table**:

```sql
-- Always use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS goal_progress (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  value REAL NOT NULL,
  recorded_at INTEGER NOT NULL
);
```

**Add Index**:

```sql
-- Include IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_scores_composer ON scores(composer);
```

### Data Migrations

**Lowercase Conversion** (example from API):

```sql
-- Migration 0007: Convert enum values
UPDATE sync_data
SET data = json_set(data, '$.mood', lower(json_extract(data, '$.mood')))
WHERE entity_type = 'logbook_entry';
```

**Backfill Columns**:

```sql
-- Set values for existing rows
UPDATE scores
SET normalized_id = lower(replace(title || '-' || composer, ' ', '-'))
WHERE normalized_id IS NULL;
```

### Schema Evolution

**Enum Changes**:

```sql
-- D1 doesn't support ALTER CHECK, use careful migration
-- Step 1: Add new column
ALTER TABLE user_repertoire ADD COLUMN status_new TEXT;
-- Step 2: Copy data with transformation
UPDATE user_repertoire SET status_new = lower(status);
-- Step 3: In next migration, drop old and rename
```

### Destructive Changes (Avoid)

When unavoidable, use recreate pattern:

```sql
-- Single migration file
CREATE TABLE new_table AS SELECT * FROM old_table;
-- Apply transformations
DROP TABLE old_table;
ALTER TABLE new_table RENAME TO old_table;
-- Recreate indexes
```

## Migration Safety

**Pre-flight Checks**:

- [ ] Test migration locally first
- [ ] Backup production before major changes
- [ ] Review for data loss potential
- [ ] Check for blocking operations
- [ ] Verify rollback plan

**Common Issues**:

| Issue                | Symptoms        | Solution                       |
| -------------------- | --------------- | ------------------------------ |
| Constraint violation | Migration fails | Add data cleanup step          |
| Missing column       | Query errors    | Use IF EXISTS checks           |
| Type mismatch        | Data corruption | Test with production-like data |
| Large table update   | Timeout         | Batch updates, use WHERE       |

## Service-Specific Notes

### API Migrations

- Focus on sync_data integrity
- Maintain backward compatibility for sync
- FK constraints not enforced (D1 limitation)
- Source: `api/migrations/`

### Scores Migrations

- Heavy use of JSON columns for flexibility
- Composer canonicalization (migration 0017)
- Collections evolution (0014-0015)
- Source: `scores/migrations/`

### Dictionary Migrations

- Embedding support added incrementally
- Queue tables for async processing
- Analytics tracking tables
- Source: `dictionary/migrations/`

## Rollback Strategy

**D1 Limitations**:

- No automatic rollback mechanism
- Must write compensating migrations

**Manual Rollback**:

```sql
-- Create reverse migration
-- Example: Drop column added in previous migration
ALTER TABLE users DROP COLUMN preferences;
```

**Best Practice**:

- Keep migrations small and focused
- Test rollback procedure in staging
- Document reverse operations

## Operational Guidelines

**Do**:

- ✅ Use `IF NOT EXISTS` for creates
- ✅ Add columns as nullable or with defaults
- ✅ Test with production-like data volumes
- ✅ Keep migrations idempotent where possible
- ✅ Comment complex migrations

**Don't**:

- ❌ Modify migrations after deployment
- ❌ Skip environments in progression
- ❌ Use DROP without careful consideration
- ❌ Assume FK constraints work (D1 limitation)
- ❌ Make manual database changes

## Related Documentation

- [Database Schema](./schema.md) — Current schema documentation
- [Sync Strategy](./sync-strategy.md) — Data synchronization patterns
- [Cloudflare Services](../01-architecture/cloudflare-services.md) — D1 service details

---

_Last updated: 2025-09-09 | Version 1.7.6_
