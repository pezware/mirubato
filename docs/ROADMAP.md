# Mirubato Development Roadmap

## Overview

This roadmap provides a comprehensive development plan for Mirubato with strict testing requirements. Every feature must include unit tests, integration tests, and OpenAPI documentation for backend endpoints.

## Testing Infrastructure Requirements ✅

- **Pre-commit Hooks**: Husky enforces test passing before commits ✅
- **Unit Tests**: Jest with minimum 80% coverage ✅
- **Integration Tests**: API and database testing configured ✅
- **OpenAPI Documentation**: All backend endpoints must be documented (pending backend implementation)
- **CI/CD**: Cloudflare handles deployments, tests run locally via Husky ✅

## Current Status: Phase 1 - Authentication & User Management 🚧

- **Landing Page**: Complete with interactive piano interface ✅
- **Design System**: Nature-inspired theme implemented ✅
- **Audio System**: Real piano samples via Tone.js Sampler ✅
- **Practice Page**: MVP with 20 measures of Moonlight Sonata ✅
- **System Design**: Complete database schema and API architecture ✅
- **Testing Infrastructure**: Jest, Husky, and pre-commit hooks implemented ✅
- **CSP Configuration**: Fixed for Cloudflare Workers deployment ✅
- **Backend Infrastructure**: GraphQL API with Apollo Server on Workers ✅
- **Database Schema**: All D1 migrations created and tested ✅
- **User Service**: Authentication and user management implemented ✅
- **Next Steps**: Frontend GraphQL integration and remaining backend services

## Recent Achievements (2025-05-31) 🎉

- [x] **Backend Infrastructure Complete**: GraphQL backend with Apollo Server on Cloudflare Workers
- [x] **GraphQL Schema Implementation**: Complete type system for User, SheetMusic, PracticeSession
- [x] **Database Schema**: 5 D1 migrations with proper relationships and indexes
- [x] **Authentication System**: Magic link auth with JWT tokens implemented
- [x] **User Service**: Full CRUD operations with preferences and statistics
- [x] **Backend Testing**: 23 passing tests with unit and integration coverage
- [x] **Testing Infrastructure Complete**: Jest, React Testing Library, and Husky configured
- [x] **Pre-commit Hooks**: Automated testing, linting, and type-checking before commits
- [x] **CSP Issues Fixed**: Resolved Content Security Policy violations for Cloudflare deployment
- [x] **Type Safety**: Fixed all TypeScript errors in test files
- [x] **Mocking Framework**: Created mocks for Tone.js, VexFlow, and audioManager
- [x] **Tempo Bug Fixed**: Resolved tempo speedup issue after pause/resume
- [x] **MusicPlayer Component**: Created reusable music player controls
- [x] **Practice Page Redesign**: Elegant controls with circular volume control
- [x] **Mobile Optimizations**: Dynamic measures per page, responsive scaling
- [x] **Page-Based Navigation**: Consistent flipping behavior across all devices

## Known Issues & Next Fixes 🐛

1. ~~**Tempo Speed-Up Bug**: Tempo increases after pause/play cycle~~ ✅ FIXED (2025-05-31)
2. ~~**Volume Control**: Missing volume slider~~ ✅ IMPLEMENTED (2025-05-31)
3. ~~**Mobile Display Issues**: Sheet music overflow and poor space utilization~~ ✅ FIXED (2025-05-31)

4. **Missing Features**:
   - Instrument selection (guitar/piano toggle)
   - Visual feedback highlighting for currently playing notes
   - Practice session progress tracking
   - More flexible viewport fitting for different devices

## Phase 0: Testing Infrastructure Setup ✅ COMPLETE

### Testing Framework Implementation

- [x] **Jest Configuration**

  - [x] Install Jest, @types/jest, ts-jest
  - [x] Configure jest.config.mjs for TypeScript with ESM
  - [x] Set up separate configs for unit and integration tests
  - [x] Add coverage reporting with thresholds (80%)
  - [x] **Tests**: Verify Jest runs with sample tests

- [x] **React Testing Library Setup**

  - [x] Install @testing-library/react, @testing-library/jest-dom
  - [x] Configure custom render with providers
  - [x] Set up MSW for API mocking
  - [x] Create testing utilities and helpers
  - [x] **Tests**: Component rendering smoke tests (LandingPage)

- [x] **Integration Test Environment**

  - [x] Install supertest for API testing
  - [x] Configure test database setup (D1 test instance pending)
  - [x] Set up test data factories structure
  - [x] Create API test helpers structure
  - [x] **Tests**: Sample integration test setup ready

- [x] **Pre-commit Hooks with Husky**

  - [x] Install husky and lint-staged
  - [x] Configure pre-commit hook for tests
  - [x] Add commit message linting with commitlint
  - [x] Tests run automatically before commits
  - [x] **Validation**: Test hooks work correctly

- [ ] **OpenAPI Documentation Setup** (Pending backend implementation)

  - [ ] Install @cloudflare/workers-types
  - [ ] Install chanfana for Workers OpenAPI
  - [ ] Set up OpenAPI schema generation
  - [ ] Configure Swagger UI for development
  - [ ] **Tests**: Validate OpenAPI schema generation

- [x] **Update package.json Scripts**
  ```json
  {
    "scripts": {
      "test": "jest",
      "test:unit": "jest --config jest.unit.config.mjs",
      "test:integration": "jest --config jest.integration.config.mjs",
      "test:coverage": "jest --coverage",
      "test:watch": "jest --watch",
      "openapi:generate": "echo 'OpenAPI generation not yet implemented'",
      "prepare": "husky install"
    }
  }
  ```

## Phase 1: Foundation & Core Platform (6-8 weeks)

### Week 1: Backend Infrastructure Setup ✅ COMPLETE (2025-05-31)

- [x] **Backend Project Structure**

  - [x] Create backend directory with TypeScript setup
  - [x] Configure Cloudflare Workers with wrangler.toml
  - [x] Set up GraphQL with Apollo Server for Workers
  - [x] Configure D1 database bindings
  - [x] **Unit Tests**:
    - GraphQL schema validation ✅
    - Resolver type checking ✅
    - Context initialization ✅
  - [x] **Integration Tests**:
    - GraphQL endpoint health check ✅
    - Database connection verification ✅

- [x] **GraphQL Schema Foundation**
  - [x] Define core GraphQL types (User, SheetMusic, PracticeSession) ✅
  - [x] Create shared TypeScript types between frontend/backend ✅
  - [x] Implement schema code generation ✅
  - [x] Set up GraphQL playground for development ✅
  - [x] **Unit Tests**:
    - Schema type validation ✅
    - Resolver return type checking ✅
  - [x] **Documentation**:
    - GraphQL schema documentation ✅
    - Type definitions reference ✅

### Week 2: Database Schema & User Model ✅ COMPLETE (2025-05-31)

- [x] **Database Schema Implementation**

  - [x] Create D1 migrations for users table ✅
  - [x] Create practice_sessions table ✅
  - [x] Create sheet_music table ✅
  - [x] Create user_preferences table ✅
  - [x] Create practice_logs table ✅
  - [x] **Unit Tests**:
    - Migration structure validation ✅
    - Schema constraints validation ✅
  - [x] **Integration Tests**:
    - Database CRUD operations ✅
    - Foreign key constraints ✅
    - Index performance ✅

- [x] **User Service & Repository**
  - [x] Implement User model with TypeScript ✅
  - [x] Create UserService with D1 integration ✅
  - [x] Add UserService business logic layer ✅
  - [x] Implement data validation with Zod ✅
  - [x] **Unit Tests**:
    - User model validation ✅
    - Service methods ✅
    - Business logic ✅
  - [x] **Integration Tests**:
    - User creation flow ✅
    - Data persistence ✅
    - Error handling ✅

### Week 3: Authentication System ✅ PARTIAL COMPLETE (2025-05-31)

- [x] **Magic Link Authentication Backend**

  - [x] Create authentication GraphQL mutations ✅
  - [x] Implement magic link generation service ✅
  - [x] Create JWT token service ✅
  - [ ] Add email service integration (Resend/SendGrid) 🚧
  - [x] **Unit Tests**:
    - Token generation logic ✅
    - JWT signing/verification ✅
    - Email validation ✅
    - Magic link expiration ✅
  - [x] **Integration Tests**:
    - Complete auth flow ✅
    - Token refresh mechanism ✅
    - Rate limiting ✅

- [x] **Authentication Middleware**
  - [x] Create GraphQL context with auth ✅
  - [x] Implement user verification in resolvers ✅
  - [x] Add rate limiting utility ✅
  - [ ] Configure CORS properly 🚧
  - [x] **Unit Tests**:
    - Auth context extraction ✅
    - Permission checking ✅
    - Rate limit logic ✅
  - [x] **Integration Tests**:
    - Protected query access ✅
    - Invalid token handling ✅

### Week 4: Frontend GraphQL Integration

- [ ] **Apollo Client Setup**

  - [ ] Install and configure Apollo Client
  - [ ] Set up GraphQL code generation
  - [ ] Create typed hooks for queries/mutations
  - [ ] Implement authentication link
  - [ ] **Unit Tests**:
    - Client initialization
    - Auth header injection
    - Cache configuration
  - [ ] **Integration Tests**:
    - Query execution
    - Mutation handling
    - Error states

- [ ] **Authentication UI Integration**
  - [ ] Create login page with magic link
  - [ ] Implement auth context provider
  - [ ] Add protected route wrapper
  - [ ] Handle token storage and refresh
  - [ ] **Unit Tests**:
    - Auth hook functionality
    - Protected route behavior
    - Token persistence
  - [ ] **E2E Tests**:
    - Complete login flow
    - Session persistence
    - Logout functionality

### Week 5: Sheet Music Service

- [ ] **Sheet Music GraphQL API**

  - [ ] Create SheetMusic type and resolvers
  - [ ] Implement sheet music queries (list, get, search)
  - [ ] Add filtering and pagination
  - [ ] Create recommendation engine
  - [ ] **Unit Tests**:
    - Search algorithm
    - Filter combinations
    - Pagination logic
  - [ ] **Integration Tests**:
    - Query performance
    - Full-text search
    - Recommendation accuracy

- [ ] **Sheet Music Repository**
  - [ ] Implement SheetMusicRepository
  - [ ] Add caching layer for frequent queries
  - [ ] Create data import scripts
  - [ ] Handle large JSON data (measures)
  - [ ] **Unit Tests**:
    - Repository methods
    - Cache invalidation
    - Data transformations
  - [ ] **Integration Tests**:
    - Bulk operations
    - Concurrent access
    - Data integrity

### Week 6: Practice Session Management

- [ ] **Practice Session GraphQL API**

  - [ ] Create PracticeSession mutations
  - [ ] Implement session lifecycle (start/pause/complete)
  - [ ] Add practice logging mutations
  - [ ] Create progress tracking queries
  - [ ] **Unit Tests**:
    - Session state machine
    - Progress calculations
    - Data validation
  - [ ] **Integration Tests**:
    - Complete session flow
    - Concurrent sessions
    - Data consistency

- [ ] **Frontend Practice Integration**
  - [ ] Integrate practice page with GraphQL
  - [ ] Add session tracking to MusicPlayer
  - [ ] Implement progress saving
  - [ ] Create offline queue for sync
  - [ ] **Unit Tests**:
    - Session hooks
    - Offline storage
    - Sync logic
  - [ ] **E2E Tests**:
    - Full practice flow
    - Offline/online transition
    - Progress persistence

### Week 7-8: User Profile & Preferences

- [ ] **User Profile Management**

  - [ ] Create user profile GraphQL queries/mutations
  - [ ] Implement preferences management
  - [ ] Add instrument selection
  - [ ] Add user deletion with GDPR compliance
  - [ ] **Unit Tests**:
    - User data validation
    - Preference merging
    - GDPR compliance
  - [ ] **Integration Tests**:
    - Profile updates
    - Preference persistence
    - Account deletion

- [ ] **Frontend Profile UI**
  - [ ] Create user profile page
  - [ ] Build settings interface
  - [ ] Add instrument switcher
  - [ ] Implement theme preferences
  - [ ] **Unit Tests**:
    - Profile form validation
    - Settings state management
    - Theme switching
  - [ ] **E2E Tests**:
    - Profile editing
    - Preference saving
    - Instrument switching

## Backend Architecture Details

### GraphQL Schema Structure

```graphql
# Core Types
type User {
  id: ID!
  email: String!
  displayName: String
  primaryInstrument: Instrument!
  preferences: UserPreferences!
  stats: UserStats!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type SheetMusic {
  id: ID!
  title: String!
  composer: String!
  opus: String
  movement: String
  instrument: Instrument!
  difficulty: Difficulty!
  measures: [Measure!]!
  metadata: SheetMusicMetadata
}

type PracticeSession {
  id: ID!
  user: User!
  instrument: Instrument!
  sheetMusic: SheetMusic
  startedAt: DateTime!
  completedAt: DateTime
  accuracy: Float
  notesAttempted: Int!
  notesCorrect: Int!
  logs: [PracticeLog!]!
}

# Enums
enum Instrument {
  PIANO
  GUITAR
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}
```

### Database Schema (D1)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  primary_instrument TEXT NOT NULL DEFAULT 'piano',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User preferences (JSON stored)
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences TEXT NOT NULL, -- JSON
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Practice sessions
CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL,
  sheet_music_id TEXT,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  accuracy_percentage REAL,
  notes_attempted INTEGER DEFAULT 0,
  notes_correct INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id)
);

-- Sheet music library
CREATE TABLE sheet_music (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  opus TEXT,
  movement TEXT,
  instrument TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  measures_data TEXT NOT NULL, -- JSON
  metadata TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Practice logs for detailed tracking
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

-- Indexes for performance
CREATE INDEX idx_sessions_user ON practice_sessions(user_id);
CREATE INDEX idx_sessions_user_instrument ON practice_sessions(user_id, instrument);
CREATE INDEX idx_sheet_music_instrument ON sheet_music(instrument);
CREATE INDEX idx_logs_session ON practice_logs(session_id);
```

### Testing Strategy

#### Backend Testing Structure

```
backend/
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── services/
│   │   │   ├── resolvers/
│   │   │   └── utils/
│   │   └── integration/
│   │       ├── auth.test.ts
│   │       ├── user.test.ts
│   │       └── practice.test.ts
│   └── test-utils/
│       ├── db.ts
│       └── graphql.ts
```

#### Frontend Testing Updates

```
src/
├── services/
│   └── api/
│       ├── __tests__/
│       │   ├── client.test.ts
│       │   └── hooks.test.ts
│       └── __mocks__/
│           └── graphql.ts
```

## Phase 2: Progress & Analytics (6-8 weeks)

### Week 5-6: Sheet Music Service

- [ ] **Sheet Music API Backend**

  - [ ] Create /api/sheet-music endpoints
  - [ ] Implement filtering and search
  - [ ] Add recommendation endpoint
  - [ ] Create admin endpoints for content
  - [ ] **OpenAPI**: Full schema for sheet music resources
  - [ ] **Unit Tests**:
    - Search algorithm logic
    - Difficulty calculation
    - Recommendation scoring
  - [ ] **Integration Tests**:
    - Search with filters
    - Pagination handling
    - Content retrieval

- [ ] **Sheet Music Frontend Components**
  - [ ] Create sheet music browser
  - [ ] Implement filter controls
  - [ ] Add notation preview
  - [ ] Build recommendation display
  - [ ] **Unit Tests**:
    - Filter state management
    - Search debouncing
    - Preview rendering
  - [ ] **Component Tests**:
    - User interaction flows
    - Responsive behavior
    - Accessibility compliance

### Week 7-8: Practice Session System

- [ ] **Practice Service Backend**

  - [ ] Create session management endpoints
  - [ ] Implement practice logging API
  - [ ] Add quick-log endpoint
  - [ ] Create template system
  - [ ] **OpenAPI**: Document practice endpoints
  - [ ] **Unit Tests**:
    - Session state management
    - Log validation rules
    - Template merging
  - [ ] **Integration Tests**:
    - Complete session lifecycle
    - Concurrent session handling
    - Data consistency

- [ ] **Practice Frontend Implementation**
  - [ ] Fix tempo speed-up bug
  - [ ] Add volume control
  - [ ] Implement practice timer
  - [ ] Create session UI
  - [ ] **Unit Tests**:
    - Timer accuracy
    - Audio state management
    - Session data handling
  - [ ] **Integration Tests**:
    - Full practice flow
    - Offline queue sync
    - Audio playback

## Phase 2: Progress & Analytics (6-8 weeks)

### Week 9-10: Progress Tracking System

- [ ] **Progress Service Backend**

  - [ ] Create progress calculation engine
  - [ ] Implement achievement system
  - [ ] Add streak tracking
  - [ ] Build level progression
  - [ ] **OpenAPI**: Progress endpoint schemas
  - [ ] **Unit Tests**:
    - XP calculation algorithms
    - Achievement unlock logic
    - Streak calculation
    - Level boundaries
  - [ ] **Integration Tests**:
    - Progress updates
    - Achievement notifications
    - Data aggregation

- [ ] **Progress UI Components**
  - [ ] Create progress dashboard
  - [ ] Build achievement gallery
  - [ ] Add streak calendar
  - [ ] Implement level indicator
  - [ ] **Unit Tests**:
    - Progress calculations
    - Chart rendering logic
    - Achievement state
  - [ ] **Visual Tests**:
    - Chart accuracy
    - Responsive layouts
    - Animation behavior

### Week 11-12: Analytics Service

- [ ] **Analytics Backend**

  - [ ] Create analytics aggregation
  - [ ] Implement export functionality
  - [ ] Add reporting endpoints
  - [ ] Build data warehouse views
  - [ ] **OpenAPI**: Analytics endpoint documentation
  - [ ] **Unit Tests**:
    - Aggregation algorithms
    - Export formatting
    - Date range handling
  - [ ] **Integration Tests**:
    - Large dataset handling
    - Export generation
    - Query performance

- [ ] **Analytics Frontend**
  - [ ] Create analytics dashboard
  - [ ] Build report builder
  - [ ] Add export UI
  - [ ] Implement visualizations
  - [ ] **Unit Tests**:
    - Data transformation
    - Chart configurations
    - Export options
  - [ ] **Integration Tests**:
    - Report generation
    - Real-time updates
    - Export downloads

## Phase 3: Advanced Features (8-10 weeks)

### Week 13-14: Professional Practice Features

- [ ] **Quick Practice Timer Backend**
  - [ ] Create timer service
  - [ ] Implement quick-log processing
  - [ ] Add template management
  - [ ] Build activity categorization
  - [ ] **OpenAPI**: Timer and logging endpoints
  - [ ] **Unit Tests**:
    - Timer accuracy
    - Category validation
    - Template application
  - [ ] **Integration Tests**:
    - Timer lifecycle
    - Quick-log creation
    - Template CRUD

### Week 15-16: Offline Sync System

- [ ] **Offline Queue Implementation**
  - [ ] Create offline storage service
  - [ ] Implement sync algorithm
  - [ ] Add conflict resolution
  - [ ] Build retry mechanism
  - [ ] **Unit Tests**:
    - Queue management
    - Sync logic
    - Conflict resolution
  - [ ] **Integration Tests**:
    - Full sync flow
    - Network failure handling
    - Data integrity

### Week 17-18: Performance Optimization

- [ ] **Backend Optimization**
  - [ ] Implement caching layer
  - [ ] Add database indexing
  - [ ] Optimize query performance
  - [ ] Add request batching
  - [ ] **Performance Tests**:
    - Load testing
    - Query benchmarks
    - Cache hit rates
  - [ ] **Integration Tests**:
    - Cache invalidation
    - Batch processing
    - Rate limiting

### Week 19-20: Enhanced Player Features

- [ ] **Advanced Playback Controls**
  - [ ] Tempo adjustment while paused
  - [ ] A-B loop practice sections
  - [ ] Playback speed ramping
  - [ ] Bookmark positions
  - [ ] **Unit Tests**:
    - Tempo change persistence
    - Loop boundary validation
    - Bookmark management
  - [ ] **Integration Tests**:
    - Full playback workflow
    - State persistence
    - Multi-device sync

## Testing Standards

### Unit Test Requirements

```typescript
// Example unit test structure
describe('AuthService', () => {
  describe('generateMagicLink', () => {
    it('should generate valid magic link token', () => {
      // Test implementation
    })

    it('should expire after 10 minutes', () => {
      // Test implementation
    })

    it('should rate limit requests', () => {
      // Test implementation
    })
  })
})
```

### Integration Test Requirements

```typescript
// Example integration test
describe('POST /api/auth/login', () => {
  it('should send magic link email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' })

    expect(response.status).toBe(202)
    expect(mockEmailService).toHaveBeenCalled()
  })
})
```

### OpenAPI Documentation Requirements

```typescript
// Example OpenAPI documentation
@OpenAPIRoute({
  method: 'post',
  path: '/api/auth/login',
  summary: 'Request magic link',
  request: {
    body: z.object({
      email: z.string().email()
    })
  },
  responses: {
    202: {
      description: 'Magic link sent',
      schema: z.object({
        success: z.boolean(),
        message: z.string()
      })
    }
  }
})
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
      - name: Generate coverage report
        run: npm run test:coverage
      - name: Generate OpenAPI spec
        run: npm run openapi:generate
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Definition of Done

A feature is considered complete when:

1. ✅ All unit tests pass with >80% coverage
2. ✅ All integration tests pass
3. ✅ OpenAPI documentation is complete
4. ✅ Code passes linting and formatting
5. ✅ Feature works on all supported browsers
6. ✅ Accessibility requirements are met
7. ✅ Performance benchmarks are satisfied
8. ✅ Security review is complete
9. ✅ Documentation is updated
10. ✅ Code review is approved

## Success Metrics

### Code Quality Metrics

- **Test Coverage**: >80% for all modules
- **API Documentation**: 100% of endpoints documented
- **Build Time**: <2 minutes for full test suite
- **Bundle Size**: <500KB initial load

### Performance Metrics

- **API Response**: <100ms p95
- **Test Execution**: <30s for unit tests
- **Database Queries**: <50ms p95
- **Audio Latency**: <50ms

### Reliability Metrics

- **Test Flakiness**: <1% flaky tests
- **API Uptime**: >99.9%
- **Error Rate**: <0.1%
- **Rollback Time**: <5 minutes
