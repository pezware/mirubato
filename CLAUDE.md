# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
git clone https://github.com/pezware/mirubato.git
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
pnpm test                     # Run all tests across workspaces
pnpm run build                # Build all services for production

# Individual services (debugging)
cd frontendv2 && pnpm run dev  # Frontend only
cd api && pnpm run dev         # API only
cd scores && pnpm run dev      # Scores service only
cd dictionary && pnpm run dev  # Dictionary service only
cd sync-worker && pnpm run dev # Sync service (if needed)

# Testing
pnpm test                     # All tests
pnpm run test:unit            # Unit tests only
pnpm run test:integration     # Integration tests only
pnpm run test:coverage        # Tests with coverage report
pnpm test -- src/specific.test.ts  # Single test file

# Linting & Type Checking
pnpm run lint                 # Lint all workspaces
pnpm run type-check           # TypeScript type checking
pnpm run format               # Format with Prettier

# Internationalization
cd frontendv2 && pnpm run sync:i18n     # Sync translations
cd frontendv2 && pnpm run validate:i18n # Validate completeness
cd frontendv2 && pnpm run i18n:fix      # Fix and sort keys

# Deployment
cd [service] && wrangler deploy --env staging  # Deploy to staging
cd [service] && wrangler deploy                # Deploy to production
```

### Key Principles - MUST READ

1. **Test First**: Write tests before implementation
2. **Use Component Library**: Never use native HTML elements - always import from `@/components/ui`
3. **Check Branch**: Never edit on main branch - create feature branches
4. **Run Hooks**: Never skip pre-commit hooks with `--no-verify` - they run linting and tests
5. **Use ast-grep**: For syntax-aware code searches
6. **Monorepo Structure**: Use workspace commands (`pnpm -r`) for cross-workspace operations
7. **TypeScript Strict**: No `any` types, always use proper typing
8. **Pre-commit Quality**: Husky runs lint-staged which lints and tests only changed files

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
    ┌─────────────────┼─────────────┬────────────────┬────────────────┐
    │                 │             │                │                │
┌───▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐
│  Frontend     │  │   API       │  │   Scores    │  │ Dictionary  │  │ Sync Worker │
│  Worker       │  │   Worker    │  │   Worker    │  │   Worker    │  │   Worker    │
│ (Static SPA)  │  │ (REST API)  │  │ (PDF/AI)    │  │ (Lookup)    │  │ (Real-time) │
└───┬──────────┘  └──┬──────────┘  └──┬──────────┘  └──┬──────────┘  └──┬──────────┘
    │                 │                 │                 │                 │
┌───▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐
│ Assets (CDN)  │  │ D1 Database │  │ D1 + R2     │  │ D1 Database │  │ D1 Database │
│               │  │ KV Cache    │  │ KV + Queue  │  │ KV Cache    │  │ WebSockets  │
└───────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
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

## 4. Development Workflow {#development-workflow}

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

| Service    | URL                                       | Port | Health Check |
| ---------- | ----------------------------------------- | ---- | ------------ |
| Frontend   | http://www-mirubato.localhost:4000        | 4000 | N/A (SPA)    |
| API        | http://api-mirubato.localhost:9797        | 9797 | /health      |
| Scores     | http://scores-mirubato.localhost:9788     | 9788 | /health      |
| Dictionary | http://dictionary-mirubato.localhost:9799 | 9799 | /health      |

**Note**: The `./start-scorebook.sh` script automatically starts API and Scores services first, seeds test data, then starts the frontend.

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
# All tests across all workspaces
pnpm test

# Unit tests only (faster)
pnpm run test:unit

# Integration tests
pnpm run test:integration

# With coverage report
pnpm run test:coverage

# Specific workspace
cd frontendv2 && pnpm test
cd api && pnpm test

# Specific test file
cd frontendv2 && pnpm test -- src/utils/audioManager.test.ts

# E2E tests (Playwright)
cd frontendv2 && pnpm run test:e2e

# Watch mode for development
cd frontendv2 && pnpm test -- --watch

# Related tests only (lint-staged integration)
cd frontendv2 && vitest related --run --no-coverage --passWithNoTests
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
- Consolidated entry display with collapsible notes
- Calendar heatmap visualization
- Advanced filtering and analytics
- CSV/JSON export
- Auto-logging integration
- **Real-time WebSocket sync**: Instant synchronization across devices (replaced 30-second polling)
- Offline queue with automatic retry
- Daily practice totals in date separators

### Scorebook - Sheet Music Library

- PDF and image upload
- AI metadata extraction
- Collections and organization
- Practice integration
- Public/private libraries

### Repertoire & Goals System

Track musical progress with:

- **Status tracking**: Planned → Learning → Working → Polished → Performance Ready
- **Status change history**: Automatic tracking in personal notes with timestamps
- **Goal integration**: Link goals to specific pieces
- **Practice history**: View all sessions per piece
- **Auto-prompt**: Add pieces after practice
- **Composer canonicalization**: Standardized composer names with autocomplete
- **Duplicate management**: Comprehensive system for handling duplicate pieces

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

### Typography Design System (Updated v1.7.6)

**✅ FULLY IMPLEMENTED**: Comprehensive typography unification completed in v1.7.6 with centralized component system and ESLint enforcement.

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

### Current Version: 1.7.6 (August 2025)

#### Real-time WebSocket Sync Implementation

- **Replaced 30-second polling**: Removed auto-sync mechanism in favor of real-time WebSocket sync
- **WebSocket Infrastructure**: Fully implemented WebSocket client in `webSocketSync.ts`
- **Sync Worker Service**: Dedicated Cloudflare Worker with Durable Objects for real-time sync
- **Improved Performance**: Instant data synchronization across devices without polling overhead
- **Offline Queue**: Automatic queuing and retry of sync events when connection is lost
- **Conflict Resolution**: Timestamp-based conflict resolution for concurrent edits
- **Backward Compatibility**: Manual sync remains available as fallback option

#### Version Management Improvements

- **Unified Version System**: Created centralized version.json for single source of truth
- **Consistent Versioning**: All services updated to v1.7.6 (sync-worker and service-template aligned)
- **Version Module**: All services now import from central version.json
- **Automated Updates**: Script for future version bumps across entire codebase

### Version 1.7.1

#### Sync System Improvements

- **New Sync Worker Service**: Dedicated Cloudflare Worker for real-time synchronization
- **Enhanced Reliability**: Database persistence and sync recovery capabilities
- **Data Loss Prevention**: Improved validation and error handling
- **Auto-sync Implementation**: Automatic synchronization on data changes

#### UI/UX Enhancements

- **Consolidated Logbook Display**: Removed split view in favor of unified interface
- **Mobile Experience**: Fixed issues #519-#527 for improved mobile usability
- **Collapsible Notes**: Notes section collapsed by default with expand option
- **Type Safety**: Enhanced custom instruments support with better typing

#### Code Quality

- **Composer Canonicalization**: Standardized composer names across all services
- **Code Organization**: Eliminated redundant code and standardized utilities
- **Test Coverage**: Enhanced E2E tests with data-testid attributes

### Version 1.7.0 (July 2025)

#### Focused UI Design System

- New layout: Desktop sidebar + mobile bottom tabs
- Simplified navigation: 6 → 4 sections
- Practice timer feature
- Enhanced repertoire timeline
- Complete i18n (200+ translations fixed)

#### Security & Infrastructure

- Fixed tar-fs, ws, esbuild vulnerabilities
- All services unified at v1.7.6
- Migrated from npm to pnpm
- @cloudflare/puppeteer downgraded to 0.0.11

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
├── UI Components → frontendv2/src/components/
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

# Check implementation across specific workspaces
gemini -p "@frontendv2/src/ @api/src/ Has authentication been implemented?"

# Verify patterns in frontend
gemini -p "@frontendv2/src/ List all React hooks that handle WebSocket connections"

# Check Cloudflare Workers patterns
gemini -p "@api/src/ @scores/src/ @dictionary/src/ Show all Hono route handlers"

# Analyze test coverage
gemini -p "@frontendv2/src/ @*/src/**/*.test.* What components lack test coverage?"
```

## Workspace Structure

Mirubato uses pnpm workspaces with the following structure:

```
mirubato/
├── frontendv2/          # React SPA (Vite + TypeScript)
├── api/                 # Main API Worker (Hono + D1)
├── scores/              # Sheet Music Worker (PDF + AI)
├── dictionary/          # Music Terms Worker (AI + KV)
├── sync-worker/         # Real-time Sync Worker (WebSockets + D1)
└── package.json         # Root workspace configuration
```

**Workspace Commands**:

```bash
pnpm -r run build        # Run build in all workspaces
pnpm -r run test         # Run tests in all workspaces
pnpm --filter @mirubato/frontendv2 run dev  # Run specific workspace
```

**Remember**: When in doubt, check the production endpoints first. They're your debugging lifeline.

## Debugging UI Component Issues

### Efficient Component Location Strategy

When trying to locate specific UI components (especially when multiple similar components exist):

#### 1. Start with the Route/Page Structure

```bash
# Find the page component for a specific route
grep -r "tab=repertoire" --include="*.tsx"
# Or check the routing configuration
grep -r "path.*logbook" frontendv2/src
```

#### 2. Follow the Component Hierarchy

```bash
# Trace from parent to child components
# Example: Logbook → EnhancedReports → RepertoireView → FocusedRepertoireItem
grep -r "EnhancedReports" --include="*.tsx"
grep -r "RepertoireView" --include="*.tsx"
```

#### 3. Identify View Modes

Many components have different display modes (list/grid/calendar). Check for:

```typescript
viewMode === 'list' ? <FocusedRepertoireItem /> : <RepertoireCard />
```

#### 4. Search for Visual Patterns

If you see specific text patterns in the UI (e.g., "Composer - Title"):

```bash
# Search for concatenation patterns
grep -r "scoreComposer.*-.*scoreTitle" --include="*.tsx"
grep -r '\${.*composer.*}.*-.*\${.*title' --include="*.tsx"
ast-grep --pattern '$COMPOSER - $TITLE' --lang typescript
```

#### 5. Use Component Names Effectively

When multiple components serve similar purposes:

- `RepertoireCard` - Grid view display
- `FocusedRepertoireItem` - List view display
- `PieceDetailView` - Detailed view
- `CompactEntryRow` - Compact display in entries

### Common Pitfalls to Avoid

1. **Don't assume based on URL parameters** - A URL with `pieceId` doesn't necessarily mean you're in detail view
2. **Check for responsive variations** - Same component might render differently on mobile vs desktop
3. **Verify component reuse** - Same component might be used in multiple places with different props
4. **Don't skip the parent component** - Always trace from the page component down

### Quick Debugging Commands

```bash
# Find all components rendering a specific prop
ast-grep --pattern 'scoreTitle' --lang typescript frontendv2/src

# Find component usage across codebase
grep -r "<FocusedRepertoireItem\|<RepertoireCard\|<PieceDetailView" --include="*.tsx"

# Check what renders based on conditions
grep -r "viewMode.*===.*list" --include="*.tsx" -A 5 -B 2

# Find Typography component usage
grep -r "MusicTitle\|MusicComposer" --include="*.tsx"
```

### Browser DevTools Integration

When available, ask to check:

- React DevTools to see component hierarchy
- Inspect element to see actual rendered HTML classes
- Network tab to verify which API endpoints are being called

### Systematic Approach Checklist

- [ ] Identify the route/URL pattern
- [ ] Find the page component
- [ ] Trace component hierarchy
- [ ] Check for view modes/conditions
- [ ] Search for visual text patterns
- [ ] Verify in browser DevTools if needed
