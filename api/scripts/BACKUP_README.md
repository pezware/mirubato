# D1 Database Backup and Migration Scripts

> **⚠️ NOTE**: The automated GitHub Actions backup workflow has been removed from the public repository due to security concerns. These scripts remain for local/manual backup operations only.

This directory contains scripts for safely managing D1 database backups and migrations.

## Scripts

### backup-database.sh

Creates backups of D1 databases before migrations or other critical operations.

**Features:**

- Full database export (schema + data)
- Schema-only export for structure reference
- Automatic cleanup of old backups (keeps last 10)
- Metadata tracking with timestamps
- Database statistics reporting

**Usage:**

```bash
# Backup staging environment (default)
./backup-database.sh

# Backup production environment
./backup-database.sh --env production

# Custom backup directory
./backup-database.sh --dir /path/to/backups

# Specific database name
./backup-database.sh --db mirubato-dev
```

**Default backup location:** `../mirubato-db-backup/`

### safe-migrate.sh

Wrapper script that creates automatic backups before running D1 migrations.

**Features:**

- Automatic backup before migration
- Safety checks for production environments
- Database integrity verification after migration
- Helpful restore commands on failure

**Usage:**

```bash
# Migrate staging (default)
./safe-migrate.sh

# Migrate production (requires confirmation)
./safe-migrate.sh --env production

# Skip backup (NOT RECOMMENDED)
./safe-migrate.sh --skip-backup

# Custom backup directory
./safe-migrate.sh --backup-dir /path/to/backups
```

## Best Practices

1. **Always backup before migrations** - Use `safe-migrate.sh` instead of direct `wrangler d1 migrations apply`
2. **Test on staging first** - Never run untested migrations on production
3. **Keep backups organized** - Backups are stored with timestamps and environment names
4. **Monitor backup sizes** - Large databases may take time to export
5. **Verify restores work** - Periodically test that backups can be restored

## Backup File Naming

Backups follow this naming convention:

```
{database}_{environment}_{type}_{timestamp}.sql
```

Example:

```
mirubato-dev_staging_full_20250703_143022.sql
mirubato-prod_production_schema_20250703_143022.sql
```

## Restoring from Backup

To restore a database from backup:

```bash
# Find the backup file
ls ../mirubato-db-backup/

# Restore to D1
wrangler d1 execute <database-name> \
  --file=../mirubato-db-backup/mirubato-dev_staging_full_20250703_143022.sql \
  --remote \
  --env staging
```

## Incident Response

In case of data loss or migration failure:

1. **Stop all operations** - Prevent further damage
2. **Identify the latest backup** - Check backup directory
3. **Verify backup integrity** - Check file size and contents
4. **Restore to D1** - Use the restore command above
5. **Verify restoration** - Check key tables and row counts
6. **Document the incident** - Update STAGING_DATA_LOSS_INCIDENT.md if needed

## Migration Safety Checklist

Before running any migration:

- [ ] Backup exists for current data
- [ ] Migration tested on local database
- [ ] Migration tested on staging
- [ ] No DROP TABLE commands (use ALTER TABLE)
- [ ] Foreign key constraints reviewed
- [ ] Rollback plan documented
- [ ] Team notified of maintenance window

## Common Issues

### "Database not found"

Ensure the database name matches your wrangler.toml configuration.

### "Permission denied"

Make scripts executable: `chmod +x *.sh`

### "Backup directory not found"

The script will create the directory automatically. Ensure you have write permissions.

### Large backup files

D1 databases can grow large. Ensure sufficient disk space before backing up production.
