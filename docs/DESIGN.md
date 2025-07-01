# Mirubato Architecture Design

## Overview

Mirubato is a sight-reading practice application for musicians, built on Cloudflare's edge infrastructure. The application helps users improve their music reading skills through interactive practice sessions with real-time feedback.

## Current Architecture - Version 1.1.0 (June 2025)

### Version 1.1.0 Highlights

- **D1 Database Stability**: Complete null value handling for all database operations
- **Enhanced UI**: Full Tailwind color palette support for calendar visualization
- **Improved Sync**: Robust error handling for online/offline transitions
- **Test Coverage**: 290+ tests ensuring reliability across all services
- **Production Ready**: All MVP features implemented and tested

### Infrastructure

All services run as Cloudflare Workers with the following domains:

| Service        | Production                     | Staging                                        |
| -------------- | ------------------------------ | ---------------------------------------------- |
| Frontend       | mirubato.com, www.mirubato.com | staging.mirubato.com, www-staging.mirubato.com |
| API            | api.mirubato.com               | api-staging.mirubato.com                       |
| Scores Service | scores.mirubato.com            | scores-staging.mirubato.com                    |

### Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                   (React + TypeScript)                       │
│                  mirubato / mirubato-staging                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─────────────────────────┬──────────────┐
                      │                         │              │
              ┌───────▼────────┐        ┌───────▼────────┐     │
              │     API        │        │ Scores Service │     │
              │    (REST)      │        │     (REST)     │     │
              │ mirubato-api   │        │mirubato-scores │     │
              └───────┬────────┘        └───────┬────────┘     │
                      │                         │              │
                      │                         │              │
              ┌───────▼────────┐        ┌───────▼────────┐     │
              │  D1 Database   │        │  D1 Database   │     │
              │(mirubato-prod) │        │ (scores-prod)  │     │
              └────────────────┘        └────────────────┘     │
```

### Service Details

#### 1. Frontend Service

- **Technology**: React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **Worker**: Serves static assets via Cloudflare Workers
- **State Management**: Zustand stores for auth and logbook data
- **Key Features**:
  - Practice logging with manual entry and timer
  - Enhanced reporting with calendar visualization
  - Goal setting and tracking
  - Offline-first with local storage sync
  - Optimized bundle with code splitting
  - Comprehensive caching headers for static assets
  - Internationalization (i18n) with 6 languages

**Note**: The documented module-based architecture with EventBus is not currently implemented. The actual implementation uses a simpler, more pragmatic approach with React components and Zustand stores.

#### 2. API (REST)

- **Technology**: Hono framework, TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Purpose**: Core application logic, user management, practice sessions
- **Authentication**: Magic links + JWT tokens + Google OAuth
- **Features**:
  - RESTful design
  - Sync capabilities for offline-first architecture
  - Rate limiting
  - Google OAuth integration
  - Comprehensive health monitoring (/health, /livez, /readyz)
  - JWT validation in health checks
  - Prometheus-compatible metrics endpoint
  - Cloudflare KV caching for improved performance

#### 3. Scores Service

- **Technology**: Hono framework, TypeScript
- **Database**: Separate D1 instance
- **Storage**: Cloudflare R2 for sheet music files
- **Purpose**: Music content management and delivery
- **Features**:
  - Score metadata management
  - Difficulty level tracking
  - Content categorization
  - CDN integration for fast delivery
  - JWT authentication for protected endpoints
  - Edge caching with conditional requests (ETags)
  - Health monitoring with smoke tests
  - Metrics endpoint for observability

### Database Architecture

#### Main Database (API)

The API uses `mirubato-prod` / `mirubato-dev` databases with the following schema:

```sql
-- Users table
users (
  id, email, display_name,
  primary_instrument,
  auth_provider,
  google_id,
  created_at, updated_at
)

-- Practice data tables
practice_sessions, practice_logs, sheet_music,
logbook_entries, goals, user_preferences

-- Sync tables
sync_data, sync_metadata
```

#### Scores Database

Separate database for content management:

```sql
-- Content tables
scores, composers, genres, difficulty_levels,
score_metadata, user_scores
```

### Authentication Flow

1. **Magic Link (Primary)**:
   - User enters email
   - System sends magic link via email
   - Link contains short-lived token
   - Token exchanged for JWT

2. **Google OAuth**:
   - OAuth2 flow with Google
   - Profile data stored in users table
   - Same JWT token system

### JWT Token Architecture

JWT tokens are used for authentication across services with a shared secret approach:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │   API Service   │    │ Scores Service  │
│   (React SPA)   │    │                 │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Receives JWT  │◄──►│ • Creates JWT   │    │ • Verifies JWT  │
│ • Stores JWT    │    │ • Verifies JWT  │    │ • Uses same     │
│ • Sends JWT     │    │ • Uses SECRET   │    │   SECRET as API │
│ • NO SECRET     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### JWT Secret Management

- **API Service**: Creates and signs JWT tokens during authentication
- **Scores Service**: Validates JWT tokens from authenticated requests
- **Frontend**: Receives, stores, and sends tokens (no secret access)

**Critical**: The `JWT_SECRET` must be identical between API and Scores services for token validation to work. Secrets are managed via Cloudflare Workers secrets (not environment variables).

```bash
# Set the same JWT_SECRET in both services
cd api && wrangler secret put JWT_SECRET --env staging
cd scores && wrangler secret put JWT_SECRET --env staging
# Use identical values for both
```

#### Security Principles

1. **Client-Side Isolation**: JWT_SECRET never exposed to frontend code
2. **Shared Validation**: All backend services use the same secret for consistency
3. **Secret Rotation**: Secrets can be rotated by updating all services simultaneously
4. **Environment Separation**: Different secrets per environment (staging, production)

### Deployment Architecture

- **CI/CD**: GitHub Actions for validation, Cloudflare dashboard for deployment
- **Environments**: Production (default), Staging, Development
- **Worker Names**:
  - Production: `mirubato`, `mirubato-api`, `mirubato-scores`
  - Staging: `*-staging` suffix for each worker
- **Build Process**: Each service built independently from its own directory

### Architecture Status

✅ **Migration Complete**: The system has successfully transitioned to a REST-only architecture:

- GraphQL backend service has been completely removed
- Frontend exclusively uses REST API endpoints
- Database schema unified for REST architecture
- All legacy GraphQL code and dependencies removed

## Core Design Principles

### 1. Local-First Architecture

- **Offline by default**: All core features work without internet connection
- **Progressive enhancement**: Online features enhance the experience
- **Data ownership**: Users control their practice data
- **Instant responsiveness**: No network latency for core interactions

### 2. Module-Based Architecture

- **Separation of concerns**: Each module handles a specific domain
- **Event-driven communication**: Modules communicate via EventBus
- **Dependency injection**: Clear initialization order and dependencies
- **Testable**: Each module can be tested in isolation

### 3. Minimalist UI Philosophy

- **Ghost controls**: 5% opacity when not in use
- **Progressive disclosure**: Show only what's needed
- **Focus on content**: Sheet music is the primary visual element
- **Responsive design**: Adapts to device and orientation

## Frontend Architecture

### Current Implementation (Pragmatic MVP)

The frontend uses a straightforward React architecture without the complex module system described in the original design:

#### State Management

- **Zustand Stores**: Simple, lightweight state management
  - `authStore`: User authentication and session
  - `logbookStore`: Practice entries and local data
  - Direct API calls via Axios clients

#### Key Components

**Pages**

- **Home**: Landing page with feature overview
- **Logbook**: Practice session tracking and reporting
- **Toolbox**: Metronome with customizable patterns
- **Scorebook**: Sheet music browser and viewer
- **Auth**: Authentication pages (verify, callback)

**Core Components**

- **LogbookEntryList**: Main entry management component
- **EnhancedPracticeReports**: Advanced reporting with charts
- **ManualEntryForm**: Practice entry creation
- **InteractivePiano**: Simple piano widget (lazy loaded)

**Layout Components**

- **UnifiedHeader**: Consistent navigation header across all pages
  - Handles authentication state display
  - Provides navigation between main sections
  - Triggers sign-in modal when needed

**Auth Components**

- **SignInModal**: Shared authentication modal used across all pages
  - Google OAuth integration via One Tap
  - Magic link email authentication
  - Consistent user experience across the app
- **GoogleSignInButton**: Google OAuth button component
- **ProtectedRoute**: Route guard for authenticated pages

#### Data Flow

```
React Components → Zustand Stores → API Clients → REST API
                 ↓
            Local Storage (offline sync)
```

### Planned Module Architecture (Not Implemented)

The original design envisioned a complex module system with EventBus for loose coupling. This architecture remains in the documentation for potential future implementation but was deferred in favor of shipping a working MVP.

**Recommendation**: The current simpler architecture is more appropriate for the MVP stage. The module system could be reconsidered when the application grows significantly in complexity.

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, Axios, Chart.js
- **Music Libraries**: VexFlow.js and Tone.js (present but minimally used)
- **Backend**: Cloudflare Workers, D1 (SQLite), KV (caching)
- **API Framework**: Hono with Zod validation
- **Auth**: JWT tokens, magic links, Google OAuth
- **i18n**: react-i18next (6 languages: en, es, fr, de, ja, zh)
- **Testing**: Vitest, Playwright

## Performance Considerations

1. **Edge Computing**: All logic runs at Cloudflare edge locations
2. **Database**: D1 provides low-latency SQLite at the edge
3. **Assets**: Static files served via Workers with comprehensive caching:
   - Immutable assets cached for 1 year
   - Images cached for 1 day in browser, 1 year at edge
   - API responses cached for 1 minute at edge
4. **API Response**: Sub-100ms response times globally
5. **Bundle Optimization**:
   - Code splitting reduces initial load by 43%
   - Lazy loading for heavy libraries (Tone.js)
   - Vendor chunks for better caching

## Security

1. **Authentication**: JWT tokens with short expiration
2. **CORS**: Configured per environment
3. **Rate Limiting**: Built into Workers platform
4. **Data Isolation**: User data segregated by user_id foreign keys
5. **Health Check Security**: JWT validation in health endpoints
6. **Auth Middleware**: Consistent authentication across all services

### Secret Management

Sensitive configuration is handled via Cloudflare Workers secrets:

**Required Secrets by Service:**

| Service | Secrets                | Purpose                         |
| ------- | ---------------------- | ------------------------------- |
| API     | `JWT_SECRET`           | Sign/verify JWT tokens          |
|         | `MAGIC_LINK_SECRET`    | Sign magic link tokens          |
|         | `RESEND_API_KEY`       | Email service integration       |
|         | `GOOGLE_CLIENT_SECRET` | OAuth integration               |
| Scores  | `JWT_SECRET`           | Verify JWT tokens (same as API) |

**Secret Rotation Process:**

1. Generate new secret: `openssl rand -base64 32`
2. Update all services simultaneously
3. Monitor health endpoints for validation
4. Test cross-service authentication

**Debug Tools:**

- `/debug/jwt-test` endpoints in staging for secret verification
- Health checks validate secret functionality
- Metrics track authentication success rates

## Health Monitoring

### Endpoints

All services expose comprehensive health monitoring:

- `/health` - Comprehensive health check with all service dependencies
- `/livez` - Liveness probe (simple check that service is running)
- `/readyz` - Readiness probe (check if service can handle requests)
- `/metrics` - Prometheus-compatible metrics endpoint

### Health Check Features

1. **Database connectivity** - Verifies D1 database is accessible
2. **JWT validation** - Tests token creation and verification
3. **Storage access** - Checks R2 bucket connectivity (Scores service)
4. **Cache operations** - Validates KV namespace read/write
5. **Smoke tests** - Runs critical operations to ensure functionality

### Monitoring URLs

- API Health: https://api.mirubato.com/health
- Scores Health: https://scores.mirubato.com/health
- Frontend: Served via static assets, monitored through edge analytics

## Development Workflow

```bash
# Local development
npm run dev              # Frontend (port 3000)
npm run dev:api          # API (port 8787)

# Deployment (from respective directories)
cd [service] && wrangler deploy               # Production
cd [service] && wrangler deploy --env staging # Staging

# Database migrations (from api directory)
cd api && npm run db:migrate:production   # Production
cd api && npm run db:migrate:staging      # Staging
```

## Caching Architecture

### Edge Caching Strategy

Mirubato implements a multi-layer caching strategy leveraging Cloudflare's edge infrastructure:

#### 1. Frontend Asset Caching

```
Static Assets (JS, CSS with hashing): 1 year (immutable)
Images (JPG, PNG, SVG): 1 day browser, 1 year edge
Fonts (WOFF2, TTF): 1 month browser, 1 year edge
HTML: No cache (always fresh)
```

#### 2. API Response Caching

- **Public endpoints**: Cached at edge for 1 minute
- **Authenticated requests**: Never cached
- **Conditional requests**: Support for ETags and 304 responses

#### 3. Scores Service Caching

- **PDFs**: Immutable caching (1 year)
- **Metadata**: 5 minutes at edge
- **KV fallback**: When edge cache misses

### Bundle Optimization

The frontend implements aggressive code splitting:

- **Initial bundle**: Reduced from 631KB to smaller chunks
- **Lazy loading**: Heavy libraries loaded on demand
- **Vendor chunks**: Separate chunks for better caching
  - react-vendor: React ecosystem
  - music-vendor: VexFlow + Tone.js
  - utils-vendor: Utilities and helpers
  - i18n-vendor: Internationalization

## Testing Strategy

### Coverage Requirements

- **Unit Tests**: >80% coverage per module
- **Integration Tests**: Critical user flows
- **E2E Tests**: Key user journeys
- **Performance Tests**: <100ms response times

### Performance Targets

| Metric              | Target | Critical |
| ------------------- | ------ | -------- |
| Initial Load        | <2s    | <3s      |
| Time to Interactive | <3s    | <5s      |
| API Response        | <100ms | <200ms   |
| Frame Rate          | 60fps  | 30fps    |
| Memory Usage        | <100MB | <200MB   |

## Architecture Phases

### Phase 1: MVP - Logbook Focus (✅ COMPLETE - v1.1.0)

- ✅ Core functionality: Practice logging and reporting
- ✅ Manual practice entry with timer
- ✅ Enhanced reporting with calendar visualization
- ✅ Data export (CSV, JSON)
- ✅ Works for both anonymous and authenticated users
- ✅ Goal setting and tracking
- ✅ Multi-instrument support (Piano & Guitar)
- ✅ Internationalization (6 languages)
- ✅ Autocomplete for composers and pieces
- ✅ Production deployment at mirubato.com

### Phase 2: Practice Mode (Future)

- Sheet music display and playback (VexFlow.js ready)
- Real-time performance tracking
- Audio recording and playback (Tone.js ready)
- Progress analytics
- Integration with scores service

**Note**: While the module system is not implemented, the music libraries (VexFlow.js, Tone.js) are included and ready for future use.

### Phase 3: Advanced Features (Future)

- Multi-voice support
- MIDI integration
- AI coaching
- Social features

## Architecture Decision Analysis

### Planned vs Implemented

| Aspect             | Planned Architecture                | Current Implementation        | Recommendation                                                      |
| ------------------ | ----------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| **Frontend State** | Complex module system with EventBus | Simple Zustand stores         | ✅ Current approach is better for MVP - simpler, easier to maintain |
| **Music Features** | Full VexFlow/Tone.js integration    | Libraries included but unused | ⏳ Good to have libraries ready for Phase 2                         |
| **API Design**     | Started with GraphQL                | Migrated to REST              | ✅ REST is simpler and sufficient for current needs                 |
| **Authentication** | JWT + Magic Links                   | Fully implemented as planned  | ✅ Working well                                                     |
| **Database**       | D1 with sync capabilities           | Fully implemented with fixes  | ✅ Good choice for edge deployment                                  |
| **i18n**           | Not in original design              | Added with 6 languages        | ✅ Great addition for global reach                                  |

### Key Insights

1. **Pragmatism Wins**: The team chose to ship a working MVP rather than build the complex module system. This was the right decision.

2. **Technical Debt**: The module system documentation should be moved to a "future architecture" section to avoid confusion.

3. **Music Features**: Having VexFlow.js and Tone.js ready positions the app well for Phase 2, but they add bundle size without current value.

4. **REST over GraphQL**: The migration from GraphQL to REST simplified the architecture significantly without losing functionality.

## Future Considerations

1. **Mobile Apps**: React Native using same REST API
2. **Advanced Features**: AI-powered difficulty adjustment
3. **Scaling**: Multi-region database replication
4. **Performance**: Edge caching optimization
5. **Module System**: Reconsider when app complexity justifies it

---

This design document represents the current state of Mirubato's architecture and will continue to evolve as the application grows.
