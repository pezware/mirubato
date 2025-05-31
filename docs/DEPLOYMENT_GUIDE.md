# Cloudflare Workers Deployment Guide for Mirubato

> Note: This guide covers deployment of both the frontend (Pages) and backend (Workers with GraphQL API).

## Prerequisites

1. A Cloudflare account (free tier is sufficient)
2. Your domain (mirubato.com) added to Cloudflare
3. GitHub repository connected to Cloudflare Pages

## Initial Setup Steps

### 1. Frontend Setup (Cloudflare Pages)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** in the sidebar
3. Click **Create** → **Pages** → **Connect to Git**
4. Authorize Cloudflare to access your GitHub account
5. Select the `mirubato` repository
6. Configure build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Build output directory: `frontend/dist`
   - Root directory: `/` (project root)

### 2. Backend Setup (Cloudflare Workers)

1. Create D1 Database:

   ```bash
   # Create production database
   wrangler d1 create mirubato-db

   # Note the database_id returned - add it to backend/wrangler.toml
   ```

2. Apply database migrations:

   ```bash
   cd backend
   wrangler d1 migrations apply mirubato-db --local=false
   ```

3. Deploy the Worker:
   ```bash
   cd backend
   wrangler deploy --env production
   ```

### 3. Set Environment Variables

#### Frontend (Pages) Environment Variables:

1. Go to your Pages project → **Settings** → **Environment variables**
2. Add for Production:
   ```
   VITE_ENVIRONMENT = production
   VITE_API_BASE_URL = https://api.mirubato.com/graphql
   ```

#### Backend (Workers) Environment Variables:

1. Go to your Worker → **Settings** → **Variables**
2. Add the following secrets:
   ```
   JWT_SECRET = [generate a strong random secret]
   EMAIL_API_KEY = [your email service API key]
   ```
3. Environment variables are also configured in wrangler.toml:
   ```toml
   [vars]
   ENVIRONMENT = "production"
   ```

### 4. Configure Custom Domains

#### Frontend Domain:

1. In your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter `mirubato.com` (or `rubato.pezware.com`)
4. Cloudflare will handle DNS automatically

#### Backend API Domain:

1. In your Worker settings, go to **Triggers** → **Custom Domains**
2. Add `api.mirubato.com` (or `api.rubato.pezware.com`)
3. Configure the route pattern:
   ```
   api.mirubato.com/*
   ```

### 4. GitHub Secrets Setup

For automated deployments via GitHub Actions, add these secrets to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:
   - `CLOUDFLARE_API_TOKEN`: Create at https://dash.cloudflare.com/profile/api-tokens
     - Use the "Edit Cloudflare Pages" template
     - Permissions needed: Cloudflare Pages:Edit
   - `CLOUDFLARE_ACCOUNT_ID`: Find in Cloudflare dashboard (right sidebar)

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

With the GitHub Actions workflow we created, deployments happen automatically:

- **Push to main branch** → Deploys to production (mirubato.com)
- **Pull requests** → Creates preview deployments

### Method 2: Manual Deployment via Cloudflare Dashboard

1. Push your changes to the main branch
2. Cloudflare Pages will automatically detect and build

### Method 3: Manual Deployment via Wrangler CLI

#### Deploy Frontend:

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the frontend project
cd frontend
npm install
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=mirubato
```

#### Deploy Backend:

```bash
# Navigate to backend directory
cd backend

# Deploy to production
wrangler deploy --env production

# Deploy to staging (optional)
wrangler deploy --env staging
```

## Build Configuration

### Frontend Build Settings:

```json
{
  "build": {
    "command": "npm run build",
    "output": "dist"
  },
  "env": {
    "NODE_VERSION": "20"
  }
}
```

### Backend Configuration (wrangler.toml):

```toml
name = "mirubato-api"
main = "src/index.ts"
compatibility_date = "2024-01-15"
node_compat = true

[env.production]
name = "mirubato-api-production"
route = { pattern = "api.mirubato.com/*", zone_name = "mirubato.com" }
vars = { ENVIRONMENT = "production" }

[env.staging]
name = "mirubato-api-staging"
route = { pattern = "api-staging.mirubato.com/*", zone_name = "mirubato.com" }
vars = { ENVIRONMENT = "staging" }

[[d1_databases]]
binding = "DB"
database_name = "mirubato-db"
database_id = "your-database-id-here"
```

## Preview Deployments

Every pull request automatically creates a preview deployment with a unique URL:

- Format: `https://<hash>.mirubato.pages.dev`
- Allows testing changes before merging to main

## Monitoring & Analytics

1. **Build Logs**: Available in Cloudflare Pages dashboard
2. **Analytics**: Enable Web Analytics in Pages settings
3. **Error Tracking**: Logs available in Pages Functions (when we add backend)

## Troubleshooting

### Build Failures

- Check Node version compatibility (requires 18+)
- Verify all dependencies are in package.json
- Check build logs in Cloudflare dashboard

### Domain Not Working

- Ensure DNS records are properly configured
- Wait for DNS propagation (can take up to 48 hours)
- Check SSL certificate status in Cloudflare

### Asset Loading Issues

- Verify all assets are in the `public` folder
- Check that paths don't start with `/tmp/`
- Ensure case-sensitive file names match

## Security Headers

Cloudflare Pages automatically adds basic security headers. For custom headers, create a `_headers` file in the public folder:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

## Cost

- **Cloudflare Pages**: Free tier includes:
  - 500 builds per month
  - Unlimited requests
  - Unlimited bandwidth
  - Custom domain support

## Database Management

### Running Migrations:

```bash
# Apply migrations to production
cd backend
wrangler d1 migrations apply mirubato-db --local=false

# Apply migrations to local development
wrangler d1 migrations apply mirubato-db --local
```

### Creating New Migrations:

```bash
# Create a new migration file
wrangler d1 migrations create mirubato-db "add_new_feature"
```

## Monitoring & Debugging

### Backend Logs:

```bash
# Tail production logs
wrangler tail --env production

# Tail with filtering
wrangler tail --env production --search "error"
```

### GraphQL Playground:

- Development: http://localhost:8787/graphql
- Staging: https://api-staging.mirubato.com/graphql (if introspection enabled)
- Production: Disabled for security

## Next Steps

After deployment:

1. Test the live site at your domain
2. Test GraphQL API at api.yourdomain.com/graphql
3. Enable Web Analytics for frontend
4. Monitor Worker analytics and logs
5. Set up alerts for errors
6. Configure staging environment for testing
