# Mirubato Developer Guide

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [What is Mirubato?](#what-is-mirubato)
3. [Cloudflare Architecture Deep Dive](#cloudflare-architecture)
4. [Development Workflow](#development-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Cloudflare Deployment & Operations](#cloudflare-deployment)
7. [Core Features](#core-features)
8. [UI Components](#ui-components)
9. [API Reference](#api-reference)
10. [Internationalization](#internationalization)
11. [Cloudflare Debugging & Monitoring](#cloudflare-debugging)
12. [Educational Context](#educational-context)
13. [Version History](#version-history)

---

## 1. Quick Start (5 minutes) {#quick-start}

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Cloudflare account (for deployment)

### First Time Setup

```bash
# Clone and install
git clone https://github.com/mirubato/mirubato.git
cd mirubato
pnpm install

# Start all services
./start-scorebook.sh

# Access the app
# Frontend: http://www-mirubato.localhost:4000
# API: http://api-mirubato.localhost:9797
# Scores: http://scores-mirubato.localhost:9788
# Dictionary: http://dictionary-mirubato.localhost:9799
```

### Most Common Commands

```bash
# Development
pnpm install                  # Install dependencies
./start-scorebook.sh          # Start all services
pnpm test                     # Run tests
pnpm run build                # Build for production

# Individual services (debugging)
cd frontendv2 && pnpm run dev # Frontend only
cd api && pnpm run dev        # API only

# Deployment
cd [service] && wrangler deploy --env staging  # Deploy to staging
cd [service] && wrangler deploy                # Deploy to production
```

### Key Principles - MUST READ

1. **Test First**: Write tests before implementation
2. **Use Component Library**: Never use native HTML elements
3. **Check Branch**: Never edit on main branch
4. **Run Hooks**: Never skip pre-commit hooks with `--no-verify`
5. **Use ast-grep**: For syntax-aware code searches

---

## 2. What is Mirubato? {#what-is-mirubato}

Mirubato is a comprehensive music education platform designed to help musicians improve their sight-reading skills through:

- **Practice Logging**: Track practice sessions with detailed analytics
- **Sheet Music Library**: Browse, import, and organize sheet music
- **Goal Setting**: Create and track musical goals
- **Practice Tools**: Metronome, Circle of Fifths, practice counter

Built on Cloudflare's edge infrastructure for global performance and offline-first functionality.

---

## 3. Cloudflare Architecture Deep Dive {#cloudflare-architecture}

### Why Cloudflare Workers?

Mirubato leverages Cloudflare's edge computing platform for:

- **Global Distribution**: Runs in 300+ data centers worldwide
- **Zero Cold Starts**: V8 isolates provide instant response times
- **Auto-Scaling**: Handles millions of requests without configuration
- **Cost Efficiency**: Pay only for actual compute time used

### Edge-First Microservices Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network               │
│                    (300+ Global Locations)               │
└─────────────────────┬───────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────┬────────────────────┐
    │                 │             │                    │
┌───▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐
│  Frontend     │  │   API       │  │   Scores    │  │ Dictionary  │
│  Worker       │  │   Worker    │  │   Worker    │  │   Worker    │
│ (Static SPA)  │  │ (REST API)  │  │ (PDF/AI)    │  │ (Lookup)    │
└───┬──────────┘  └──┬──────────┘  └──┬──────────┘  └──┬──────────┘
    │                 │                 │                 │
┌───▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐
│ Assets (CDN)  │  │ D1 Database │  │ D1 + R2     │  │ D1 Database │
│               │  │ KV Cache    │  │ KV + Queue  │  │ KV Cache    │
└───────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### Cloudflare Services Used

| Service               | Purpose           | Usage in Mirubato                      |
| --------------------- | ----------------- | -------------------------------------- |
| **Workers**           | Edge compute      | All microservices run as Workers       |
| **D1**                | Edge SQL database | User data, scores metadata, dictionary |
| **R2**                | Object storage    | PDF files, images, audio files         |
| **KV**                | Key-value store   | Session cache, API responses, catalog  |
| **Queues**            | Async processing  | PDF processing, email sending          |
| **AI**                | Machine learning  | Score analysis, metadata extraction    |
| **Browser Rendering** | Headless browser  | PDF preview generation                 |
| **Rate Limiting**     | API protection    | Prevent abuse, ensure fair usage       |

### Build & Bundle Process

#### Frontend (React SPA as Worker)

```bash
# 1. Vite builds React app to static files
pnpm run build  # → dist/ folder

# 2. Wrangler deploys with Worker wrapper
wrangler deploy  # → Serves SPA with routing
```

The frontend Worker (`frontendv2/src/index.js`) handles:

- Static asset serving from `ASSETS` binding
- SPA routing (returns index.html for client routes)
- Proper Content-Type headers
- 404 fallback for client-side routing

#### Backend Services (API Workers)

```bash
# 1. TypeScript compilation (type checking only)
tsc --noEmit

# 2. Wrangler bundles and deploys
wrangler deploy  # → Deploys TypeScript directly
```

Workers use:

- **Hono**: Lightweight router optimized for Workers
- **Direct TypeScript**: No build step needed
- **Tree shaking**: Automatic dead code elimination

### Environment Configuration (wrangler.toml)

```toml
# Core configuration
name = "mirubato-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Bindings for Cloudflare services
[[d1_databases]]
binding = "DB"
database_name = "mirubato-prod"
database_id = "31ecc854-aecf-4994-8bda-7a9cd3055122"

[[kv_namespaces]]
binding = "MUSIC_CATALOG"
id = "b04ae504f7884fc180d27c9320b378f6"

[[r2_buckets]]
binding = "SCORES_BUCKET"
bucket_name = "mirubato-scores-production"

# Advanced features
[ai]
binding = "AI"

[browser]
binding = "BROWSER"

[[queues.producers]]
binding = "PDF_QUEUE"
queue = "pdf-processing"
```

### Edge Computing Patterns

#### 1. Request Routing

```typescript
// All requests hit the nearest edge location
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Request handled at edge, not origin server
    return app.fetch(request, env)
  },
}
```

#### 2. Edge Caching Strategy

```typescript
// Multi-layer caching
const cache = caches.default // Cloudflare edge cache
const kvCache = env.KV // Application cache

// Check edge cache first
let response = await cache.match(request)
if (!response) {
  // Check KV cache
  const cached = await kvCache.get(key)
  if (cached) {
    response = new Response(cached)
  } else {
    // Generate fresh response
    response = await generateResponse()
    // Cache at both layers
    await Promise.all([
      cache.put(request, response.clone()),
      kvCache.put(key, response.clone().text(), { expirationTtl: 3600 }),
    ])
  }
}
```

#### 3. Database at the Edge (D1)

```typescript
// SQLite queries run at edge location
const results = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).all()

// Transactions supported
await env.DB.batch([
  env.DB.prepare('INSERT INTO logs...').bind(...),
  env.DB.prepare('UPDATE users...').bind(...)
])
```

#### 4. Async Processing (Queues)

```typescript
// Producer: Send to queue
await env.PDF_QUEUE.send({
  scoreId,
  userId,
  operation: 'extract-metadata',
})

// Consumer: Process in background
export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      await processScore(message.body)
      message.ack() // Mark as processed
    }
  },
}
```

### Service Communication

Services communicate via HTTP with JWT authentication:

```typescript
// API calling Scores service
const response = await fetch(`${env.SCORES_URL}/api/score/${id}`, {
  headers: {
    Authorization: `Bearer ${serviceToken}`,
    'Content-Type': 'application/json',
  },
})
```

### Zero-Downtime Deployments

Cloudflare handles deployments with:

1. **Gradual rollout**: New version deployed to subset of traffic
2. **Instant rollback**: Previous version kept warm
3. **No cold starts**: Workers stay warm across deployments
4. **Atomic updates**: All-or-nothing deployment

### Cost Optimization

- **Request pricing**: $0.50 per million requests
- **CPU pricing**: $0.02 per million CPU milliseconds
- **Included resources**:
  - 10M requests/month free
  - 30M CPU ms/month free
  - D1: 5GB storage free
  - R2: 10GB storage free

---

## 4. Cloudflare Operational Best Practices {#cloudflare-operations}

### Resource Limits & Optimization

| Resource                  | Limit                         | Best Practice                              |
| ------------------------- | ----------------------------- | ------------------------------------------ |
| **CPU Time**              | 50ms (Bundled), 30s (Unbound) | Use Streams API, implement caching         |
| **Memory**                | 128MB                         | Stream large data, use external storage    |
| **Script Size**           | 10MB compressed               | Tree-shake, lazy load, use dynamic imports |
| **Subrequests**           | 1000 per request              | Batch operations, use Promise.all()        |
| **Environment Variables** | 64 variables, 5KB each        | Use KV for larger config                   |
| **Response Size**         | No limit (streaming)          | Use TransformStream for large responses    |

### Caching Strategies

#### 1. Edge Cache (Cache API)

```typescript
// Cache at Cloudflare edge
const cache = caches.default
const cacheKey = new Request(request.url, request)
const cachedResponse = await cache.match(cacheKey)

if (cachedResponse) {
  return cachedResponse
}

const response = await generateResponse()
const responseToCache = response.clone()

// Cache with custom TTL
responseToCache.headers.set('Cache-Control', 'public, max-age=3600')
await cache.put(cacheKey, responseToCache)

return response
```

#### 2. KV Cache (Application Layer)

```typescript
// Application-level caching with KV
const cached = await env.CACHE.get(key, 'json')
if (cached && cached.expires > Date.now()) {
  return new Response(JSON.stringify(cached.data))
}

const data = await fetchData()
await env.CACHE.put(
  key,
  JSON.stringify({
    data,
    expires: Date.now() + 3600000, // 1 hour
  }),
  {
    expirationTtl: 3600,
  }
)
```

#### 3. Browser Cache Headers

```typescript
// Set proper cache headers
response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
response.headers.set('CDN-Cache-Control', 'max-age=86400')
response.headers.set('Vary', 'Accept-Encoding')
```

### Database Optimization (D1)

#### 1. Connection Pooling

```typescript
// D1 handles connection pooling automatically
// But batch operations when possible
const results = await env.DB.batch([
  env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(1),
  env.DB.prepare('SELECT * FROM scores WHERE user_id = ?').bind(1),
])
```

#### 2. Prepared Statements

```typescript
// Always use prepared statements
const stmt = env.DB.prepare('SELECT * FROM users WHERE email = ?')
const user = await stmt.bind(email).first()

// Reuse statements in loops
const updateStmt = env.DB.prepare(
  'UPDATE users SET last_login = ? WHERE id = ?'
)
for (const userId of userIds) {
  await updateStmt.bind(new Date().toISOString(), userId).run()
}
```

#### 3. Indexing Strategy

```sql
-- Create indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_logbook_user_date ON logbook(user_id, practice_date);
```

### Queue Processing Patterns

#### 1. Batch Processing

```typescript
export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    // Process messages in parallel
    await Promise.all(
      batch.messages.map(async message => {
        try {
          await processMessage(message.body, env)
          message.ack()
        } catch (error) {
          // Retry logic
          message.retry()
        }
      })
    )
  },
}
```

#### 2. Dead Letter Queue

```toml
# wrangler.toml
[[queues.consumers]]
queue = "pdf-processing"
max_retries = 3
dead_letter_queue = "pdf-processing-dlq"
```

### Security Best Practices

#### 1. Environment Variables

```bash
# Never commit secrets
wrangler secret put JWT_SECRET
wrangler secret put API_KEY

# Use different secrets per environment
wrangler secret put JWT_SECRET --env staging
wrangler secret put JWT_SECRET --env production
```

#### 2. CORS Configuration

```typescript
// Strict CORS for production
const corsHeaders = {
  'Access-Control-Allow-Origin': env.FRONTEND_URL,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}
```

#### 3. Rate Limiting

```typescript
// Use Cloudflare's rate limiter
const { success } = await env.RATE_LIMITER.limit({ key: userId })
if (!success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': '60' },
  })
}
```

### Monitoring & Alerting

#### 1. Custom Metrics

```typescript
// Log custom metrics
ctx.waitUntil(
  env.ANALYTICS.writeDataPoint({
    blobs: ['api_request', endpoint],
    doubles: [responseTime, responseSize],
    indexes: [userId, statusCode.toString()],
  })
)
```

#### 2. Error Boundaries

```typescript
// Global error handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      return await app.fetch(request, env, ctx)
    } catch (error) {
      // Log error
      console.error('Unhandled error:', error)

      // Report to monitoring
      ctx.waitUntil(reportError(error, request, env))

      // Return user-friendly error
      return new Response('Something went wrong', { status: 500 })
    }
  },
}
```

### Performance Patterns

#### 1. Streaming Responses

```typescript
// Stream large responses
const { readable, writable } = new TransformStream()
const writer = writable.getWriter()

// Start streaming immediately
ctx.waitUntil(streamData(writer, env).finally(() => writer.close()))

return new Response(readable, {
  headers: { 'Content-Type': 'application/json' },
})
```

#### 2. Early Hints

```typescript
// Send early hints for critical resources
return new Response(body, {
  headers: {
    Link: '</static/app.css>; rel=preload; as=style, </static/app.js>; rel=preload; as=script',
  },
})
```

#### 3. Service Bindings (Future)

```toml
# Direct worker-to-worker communication
[[services]]
binding = "SCORES_SERVICE"
service = "mirubato-scores"
```

---

## 5. Development Workflow {#development-workflow}

### Before Starting Work - Checklist

- [ ] Pull latest from main: `git pull origin main`
- [ ] Create feature branch: `git checkout -b feature/your-feature`
- [ ] Install dependencies: `pnpm install`
- [ ] Start services: `./start-scorebook.sh`
- [ ] Check health endpoints

### Development Flow

```
1. Write Tests First (TDD)
   └── Create test file
   └── Write failing tests
   └── Implement feature
   └── Make tests pass

2. Development
   └── Use component library
   └── Follow TypeScript types
   └── No console.log
   └── No 'any' types

3. Before Commit
   └── Run tests: pnpm test
   └── Check types: pnpm run type-check
   └── Let hooks run (no --no-verify)
   └── Update docs if needed
```

### Local Development URLs

| Service    | URL                                       | Port |
| ---------- | ----------------------------------------- | ---- |
| Frontend   | http://www-mirubato.localhost:4000        | 4000 |
| API        | http://api-mirubato.localhost:9797        | 9797 |
| Scores     | http://scores-mirubato.localhost:9788     | 9788 |
| Dictionary | http://dictionary-mirubato.localhost:9799 | 9799 |

---

## 5. Testing Guidelines {#testing-guidelines}

### Test-Driven Development (TDD)

```bash
# 1. Create test file first
touch src/components/MyComponent.test.tsx

# 2. Write tests that define behavior
# 3. Run tests (should fail)
pnpm test

# 4. Implement feature
# 5. Make tests pass
# 6. Check coverage
pnpm test -- --coverage
```

### Coverage Requirements

- **Minimum**: 80% overall coverage
- **Critical paths**: 90% (auth, payments)
- **New features**: Must have tests before merge

### Running Tests

```bash
# All tests
pnpm test

# With coverage
pnpm run test:coverage

# Specific file
pnpm test -- src/utils/audioManager.test.ts

# E2E tests
pnpm run test:e2e

# Watch mode
pnpm test -- --watch
```

---

## 6. Cloudflare Deployment & Operations {#cloudflare-deployment}

### Deployment Architecture

```
GitHub Push → GitHub Actions → Wrangler CLI → Cloudflare Edge
     │              │                │              │
     └── Trigger    └── Build/Test   └── Deploy    └── Global Distribution
```

### Wrangler CLI - The Deployment Tool

```bash
# Install globally
npm install -g wrangler

# Authenticate (one-time)
wrangler login

# Deploy commands
wrangler deploy              # Production deployment
wrangler deploy --env staging # Staging deployment
wrangler dev                 # Local development server
```

### Local Development with Wrangler

```bash
# Start local development (mimics Cloudflare environment)
cd api && wrangler dev --port 9797 --env local --local-protocol http

# Key flags explained:
# --local: Use local D1/KV/R2 instead of remote
# --port: Specify port number
# --env: Use environment config from wrangler.toml
# --local-protocol: Use HTTP for local development
```

### Multi-Environment Strategy

Each service has 3-4 environments:

| Environment    | Purpose                | Custom Domain        | Persistence |
| -------------- | ---------------------- | -------------------- | ----------- |
| **local**      | Developer machine      | \*.localhost         | Ephemeral   |
| **staging**    | Pre-production testing | staging.mirubato.com | Persistent  |
| **production** | Live users             | mirubato.com         | Persistent  |

### Database Operations with D1

#### Migrations

```bash
# Create migration
wrangler d1 migrations create DB "add_user_preferences"

# Apply migrations
wrangler d1 migrations apply DB --local      # Local
wrangler d1 migrations apply DB --env staging # Staging
wrangler d1 migrations apply DB              # Production

# Safe migration script (with backups)
cd api/scripts && ./safe-migrate.sh --env production
```

#### Database Backups

```bash
# Export database
wrangler d1 export DB --output backup.sql --env production

# Query database directly
wrangler d1 execute DB --command "SELECT COUNT(*) FROM users" --env production
```

### Object Storage with R2

```bash
# Create bucket
wrangler r2 bucket create mirubato-scores-production

# List buckets
wrangler r2 bucket list

# Upload file directly
wrangler r2 object put mirubato-scores-production/test.pdf --file ./test.pdf
```

### KV Namespace Operations

```bash
# Create namespace
wrangler kv:namespace create "MUSIC_CATALOG"

# Write to KV
wrangler kv:key put --binding MUSIC_CATALOG "key" "value"

# List keys
wrangler kv:key list --binding MUSIC_CATALOG --prefix "user:"
```

### Deployment Best Practices

#### 1. Blue-Green Deployments

```bash
# Deploy to staging first
wrangler deploy --env staging

# Test staging thoroughly
# Then deploy to production
wrangler deploy --env production
```

#### 2. Rollback Strategy

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [deployment-id]

# Or use GitHub to revert and redeploy
git revert HEAD && git push
```

#### 3. Gradual Rollouts

```toml
# wrangler.toml
[env.production]
# Gradual rollout configuration
routes = [
  { pattern = "mirubato.com/*", zone_name = "mirubato.com" }
]

# Use Cloudflare's percentage-based routing in dashboard
```

### Secrets Management

```bash
# Set secrets (never commit these!)
wrangler secret put JWT_SECRET --env production
wrangler secret put MAGIC_LINK_SECRET --env production
wrangler secret put SENDGRID_API_KEY --env production

# List secrets (names only, not values)
wrangler secret list --env production

# Delete secret
wrangler secret delete JWT_SECRET --env production
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3

      - run: pnpm install
      - run: pnpm test
      - run: pnpm run build

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

### Monitoring Deployments

#### Real-time Logs

```bash
# Tail production logs
wrangler tail --env production

# Filter logs
wrangler tail --env production --search "error"

# Format as JSON
wrangler tail --env production --format json
```

#### Deployment Status

```bash
# Check deployment status
wrangler deployments list

# View deployment details
wrangler deployments view [deployment-id]
```

### Performance Optimization

#### 1. Bundle Size Optimization

```toml
# wrangler.toml
[build]
command = "pnpm run build"

[build.upload]
format = "modules"
main = "./src/index.ts"

# Minimize bundle
[minify]
minify = true
```

#### 2. Smart Placement

```toml
# Optimize for specific regions
[placement]
mode = "smart"
hint = "us-east"  # Primary user base location
```

### Cost Monitoring

```bash
# View usage metrics
wrangler analytics engine --account-id [id]

# Check limits
wrangler limits
```

### Environment URLs & Health Checks

| Service    | Local                                            | Staging                                        | Production                             |
| ---------- | ------------------------------------------------ | ---------------------------------------------- | -------------------------------------- |
| Frontend   | http://www-mirubato.localhost:4000               | https://staging.mirubato.com                   | https://mirubato.com                   |
| API        | http://api-mirubato.localhost:9797/health        | https://api-staging.mirubato.com/health        | https://api.mirubato.com/health        |
| Scores     | http://scores-mirubato.localhost:9788/health     | https://scores-staging.mirubato.com/health     | https://scores.mirubato.com/health     |
| Dictionary | http://dictionary-mirubato.localhost:9799/health | https://dictionary-staging.mirubato.com/health | https://dictionary.mirubato.com/health |

---

## 7. Core Features {#core-features}

### Logbook - Practice Tracking

- Manual entry and timer modes
- Calendar heatmap visualization
- Advanced filtering and analytics
- CSV/JSON export
- Auto-logging integration

### Scorebook - Sheet Music Library

- PDF and image upload
- AI metadata extraction
- Collections and organization
- Practice integration
- Public/private libraries

### Repertoire & Goals System

Track musical progress with:

- **Status tracking**: Planned → Learning → Working → Polished → Performance Ready
- **Goal integration**: Link goals to specific pieces
- **Practice history**: View all sessions per piece
- **Auto-prompt**: Add pieces after practice

### Toolbox - Practice Tools

- **Metronome**: Multiple patterns, auto-logging
- **Circle of Fifths**: Interactive theory tool
- **Practice Counter**: Visual repetition tracking

---

## 8. UI Components {#ui-components}

### Component Library Usage

```tsx
// ❌ NEVER do this
;<button>Click me</button>

// ✅ ALWAYS do this
import { Button } from '@/components/ui'
;<Button>Click me</Button>
```

### Available Components

| Component | Variants                                | Usage              |
| --------- | --------------------------------------- | ------------------ |
| Button    | primary, secondary, ghost, danger, icon | Actions, forms     |
| Modal     | sm, md, lg, xl                          | Dialogs, forms     |
| Card      | default, bordered, elevated, ghost      | Content containers |
| Input     | text, email, password, number           | Form fields        |
| Select    | single, multi                           | Dropdowns          |
| Toast     | success, error, warning, info           | Notifications      |
| Loading   | spinner, dots, pulse, skeleton          | Loading states     |

### Typography Design System (Updated v1.7.2)

**✅ FULLY IMPLEMENTED**: Comprehensive typography unification completed in v1.7.2 with centralized component system and ESLint enforcement.

Based on extensive research using Gemini AI for multilingual font selection, Mirubato uses a three-font system:

**Font Families**:

- **Noto Serif** (`font-serif`): Music piece titles and composers (excellent multilingual support for Latin, CJK characters)
- **Inter** (`font-inter`): UI elements, metadata, body text
- **Lexend** (`font-lexend`): Headers and section titles

**Implementation Strategy**:

```tsx
// ✅ ALWAYS use Typography components for music content
import { MusicTitle, MusicComposer, MusicMetadata } from '@/components/ui'

// Music content
<MusicTitle>{score.title}</MusicTitle>
<MusicComposer>{score.composer}</MusicComposer>
<MusicMetadata>Opus 1</MusicMetadata>

// General typography with semantic variants
<Typography variant="h1">Page Title</Typography>
<Typography variant="body">UI content</Typography>
```

**Typography Hierarchy**:

1. **Music Titles**: Noto Serif, `text-lg sm:text-xl font-medium` - Use `<MusicTitle>` component
2. **Music Composers**: Noto Serif, `text-base font-normal` - Use `<MusicComposer>` component
3. **Section Headers**: Lexend, `text-xl font-light` - Use `<Typography variant="h2">`
4. **UI Text**: Inter, `text-sm text-gray-600` - Use `<Typography variant="body">`
5. **Metadata**: Inter, `text-xs text-gray-500` - Use `<MusicMetadata>` component

**Performance Optimization**:

- Font loading reduced by 40% (300KB → 180KB)
- Optimized Google Fonts URL with only required weights
- ESLint rules prevent regression to generic font classes

**ESLint Integration**:

```javascript
// Custom rules prevent typography inconsistencies
'no-restricted-syntax': [
  'error',
  {
    selector: 'JSXAttribute[name.name="className"] Literal[value=/font-(sans|mono)\\b/]',
    message: 'Use font-inter for UI text, font-lexend for headers, or font-serif for music content instead of generic font classes.'
  }
]
```

**Design Rationale**:

- Noto Serif provides academic/classical feel appropriate for music education
- Creates visual contrast between content (serif) and UI (sans-serif)
- Aligns with Morandi aesthetic - sophisticated without being flashy
- Ensures readability across all supported languages
- **Centralized maintenance** through Typography component system
- **Developer experience** improved with semantic components and linting

### Chart.js Integration

```typescript
// Proper typing pattern
const chartData = useMemo<ChartData<'line'>>(
  () => ({
    labels: dates,
    datasets: [
      {
        label: 'Practice Time',
        data: values,
        borderColor: 'rgb(75, 192, 192)',
      },
    ],
  }),
  [dates, values]
)

// Never use 'any'
// ❌ const chartData: any = {...}
// ✅ const chartData: ChartData<'line'> = {...}
```

---

## 9. API Reference {#api-reference}

### REST Endpoints

```typescript
// Authentication
POST   /api/auth/google      // Google OAuth
POST   /api/auth/magic-link  // Send magic link
GET    /api/auth/verify      // Verify magic link

// Logbook
GET    /api/logbook          // Get entries
POST   /api/logbook          // Create entry
PUT    /api/logbook/:id      // Update entry
DELETE /api/logbook/:id      // Delete entry

// Repertoire
GET    /api/repertoire       // Get repertoire
POST   /api/repertoire       // Add to repertoire
PUT    /api/repertoire/:id   // Update status

// Goals
GET    /api/goals            // Get goals
POST   /api/goals            // Create goal
PUT    /api/goals/:id        // Update progress
```

### Health Endpoints

- `/health` - Comprehensive health check
- `/livez` - Liveness probe
- `/readyz` - Readiness probe
- `/metrics` - Prometheus metrics

---

## 10. Internationalization {#internationalization}

### Supported Languages

- 🇺🇸 English (en) - Reference
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇹🇼 Traditional Chinese (zh-TW)
- 🇨🇳 Simplified Chinese (zh-CN)

### Translation Workflow

```bash
# 1. Add English key first
# Edit: src/locales/en/common.json

# 2. Sync to other languages
pnpm run sync:i18n

# 3. Validate completeness
pnpm run validate:i18n

# 4. Fix and sort
pnpm run i18n:fix
```

### Usage in Code

```tsx
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation('common')

  return <Button>{t('button.save')}</Button>
}
```

---

## 11. Cloudflare Debugging & Monitoring {#cloudflare-debugging}

### Cloudflare-Specific Debug Tools

#### 1. Wrangler Tail (Real-time Logs)

```bash
# Stream logs from production
wrangler tail --env production

# Filter for errors only
wrangler tail --env production --search "error" --status 500

# Format as JSON for parsing
wrangler tail --env production --format json | jq '.'

# Save logs to file
wrangler tail --env production > debug.log
```

#### 2. Local Debugging with Miniflare

```bash
# Run with debug output
wrangler dev --local --log-level debug

# Inspect bindings
wrangler dev --local --inspect

# Test with production-like environment
wrangler dev --env staging --remote
```

#### 3. Workers Analytics

```typescript
// Add custom analytics
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const start = Date.now()

    try {
      const response = await handleRequest(request, env)

      // Log to Analytics Engine
      env.ANALYTICS.writeDataPoint({
        blobs: [request.url],
        doubles: [Date.now() - start],
        indexes: [response.status.toString()],
      })

      return response
    } catch (error) {
      // Error tracking
      console.error('Worker error:', error)
      return new Response('Internal Error', { status: 500 })
    }
  },
}
```

### Common Cloudflare Issues & Solutions

| Problem                      | Symptoms                                 | Solution                                               |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| **CPU Limit Exceeded**       | 503 errors, "Worker exceeded CPU limits" | Optimize code, use Streams API, implement caching      |
| **Memory Limit Hit**         | Worker crashes, 500 errors               | Reduce in-memory data, use KV/D1 for storage           |
| **Subrequest Limit**         | "Too many subrequests" error             | Batch requests, use Promise.all()                      |
| **Script Size Too Large**    | Deployment fails                         | Tree-shake dependencies, lazy load modules             |
| **D1 Query Timeout**         | Database queries fail                    | Add indexes, optimize queries, use prepared statements |
| **KV Eventually Consistent** | Stale data after writes                  | Use cache.waitUntil(), implement read-after-write      |
| **R2 Upload Fails**          | Large file uploads timeout               | Use multipart uploads, stream data                     |

### Debug Headers

Add debug headers to trace requests:

```typescript
// Add tracing headers
response.headers.set('X-Worker-Version', env.WORKER_VERSION)
response.headers.set('X-Request-ID', crypto.randomUUID())
response.headers.set('X-Edge-Location', request.cf?.colo || 'unknown')
response.headers.set('X-Processing-Time', `${Date.now() - start}ms`)
```

### Performance Profiling

#### 1. Measure Worker Performance

```typescript
const metrics = {
  dbTime: 0,
  cacheTime: 0,
  computeTime: 0,
}

// Measure database query
const dbStart = performance.now()
const result = await env.DB.prepare(query).all()
metrics.dbTime = performance.now() - dbStart

// Log metrics
console.log('Performance:', metrics)
```

#### 2. Identify Bottlenecks

```bash
# Check Worker CPU time
wrangler tail --format json | jq '.outcome.cpuTime'

# Monitor subrequests
wrangler tail --format json | jq '.outcome.subrequests'
```

### Cloudflare Dashboard Debugging

1. **Workers & Pages** → Select service → **Logs** tab
2. **Analytics** → View request patterns and errors
3. **Real-time Logs** → Stream live requests
4. **Metrics** → CPU time, duration, subrequests

### Environment-Specific Debugging

```typescript
// Add environment-aware debugging
if (env.ENVIRONMENT === 'staging' || env.ENVIRONMENT === 'local') {
  console.log('Request:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers),
    cf: request.cf,
  })
}
```

### Testing Cloudflare Features Locally

```bash
# Test D1 database locally
wrangler d1 execute DB --local --command "SELECT * FROM users"

# Test KV locally
wrangler kv:key put --binding CACHE "test" "value" --local

# Test R2 locally
wrangler r2 object put BUCKET "test.txt" --local --file ./test.txt
```

### Error Tracking Integration

```typescript
// Sentry-style error tracking
async function reportError(error: Error, request: Request, env: Env) {
  const errorData = {
    message: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT,
    cf: request.cf,
  }

  // Store in KV for analysis
  await env.ERRORS.put(
    `error:${Date.now()}`,
    JSON.stringify(errorData),
    { expirationTtl: 86400 * 7 } // 7 days
  )
}
```

### Health Check Endpoints

Every service should implement:

```typescript
// Comprehensive health check
app.get('/health', async c => {
  const checks = {
    service: 'api',
    version: c.env.WORKER_VERSION,
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      cache: 'unknown',
      external: 'unknown',
    },
  }

  // Check D1
  try {
    await c.env.DB.prepare('SELECT 1').first()
    checks.checks.database = 'healthy'
  } catch {
    checks.checks.database = 'unhealthy'
  }

  // Check KV
  try {
    await c.env.CACHE.get('health-check')
    checks.checks.cache = 'healthy'
  } catch {
    checks.checks.cache = 'unhealthy'
  }

  const isHealthy = Object.values(checks.checks).every(v => v === 'healthy')
  return c.json(checks, isHealthy ? 200 : 503)
})
```

### Quick Debug URLs

| Check                   | URL                                                   |
| ----------------------- | ----------------------------------------------------- |
| API Health              | https://api.mirubato.com/health                       |
| API Metrics             | https://api.mirubato.com/metrics                      |
| Frontend Version        | https://mirubato.com/ (check X-Worker-Version header) |
| Scores Queue Status     | https://scores.mirubato.com/health                    |
| Dictionary Cache Status | https://dictionary.mirubato.com/health                |

---

## 12. Educational Context {#educational-context}

### Sight-Reading Method

- **Keep Going**: Don't stop for mistakes
- **Progressive**: Gradual difficulty increase
- **Instrument-Specific**: Respect guitar vs piano differences

### Content Licensing

- Educational content: CC BY 4.0 (attribute properly)
- Code: MIT License
- Music: Public domain from IMSLP

---

## 13. Version History {#version-history}

### Current Version: 1.7.1 (July 2025)

#### Automatic Sync Implementation (PR #379)

- **Fixed race condition**: Added `isAuthInitialized` flag to prevent sync before auth completes
- **Automatic sync triggers**:
  - On tab/window focus
  - On route change
  - Every 30 seconds when authenticated
  - When coming back online
- **Manual sync options**:
  - Sync indicator button in sidebar
  - Pull-to-refresh on mobile devices
- **Visual feedback**: Real-time sync status indicator with icons and timing
- **Debouncing**: 5-second debounce to prevent excessive sync calls

### Previous Version: 1.7.0 (July 2025)

#### Focused UI Design System (PR #261)

- New layout: Desktop sidebar + mobile bottom tabs
- Simplified navigation: 6 → 4 sections
- Practice timer feature
- Enhanced repertoire timeline
- Complete i18n (200+ translations fixed)

#### Mobile UI Improvements (PR #357)

- **Typography Enhancement**: Added Noto Serif font for better multilingual support
- **Vertical Layout**: Optimized for small screens (iPhone SE and up)
- **Expandable Details**: View-only mode with Eye icon for full entry details
- **Day Separators**: Clear visual distinction between practice days
- **Icon Consistency**: Replaced emojis with Tabler Icons throughout
- **Touch Targets**: Improved to 44x44px for better accessibility

#### Security & Infrastructure

- Fixed tar-fs, ws, esbuild vulnerabilities
- All services unified at v1.7.0
- Migrated from npm to pnpm
- @cloudflare/puppeteer downgraded to 0.0.11

[Previous versions moved to CHANGELOG.md]

---

## Quick Decision Trees

### "Which command should I use?"

```
Need to...
├── Start development → ./start-scorebook.sh
├── Run tests → pnpm test
├── Deploy to staging → wrangler deploy --env staging
├── Deploy to production → wrangler deploy
├── Add translations → pnpm run sync:i18n
└── Debug issues → Check /health endpoints first
```

### "Where is the code for...?"

```
Feature location...
├── UI Components → frontendv2/src/components/ui/
├── API Routes → api/src/api/routes.ts
├── Practice Logging → frontendv2/src/components/logbook/
├── Sheet Music → scores/src/
├── Translations → frontendv2/src/locales/
└── Tests → [feature]/__tests__/ or [feature].test.ts
```

### "Which Cloudflare service for...?"

```
Need to store...
├── User data/metadata → D1 (SQL database)
├── Files (PDFs, images) → R2 (object storage)
├── Session/cache data → KV (key-value store)
├── Temporary data → TransformStream in memory
├── Configuration → Environment variables or KV
└── Logs/metrics → Analytics Engine

Need to process...
├── Async/background tasks → Queues
├── AI/ML operations → Workers AI
├── PDF rendering → Browser Rendering API
├── Real-time data → WebSockets (Durable Objects)
├── Scheduled tasks → Cron Triggers
└── Image manipulation → Image Resizing API
```

### "How to debug Cloudflare issues?"

```
Issue type...
├── 500 errors → wrangler tail --env production
├── Performance → Check CPU time in logs
├── Database → wrangler d1 execute --command "EXPLAIN QUERY PLAN..."
├── Cache issues → Check KV TTL and Cache-Control headers
├── Deploy failed → Check bundle size and script limits
└── Auth issues → Verify JWT secret in environment
```

---

## Additional Resources

- **Detailed Docs**: See `/docs` folder
- **Roadmap**: `docs/ROADMAP.md`
- **Architecture**: `docs/DESIGN.md`
- **Debug Guide**: `docs/DEBUG.md`
- **User Flows**: `docs/USER_FLOWS.md`

## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI:

```bash
# Analyze entire codebase
gemini -p "@./ Give me an overview of this project"

# Check implementation
gemini -p "@src/ @lib/ Has dark mode been implemented?"

# Verify patterns
gemini -p "@src/ List all React hooks that handle WebSocket connections"
```

**Remember**: When in doubt, check the production endpoints first. They're your debugging lifeline.
