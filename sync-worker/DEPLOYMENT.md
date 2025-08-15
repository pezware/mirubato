# Sync Worker Deployment Guide

## Overview

The Mirubato Sync Worker provides WebSocket-based real-time synchronization using Cloudflare Workers and Durable Objects. This guide covers deployment configuration and required secrets.

## Environment Configuration

### Required Secrets

**CRITICAL**: These secrets MUST be identical to the API service for authentication to work.

```bash
# JWT Secret (MUST match API service exactly)
wrangler secret put JWT_SECRET --env staging
wrangler secret put JWT_SECRET --env production

# Magic Link Secret (MUST match API service exactly)
wrangler secret put MAGIC_LINK_SECRET --env staging
wrangler secret put MAGIC_LINK_SECRET --env production
```

**How to get the correct values:**

1. Use the same values that are set in the API service
2. Or copy from another team member who has access
3. These are shared secrets across all Mirubato services

**Verification:**

```bash
# Check that API service has these secrets
cd ../api && wrangler secret list --env production
# Should show: JWT_SECRET, MAGIC_LINK_SECRET, GOOGLE_CLIENT_SECRET, RESEND_API_KEY
```

### Environment Variables

Configured in `wrangler.toml`:

| Variable       | Local                              | Staging                          | Production               |
| -------------- | ---------------------------------- | -------------------------------- | ------------------------ |
| `ENVIRONMENT`  | local                              | staging                          | production               |
| `API_URL`      | http://api-mirubato.localhost:9797 | https://api-staging.mirubato.com | https://api.mirubato.com |
| `FRONTEND_URL` | http://www-mirubato.localhost:4000 | https://staging.mirubato.com     | https://mirubato.com     |

### Database Bindings

- **Local**: Uses local D1 instance (auto-managed by wrangler)
- **Staging**: `mirubato-dev` (ID: 4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e)
- **Production**: `mirubato-prod` (ID: 31ecc854-aecf-4994-8bda-7a9cd3055122)

### Rate Limiting

- **Local**: 1000 requests/minute per user
- **Staging/Production**: 100 requests/minute per user

## Deployment Commands

```bash
# Local development
pnpm run dev

# Deploy to staging
pnpm run deploy:staging

# Deploy to production
pnpm run deploy:production
```

## Custom Domains

Configure these domains in Cloudflare Dashboard:

- **Staging**: `sync-staging.mirubato.com`
- **Production**: `sync.mirubato.com`

## Durable Objects Migration

The sync worker uses Durable Objects for user session coordination:

```toml
[[migrations]]
tag = "v1"
new_classes = ["SyncCoordinator"]
```

This migration is applied automatically on first deployment.

## Monitoring & Logs

### Real-time Logs

```bash
# View staging logs
wrangler tail --env staging

# View production logs
wrangler tail --env production

# Filter for errors
wrangler tail --env production --search "error"
```

### Health Check Endpoints

- Staging: `https://sync-staging.mirubato.com/health`
- Production: `https://sync.mirubato.com/health`

## Security Considerations

1. **JWT Validation**: All WebSocket connections require valid JWT tokens
2. **User Isolation**: Each user gets their own Durable Object instance
3. **Rate Limiting**: Configured per environment to prevent abuse
4. **CORS**: Limited to Mirubato frontend domains only

## Cost Optimization

- **WebSocket Hibernation**: Automatically hibernates idle connections (95% cost reduction)
- **Durable Objects**: Per-user isolation prevents resource contention
- **Rate Limiting**: Prevents abuse and excessive costs

## Troubleshooting

### Connection Issues

1. Verify JWT secret matches API service
2. Check custom domain configuration
3. Verify D1 database bindings
4. Check rate limiting configuration

### Deployment Issues

1. Ensure all secrets are set
2. Verify database IDs are correct
3. Check Durable Objects migration status
4. Verify custom domains are properly configured

## Required DNS Configuration

Add these CNAME records in Cloudflare DNS:

```
sync-staging.mirubato.com → mirubato-sync-worker-staging.workers.dev
sync.mirubato.com → mirubato-sync-worker.workers.dev
```

Then enable custom domains in the Workers dashboard.

## Pre-Deployment Checklist

Before deploying the sync-worker:

- [ ] **Copy JWT_SECRET from API service** (CRITICAL - auth will fail if different)
- [ ] **Copy MAGIC_LINK_SECRET from API service** (CRITICAL - auth will fail if different)
- [ ] Verify account_id is set correctly (1362434665780520e89f9f06b1057d24)
- [ ] Confirm database IDs match existing services
- [ ] Set up custom domains in Cloudflare dashboard
- [ ] Test locally first with `pnpm run dev`

## Post-Deployment Verification

After deployment:

- [x] Check health endpoint: `https://sync.mirubato.com/health` ✅ Working
- [x] Check staging health endpoint: `https://sync-staging.mirubato.com/health` ✅ Working
- [ ] Test WebSocket connection from frontend debug tab
- [ ] Verify JWT authentication works
- [ ] Check logs for any errors: `wrangler tail --env production`
- [ ] Monitor Durable Objects usage in dashboard

## Deployment Status

### ✅ Successfully Deployed

- **Staging**: `https://sync-staging.mirubato.com` (Version: de0d337e-aafd-4977-96ac-dc0e0968d64a)
- **Production**: `https://sync.mirubato.com` (Version: aa44b6e7-f3cb-4e49-8e3c-e4df66effa3e)

### ✅ Development Environment

- **Local dev server**: `pnpm run dev` runs successfully on `http://localhost:8787`
- **TypeScript compilation**: Fixed by removing build command (wrangler handles it natively)
- **Dependencies**: No local node_modules needed (uses workspace dependencies)
