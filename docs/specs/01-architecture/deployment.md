# Deployment Architecture

## Overview

Mirubato uses a modern CI/CD pipeline with GitHub Actions and Cloudflare Wrangler for automated deployment to the edge network. This document covers deployment strategies, environments, and operational procedures.

## Deployment Environments

### Environment Strategy

| Environment | Purpose                | Branch     | URL Pattern          | Data Persistence |
| ----------- | ---------------------- | ---------- | -------------------- | ---------------- |
| Local       | Development            | feature/\* | \*.localhost:PORT    | Ephemeral        |
| Staging     | Pre-production testing | staging    | staging.mirubato.com | Persistent       |
| Production  | Live users             | main       | mirubato.com         | Persistent       |

### Environment Configuration

#### Local Development

```toml
# wrangler.toml
[env.local]
name = "mirubato-api-local"
vars = { ENVIRONMENT = "local" }

[[env.local.d1_databases]]
binding = "DB"
database_name = "mirubato-local"
database_id = "local-db-id"
```

#### Staging

```toml
[env.staging]
name = "mirubato-api-staging"
vars = { ENVIRONMENT = "staging" }
route = { pattern = "api-staging.mirubato.com/*", zone_name = "mirubato.com" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "mirubato-staging"
database_id = "staging-db-id"
```

#### Production

```toml
[env.production]
name = "mirubato-api"
vars = { ENVIRONMENT = "production" }
route = { pattern = "api.mirubato.com/*", zone_name = "mirubato.com" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "mirubato-prod"
database_id = "31ecc854-aecf-4994-8bda-7a9cd3055122"
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, staging]
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Type check
        run: pnpm run type-check

      - name: Lint
        run: pnpm run lint

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest

    strategy:
      matrix:
        service: [api, scores, dictionary, sync-worker, frontendv2]

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build service
        run: pnpm --filter @mirubato/${{ matrix.service }} run build

      - name: Deploy to Cloudflare
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          ENV=${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
          cd ${{ matrix.service }}
          npx wrangler deploy --env $ENV
```

## Deployment Process

### 1. Local Development

```bash
# Start all services locally
./start-scorebook.sh

# Or individual service
cd api && wrangler dev --port 9797 --env local

# With hot reload
cd frontendv2 && pnpm run dev
```

### 2. Feature Branch Deployment

```bash
# Create feature branch
git checkout -b feature/new-feature

# Develop and test locally
pnpm test

# Push to GitHub (runs CI tests)
git push origin feature/new-feature

# Create PR for review
```

### 3. Staging Deployment

```bash
# Merge to staging branch
git checkout staging
git merge feature/new-feature
git push origin staging

# Automatic deployment via GitHub Actions
# Or manual deployment
wrangler deploy --env staging
```

### 4. Production Deployment

```bash
# Merge staging to main
git checkout main
git merge staging
git push origin main

# Automatic deployment via GitHub Actions
# Or manual deployment
wrangler deploy --env production
```

## Database Migrations

### Migration Strategy

```bash
# Create new migration
wrangler d1 migrations create DB "add_new_feature"

# Test locally
wrangler d1 migrations apply DB --local

# Apply to staging
wrangler d1 migrations apply DB --env staging

# Apply to production (with backup)
./scripts/safe-migrate.sh --env production
```

### Safe Migration Script

```bash
#!/bin/bash
# scripts/safe-migrate.sh

ENV=${1:-staging}

# Backup database
echo "Creating backup..."
wrangler d1 export DB --output "backup-$(date +%Y%m%d-%H%M%S).sql" --env $ENV

# Apply migrations
echo "Applying migrations..."
wrangler d1 migrations apply DB --env $ENV

# Verify
echo "Verifying database..."
wrangler d1 execute DB --command "SELECT * FROM _cf_migrations" --env $ENV
```

## Secrets Management

### Setting Secrets

```bash
# Set production secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put MAGIC_LINK_SECRET --env production
wrangler secret put SENDGRID_API_KEY --env production
wrangler secret put GOOGLE_CLIENT_ID --env production

# Set staging secrets
wrangler secret put JWT_SECRET --env staging
# ... etc
```

### Secret Rotation

```bash
# Generate new secret
openssl rand -base64 32

# Update in Cloudflare
wrangler secret put JWT_SECRET --env production

# Deploy to activate new secret
wrangler deploy --env production
```

## Zero-Downtime Deployment

### Cloudflare's Deployment Strategy

1. **Build Phase**: New version built and validated
2. **Canary Release**: Deploy to subset of traffic (5%)
3. **Monitoring**: Watch error rates and performance
4. **Progressive Rollout**: Gradually increase traffic
5. **Full Deployment**: 100% traffic on new version

### Rollback Procedures

```bash
# Instant rollback to previous version
wrangler rollback --env production

# Or deploy specific version
wrangler deploy --env production --compatibility-date "2024-11-01"
```

## Monitoring Deployment

### Health Checks

```bash
# Check service health after deployment
curl https://api.mirubato.com/health
curl https://scores.mirubato.com/health
curl https://dictionary.mirubato.com/health
```

### Deployment Verification

```typescript
// Automated health check script
async function verifyDeployment(env: string) {
  const services = ['api', 'scores', 'dictionary', 'sync']

  for (const service of services) {
    const url = `https://${service}${env === 'production' ? '' : '-staging'}.mirubato.com/health`
    const response = await fetch(url)
    const health = await response.json()

    if (health.status !== 'healthy') {
      throw new Error(`${service} is unhealthy: ${health.message}`)
    }
  }
}
```

## Performance Optimization

### Build Optimization

```javascript
// vite.config.ts for frontend
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@headlessui/react', 'chart.js'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
```

### Bundle Size Management

```bash
# Analyze bundle size
cd frontendv2 && pnpm run build --analyze

# Check Worker size
wrangler deploy --dry-run --outdir dist
ls -lh dist/
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Database migrations prepared
- [ ] Secrets configured
- [ ] Feature flags set

### Deployment

- [ ] Deploy to staging first
- [ ] Run smoke tests on staging
- [ ] Check monitoring dashboards
- [ ] Deploy to production
- [ ] Verify health endpoints

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify user flows
- [ ] Update status page
- [ ] Notify team

## Troubleshooting

### Common Issues

| Issue                    | Symptoms                | Solution                            |
| ------------------------ | ----------------------- | ----------------------------------- |
| Build fails              | CI/CD pipeline fails    | Check logs, fix TypeScript errors   |
| Deployment timeout       | Wrangler hangs          | Check network, retry with --verbose |
| Service unhealthy        | Health check fails      | Check logs with `wrangler tail`     |
| Database migration fails | SQL errors              | Rollback migration, fix and retry   |
| Secret missing           | 500 errors after deploy | Set missing secrets with wrangler   |
| Route conflict           | 404 errors              | Check wrangler.toml routes          |

### Debug Commands

```bash
# Stream logs
wrangler tail --env production

# Check deployment status
wrangler deployments list

# View configuration
wrangler whoami

# Test locally with production config
wrangler dev --env production --remote
```

## Disaster Recovery

### Backup Strategy

```bash
# Automated daily backups
0 0 * * * /scripts/backup-all.sh

# Manual backup
wrangler d1 export DB --output backup.sql --env production
```

### Recovery Procedures

1. **Service Failure**: Rollback to previous version
2. **Data Corruption**: Restore from D1 backup
3. **Complete Outage**: Redeploy all services
4. **Security Breach**: Rotate all secrets, audit logs

## Related Documentation

- [System Overview](./overview.md) - Architecture overview
- [Cloudflare Services](./cloudflare-services.md) - Platform services
- [Monitoring](../07-operations/monitoring.md) - Monitoring strategy
- [Debugging](../07-operations/debugging.md) - Debug procedures

---

_Last updated: December 2024 | Version 1.7.6_
