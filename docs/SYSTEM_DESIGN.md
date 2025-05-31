# Mirubato System Design

## Overview

This document outlines the database schema, API architecture, and system design for mirubato. The design follows a GraphQL-first architecture using Apollo Server on Cloudflare Workers for the backend and React with Apollo Client for the frontend.

## Architecture Principles

1. **GraphQL-First Design**: All data operations go through a unified GraphQL API
2. **Type Safety**: Strong typing from GraphQL schema to TypeScript interfaces
3. **Modular Services**: Separate concerns into distinct service modules and resolvers
4. **Offline-First**: Apollo Client cache with offline queue support
5. **Performance**: Optimize queries, use DataLoader pattern, edge caching
6. **Real-time Ready**: Design supports future GraphQL subscriptions

## Database Schema (Cloudflare D1)

### Core Tables

#### 1. users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  primary_instrument TEXT CHECK (primary_instrument IN ('piano', 'guitar')),
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  preferences JSON, -- User preferences like theme, notation size, etc.
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_login ON users(last_login_at);
```

#### 2. sheet_music

```sql
CREATE TABLE sheet_music (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT,
  opus TEXT,
  catalog_number TEXT, -- e.g., "BWV 846", "K. 331"
  instrument TEXT NOT NULL CHECK (instrument IN ('piano', 'guitar', 'both')),
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
  grade_level TEXT, -- e.g., "ABRSM Grade 3", "RCM Level 5"
  duration_seconds INTEGER,
  time_signature TEXT,
  key_signature TEXT,
  tempo_marking TEXT, -- e.g., "Allegro", "Andante"
  suggested_tempo INTEGER, -- BPM
  style_period TEXT, -- Baroque, Classical, Romantic, Modern, Contemporary
  tags JSON, -- ["sight-reading", "scales", "arpeggios", "etude"]
  source_type TEXT CHECK (source_type IN ('generated', 'public_domain', 'licensed', 'user_created')),
  source_attribution TEXT,
  license_type TEXT,
  notation_data JSON, -- VexFlow data or MusicXML reference
  audio_reference_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sheet_music_instrument ON sheet_music(instrument);
CREATE INDEX idx_sheet_music_difficulty ON sheet_music(difficulty_level);
CREATE INDEX idx_sheet_music_style ON sheet_music(style_period);
CREATE INDEX idx_sheet_music_grade ON sheet_music(grade_level);
```

#### 3. practice_sessions

```sql
CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_seconds INTEGER,
  session_type TEXT CHECK (session_type IN ('guided', 'free_practice', 'assessment')),
  total_exercises INTEGER DEFAULT 0,
  completed_exercises INTEGER DEFAULT 0,
  accuracy_percentage REAL,
  notes TEXT, -- Session notes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_date ON practice_sessions(user_id, session_date);
CREATE INDEX idx_sessions_date ON practice_sessions(session_date);
```

#### 4. practice_logs

```sql
CREATE TABLE practice_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  sheet_music_id TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'sight_reading', 'scales', 'arpeggios', 'etudes', 'repertoire',
    'memorization', 'slow_practice', 'mental_practice', 'ensemble_reading',
    'transposition', 'score_reduction', 'technique', 'warm_up'
  )),
  instrument TEXT NOT NULL CHECK (instrument IN ('piano', 'guitar')),
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_seconds INTEGER,

  -- Piece details
  composer TEXT,
  work_title TEXT,
  opus_number TEXT,
  movement_section TEXT, -- e.g., "1st movement, measures 1-32"

  -- Practice details
  tempo_practiced INTEGER, -- BPM
  target_tempo INTEGER, -- Performance tempo goal
  focus_areas JSON, -- ["accuracy", "rhythm", "dynamics", "articulation", "memorization"]

  -- Assessment
  self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 10),
  accuracy_percentage REAL,
  notes_played INTEGER,
  notes_correct INTEGER,

  -- Additional data
  practice_notes TEXT,
  audio_recording_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id) ON DELETE SET NULL
);

CREATE INDEX idx_logs_user_date ON practice_logs(user_id, start_time);
CREATE INDEX idx_logs_activity ON practice_logs(activity_type);
CREATE INDEX idx_logs_session ON practice_logs(session_id);
CREATE INDEX idx_logs_sheet_music ON practice_logs(sheet_music_id);
```

#### 5. progress_tracking

```sql
CREATE TABLE progress_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL,
  skill_area TEXT NOT NULL, -- 'sight_reading', 'technique', 'theory', etc.
  current_level INTEGER DEFAULT 1,
  current_grade TEXT,
  experience_points INTEGER DEFAULT 0,

  -- Metrics
  total_practice_time INTEGER DEFAULT 0, -- seconds
  consecutive_days INTEGER DEFAULT 0,
  last_practice_date DATE,
  accuracy_trend REAL, -- Moving average
  speed_trend REAL, -- Moving average of tempo achievements

  -- Achievements
  achievements JSON, -- ["first_piece", "7_day_streak", "100_pieces"]
  milestones JSON, -- [{"date": "2024-01-15", "achievement": "Grade 3 completed"}]

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, instrument, skill_area)
);

CREATE INDEX idx_progress_user ON progress_tracking(user_id);
CREATE INDEX idx_progress_instrument ON progress_tracking(user_id, instrument);
```

#### 6. user_sheet_music_progress

```sql
CREATE TABLE user_sheet_music_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sheet_music_id TEXT NOT NULL,
  first_attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  times_practiced INTEGER DEFAULT 1,
  best_accuracy REAL,
  average_accuracy REAL,
  best_tempo INTEGER,
  is_completed BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  notes TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id) ON DELETE CASCADE,
  UNIQUE(user_id, sheet_music_id)
);

CREATE INDEX idx_user_music_progress ON user_sheet_music_progress(user_id, sheet_music_id);
CREATE INDEX idx_user_music_starred ON user_sheet_music_progress(user_id, is_starred);
```

#### 7. practice_templates

```sql
CREATE TABLE practice_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,

  -- Pre-filled fields
  composer TEXT,
  work_title TEXT,
  opus_number TEXT,
  movement_section TEXT,
  tempo INTEGER,
  focus_areas JSON,

  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Analytics Views

```sql
-- Daily practice summary
CREATE VIEW daily_practice_summary AS
SELECT
  user_id,
  DATE(start_time) as practice_date,
  COUNT(DISTINCT session_id) as sessions,
  SUM(duration_seconds) as total_seconds,
  COUNT(*) as activities,
  AVG(self_rating) as avg_rating,
  AVG(accuracy_percentage) as avg_accuracy
FROM practice_logs
GROUP BY user_id, DATE(start_time);

-- User statistics
CREATE VIEW user_statistics AS
SELECT
  u.id as user_id,
  u.primary_instrument,
  COUNT(DISTINCT DATE(pl.start_time)) as total_practice_days,
  SUM(pl.duration_seconds) as total_practice_seconds,
  COUNT(DISTINCT pl.sheet_music_id) as unique_pieces,
  AVG(pl.self_rating) as avg_self_rating,
  AVG(pl.accuracy_percentage) as avg_accuracy
FROM users u
LEFT JOIN practice_logs pl ON u.id = pl.user_id
GROUP BY u.id;
```

## API Architecture (GraphQL)

### GraphQL Schema Overview

```graphql
type Query {
  # User queries
  me: User
  user(id: ID!): User

  # Sheet music queries
  listSheetMusic(
    filter: SheetMusicFilterInput
    limit: Int
    offset: Int
  ): SheetMusicConnection!
  sheetMusic(id: ID!): SheetMusic
  randomSheetMusic(instrument: Instrument!, difficulty: Difficulty): SheetMusic

  # Practice queries
  myPracticeSessions(
    instrument: Instrument
    limit: Int
    offset: Int
  ): PracticeSessionConnection!
  practiceSession(id: ID!): PracticeSession

  # Progress queries
  myProgress(instrument: Instrument): ProgressOverview!
  myAchievements: [Achievement!]!
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
  completePracticeSession(
    input: CompletePracticeSessionInput!
  ): PracticeSession!

  # Practice logging
  createPracticeLog(input: CreatePracticeLogInput!): PracticeLog!
  updatePracticeLog(id: ID!, input: UpdatePracticeLogInput!): PracticeLog!
  deletePracticeLog(id: ID!): DeletePayload!
}

type Subscription {
  # Future: Real-time practice updates
  practiceSessionUpdated(sessionId: ID!): PracticeSession!
  achievementUnlocked: Achievement!
}
```

### Resolver Architecture

```typescript
// Resolver structure
const resolvers = {
  Query: {
    // User queries
    me: (parent, args, context) => context.services.user.getCurrentUser(),
    user: (parent, { id }, context) => context.services.user.getUserById(id),

    // Sheet music queries
    listSheetMusic: (parent, args, context) =>
      context.services.sheetMusic.list(args.filter, args.limit, args.offset),

    // Practice queries
    myPracticeSessions: (parent, args, context) =>
      context.services.practice.getUserSessions(context.user.id, args),
  },

  Mutation: {
    // Authentication mutations
    requestMagicLink: (parent, { email }, context) =>
      context.services.auth.requestMagicLink(email),

    verifyMagicLink: (parent, { token }, context) =>
      context.services.auth.verifyMagicLink(token),

    // Practice mutations
    startPracticeSession: (parent, { input }, context) =>
      context.services.practice.startSession(context.user.id, input),
  },

  // Type resolvers
  User: {
    preferences: (user, args, context) =>
      context.services.user.getPreferences(user.id),

    stats: (user, args, context) => context.services.user.getStats(user.id),
  },

  PracticeSession: {
    user: (session, args, context) =>
      context.dataloaders.user.load(session.userId),

    sheetMusic: (session, args, context) =>
      session.sheetMusicId
        ? context.dataloaders.sheetMusic.load(session.sheetMusicId)
        : null,
  },
}
```

### Service Layer Architecture

```typescript
// Service interfaces
interface AuthService {
  requestMagicLink(email: string): Promise<AuthPayload>
  verifyMagicLink(token: string): Promise<TokenPayload>
  refreshToken(refreshToken: string): Promise<TokenPayload>
  logout(userId: string): Promise<AuthPayload>
}

interface UserService {
  getCurrentUser(): Promise<User | null>
  getUserById(id: string): Promise<User | null>
  updateUser(id: string, input: UpdateUserInput): Promise<User>
  getPreferences(userId: string): Promise<UserPreferences>
  getStats(userId: string): Promise<UserStats>
}

interface PracticeService {
  startSession(
    userId: string,
    input: StartPracticeSessionInput
  ): Promise<PracticeSession>
  pauseSession(sessionId: string): Promise<PracticeSession>
  completeSession(
    sessionId: string,
    input: CompletePracticeSessionInput
  ): Promise<PracticeSession>
  createLog(userId: string, input: CreatePracticeLogInput): Promise<PracticeLog>
}
```

### GraphQL Type Definitions

```graphql
# Core types
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

type PracticeSession {
  id: ID!
  user: User!
  instrument: Instrument!
  sheetMusic: SheetMusic
  sessionType: SessionType!
  startedAt: DateTime!
  completedAt: DateTime
  pausedDuration: Int!
  accuracy: Float
  notesAttempted: Int!
  notesCorrect: Int!
  logs: [PracticeLog!]!
}

type SheetMusic {
  id: ID!
  title: String!
  composer: String!
  instrument: Instrument!
  difficulty: Difficulty!
  measures: [Measure!]!
  metadata: SheetMusicMetadata
}

# Input types
input CreatePracticeLogInput {
  sessionId: ID!
  activityType: ActivityType!
  durationSeconds: Int!
  tempoPracticed: Int
  targetTempo: Int
  focusAreas: [String!]
  selfRating: Int
  notes: String
}

# Enums
enum Instrument {
  PIANO
  GUITAR
}

enum SessionType {
  FREE_PRACTICE
  GUIDED_PRACTICE
  ASSESSMENT
}
```

## Frontend Architecture

### Apollo Client State Management

```typescript
// Apollo Client configuration
const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      User: {
        keyFields: ['id'],
      },
      PracticeSession: {
        keyFields: ['id'],
        fields: {
          logs: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming]
            },
          },
        },
      },
    },
  }),
  link: ApolloLink.from([authLink, errorLink, retryLink, httpLink]),
})

// Local state management
const localState = {
  // Reactive variables for UI state
  currentSessionVar: makeVar<PracticeSession | null>(null),
  practiceTimerVar: makeVar<Timer>({ elapsed: 0, isRunning: false }),
  offlineQueueVar: makeVar<QueuedMutation[]>([]),

  // Type policies for cache
  typePolicies: {
    Query: {
      fields: {
        currentSession: {
          read() {
            return currentSessionVar()
          },
        },
        practiceTimer: {
          read() {
            return practiceTimerVar()
          },
        },
      },
    },
  },
}
```

### Frontend Service Layer

```typescript
// GraphQL hooks generated by codegen
import { useQuery, useMutation } from '@apollo/client'
import {
  useMeQuery,
  useStartPracticeSessionMutation,
  useCreatePracticeLogMutation,
} from './__generated__/graphql'

// Custom hooks for business logic
function usePracticeSession() {
  const [startSession] = useStartPracticeSessionMutation({
    update(cache, { data }) {
      // Update cache with new session
      currentSessionVar(data?.startPracticeSession || null)
    },
  })

  const [createLog] = useCreatePracticeLogMutation({
    optimisticResponse: vars => ({
      createPracticeLog: {
        __typename: 'PracticeLog',
        id: 'temp-' + Date.now(),
        ...vars.input,
      },
    }),
  })

  return { startSession, createLog }
}

// Offline sync with Apollo
const offlineLink = new QueueLink({
  storage: window.localStorage,
  key: 'offline-queue',
})

const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: error => {
      return !!error && !error.networkError?.statusCode
    },
  },
})
```

## Data Flow

### 1. GraphQL Practice Session Flow

```
Frontend              Apollo Client         GraphQL API           D1
   |                      |                      |                 |
   |--Start Session------>|                      |                 |
   |                      |--mutation----------->|                 |
   |                      | startPracticeSession |                 |
   |                      |                      |--Create-------->|
   |                      |<--Session Data-------|<--Session ID----|
   |<--Update Cache-------|                      |                 |
   |                      |                      |                 |
   |--Log Activity------->|                      |                 |
   |                      |--mutation----------->|                 |
   |                      | createPracticeLog   |                 |
   |                      |--Optimistic Update   |                 |
   |<--Immediate UI-------|                      |                 |
   |                      |                      |--Store--------->|
   |                      |<--Confirmation-------|                 |
   |                      |                      |                 |
   |--Complete Session--->|                      |                 |
   |                      |--mutation----------->|                 |
   |                      | completePracticeSession              |
   |                      |                      |--Update------->|
   |                      |                      |--Calculate---->|
   |                      |<--Final Data---------|<--Stats--------|
   |<--Session Summary----|                      |                 |
```

### 2. Apollo Offline Sync Flow

```
Frontend            Apollo Cache      IndexedDB       GraphQL API (Online)
   |                    |                 |                  |
   |--Mutation--------->|                 |                  |
   |                    |--Optimistic---->|                  |
   |<--UI Update--------|                 |                  |
   |                    |--Queue--------->|                  |
   |                    |                 |--Store Entry     |
   |                    |                 |                  |
   [Network Restored]   |                 |                  |
   |                    |                 |                  |
   |                    |--Check Queue    |                  |
   |                    |<--Pending Ops---|                  |
   |                    |                 |                  |
   |                    |--Replay Mutations---------------->|
   |                    |                 |           Process & Store
   |                    |<--Real Response-------------------|
   |<--Final Update-----|                 |                  |
   |                    |--Clear--------->|                  |
```

## Scalability Considerations

### 1. Database Optimization

- Partition practice_logs by date for large datasets
- Create materialized views for complex analytics
- Use JSON columns for flexible schema evolution
- Implement data archival for old practice logs

### 2. Caching Strategy

- Cache sheet music data at edge (Cloudflare CDN)
- Cache user progress in Workers KV
- Use browser local storage for offline data
- Implement ETags for efficient updates

### 3. Performance Targets

- API response time: < 100ms (p95)
- Sheet music load time: < 200ms
- Practice log save: < 50ms
- Analytics generation: < 500ms

## Security Considerations

### 1. Authentication

- JWT tokens with short expiration (15 minutes)
- Refresh tokens stored securely
- Magic links expire after single use or 10 minutes

### 2. Authorization

- Row-level security for user data
- API rate limiting per user
- Validate all inputs against schema

### 3. Data Privacy

- Encrypt sensitive data at rest
- GDPR compliance for EU users
- Data export and deletion capabilities

## Migration Strategy

### Phase 1: Core Tables

1. Create users and authentication
2. Create sheet_music and initial data
3. Basic practice_sessions

### Phase 2: Practice Logging

1. Create practice_logs
2. Create progress_tracking
3. Implement basic analytics

### Phase 3: Advanced Features

1. Create user_sheet_music_progress
2. Create practice_templates
3. Implement recommendation engine

## Monitoring and Observability

### Metrics to Track

- API response times
- Database query performance
- User engagement (DAU, session length)
- Practice streak retention
- Error rates by endpoint

### Logging Strategy

- Structured JSON logs
- Request/response correlation IDs
- User action audit trail
- Performance timing logs

## Future Extensibility

### Planned Extensions

1. **Social Features**: Add tables for friends, challenges, leaderboards
2. **Teacher Mode**: Add teacher-student relationships, assignments
3. **AI Recommendations**: Store ML model outputs and user feedback
4. **Multi-instrument**: Extend schema for more instruments
5. **Group Practice**: Add ensemble/duet support

### Schema Evolution

- Use JSON columns for flexible attributes
- Version API endpoints for breaking changes
- Maintain backward compatibility
- Document all schema changes

## Development Guidelines

### 1. GraphQL Conventions

- Use nullable types appropriately
- Implement proper error handling with extensions
- Use DataLoader pattern to avoid N+1 queries
- Include field descriptions in schema
- Follow relay-style pagination for connections

### 2. Database Conventions

- Use nanoid for all primary keys
- Include created_at/updated_at timestamps with triggers
- Implement soft delete where appropriate
- Foreign key constraints for data integrity
- Use JSON columns for flexible data

### 3. Testing Strategy

- Unit tests for all resolvers and services
- Integration tests for GraphQL queries/mutations
- Mock D1 database for testing
- Test error cases and edge conditions
- Performance testing with query complexity analysis

### 4. Code Generation

- Generate TypeScript types from GraphQL schema
- Use generated hooks in frontend
- Keep schema as single source of truth
- Run codegen in CI/CD pipeline
