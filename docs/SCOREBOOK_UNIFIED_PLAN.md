# Scorebook and Logbook Integration Plan

## Overview

This document outlines the plan to integrate the scorebook and logbook systems in Mirubato, creating a seamless practice tracking experience. The integration will allow users to link their practice sessions to specific scores, navigate between scores and practice logs, and automatically track practice time when viewing scores.

### Key Features

1. **Click-to-Score Navigation**: Navigate from logbook entries directly to the associated score
2. **Unified Search**: Search across both logbook entries and scores
3. **Practice Tracking**: Start/stop practice timer when viewing scores
4. **Automatic Logging**: Create logbook entries automatically when stopping practice
5. **Non-authenticated Support**: Full functionality for users using local storage only
6. **Flexible Score Storage**: Support for scores without PDF/images (user's own materials)

## Integration Architecture

### Data Model Updates

```typescript
// Updated LogbookEntry interface
interface LogbookEntry {
  id: string
  date: string
  instrument: string
  durationMinutes: number
  pieces: string[] // Existing field for piece names
  notes?: string
  goal?: string
  // NEW FIELDS
  scoreId?: string // Link to score in scorebook
  scoreTitle?: string // Cached score title for display
  scoreComposer?: string // Cached composer for display
  autoTracked?: boolean // Flag for automatically tracked sessions
}

// Practice session state for score viewer
interface PracticeSession {
  scoreId: string
  scoreTitle: string
  scoreComposer: string
  startTime: Date
  endTime?: Date
  pageViews: number[]
  instrument: string
}

// Local storage collection for non-authenticated users
interface LocalCollection {
  id: string // Use 'local-' prefix
  name: string
  scoreIds: string[]
  visibility: 'private' // Always private for local
  createdAt: Date
  updatedAt: Date
}
```

### Non-Authenticated User Support

1. **Local Collections**: Create a special "My Practice" collection in local storage
   - ID: `local-my-practice`
   - Automatically created when user adds first score
   - Stored in localStorage with logbook data

2. **Score Metadata Cache**: Store basic score info locally
   - Cache score title, composer when viewed
   - Use for display in logbook without API calls

3. **Practice Tracking**: Full functionality using localStorage
   - Same practice timer functionality
   - Logbook entries stored locally
   - Sync when user eventually signs in

## Implementation Plan

### Phase 1: Data Model and Core Integration

1. **Update LogbookEntry Interface**
   - Add scoreId, scoreTitle, scoreComposer fields
   - Update logbookStore to handle new fields
   - Migrate existing localStorage data

2. **Create Practice Tracking Store**

   ```typescript
   // New store: practiceStore.ts
   interface PracticeStore {
     currentSession: PracticeSession | null
     startPractice: (score: Score) => void
     stopPractice: () => LogbookEntry
     pausePractice: () => void
     resumePractice: () => void
     updatePageView: (pageNumber: number) => void
   }
   ```

3. **Update Score Service for Local Storage**
   - Add local score metadata caching
   - Support offline score information

### Phase 2: UI Components

1. **Enhanced LogbookEntryList**
   - Add score information display
   - Show score title and composer with entry
   - Add "View Score" button/link
   - Handle missing scores gracefully

2. **Score-Aware ManualEntryForm**
   - Add ScoreSelector component
   - Search scores by title/composer
   - Option to create entry without score
   - Pre-fill when coming from score page

3. **Practice Controls in ScoreViewer**
   - Add Start/Stop practice button
   - Show practice timer
   - Track page views
   - Auto-save on page changes

4. **Unified Search Component**
   - Search both logs and scores
   - Filter by: date, score, instrument, duration
   - Group results by type (logs vs scores)

### Phase 3: Navigation and Flow

1. **Logbook → Score Navigation**
   - Click score title to open score viewer
   - Handle missing scores with upload prompt
   - Maintain navigation history

2. **Score → Logbook Integration**
   - Show practice history for current score
   - Quick add practice session button
   - View all sessions for this score

3. **Exit Confirmation**
   - Detect active practice session
   - Prompt to save or discard
   - Auto-save option

### Phase 4: Advanced Features

1. **Smart Collections**
   - Auto-create "Recently Practiced" collection
   - "Most Practiced" collection
   - Time-based collections (This Week, This Month)

2. **Practice Analytics**
   - Time per score tracking
   - Progress visualization
   - Practice streaks per score

3. **Flexible Score Support**
   - "External Score" type for user's own materials
   - Notes-only entries for scores without files
   - Link to external URLs (IMSLP, etc.)

## Implementation Details

### 1. Click-to-Score Navigation

```typescript
// In LogbookEntryList.tsx
const handleScoreClick = (entry: LogbookEntry) => {
  if (entry.scoreId) {
    navigate(`/scorebook/${entry.scoreId}`)
  } else if (entry.scoreTitle) {
    // Search for score by title
    navigate(`/scorebook/search?q=${encodeURIComponent(entry.scoreTitle)}`)
  }
}
```

### 2. Unified Search

```typescript
// New hook: useUnifiedSearch.ts
const useUnifiedSearch = (query: string) => {
  const { entries } = useLogbookStore()
  const { scores } = useScoreStore()

  return {
    logResults: searchLogEntries(entries, query),
    scoreResults: searchScores(scores, query),
    combined: combineResults(logResults, scoreResults),
  }
}
```

### 3. Practice Timer Integration

```typescript
// In ScoreViewer.tsx
const PracticeControls = ({ score }) => {
  const { currentSession, startPractice, stopPractice } = usePracticeStore()
  const { addEntry } = useLogbookStore()

  const handleStop = () => {
    const entry = stopPractice()
    addEntry({
      ...entry,
      scoreId: score.id,
      scoreTitle: score.title,
      scoreComposer: score.composer,
      autoTracked: true
    })
  }

  return (
    <div className="practice-controls">
      {!currentSession ? (
        <Button onClick={() => startPractice(score)}>
          Start Practice
        </Button>
      ) : (
        <Button onClick={handleStop} variant="danger">
          Stop Practice ({formatDuration(currentSession.startTime)})
        </Button>
      )}
    </div>
  )
}
```

### 4. Local Storage Integration

```typescript
// Enhanced logbookStore.ts
const useLogbookStore = create(
  persist(
    (set, get) => ({
      entries: [],
      scoreMetadata: {}, // Local cache of score info

      addEntry: entry => {
        // Cache score metadata if present
        if (entry.scoreId && entry.scoreTitle) {
          set(state => ({
            scoreMetadata: {
              ...state.scoreMetadata,
              [entry.scoreId]: {
                title: entry.scoreTitle,
                composer: entry.scoreComposer,
              },
            },
          }))
        }
        // Add entry as before
      },
    }),
    {
      name: 'logbook-storage',
      version: 2, // Bump version for migration
      migrate: (persistedState, version) => {
        if (version < 2) {
          // Add scoreMetadata field
          return {
            ...persistedState,
            scoreMetadata: {},
          }
        }
        return persistedState
      },
    }
  )
)
```

### 5. Missing Score Handling

```typescript
// In ScoreViewer.tsx
const MissingScorePrompt = ({ scoreId, onUpload }) => {
  return (
    <Card className="text-center p-8">
      <h3>Score Not Found</h3>
      <p>This score is not available in our library.</p>
      <p>This might be your own sheet music or material.</p>
      <div className="mt-4 space-x-4">
        <Button onClick={onUpload}>
          Upload Score
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    </Card>
  )
}
```

## Testing Strategy

1. **Unit Tests**
   - Test data model migrations
   - Test practice tracking logic
   - Test search functionality

2. **Integration Tests**
   - Test navigation flows
   - Test local storage persistence
   - Test sync after authentication

3. **E2E Tests**
   - Complete practice workflow
   - Search and navigation
   - Exit handling

## Migration Plan

1. **Data Migration**
   - Update localStorage schema version
   - Migrate existing entries
   - Preserve all user data

2. **Feature Rollout**
   - Phase 1: Core integration (hidden behind feature flag)
   - Phase 2: Enable for beta users
   - Phase 3: Full rollout

3. **Backwards Compatibility**
   - Support old logbook entries
   - Graceful handling of missing fields
   - No breaking changes

## Previous Work (Collections Simplification - Completed)

The collections system has been simplified as outlined in previous phases:

1. **Collections as Lightweight Tags** ✅
2. **Simplified UI with badges** ✅
3. **Public/Private visibility only** ✅
4. **Import flow integration** ✅

## Implementation Status

### Completed Features ✅

1. **Data Model Updates**
   - Added scoreId, scoreTitle, scoreComposer to LogbookEntry interface
   - Created practiceStore for managing active practice sessions
   - Updated scoreStore to integrate with practice tracking

2. **Click-to-Score Navigation**
   - LogbookEntryList now shows linked scores
   - Click functionality to navigate directly to scores
   - Fallback to scorebook when score not linked

3. **Practice Tracking Integration**
   - Start/Stop practice controls in ScoreControls component
   - Automatic logbook entry creation on practice stop
   - Practice duration tracking with real-time updates
   - Exit confirmation when closing score with active practice

4. **Unified Search**
   - Created useUnifiedSearch hook for searching both logs and scores
   - UnifiedSearch component with keyboard navigation
   - Integrated into UnifiedHeader
   - Results show both scores and logbook entries

5. **Missing Score Handling**
   - MissingScorePrompt component for scores without files
   - Support for external and manual score types
   - Prepared upload functionality interface

### Implementation Timeline (Completed)

#### Week 1: Core Integration ✅

- Updated data models and created practiceStore
- Enhanced LogbookEntryList with score display
- Implemented click-to-score navigation

#### Week 2: Practice Tracking ✅

- Added practice controls to ScoreViewer
- Implemented automatic logbook entry creation
- Added exit confirmation handling

#### Week 3: Search and UI ✅

- Implemented unified search
- Created missing score handling
- Fixed TypeScript errors and tests

### Remaining Work

1. **Analytics Dashboard** (Future)
   - Practice history per score
   - Progress visualization
   - Practice streaks

2. **Smart Collections** (Future)
   - Auto-create "Recently Practiced"
   - "Most Practiced" collection
   - Time-based collections

3. **Upload Functionality** (Future)
   - Complete file upload for missing scores
   - Support for multiple file types
   - Progress indicators

## Success Metrics

1. **User Engagement**
   - Increased logbook usage by 40%
   - Average practice session tracking accuracy >90%
   - Navigation between logs and scores <2 clicks

2. **Technical Quality**
   - Zero data loss during migration
   - Page load performance maintained
   - Full offline functionality

3. **User Satisfaction**
   - Intuitive navigation between features
   - Seamless practice tracking
   - Clear visual feedback

## Risk Mitigation

1. **Data Migration Risks**
   - Comprehensive backup before migration
   - Rollback plan ready
   - Gradual rollout with monitoring

2. **Performance Concerns**
   - Lazy load score metadata
   - Efficient search indexing
   - Cache frequently accessed data

3. **User Confusion**
   - Clear onboarding for new features
   - Visual indicators for linked content
   - Preserve existing workflows
