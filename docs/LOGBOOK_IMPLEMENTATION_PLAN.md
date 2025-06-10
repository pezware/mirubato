# Logbook Implementation Plan

## Overview

This document outlines the implementation plan for the Logbook feature in Rubato, including manual entry, automatic logging from practice sessions, and reporting functionality.

## Core Design Principles

1. **Universal Access**: All features available to all users (authenticated and anonymous)
2. **Local-First**: Full functionality with localStorage for anonymous users
3. **Progressive Enhancement**: Seamless upgrade to cloud sync when users authenticate
4. **Manual-First Implementation**: Build manual entries before auto-logging to avoid disrupting practice page

## Entry Types

### Manual Entries

- Created directly by users through the logbook interface
- No `sessionId` field
- All fields manually populated
- Entry types: practice, performance, lesson, rehearsal
- **No dependency on Rubato's sheet music library**
- Users can log any practice activity:
  - Pieces from their own physical scores
  - Technical exercises (scales, arpeggios, etudes)
  - Sight-reading sessions
  - Rhythm exercises
  - Warm-up routines
  - Improvisation
  - Ear training

### Automatic Entries (Future)

- Created automatically when practice sessions end in Rubato
- Contains `sessionId` linking to practice session
- Auto-populated with session data (duration, pieces, accuracy)
- Entry type: practice (auto-generated)
- Only for sessions using Rubato's sheet music

## Data Structure

```typescript
interface LogbookEntry {
  id: string
  userId: string
  timestamp: number
  duration: number // in seconds
  type: 'practice' | 'performance' | 'lesson' | 'rehearsal'
  pieces: PieceReference[]
  techniques: string[]
  goals: string[] // Goal IDs
  notes: string
  mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited'
  tags: string[]
  sessionId?: string // Present only for auto-generated entries
  metadata?: {
    source: 'manual' | 'automatic'
    // Additional session data for auto entries
    accuracy?: number
    notesPlayed?: number
    mistakeCount?: number
  }
}

interface PieceReference {
  id?: string // Optional - only for Rubato library pieces
  title: string // Required - user can enter any piece name
  composer?: string
  section?: string // Specific section practiced
  source?: 'library' | 'custom' // Distinguish Rubato vs user's own
}

interface Goal {
  id: string
  userId: string
  title: string
  description: string
  targetDate: number
  progress: number // 0-100
  milestones: GoalMilestone[]
  status: 'active' | 'completed' | 'archived'
  linkedEntries: string[] // LogbookEntry IDs
  createdAt: number
  updatedAt: number
}
```

## Implementation Phases

### Phase 1: Manual Entry UI (Current Focus)

1. Create LogbookPage component with empty state
2. Build ManualEntryForm for creating entries
3. Create LogbookEntryList component
4. Add Logbook route and navigation
5. Initialize PracticeLoggerModule globally

### Phase 2: Backend Support

1. GraphQL schema for LogbookEntry and Goal types
2. Database migrations for logbook tables
3. CRUD operations for entries and goals
4. Query filtering and pagination

### Phase 3: Auto-Entry Integration

1. Add source tracking in metadata
2. Connect practice session events
3. UI indicators for entry sources
4. Sync service updates

### Phase 4: Reporting & Analytics

1. Practice report generation
2. Progress visualization
3. Goal tracking
4. Export functionality

## Storage Strategy

### Anonymous Users

- Full logbook functionality using localStorage
- Data persists locally across sessions
- Export/import capabilities for backup

### Authenticated Users

- Automatic migration from localStorage to cloud
- D1 database storage in production
- Real-time sync across devices
- Offline-first with background sync

## UI/UX Mockups

### Logbook Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🎼 Rubato  Practice  [Logbook]  Library  Profile           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📚 Practice Logbook                                        │
│                                                             │
│  ┌──────────────────────────┐  ┌─────────────────────────┐ │
│  │ + New Entry               │  │ 🔍 Search...           │ │
│  └──────────────────────────┘  └─────────────────────────┘ │
│                                                             │
│  Filter: [All Types ▼] [All Moods ▼] [This Week ▼]        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Today, Dec 9                                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │ 🎹 Practice Session • 45 min • 😊 Satisfied        │   │
│  │ Pieces: Moonlight Sonata (Mvt 1), Clair de Lune    │   │
│  │ Notes: "Worked on dynamics in the opening..."       │   │
│  │ Tags: #beethoven #dynamics #pedaling                │   │
│  │                                    [Edit] [Delete]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │ 🎵 Lesson with Sarah • 60 min • 😃 Excited         │   │
│  │ Pieces: Chopin Etude Op.10 No.3                    │   │
│  │ Notes: "New fingering for measures 24-32..."        │   │
│  │ Goals: Master Chopin Etude ✓                        │   │
│  │                                    [Edit] [Delete]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Yesterday, Dec 8                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │ 🎸 Performance • 30 min • 😐 Neutral                │   │
│  │ Pieces: Asturias (Leyenda)                          │   │
│  │ Notes: "Small venue performance, some nerves..."     │   │
│  │ Tags: #performance #classical-guitar                 │   │
│  │                                    [Edit] [Delete]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Manual Entry Form

```
┌─────────────────────────────────────────────────────────────┐
│ ✏️ New Logbook Entry                                    [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Entry Type:  ○ Practice  ○ Performance                    │
│               ○ Lesson    ○ Rehearsal                      │
│                                                             │
│  Date & Time: [Dec 9, 2024] [2:30 PM]                     │
│                                                             │
│  Duration:    [45] minutes                                 │
│                                                             │
│  What did you work on?                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ◉ Repertoire Pieces                                │   │
│  │ ○ Technical Exercises                              │   │
│  │ ○ Sight-reading                                   │   │
│  │ ○ Warm-up/Fundamentals                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Pieces/Exercises:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ + Add piece or exercise...                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  • Moonlight Sonata - Beethoven (Movement 1) [Remove]      │
│  • C Major Scale - 4 octaves [Remove]                     │
│  • Hanon Exercise No. 1 [Remove]                          │
│                                                             │
│  Techniques Worked On:                                     │
│  [Scales] [Arpeggios] [Dynamics] [Pedaling] [+Add]        │
│                                                             │
│  How did it go?                                            │
│  😤 Frustrated  😐 Neutral  😊 Satisfied  😃 Excited       │
│                                                             │
│  Notes:                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Started with 15min warmup - long tones and scales.   │   │
│  │ Then worked on Moonlight Sonata dynamics. The pp     │   │
│  │ marking needs more control...                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Tags: [beethoven] [scales] [warmup] [+Add tag]           │
│                                                             │
│  Link to Goals:                                            │
│  ☑ Master Beethoven Sonatas                               │
│  ☐ Improve Dynamic Control                                │
│                                                             │
│  [Cancel]                                    [Save Entry]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Reports Page

```
┌─────────────────────────────────────────────────────────────┐
│ 🎼 Rubato  Practice  Logbook  [Reports]  Library          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Practice Reports                                        │
│                                                             │
│  Time Period: [Last 7 Days ▼]  Export: [PDF] [CSV]        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📈 Practice Overview                                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Total Time: 5h 45min      Sessions: 12            │   │
│  │  Daily Avg: 49min          Streak: 7 days 🔥       │   │
│  │                                                     │   │
│  │  Practice Time (Last 7 Days)                       │   │
│  │  ┌──┬──┬──┬──┬──┬──┬──┐                          │   │
│  │  │▓▓│▓▓│▓ │▓▓│▓ │▓▓│▓▓│ 60min                   │   │
│  │  │▓▓│▓▓│▓ │▓▓│  │▓▓│▓▓│                         │   │
│  │  │▓▓│▓▓│  │▓▓│  │▓▓│▓▓│ 30min                   │   │
│  │  │▓▓│▓▓│  │▓▓│  │▓▓│  │                         │   │
│  │  └──┴──┴──┴──┴──┴──┴──┘                          │   │
│  │   M  T  W  T  F  S  S                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎵 Top Pieces                                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 1. Moonlight Sonata            2h 15min (39%)     │   │
│  │ 2. Clair de Lune               1h 30min (26%)     │   │
│  │ 3. Chopin Etude Op.10 No.3     1h 00min (17%)     │   │
│  │ 4. Asturias                    0h 45min (13%)     │   │
│  │ 5. Other pieces                0h 15min (5%)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 😊 Mood Trends                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Excited    ████████░░░░ 33%                       │   │
│  │ Satisfied  ████████████ 50%                       │   │
│  │ Neutral    ████░░░░░░░░ 17%                       │   │
│  │ Frustrated ░░░░░░░░░░░░ 0%                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎯 Goal Progress                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Master Beethoven Sonatas      ████████░░ 80%      │   │
│  │ Improve Dynamic Control       ██████░░░░ 60%      │   │
│  │ Learn Chopin Etudes          ████░░░░░░ 40%      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Technical Considerations

### Module Initialization

- PracticeLoggerModule should be initialized at app startup, not in Practice page
- This allows manual entries without affecting practice functionality

### Data Independence

- **No dependency on Rubato's sheet music library**
- Users can enter any piece title, exercise, or practice activity
- PieceReference includes optional `source` field to distinguish library vs custom pieces
- Flexible entry system supports all practice types:
  - Repertoire from personal scores
  - Technical exercises (scales, arpeggios, etudes)
  - Sight-reading sessions
  - Rhythm and timing exercises
  - Warm-up routines
  - Improvisation practice
  - Ear training

### Data Migration

- When users authenticate, migrate localStorage entries to cloud
- Handle potential conflicts with timestamp-based resolution

### Performance

- Paginate entry lists (20-50 entries per page)
- Lazy load report visualizations
- Cache calculated statistics

### Testing Strategy

- Unit tests for PracticeLoggerModule (already at 92.95% coverage)
- Component tests for UI elements
- Integration tests for data flow
- E2E tests for critical user journeys

## Future Enhancements

1. **Rich Media**: Attach audio/video recordings to entries
2. **Social Features**: Share practice logs with teachers
3. **AI Insights**: Pattern recognition and personalized recommendations
4. **Calendar View**: Visual practice calendar
5. **Practice Templates**: Pre-filled entries for routine practices
6. **Reminders**: Practice reminders based on goals

## Success Metrics

- User engagement: % of users creating manual entries
- Data quality: Average completeness of entry fields
- Feature adoption: % of practice sessions with auto-logging
- User satisfaction: Feedback on logbook usefulness

## Implementation Progress

### ✅ Completed Tasks

1. **LogbookPage Component** (Task 1)

   - Created responsive page layout with header
   - Implemented empty state with call-to-action
   - Added search bar and filter button placeholders
   - Included statistics cards (total time, sessions, streak)
   - Created modal container for entry form
   - Full test coverage (10 tests)

2. **ManualEntryForm Component** (Task 2)

   - Built comprehensive form for all entry types
   - Implemented practice type categories (repertoire, technical, sight-reading, warmup)
   - Created flexible piece/exercise input system
   - Added technique selection with 12 common options
   - Implemented mood tracking with emoji visualization
   - Added notes field and tagging system
   - Included metadata for source tracking
   - Full test coverage (13 tests)

3. **LogbookEntryList Component** (Task 3)

   - Created comprehensive entry list with date grouping
   - Shows entry type icons, duration, mood, and all details
   - Implemented edit/delete action handlers
   - Added search and filter capabilities
   - Displays auto-logged indicator for automatic entries
   - Full test coverage (18 tests)

4. **Routing & Navigation** (Task 4)

   - Added Logbook route to App.tsx
   - Updated PracticeHeader with navigation links
   - Added Logbook link to landing page
   - Integrated PracticeHeader into Logbook page
   - Updated tests to handle Router context

5. **LocalStorage Persistence** (Partial Task 5)

   - Added localStorage persistence for logbook entries
   - Entries auto-save on every change
   - Entries load from localStorage on page mount
   - Added real-time stats calculation:
     - Total practice time across all entries
     - Number of sessions in the last 7 days
     - Current practice streak (consecutive days)
   - Updated tests to mock localStorage

6. **Module Integration** (Completed)
   - ✅ Created ModulesContext for centralized module management
   - ✅ Initialize PracticeLoggerModule at app startup
   - ✅ Migrated from direct localStorage to PracticeLoggerModule
   - ✅ Implemented proper user context integration
   - ✅ Updated tests to work with module-based approach

### 🚧 Next Steps

**Phase 2: Backend Support**

- GraphQL schema for LogbookEntry and Goal types
- Database migrations for logbook tables
- CRUD operations for entries and goals
- Query filtering and pagination
