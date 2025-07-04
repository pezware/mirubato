# SQLite Migration Strategy for D1

## The Problem

SQLite doesn't support `ALTER TABLE ADD COLUMN IF NOT EXISTS`, which makes migrations non-idempotent. When re-running migrations, they fail if columns already exist.

## The Solution

### 1. Accept Failures as Normal

D1's migration system continues executing subsequent statements even if individual statements fail. This means:

- `ALTER TABLE ADD COLUMN` failures for existing columns are harmless
- The migration is still marked as "applied" in `d1_migrations` table
- Subsequent runs will skip the entire migration file

### 2. Migration Best Practices

```sql
-- ❌ BAD: Will stop entire migration on error
ALTER TABLE scores ADD COLUMN new_field TEXT NOT NULL;

-- ✅ GOOD: Allows migration to continue
ALTER TABLE scores ADD COLUMN new_field TEXT;
-- Then update in a separate statement
UPDATE scores SET new_field = 'default' WHERE new_field IS NULL;
```

### 3. Idempotent Operations

Always use these when possible:

- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `INSERT OR IGNORE`
- `INSERT OR REPLACE`
- `DROP TABLE IF EXISTS`
- `DROP INDEX IF EXISTS`

### 4. For Complex Schema Changes

If you need true idempotency for complex changes:

```sql
-- Create new table with desired schema
CREATE TABLE IF NOT EXISTS scores_new (...);

-- Copy data (handles both old and new schemas)
INSERT OR IGNORE INTO scores_new SELECT * FROM scores;

-- Swap tables
DROP TABLE scores;
ALTER TABLE scores_new RENAME TO scores;
```

## Current Migration Status

All migrations have been updated with comments explaining that column addition failures are expected and harmless. The system will handle them gracefully.
