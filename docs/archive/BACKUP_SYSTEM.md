# D1 Database Backup System

> **⚠️ DEPRECATED**: This backup system has been removed from the public repository due to security concerns with GitHub Artifacts being publicly accessible in public repositories. Database backups should be implemented in a private repository or using alternative secure storage methods.

## Overview

This document describes the automated backup system for Mirubato's D1 databases. The system provides daily encrypted backups of both the API and Scores databases with secure storage and easy recovery options.

## Features

- **Automated Daily Backups**: Runs at 4 AM PT (11 AM UTC) every day
- **Multiple Databases**: Backs up both `mirubato-prod` and `mirubato-scores-production`
- **Encryption**: AES-256-CBC encryption with PBKDF2 key derivation
- **Secure Storage**: GitHub Artifacts with 7-day retention
- **No Data Leakage**: Designed for public repositories - no sensitive data in logs
- **Manual Trigger**: Can be run on-demand via GitHub Actions UI

## Security Considerations

Since this is a **public repository**, the backup workflow has been designed with security in mind:

1. **No Data in Logs**: All database queries and exports suppress output
2. **Encryption at Rest**: All backups are encrypted before storage
3. **Masked Values**: Even counts are masked in GitHub logs
4. **Secure Deletion**: Unencrypted files are shredded after encryption
5. **No Secrets Exposed**: All sensitive values stored in GitHub Secrets

## Architecture

### Components

1. **GitHub Actions Workflow** (`.github/workflows/scheduled-backup.yml`)
   - Scheduled via cron trigger
   - Exports databases using Wrangler CLI
   - Encrypts SQL dumps
   - Stores as GitHub Artifacts

2. **Restore Script** (`api/scripts/restore-from-backup.sh`)
   - Downloads and decrypts backups
   - Restores to specified environment
   - Includes safety checks for production

### Backup Flow

```
4 AM PT Daily Trigger
        ↓
Export API Database → Encrypt → Store as Artifact
        ↓
Export Scores Database → Encrypt → Store as Artifact
        ↓
Generate Metadata → Store Report
        ↓
Clean Up (GitHub handles retention)
```

## Required Secrets

Configure these in GitHub Settings → Secrets → Actions:

- `CLOUDFLARE_API_TOKEN`: Token with D1 read permissions
- `BACKUP_ENCRYPTION_KEY`: Strong password for backup encryption
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID (for future R2 support)

## Usage

### Manual Backup

1. Go to [Actions → Scheduled D1 Database Backup](https://github.com/arbeitandy/mirubato/actions/workflows/scheduled-backup.yml)
2. Click "Run workflow"
3. Select environment (production/staging)
4. Click "Run workflow" button

### Viewing Backups

1. Go to any workflow run
2. Scroll to "Artifacts" section
3. Download `db-backup-YYYYMMDD_HHMMSS`

### Restoring from Backup

```bash
# 1. Download the backup artifact from GitHub Actions

# 2. Run the restore script
cd api/scripts
./restore-from-backup.sh \
  --artifact db-backup-20250711_110000 \
  --key 'your-encryption-key' \
  --env staging \
  --db both

# For production restore (requires explicit confirmation)
./restore-from-backup.sh \
  --artifact db-backup-20250711_110000 \
  --key 'your-encryption-key' \
  --env production \
  --db api
```

## Backup Contents

Each backup contains:

1. **API Database** (`api_mirubato-prod_full_*.sql.enc`)
   - Users table
   - Sync data
   - Practice sessions
   - All related tables

2. **Scores Database** (`scores_mirubato-scores-production_full_*.sql.enc`)
   - Scores metadata
   - Composers
   - Collections
   - User scores

3. **Metadata** (`backup_metadata_*.json`)
   - Timestamp
   - Environment
   - Table counts
   - File references

## Encryption Details

- **Algorithm**: AES-256-CBC
- **Key Derivation**: PBKDF2
- **Implementation**: OpenSSL
- **Key Storage**: GitHub Secrets (never in code)

### Decryption Example

```bash
# Decrypt a backup file manually
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in backup.sql.enc \
  -out backup.sql \
  -k "your-encryption-key"
```

## Time Travel Alternative

Cloudflare D1 provides built-in Time Travel for production databases:

- **30-day history**: Can restore to any minute in the past 30 days
- **No cost**: Included with D1
- **Always on**: No configuration needed

This backup system complements Time Travel by:

- Providing longer retention (if needed)
- Enabling cross-environment restores
- Allowing offline backup storage
- Supporting compliance requirements

## Monitoring

### Success Indicators

- Workflow completes with green checkmark
- Artifacts appear in workflow run
- No issues created

### Failure Handling

- Automatic GitHub issue creation on failure
- Issue includes workflow run link
- Tagged with `backup`, `automated`, `urgent`

## Best Practices

1. **Test Restores**: Periodically test the restore process
2. **Rotate Encryption Keys**: Change keys quarterly
3. **Monitor Storage**: Check artifact sizes
4. **Verify Counts**: Ensure table counts are reasonable
5. **Document Changes**: Update this doc when modifying the system

## Limitations

- **7-day retention**: GitHub Artifacts expire after 7 days (configurable)
- **Size limits**: GitHub has artifact size limits (varies by plan)
- **Manual download**: Restore requires manual artifact download
- **No incremental**: Full backups only (by design for simplicity)

## Future Enhancements

1. **R2 Storage**: Direct upload to Cloudflare R2 for longer retention
2. **Incremental Backups**: Only backup changes since last run
3. **Automated Testing**: Weekly restore tests
4. **Slack Notifications**: Alert on success/failure
5. **Multi-Region**: Store backups in multiple regions

## Troubleshooting

### Backup Fails

1. Check GitHub Actions logs (all sensitive data suppressed)
2. Verify secrets are set correctly
3. Ensure Cloudflare API token has correct permissions
4. Check if database names have changed

### Restore Fails

1. Verify encryption key is correct
2. Check file permissions
3. Ensure Wrangler is authenticated
4. Verify target database exists

### Encryption Issues

- Wrong key: "bad decrypt" error
- Corrupted file: Check artifact download
- Wrong algorithm: Ensure using `-pbkdf2` flag

## Support

For issues or questions:

1. Check workflow logs
2. Review this documentation
3. Create an issue with `backup` tag
