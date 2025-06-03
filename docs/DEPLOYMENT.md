# Deployment Guide

This guide explains how to deploy Mirubato to different environments using Cloudflare Workers.

## Environment-Based Configuration

We use `wrangler.toml` files that define all environments. No manual configuration generation is needed.

### Available Environments

1. **Local Development** (default)

   - Uses placeholder IDs for D1 and KV namespaces
   - Runs on `localhost:8787` (backend) and `localhost:3000` (frontend)

2. **Development/Preview** (`--env dev`)

   - Deploys to Cloudflare with dev database and KV namespaces
   - Accessible at `*.workers.dev` domains

3. **Staging** (`--env staging`)

   - Uses staging database and KV namespaces
   - For testing before production

4. **Production** (`--env production`)
   - Uses production database and KV namespaces
   - Deployed to custom domains (mirubato.com, api.mirubato.com)

## Local Development

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## Deployment Commands

### Backend Deployment

```bash
cd backend

# Deploy to development environment
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

### Frontend Deployment

```bash
cd frontend

# Build the frontend first
npm run build

# Deploy to development environment
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Cloudflare Build Integration

For automatic deployments via Cloudflare's GitHub integration:

1. **Build Command**: `npm run build`
2. **Deploy Command**: `npm run deploy:version` (for version uploads)
3. **Root Directory**: `/backend` or `/frontend` (depending on which app)

## Environment Variables and Secrets

### Setting Secrets

Secrets must be set per environment:

```bash
# Set JWT secret for production
wrangler secret put JWT_SECRET --env production

# Set email API key for production
wrangler secret put RESEND_API_KEY --env production
```

### Local Development Secrets

Create `.dev.vars` file in the backend directory:

```
JWT_SECRET=your-local-jwt-secret
RESEND_API_KEY=your-local-api-key
```

For environment-specific local secrets, create `.dev.vars.<environment>`:

- `.dev.vars.dev`
- `.dev.vars.staging`

## Database Migrations

```bash
# Apply migrations to local database
cd backend
wrangler d1 migrations apply DB --local

# Apply to dev environment
wrangler d1 migrations apply DB --env dev --remote

# Apply to staging
wrangler d1 migrations apply DB --env staging --remote

# Apply to production
wrangler d1 migrations apply DB --env production --remote
```

## Troubleshooting

### Build Loops

The `wrangler.toml` configuration properly handles different build commands per environment:

- Local/dev uses `npm run build:dev` (skips version generation)
- Staging/production uses `npm run build` (includes version generation)

### Environment Detection

The backend automatically detects its environment from the `ENVIRONMENT` variable set in `wrangler.toml`.

### CORS Issues

Each environment has its own CORS configuration defined in the backend code based on the `ENVIRONMENT` variable.

## Best Practices

1. **Always test in staging** before deploying to production
2. **Use version uploads** for production deployments to enable rollbacks
3. **Set secrets per environment** - never commit secrets to the repository
4. **Monitor deployments** via the Cloudflare dashboard

## Rollback Procedure

If a deployment causes issues:

```bash
# List available versions
wrangler versions list --env production

# Deploy a previous version
wrangler versions deploy <version-id> --env production
```
