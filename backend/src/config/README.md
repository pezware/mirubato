# Configuration

This directory contains configuration files for the backend API.

## CORS Configuration (`cors.ts`)

The CORS configuration allows you to specify which domains can access the API.

### How to Customize

1. **Production Domains**: Add your custom domains to `corsConfig.production.domains`:

   ```typescript
   domains: ['https://yourdomain.com', 'https://www.yourdomain.com']
   ```

2. **Preview Deployments**: Update the patterns with your Cloudflare account name:

   ```typescript
   patterns: [
     'https://your-app.your-account.workers.dev',
     'https://*-your-app.your-account.workers.dev',
   ]
   ```

3. **Development Origins**: Add any local development URLs you use:
   ```typescript
   origins: ['http://localhost:3000', 'http://localhost:8080']
   ```

### Pattern Matching

The configuration supports wildcard patterns using `*`:

- `https://*.example.com` - Matches any subdomain of example.com
- `https://*-preview.workers.dev` - Matches any preview deployment

### Security Notes

- Be careful with wildcard patterns - only use them for trusted domains
- The generic patterns (`https://*.workers.dev`) are included for convenience but can be removed for stricter security
- Always use HTTPS in production
