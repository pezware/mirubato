# Mirubato System Design

## Overview

This document outlines the database schema, API architecture, and system design for mirubato. The design follows a semi-backend architecture using Cloudflare Workers for data management and a React frontend for presentation.

## Architecture Principles

1. **API-First Design**: All data operations go through RESTful APIs
2. **Modular Services**: Separate concerns into distinct service modules
3. **Extensibility**: Design for future features without breaking changes
4. **Offline-First**: Support local caching and sync when online
5. **Performance**: Optimize for fast response times and minimal latency

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

## API Architecture

### Service Modules

#### 1. Authentication Service (`/api/auth`)
```typescript
// Endpoints
POST   /api/auth/login          // Magic link login
POST   /api/auth/verify         // Verify magic link token
POST   /api/auth/refresh        // Refresh JWT token
POST   /api/auth/logout         // Logout user
GET    /api/auth/me            // Get current user
```

#### 2. User Service (`/api/users`)
```typescript
// Endpoints
GET    /api/users/me           // Get current user profile
PUT    /api/users/me           // Update user profile
GET    /api/users/me/progress  // Get progress summary
PUT    /api/users/me/preferences // Update preferences
DELETE /api/users/me           // Delete account
```

#### 3. Sheet Music Service (`/api/sheet-music`)
```typescript
// Endpoints
GET    /api/sheet-music        // List with filters
GET    /api/sheet-music/:id    // Get specific piece
GET    /api/sheet-music/random // Get random piece with criteria
GET    /api/sheet-music/recommended // Get AI recommendations
POST   /api/sheet-music        // Create (admin/future)
PUT    /api/sheet-music/:id    // Update (admin/future)
```

#### 4. Practice Service (`/api/practice`)
```typescript
// Endpoints
// Sessions
POST   /api/practice/sessions/start    // Start new session
PUT    /api/practice/sessions/:id/end  // End session
GET    /api/practice/sessions         // List sessions
GET    /api/practice/sessions/:id     // Get session details

// Logs
POST   /api/practice/logs             // Create practice log
PUT    /api/practice/logs/:id         // Update practice log
GET    /api/practice/logs             // List logs with filters
GET    /api/practice/logs/:id         // Get specific log
DELETE /api/practice/logs/:id         // Delete log

// Quick logging
POST   /api/practice/quick-log        // Quick log entry
GET    /api/practice/templates        // Get user templates
POST   /api/practice/templates        // Save as template
```

#### 5. Progress Service (`/api/progress`)
```typescript
// Endpoints
GET    /api/progress/overview         // Overall progress
GET    /api/progress/instrument/:instrument // By instrument
GET    /api/progress/streaks          // Practice streaks
GET    /api/progress/achievements     // User achievements
GET    /api/progress/statistics       // Detailed stats
```

#### 6. Analytics Service (`/api/analytics`)
```typescript
// Endpoints
GET    /api/analytics/practice-time   // Time analysis
GET    /api/analytics/repertoire      // Repertoire analysis
GET    /api/analytics/improvement     // Progress trends
GET    /api/analytics/export          // Export data (PDF/CSV)
```

### Data Transfer Objects (DTOs)

```typescript
// Request DTOs
interface QuickLogRequest {
  activityType: ActivityType;
  duration: number;
  piece?: {
    composer?: string;
    title?: string;
    section?: string;
  };
  tempo?: number;
  selfRating?: number;
  notes?: string;
}

interface PracticeSessionRequest {
  sessionType: 'guided' | 'free_practice' | 'assessment';
  instrument: 'piano' | 'guitar';
}

// Response DTOs
interface ProgressResponse {
  currentLevel: number;
  experiencePoints: number;
  consecutiveDays: number;
  totalPracticeTime: number;
  achievements: Achievement[];
  recentActivity: PracticeLog[];
}
```

## Frontend Architecture

### State Management

```typescript
// Store structure using Zustand
interface AppStore {
  // User state
  user: User | null;
  preferences: UserPreferences;
  
  // Practice state
  currentSession: PracticeSession | null;
  practiceTimer: Timer;
  
  // Sheet music state
  currentPiece: SheetMusic | null;
  upcomingPieces: SheetMusic[];
  
  // Progress state
  userProgress: Progress;
  recentLogs: PracticeLog[];
  
  // Actions
  actions: {
    auth: AuthActions;
    practice: PracticeActions;
    progress: ProgressActions;
  };
}
```

### Service Layer

```typescript
// API Client
class MirubatoAPI {
  private client: HTTPClient;
  
  auth: AuthService;
  users: UserService;
  sheetMusic: SheetMusicService;
  practice: PracticeService;
  progress: ProgressService;
  analytics: AnalyticsService;
}

// Offline sync manager
class OfflineManager {
  private queue: OfflineRequest[];
  
  async sync(): Promise<void>;
  async queueRequest(request: OfflineRequest): Promise<void>;
}
```

## Data Flow

### 1. Practice Session Flow
```
Frontend                    API                         D1
   |                         |                          |
   |--Start Session--------->|                          |
   |                         |--Create Session--------->|
   |<--Session ID------------|                          |
   |                         |                          |
   |--Log Activity---------->|                          |
   |                         |--Store Log-------------->|
   |                         |--Update Progress-------->|
   |<--Confirmation----------|                          |
   |                         |                          |
   |--End Session----------->|                          |
   |                         |--Update Session--------->|
   |                         |--Calculate Stats------->|
   |<--Session Summary-------|                          |
```

### 2. Offline Sync Flow
```
Frontend (Offline)          LocalStorage              API (When Online)
   |                           |                          |
   |--Practice Log------------>|                          |
   |                           |--Queue Entry----->       |
   |<--Queued Confirmation-----|                          |
   |                           |                          |
   |                           |                          |
   [User Goes Online]          |                          |
   |                           |                          |
   |--Sync Request------------>|                          |
   |                           |--Get Queue------->       |
   |                           |<--Queued Items----       |
   |                           |                          |
   |                           |--Send Items------------->|
   |                           |                   Process & Store
   |<--Sync Complete-----------|<--Confirmation----------|
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

### 1. API Conventions
- RESTful endpoints with consistent naming
- Use HTTP status codes correctly
- Include pagination for list endpoints
- Version APIs when breaking changes needed

### 2. Database Conventions
- Use UUIDs for all primary keys
- Include created_at/updated_at timestamps
- Soft delete with is_active flags
- Foreign key constraints for data integrity

### 3. Testing Strategy
- Unit tests for all services
- Integration tests for API endpoints
- Load testing for performance
- End-to-end tests for critical flows