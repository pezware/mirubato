# Infrastructure Components and Setup

## Overview
This document outlines all the infrastructure components required for developing, testing, and deploying Rubato, the open-source sight-reading platform.

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

### 2. Version Control & Collaboration

#### GitHub Repository Setup
```bash
# Repository initialization
git init
git remote add origin https://github.com/rubato-app/rubato.git

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
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

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
name = "rubato"
compatibility_date = "2024-01-15"

[env.staging]
name = "rubato-staging"
route = "staging.rubato.app/*"

[env.production]
name = "rubato-production"
route = "rubato.app/*"

# Build configuration
[build]
command = "pnpm run build"
cwd = "."
watch_dir = "src"

[build.upload]
format = "service-worker"
dir = "dist"
```

#### Cloudflare Workers (Backend API)
```typescript
// workers/api/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const router = new Router();
    
    // Authentication routes
    router.post('/api/auth/login', handleLogin);
    router.post('/api/auth/verify', handleVerify);
    router.post('/api/auth/refresh', handleRefresh);
    
    // Practice session routes
    router.post('/api/practice/sessions', handleCreateSession);
    router.get('/api/practice/sessions/:id', handleGetSession);
    router.patch('/api/practice/sessions/:id', handleUpdateSession);
    
    // Exercise routes
    router.get('/api/exercises', handleGetExercises);
    router.post('/api/exercises/generate', handleGenerateExercise);
    
    // User progress routes
    router.get('/api/users/progress', handleGetProgress);
    router.post('/api/users/progress', handleUpdateProgress);
    
    return router.handle(request, env);
  },
};
```

#### Cloudflare D1 Database
```sql
-- migrations/0001_initial.sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  preferences TEXT -- JSON blob
);

CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL CHECK (instrument IN ('guitar', 'piano')),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  total_exercises INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  session_data TEXT, -- JSON blob
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL,
  skill_area TEXT NOT NULL, -- 'notes', 'rhythm', 'chords', etc.
  level INTEGER DEFAULT 1,
  accuracy_percentage REAL DEFAULT 0.0,
  practice_minutes INTEGER DEFAULT 0,
  last_practiced DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE exercise_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  exercise_data TEXT NOT NULL, -- JSON blob
  user_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN,
  response_time_ms INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id)
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_progress_user_instrument ON user_progress(user_id, instrument);
CREATE INDEX idx_attempts_session_id ON exercise_attempts(session_id);
CREATE INDEX idx_attempts_timestamp ON exercise_attempts(timestamp);
```

#### Environment Variables Setup
```bash
# Cloudflare Workers Environment Variables
ENVIRONMENT=production
DATABASE_URL=# Cloudflare D1 database URL
JWT_SECRET=# Strong random secret for JWT signing
RESEND_API_KEY=# Email service API key
SENTRY_DSN=# Error tracking (optional)
ANALYTICS_TOKEN=# Usage analytics (optional)

# Frontend Environment Variables (Vite)
VITE_API_BASE_URL=https://api.rubato.app
VITE_ENVIRONMENT=production
VITE_SENTRY_DSN=# Client-side error tracking
VITE_ANALYTICS_ID=# Client-side analytics
```

### 4. Content Delivery & Storage

#### Audio Samples Storage
```bash
# Cloudflare R2 (S3-compatible) for audio files
# Alternative: Use CDN for audio samples

# Sample organization structure:
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
        assetFileNames: (assetInfo) => {
          // Organize assets by type for better caching
          if (assetInfo.name?.endsWith('.mp3')) {
            return 'audio/[name]-[hash][extname]';
          }
          if (assetInfo.name?.endsWith('.woff2')) {
            return 'fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
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
    const start = performance.now();
    callback();
    const latency = performance.now() - start;
    
    // Report if latency is too high
    if (latency > 100) {
      console.warn(`High audio latency detected: ${latency}ms`);
      // Send to monitoring service
    }
  },

  // Notation rendering performance
  measureNotationRender: (renderFunction: () => void) => {
    const start = performance.now();
    renderFunction();
    const renderTime = performance.now() - start;
    
    if (renderTime > 200) {
      console.warn(`Slow notation rendering: ${renderTime}ms`);
    }
  },

  // Core Web Vitals tracking
  trackWebVitals: () => {
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(console.log);
      onFID(console.log);
      onFCP(console.log);
      onLCP(console.log);
      onTTFB(console.log);
    });
  }
};
```

#### Analytics (Privacy-Focused)
```typescript
// src/lib/analytics.ts
interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
}

export const analytics = {
  // Practice session analytics
  trackPracticeStart: (instrument: string, difficulty: number) => {
    track('practice_session_started', {
      instrument,
      difficulty,
      timestamp: Date.now()
    });
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
      duration_ms: duration
    });
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
      improvement_percentage: afterAccuracy - beforeAccuracy
    });
  }
};

function track(event: string, properties: Record<string, any>) {
  // Only track anonymized, educational-focused metrics
  if (import.meta.env.VITE_ANALYTICS_ID) {
    // Send to privacy-focused analytics service
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties })
    });
  }
}
```

### 6. Testing Infrastructure

#### Unit & Integration Testing
```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

#### End-to-End Testing (Playwright)
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

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
    video: 'retain-on-failure'
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
    reuseExistingServer: !process.env.CI
  }
});
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
    connect-src 'self' https://api.rubato.app;
    worker-src 'self';
  `.replace(/\s+/g, ' ').trim(),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': `
    camera=(), 
    microphone=(), 
    geolocation=(), 
    interest-cohort=()
  `.replace(/\s+/g, ' ').trim()
};
```

#### Authentication Security
```typescript
// JWT configuration for Workers
export const jwtConfig = {
  algorithm: 'HS256' as const,
  expiresIn: '1h',
  refreshExpiresIn: '7d',
  issuer: 'rubato.app',
  audience: 'rubato-users'
};

// Rate limiting configuration
export const rateLimits = {
  auth: { requests: 5, window: '15m' },
  api: { requests: 100, window: '15m' },
  practice: { requests: 200, window: '15m' }
};
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
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
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
  url: https://staging.rubato.app
  auto_deploy: true
  branch: develop
  
  build_settings:
    command: pnpm run build
    environment:
      VITE_API_BASE_URL: https://api-staging.rubato.app
      VITE_ENVIRONMENT: staging
```

#### Production Environment
```yaml
# Manual deployment to production
production:
  environment: production
  url: https://rubato.app
  auto_deploy: false
  branch: main
  
  build_settings:
    command: pnpm run build
    environment:
      VITE_API_BASE_URL: https://api.rubato.app
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
wrangler d1 backup create rubato-db --local
wrangler d1 backup list rubato-db
wrangler d1 backup restore rubato-db --backup-id=<backup-id>
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
- [ ] Workers deployed with environment variables
- [ ] Pages deployment configured
- [ ] DNS records pointed to Cloudflare
- [ ] SSL certificates configured
- [ ] Monitoring tools set up (Sentry, analytics)

#### Development Environment
- [ ] Node.js and pnpm installed
- [ ] Wrangler CLI configured
- [ ] Environment variables set up locally
- [ ] Git hooks configured (Husky)
- [ ] VS Code extensions installed
- [ ] Local development server running
- [ ] Tests passing

#### CI/CD Pipeline
- [ ] GitHub Actions workflows configured
- [ ] Staging environment deployed
- [ ] Production deployment ready
- [ ] Automated testing running
- [ ] Code quality gates configured
- [ ] Security scanning enabled

This infrastructure setup provides a robust, scalable foundation for Rubato while maintaining cost-effectiveness for an open-source educational project.