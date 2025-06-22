# Mirubato Architecture Design

## Overview

Mirubato (formerly Rubato) is a sight-reading practice application for musicians, built on Cloudflare's edge infrastructure. The application helps users improve their music reading skills through interactive practice sessions with real-time feedback.

## Current Architecture (2025)

### Infrastructure

All services run as Cloudflare Workers with the following domains:

| Service        | Production                     | Staging                                        |
| -------------- | ------------------------------ | ---------------------------------------------- |
| Frontend       | mirubato.com, www.mirubato.com | staging.mirubato.com, www-staging.mirubato.com |
| Backend API    | api.mirubato.com               | api-staging.mirubato.com                       |
| API v2         | apiv2.mirubato.com             | apiv2-staging.mirubato.com                     |
| Scores Service | scores.mirubato.com            | scores-staging.mirubato.com                    |

### Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                   (React + TypeScript)                       │
│                  mirubato / mirubato-staging                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─────────────────┬─────────────────────┐
                      │                 │                     │
              ┌───────▼────────┐ ┌─────▼──────┐     ┌────────▼────────┐
              │   Backend API  │ │   API v2   │     │ Scores Service  │
              │   (GraphQL)    │ │  (REST)    │     │     (REST)      │
              │ mirubato-backend│ │mirubato-api│     │ mirubato-scores │
              └───────┬────────┘ └─────┬──────┘     └────────┬────────┘
                      │                 │                      │
                      └─────────┬───────┘                      │
                                │                              │
                        ┌───────▼────────┐             ┌───────▼────────┐
                        │   D1 Database  │             │   D1 Database  │
                        │ (mirubato-prod)│             │(scores-prod)   │
                        └────────────────┘             └────────────────┘
```

### Service Details

#### 1. Frontend Service

- **Technology**: React 18, TypeScript, Vite, Tailwind CSS
- **Worker**: Serves static assets via Cloudflare Workers
- **Key Features**:
  - Music notation rendering (VexFlow.js)
  - Audio playback (Tone.js)
  - Real-time practice feedback
  - Offline-first with service workers
  - Module-based architecture with EventBus

#### 2. Backend API (GraphQL)

- **Technology**: Apollo Server, GraphQL, TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Purpose**: Core application logic, user management, practice sessions
- **Authentication**: Magic links + JWT tokens
- **Note**: Will be replaced by API v2 in future phases

#### 3. API v2 (REST) - Migration in Progress

- **Technology**: Hono framework, TypeScript
- **Purpose**: Will replace Backend API with improved architecture
- **Features**:
  - Google OAuth integration
  - Improved sync capabilities
  - Better rate limiting
  - RESTful design
  - Simpler deployment model

#### 4. Scores Service

- **Technology**: Hono framework, TypeScript
- **Database**: Separate D1 instance
- **Storage**: Cloudflare R2 for sheet music files
- **Purpose**: Music content management and delivery
- **Features**:
  - Score metadata management
  - Difficulty level tracking
  - Content categorization
  - CDN integration for fast delivery

### Database Architecture

#### Shared Database (Backend + API v2)

Currently sharing `mirubato-prod` / `mirubato-dev` databases with compatibility migrations:

```sql
-- Users table (unified schema)
users (
  id, email, display_name,
  primary_instrument,      -- Backend field
  auth_provider,          -- API v2 field
  google_id,              -- API v2 field
  created_at, updated_at
)

-- Practice data tables
practice_sessions, practice_logs, sheet_music,
logbook_entries, goals, user_preferences

-- Sync tables (API v2)
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

2. **Google OAuth (API v2)**:
   - OAuth2 flow with Google
   - Profile data stored in users table
   - Same JWT token system

### Deployment Architecture

- **CI/CD**: GitHub Actions for validation, Cloudflare dashboard for deployment
- **Environments**: Production (default), Staging, Development
- **Worker Names**:
  - Production: `mirubato`, `mirubato-backend`, `mirubato-api`, `mirubato-scores`
  - Staging: `*-staging` suffix for each worker
- **Build Process**: Each service built independently from its own directory

### Migration Strategy

The system is transitioning from Backend (GraphQL) to API v2 (REST):

1. **Phase 1** (Current): Both services run in parallel, sharing database
2. **Phase 2**: Gradual migration of frontend to use API v2 endpoints
3. **Phase 3**: Deprecate and remove Backend service

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

## Frontend Module Architecture

### Module Overview

```typescript
interface ModuleInterface {
  name: string
  version: string
  dependencies: string[]

  initialize(): Promise<void>
  shutdown(): Promise<void>
  getHealth(): Promise<ModuleHealth>

  // Event handling
  on(event: string, handler: EventHandler): void
  off(event: string, handler: EventHandler): void
  emit(event: string, data: any): void
}
```

### Active Modules (MVP Focus)

#### Core Infrastructure

1. **EventBus**: Central event-driven communication system
2. **StorageModule**: Local storage management with adapter pattern
3. **SyncModule**: Data synchronization between local and cloud storage
4. **PracticeLoggerModule**: Professional practice logbook management
5. **LogbookReportingModule**: Comprehensive analytics for practice logs
6. **VisualizationModule**: Data visualization using Chart.js

### Module Communication Flow

```mermaid
graph TD
    EventBus --> StorageServices
    StorageServices --> StorageModule
    StorageModule --> PracticeLoggerModule
    PracticeLoggerModule --> LogbookReportingModule
    LogbookReportingModule --> VisualizationModule
    StorageModule --> SyncModule
```

## Key Technologies

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Apollo Client
- **Music**: VexFlow.js (notation), Tone.js (audio), MusicXML support
- **Backend**: Cloudflare Workers, D1 (SQLite), R2 (object storage)
- **Frameworks**: Hono (API v2, Scores), Apollo Server (Backend)
- **Auth**: JWT tokens, magic links, Google OAuth

## Performance Considerations

1. **Edge Computing**: All logic runs at Cloudflare edge locations
2. **Database**: D1 provides low-latency SQLite at the edge
3. **Assets**: Static files served via Workers with caching
4. **API Response**: Sub-100ms response times globally

## Security

1. **Authentication**: JWT tokens with short expiration
2. **CORS**: Configured per environment
3. **Rate Limiting**: Built into Workers platform
4. **Data Isolation**: User data segregated by user_id foreign keys

## Development Workflow

```bash
# Local development
npm run dev              # Frontend (port 3000)
npm run dev:backend      # Backend (port 8787)

# Deployment (from respective directories)
cd [service] && wrangler deploy               # Production
cd [service] && wrangler deploy --env staging # Staging

# Database migrations
cd backend && npm run db:migrate:production   # Production
cd backend && npm run db:migrate:staging      # Staging
```

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

### Phase 1: MVP - Logbook Focus (Current)

- Core functionality: Practice logging and reporting
- Manual practice entry
- Comprehensive reporting with multiple views
- Data export (CSV, JSON)
- Works for both anonymous and authenticated users

### Phase 2: Practice Mode (Future)

- Sheet music display and playback
- Real-time performance tracking
- Progress analytics
- Modules preserved in codebase for future activation

### Phase 3: Advanced Features (Future)

- Multi-voice support
- MIDI integration
- AI coaching
- Social features

## Future Considerations

1. **API Consolidation**: Complete migration to API v2
2. **Mobile Apps**: React Native using same API
3. **Advanced Features**: AI-powered difficulty adjustment
4. **Scaling**: Multi-region database replication

---

This design document represents the current state of Mirubato's architecture and will continue to evolve as the application grows.
