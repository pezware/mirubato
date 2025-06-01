# Unified Configuration Guide

This project uses a unified configuration system that eliminates hardcoded domain names and centralizes all environment-specific settings.

## Overview

All configuration is managed through a single file: `config/environments.json`

This file contains:

- Your domain name (MYDOMAIN)
- Your Cloudflare team/account name (MYTEAM)
- Environment-specific settings for local, preview, staging, and production
- Database and KV namespace configurations
- Worker names and API paths

## Quick Setup for New Domain

To deploy Mirubato to your own domain:

1. **Edit `config/environments.json`**:

   ```json
   {
     "MYDOMAIN": "yourdomain.com",
     "MYTEAM": "yourteam",
     ...
   }
   ```

2. **Generate configuration files**:

   ```bash
   # Generate wrangler.json files
   node scripts/generate-wrangler-config.js both production

   # Generate .env files
   node scripts/generate-env-files.js both production
   ```

3. **Deploy to Cloudflare**:

   ```bash
   # Deploy backend
   cd backend && wrangler deploy

   # Deploy frontend
   cd frontend && wrangler deploy
   ```

## Environment Details

### Local Development

- Frontend: http://localhost:3000
- Backend: http://localhost:8787
- Database: mirubato-dev (local D1 instance)

### Preview Deployments

- Frontend: https://\*-mirubato.{MYTEAM}.workers.dev
- Backend: https://\*-mirubato-backend.{MYTEAM}.workers.dev
- Database: mirubato-dev (shared development database)

### Staging

- Frontend: https://mirubato.{MYTEAM}.workers.dev
- Backend: https://mirubato-backend.{MYTEAM}.workers.dev
- Database: mirubato-staging (separate staging database)

### Production

- Frontend: https://{MYDOMAIN}, https://www.{MYDOMAIN}
- Backend: https://api.{MYDOMAIN}
- Database: mirubato-prod (production database)

## Configuration Structure

### Core Settings

```json
{
  "MYDOMAIN": "mirubato.com", // Your primary domain
  "MYTEAM": "arbeitandy" // Your Cloudflare account name
}
```

### Environment Configuration

Each environment has:

- `frontend`: URL configuration for the frontend
- `backend`: URL configuration for the backend API
- `database`: D1 database settings
- `kv`: KV namespace settings (for magic links, etc.)
- `environment`: Environment name (development/staging/production)

### API Configuration

```json
"api": {
  "graphqlPath": "/graphql",
  "healthPath": "/health",
  "debugPath": "/debug/cors"
}
```

## Database and KV Namespaces

### Development

- Database: `mirubato-dev` - Shared for local and preview deployments
- KV: `local-magic-links` - For magic link storage

### Staging

- Database: `mirubato-staging` - Separate staging database
- KV: `staging-magic-links` - Staging magic links

### Production

- Database: `mirubato-prod` - Production database
- KV: `production-magic-links` - Production magic links

## Scripts

### `generate-wrangler-config.js`

Generates wrangler.json files from the unified configuration:

```bash
# Generate for specific environment
node scripts/generate-wrangler-config.js backend production
node scripts/generate-wrangler-config.js frontend staging
node scripts/generate-wrangler-config.js both preview
```

### `generate-env-files.js`

Generates .env files for different environments:

```bash
# Generate for specific environment
node scripts/generate-env-files.js frontend production
node scripts/generate-env-files.js backend local
node scripts/generate-env-files.js both staging
```

## Code Usage

The unified configuration is available in both frontend and backend code:

```typescript
import {
  getConfig,
  getGraphQLEndpoint,
} from '@mirubato/shared/config/environment'

// Get current configuration
const config = getConfig()

// Get GraphQL endpoint for current environment
const endpoint = getGraphQLEndpoint()

// Check CORS
import { isOriginAllowed } from '@mirubato/shared/config/environment'
const allowed = isOriginAllowed(origin)
```

## Adding New Environments

To add a new environment:

1. Add it to `config/environments.json`:

   ```json
   "environments": {
     "mynewenv": {
       "name": "My New Environment",
       "frontend": { ... },
       "backend": { ... },
       "database": { ... },
       "kv": { ... }
     }
   }
   ```

2. Generate configs:
   ```bash
   node scripts/generate-wrangler-config.js both mynewenv
   node scripts/generate-env-files.js both mynewenv
   ```

## Best Practices

1. **Never hardcode domains**: Always use the configuration system
2. **Use environment detection**: Let the system detect the environment automatically
3. **Keep secrets secure**: Never commit API keys or secrets to the repository
4. **Test configuration changes**: Always test in preview before production
5. **Document database IDs**: Keep track of your D1 database and KV namespace IDs

## Migration from Old System

If you're migrating from the old hardcoded system:

1. Search for hardcoded domains:

   ```bash
   grep -r "mirubato.com" --include="*.ts" --include="*.tsx" --include="*.js"
   ```

2. Replace with configuration:

   ```typescript
   // Old
   const url = 'https://api.mirubato.com/graphql'

   // New
   import { getGraphQLEndpoint } from '@mirubato/shared/config/environment'
   const url = getGraphQLEndpoint()
   ```

3. Remove old configuration files:
   - Individual .env files for each environment
   - Hardcoded wrangler.toml files
   - Old domain configuration scripts
