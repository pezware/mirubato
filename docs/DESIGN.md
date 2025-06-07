# Rubato Design Document

## Overview

Rubato is a progressive web application for musicians to practice sight-reading and improve their musical skills. Built with a module-based architecture, event-driven communication, and local-first philosophy, it provides a seamless practice experience across devices.

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

## System Architecture

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

### Implemented Modules

#### Core Infrastructure

##### 1. **EventBus**

- Central event-driven communication system
- Singleton pattern with pub/sub architecture
- Priority-based event execution
- Event history tracking (last 1000 events)
- Wildcard pattern matching for subscriptions

##### 2. **Storage Services**

- Abstract storage layer with event-driven capabilities
- `StorageService`: Base interface for all storage operations
- `EventDrivenStorage`: Event-based storage implementation
- `MockStorageService`: Testing implementation
- Request/response pattern for all operations

#### Infrastructure Modules

##### 3. **StorageModule**

- Local storage management with adapter pattern
- LocalStorage adapter (IndexedDB adapter pending)
- TTL support for cached data
- Storage quota management
- Emits: `data:create:*`, `data:read:*`, `data:delete:*`, `data:sync:required`
- Consumes: `storage:request`, `storage:read`, `storage:write`, `storage:delete`

##### 4. **SyncModule**

- Data synchronization between local and cloud storage
- Sync queue management with retry logic
- Exponential backoff for failed operations
- Conflict resolution strategies
- Batch sync operations
- Emits: `sync:operation:queued`, `sync:operation:success`, `sync:operation:failed`
- Consumes: `data:sync:required`, `sync:request:initiated`

#### Domain Modules

##### 5. **PracticeSessionModule**

- Practice session lifecycle management
- Session start/pause/resume/end functionality
- Auto-save with configurable intervals
- Session statistics and performance tracking
- Multi-instrument support
- Emits: `practice:session:started`, `practice:session:paused`, `practice:session:ended`
- Consumes: `performance:note:played`, `navigation:leaving:practice`

##### 6. **SheetMusicLibraryModule**

- Sheet music library and exercise generation
- Algorithmic exercise generation (sight-reading, technical)
- User repertoire tracking with status management
- Performance history recording
- Exercise metadata and expiration management
- Emits: `sheet-music:exercise-generated`, `sheet-music:repertoire-status-changed`
- Consumes: `practice:session-completed`
- Status: Partial (search, import/export pending)

##### 7. **PerformanceTrackingModule**

- Real-time performance analysis
- Note event recording with timing precision
- Performance metrics calculation (accuracy, timing, rhythm)
- Problem area identification
- Real-time feedback generation
- Emits: `performance:tracking:started`, `performance:note:recorded`
- Consumes: `audio:note:detected`, `practice:note:played`

##### 8. **ProgressAnalyticsModule**

- Comprehensive analytics and progress tracking
- Progress report generation with visualizations
- Weak area identification algorithms
- Milestone tracking and achievements
- Practice consistency metrics
- Personalized recommendation generation
- Emits: `progress:milestone:achieved`, `progress:report:ready`
- Consumes: `performance:note:recorded`, `practice:session:ended`

##### 9. **CurriculumModule**

- Learning path creation and management
- Repertoire organization and tracking
- Technical exercise generation (14 types)
- Difficulty evaluation and progression
- Performance readiness assessment
- Maintenance scheduling for memorized pieces
- Emits: `curriculum:path:created`, `curriculum:progress:updated`
- Consumes: `practice:session:ended`, `progress:milestone:achieved`

##### 10. **PracticeLoggerModule**

- Professional practice logbook management
- Goal tracking with milestone support
- Practice report generation (daily, weekly, monthly)
- Export functionality (JSON, CSV, PDF pending)
- Auto-tagging based on performance data
- Practice streak calculation
- Emits: `logger:entry:created`, `logger:goal:completed`, `logger:export:ready`
- Consumes: `practice:session:ended`, `progress:milestone:achieved`

##### 11. **VisualizationModule**

- Data visualization using Chart.js
- Multiple chart types (line, bar, radar, heatmap, tree)
- Dashboard creation and management
- Export functionality (PNG, SVG, PDF, CSV, JSON)
- Responsive adaptations for different devices
- Accessibility features (ARIA labels, keyboard nav)
- Emits: `visualization:chart:created`, `visualization:exported`
- Consumes: `progress:report:ready`, `practice:session:ended`

### Context-Based Services

While not implemented as modules, these services provide essential functionality through React Context:

#### **AuthContext**

- User authentication via magic links
- JWT token management
- User profile and preferences
- Session persistence

#### **AudioContext**

- Audio playback with Tone.js
- Metronome functionality
- MIDI support (future)
- Mobile audio context handling

### Module Communication

#### Event Bus Architecture

```typescript
// Event naming convention: category:action
type EventCategory =
  | 'user' // User-related events
  | 'session' // Practice session events
  | 'sheet' // Sheet music events
  | 'audio' // Audio playback events
  | 'perf' // Performance tracking
  | 'progress' // Progress analytics
  | 'storage' // Storage operations
  | 'sync' // Synchronization events
  | 'error' // Error events

// Event payload structure
interface EventPayload<T = any> {
  timestamp: number
  source: string // Module name
  category: EventCategory
  action: string
  data: T
  metadata?: {
    userId?: string
    sessionId?: string
    correlationId?: string
  }
}
```

#### Module Initialization Order

```mermaid
graph TD
    EventBus --> StorageServices
    StorageServices --> StorageModule
    StorageModule --> SyncModule
    StorageModule --> PracticeSessionModule
    StorageModule --> SheetMusicLibraryModule
    PracticeSessionModule --> PerformanceTrackingModule
    PerformanceTrackingModule --> ProgressAnalyticsModule
    ProgressAnalyticsModule --> CurriculumModule
    PracticeSessionModule --> PracticeLoggerModule
    ProgressAnalyticsModule --> VisualizationModule
    CurriculumModule --> VisualizationModule
    PracticeLoggerModule --> VisualizationModule
```

#### Event Flow Patterns

1. **Practice Flow**:

   - User Action → PracticeSessionModule → PerformanceTrackingModule → ProgressAnalyticsModule → VisualizationModule

2. **Learning Flow**:

   - CurriculumModule → SheetMusicLibraryModule → PracticeSessionModule → PracticeLoggerModule

3. **Storage Flow**:

   - All modules → EventDrivenStorage → StorageModule → SyncModule → Cloud (pending)

4. **Analytics Flow**:
   - PerformanceTrackingModule → ProgressAnalyticsModule → VisualizationModule
   - PracticeLoggerModule → VisualizationModule

## Data Architecture

### Storage Strategy

#### LocalStorage (Preferences & Settings)

```typescript
interface LocalStorageData {
  userPreferences: {
    theme: 'light' | 'dark' | 'auto'
    instrument: string
    notationSize: number
    autoPageTurn: boolean
    practiceReminders: boolean
  }
  audioSettings: {
    volume: number
    metronomeBeat: number
    metronomeSound: string
  }
  displaySettings: {
    showFingerings: boolean
    showNoteNames: boolean
    colorBlindMode: boolean
  }
}
```

#### IndexedDB (Practice Data)

```typescript
interface IndexedDBStores {
  practiceSession: {
    id: string
    userId: string
    startTime: Date
    endTime?: Date
    sheetMusicId: string
    performance: PerformanceMetrics
    notes: string
  }

  sheetMusic: {
    id: string
    title: string
    composer: string
    measures: Measure[]
    difficulty: number
    metadata: SheetMusicMetadata
  }

  userRepertoire: {
    id: string
    userId: string
    sheetMusicId: string
    status: 'LEARNING' | 'MEMORIZED' | 'FORGOTTEN'
    lastPracticed: Date
    totalMinutes: number
  }

  generatedExercise: {
    id: string
    type: string
    parameters: ExerciseParameters
    measures: Measure[]
    createdAt: Date
  }
}
```

### Data Flow Patterns

#### Practice Session Flow

```
User Action → UI Component → Module → EventBus → Other Modules → Storage
     ↑                                                              ↓
     └──────────────── UI Update ←──────── Event ←─────────────────┘
```

#### Offline/Online Sync

```
Local Change → IndexedDB → Sync Queue → Background Sync → GraphQL API
                   ↓                           ↑              ↓
              Offline Mode                 Online Event    Remote DB
```

## User Experience Design

### Use Cases

#### Beginner User (Sofia)

- **Profile**: Piano student, practices 15 minutes daily
- **Goals**: Build sight-reading skills, track progress
- **Key Features**:
  - Structured daily exercises
  - Visual progress tracking
  - Gamification elements
  - Simple, guided interface

#### Professional User (Marcus)

- **Profile**: Jazz guitarist, flexible practice schedule
- **Goals**: Log practice efficiently, analyze patterns
- **Key Features**:
  - Detailed practice logging
  - Custom exercise generation
  - Export capabilities
  - Advanced analytics

### Practice Page Design

#### Layout Philosophy

- **Content-first**: Sheet music takes 70-80% of screen
- **Ghost controls**: UI elements at 5% opacity until needed
- **Mode-specific**: Different layouts for Practice vs Sight-read
- **Responsive**: Adapts to portrait/landscape and device size

#### Control Hierarchy

**Primary Controls** (Always visible at 5%):

- Play/Pause button
- Tempo adjustment
- Page navigation

**Secondary Controls** (Appear on hover/tap):

- Volume control
- Loop section
- Practice mode toggle

**Tertiary Controls** (In expandable menu):

- Settings
- Export/Share
- Help

#### Interaction Patterns

```css
/* Ghost control implementation */
.control {
  opacity: 0.05;
  transition: opacity 0.2s ease;
}

.control:hover {
  opacity: 0.15;
}

.control.active {
  opacity: 1;
}

/* Full-side tap areas for page navigation */
.page-nav-left {
  position: absolute;
  left: 0;
  width: 15%;
  height: 100%;
  cursor: pointer;
}
```

### Auto Page-Flip Feature

#### Implementation Strategy

1. **Measure Tracking**: MusicPlayer tracks current measure
2. **Page Calculation**: SheetMusicDisplay knows measures per page
3. **Timing Logic**: Flip at 75% through last measure of page
4. **User Override**: Manual flip cancels auto for that page

#### Mobile Adaptations

- **Portrait**: Continuous scroll instead of pages
- **Landscape**: Traditional page view with flip
- **Tablet**: User choice between modes

## Technical Implementation

### Frontend Architecture

#### Technology Stack

- **Framework**: React 18+ with TypeScript
- **State Management**: Module-based with EventBus
- **Styling**: Tailwind CSS with custom components
- **Music Notation**: VexFlow for rendering
- **Audio**: Tone.js for synthesis and playback
- **Build**: Vite for fast development

#### Component Structure

```
src/
├── modules/           # Core business logic
├── components/        # Reusable UI components
├── pages/            # Route-based pages
├── contexts/         # React contexts
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
└── services/         # External service integrations
```

### Backend Architecture

#### Technology Stack

- **Runtime**: Cloudflare Workers (Edge computing)
- **API**: GraphQL with type generation
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: R2 for assets
- **Auth**: Magic links with JWT

#### API Design

```graphql
type Query {
  # User's repertoire with learning status
  userRepertoire(
    status: RepertoireStatus
    limit: Int
    offset: Int
  ): [UserRepertoire!]!

  # AI-powered recommendations
  recommendations(
    type: RecommendationType
    limit: Int
  ): [SheetMusicRecommendation!]!

  # Search with advanced filters
  searchSheetMusic(
    query: String
    filters: SheetMusicFilters
  ): SheetMusicSearchResult!
}

type Mutation {
  # Update repertoire status
  updateRepertoireStatus(
    sheetMusicId: ID!
    status: RepertoireStatus!
  ): UserRepertoire!

  # Generate custom exercise
  generateExercise(
    type: ExerciseType!
    parameters: ExerciseParameters!
  ): GeneratedExercise!
}
```

## Quality Assurance

### Testing Strategy

#### Coverage Requirements

- **Unit Tests**: >80% coverage per module
- **Integration Tests**: Critical user flows
- **E2E Tests**: Key user journeys
- **Performance Tests**: <100ms response times

#### Test Categories

```typescript
// Module tests
describe('PracticeSessionModule', () => {
  it('should emit session:started when practice begins')
  it('should handle pause/resume correctly')
  it('should calculate accurate metrics')
  it('should recover from storage errors')
})

// Component tests
describe('SheetMusicDisplay', () => {
  it('should render measures correctly')
  it('should handle page navigation')
  it('should update on window resize')
  it('should be keyboard accessible')
})
```

### Performance Targets

| Metric              | Target | Critical |
| ------------------- | ------ | -------- |
| Initial Load        | <2s    | <3s      |
| Time to Interactive | <3s    | <5s      |
| API Response        | <100ms | <200ms   |
| Frame Rate          | 60fps  | 30fps    |
| Memory Usage        | <100MB | <200MB   |

### Accessibility Requirements

- **WCAG 2.1 AA** compliance minimum
- **Keyboard navigation** for all interactive elements
- **Screen reader** announcements for state changes
- **High contrast mode** support
- **Reduced motion** preferences respected

## Security & Privacy

### Data Protection

- **Local encryption** for sensitive data
- **No tracking** without explicit consent
- **Data export** available anytime
- **Account deletion** removes all data

### Authentication Flow

```
User Email → Magic Link → Verify Token → JWT Session → Refresh Token
                ↓                            ↓
           Email Service              Stored Locally
```

## Future Enhancements

### Planned Features

1. **MIDI Integration**: Connect digital instruments
2. **AI Coaching**: Real-time performance feedback
3. **Social Features**: Share progress with teachers
4. **Advanced Analytics**: ML-powered insights

### Extension Points

```typescript
interface PluginAPI {
  registerModule(module: ModuleInterface): void
  registerSheetProcessor(processor: SheetProcessor): void
  registerAudioEffect(effect: AudioEffect): void
  registerAnalyzer(analyzer: PerformanceAnalyzer): void
}
```

## Decision Log

### Key Decisions

1. **VexFlow over Canvas** (2024-01)

   - Better music notation support
   - Active community
   - Easier to maintain

2. **Module Architecture** (2024-02)

   - Clear separation of concerns
   - Easier testing
   - Better code organization

3. **Local-First Approach** (2024-02)

   - Better performance
   - Works offline
   - User owns their data

4. **Magic Links over Passwords** (2024-03)

   - Simpler UX
   - More secure
   - No password management

5. **Event-Driven Communication** (2024-03)
   - Loose coupling
   - Easy to extend
   - Better debugging

---

This design document represents the current state of Rubato's architecture and will continue to evolve as the application grows.
