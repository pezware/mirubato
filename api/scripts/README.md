# API Scripts Documentation

This directory contains utility scripts for managing the Mirubato API service, including database operations, authentication setup, and debugging tools.

## Database Management Scripts

### backup-database.sh

Creates backups of D1 databases before running migrations. Supports both full and schema-only backups.

**Usage:**

```bash
./backup-database.sh [--env staging|production] [--db database-name] [--dir backup-directory]
```

**Features:**

- Creates timestamped backups
- Generates backup metadata
- Cleans up old backups (keeps last 10)
- Shows restoration commands

### safe-migrate.sh

Runs D1 migrations with automatic backup. This is the recommended way to run migrations.

**Usage:**

```bash
./safe-migrate.sh [--env staging|production] [--skip-backup] [--backup-dir <dir>]
```

**Features:**

- Automatic backup before migration
- Production safety checks
- Database integrity verification
- Rollback instructions on failure

### reset-local-db.sh

Resets the local D1 database by clearing the Wrangler state and running migrations.

**Usage:**

```bash
./reset-local-db.sh
```

**Note:** This is for local development only and will clear all local data.

### setup-db.sh

Creates and configures D1 databases for different environments.

**Usage:**

```bash
./setup-db.sh [create|check|migrate] [local|staging|production]
```

**Modes:**

- `create`: Creates new database bindings
- `check`: Verifies database configuration
- `migrate`: Runs migrations

## Authentication Scripts

### setup-google-auth.sh

Configures Google OAuth credentials for the API service.

**Usage:**

```bash
./setup-google-auth.sh [local|staging|production]
```

**Requirements:**

- Google Client ID
- Google Client Secret

## Debugging Scripts

### tail-staging-logs.sh

Tails real-time logs from the staging environment.

**Usage:**

```bash
./tail-staging-logs.sh
```

## SQL Reference Files

### check-tables.sql

SQL queries for checking database table structure and contents.

### setup-staging-test-data.sql

Test data for staging environment validation.

### test-sync-structure.sql

SQL queries for testing sync table structure.

## Best Practices

1. **Always use safe-migrate.sh** for migrations (includes automatic backup)
2. **Never skip backups** when running production migrations
3. **Test migrations** in staging before production
4. **Keep backups** in the designated backup directory

## Backup and Recovery

See `BACKUP_README.md` for detailed backup and restoration procedures.
