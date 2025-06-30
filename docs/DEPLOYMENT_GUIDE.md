# Deployment Guide

This guide covers the deployment process for the Mirubato project across different environments.

## Prerequisites

Before deploying, ensure you have:

1. Cloudflare account with appropriate permissions
2. Wrangler CLI installed and authenticated
3. All environment secrets configured in Cloudflare dashboard

## Scores Service Deployment

### First-Time Setup

1. **Create Cloudflare Queues**

   The scores service requires queues for PDF processing. Run this script before first deployment:

   ```bash
   cd scores
   ./scripts/setup-queues.sh
   ```

   This creates the following queues:
   - Production: `pdf-processing`, `pdf-processing-dlq`
   - Staging: `pdf-processing-staging`, `pdf-processing-staging-dlq`
   - Development: `pdf-processing-dev`, `pdf-processing-dev-dlq`

2. **Run Database Migrations**

   ```bash
   cd scores
   # For staging
   wrangler d1 migrations apply DB --env staging --remote

   # For production
   wrangler d1 migrations apply DB --remote
   ```

### Deployment Commands

```bash
# Deploy to staging
cd scores
wrangler deploy --env staging

# Deploy to production
cd scores
wrangler deploy
```

## Troubleshooting

### Queue Does Not Exist Error

If you see an error like:

```
Queue "pdf-processing-staging" does not exist. To create it, run: wrangler queues create pdf-processing-staging
```

Run the setup script:

```bash
cd scores
./scripts/setup-queues.sh
```

### Migration Errors

If migrations fail with "duplicate column" errors, it means the column already exists. You can safely ignore these errors or check the migration status:

```bash
wrangler d1 migrations list DB --env staging --remote
```

## Automated Deployments

The project uses GitHub Actions for automated deployments:

- **Pull Requests**: Automatically deploy to staging
- **Main Branch**: Automatically deploy to production

The queues must be created manually before the first automated deployment.
