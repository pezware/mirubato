# Mirubato Architecture Design

## Overview

Mirubato is a comprehensive music education platform built on Cloudflare's edge infrastructure, designed to help musicians improve their sight-reading skills and track their practice journey. The platform combines sophisticated practice tracking, sheet music management, and advanced analytics with real-time synchronization across devices.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Core Features](#core-features)
3. [Advanced Analytics System](#advanced-analytics-system)
4. [Services Architecture](#services-architecture)
5. [Database Architecture](#database-architecture)
6. [Real-time Synchronization](#real-time-synchronization)
7. [Frontend Architecture](#frontend-architecture)
8. [UI/UX Design System](#ui-ux-design-system)
9. [Authentication & Security](#authentication-security)
10. [Performance & Optimization](#performance-optimization)
11. [Version History](#version-history)

## Current Architecture

### Version 1.7.6 - Production (December 2024)

Mirubato is a sophisticated microservices-based platform running entirely on Cloudflare's edge infrastructure:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
│                    (300+ Global Locations)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────┬────────────┬────────────┬────────────┐
    │                 │             │            │            │            │
┌───▼──────────┐  ┌──▼──────────┐  ┌▼──────────┐ ┌▼──────────┐ ┌▼──────────┐
│  Frontend     │  │   API       │  │  Scores   │ │Dictionary │ │Sync Worker│
│  Worker       │  │   Worker    │  │  Worker   │ │  Worker   │ │  Worker   │
│ (React SPA)   │  │ (REST API)  │  │(PDF + AI) │ │(AI Terms) │ │(WebSocket)│
└───┬──────────┘  └──┬──────────┘  └─┬─────────┘ └─┬─────────┘ └─┬─────────┘
    │                 │               │             │             │
┌───▼──────────┐  ┌──▼──────────┐  ┌─▼─────────┐ ┌─▼─────────┐ ┌─▼─────────┐
│ Static Assets │  │ D1 Database │  │D1 + R2    │ │D1 + AI    │ │  Durable  │
│     (CDN)     │  │  KV Cache   │  │KV + Queue │ │Embeddings │ │  Objects  │
└───────────────┘  └──────────────┘  └───────────┘ └───────────┘ └───────────┘
```

### Technology Stack

| Layer                 | Technology                               | Purpose                            |
| --------------------- | ---------------------------------------- | ---------------------------------- |
| **Frontend**          | React 18, TypeScript, Vite, Tailwind CSS | Single-page application            |
| **State Management**  | Zustand, React Query                     | Client state and server cache      |
| **UI Components**     | Custom component library, Headless UI    | Consistent design system           |
| **Backend Framework** | Hono                                     | Lightweight edge-optimized routing |
| **Database**          | Cloudflare D1 (SQLite)                   | Edge SQL database                  |
| **Object Storage**    | Cloudflare R2                            | PDF and image storage              |
| **Cache**             | Cloudflare KV                            | Session and API response caching   |
| **Queue**             | Cloudflare Queues                        | Async processing                   |
| **WebSocket**         | Durable Objects                          | Real-time synchronization          |
| **AI**                | Cloudflare Workers AI                    | Content analysis and generation    |
| **Analytics**         | Custom implementation                    | Advanced practice analytics        |

### Infrastructure

All services run as Cloudflare Workers with the following domains:

| Service    | Production              | Staging                         | Local Development                  |
| ---------- | ----------------------- | ------------------------------- | ---------------------------------- |
| Frontend   | mirubato.com            | staging.mirubato.com            | www-mirubato.localhost:4000        |
| API        | api.mirubato.com        | api-staging.mirubato.com        | api-mirubato.localhost:9797        |
| Scores     | scores.mirubato.com     | scores-staging.mirubato.com     | scores-mirubato.localhost:9788     |
| Dictionary | dictionary.mirubato.com | dictionary-staging.mirubato.com | dictionary-mirubato.localhost:9799 |
| Sync       | sync.mirubato.com       | sync-staging.mirubato.com       | sync-mirubato.localhost:9800       |

## Core Features

### 1. Practice Logbook

- **Manual Entry**: Detailed practice session logging with pieces, techniques, moods
- **Timer Mode**: Real-time practice tracking with automatic pause detection
- **Auto-logging**: Automatic session creation from other features (metronome, scorebook)
- **Page-level Tracking**: Records which score pages are viewed during practice
- **Session Persistence**: Survives browser restarts and network interruptions
- **Batch Operations**: Multi-select for bulk editing and deletion
- **Export**: CSV and JSON export with customizable date ranges

### 2. Advanced Analytics & Reporting

The platform includes a sophisticated analytics engine that rivals dedicated business intelligence tools:

#### Report Views

- **Overview Dashboard**: Practice streaks, consistency scores, trend visualizations
- **Analytics View**: Advanced filtering, grouping, and custom metrics
- **Data Table View**: Grouped data with multi-level aggregation
- **Pieces View**: Composer and piece-specific analytics

#### Visualization Components

- **HeatmapCalendar**: GitHub-style practice visualization with daily/weekly/monthly views
- **PracticeTrendChart**: Time series with moving averages and trend analysis
- **DistributionPie**: Categorical breakdowns (instruments, practice types, moods)
- **ComparativeChart**: Period-over-period comparisons (week/month/year)
- **ProgressBar**: Goal tracking and completion visualization

#### Analytics Features

- **Filter Builder**: Complex multi-criteria filtering with AND/OR logic
- **Grouping Panel**: Multi-level data grouping with aggregation
- **Sorting Panel**: Multi-field sorting with custom priorities
- **Calculated Metrics**: Consistency scores, practice frequency, session quality
- **Filter Presets**: Save and reuse complex report configurations
- **Export**: Charts as images, data as CSV/JSON

### 3. Repertoire Management

- **Status Tracking**: Planned → Learning → Working → Polished → Performance Ready
- **Practice History**: Complete session history per piece
- **Goal Integration**: Link goals to specific pieces with progress tracking
- **Composer Canonicalization**: Standardized composer names with autocomplete
- **Timeline View**: Visual progression of repertoire over time
- **Duplicate Management**: Intelligent handling of duplicate pieces
- **Wikipedia Integration**: Automatic composer information enrichment

### 4. Sheet Music Library (Scorebook)

- **Multi-format Support**: PDF, PNG, JPG, multi-page scores
- **Import Methods**:
  - Direct upload (drag & drop)
  - IMSLP integration
  - URL import
  - Batch import
- **AI Metadata Extraction**: Automatic title, composer, difficulty detection
- **Collections**: Public, private, and featured collections
- **Practice Integration**: Direct practice from score view
- **Annotation System**: User drawings and notes on scores
- **Privacy Controls**: Public, private, unlisted visibility

### 5. Practice Tools

#### Metronome

- **Pattern Support**: Standard, swing, triplet, custom patterns
- **Visual Feedback**: Beat visualization and accent marks
- **Auto-logging**: Optional automatic practice session creation
- **Tempo Ranges**: 40-280 BPM with tap tempo

#### Circle of Fifths

- **Interactive Visualization**: All 12 major and minor keys
- **Piano Integration**: Synchronized keyboard display
- **Audio Playback**: Chord and scale playback
- **Theory Information**: Key signatures, scales, chord progressions
- **Educational Content**: Characteristics and common uses

#### Practice Counter

- **Visual Tracking**: Repetition counting with progress indicators
- **Session Integration**: Automatic logbook entry creation
- **Customizable Goals**: Set target repetitions

### 6. Music Dictionary

- **AI-Powered Definitions**: GPT-generated explanations
- **Multi-language Support**: Definitions in 6 languages
- **Quality Scoring**: Automated quality assessment
- **Semantic Search**: Find related terms using embeddings
- **Curated Content**: Manual review queue for quality control
- **Category Organization**: Terms grouped by musical categories

## Advanced Analytics System

### Architecture

```typescript
// Analytics Data Flow
User Input → Filter Builder → Data Processing → Visualization
                ↓                    ↓              ↓
           Filter Presets    Grouping/Sorting   Chart Export
```

### Filter System

```typescript
interface FilterCriteria {
  field: string
  operator: 'equals' | 'contains' | 'between' | 'in' | 'not_in'
  value: any
  logic?: 'AND' | 'OR'
}

interface FilterGroup {
  criteria: FilterCriteria[]
  groups?: FilterGroup[]
  logic: 'AND' | 'OR'
}
```

### Calculated Metrics

```typescript
// Consistency Score Calculation
const consistencyScore = (entries: LogbookEntry[]) => {
  const days = getDaysInPeriod(entries)
  const practiceDays = getUniquePracticeDays(entries)
  const streaks = calculateStreaks(entries)

  return {
    score: (practiceDays / days) * 100,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    frequency: practiceDays / days,
  }
}
```

### Visualization Pipeline

1. **Data Collection**: Fetch from IndexedDB/API
2. **Filtering**: Apply user-defined criteria
3. **Aggregation**: Group and calculate metrics
4. **Transformation**: Prepare for visualization library
5. **Rendering**: Chart.js with responsive design
6. **Export**: Canvas to image, data to CSV/JSON

## Services Architecture

### 1. Frontend Service (frontendv2)

**Technology**: React 18, TypeScript, Vite, Tailwind CSS, Zustand

**Key Features**:

- Single-page application with client-side routing
- Offline-first with IndexedDB storage
- Progressive Web App capabilities
- Responsive design (mobile-first)
- Lazy loading and code splitting
- Internationalization (6 languages)

**State Management**:

```typescript
// Zustand Stores
authStore: Authentication and user session
logbookStore: Practice entries and local sync
scoreStore: Sheet music and collections
practiceStore: Active practice sessions
repertoireStore: Repertoire and goals
reportingStore: Analytics preferences
```

### 2. API Service (api)

**Technology**: Hono, TypeScript, D1, KV

**Endpoints**:

```typescript
// Authentication
POST   /api/auth/login
POST   /api/auth/magic-link
POST   /api/auth/google
GET    /api/auth/verify
POST   /api/auth/refresh
POST   /api/auth/logout

// Logbook
GET    /api/logbook/entries
POST   /api/logbook/entries
PUT    /api/logbook/entries/:id
DELETE /api/logbook/entries/:id
POST   /api/logbook/sync
GET    /api/logbook/export

// Repertoire
GET    /api/repertoire
POST   /api/repertoire
PUT    /api/repertoire/:id
DELETE /api/repertoire/:id
GET    /api/repertoire/:id/history

// Goals
GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id
POST   /api/goals/:id/progress

// Sync
POST   /api/sync/push
GET    /api/sync/pull
POST   /api/sync/resolve
```

**Database**: 11+ migrations managing users, sessions, logbook, repertoire, goals

### 3. Scores Service (scores)

**Technology**: Hono, TypeScript, D1, R2, Queues, AI

**Features**:

- Multi-page PDF processing
- AI-powered metadata extraction
- Queue-based async processing
- Image optimization
- IMSLP integration
- Collection management

**Processing Pipeline**:

```typescript
Upload → Queue → Process → Extract → Store → Index
           ↓        ↓         ↓        ↓       ↓
      Validation  Convert  AI Meta    R2    Search
```

### 4. Dictionary Service (dictionary)

**Technology**: Hono, TypeScript, D1, AI, Embeddings

**Features**:

- GPT-4 powered definitions
- Semantic search with embeddings
- Multi-source content seeding
- Quality scoring system
- Dead letter queue for errors
- Analytics and usage tracking

**Content Pipeline**:

```typescript
Term Request → Cache Check → AI Generation → Quality Score → Store
                    ↓             ↓              ↓           ↓
                 KV Cache    GPT-4/Claude    Validation   D1 + Index
```

### 5. Sync Worker Service (sync-worker)

**Technology**: Cloudflare Durable Objects, WebSockets, D1

**Features**:

- Real-time bidirectional sync
- Conflict resolution
- Offline queue management
- Device presence tracking
- Automatic reconnection

**Architecture**:

```typescript
Client WebSocket → Durable Object → Broadcast to Clients
         ↓              ↓                    ↓
    Auth Check     State Sync         Other Devices
```

## Database Architecture

### API Database Schema (mirubato-prod)

```sql
-- Core Tables
users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  primary_instrument TEXT,
  role TEXT DEFAULT 'user', -- user, teacher, admin
  auth_provider TEXT,
  google_id TEXT,
  created_at INTEGER,
  updated_at INTEGER
)

logbook_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT CHECK(type IN ('practice','performance','lesson','rehearsal','technique')),
  instrument TEXT,
  pieces TEXT, -- JSON array
  techniques TEXT, -- JSON array
  mood TEXT CHECK(mood IN ('frustrated','neutral','satisfied','excited')),
  notes TEXT,
  goal_ids TEXT, -- JSON array
  tags TEXT, -- JSON array
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

user_repertoire (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT,
  score_title TEXT NOT NULL,
  score_composer TEXT,
  status TEXT DEFAULT 'planned',
  status_history TEXT, -- JSON array of status changes
  added_at INTEGER,
  updated_at INTEGER,
  notes TEXT,
  goal_ids TEXT, -- JSON array
  practice_count INTEGER DEFAULT 0,
  last_practiced_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_type TEXT, -- 'duration', 'sessions', 'pieces'
  target_value INTEGER,
  deadline INTEGER,
  piece_ids TEXT, -- JSON array
  created_at INTEGER,
  updated_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

goal_progress (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  date INTEGER NOT NULL,
  value INTEGER NOT NULL,
  notes TEXT,
  created_at INTEGER,
  FOREIGN KEY (goal_id) REFERENCES goals(id)
)

-- Sync System Tables
sync_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON blob
  version INTEGER DEFAULT 1,
  updated_at INTEGER,
  deleted INTEGER DEFAULT 0,
  UNIQUE(user_id, entity_type, entity_id)
)

sync_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT,
  created_at INTEGER,
  processed INTEGER DEFAULT 0
)

idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER
)

-- Session Management
sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER,
  created_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### Scores Database Schema (scores-prod)

```sql
-- Score Management
scores (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT,
  normalized_composer TEXT, -- Canonicalized version
  difficulty INTEGER,
  genre TEXT,
  year_composed INTEGER,
  duration_seconds INTEGER,
  page_count INTEGER DEFAULT 1,
  file_url TEXT,
  thumbnail_url TEXT,
  source TEXT, -- 'upload', 'imslp', 'import'
  source_url TEXT,
  metadata TEXT, -- JSON with additional info
  user_id TEXT,
  visibility TEXT DEFAULT 'private', -- public, private, unlisted
  created_at INTEGER,
  updated_at INTEGER
)

score_pages (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  created_at INTEGER,
  FOREIGN KEY (score_id) REFERENCES scores(id),
  UNIQUE(score_id, page_number)
)

user_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private',
  featured INTEGER DEFAULT 0,
  score_ids TEXT, -- JSON array
  created_at INTEGER,
  updated_at INTEGER,
  UNIQUE(user_id, name)
)

score_annotations (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,
  annotation_data TEXT, -- JSON with drawing data
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (score_id) REFERENCES scores(id),
  UNIQUE(score_id, user_id, page_number)
)

-- Composer Canonicalization
composers (
  id TEXT PRIMARY KEY,
  canonical_name TEXT UNIQUE NOT NULL,
  aliases TEXT, -- JSON array of alternative names
  birth_year INTEGER,
  death_year INTEGER,
  nationality TEXT,
  wikipedia_url TEXT,
  created_at INTEGER,
  updated_at INTEGER
)
```

### Dictionary Database Schema (dictionary-prod)

```sql
-- Term Definitions
terms (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  language TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT,
  examples TEXT, -- JSON array
  related_terms TEXT, -- JSON array
  pronunciation TEXT,
  etymology TEXT,
  quality_score REAL, -- AI-generated quality metric
  review_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  source TEXT, -- 'ai', 'manual', 'import'
  created_at INTEGER,
  updated_at INTEGER,
  UNIQUE(term, language)
)

term_embeddings (
  term_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL, -- Vector embedding for semantic search
  model_version TEXT,
  created_at INTEGER,
  FOREIGN KEY (term_id) REFERENCES terms(id)
)

-- Usage Analytics
term_searches (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  language TEXT,
  user_id TEXT,
  found INTEGER DEFAULT 1,
  created_at INTEGER
)

-- Content Management
import_queue (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  processed_at INTEGER,
  created_at INTEGER
)

dead_letter_queue (
  id TEXT PRIMARY KEY,
  original_id TEXT,
  operation TEXT,
  data TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER
)
```

## Real-time Synchronization

### WebSocket Architecture

Mirubato uses Cloudflare Durable Objects for real-time synchronization, replacing the previous polling-based approach:

```typescript
// Client Connection Flow
1. User authenticates → Receives JWT
2. WebSocket connects to sync.mirubato.com
3. Durable Object validates JWT
4. Client joins user's sync room
5. Bidirectional sync established
```

### Sync Protocol

```typescript
interface SyncMessage {
  type: 'SYNC_EVENT' | 'BULK_SYNC' | 'PING' | 'PONG'
  data: {
    event?: {
      type: 'ENTRY_CREATED' | 'ENTRY_UPDATED' | 'ENTRY_DELETED'
      entity: 'logbook' | 'repertoire' | 'goals'
      payload: any
    }
    entries?: LogbookEntry[]
    timestamp: number
  }
}
```

### Conflict Resolution

```typescript
// Last-Write-Wins with Timestamp
const resolveConflict = (local: Entry, remote: Entry): Entry => {
  // Compare timestamps
  if (remote.updated_at > local.updated_at) {
    return remote
  }

  // Local wins on tie (optimistic UI)
  return local
}
```

### Offline Queue

```typescript
class OfflineQueue {
  private queue: SyncEvent[] = []

  add(event: SyncEvent) {
    this.queue.push(event)
    this.persist()
  }

  async flush() {
    while (this.queue.length > 0) {
      const event = this.queue.shift()
      await this.send(event)
    }
  }

  private persist() {
    localStorage.setItem('sync_queue', JSON.stringify(this.queue))
  }
}
```

## Frontend Architecture

### Component Organization

```
src/components/
├── ui/                 # Design system components
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Card.tsx
│   └── Typography.tsx
├── layout/            # Layout components
│   ├── AppLayout.tsx
│   ├── UnifiedHeader.tsx
│   └── BottomTabs.tsx
├── logbook/           # Logbook feature
│   ├── LogbookEntryList.tsx
│   ├── ManualEntryForm.tsx
│   └── TechniqueSelector.tsx
├── practice-reports/  # Analytics feature
│   ├── views/
│   ├── visualizations/
│   └── advanced/
├── repertoire/        # Repertoire feature
│   ├── RepertoireCard.tsx
│   ├── RepertoireTimeline.tsx
│   └── EditPieceModal.tsx
├── score/             # Scorebook feature
│   ├── ScoreViewer.tsx
│   ├── PdfViewer.tsx
│   └── ImportScoreModal.tsx
└── auth/              # Authentication
    ├── SignInModal.tsx
    └── GoogleSignInButton.tsx
```

### State Management

```typescript
// Zustand Store Pattern
interface LogbookStore {
  entries: Map<string, LogbookEntry>
  isLoading: boolean
  error: string | null

  // Actions
  addEntry: (entry: LogbookEntry) => void
  updateEntry: (id: string, updates: Partial<LogbookEntry>) => void
  deleteEntry: (id: string) => void
  syncEntries: () => Promise<void>

  // Computed
  getEntriesByDate: (date: string) => LogbookEntry[]
  getTotalPracticeTime: () => number
}
```

### Data Flow

```
User Action → Component → Store Action → API Call → Store Update → UI Update
                              ↓                           ↓
                        Local Storage              WebSocket Sync
```

## UI/UX Design System

### Typography System (v1.7.6)

Mirubato uses a carefully researched three-font typography system optimized for multilingual support:

```scss
// Font Families
$font-serif: 'Noto Serif'    // Music content (titles, composers)
$font-sans: 'Inter'           // UI elements and body text
$font-display: 'Lexend'       // Headers and section titles

// Usage via Components
<MusicTitle>Moonlight Sonata</MusicTitle>       // Noto Serif
<MusicComposer>Beethoven</MusicComposer>         // Noto Serif
<Typography variant="h1">Practice Log</Typography> // Lexend
<Typography variant="body">Settings</Typography>   // Inter
```

### Color System (Morandi Palette)

```scss
// Primary Colors
$stone: #8B8680        // Primary UI elements
$sage: #87A96B         // Success, positive actions
$sand: #C2B280         // Warnings, featured content
$slate: #708090        // Neutral, disabled states

// Semantic Colors
$success: $sage
$warning: $sand
$error: #CD5C5C        // Soft red for errors
$info: $slate

// Background Colors
$bg-primary: #FAFAF8   // Main background
$bg-secondary: #F5F5F0 // Card backgrounds
$bg-tertiary: #EFEFEA  // Subtle differences
```

### Component Library

All components follow consistent patterns:

```typescript
// Component Structure
interface ComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}

// Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management
- Screen reader announcements
```

### Responsive Design

```scss
// Breakpoints
$mobile: 640px
$tablet: 768px
$desktop: 1024px
$wide: 1280px

// Mobile-First Approach
.component {
  // Mobile styles (default)
  padding: 1rem;

  @media (min-width: $tablet) {
    padding: 1.5rem;
  }

  @media (min-width: $desktop) {
    padding: 2rem;
  }
}
```

## Authentication & Security

### Authentication Flow

```typescript
// 1. Magic Link Flow
POST /api/auth/magic-link { email }
  → Send email with token
  → User clicks link
GET /api/auth/verify?token={token}
  → Validate token
  → Create session
  → Return JWT

// 2. Google OAuth Flow
POST /api/auth/google { credential }
  → Verify with Google
  → Create/update user
  → Create session
  → Return JWT
```

### JWT Token Structure

```typescript
interface JWTPayload {
  sub: string // User ID
  email: string
  role: 'user' | 'teacher' | 'admin'
  iat: number // Issued at
  exp: number // Expiration
}
```

### Security Measures

1. **Token Security**:
   - Short-lived access tokens (1 hour)
   - Refresh tokens for seamless re-auth
   - Secure HttpOnly cookies
   - CSRF protection

2. **Data Protection**:
   - User data isolation via foreign keys
   - Row-level security in database
   - Input validation with Zod
   - SQL injection prevention

3. **Rate Limiting**:
   - API rate limiting per user
   - Progressive backoff for failures
   - DDoS protection via Cloudflare

4. **Privacy Controls**:
   - User-controlled data visibility
   - GDPR compliance
   - Data export functionality
   - Account deletion support

## Performance & Optimization

### Frontend Optimization

```typescript
// Code Splitting
const ScoreViewer = lazy(() => import('./components/score/ScoreViewer'))
const Reports = lazy(() => import('./components/practice-reports'))

// Bundle Optimization
- Vendor chunks for caching
- Tree shaking for unused code
- Minification and compression
- Asset optimization (WebP, lazy loading)
```

### Edge Caching Strategy

```typescript
// Cache Headers
interface CacheStrategy {
  'static-assets': 'public, max-age=31536000, immutable' // 1 year
  'api-public': 'public, max-age=60, s-maxage=300' // 1 min client, 5 min edge
  'api-private': 'private, no-cache' // No caching
  images: 'public, max-age=86400, s-maxage=2592000' // 1 day client, 30 days edge
}
```

### Database Performance

```sql
-- Indexes for Common Queries
CREATE INDEX idx_logbook_user_timestamp ON logbook_entries(user_id, timestamp DESC);
CREATE INDEX idx_repertoire_user_status ON user_repertoire(user_id, status);
CREATE INDEX idx_goals_user_deadline ON goals(user_id, deadline);
CREATE INDEX idx_scores_composer ON scores(normalized_composer);
```

### Performance Metrics

| Metric                 | Target  | Actual |
| ---------------------- | ------- | ------ |
| First Contentful Paint | < 1.5s  | 1.2s   |
| Time to Interactive    | < 3.0s  | 2.8s   |
| API Response Time      | < 100ms | 85ms   |
| WebSocket Latency      | < 50ms  | 35ms   |
| Bundle Size (gzipped)  | < 200KB | 185KB  |

## Version History

### v1.7.6 (December 2024) - Current Production

- **Real-time WebSocket Sync**: Replaced polling with Durable Objects
- **Advanced Analytics**: Complete reporting and visualization system
- **Typography Unification**: Three-font system with semantic components
- **Enhanced Practice Tracking**: Page-level tracking, pause detection
- **Performance Optimizations**: 40% reduction in font loading

### v1.7.5 (November 2024)

- **Repertoire System**: Status tracking with history
- **Goals Integration**: Link goals to pieces
- **Composer Canonicalization**: Standardized names
- **Mobile UI Improvements**: Better responsive design

### v1.7.0 (October 2024)

- **UI Redesign**: New layout with sidebar/bottom tabs
- **Practice Timer**: Integrated timer with auto-logging
- **Circle of Fifths**: Interactive music theory tool
- **Dictionary Service**: AI-powered term definitions

### v1.6.0 (September 2024)

- **Scorebook Launch**: PDF/image management
- **Collections**: Public and private collections
- **IMSLP Integration**: Direct import from IMSLP
- **AI Metadata**: Automatic extraction

### v1.5.0 (August 2024)

- **Authentication**: Magic links and Google OAuth
- **Offline Support**: IndexedDB and sync queue
- **Internationalization**: 6 language support
- **PWA Features**: Installable app

### v1.0.0 (July 2024)

- **Initial Release**: Basic logbook functionality
- **Manual Entry**: Simple practice logging
- **CSV Export**: Data export capability

## Future Roadmap

### Phase 2: Practice Mode (Q1 2025)

- Real-time sheet music display with VexFlow
- Audio recording and playback with Tone.js
- Performance analysis and feedback
- MIDI device integration

### Phase 3: Social Features (Q2 2025)

- Teacher-student connections
- Practice groups and challenges
- Performance sharing
- Community repertoire recommendations

### Phase 4: AI Coach (Q3 2025)

- Personalized practice recommendations
- Technique analysis via audio/video
- Adaptive difficulty adjustment
- Progress predictions

## Conclusion

Mirubato has evolved from a simple practice logging app into a comprehensive music education platform. The architecture leverages Cloudflare's edge infrastructure to provide global performance, real-time synchronization, and sophisticated analytics while maintaining simplicity and usability for musicians of all levels.

The platform's success lies in its pragmatic approach: using proven technologies, focusing on user needs, and iterating based on feedback. The microservices architecture allows independent scaling and development while the edge-first approach ensures excellent performance worldwide.

For developers, the codebase maintains high standards with comprehensive testing, type safety, and clear documentation. The component library and design system ensure consistency while the analytics engine provides insights that help musicians improve their practice.

---

_This document reflects the current state of Mirubato v1.7.6 as of December 2024. For implementation details, see the codebase and API documentation._
