# Domain Configuration Guide

**Note: This guide has been updated to use the new Unified Configuration System**

## Quick Start - Unified Configuration (Recommended)

If you're deploying Mirubato to a different domain (e.g., `newrubato.com` instead of `mirubato.com`):

1. **Edit the unified configuration file**: `config/environments.json`

   ```json
   {
     "MYDOMAIN": "newrubato.com",
     "MYTEAM": "youraccount",
     ...
   }
   ```

2. **Generate configuration files**:

   ```bash
   # Generate wrangler.json files for production
   node scripts/generate-wrangler-config.js both production

   # Generate .env files for production
   node scripts/generate-env-files.js both production
   ```

3. **Deploy to Cloudflare**:

   ```bash
   # Deploy backend
   cd backend && wrangler deploy

   # Deploy frontend
   cd frontend && wrangler deploy
   ```

For detailed information, see [UNIFIED_CONFIGURATION.md](./UNIFIED_CONFIGURATION.md)

## Manual Configuration

If you prefer to update files manually, you need to update the following:

### 1. Backend CORS Configuration

**File**: `backend/src/config/cors.ts`

Update the production domains:

```typescript
production: {
  domains: [
    'https://newrubato.com',
    'https://www.newrubato.com'
  ],
  // Also update the worker patterns if using different Cloudflare account
  patterns: [
    'https://newrubato.youraccount.workers.dev',
    'https://*-newrubato.youraccount.workers.dev',
    // ... other patterns
  ]
}
```

### 2. Frontend Endpoint Configuration

**File**: `frontend/src/config/endpoints.ts`

Update the production domain detection:

```typescript
// Production domains
if (hostname === 'newrubato.com' || hostname === 'www.newrubato.com') {
  return {
    graphql: 'https://api.newrubato.com/graphql',
    health: 'https://api.newrubato.com/health',
  }
}
```

### 3. Email Templates (if using email features)

**File**: `backend/src/services/email.ts`

Update the APP_URL:

```typescript
const APP_URL = 'https://newrubato.com'
```

### 4. Cloudflare Configuration

Update your Cloudflare Workers configuration:

- Set up custom domains in Cloudflare dashboard
- Update DNS records to point to your Workers
- Configure SSL certificates

## Environment-Based Configuration (Recommended)

For a more flexible approach, consider using environment variables:

### Backend

Set these in your Cloudflare Worker environment:

```
FRONTEND_DOMAIN=https://newrubato.com
API_DOMAIN=https://api.newrubato.com
```

### Frontend

Set during build time:

```
VITE_API_DOMAIN=https://api.newrubato.com
VITE_APP_DOMAIN=https://newrubato.com
```

## Verification Checklist

After updating domains:

- [ ] Backend CORS allows requests from new frontend domain
- [ ] Frontend connects to correct API domain
- [ ] Email links point to correct frontend domain
- [ ] SSL certificates are properly configured
- [ ] Preview deployments still work correctly

## Common Issues

1. **CORS Errors**: Make sure backend `cors.ts` includes your new domain
2. **API Connection Failed**: Verify frontend `endpoints.ts` points to correct API
3. **Email Links Broken**: Update `APP_URL` in email service
4. **SSL Errors**: Ensure Cloudflare SSL mode is set to "Full (strict)"
