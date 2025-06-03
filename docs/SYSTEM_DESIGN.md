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

## Module Dependencies

### Dependency Graph

```
User Management
  └─> Storage Module (for preferences)

Practice Session
  ├─> User Management (for user context)
  ├─> Sheet Music (for content)
  ├─> Audio Engine (for playback)
  ├─> Performance Tracking (for metrics)
  └─> Storage Module (for persistence)

Sheet Music
  └─> Storage Module (for caching)

Audio Engine
  └─> (No dependencies - standalone)

Performance Tracking
  ├─> Practice Session (for context)
  └─> Storage Module (for metrics storage)

Progress Analytics
  ├─> Performance Tracking (for data)
  ├─> Practice Logger (for history)
  └─> Storage Module (for persistence)

Practice Logger
  ├─> User Management (for user context)
  └─> Storage Module (for journal entries)

Curriculum
  ├─> Progress Analytics (for assessment)
  ├─> Sheet Music (for content)
  └─> User Management (for level tracking)

Storage Module
  └─> Sync Module (for cloud operations)

Sync Module
  └─> (No module dependencies - infrastructure)
```

### Initialization Order

1. **Infrastructure Layer**: Storage Module, Sync Module
2. **Core Services**: Audio Engine, User Management
3. **Content Layer**: Sheet Music Module
4. **Session Layer**: Practice Session, Performance Tracking
5. **Analytics Layer**: Practice Logger, Progress Analytics
6. **Learning Layer**: Curriculum Module

### Interface Contracts

Each module must:

- Export a typed interface definition
- Provide initialization method returning Promise
- Handle graceful degradation if dependencies unavailable
- Emit lifecycle events (initialized, error, shutdown)

## Event Bus Architecture

### Event System Design

#### Event Naming Convention

- **Format**: `module:action:status`
- **Examples**:
  - `session:start:success`
  - `sync:conflict:resolved`
  - `audio:playback:error`

#### Event Categories

1. **Lifecycle Events**

   - `module:init:start`
   - `module:init:complete`
   - `module:init:error`
   - `module:shutdown:complete`

2. **Data Events**

   - `data:create:success`
   - `data:update:success`
   - `data:delete:success`
   - `data:sync:required`

3. **User Action Events**

   - `user:login:success`
   - `user:practice:start`
   - `user:achievement:unlocked`

4. **System Events**
   - `system:online:true`
   - `system:storage:low`
   - `system:error:critical`

#### Event Payload Structure

```
interface EventPayload {
  eventId: string;          // Unique event identifier
  timestamp: number;        // Unix timestamp
  source: string;           // Module name
  type: string;             // Event type
  data: any;                // Event-specific data
  metadata: {
    userId?: string;
    sessionId?: string;
    version: string;
  };
}
```

#### Event Priority Levels

1. **CRITICAL** (0): System failures, data corruption
2. **HIGH** (1): User actions, data changes
3. **NORMAL** (2): Progress updates, analytics
4. **LOW** (3): Debug information, metrics

#### Subscription Patterns

- **Direct Subscription**: For specific events
- **Pattern Subscription**: Using wildcards (`session:*:success`)
- **Priority Subscription**: Only high-priority events
- **Filtered Subscription**: Based on metadata criteria

## Data Migration Strategy

### Schema Versioning

#### Version Management

- Each storage schema has version number
- Version stored in metadata: `_schema_version`
- Migrations run automatically on version mismatch
- Rollback supported for one version

#### Migration Process

1. **Detection Phase**

   - Check current schema version
   - Compare with application version
   - Identify required migrations

2. **Backup Phase**

   - Create backup of current data
   - Store in temporary IndexedDB
   - Verify backup integrity

3. **Migration Phase**

   - Run migrations sequentially
   - Validate each step
   - Update version number

4. **Verification Phase**
   - Test data integrity
   - Verify functionality
   - Clean up backup if successful

### Backward Compatibility

#### Compatibility Rules

- Support current version and one version back
- Graceful degradation for older versions
- Clear upgrade prompts for unsupported versions
- Data export available before forced upgrade

#### Data Upgrade Paths

1. **Additive Changes**: New fields with defaults
2. **Transformative Changes**: Data conversion functions
3. **Destructive Changes**: User confirmation required
4. **Format Changes**: Automatic conversion utilities

## Error Recovery Patterns

### Module-Specific Recovery

#### User Management Module

- **Auth Failure**: Fallback to anonymous mode
- **Profile Corruption**: Restore from backup
- **Preference Errors**: Reset to defaults
- **Token Expiry**: Automatic refresh attempt

#### Practice Session Module

- **Session Crash**: Auto-save every 30 seconds
- **Data Loss**: Recover from temporary storage
- **Sync Failure**: Queue for later retry
- **State Corruption**: Rebuild from events

#### Audio Engine Module

- **Context Failure**: Reinitialize audio context
- **Sample Load Error**: Use fallback samples
- **Playback Failure**: Silent mode with visual cue
- **Memory Issues**: Clear unused buffers

#### Storage Module

- **Quota Exceeded**: Clean old data automatically
- **Corruption**: Restore from cloud if available
- **Access Denied**: Fallback to memory storage
- **Sync Conflict**: User choice or auto-resolve

### Recovery Strategies

#### Automatic Recovery

1. **Retry Logic**: Exponential backoff
2. **Circuit Breaker**: Prevent cascade failures
3. **Fallback Services**: Degraded functionality
4. **Self-Healing**: Automatic cleanup and repair

#### User Notification Strategies

1. **Silent Recovery**: No user interruption
2. **Info Toast**: Non-blocking notification
3. **Warning Dialog**: User acknowledgment
4. **Error Screen**: Full attention required

#### Recovery Priorities

1. **Preserve User Data**: Never lose practice progress
2. **Maintain Functionality**: Degraded better than broken
3. **Clear Communication**: Explain what happened
4. **Quick Resolution**: Minimize disruption

## Module Communication Patterns

### Communication Types

#### 1. Request/Response Pattern

- **Use Case**: Synchronous data fetching
- **Example**: Getting user preferences
- **Timeout**: 5 seconds default
- **Retry**: 3 attempts with backoff

#### 2. Publish/Subscribe Pattern

- **Use Case**: Event-driven updates
- **Example**: Practice session events
- **Delivery**: At-least-once guarantee
- **Ordering**: FIFO within priority

#### 3. Command/Query Pattern

- **Use Case**: CQRS implementation
- **Commands**: State-changing operations
- **Queries**: Read-only operations
- **Benefits**: Optimized for each use case

#### 4. Message Queue Pattern

- **Use Case**: Offline operations
- **Example**: Sync queue management
- **Persistence**: IndexedDB backed
- **Processing**: Batch or individual

## State Management Strategy

### State Categories

#### Local State

- Component-specific UI state
- Temporary form data
- Animation states
- Not persisted

#### Module State

- Module-specific business logic
- Cached computations
- Active session data
- Persisted selectively

#### Global State

- User authentication status
- Application preferences
- Active practice session
- Cross-module shared data

#### Persistent State

- User progress data
- Practice history
- Achievements
- Sheet music cache

### State Synchronization

#### Sync Patterns

1. **Immediate Sync**: Critical data (preferences)
2. **Batched Sync**: Performance data (5-minute intervals)
3. **Lazy Sync**: Large data (on-demand)
4. **Differential Sync**: Only changed data

#### Conflict Resolution

1. **Last Write Wins**: Simple data (preferences)
2. **Merge Strategy**: Additive data (practice logs)
3. **User Choice**: Conflicting changes
4. **Custom Resolution**: Complex data structures

## Testing Strategy Per Module

### Unit Testing Requirements

#### Module Interface Tests

- All public methods tested
- Edge cases covered
- Error conditions verified
- Performance benchmarks met

#### Mock Strategies

- Dependency injection for testing
- Mock event bus for isolation
- Fake storage for speed
- Stubbed network calls

### Integration Testing Scenarios

#### Cross-Module Flows

1. **User Registration Flow**: User → Storage → Sync
2. **Practice Session Flow**: Session → Audio → Performance → Storage
3. **Progress Sync Flow**: Analytics → Sync → Storage → Cloud
4. **Offline Recovery Flow**: Queue → Sync → Conflict Resolution

### Performance Benchmarks

#### Module-Specific Metrics

- **User Management**: Login < 2s
- **Audio Engine**: Latency < 50ms
- **Sheet Music**: Render < 200ms
- **Storage**: Save < 100ms
- **Sync**: Queue processing < 5s

## Monitoring & Observability Design

### Key Metrics Per Module

#### User Management

- Authentication success rate
- Token refresh frequency
- Profile update latency
- Active user count

#### Practice Session

- Session completion rate
- Average session duration
- Crash frequency
- Recovery success rate

#### Performance Tracking

- Accuracy trends
- Note timing precision
- Feedback generation time
- Data point frequency

### Health Check System

#### Module Health Indicators

- **Green**: Fully operational
- **Yellow**: Degraded performance
- **Red**: Critical failure
- **Gray**: Not initialized

#### Health Check Endpoints

- `/health/modules` - Individual module status
- `/health/dependencies` - Dependency health
- `/health/storage` - Storage availability
- `/health/sync` - Sync queue status

### Debug Mode Capabilities

#### Debug Features

1. **Event Stream Viewer**: Real-time event monitoring
2. **State Inspector**: Current state visualization
3. **Performance Profiler**: Module timing analysis
4. **Storage Explorer**: Local data inspection

## Plugin Architecture (Future)

### Plugin System Design

#### Plugin Interface

- Standard lifecycle hooks
- Typed configuration schema
- Sandboxed execution
- Resource limits enforced

#### Extension Points

1. **Custom Exercises**: Music generation algorithms
2. **Instrument Plugins**: New instrument support
3. **Analytics Plugins**: Custom progress tracking
4. **UI Themes**: Visual customization

#### Plugin Security

- Capability-based permissions
- Sandboxed execution environment
- Resource usage monitoring
- User consent for data access

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
