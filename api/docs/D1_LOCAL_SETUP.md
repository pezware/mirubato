# D1 Local Database Setup Guide

## Overview

This guide explains how to properly set up and manage D1 databases for local development in the API service.

## The Issue

When using D1 databases locally with Wrangler, there are several challenges:

1. Wrangler creates unique database file IDs for each session
2. Migrations might apply to one database file while wrangler uses another
3. The `database_id` in wrangler.toml is meant for remote databases, not local

## Best Practices

### 1. Configuration (wrangler.toml)

For local development, use a placeholder database_id:

```toml
[[env.local.d1_databases]]
binding = "DB"
database_name = "mirubato-dev"
database_id = "local-db"  # Placeholder - wrangler manages the actual file
```

### 2. Database Reset Procedure

When you encounter "no such table" errors, follow these steps:

```bash
# 1. Stop any running wrangler processes
pkill -f "wrangler dev" || true

# 2. Remove existing D1 state
cd /Users/arbeitandy/src/public/mirubato/api
rm -rf .wrangler/state/v3/d1/

# 3. Start wrangler briefly to create the database
npm run dev
# Press Ctrl+C after it says "Ready on http://localhost:8787"

# 4. Run migrations
npm run db:migrate

# 5. Start the dev server
npm run dev
```

### 3. Automated Reset Script

Use the provided script for a clean reset:

```bash
cd /Users/arbeitandy/src/public/mirubato/api
./scripts/reset-local-db.sh
```

## Key Commands

- **Start dev server**: `npm run dev`
- **Run migrations**: `npm run db:migrate`
- **Check tables**: `npx wrangler d1 execute DB --local --env local --command "SELECT name FROM sqlite_master WHERE type='table';"`

## Troubleshooting

### "No such table" errors

This usually means migrations haven't been applied to the current database file. Run the reset procedure above.

### Multiple database files

If you see multiple `.sqlite` files in `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`, wrangler might be confused about which to use. Clear the directory and start fresh.

### Migrations say "No migrations to apply"

This might mean wrangler is looking at a different database than the one being used. Clear the D1 state and run migrations again.

## Important Notes

1. **Local data is persistent** - Data persists between `wrangler dev` sessions unless you explicitly clear it
2. **Separate from remote** - Local development database is completely separate from staging/production
3. **Migrations are idempotent** - It's safe to run migrations multiple times

## Current Migration Status

The API has the following migrations:

1. `0001_initial_schema.sql` - Creates users, sync_data, and sync_metadata tables
2. `0002_add_backend_compatibility.sql` - Adds backend compatibility tables
3. `0003_add_user_tracking_fields.sql` - Adds user tracking fields

All migrations should be applied for the magic link authentication to work properly.
