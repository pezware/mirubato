# Infrastructure Components and Setup

## Overview

This document outlines all the infrastructure components required for developing, testing, and deploying Mirubato, the open-source sight-reading platform.

## Core Infrastructure Stack

### 1. Development Environment

#### Required Software

```bash
# Node.js Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20.11.0  # LTS version
nvm use 20.11.0

# Package Manager
npm install -g pnpm@8.15.0  # Faster than npm, handles workspaces well

# Development Tools
npm install -g typescript@5.3.0
npm install -g @cloudflare/wrangler@3.0.0
npm install -g @playwright/test@1.40.0
```

#### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "prettier": "^3.2.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.2.0",
    "vitest": "^1.2.0",
    "@vitest/ui": "^1.2.0",
    "jsdom": "^23.2.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.2.0",
    "@testing-library/user-event": "^14.5.0",
    "vite": "^5.0.0"
  }
}
```

### 2. Backend Infrastructure

#### GraphQL Backend with Apollo Server

```typescript
// backend/src/index.ts
import { ApolloServer } from '@apollo/server'
import { startServerAndCreateCloudflareWorkersHandler } from '@as-integrations/cloudflare-workers'
import { schema } from './schema'
import { resolvers } from './resolvers'
import { createContext } from './types/context'

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const server = new ApolloServer({
      typeDefs: schema,
      resolvers,
      introspection: env.ENVIRONMENT !== 'production',
    })

    const handler = startServerAndCreateCloudflareWorkersHandler(server, {
      context: async ({ request }) => createContext({ request, env }),
    })

    return handler(request, env, ctx)
  },
}
```

#### Backend Project Structure

```
backend/
├── src/
│   ├── __tests__/           # Test files
│   │   ├── unit/
│   │   └── integration/
│   ├── resolvers/           # GraphQL resolvers
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── practice.ts
│   │   └── sheetMusic.ts
│   ├── services/            # Business logic
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── email.ts
│   │   └── rateLimiter.ts
│   ├── schema/              # GraphQL schema
│   │   └── schema.graphql
│   ├── types/               # TypeScript types
│   │   ├── context.ts
│   │   ├── generated/       # Generated from GraphQL
│   │   └── shared.ts
│   ├── utils/               # Utilities
│   └── index.ts             # Entry point
├── migrations/              # D1 database migrations
├── wrangler.toml           # Cloudflare Workers config
├── codegen.yml             # GraphQL code generation
└── package.json
```

#### Backend Dependencies

```json
{
  "dependencies": {
    "@apollo/server": "^4.10.0",
    "@as-integrations/cloudflare-workers": "^0.1.1",
    "graphql": "^16.8.1",
    "graphql-tag": "^2.12.6",
    "jsonwebtoken": "^9.0.2",
    "nanoid": "^5.0.4",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240117.0",
    "@graphql-codegen/cli": "^5.0.0",
    "@graphql-codegen/typescript": "^4.0.1",
    "@graphql-codegen/typescript-resolvers": "^4.0.1",
    "wrangler": "^3.25.0"
  }
}
```

### 3. Version Control & Collaboration

#### GitHub Repository Setup

```bash
# Repository initialization
git init
git remote add origin https://github.com/arbeitandy/mirubato.git

# Branch protection rules (configure via GitHub UI)
# - Require pull request reviews before merging
# - Require status checks to pass before merging
# - Require branches to be up to date before merging
# - Include administrators in restrictions
```

#### GitHub Actions Workflows

```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.11.0'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run type-check
      - run: pnpm run lint
      - run: pnpm run test:coverage
      - run: pnpm run build

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.11.0'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run build
      - run: npx playwright install
      - run: pnpm run test:e2e

  deploy-staging:
    needs: [test, e2e-tests]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name=rubato-staging
```

#### Issue Templates

```markdown
# .github/ISSUE_TEMPLATE/bug_report.md

---

name: Bug report
about: Create a report to help us improve
title: ''
labels: 'bug'
assignees: ''

---

## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

What actually happened instead.

## Environment

- Browser: [e.g. Chrome 120, Safari 17]
- Device: [e.g. iPhone 12, Desktop]
- OS: [e.g. iOS 17, macOS 14]
- Instrument Mode: [e.g. Guitar, Piano]

## Musical Context

- What type of exercise were you practicing?
- What difficulty level?
- Any specific musical notation involved?

## Screenshots

If applicable, add screenshots to help explain your problem.

## Additional Context

Add any other context about the problem here.
```

### 3. Cloudflare Infrastructure

#### Cloudflare Pages Configuration

```toml
# wrangler.toml
name = "mirubato"
compatibility_date = "2024-01-15"

[env.staging]
name = "mirubato-staging"
route = "staging.mirubato.com/*"

[env.production]
name = "mirubato-production"
route = "mirubato.com/*"

# Build configuration
[build]
command = "pnpm run build"
cwd = "."
watch_dir = "src"

[build.upload]
format = "service-worker"
dir = "dist"
```

#### Cloudflare Workers GraphQL Configuration

```toml
# backend/wrangler.toml
name = "mirubato-api"
main = "src/index.ts"
compatibility_date = "2024-01-15"
node_compat = true

[env.staging]
name = "mirubato-api-staging"
route = "api-staging.mirubato.com/*"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "mirubato-api-production"
route = "api.mirubato.com/*"
vars = { ENVIRONMENT = "production" }

[[d1_databases]]
binding = "DB"
database_name = "mirubato-db"
database_id = "your-database-id"

# Environment variables (configure in Cloudflare dashboard)
# JWT_SECRET
# EMAIL_API_KEY
# SENTRY_DSN
```

#### GraphQL API Architecture

```typescript
// GraphQL Schema Overview
type Query {
  # User queries
  me: User
  user(id: ID!): User

  # Sheet music queries
  listSheetMusic(filter: SheetMusicFilterInput, limit: Int, offset: Int): SheetMusicConnection!
  sheetMusic(id: ID!): SheetMusic
  randomSheetMusic(instrument: Instrument!, difficulty: Difficulty, maxDuration: Int): SheetMusic

  # Practice queries
  myPracticeSessions(instrument: Instrument, limit: Int, offset: Int): PracticeSessionConnection!
  practiceSession(id: ID!): PracticeSession
}

type Mutation {
  # Authentication
  requestMagicLink(email: String!): AuthPayload!
  verifyMagicLink(token: String!): TokenPayload!
  refreshToken(refreshToken: String!): TokenPayload!
  logout: AuthPayload!
  deleteAccount: AuthPayload!

  # User management
  updateUser(input: UpdateUserInput!): User!

  # Practice sessions
  startPracticeSession(input: StartPracticeSessionInput!): PracticeSession!
  pausePracticeSession(sessionId: ID!): PracticeSession!
  resumePracticeSession(sessionId: ID!): PracticeSession!
  completePracticeSession(input: CompletePracticeSessionInput!): PracticeSession!
  createPracticeLog(input: CreatePracticeLogInput!): PracticeLog!
}
```

#### Cloudflare D1 Database Schema (Updated)

```sql
-- backend/migrations/0001_create_users.sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  primary_instrument TEXT NOT NULL DEFAULT 'piano',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_updated_at
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- backend/migrations/0002_create_user_preferences.sql
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences TEXT NOT NULL, -- JSON with theme, notationSize, etc.
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- backend/migrations/0003_create_sheet_music.sql
CREATE TABLE sheet_music (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  opus TEXT,
  movement TEXT,
  instrument TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  difficulty_level INTEGER NOT NULL,
  grade_level TEXT,
  duration_seconds INTEGER NOT NULL,
  time_signature TEXT NOT NULL,
  key_signature TEXT NOT NULL,
  tempo_marking TEXT,
  suggested_tempo INTEGER NOT NULL,
  style_period TEXT NOT NULL,
  tags TEXT NOT NULL, -- JSON array
  measures_data TEXT NOT NULL, -- JSON
  metadata TEXT, -- JSON
  thumbnail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- backend/migrations/0004_create_practice_sessions.sql
CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL,
  sheet_music_id TEXT,
  session_type TEXT NOT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  paused_duration INTEGER DEFAULT 0,
  accuracy_percentage REAL,
  notes_attempted INTEGER DEFAULT 0,
  notes_correct INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id)
);

-- backend/migrations/0005_create_practice_logs.sql
CREATE TABLE practice_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  tempo_practiced INTEGER,
  target_tempo INTEGER,
  focus_areas TEXT, -- JSON array
  self_rating INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_sessions_user ON practice_sessions(user_id);
CREATE INDEX idx_sessions_user_instrument ON practice_sessions(user_id, instrument);
CREATE INDEX idx_sheet_music_instrument ON sheet_music(instrument);
CREATE INDEX idx_logs_session ON practice_logs(session_id);
```

#### Environment Variables Setup

```bash
# Backend Environment Variables (Cloudflare Workers)
ENVIRONMENT=production
JWT_SECRET=# Strong random secret for JWT signing
EMAIL_API_KEY=# Email service API key (Resend/SendGrid)
SENTRY_DSN=# Error tracking (optional)
ANALYTICS_TOKEN=# Usage analytics (optional)

# Frontend Environment Variables (Vite)
VITE_API_BASE_URL=https://api.mirubato.com/graphql
VITE_ENVIRONMENT=production
VITE_SENTRY_DSN=# Client-side error tracking
VITE_ANALYTICS_ID=# Client-side analytics
```

#### GraphQL Code Generation

```yaml
# backend/codegen.yml
overwrite: true
schema: 'src/schema/schema.graphql'
generates:
  src/types/generated/graphql.ts:
    plugins:
      - 'typescript'
      - 'typescript-resolvers'
    config:
      contextType: ../context#GraphQLContext
      useIndexSignature: true
      enumsAsTypes: true
      scalars:
        DateTime: string
        JSON: 'Record<string, any>'
```

### 4. Content Delivery & Storage

#### Audio Samples Storage

```bash
# Currently using Tone.js CDN for audio samples
# URL: https://tonejs.github.io/audio/salamander/
# This provides Salamander Grand Piano samples globally via CDN

# Future enhancement: Cloudflare R2 (S3-compatible) for custom audio files
# Sample organization structure when using local storage:
/audio-samples/
  /guitar/
    /classical/
      /position-1/
        C4.mp3
        D4.mp3
        E4.mp3
        ...
      /position-2/
        ...
  /piano/
    /grand/
      A0.mp3
      A1.mp3
      ...
      C8.mp3
```

#### Static Assets CDN

```javascript
// Configure in vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: assetInfo => {
          // Organize assets by type for better caching
          if (assetInfo.name?.endsWith('.mp3')) {
            return 'audio/[name]-[hash][extname]'
          }
          if (assetInfo.name?.endsWith('.woff2')) {
            return 'fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
```

### 5. Monitoring & Observability

#### Error Tracking (Sentry)

```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Custom error boundaries for musical content
export const MusicErrorBoundary = Sentry.withErrorBoundary(
  ({ children }) => children,
  {
    fallback: ({ error }) => (
      <div className="error-fallback">
        <h2>Musical content failed to load</h2>
        <p>Please refresh the page or try a different exercise.</p>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    ),
  }
);
```

#### Performance Monitoring

```typescript
// src/lib/performance.ts
export const performanceMonitor = {
  // Audio latency monitoring
  measureAudioLatency: (callback: () => void) => {
    const start = performance.now()
    callback()
    const latency = performance.now() - start

    // Report if latency is too high
    if (latency > 100) {
      console.warn(`High audio latency detected: ${latency}ms`)
      // Send to monitoring service
    }
  },

  // Notation rendering performance
  measureNotationRender: (renderFunction: () => void) => {
    const start = performance.now()
    renderFunction()
    const renderTime = performance.now() - start

    if (renderTime > 200) {
      console.warn(`Slow notation rendering: ${renderTime}ms`)
    }
  },

  // Core Web Vitals tracking
  trackWebVitals: () => {
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(console.log)
      onFID(console.log)
      onFCP(console.log)
      onLCP(console.log)
      onTTFB(console.log)
    })
  },
}
```

#### Analytics (Privacy-Focused)

```typescript
// src/lib/analytics.ts
interface AnalyticsEvent {
  event: string
  properties: Record<string, any>
  timestamp: number
}

export const analytics = {
  // Practice session analytics
  trackPracticeStart: (instrument: string, difficulty: number) => {
    track('practice_session_started', {
      instrument,
      difficulty,
      timestamp: Date.now(),
    })
  },

  trackExerciseComplete: (
    instrument: string,
    exerciseType: string,
    accuracy: number,
    duration: number
  ) => {
    track('exercise_completed', {
      instrument,
      exercise_type: exerciseType,
      accuracy,
      duration_ms: duration,
    })
  },

  // Educational effectiveness tracking
  trackSkillImprovement: (
    instrument: string,
    skillArea: string,
    beforeAccuracy: number,
    afterAccuracy: number
  ) => {
    track('skill_improvement', {
      instrument,
      skill_area: skillArea,
      improvement_percentage: afterAccuracy - beforeAccuracy,
    })
  },
}

function track(event: string, properties: Record<string, any>) {
  // Only track anonymized, educational-focused metrics
  if (import.meta.env.VITE_ANALYTICS_ID) {
    // Send to privacy-focused analytics service
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties }),
    })
  }
}
```

### 6. Testing Infrastructure

#### Frontend Testing (Jest)

```javascript
// jest.config.mjs
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/unit.setup.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

#### Backend Testing (Jest)

```javascript
// backend/jest.config.mjs
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

#### End-to-End Testing (Playwright)

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'pnpm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
```

### 7. Security Infrastructure

#### Content Security Policy

```typescript
// Headers configuration for Cloudflare Pages
export const securityHeaders = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;
    media-src 'self' blob:;
    connect-src 'self' https://api.mirubato.com;
    worker-src 'self';
  `
    .replace(/\s+/g, ' ')
    .trim(),

  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': `
    camera=(),
    microphone=(),
    geolocation=(),
    interest-cohort=()
  `
    .replace(/\s+/g, ' ')
    .trim(),
}
```

#### Authentication Security

```typescript
// JWT configuration for Workers
export const jwtConfig = {
  algorithm: 'HS256' as const,
  expiresIn: '1h',
  refreshExpiresIn: '7d',
  issuer: 'mirubato.com',
  audience: 'mirubato-users',
}

// Rate limiting configuration
export const rateLimits = {
  auth: { requests: 5, window: '15m' },
  api: { requests: 100, window: '15m' },
  practice: { requests: 200, window: '15m' },
}
```

### 8. Development Tools & Automation

#### Pre-commit Hooks (Husky)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "pnpm run type-check && pnpm run test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

#### Code Quality Tools

```json
{
  "scripts": {
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css,md}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### 9. Deployment Pipeline

#### Staging Environment

```yaml
# Automatic deployment to staging on develop branch
staging:
  environment: staging
  url: https://staging.mirubato.com
  auto_deploy: true
  branch: develop

  build_settings:
    command: pnpm run build
    environment:
      VITE_API_BASE_URL: https://api-staging.mirubato.com
      VITE_ENVIRONMENT: staging
```

#### Production Environment

```yaml
# Manual deployment to production
production:
  environment: production
  url: https://mirubato.com
  auto_deploy: false
  branch: main

  build_settings:
    command: pnpm run build
    environment:
      VITE_API_BASE_URL: https://api.mirubato.com
      VITE_ENVIRONMENT: production

  # Production-specific optimizations
  post_processing:
    - bundle_css: true
    - minify_js: true
    - optimize_images: true
    - generate_sitemap: true
```

### 10. Backup & Recovery

#### Database Backup Strategy

```sql
-- Automated daily backups via Cloudflare D1
-- Retention: 30 days for daily, 12 months for weekly, 7 years for yearly

-- Manual backup commands
wrangler d1 backup create mirubato-db --local
wrangler d1 backup list mirubato-db
wrangler d1 backup restore mirubato-db --backup-id=<backup-id>
```

#### Disaster Recovery Plan

1. **Code Recovery**: Git repository with multiple remotes
2. **Database Recovery**: Automated D1 backups + manual exports
3. **CDN Recovery**: Assets stored in multiple locations
4. **DNS Recovery**: Cloudflare with backup providers configured
5. **Certificate Recovery**: Automated SSL with backup certificates

### 11. Cost Estimation

#### Cloudflare Costs (Monthly)

- **Pages**: $0 (within free tier for open source)
- **Workers**: ~$5-20 (based on requests)
- **D1 Database**: ~$0-5 (based on storage and queries)
- **R2 Storage**: ~$0-10 (for audio samples)
- **Domain**: ~$10/year

#### Additional Services

- **Sentry** (Error Tracking): $0-26/month
- **GitHub** (Repository): $0 (open source)
- **Email Service** (Resend): $0-20/month

**Total Estimated Monthly Cost**: $5-50 (scales with usage)

### 12. Setup Checklist

#### Initial Setup

- [ ] GitHub repository created with proper settings
- [ ] Cloudflare account set up with domain
- [ ] D1 database created and configured
- [ ] Backend Workers deployed with environment variables
- [ ] Frontend Pages deployment configured
- [ ] DNS records pointed to Cloudflare
- [ ] SSL certificates configured
- [ ] Monitoring tools set up (Sentry, analytics)

#### Backend Development Environment

- [ ] Backend directory structure created
- [ ] GraphQL schema defined
- [ ] Apollo Server configured for Workers
- [ ] D1 migrations created and applied
- [ ] GraphQL code generation working
- [ ] Backend tests passing (23 unit/integration tests)
- [ ] JWT authentication implemented
- [ ] Rate limiting configured

#### Frontend Development Environment

- [ ] Node.js and pnpm installed
- [ ] Vite development server running
- [ ] Apollo Client ready for integration
- [ ] Environment variables set up locally
- [ ] Git hooks configured (Husky)
- [ ] VS Code extensions installed
- [ ] Frontend tests passing

#### CI/CD Pipeline

- [ ] GitHub Actions workflows configured
- [ ] Backend staging environment deployed
- [ ] Frontend staging environment deployed
- [ ] Production deployment ready
- [ ] Automated testing running
- [ ] Code quality gates configured
- [ ] Security scanning enabled

This infrastructure setup provides a robust, scalable foundation for Mirubato while maintaining cost-effectiveness for an open-source educational project.
