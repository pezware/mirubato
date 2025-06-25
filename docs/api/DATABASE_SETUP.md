# API Service Database Setup

## Overview

The API service uses Cloudflare D1 (SQLite) databases for data persistence. The service supports local development, staging, and production environments with proper migration support.

## Database Configuration

### Production Database

- **Name**: mirubato-prod
- **ID**: 31ecc854-aecf-4994-8bda-7a9cd3055122
- **Binding**: DB

### Development/Staging Database

- **Name**: mirubato-dev
- **ID**: 4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e
- **Binding**: DB

### Local Development Database

- **Name**: mirubato-dev
- **ID**: `local-db` (placeholder - wrangler manages the actual file)
- **Binding**: DB

## Local Development Setup

### Configuration (wrangler.toml)

For local development, use a placeholder database_id:

```toml
[[env.local.d1_databases]]
binding = "DB"
database_name = "mirubato-dev"
database_id = "local-db"  # Placeholder - wrangler manages the actual file
```

### Database Reset Procedure

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

### Automated Reset Script

Use the provided script for a clean reset:

```bash
cd /Users/arbeitandy/src/public/mirubato/api
./scripts/reset-local-db.sh
```

## Database Schema

The API uses the following migrations:

1. `0001_initial_schema.sql` - Creates users, sync_data, and sync_metadata tables
2. `0002_add_backend_compatibility.sql` - Adds backend compatibility tables  
3. `0003_add_user_tracking_fields.sql` - Adds user tracking fields

### Key Tables

- **users**: User accounts and authentication data
- **sync_data**: Generic storage for synced entities (JSON blobs)
- **sync_metadata**: Sync tracking information per user

## Important Notes

1. **Local data is persistent** - Data persists between `wrangler dev` sessions unless you explicitly clear it
2. **Separate environments** - Local development database is completely separate from staging/production
3. **Migrations are idempotent** - It's safe to run migrations multiple times
4. **No KV Storage Needed** - API service uses stateless JWT tokens, no KV required

## Deployment

The databases are already created and configured in Cloudflare. When deploying the API service:

1. The production deployment will automatically use the production database
2. The staging deployment will use the development database
3. Local development will also use the development database

## Troubleshooting

If you encounter database binding errors during deployment:

1. Verify the database IDs match those in your Cloudflare account
2. Ensure your account has access to these databases
3. Check that the database names haven't been changed in Cloudflare

## Future Considerations

When the API service fully replaces the backend service:

1. The backend service can be decommissioned
2. The databases will remain unchanged
3. Consider renaming databases for clarity (e.g., mirubato-api-prod instead of mirubato-prod)
