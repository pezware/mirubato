# Mirubato System Design

## Overview

Mirubato is an open-source sight-reading practice platform built with a local-first, modular architecture. Users can practice immediately without authentication, with all data stored locally. Authentication enables optional cloud synchronization for cross-device access and backup.

## Core Design Principles

1. **Local-First Architecture**: Full functionality without login; authentication adds cloud sync
2. **Modular Design**: Clear separation of concerns with well-defined module interfaces
3. **GraphQL-First API**: Unified data operations with strong typing
4. **Offline-First**: Complete offline functionality with intelligent sync
5. **Progressive Enhancement**: Basic features work immediately, advanced features add value
6. **Type Safety**: End-to-end typing from GraphQL schema to TypeScript
7. **Educational Focus**: Every feature designed to enhance sight-reading learning

## System Architecture

### High-Level Architecture

The system follows a three-tier architecture with clear separation between presentation, business logic, and data layers:

- **Presentation Layer**: React components with Apollo Client
- **Business Logic Layer**: Modular services with middleware
- **Data Layer**: Hybrid local/cloud storage with sync capabilities

### Data Storage Strategy

#### Without Authentication (Local-Only)

- **LocalStorage**: User preferences, session summaries, progress tracking
- **IndexedDB**: Complete practice data, sheet music cache, detailed logs
- **Apollo Cache**: Runtime state and query results

#### With Authentication (Local + Cloud Sync)

- **Local Storage**: Same as above (primary data source)
- **Cloud Storage**: Cloudflare D1 database (backup and sync)
- **Sync Strategy**: Incremental sync with conflict resolution

## Module Architecture

### Core Modules

#### 1. User Management Module

**Purpose**: Handle user profiles, preferences, and authentication state
**Interfaces**:

- `initializeUser()` - Create local user profile
- `authenticateUser(email)` - Request magic link
- `verifyAuthentication(token)` - Verify magic link
- `getUserProfile()` - Get current user data
- `updateUserPreferences(preferences)` - Update settings
- `getUserInstruments()` - Get instrument configuration
- `setUserLevel(instrument, level)` - Update proficiency

#### 2. Practice Session Module

**Purpose**: Manage practice session lifecycle
**Interfaces**:

- `startSession(type, params)` - Begin new session
- `pauseSession()` - Pause active session
- `resumeSession()` - Resume paused session
- `endSession()` - Complete and save session
- `getActiveSession()` - Get current session state
- `getSessionHistory(filters)` - Query past sessions
- `syncSessions()` - Sync local sessions to cloud (if authenticated)

#### 3. Sheet Music Module

**Purpose**: Handle music generation, selection, and rendering
**Interfaces**:

- `generateExercise(params)` - Create algorithmic exercise
- `getSheetMusic(id)` - Retrieve specific piece
- `searchSheetMusic(filters)` - Search music library
- `renderNotation(musicData, instrument)` - Generate visual notation
- `getRecommendedMusic(userLevel)` - Get personalized suggestions
- `cacheSheetMusic(id)` - Store for offline use

#### 4. Audio Engine Module

**Purpose**: Manage audio playback and timing
**Interfaces**:

- `initializeAudio()` - Setup Web Audio context
- `loadInstrumentSamples(instrument)` - Load sound samples
- `playNote(pitch, duration)` - Play single note
- `playSequence(notes, tempo)` - Play note sequence
- `startMetronome(bpm, timeSignature)` - Metronome control
- `stopAllAudio()` - Stop all playing sounds

#### 5. Performance Tracking Module

**Purpose**: Monitor practice performance and accuracy
**Interfaces**:

- `startTracking(sheetMusicId)` - Begin tracking
- `recordNoteEvent(note, timing, accuracy)` - Log performance
- `calculateAccuracy()` - Real-time accuracy metrics
- `generateFeedback()` - Create performance feedback
- `getPerformanceMetrics()` - Get session metrics
- `savePerformance()` - Store results locally

#### 6. Progress Analytics Module

**Purpose**: Analyze long-term progress and achievements
**Interfaces**:

- `getProgressReport(timeRange)` - Generate reports
- `getSkillProgression(skill)` - Track skill development
- `getPracticeStreak()` - Calculate consistency
- `getAchievements()` - Check milestones
- `exportAnalytics(format)` - Export data
- `syncProgress()` - Sync to cloud (if authenticated)

#### 7. Practice Logger Module

**Purpose**: Professional practice journaling
**Interfaces**:

- `startPracticeTimer(activityType)` - Quick timer
- `stopPracticeTimer()` - End timing
- `createPracticeEntry(details)` - Detailed log
- `getPracticeJournal(filters)` - Query logs
- `getTimeAnalytics()` - Time statistics
- `createPracticeTemplate(template)` - Save templates

#### 8. Curriculum Module

**Purpose**: Manage learning progression
**Interfaces**:

- `getCurrentLevel(instrument)` - Get proficiency
- `getNextExercises()` - Get recommendations
- `assessReadiness(nextLevel)` - Check advancement
- `unlockLevel(level)` - Progress level
- `getStudyPlan()` - Get curriculum path

### Infrastructure Modules

#### 9. Storage Module

**Purpose**: Abstract storage operations
**Interfaces**:

- `saveLocal(key, data)` - Save to local storage
- `loadLocal(key)` - Load from local storage
- `saveCloud(key, data)` - Save to cloud (if authenticated)
- `loadCloud(key)` - Load from cloud
- `syncData()` - Synchronize local/cloud

#### 10. Sync Module

**Purpose**: Handle data synchronization
**Interfaces**:

- `queueOperation(operation)` - Add to sync queue
- `processSyncQueue()` - Process pending syncs
- `resolveConflicts(local, remote)` - Handle conflicts
- `getSyncStatus()` - Get sync state
- `forceSyncAll()` - Manual full sync

## Middleware Layer

### Data Sync Middleware

- Intercepts all data operations
- Manages offline queue for mutations
- Handles conflict resolution (last-write-wins for preferences, merge for sessions)
- Coordinates local/cloud synchronization

### Cache Middleware

- Apollo Client cache management
- Sheet music prefetching strategy
- Audio sample preloading
- Session data caching

### Analytics Middleware

- Privacy-compliant event tracking
- Performance metric collection
- Educational effectiveness measurement
- Usage pattern analysis

### Error Handling Middleware

- Audio context recovery
- Network error resilience
- Notation rendering fallbacks
- User-friendly error messages

## Service Layer Architecture

### GraphQL Services (Backend)

- **AuthService**: Authentication and JWT management
- **UserService**: User data and preferences
- **SessionService**: Practice session operations
- **MusicService**: Sheet music CRUD
- **ProgressService**: Analytics and reporting
- **LoggerService**: Practice journal management

### Client Services (Frontend)

- **LocalStorageService**: Browser storage abstraction
- **IndexedDBService**: Large data persistence
- **AudioContextService**: Web Audio API wrapper
- **NotationService**: VexFlow integration
- **SyncService**: Data synchronization logic

## Data Flow Patterns

### Local-First Practice Flow

1. User starts practice without login
2. Session data stored in IndexedDB
3. Progress tracked in LocalStorage
4. No network calls required

### Authenticated Sync Flow

1. User logs in via magic link
2. Local data queued for sync
3. Incremental sync to cloud
4. Conflict resolution applied
5. Cross-device access enabled

### Module Communication Pattern

- Modules communicate through defined interfaces only
- Events published through central event bus
- State managed by Apollo Client reactive variables
- Middleware intercepts cross-cutting concerns

## Database Schema (Cloudflare D1)

### Core Tables

#### users

- id (TEXT PRIMARY KEY)
- email (TEXT UNIQUE NOT NULL)
- display_name (TEXT)
- avatar_url (TEXT)
- primary_instrument (TEXT)
- skill_level (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)
- last_login_at (DATETIME)
- preferences (JSON)
- is_active (BOOLEAN)

#### sheet_music

- id (TEXT PRIMARY KEY)
- title (TEXT NOT NULL)
- composer (TEXT)
- instrument (TEXT NOT NULL)
- difficulty_level (INTEGER)
- notation_data (JSON)
- metadata (JSON)
- created_at (DATETIME)

#### practice_sessions

- id (TEXT PRIMARY KEY)
- user_id (TEXT NOT NULL)
- session_date (DATE NOT NULL)
- start_time (DATETIME NOT NULL)
- end_time (DATETIME)
- duration_seconds (INTEGER)
- session_type (TEXT)
- accuracy_percentage (REAL)
- created_at (DATETIME)

#### practice_logs

- id (TEXT PRIMARY KEY)
- user_id (TEXT NOT NULL)
- session_id (TEXT)
- sheet_music_id (TEXT)
- activity_type (TEXT NOT NULL)
- start_time (DATETIME NOT NULL)
- duration_seconds (INTEGER)
- practice_details (JSON)
- created_at (DATETIME)

#### progress_tracking

- id (TEXT PRIMARY KEY)
- user_id (TEXT NOT NULL)
- instrument (TEXT NOT NULL)
- skill_area (TEXT NOT NULL)
- current_level (INTEGER)
- metrics (JSON)
- achievements (JSON)
- updated_at (DATETIME)

## GraphQL API Design

### Schema Principles

- Nullable types for optional fields
- Input types for mutations
- Connection types for pagination
- Strong typing throughout

### Query Types

- User queries (profile, preferences)
- Sheet music queries (list, search, recommendations)
- Practice queries (sessions, logs, progress)
- Analytics queries (reports, achievements)

### Mutation Types

- Authentication mutations (magic link flow)
- User mutations (profile updates)
- Practice mutations (session management)
- Logger mutations (journal entries)

### Subscription Types (Future)

- Real-time practice updates
- Achievement notifications
- Collaborative features

## Performance Considerations

### Frontend Performance

- React.memo for expensive components
- Virtual scrolling for long lists
- SVG caching for notation
- Lazy loading for routes

### Audio Performance

- Preloaded instrument samples
- Web Audio API scheduling
- Efficient buffer management
- Low-latency playback

### Storage Performance

- IndexedDB for large datasets
- Compression for practice logs
- Retention policies
- Efficient sync protocols

### Network Performance

- GraphQL query batching
- Edge caching (Cloudflare)
- Optimistic updates
- Minimal data transfer

## Security Architecture

### Authentication Security

- Magic links (no passwords)
- JWT with short expiration
- Refresh token rotation
- Secure token storage

### Data Security

- Row-level security in D1
- Input validation (Zod schemas)
- Rate limiting per endpoint
- CORS configuration

### Privacy Protection

- Local-first data storage
- Opt-in cloud sync
- Data export capability
- GDPR compliance

## Deployment Architecture

### Environment Strategy

- Local development environment
- Development cloud environment
- Staging environment
- Production environment

### Infrastructure Components

- Frontend: Cloudflare Workers
- Backend: Cloudflare Workers
- Database: Cloudflare D1
- Cache: Cloudflare KV
- Files: Cloudflare R2 (future)

### CI/CD Pipeline

- Automated testing (unit, integration)
- Branch-based deployments
- Environment promotion
- Rollback capabilities

## Monitoring and Observability

### Application Monitoring

- Error tracking (Sentry)
- Performance monitoring
- User analytics
- Educational metrics

### Infrastructure Monitoring

- Worker performance
- Database query times
- Cache hit rates
- API response times

### Business Metrics

- User engagement
- Practice consistency
- Learning outcomes
- Feature adoption

## Future Architecture Extensions

### Planned Modules

- **MIDI Module**: Hardware instrument input
- **Teacher Module**: Assignment management
- **Social Module**: Friends and challenges
- **AI Module**: Adaptive difficulty
- **Collaboration Module**: Real-time multiplayer

### Technical Enhancements

- Service Worker for true offline
- WebAssembly for performance
- GraphQL subscriptions
- Advanced caching strategies

## Development Guidelines

### Module Development

- Define clear interfaces first
- Write comprehensive tests
- Document public APIs
- Follow single responsibility

### API Development

- Schema-first design
- Consistent naming conventions
- Proper error handling
- Performance optimization

### Testing Strategy

- Unit tests per module
- Integration tests for flows
- E2E tests for critical paths
- Performance benchmarks

### Documentation Requirements

- Module API documentation
- Integration examples
- Architecture decisions
- Migration guides
