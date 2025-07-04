# Staging Data Loss Incident Report

## Date: July 3, 2025

## Summary

The migration `0005_add_user_roles.sql` caused complete data loss in the staging environment by dropping the users table, which triggered cascade deletion of all user-related data.

## Root Cause

The original migration used the following approach:

1. Created a new `users_new` table
2. Copied data from `users` to `users_new`
3. **Dropped the `users` table** ← This was the problem
4. Renamed `users_new` to `users`

The issue: Both `sync_data` and `logbook_entries` tables have foreign key constraints with `ON DELETE CASCADE` referencing the users table. When we dropped the users table, it automatically deleted all records in these related tables.

## Impact

- All logbook entries were deleted from staging
- All sync data was deleted from staging
- Users cannot access their practice history

## Affected Tables

- `sync_data` - stores logbook entries and other synced data
- `logbook_entries` - stores practice session data
- Any other tables with foreign key constraints to users

## Fix Applied

The migration has been rewritten to use `ALTER TABLE` instead of dropping and recreating:

```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
```

## Prevention

1. **Never use DROP TABLE in migrations** when the table has foreign key relationships
2. Always check for CASCADE constraints before dropping tables
3. Test migrations on a copy of production data before applying to staging
4. Consider using soft deletes or table renaming instead of DROP

## Recovery Options

1. Restore from database backup (if available)
2. Users will need to re-sync their local data
3. Check if Cloudflare D1 has point-in-time recovery

## Action Items

- [ ] Check if Cloudflare D1 backups are available
- [ ] Notify affected users about the data loss
- [ ] Update migration guidelines to prevent this
- [ ] Consider adding safeguards in the migration process
- [ ] Review all existing migrations for similar issues

## Lessons Learned

- SQLite's foreign key constraints with CASCADE can cause unexpected data loss
- Migration testing should include checking for cascade effects
- Production-like data should be used for staging migration tests
