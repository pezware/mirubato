# D1 Database Cleanup Guide

This guide documents the process for cleaning up score ID inconsistencies in the D1 database using the `debug-data-fix` CLI tool.

## Prerequisites

1. Navigate to the tool directory:

```bash
cd tools/debug-data-fix
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables in `.env`:

```env
# API URLs
API_URL_STAGING=https://api-staging.mirubato.com
API_URL_PRODUCTION=https://api.mirubato.com

# Admin API tokens (request from system administrator)
API_TOKEN_STAGING=your-admin-staging-token
API_TOKEN_PRODUCTION=your-admin-production-token

# Database IDs (from wrangler.toml)
D1_DATABASE_ID_STAGING=4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e
D1_DATABASE_ID_PRODUCTION=31ecc854-aecf-4994-8bda-7a9cd3055122
```

## Step-by-Step Cleanup Process

### Phase 1: Investigation (Staging Environment)

First, investigate the extent of the issues in staging:

```bash
# Check for duplicate entries
pnpm run investigate duplicates --env=staging --user=<userId>

# Check for score ID format mismatches
pnpm run investigate score-ids --env=staging --user=<userId>

# Check for orphaned records
pnpm run investigate orphans --env=staging --user=<userId>

# Save investigation results
pnpm run investigate duplicates --env=staging --user=<userId> --output=staging-duplicates.json
pnpm run investigate score-ids --env=staging --user=<userId> --output=staging-scoreids.json
```

### Phase 2: Dry Run (Staging Environment)

Preview what changes would be made without actually applying them:

```bash
# Preview score ID fixes
pnpm run fix score-ids --env=staging --user=<userId> --dry-run

# Preview duplicate removal
pnpm run fix duplicates --env=staging --user=<userId> --dry-run

# Preview orphan cleanup
pnpm run fix orphans --env=staging --user=<userId> --dry-run
```

Review the output carefully to ensure the proposed changes are correct.

### Phase 3: Apply Fixes (Staging Environment)

After reviewing the dry run output, apply the fixes:

```bash
# Fix score ID formats (with automatic backup)
pnpm run fix score-ids --env=staging --user=<userId> --no-dry-run --auto-backup

# Fix duplicates (interactive mode for careful review)
pnpm run fix duplicates --env=staging --user=<userId> --no-dry-run --interactive

# Fix orphans
pnpm run fix orphans --env=staging --user=<userId> --no-dry-run
```

### Phase 4: Validation (Staging Environment)

Verify the fixes were applied successfully:

```bash
# Validate all data integrity
pnpm run validate --env=staging --user=<userId>

# Check specific areas
pnpm run validate --env=staging --user=<userId> --scope=scoreIds
pnpm run validate --env=staging --user=<userId> --scope=duplicates
```

### Phase 5: Production Cleanup

⚠️ **CRITICAL**: Only proceed to production after successful staging validation!

```bash
# 1. Investigation (save results for audit trail)
pnpm run investigate score-ids --env=production --user=<userId> --output=prod-scoreids-before.json
pnpm run investigate duplicates --env=production --user=<userId> --output=prod-duplicates-before.json

# 2. Create backup
pnpm run cli backup --create --env=production --user=<userId>

# 3. Fix score IDs (interactive mode for production safety)
pnpm run fix score-ids --env=production --user=<userId> --interactive --batch-size=10

# 4. Fix duplicates (extra careful with interactive mode)
pnpm run fix duplicates --env=production --user=<userId> --interactive --batch-size=5

# 5. Validate results
pnpm run validate --env=production --user=<userId>

# 6. Save post-cleanup state
pnpm run investigate score-ids --env=production --user=<userId> --output=prod-scoreids-after.json
```

## Rollback Procedures

If something goes wrong, you can rollback changes:

```bash
# List available rollback points
pnpm run rollback --list

# Rollback to a specific transaction
pnpm run rollback tx_<transaction_id>

# Restore from backup
pnpm run rollback <backup_name>
```

## Common Issues and Solutions

### Issue: Mixed Case Score IDs

**Example**: "Nocturne Op.9-CHOPIN" vs "nocturne op.9-chopin"  
**Solution**: The tool normalizes all to lowercase

### Issue: Dash in Title

**Example**: "Peer Gynt - Morning-Grieg" (ambiguous delimiter)  
**Solution**: Tool converts to "peer gynt - morning||grieg" using double-pipe delimiter

### Issue: Duplicate Entries

**Example**: Same piece with different capitalization creating duplicates  
**Solution**: Tool merges duplicates, keeping the one with most data

### Issue: Legacy Format

**Example**: Old entries using scoreTitle/scoreComposer instead of scoreId  
**Solution**: Tool generates normalized scoreId from title and composer

## Safety Features

The tool includes multiple safety mechanisms:

1. **Dry Run Mode**: Default mode that shows changes without applying them
2. **Interactive Mode**: Requires confirmation for each change
3. **Automatic Backups**: Creates snapshots before modifications
4. **Transaction Support**: All changes can be rolled back
5. **Batch Limits**: Prevents accidental mass modifications
6. **Environment Confirmation**: Multiple confirmations for production
7. **Audit Trail**: All operations are logged with timestamps

## Best Practices

1. **Always start with staging**: Test all operations on staging first
2. **Use dry run first**: Review changes before applying
3. **Work in small batches**: Use `--batch-size` to limit scope
4. **Keep backups**: Use `--auto-backup` for automatic backups
5. **Document changes**: Save investigation outputs for audit trail
6. **Monitor after cleanup**: Check application behavior post-cleanup
7. **Coordinate with team**: Inform team before production changes

## Monitoring After Cleanup

After completing the cleanup:

1. Monitor error logs for any issues:

```bash
wrangler tail --env=production --search "score" --status 500
```

2. Check sync operations:

```bash
curl https://api.mirubato.com/health
```

3. Verify user data integrity through the app
4. Monitor WebSocket sync for any conflicts

## Support

If you encounter issues:

1. Check the logs in `tools/debug-data-fix/logs/`
2. Review the audit trail for the transaction
3. Use rollback if necessary
4. Contact the development team with:
   - Transaction ID
   - Log files
   - Investigation outputs

## Summary

The cleanup process follows this flow:

1. **Investigate** → Understand the scope of issues
2. **Dry Run** → Preview changes safely
3. **Apply** → Execute fixes with safety measures
4. **Validate** → Confirm success
5. **Monitor** → Ensure ongoing stability

Always prioritize data safety over speed. When in doubt, use interactive mode and work in small batches.
