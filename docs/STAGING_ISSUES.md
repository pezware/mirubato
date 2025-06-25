# Staging Environment Issues and Fixes

## Issues Found

### 1. Authentication 401 Errors (CRITICAL - NOT YET FIXED)

**Problem**: The staging environment is missing JWT_SECRET and MAGIC_LINK_SECRET environment variables.

**Fix Required**: Add the following secrets to the staging environment:

```bash
# From Cloudflare Dashboard or wrangler CLI:
cd api
wrangler secret put JWT_SECRET --env staging
wrangler secret put MAGIC_LINK_SECRET --env staging
```

**Note**: You need to generate secure secrets for these values. Example:

```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Generate a secure magic link secret
openssl rand -base64 32
```

### 2. CSS MIME Type Error (✅ FIXED)

**Problem**: CSS files served without proper Content-Type headers causing strict MIME type checking to fail.

**Fix**: Updated `/frontendv2/src/index.js` to set proper Content-Type headers based on file extensions.

### 3. 500 Error on /api/sync/push (DEPENDS ON #1)

**Possible Causes**:

1. Missing JWT secrets preventing authentication (most likely cause)
2. Database permissions or schema issues
3. The sync_data table schema looks correct, so likely auth-related

**Fix**: Once JWT secrets are added (see issue #1), this should resolve. If not, check:

- Database permissions for the staging D1 instance
- Ensure migrations have been run on staging database

### 4. Cross-Origin-Opener-Policy (COOP) Warnings (✅ FIXED)

**Problem**: Google OAuth window.postMessage calls being blocked by COOP policy.

**Fix**: Added `Cross-Origin-Opener-Policy: same-origin-allow-popups` header in `/api/src/index.ts`

## Deployment Steps

1. **Add Secrets to Staging** (CRITICAL):

   ```bash
   cd api
   wrangler secret put JWT_SECRET --env staging
   wrangler secret put MAGIC_LINK_SECRET --env staging
   ```

2. **Deploy Frontend with MIME Type Fix**:

   ```bash
   cd frontendv2
   wrangler deploy --env staging
   ```

3. **Deploy API** (after adding secrets):
   ```bash
   cd api
   wrangler deploy --env staging
   ```

## Verification

After deployment, verify:

1. CSS loads correctly (check Network tab)
2. Authentication works (test login)
3. Sync endpoints return 200 status
4. No COOP warnings in console
