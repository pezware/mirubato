# API Domain Migration Guide

## Overview

The new REST API service domain has been changed from `api.mirubato.com` to `apiv2.mirubato.com` to avoid conflicts with the existing GraphQL backend.

## Domain Changes

| Environment | Old Domain               | New Domain                 |
| ----------- | ------------------------ | -------------------------- |
| Production  | api.mirubato.com         | apiv2.mirubato.com         |
| Staging     | api-staging.mirubato.com | apiv2-staging.mirubato.com |

## Required Steps After Deployment

### 1. DNS Configuration

Add the following DNS records in Cloudflare:

- `apiv2.mirubato.com` - CNAME pointing to your Cloudflare Worker
- `apiv2-staging.mirubato.com` - CNAME pointing to your staging Worker

### 2. Frontend Configuration

When integrating the API with the frontend, update the API base URL:

```typescript
// Old
const API_BASE_URL = 'https://api.mirubato.com'

// New
const API_BASE_URL = 'https://apiv2.mirubato.com'
```

### 3. CORS Headers

The frontend `_headers` file has been updated to include both domains during the transition period:

- `https://api.mirubato.com` (old GraphQL backend)
- `https://apiv2.mirubato.com` (new REST API)

## Migration Timeline

1. **Phase 1**: Deploy new API to `apiv2.mirubato.com`
2. **Phase 2**: Update frontend to use new API
3. **Phase 3**: Once stable, the old GraphQL backend at `api.mirubato.com` can be deprecated

## Testing

After deployment, test the API endpoints:

```bash
# Health check
curl https://apiv2.mirubato.com/health

# API documentation
open https://apiv2.mirubato.com/docs
```

## Notes

- The old GraphQL backend remains accessible at `api.mirubato.com`
- Both services can run in parallel during the migration
- No immediate changes required to the existing GraphQL backend
