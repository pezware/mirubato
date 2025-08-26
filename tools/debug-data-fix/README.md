# Mirubato Debug & Data Fix CLI Tool

A comprehensive CLI tool for safely investigating and fixing data integrity issues in Mirubato, including duplicate entries, score ID format mismatches, and orphaned records.

## 🎯 Purpose

This tool addresses critical data issues discovered in Mirubato:

1. **Score ID Format Discrepancy**: Migration from `-` to `||` delimiter causing mismatches
2. **Duplicate Entries**: Multiple sources creating duplicate logbook entries and repertoire items
3. **Orphaned Records**: References to non-existent entities
4. **Data Integrity**: Checksum mismatches and JSON parsing errors

## ⚠️ Safety Features

- **Human-in-the-Loop**: Every modification requires explicit confirmation
- **Dry Run Mode**: Preview all changes before execution (default)
- **Environment Protection**: Multiple confirmations for production
- **Automatic Backups**: Creates snapshots before modifications
- **Transaction Support**: Rollback capability for all changes
- **Audit Trail**: Comprehensive logging of all operations
- **Admin Token Authentication**: Special tokens with limited scope for data maintenance
- **No User Token Access**: Tool cannot access individual user authentication tokens
- **Direct Database Access**: Uses wrangler D1 commands for database operations

## 🚀 Quick Start

### Installation

```bash
cd tools/debug-data-fix
pnpm install
```

### Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Configure environment variables:

```env
# API URLs
API_URL_STAGING=https://api-staging.mirubato.com
API_URL_PRODUCTION=https://api.mirubato.com

# Admin API tokens (request from system administrator)
# These tokens have limited permissions for data maintenance only
API_TOKEN_STAGING=your-admin-staging-token
API_TOKEN_PRODUCTION=your-admin-production-token

# Database IDs (already configured from wrangler.toml)
D1_DATABASE_ID_STAGING=4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e
D1_DATABASE_ID_PRODUCTION=31ecc854-aecf-4994-8bda-7a9cd3055122
```

3. Request admin API tokens:
   - Contact your system administrator
   - Tokens should have limited scope for data maintenance only
   - Never share these tokens or commit them to version control

## 📖 Commands

### Validate Data

Check data integrity without making changes:

```bash
# Validate all data for a user
pnpm run validate --env=staging --user=<userId>

# Validate specific issues
pnpm run validate --env=staging --user=<userId> --scope=duplicates
pnpm run validate --env=staging --user=<userId> --scope=scoreIds
pnpm run validate --env=staging --user=<userId> --scope=orphans
```

### Investigate Issues

Deep dive into specific problems:

```bash
# Find duplicates
pnpm run investigate duplicates --env=staging --user=<userId>

# Analyze score ID formats
pnpm run investigate score-ids --env=staging

# Find orphaned records
pnpm run investigate orphans --env=staging --user=<userId>

# User statistics
pnpm run investigate user --env=staging --user=<userId>

# Save results to file
pnpm run investigate duplicates --env=staging --user=<userId> --output=results.json
```

### Fix Issues

Apply fixes with confirmation:

```bash
# Fix duplicates (interactive mode)
pnpm run fix duplicates --env=staging --user=<userId> --dry-run

# Fix score ID formats
pnpm run fix score-ids --env=staging --user=<userId> --batch-size=5

# Fix orphaned records
pnpm run fix orphans --env=staging --user=<userId> --interactive

# Run in live mode (after testing with dry-run)
pnpm run fix duplicates --env=staging --user=<userId> --no-dry-run
```

### Rollback Changes

Undo previous operations:

```bash
# List available rollback points
pnpm run rollback --list

# Rollback specific transaction
pnpm run rollback tx_abc123def456

# Restore from backup
pnpm run rollback staging_sync_data_2024-01-15
```

### Other Commands

```bash
# View database statistics
pnpm run cli stats --env=staging --user=<userId>

# Manage backups
pnpm run cli backup --list
pnpm run cli backup --cleanup

# Get help
pnpm run cli --help
pnpm run cli validate --help
```

## 🔍 Detection Strategies

### Duplicate Detection

1. **Content Signature**: Same date, duration, pieces, instrument
2. **Time Window**: Entries within 2 minutes with same pieces
3. **Score-based**: Same score practiced within 30 minutes
4. **Checksum**: Identical checksums in sync_data

### Score ID Issues

1. **Format Mismatch**: Old format (`title-composer`) vs new (`title||composer`)
2. **Dash Problems**: Pieces with dashes needing special delimiter
3. **Variations**: Multiple representations of same piece
4. **Case Sensitivity**: Inconsistent capitalization

### Orphaned Records

1. **Missing Scores**: Logbook entries referencing non-existent scores
2. **Deleted References**: Repertoire items with deleted score IDs
3. **Invalid Foreign Keys**: Broken relationships between entities

## 🛡️ Safety Workflow

### Production Fixes

1. **Test on Staging First**: Always validate fixes on staging
2. **Dry Run**: Review all changes without applying them
3. **Create Backup**: Automatic backup before modifications
4. **Confirm Environment**: Multiple confirmations for production
5. **Review Each Change**: Interactive mode for sensitive data
6. **Monitor Logs**: Check audit trail after operations

### Example Safe Workflow

```bash
# 1. Investigate on staging
pnpm run investigate duplicates --env=staging --user=test-user

# 2. Dry run to preview changes
pnpm run fix duplicates --env=staging --user=test-user --dry-run

# 3. Apply fix on staging
pnpm run fix duplicates --env=staging --user=test-user --no-dry-run

# 4. Validate results
pnpm run validate --env=staging --user=test-user

# 5. If successful, repeat on production with extra care
pnpm run fix duplicates --env=production --user=real-user --interactive
```

## 📊 Output Examples

### Validation Report

```
📊 Duplicate Detection Report
==================================================
Total duplicates found: 15

Confidence Breakdown:
  High (≥90%): 10
  Medium (70-89%): 3
  Low (<70%): 2

Reasons for Duplicates:
  • Identical content signature: 8
  • Near-identical timestamp and pieces: 5
  • Same score within 30 minutes: 2
```

### Score ID Report

```
🆔 Score ID Format Report
==================================================
Total mismatches found: 7

Legacy Format → New Format:
  moonlight sonata-beethoven → moonlight sonata||beethoven
    Affects 12 entries, 1 repertoire item

  op. 36 no. 1 - movement 1-clementi → op. 36 no. 1 - movement 1||clementi
    Affects 5 entries, 1 repertoire item
```

## 🔧 Architecture

```
tools/debug-data-fix/
├── src/
│   ├── commands/       # CLI command implementations
│   ├── services/       # Data access layers
│   ├── detectors/      # Issue detection logic
│   ├── fixers/         # Fix implementation
│   ├── utils/          # Safety, logging, config
│   └── types/          # TypeScript definitions
├── backups/           # Automatic backups
├── logs/              # Operation logs
└── README.md
```

## ⚙️ Configuration

### Environment Variables

- `DEFAULT_DRY_RUN`: Enable dry-run by default (true)
- `REQUIRE_PRODUCTION_CONFIRMATION`: Require extra confirmation for production (true)
- `MAX_BATCH_SIZE`: Maximum items to process per batch (10)
- `KEEP_BACKUPS_DAYS`: Days to keep backups (30)
- `LOG_LEVEL`: Logging verbosity (info/debug/warn/error)

## 📝 Logging

All operations are logged to:

- Console output with color coding
- `logs/debug-data-fix.log`: JSON structured logs
- `logs/debug-data-fix-audit.log`: Audit trail with before/after snapshots

## 🔐 Security Notes

### Admin API Token

The debug tool uses a special admin API token for data maintenance operations:

1. **Limited Scope**: Token should only have permissions for:
   - Reading user data for validation
   - Fixing duplicates and score IDs
   - Creating backups
   - NO ability to authenticate as users
   - NO access to sensitive user data like passwords

2. **Token Generation**: Admin tokens should be:
   - Generated by system administrators only
   - Time-limited (expire after maintenance window)
   - IP-restricted if possible
   - Logged for audit purposes

3. **Never Use User Tokens**: This tool does NOT:
   - Access user JWT tokens from localStorage
   - Impersonate users
   - Access user sessions

### Database Access

- Direct D1 access via `wrangler` CLI for read operations
- Write operations go through API with admin token validation
- All database operations are logged

## 🚨 Troubleshooting

### Common Issues

1. **"User ID required"**: Specify `--user <userId>` or tool will prompt
2. **"No environment selected"**: Use `--env staging` or `--env production`
3. **"Database connection failed"**: Check D1_DATABASE_ID in .env
4. **"Permission denied"**: Ensure AUTH_TOKEN is valid

### Recovery

If something goes wrong:

1. Check transaction ID in logs
2. Use `rollback` command with transaction ID
3. Restore from automatic backup if needed
4. Check audit log for exact changes made

## 🤝 Contributing

When adding new detection or fix strategies:

1. Add detector in `src/detectors/`
2. Add fixer in `src/fixers/`
3. Update command in `src/commands/`
4. Add tests
5. Document new strategies in README

## 📄 License

MIT - Part of the Mirubato project
