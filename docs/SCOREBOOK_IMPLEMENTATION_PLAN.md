# Scorebook Implementation Plan

## Overview

The Scorebook feature will provide a clean, focused interface for displaying sheet music with practice tracking capabilities. It will be accessible to all users with enhanced features for authenticated users.

## Key Design Decisions

1. **Deployment**: Initially deploy within frontendv2 worker (consider separate worker in future)
2. **Access Model**: Read-only for non-authenticated, full features for authenticated users
3. **UI Philosophy**: Clean, minimal interface with focus on score display
4. **Integration**: No navigation links initially - manual testing before integration

## 1. General Functions and Scores API Implementation

### Core Functions

#### 1.1 Score Display (All Users)

- **API Endpoint**: `GET /api/scores/:id/render`
- **Implementation**:
  ```typescript
  // Render score with pagination
  const renderScore = async (scoreId: string, page: number) => {
    const response = await scoresApi.renderScore(scoreId, {
      format: 'svg',
      pageNumber: page,
      theme: 'light',
      zoom: 1.0,
    })
    return response.data
  }
  ```

#### 1.2 Score Browsing (All Users)

- **API Endpoint**: `GET /api/search` with filters
- **Features**:
  - Search by title, composer, instrument, difficulty
  - Browse curated collections
  - View popular and recent scores

#### 1.3 Practice Tracking (Authenticated Users)

- **Semi-automatic tracking**:
  - Start/stop recording button
  - Track time spent per measure/section
  - Auto-detect pauses and repetitions
  - Create logbook entry on completion

```typescript
interface PracticeSession {
  scoreId: string
  startTime: Date
  endTime?: Date
  measuresCompleted: number[]
  tempo: number
  repetitions: { measure: number; count: number }[]
}
```

#### 1.4 Metronome Integration

- **Implementation**:
  - Use Tone.js for audio generation
  - Adjustable tempo (40-240 BPM)
  - Visual indicator synchronized with beats
  - Click track with accent on first beat

#### 1.5 Score Management (Authenticated Users)

- **Upload**: `POST /api/import/pdf`
- **Collections**: Personal score library
- **Favorites**: Quick access to frequently used scores
- **Notes**: Annotations and practice notes per score

### API Integration Strategy

```typescript
// Frontend service layer
class ScoreService {
  // Core viewing
  async loadScore(id: string): Promise<Score>
  async renderPage(id: string, page: number): Promise<string>

  // Search and browse
  async searchScores(params: SearchParams): Promise<SearchResult>
  async getCollections(): Promise<Collection[]>

  // User features (authenticated)
  async uploadScore(file: File, metadata: ScoreMetadata): Promise<Score>
  async saveToLibrary(scoreId: string): Promise<void>
  async addAnnotation(scoreId: string, annotation: Annotation): Promise<void>

  // Practice tracking
  async startPractice(scoreId: string): Promise<PracticeSession>
  async updatePractice(sessionId: string, data: PracticeUpdate): Promise<void>
  async completePractice(sessionId: string): Promise<LogbookEntry>
}
```

## 2. UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Minimal Header                        │
│  Logo | Scorebook         User Status | Sign In/Out     │
├─────────────────────────────────────────────────────────┤
│                    Score Info Bar                        │
│  Title - Composer | Difficulty | Progress: 8/22 ▓▓▓░░   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│                   Score Display Area                     │
│                  (Clean, Focused View)                   │
│                                                          │
│                                                          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│        ┌────────────────────────────────────┐           │
│        │ [●] Record | 🎵 120 BPM [-][+] | ⋮ │           │
│        └────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Clean & Focused**: Minimal UI chrome, maximum score visibility
2. **Floating Controls**: Non-intrusive controls that don't block the score
3. **Progressive Disclosure**: Advanced features hidden in collapsible panel
4. **Responsive**: Adapts to different screen sizes and orientations
5. **Accessibility**: Keyboard navigation, screen reader support

### Key UI Components

#### Floating Control Bar

- Centered at bottom of screen
- Semi-transparent background
- Contains: Practice button, Metronome, Auto-scroll, Menu
- Auto-hides when not in use

#### Collapsible Management Panel

- Slides in from right
- Contains: Search, Upload, Library, Collections
- Overlay with backdrop

#### Practice Tracking Indicator

- Red recording dot when active
- Timer showing elapsed time
- Measure counter

## 3. Implementation Steps

### Phase 1: Core Infrastructure (Week 1)

1. **Set up routes and pages**

   ```bash
   frontendv2/src/pages/Scorebook.tsx
   frontendv2/src/components/score/
   frontendv2/src/services/scoreService.ts
   frontendv2/src/stores/scoreStore.ts
   ```

2. **Create Score API client**
   - Implement all API endpoints
   - Add error handling and retry logic
   - Set up caching with SWR/React Query

3. **Basic score display**
   - PDF viewer component (using pdf.js)
   - SVG renderer for VexFlow output
   - Page navigation controls

### Phase 2: Interactive Features (Week 2)

4. **Metronome implementation**
   - Tone.js integration
   - Visual beat indicator
   - Tempo controls
   - Sound settings

5. **Practice tracking**
   - Session management
   - Progress tracking
   - Auto-save to logbook
   - Statistics collection

6. **Authentication integration**
   - Conditional feature access
   - Persistent user library
   - Sync with backend

### Phase 3: Advanced Features (Week 3)

7. **Score management**
   - Upload interface
   - Library organization
   - Search and filter
   - Collections browsing

8. **Auto-scroll feature**
   - Speed adjustment
   - Smart detection
   - Manual override
   - Position tracking

9. **Performance optimization**
   - Lazy loading
   - Image optimization
   - Caching strategy
   - Offline support

### Phase 4: Polish & Testing (Week 4)

10. **UI/UX refinement**
    - Animations and transitions
    - Loading states
    - Error handling
    - Mobile optimization

11. **Integration testing**
    - E2E tests with Playwright
    - API integration tests
    - Performance testing
    - Cross-browser testing

12. **Documentation**
    - User guide
    - API documentation
    - Component storybook
    - Deployment guide

## 4. Technical Architecture

### Frontend Components

```
src/
├── pages/
│   └── Scorebook.tsx              # Main page component
├── components/
│   └── score/
│       ├── ScoreViewer.tsx        # Score display component
│       ├── ScoreControls.tsx      # Floating control bar
│       ├── Metronome.tsx          # Metronome component
│       ├── PracticeTracker.tsx    # Practice session tracker
│       ├── ScoreLibrary.tsx       # Library management
│       └── ScoreSearch.tsx        # Search interface
├── services/
│   └── scoreService.ts            # API client
├── stores/
│   └── scoreStore.ts              # Zustand store
└── hooks/
    ├── useScore.ts                # Score data hook
    ├── useMetronome.ts            # Metronome logic
    └── usePracticeSession.ts      # Practice tracking
```

### State Management

```typescript
interface ScoreStore {
  // Current score
  currentScore: Score | null
  currentPage: number
  totalPages: number

  // Practice session
  practiceSession: PracticeSession | null
  isRecording: boolean

  // Metronome
  metronomeSettings: MetronomeSettings
  isMetronomeActive: boolean

  // UI state
  showManagement: boolean
  autoScrollEnabled: boolean

  // Actions
  loadScore: (id: string) => Promise<void>
  setPage: (page: number) => void
  startPractice: () => void
  stopPractice: () => void
  updateMetronome: (settings: Partial<MetronomeSettings>) => void
}
```

### API Integration

```typescript
// Use SWR for data fetching
const { data: score, error } = useSWR(
  `/api/scores/${scoreId}`,
  scoreService.getScore
)

// Optimistic updates for user actions
const saveToLibrary = async (scoreId: string) => {
  // Optimistic update
  mutate(`/api/user/library`, [...library, scoreId], false)

  // API call
  await scoreService.saveToLibrary(scoreId)

  // Revalidate
  mutate(`/api/user/library`)
}
```

## 5. Performance Considerations

1. **Lazy Loading**
   - Load VexFlow only when needed
   - Chunk score rendering libraries
   - Progressive image loading

2. **Caching Strategy**
   - Cache rendered scores in IndexedDB
   - Service worker for offline access
   - CDN for static score files

3. **Optimization**
   - Virtual scrolling for long scores
   - WebWorker for rendering
   - Debounced API calls

## 6. Security & Access Control

1. **Read-Only Mode**
   - All users can view public scores
   - No upload/edit capabilities
   - Limited to browsing and viewing

2. **Authenticated Features**
   - Upload personal scores
   - Save to library
   - Practice tracking
   - Annotations and notes

3. **API Security**
   - JWT authentication for protected endpoints
   - Rate limiting
   - File upload validation
   - CORS configuration

## 7. Test Data & Initial Content

### Sample Scores

- **score_01.pdf**: Test score for initial development (163KB)
- **score_02.pdf**: Second test score for pagination testing (86KB)
- Location: `scores/test-data/`

### Upload Process

1. Use scores service API to upload test PDFs
2. Create metadata entries in D1 database
3. Store files in R2 bucket
4. Test rendering endpoints

## 8. Implementation Priorities (Based on Review)

### Immediate Priorities

1. **Core Display**: Basic PDF viewing functionality
2. **Authentication Awareness**: Conditional feature display
3. **Simple Metronome**: Basic tempo functionality
4. **Practice Timer**: Start/stop with duration tracking

### Deferred Features

1. **Auto-detect repetitions**: Start with manual tracking
2. **Advanced collections**: Begin with simple list view
3. **Social features**: Focus on individual practice first
4. **AI analysis**: Add after core features stable

## 9. Future Enhancements

1. **Advanced Practice Features**
   - Loop sections
   - Slow practice mode
   - Recording and playback
   - Mistake detection

2. **Social Features**
   - Share practice progress
   - Teacher assignments
   - Group challenges
   - Performance recordings

3. **AI Integration**
   - Difficulty analysis
   - Practice recommendations
   - Progress predictions
   - Automated feedback

## Success Metrics

1. **User Engagement**
   - Daily active users
   - Average session duration
   - Scores viewed per session
   - Practice sessions completed

2. **Technical Performance**
   - Page load time < 2s
   - Render time < 1s
   - API response < 200ms
   - 99.9% uptime

3. **Feature Adoption**
   - % users using metronome
   - % users tracking practice
   - Upload conversion rate
   - Library size growth

## Notes

- No navigation links to Scorebook until testing complete
- Consider separate worker deployment in future
- Focus on core functionality before advanced features
- Test thoroughly with provided sample PDFs
