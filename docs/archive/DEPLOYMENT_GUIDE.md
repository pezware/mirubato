# Mirubato Deployment Guide

_Last Updated: December 2024_

## Overview

Mirubato consists of three Cloudflare Workers:

- **Frontend** (`frontendv2/`) - React SPA served as a Worker
- **API** (`api/`) - REST API Worker with D1 database
- **Scores** (`scores/`) - PDF rendering service with R2 storage

All services use `wrangler.toml` files as the single source of truth for configuration.

## Prerequisites

1. **Cloudflare Account** with Workers, D1, R2, and Queues access
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Authentication**: `wrangler login`
4. **Node.js** 18+ and npm

## Local Development

### Quick Start

```bash
# Clone and install
git clone https://github.com/pezware/mirubato.git
cd mirubato
npm install

# Start all services
./start-scorebook.sh

# Access:
# Frontend: http://www-mirubato.localhost:4000
# API: http://api-mirubato.localhost:9797
# Scores: http://scores-mirubato.localhost:9788
```

### Individual Services

```bash
# Frontend
cd frontendv2
npm run dev

# API
cd api
npm run dev  # Runs build + wrangler dev

# Scores
cd scores
wrangler dev --port 9788 --env local --local-protocol http
```

## Environment Configuration

Each service has environment-specific configurations in `wrangler.toml`:

### Environments

- **Production** (default): No `--env` flag needed
- **Staging**: Use `--env staging`
- **Local**: Use `--env local` (for development)

### Key Bindings

**API Service**:

- `DB` - D1 database
- `MUSIC_CATALOG` - KV namespace
- `RATE_LIMITER` - Rate limiting

**Scores Service**:

- `DB` - D1 database
- `SCORES_BUCKET` - R2 bucket
- `CACHE` - KV namespace
- `PDF_QUEUE` - Queue for processing
- `BROWSER` - Browser rendering

**Frontend**:

- `ASSETS` - Static assets binding

## Database Setup

### Initial Setup

```bash
# API database
cd api
wrangler d1 create mirubato-dev        # Development
wrangler d1 create mirubato-prod       # Production

# Scores database
cd scores
wrangler d1 create mirubato-scores-dev  # Development
wrangler d1 create mirubato-scores-prod # Production
```

### Running Migrations

```bash
# API migrations
cd api
wrangler d1 migrations apply DB --env staging --remote
wrangler d1 migrations apply DB --remote  # Production

# Scores migrations
cd scores
wrangler d1 migrations apply DB --env staging --remote
wrangler d1 migrations apply DB --remote  # Production
```

## Deployment Process

### Manual Deployment

```bash
# Deploy to staging
cd [service-directory]
wrangler deploy --env staging

# Deploy to production
cd [service-directory]
wrangler deploy  # No --env flag for production
```

### Automated Deployment (GitHub Actions)

The project uses Cloudflare's GitHub integration:

1. **PR/Branch Push** → Automatically deploys to staging
2. **Merge to main** → Automatically deploys to production

No manual `wrangler deploy` needed for staging/production.

## Service-Specific Setup

### API Service

1. **Environment Secrets**:

   ```bash
   # Set secrets for each environment
   wrangler secret put JWT_SECRET --env staging
   wrangler secret put MAGIC_LINK_SECRET --env staging
   wrangler secret put GOOGLE_CLIENT_SECRET --env staging
   ```

2. **Music Catalog Setup**:
   ```bash
   cd api/scripts
   ./setup-music-catalog.sh
   ```

### Scores Service

1. **Queue Setup** (first time only):

   ```bash
   cd scores/scripts
   ./setup-queues.sh
   ```

2. **R2 Bucket Creation**:

   ```bash
   wrangler r2 bucket create mirubato-scores-staging
   wrangler r2 bucket create mirubato-scores-production
   ```

3. **Seed Test Data**:
   ```bash
   cd scores/scripts
   ./seed-staging.sh  # For staging
   ```

### Frontend Service

The frontend is built and deployed as a Cloudflare Worker.

#### Local Build and Deploy

```bash
cd frontendv2
npm run build         # Creates dist/
wrangler deploy       # Deploys with assets
```

#### Cloudflare Dashboard Build Configuration

When configuring via Cloudflare dashboard:

- **Framework preset**: None
- **Build command**: `npm install && npm run build:frontend`
- **Build output directory**: `frontendv2/dist`
- **Root directory**: `/` (leave empty for repository root)
- **Environment variables**: `NODE_VERSION=22`

Note: The `maxParallelFileOps: 2` in vite.config.ts handles file descriptor limit issues.

#### Troubleshooting Build Issues

**"Failed to resolve import" errors**:

```bash
# Ensure workspace dependencies are installed
npm install && npm run build:frontend
```

**"EMFILE: too many open files"**:

```bash
# Use the CF-optimized build script
npm install && cd frontendv2 && npm run build:cf
```

## Monitoring & Debugging

### Health Checks

- API: `https://api.mirubato.com/health`
- Scores: `https://scores.mirubato.com/health`

### Logs

```bash
# Tail logs for a service
wrangler tail --env staging  # Staging logs
wrangler tail                # Production logs
```

### Common Issues

1. **CORS Errors**: Check `wrangler.toml` for proper domain configuration
2. **Database Errors**: Verify migrations are up to date
3. **Queue Errors**: Ensure queues exist (run setup script)
4. **Build Errors**: Clear `node_modules` and reinstall

## Production Checklist

Before deploying to production:

- [ ] All tests passing: `npm test`
- [ ] Migrations reviewed and tested in staging
- [ ] Environment variables configured
- [ ] Health endpoints responding
- [ ] No console.log statements in code
- [ ] Bundle size optimized
- [ ] CORS/CSP headers configured correctly

## Rollback Procedure

1. **Via Cloudflare Dashboard**:
   - Go to Workers & Pages
   - Select the service
   - Go to "Deployments" tab
   - Click "Rollback" on previous version

2. **Via Wrangler**:
   ```bash
   wrangler rollback [deployment-id]
   ```

## Cost Optimization

- **Workers**: Free tier includes 100k requests/day
- **D1**: Free tier includes 5GB storage
- **R2**: Pay per GB stored and bandwidth
- **Browser Rendering**: $0.02 per 1000 renders

Monitor usage in Cloudflare dashboard → Analytics.

## Security Considerations

1. **Never commit secrets** to `wrangler.toml`
2. **Use wrangler secret** for sensitive values
3. **Rotate JWT secrets** periodically
4. **Enable rate limiting** in production
5. **Review CORS settings** for each environment

## Support

- **Documentation**: `/docs` directory
- **Issues**: [GitHub Issues](https://github.com/pezware/mirubato/issues)
- **Cloudflare Status**: [status.cloudflare.com](https://status.cloudflare.com)

---

_For architecture details, see [DESIGN.md](./DESIGN.md)_
_For development setup, see [CLAUDE.md](./CLAUDE.md)_
