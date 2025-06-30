# Google OAuth Setup Guide for Production

## Overview

This guide walks you through setting up Google OAuth 2.0 for the Mirubato API service. The API uses Google's OAuth for authentication alongside magic links.

## Prerequisites

- Access to Google Cloud Console
- A Google Cloud project (or create a new one)
- Domain verification for mirubato.com

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **+ CREATE CREDENTIALS** > **OAuth client ID**

## Step 2: Configure OAuth Consent Screen

If you haven't configured the OAuth consent screen yet:

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have Google Workspace)
3. Fill in the required information:
   - **App name**: Mirubato
   - **User support email**: Your support email
   - **Developer contact**: Your contact email
   - **Authorized domains**: Add `mirubato.com`
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Save and continue

## Step 3: Create OAuth Client ID

1. Return to **Credentials** > **+ CREATE CREDENTIALS** > **OAuth client ID**
2. Select **Web application** as the application type
3. Configure the client:
   - **Name**: Mirubato Production (or similar)
   - **Authorized JavaScript origins**:
     ```
     https://mirubato.com
     https://www.mirubato.com
     https://apiv2.mirubato.com
     ```
   - **Authorized redirect URIs**:
     ```
     https://mirubato.com/auth/google/callback
     https://www.mirubato.com/auth/google/callback
     https://apiv2.mirubato.com/api/auth/google/callback
     ```
4. Click **CREATE**
5. Save the **Client ID** and **Client Secret**

## Step 4: Configure Cloudflare Environment Variables

### Option A: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account > **Workers & Pages**
3. Find `mirubato-api` worker
4. Go to **Settings** > **Variables**
5. Add these environment variables:
   - `GOOGLE_CLIENT_ID`: Your OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your OAuth client secret (encrypt this)

### Option B: Using Wrangler Secrets

```bash
# Set the client ID (non-secret)
wrangler deploy --var GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"

# Set the client secret (encrypted)
echo "your-client-secret" | wrangler secret put GOOGLE_CLIENT_SECRET

# Set the Resend API key for email sending (encrypted)
echo "your-resend-api-key" | wrangler secret put RESEND_API_KEY
```

## Step 5: Update wrangler.toml

Update your `api/wrangler.toml` file to include the Google client ID:

```toml
[vars]
ENVIRONMENT = "production"
GOOGLE_CLIENT_ID = "your-actual-client-id.apps.googleusercontent.com"

# For staging
[env.staging.vars]
ENVIRONMENT = "staging"
GOOGLE_CLIENT_ID = "your-staging-client-id.apps.googleusercontent.com"
```

**Note**: Never commit the client secret to your repository. Use Cloudflare secrets instead.

## Step 6: Frontend Configuration

Ensure your frontend is configured to use the same Google Client ID:

1. Update environment variables or configuration
2. The frontend should redirect to: `/api/auth/google`
3. After successful auth, the API will redirect back with JWT tokens

## Step 7: Test the Integration

1. **Test Authorization Flow**:

   ```bash
   # Visit in browser
   https://apiv2.mirubato.com/api/auth/google
   ```

2. **Verify Redirect**:
   - Should redirect to Google's OAuth consent screen
   - After approval, should redirect back to your app
   - Check browser developer tools for cookies

3. **Test Token Validation**:
   ```bash
   # Test with the auth token cookie
   curl https://apiv2.mirubato.com/api/auth/me \
     -H "Cookie: auth-token=YOUR_TOKEN"
   ```

## Security Considerations

1. **Client Secret**: Always store as an encrypted secret in Cloudflare
2. **HTTPS Only**: Ensure all callbacks use HTTPS
3. **Domain Verification**: Verify your domain in Google Search Console
4. **Restricted API Keys**: Consider restricting API keys to specific domains
5. **Token Expiration**: JWT tokens expire after 1 hour by default

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**:
   - Ensure the redirect URI matches exactly (including trailing slashes)
   - Check both frontend and API configurations

2. **"invalid_client" error**:
   - Verify client ID and secret are correct
   - Ensure secret is properly set in Cloudflare

3. **CORS errors**:
   - Check that frontend domain is in the API's CORS allowlist
   - Verify origins in wrangler.toml

### Debug Endpoints

```bash
# Check health
curl https://apiv2.mirubato.com/health

# Check CORS configuration
curl -H "Origin: https://mirubato.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS https://apiv2.mirubato.com/api/auth/google
```

## Production Checklist

- [ ] OAuth consent screen configured and verified
- [ ] Production OAuth client created
- [ ] Client ID added to wrangler.toml
- [ ] Client secret added as Cloudflare secret
- [ ] Frontend configured with correct client ID
- [ ] Redirect URIs tested and working
- [ ] Domain verified in Google Search Console
- [ ] HTTPS enforced on all endpoints
- [ ] Error handling tested
- [ ] Monitoring/logging configured

## Next Steps

1. Monitor authentication metrics in Cloudflare Analytics
2. Set up alerts for authentication failures
3. Consider implementing refresh token rotation
4. Add Google Workspace domain restrictions if needed

## Support

For issues with:

- **Google OAuth**: Check [Google Identity Platform docs](https://developers.google.com/identity/protocols/oauth2)
- **Cloudflare Workers**: See [Workers documentation](https://developers.cloudflare.com/workers/)
- **API Implementation**: Review `api/src/api/handlers/auth.ts`
