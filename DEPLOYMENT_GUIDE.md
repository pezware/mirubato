# Cloudflare Pages Deployment Guide for Rubato

## Prerequisites
1. A Cloudflare account (free tier is sufficient)
2. Your domain (mirubato.com) added to Cloudflare
3. GitHub repository connected to Cloudflare Pages

## Initial Setup Steps

### 1. Connect GitHub Repository to Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Pages** in the sidebar
3. Click **Create a project** → **Connect to Git**
4. Authorize Cloudflare to access your GitHub account
5. Select the `rubato` repository
6. Configure build settings:
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: `18` or higher

### 2. Set Environment Variables in Cloudflare

In your Cloudflare Pages project settings:

1. Go to **Settings** → **Environment variables**
2. Add the following for Production:
   ```
   VITE_ENVIRONMENT = production
   ```

### 3. Configure Custom Domain

1. In your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter `mirubato.com`
4. Follow the DNS configuration steps:
   - Cloudflare will automatically add the necessary CNAME record
   - If using apex domain, it will use CNAME flattening

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

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the project
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=rubato
```

## Build Configuration

The project uses these build settings:

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

## Preview Deployments

Every pull request automatically creates a preview deployment with a unique URL:
- Format: `https://<hash>.rubato.pages.dev`
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

## Next Steps

After deployment:
1. Test the live site at mirubato.com
2. Enable Web Analytics
3. Set up error monitoring (when adding more features)
4. Configure staging environment (optional)