# Deployment Architecture

## Purpose

This document defines Mirubato's deployment strategy using Cloudflare's automatic deployment pipeline integrated with GitHub. It covers environments, deployment triggers, operational procedures, and the rationale behind our deployment choices.

## Why Our Deployment Strategy

- **Automatic deployments**: Cloudflare handles deployments on PR creation and merges
- **Zero-downtime updates**: Cloudflare's edge network ensures seamless rollouts
- **Branch-based environments**: Feature branches for development, main for production
- **Minimal configuration**: No complex CI/CD scripts to maintain
- **Built-in rollback**: Instant reversion to previous versions if needed

## Deployment Environments

### Environment Strategy

**What**: Three-tier environment strategy with automatic promotion.

**Why**:

- Isolate development from production
- Test changes before releasing to users
- Maintain data integrity across environments

**How**:

| Environment | Branch Pattern | Deployment Trigger     | URL Pattern             | Data Persistence |
| ----------- | -------------- | ---------------------- | ----------------------- | ---------------- |
| Local       | feature/\*     | Manual (wrangler dev)  | \*.localhost:PORT       | Ephemeral        |
| Staging     | PR to main     | Automatic (Cloudflare) | \*-staging.mirubato.com | Persistent       |
| Production  | main           | Automatic on merge     | mirubato.com            | Persistent       |

**Code References**:

- Local ports: `start-scorebook.sh:27-29` — API:9797, Scores:9788, Frontend:4000
- CI triggers: `.github/workflows/ci.yml:4-7` — main branch and PRs (Note: `develop` exists in CI config but not actively used)

### Service Configuration

**What**: Environment-specific configurations per service using wrangler.toml.

**Why**:

- Isolate resources between environments
- Prevent accidental data corruption
- Enable gradual rollouts

**Code References**:

#### API Service

- Local config: `api/wrangler.toml:11-20` — env.local settings
- Staging routes: `api/wrangler.toml:43-45` — custom_domain = true
- Staging DB: `api/wrangler.toml:47-50` — database_id "4510137a..."
- Production routes: `api/wrangler.toml:78-80` — api.mirubato.com
- Production DB: `api/wrangler.toml:82-85` — database_id "31ecc854..."

#### Scores Service

- Staging routes: `scores/wrangler.toml:67-69` — scores-staging.mirubato.com
- Staging DB: `scores/wrangler.toml:71-74` — Scores staging database
- Production routes: `scores/wrangler.toml:181-184` — scores.mirubato.com
- Production DB: `scores/wrangler.toml:185-188` — Scores production database

#### Dictionary Service

- Staging routes: `dictionary/wrangler.toml:25-27` — dictionary-staging.mirubato.com
- Staging DB: `dictionary/wrangler.toml:29-33` — Dictionary staging database
- Production routes: `dictionary/wrangler.toml:95-98` — dictionary.mirubato.com
- Production DB: `dictionary/wrangler.toml:99-103` — Dictionary production database

#### Sync Worker

- Staging routes: `sync-worker/wrangler.toml:93-95` — sync-staging.mirubato.com
- Staging DB: `sync-worker/wrangler.toml:97-101` — Sync staging database
- Production routes: `sync-worker/wrangler.toml:128-130` — sync.mirubato.com
- Production DB: `sync-worker/wrangler.toml:132-135` — Sync production database

#### Frontend

- Assets binding: `frontendv2/wrangler.toml:8` — ASSETS binding
- Worker entry: `frontendv2/src/index.js` — SPA serving worker

## Deployment Pipeline

### Cloudflare Automatic Deployments

**What**: Cloudflare automatically deploys on GitHub events without GitHub Actions.

**Why**:

- Zero maintenance CI/CD pipeline
- Built-in integration with GitHub
- Automatic preview deployments for PRs
- No API tokens to manage

**How**:

1. **PR Created**: Cloudflare creates preview deployment
2. **PR Merged to main**: Automatic production deployment
3. **Direct push to main**: Automatic production deployment

**Current State**:

- ✅ Manual deployment via wrangler CLI
- ✅ Automatic Github / Cloudflare deployment (active for configured projects)

### GitHub Actions (Testing Only)

**What**: GitHub Actions runs tests and checks, but does NOT deploy.

**Code References**:

- CI workflow: `.github/workflows/ci.yml` — Tests, linting, type checking
- Test matrix: `.github/workflows/ci.yml:66-67` — Tests for all workspaces
- E2E tests: `.github/workflows/ci.yml:123-182` — Playwright tests
- No deploy step: Deployment handled by Cloudflare, not GitHub Actions

## Deployment Workflows

### Local Development

**What**: Local development with hot reload and instant feedback.

**Code References**:

- Start script: `start-scorebook.sh` — Starts all services
- API local: `api/package.json:8` — "dev": "wrangler dev --port 9797 --env local"
- Frontend dev: `frontendv2/package.json:10` — "dev": "vite --port 4000"

```bash
# Start all services
./start-scorebook.sh

# Individual service development
cd api && pnpm run dev          # API on port 9797
cd scores && pnpm run dev        # Scores on port 9788
cd frontendv2 && pnpm run dev    # Frontend on port 4000
```

### Feature Development Flow

**What**: Branch-based development with PR reviews.

**Why**:

- Code review before production
- Automated testing on every push
- Preview deployments for stakeholders

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature

# 2. Develop and test
pnpm test
pnpm run lint
pnpm run type-check

# 3. Push and create PR
git push origin feature/your-feature
# Create PR on GitHub → Triggers CI tests
# Cloudflare creates preview deployment (if configured)

# 4. After review, merge to main
# Cloudflare automatically deploys to production
```

### Manual Deployment (Current Method)

**What**: Manual deployment using wrangler CLI.

**When to use**:

- Emergency hotfixes
- Testing deployment configurations
- When automatic deployment is not configured

```bash
# Deploy individual services to staging
cd api && wrangler deploy --env staging
cd scores && wrangler deploy --env staging
cd dictionary && wrangler deploy --env staging
cd sync-worker && wrangler deploy --env staging
cd frontendv2 && wrangler deploy --env staging

# Deploy to production
cd [service] && wrangler deploy --env production
```

## Database Migrations

### Migration Strategy

**What**: Per-service database migrations with manual application.

**Why**:

- Each service owns its schema
- Controlled migration timing
- Ability to rollback if needed
- Test migrations locally first

**How**:

#### Per-Service Migration

Each service with D1 has its own migrations:

- API: `api/migrations/` directory
- Scores: `scores/migrations/` directory
- Dictionary: `dictionary/migrations/` directory
- Sync Worker: Uses API's D1 database (no separate migrations directory)

```bash
# Create migration for specific service
cd api && wrangler d1 migrations create DB "add_user_preferences"

# Apply migrations per service
cd api && wrangler d1 migrations apply DB --env staging
cd scores && wrangler d1 migrations apply DB --env staging
cd dictionary && wrangler d1 migrations apply DB --env staging
cd sync-worker && wrangler d1 migrations apply DB --env staging
```

#### Migration Safety (🔄 Planned)

**Note**: The safe-migrate.sh script shown below is an example pattern, not currently implemented.

```bash
# Recommended pattern for production migrations
# 1. Backup before migration
wrangler d1 export DB --output "backup-$(date +%Y%m%d-%H%M%S).sql" --env production

# 2. Apply migration
cd [service] && wrangler d1 migrations apply DB --env production

# 3. Verify migration
wrangler d1 execute DB --command "SELECT * FROM _cf_migrations" --env production
```

**Operational Limits**:

- Migration timeout: 60 seconds
- Max migration size: 100MB
- Rollback: Manual restoration from backup

## Secrets Management

### Configuration Types

**What**: Distinction between public vars and secret values.

**Why**:

- Public config can be in version control
- Secrets require secure storage
- Different rotation policies

**How**:

#### Public Variables (vars in wrangler.toml)

- `ENVIRONMENT`: Deployment environment name
- `GOOGLE_CLIENT_ID`: OAuth client ID (public)
- `*_URL`: Service endpoint URLs

**Code References**:

- API vars: `api/wrangler.toml:66-72` — Public configuration
- Staging vars: `api/wrangler.toml:31-37` — Staging URLs

#### Secret Values (wrangler secret)

```bash
# Authentication secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put MAGIC_LINK_SECRET --env production

# Email service (Resend, not SendGrid)
wrangler secret put RESEND_API_KEY --env production

# OAuth secrets (if needed)
wrangler secret put GOOGLE_CLIENT_SECRET --env production
```

**Code References**:

- Resend usage: `api/src/services/email.ts:57-59` — RESEND_API_KEY check
- Email service: `api/src/services/email.ts:60` — sendWithResend method

### Secret Rotation

**What**: Process for rotating sensitive credentials.

**Why**:

- Security compliance
- Limit exposure window
- Audit trail

**How**:

```bash
# 1. Generate new secret
openssl rand -base64 32

# 2. Update in Cloudflare (zero-downtime)
wrangler secret put JWT_SECRET --env production

# 3. Redeploy to ensure Workers use new secret
wrangler deploy --env production
# Note: Cloudflare requires deployment for secret propagation
```

**Code References**:

- JWT verification: `api/src/api/middleware.ts:18-25` — JWT secret usage
- Magic link secret: `api/src/api/handlers/auth.ts:142-148` — Token generation

## Zero-Downtime Deployment

### Cloudflare's Deployment Strategy

**What**: Automatic zero-downtime deployments managed by Cloudflare.

**Why**:

- No service interruption
- Instant rollback capability
- Automatic health monitoring
- Global edge propagation

**How Cloudflare Handles It**:

1. **Upload**: New Worker version uploaded to Cloudflare
2. **Validation**: Script validated and compiled
3. **Distribution**: Propagated to all edge locations (~300 data centers)
4. **Atomic Switch**: Traffic instantly switches to new version
5. **Rollback Ready**: Previous version kept warm for instant rollback

**Operational Characteristics**:

- Deployment time: <30 seconds globally
- Rollback time: <5 seconds
- No cold starts: Workers stay warm
- Request coalescing: In-flight requests complete on old version

### Rollback Procedures

**What**: Instant reversion to previous Worker version.

**When to use**:

- Production incidents
- Performance degradation
- Critical bugs

```bash
# View deployment history
wrangler deployments list --env production

# Rollback to previous version (instant)
wrangler rollback --env production

# Deploy specific version by compatibility date
wrangler deploy --env production --compatibility-date "2024-11-01"
```

## Deployment Monitoring

### Health Check Endpoints

**What**: Standardized health endpoints for all services.

**Why**:

- Verify successful deployments
- Monitor service health
- Enable automated alerting

**Code References**:

- API health: `api/src/api/handlers/health.ts:76` — GET /health handler
- Scores health: `scores/src/api/handlers/health.ts:77` — GET /health handler
- Dictionary health: `dictionary/src/api/handlers/health.ts:41` — GET /health handler
- Sync health: `sync-worker/src/index.ts:34-46` — GET /health handler

**Health Check URLs**:

| Service    | Staging                                        | Production                             |
| ---------- | ---------------------------------------------- | -------------------------------------- |
| API        | https://api-staging.mirubato.com/health        | https://api.mirubato.com/health        |
| Scores     | https://scores-staging.mirubato.com/health     | https://scores.mirubato.com/health     |
| Dictionary | https://dictionary-staging.mirubato.com/health | https://dictionary.mirubato.com/health |
| Sync       | https://sync-staging.mirubato.com/health       | https://sync.mirubato.com/health       |

### Deployment Verification

```bash
# Quick health check after deployment
for service in api scores dictionary sync; do
  echo "Checking $service..."
  curl -s https://$service.mirubato.com/health | jq '.status'
done

# Check version headers
curl -I https://api.mirubato.com/health | grep X-Worker-Version
```

## Build & Bundle Optimization

### Frontend Build Optimization

**What**: Vite configuration for optimal bundle splitting.

**Why**:

- Reduce initial load time
- Better caching with vendor chunks
- Smaller bundle sizes

**Code References**:

- Vite config: `frontendv2/vite.config.ts:80-98, 141-158` — rollupOptions manualChunks, chunk naming, minify/sourcemap/target
- Bundle analysis: `frontendv2/package.json:13` — "analyze" script

### Worker Size Management

**What**: Monitor and optimize Worker bundle sizes.

**Why**:

- Cloudflare limit: 10MB compressed
- Smaller Workers = faster cold starts
- Lower memory usage

**How to check**:

```bash
# Check Worker size before deployment
cd api && wrangler deploy --dry-run --outdir dist
du -sh dist/index.js

# Analyze what's included
cd api && pnpm run build
ls -lh dist/
```

**Operational Limits**:

- Worker script size: 10MB compressed, 30MB uncompressed
- Startup time impact: ~1ms per 100KB
- Memory usage: Proportional to script size

## Deployment Checklist

### Pre-Deployment Verification

**What**: Standard checks before any deployment.

**Why**: Prevent broken deployments and maintain quality.

#### Development Checks

- [ ] All tests passing: `pnpm test`
- [ ] Type checking: `pnpm run type-check`
- [ ] Linting: `pnpm run lint`
- [ ] Build successful: `pnpm run build`

#### Infrastructure Checks

- [ ] Database migrations prepared (if needed)
- [ ] Secrets configured: `wrangler secret list --env [env]`
- [ ] Environment variables set in wrangler.toml

### Deployment Process

#### Staging Deployment

- [ ] Create PR to main branch
- [ ] CI tests pass (automatic)
- [ ] Preview deployment created (Cloudflare)
- [ ] Manual testing on preview URL
- [ ] Health checks pass

#### Production Deployment

- [ ] PR approved by reviewer
- [ ] Merge to main branch
- [ ] Cloudflare deploys automatically
- [ ] Verify health endpoints
- [ ] Check version headers

### Post-Deployment Monitoring

- [ ] Check error rates: `wrangler tail --env production`
- [ ] Monitor performance: Check response times
- [ ] Verify critical user flows work
- [ ] Watch for anomalies in first 30 minutes

## Troubleshooting Deployments

### Common Deployment Issues

**What**: Known issues and their solutions.

| Issue                  | Symptoms            | Root Cause             | Solution                                        |
| ---------------------- | ------------------- | ---------------------- | ----------------------------------------------- |
| **Build fails**        | CI pipeline red     | TypeScript/test errors | Fix errors shown in CI logs                     |
| **Deployment timeout** | Wrangler hangs >60s | Network or auth issues | Check `wrangler whoami`, retry with `--verbose` |
| **Service unhealthy**  | /health returns 500 | Missing config/secrets | Check `wrangler tail`, verify secrets           |
| **Migration fails**    | D1 SQL errors       | Schema conflicts       | Backup, fix migration, reapply                  |
| **Route not working**  | 404 errors          | Route misconfiguration | Verify routes in wrangler.toml                  |
| **Script too large**   | Deploy fails        | Bundle >10MB           | Optimize dependencies, use dynamic imports      |

### Debug Commands

**Code References**:

- Wrangler config: All `wrangler.toml` files have observability.logs enabled
- Rate limiter: `api/src/api/middleware.ts:57-71` — Rate limit middleware

```bash
# Real-time log streaming
wrangler tail --env production
wrangler tail --env production --search "error" --status 500

# Check deployment history
wrangler deployments list --env production

# Verify authentication
wrangler whoami

# Test with remote bindings
wrangler dev --env production --remote

# Check service configuration
cd api && wrangler --env production --dry-run
```

### Failure Modes

| Failure Type            | Impact              | Detection          | Recovery                       |
| ----------------------- | ------------------- | ------------------ | ------------------------------ |
| **Bad deployment**      | Service errors      | Health checks fail | `wrangler rollback`            |
| **Database corruption** | Data inconsistency  | Query failures     | Restore from D1 export         |
| **Secret leak**         | Security risk       | Audit logs         | Rotate all secrets immediately |
| **Rate limit hit**      | Service unavailable | 429 responses      | Scale limits or wait           |

## Disaster Recovery

### Backup Strategy

**What**: Database backup and recovery procedures.

**Why**:

- Protect against data loss
- Enable point-in-time recovery
- Compliance requirements

**How**:

```bash
# Manual backup per service
cd api && wrangler d1 export DB --output "api-backup-$(date +%Y%m%d).sql" --env production
cd scores && wrangler d1 export DB --output "scores-backup-$(date +%Y%m%d).sql" --env production
cd dictionary && wrangler d1 export DB --output "dict-backup-$(date +%Y%m%d).sql" --env production
cd sync-worker && wrangler d1 export DB --output "sync-backup-$(date +%Y%m%d).sql" --env production
```

**Note**: Automated backups via cron are planned but not yet implemented.

### Recovery Procedures

**What**: Step-by-step recovery for different failure scenarios.

| Scenario            | Severity | Recovery Steps                                                                                                       | RTO     |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| **Bad deployment**  | Low      | 1. `wrangler rollback --env production`<br>2. Verify health checks                                                   | <5 min  |
| **Data corruption** | High     | 1. Export current state<br>2. Restore from backup<br>3. Replay recent transactions                                   | <30 min |
| **Service outage**  | Medium   | 1. Check Cloudflare status<br>2. Redeploy if needed<br>3. Verify all endpoints                                       | <15 min |
| **Security breach** | Critical | 1. Rotate ALL secrets immediately<br>2. Audit access logs<br>3. Deploy security patches<br>4. Notify users if needed | <1 hour |

**Operational Limits**:

- D1 export time: ~1 minute per GB
- Restore time: ~5 minutes per GB
- Maximum backup size: 10GB per database

## Related Documentation

- [System Overview](./overview.md) - Architecture overview
- [Cloudflare Services](./cloudflare-services.md) - Platform services details
- [Monitoring & Debugging](../07-operations/monitoring-debugging.md) - Operational procedures
- [Performance](../07-operations/performance.md) - Optimization strategies
- [Database Schema](../02-database/schema.md) - Migration references

---

_Last updated: 2025-09-09 | Version 1.7.6_
