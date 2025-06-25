# API Service Migration Plan - Local-First Architecture

## Executive Summary

This document outlines the plan to replace the current GraphQL backend with a minimal REST API service that serves ONLY authenticated users who want to sync their data to the cloud. Unlogged users work entirely offline with localStorage and never interact with api.mirubato.com.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Service Structure](#api-service-structure)
3. [API Endpoints](#api-endpoints)
4. [Frontend Changes](#frontend-changes)
5. [Testing Strategy](#testing-strategy)
6. [Documentation](#documentation)
7. [Build & Deployment](#build--deployment)
8. [Implementation Timeline](#implementation-timeline)
9. [Migration Strategy](#migration-strategy)

## Architecture Overview

### Core Principles

1. **Local-First, API-Optional**
   - Unlogged users: 100% local, no API calls
   - Logged users: Local operations + background sync to API
   - API role: Cloud storage and sync only (not business logic)

2. **Frontend Owns Business Logic**
   - All data validation in frontend modules
   - All calculations/reports generated locally
   - API is a "dumb" storage layer with sync capabilities

3. **Sync is Additive**
   - Login doesn't change local functionality
   - Login adds cloud backup and cross-device sync
   - Logout keeps all local data intact

### Current vs Proposed Architecture

**Current:**

- Frontend → GraphQL API → D1 Database
- Complex resolvers with business logic
- All users hit the API

**Proposed:**

- Unlogged: Frontend → LocalStorage (no API)
- Logged: Frontend → LocalStorage → Sync → API → D1
- API handles only auth and sync

## API Service Structure

```
api/
├── src/
│   ├── index.ts                 # Main Hono app entry
│   ├── api/
│   │   ├── routes.ts           # Route definitions
│   │   ├── openapi.ts          # OpenAPI specification
│   │   ├── middleware.ts       # Auth, CORS, rate limiting
│   │   └── handlers/
│   │       ├── auth.ts         # Authentication endpoints
│   │       ├── sync.ts         # Sync endpoints
│   │       ├── user.ts         # User management
│   │       ├── health.ts       # Health checks
│   │       └── docs.ts         # API documentation
│   ├── services/
│   │   ├── auth.ts             # JWT, magic links, OAuth
│   │   ├── email.ts            # Email service
│   │   └── sync.ts             # Sync orchestration
│   ├── utils/
│   │   ├── database.ts         # D1 utilities
│   │   ├── validation.ts       # Input validation
│   │   ├── errors.ts           # Error handling
│   │   └── rateLimiter.ts      # Rate limiting
│   ├── types/
│   │   ├── api.ts              # API types
│   │   └── models.ts           # Data models
│   └── templates/
│       └── email/              # Email templates
├── tests/
│   ├── unit/
│   │   ├── handlers/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── sync.test.ts
│   │   └── api.test.ts
│   └── e2e/
│       └── user-flows.test.ts
├── migrations/                  # D1 migrations
├── wrangler.toml               # Cloudflare config
├── vitest.config.ts            # Test configuration
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies

```

## API Endpoints

### Authentication (Public)

#### `POST /auth/request-magic-link`

Request a magic link for email authentication.

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

#### `POST /auth/verify-magic-link`

Verify magic link token.

**Request:**

```json
{
  "token": "magic-link-token"
}
```

**Response:**

```json
{
  "success": true,
  "user": { "id": "...", "email": "..." },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600
}
```

#### `POST /auth/google`

Authenticate with Google OAuth.

**Request:**

```json
{
  "credential": "google-id-token"
}
```

**Response:**

```json
{
  "success": true,
  "user": { "id": "...", "email": "..." },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600
}
```

#### `POST /auth/refresh`

Refresh access token.

**Request:**

```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**

```json
{
  "accessToken": "new-jwt-token",
  "expiresIn": 3600
}
```

#### `POST /auth/logout`

Logout user (invalidate tokens).

**Response:**

```json
{
  "success": true
}
```

### Sync (Authenticated Only)

#### `POST /sync/pull`

Get all user data from cloud for initial sync.

**Response:**

```json
{
  "entries": [...],
  "goals": [...],
  "syncToken": "token-for-incremental-sync",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### `POST /sync/push`

Push local changes to cloud.

**Request:**

```json
{
  "changes": {
    "entries": [...],
    "goals": [...]
  },
  "lastSyncToken": "previous-token"
}
```

**Response:**

```json
{
  "success": true,
  "syncToken": "new-token",
  "conflicts": []
}
```

#### `POST /sync/batch`

Bidirectional sync batch operation.

**Request:**

```json
{
  "entities": [
    {
      "id": "local-id",
      "type": "logbook_entry",
      "data": {...},
      "checksum": "hash",
      "version": 1
    }
  ],
  "syncToken": "previous-token"
}
```

**Response:**

```json
{
  "uploaded": 5,
  "downloaded": 3,
  "conflicts": [],
  "newSyncToken": "new-token"
}
```

#### `GET /sync/status`

Get sync metadata and status.

**Response:**

```json
{
  "lastSyncTime": "2024-01-01T00:00:00Z",
  "syncToken": "current-token",
  "pendingChanges": 0,
  "deviceCount": 2
}
```

### User Management (Authenticated)

#### `GET /user/me`

Get current user information.

**Response:**

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "displayName": "John Doe",
  "authProvider": "google",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### `PUT /user/preferences`

Update user preferences (cloud backup).

**Request:**

```json
{
  "theme": "dark",
  "notificationSettings": {...}
}
```

**Response:**

```json
{
  "success": true,
  "preferences": {...}
}
```

#### `DELETE /user/me`

Delete user account and all data.

**Response:**

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

### Health & Monitoring

#### `GET /health`

Comprehensive health check.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "healthy",
    "email": "healthy"
  }
}
```

#### `GET /metrics`

Prometheus-compatible metrics endpoint.

### Documentation

#### `GET /docs`

Interactive API documentation (Stoplight Elements).

#### `GET /openapi.json`

OpenAPI 3.0 specification.

## Frontend Changes

### 1. API Client Implementation

```typescript
// api/client.ts
export class MirubatoAPI {
  constructor(private baseURL: string) {}

  // Auth methods
  async requestMagicLink(email: string): Promise<void> {
    await this.post('/auth/request-magic-link', { email })
  }

  async verifyMagicLink(token: string): Promise<AuthResponse> {
    return this.post('/auth/verify-magic-link', { token })
  }

  async googleLogin(credential: string): Promise<AuthResponse> {
    return this.post('/auth/google', { credential })
  }

  async refreshToken(): Promise<TokenResponse> {
    return this.post('/auth/refresh', {})
  }

  async logout(): Promise<void> {
    await this.post('/auth/logout', {})
  }

  // Sync methods (only for authenticated users)
  async pullSync(): Promise<SyncData> {
    return this.post('/sync/pull', {})
  }

  async pushSync(changes: SyncChanges): Promise<SyncResult> {
    return this.post('/sync/push', { changes })
  }

  async batchSync(batch: SyncBatch): Promise<BatchSyncResult> {
    return this.post('/sync/batch', batch)
  }

  // User methods
  async getCurrentUser(): Promise<User> {
    return this.get('/user/me')
  }

  async updatePreferences(prefs: UserPreferences): Promise<void> {
    await this.put('/user/preferences', prefs)
  }

  async deleteAccount(): Promise<void> {
    await this.delete('/user/me')
  }

  // HTTP methods
  private async request(method: string, path: string, body?: any) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new APIError(response.status, await response.text())
    }

    return response.json()
  }

  private get = (path: string) => this.request('GET', path)
  private post = (path: string, body: any) => this.request('POST', path, body)
  private put = (path: string, body: any) => this.request('PUT', path, body)
  private delete = (path: string) => this.request('DELETE', path)
}
```

### 2. Auth Context Updates

```typescript
// contexts/AuthContext.tsx
interface AuthContextValue {
  // Auth state
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean

  // Auth operations
  login: (email: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  verifyMagicLink: (token: string) => Promise<void>

  // Sync state (only relevant when authenticated)
  syncStatus: 'idle' | 'syncing' | 'error'
  lastSyncTime: Date | null
  syncError: Error | null

  // Sync operations
  triggerSync: () => Promise<void>
}
```

### 3. Sync Service Integration

```typescript
// services/sync/CloudSyncService.ts
export class CloudSyncService {
  constructor(
    private api: MirubatoAPI,
    private storageModule: StorageModule,
    private eventBus: EventBus
  ) {}

  async performInitialSync(userId: string): Promise<void> {
    // 1. Pull cloud data
    const cloudData = await this.api.pullSync()

    // 2. Get local data
    const localData = await this.getLocalData()

    // 3. Merge with deduplication
    const merged = await this.mergeData(localData, cloudData)

    // 4. Update local storage
    await this.updateLocalStorage(merged)

    // 5. Push local-only data to cloud
    if (merged.localOnly.length > 0) {
      await this.api.pushSync(merged.localOnly)
    }
  }

  async performIncrementalSync(): Promise<void> {
    const lastSyncTime = await this.getLastSyncTime()
    const changes = await this.getChangesSince(lastSyncTime)

    if (changes.length > 0) {
      const result = await this.api.batchSync({
        entities: changes,
        syncToken: await this.getSyncToken(),
      })

      await this.handleSyncResult(result)
    }
  }
}
```

## Testing Strategy

### 1. Unit Tests

**Coverage Requirements:** >80% for all modules

```typescript
// tests/unit/handlers/auth.test.ts
describe('Auth Handler', () => {
  it('should send magic link email', async () => {
    const mockEmail = vi.fn()
    const handler = new AuthHandler({ emailService: mockEmail })

    await handler.requestMagicLink('test@example.com')

    expect(mockEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('magic-link')
    )
  })

  it('should verify valid magic link token', async () => {
    const token = 'valid-token'
    const result = await handler.verifyMagicLink(token)

    expect(result.success).toBe(true)
    expect(result.user).toBeDefined()
    expect(result.accessToken).toBeDefined()
  })
})
```

### 2. Integration Tests

```typescript
// tests/integration/sync.test.ts
describe('Sync Integration', () => {
  let api: MirubatoAPI
  let db: D1Database

  beforeEach(async () => {
    api = new MirubatoAPI('http://localhost:8787')
    db = await setupTestDatabase()
  })

  it('should perform bidirectional sync', async () => {
    // Create test data
    const localEntries = createTestEntries(5)
    const cloudEntries = createTestEntries(3)

    // Perform sync
    const result = await api.batchSync({
      entities: localEntries,
      syncToken: null,
    })

    expect(result.uploaded).toBe(5)
    expect(result.downloaded).toBe(3)
    expect(result.conflicts).toHaveLength(0)
  })
})
```

### 3. E2E Tests

```typescript
// tests/e2e/user-flows.test.ts
describe('User Authentication Flow', () => {
  it('should complete magic link login flow', async () => {
    // 1. Request magic link
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // 2. Verify email sent
    const email = await getLastEmail()
    expect(email.to).toBe('test@example.com')

    // 3. Click magic link
    const magicLink = extractMagicLink(email.body)
    await page.goto(magicLink)

    // 4. Verify logged in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })
})
```

### 4. Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
```

## Documentation

### 1. API Documentation Structure

```typescript
// src/api/openapi.ts
export const openAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'Mirubato API',
    version: '1.0.0',
    description: 'REST API for Mirubato cloud sync and authentication',
    contact: {
      name: 'Mirubato Team',
      email: 'support@mirubato.com',
    },
  },
  servers: [
    {
      url: 'https://apiv2.mirubato.com',
      description: 'Production',
    },
    {
      url: 'https://apiv2-staging.mirubato.com',
      description: 'Staging',
    },
    {
      url: 'http://localhost:8787',
      description: 'Development',
    },
  ],
  // ... paths, components, etc.
}
```

### 2. Stoplight Elements Integration

```typescript
// src/api/handlers/docs.ts
import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

export const docsHandler = new Hono()

// Serve Stoplight Elements
docsHandler.get('/', c => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Mirubato API Documentation</title>
      <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
    </head>
    <body>
      <elements-api
        apiDescriptionUrl="/openapi.json"
        router="hash"
        layout="sidebar"
      />
    </body>
    </html>
  `
  return c.html(html)
})

// Serve OpenAPI spec
docsHandler.get('/openapi.json', c => {
  return c.json(openAPISpec)
})

// Alternative documentation formats
docsHandler.get('/swagger', c => {
  // Swagger UI implementation
})

docsHandler.get('/rapidoc', c => {
  // RapiDoc implementation
})
```

### 3. Documentation Comments

````typescript
/**
 * Request a magic link for email authentication
 *
 * @route POST /auth/request-magic-link
 * @param {string} email - User's email address
 * @returns {AuthPayload} Success status and message
 *
 * @example
 * ```typescript
 * const response = await api.requestMagicLink('user@example.com')
 * // Email with magic link sent to user
 * ```
 */
export async function requestMagicLink(c: Context): Promise<Response> {
  // Implementation
}
````

## Build & Deployment

### 1. Build Configuration

```json
// package.json
{
  "name": "@mirubato/api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev --env local",
    "build": "tsc --noEmit",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts",
    "typecheck": "tsc --noEmit",
    "db:migrate": "wrangler d1 migrations apply DB --local",
    "db:migrate:prod": "wrangler d1 migrations apply DB"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/zod-validator": "^0.2.0",
    "zod": "^3.22.0",
    "jose": "^5.2.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^3.0.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### 2. Wrangler Configuration

```toml
# wrangler.toml
name = "mirubato-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
node_compat = true

[build]
command = "npm run build"

# Local development
[env.local]
vars = {
  ENVIRONMENT = "local",
  JWT_SECRET = "local-secret-key",
  MAGIC_LINK_SECRET = "local-magic-secret"
}

[[env.local.d1_databases]]
binding = "DB"
database_name = "mirubato-local"
database_id = "local-db-id"

# Staging environment
[env.staging]
vars = { ENVIRONMENT = "staging" }
routes = [
  { pattern = "apiv2-staging.mirubato.com/*", custom_domain = true }
]

[[env.staging.d1_databases]]
binding = "DB"
database_name = "mirubato-staging"
database_id = "staging-db-id"

[[env.staging.secrets]]
name = "JWT_SECRET"
text = "Use wrangler secret put JWT_SECRET"

[[env.staging.secrets]]
name = "MAGIC_LINK_SECRET"
text = "Use wrangler secret put MAGIC_LINK_SECRET"

[[env.staging.secrets]]
name = "GOOGLE_CLIENT_SECRET"
text = "Use wrangler secret put GOOGLE_CLIENT_SECRET"

# Production environment (default)
[vars]
ENVIRONMENT = "production"
GOOGLE_CLIENT_ID = "your-google-client-id.apps.googleusercontent.com"

[routes]
pattern = "apiv2.mirubato.com/*"
custom_domain = true

[[d1_databases]]
binding = "DB"
database_name = "mirubato-production"
database_id = "prod-db-id"

[[secrets]]
name = "JWT_SECRET"
text = "Use wrangler secret put JWT_SECRET"

[[secrets]]
name = "MAGIC_LINK_SECRET"
text = "Use wrangler secret put MAGIC_LINK_SECRET"

[[secrets]]
name = "GOOGLE_CLIENT_SECRET"
text = "Use wrangler secret put GOOGLE_CLIENT_SECRET"

[[secrets]]
name = "SENDGRID_API_KEY"
text = "Use wrangler secret put SENDGRID_API_KEY"

# Rate limiting
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1234"
simple = { limit = 10, period = 60 }
```

### 3. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types", "vitest/globals"],
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "noEmit": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. CI/CD Pipeline

```yaml
# .github/workflows/api-deploy.yml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'api/**'
      - '.github/workflows/api-deploy.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd api && npm ci

      - name: Run tests
        run: cd api && npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'api'
```

## Implementation Timeline

### Phase 1: Foundation (Week 1)

- **Day 1-2**: Set up project structure and dependencies
- **Day 3-4**: Implement authentication endpoints (magic link + Google OAuth)
- **Day 5**: Set up testing framework and write auth tests

### Phase 2: Core Features (Week 2)

- **Day 1-2**: Implement sync endpoints
- **Day 3-4**: Create sync orchestration service
- **Day 5**: Write sync tests and integration tests

### Phase 3: Frontend Integration (Week 3)

- **Day 1-2**: Create API client library
- **Day 3-4**: Update AuthContext and integrate SSO
- **Day 5**: Update sync services and test offline/online transitions

### Phase 4: Polish & Deploy (Week 4)

- **Day 1-2**: Complete documentation and API reference
- **Day 3**: Deploy to staging and test
- **Day 4**: Production deployment
- **Day 5**: Monitor and fix any issues

## Migration Strategy

### 1. Database Migration

```sql
-- migrations/0001_initial_schema.sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  auth_provider TEXT DEFAULT 'magic_link',
  google_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sync_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON blob
  checksum TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE TABLE sync_metadata (
  user_id TEXT PRIMARY KEY,
  last_sync_token TEXT,
  last_sync_time TIMESTAMP,
  device_count INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_data_user ON sync_data(user_id);
CREATE INDEX idx_sync_data_type ON sync_data(entity_type);
CREATE INDEX idx_sync_data_updated ON sync_data(updated_at);
```

### 2. Data Migration from GraphQL

```typescript
// scripts/migrate-from-graphql.ts
async function migrateData() {
  // 1. Export data from current GraphQL backend
  const users = await exportGraphQLUsers()
  const sessions = await exportGraphQLSessions()
  const logbookEntries = await exportGraphQLLogbook()
  const goals = await exportGraphQLGoals()

  // 2. Transform to new format
  const syncData = [
    ...sessions.map(s => transformToSyncEntity(s, 'practice_session')),
    ...logbookEntries.map(e => transformToSyncEntity(e, 'logbook_entry')),
    ...goals.map(g => transformToSyncEntity(g, 'goal')),
  ]

  // 3. Import to new API database
  for (const user of users) {
    await importUser(user)
    const userSyncData = syncData.filter(d => d.user_id === user.id)
    await importSyncData(userSyncData)
  }
}
```

### 3. Rollback Plan

1. Keep GraphQL backend running during transition
2. Use feature flags to control API usage
3. Monitor error rates and performance
4. Have database backups before migration
5. Test rollback procedure in staging

## Monitoring & Observability

### 1. Health Checks

```typescript
// src/api/handlers/health.ts
export async function healthCheck(c: Context): Promise<Response> {
  const checks = {
    database: await checkDatabase(c.env.DB),
    email: await checkEmailService(c.env.SENDGRID_API_KEY),
    auth: checkAuthService(),
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy')

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      version: c.env.VERSION || '1.0.0',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      services: checks,
    },
    allHealthy ? 200 : 503
  )
}
```

### 2. Metrics

```typescript
// src/utils/metrics.ts
export class Metrics {
  static async recordRequest(
    method: string,
    path: string,
    status: number,
    duration: number
  ) {
    // Send to Cloudflare Analytics or custom metrics service
  }

  static async recordAuthEvent(type: 'login' | 'logout' | 'refresh') {
    // Track authentication events
  }

  static async recordSyncOperation(
    operation: string,
    itemCount: number,
    duration: number
  ) {
    // Track sync performance
  }
}
```

### 3. Error Tracking

```typescript
// src/utils/errors.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function errorHandler(err: Error, c: Context) {
  console.error('API Error:', err)

  if (err instanceof APIError) {
    return c.json(
      {
        error: err.message,
        code: err.code,
      },
      err.statusCode
    )
  }

  // Log to error tracking service (Sentry, etc.)
  if (c.env.SENTRY_DSN) {
    // Send to Sentry
  }

  return c.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    500
  )
}
```

## Security Considerations

### 1. Authentication Security

- Use HTTP-only cookies for tokens
- Implement CSRF protection
- Rate limit auth endpoints
- Validate magic link expiration

### 2. Data Security

- Encrypt sensitive data at rest
- Use parameterized queries
- Validate all input data
- Implement row-level security

### 3. API Security

- CORS configuration
- Request signing for sensitive operations
- API versioning strategy
- Security headers

## Performance Optimization

### 1. Database Optimization

- Use indexes for common queries
- Implement connection pooling
- Cache frequently accessed data
- Optimize sync queries

### 2. API Optimization

- Use ETags for caching
- Implement pagination
- Compress responses
- Optimize JSON serialization

### 3. Sync Optimization

- Batch operations
- Incremental sync
- Compression for large payloads
- Conflict resolution strategies

---

This plan provides a comprehensive approach to migrating from GraphQL to a REST API while maintaining the local-first architecture and adding requested features like SSO.
