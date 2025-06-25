# Phase 4: Advanced Sheet Music Module - Remaining Tasks

## Overview

This document consolidates the remaining Phase 4 tasks after completing Phase 1 (Exercise Generation Core). Tasks have been reprioritized to focus on backend data layer, storage, curated repertoire, and UI/UX as top priorities.

## MVP Simplification Plan (2 Weeks) - TOP PRIORITY

### Goal: "Practice Mode Only" - A Stable, Usable Product

Focus on delivering a simple, bug-free practice experience with 10 curated pieces and preset practice workouts.

### Week 1: Stabilization & Bug Fixes

#### Day 1-2: Module Simplification

**Objective**: Disable complex features to reduce bugs and complexity

**Tasks:**

1. Keep only essential modules active:
   - EventBus (core infrastructure)
   - StorageModule (local storage only, no sync)
   - SheetMusicLibraryModule (display & generate only)
   - PracticeSessionModule (simplified tracking)
   - AudioContext (playback only)

2. Temporarily disable:
   - PerformanceTrackingModule
   - ProgressAnalyticsModule
   - CurriculumModule
   - PracticeLoggerModule
   - VisualizationModule
   - SyncModule

3. Update module initialization to skip disabled modules
4. Remove UI components that depend on disabled modules
5. Test that core functionality still works

#### Day 3-4: Fix VexFlow Rendering Bugs

**Objective**: Ensure sheet music displays correctly without crashes

**Tasks:**

1. Fix measure width calculations
2. Implement proper cleanup on component unmount
3. Handle window resize events correctly
4. Fix page turning/scrolling issues
5. Ensure consistent rendering across devices
6. Add error boundaries around VexFlow components

#### Day 5: Fix Audio Playback Issues

**Objective**: Reliable audio playback and metronome sync

**Tasks:**

1. Fix mobile audio context initialization
2. Ensure metronome syncs with notation
3. Proper cleanup of Tone.js resources
4. Fix timing issues between audio and visual
5. Add loading states for audio samples
6. Test on multiple devices (iOS, Android, Desktop)

### Week 2: Content & Polish

#### Day 1-2: Add 10 Curated Pieces

**Objective**: Provide quality content for immediate use

**Piano Pieces (5):**

1. Bach - Minuet in G (from Anna Magdalena Notebook)
2. Mozart - Sonata K.545, 1st movement (first page only)
3. Clementi - Sonatina Op.36 No.1, 1st movement
4. Schumann - "Melody" from Album for the Young Op.68
5. Chopin - Prelude Op.28 No.7 (A major)

**Guitar Pieces (5):**

1. Sor - Study Op.60 No.1 (C major)
2. Giuliani - Arpeggio Study Op.1a No.1
3. Carcassi - Etude Op.60 No.1 (C major)
4. Tárrega - "Lágrima"
5. Anonymous - "Romance" (Spanish Romance)

**Implementation:**

1. Source public domain scores from IMSLP/Mutopia
2. Convert to internal format
3. Add metadata (difficulty, duration, key)
4. Create thumbnail previews
5. Add to seed data
6. Test loading and playback

#### Day 3: Implement Preset Practice Workouts

**Objective**: Simplify practice generation with presets

**Preset Workouts:**

```typescript
const PRESET_WORKOUTS = [
  {
    name: 'Daily Sight-Reading (Easy)',
    params: {
      difficulty: 2,
      measures: 8,
      keySignature: 'C',
      timeSignature: '4/4',
    },
  },
  {
    name: 'Scale Practice (Major Keys)',
    params: {
      type: 'scales',
      keys: ['C', 'G', 'D', 'A', 'E'],
      pattern: 'ascending-descending',
    },
  },
  {
    name: 'Rhythm Training (4/4 Time)',
    params: {
      focus: 'rhythm',
      timeSignature: '4/4',
      difficulty: 3,
    },
  },
  {
    name: 'Interval Recognition',
    params: {
      intervals: ['M3', 'P5', 'P8'],
      direction: 'both',
    },
  },
]
```

**Tasks:**

1. Create preset workout UI component
2. Implement one-click practice generation
3. Store presets in configuration
4. Allow quick access from main page
5. Test all preset generations

#### Day 4: Simplify UI to Single "Practice" Mode

**Objective**: Remove confusion between practice/exercise modes

**UI Simplification:**

```tsx
// Main Practice Page Structure
<PracticePage>
  <PracticeSelector>
    <Section title="Featured Pieces">
      <CuratedPieces pieces={repertoire} />
    </Section>
    <Section title="Practice Workouts">
      <PresetWorkouts workouts={presets} />
    </Section>
  </PracticeSelector>

  <PracticeDisplay>
    <SheetMusicDisplay />
    <SimpleControls>
      <PlayPauseButton />
      <TempoSlider min={40} max={200} />
      <MetronomeToggle />
      <VolumeControl />
    </SimpleControls>
  </PracticeDisplay>
</PracticePage>
```

**Tasks:**

1. Rename "Exercise Library" to "Practice"
2. Consolidate all practice-related UI
3. Remove advanced settings and options
4. Simplify navigation to single page
5. Update routing and menu items
6. Ensure mobile responsiveness

#### Day 5: Testing & Final Bug Fixes

**Objective**: Ensure stable, bug-free experience

**Testing Checklist:**

1. Load each of the 10 curated pieces
2. Test all preset workouts
3. Verify audio playback on all devices
4. Check page turning/scrolling
5. Test tempo changes during playback
6. Verify metronome sync
7. Test on slow connections
8. Check memory usage over time
9. Verify local storage works
10. Test error handling

### Implementation Guidelines

#### Storage Simplification

```typescript
// Simplified storage - just last 10 practice sessions
interface SimplifiedStorage {
  recentPractices: {
    id: string
    pieceTitle: string
    date: Date
    duration: number
  }[]

  settings: {
    tempo: number
    metronomeEnabled: boolean
    volume: number
  }
}
```

#### Error Handling Pattern

```typescript
// Consistent error handling across all components
try {
  // Operation
} catch (error) {
  console.error('Practice error:', error)
  showUserMessage('Something went wrong. Please refresh and try again.')
  // Graceful fallback
}
```

### Success Criteria

1. **Performance**: Page loads in <2 seconds
2. **Stability**: No crashes during normal use
3. **Mobile**: Works on iOS Safari, Android Chrome
4. **Audio**: Stays in sync with notation
5. **Usability**: New user can start practicing in <30 seconds

### What We Defer to Later Phases

1. User accounts & cloud sync
2. Progress tracking & analytics
3. Complex difficulty assessment
4. AI-powered features
5. Social/sharing features
6. Professional practice logging
7. Spaced repetition algorithms
8. Advanced search & filtering
9. MusicXML import/export
10. Performance recording

---

## Priority 1: Backend Data Layer & Storage (Week 1)

### Task 1.1: Create Database Migrations

**Priority: CRITICAL** - Foundation for all other features

```sql
-- backend/migrations/0006_create_user_repertoire.sql
-- backend/migrations/0007_create_generated_exercises.sql
-- backend/migrations/0008_create_music_recommendations.sql
```

**Subtasks:**

1. Create user_repertoire table for tracking learning status
2. Create generated_exercises table for storing custom exercises
3. Create music_recommendations table for AI suggestions
4. Add indexes for performance optimization
5. Test migrations locally with D1
6. Add rollback scripts
7. Run lint & test

### Task 1.2: Update GraphQL Schema & Resolvers

```graphql
# backend/src/schema/schema.graphql
type UserRepertoire {
  id: ID!
  user: User!
  sheetMusic: SheetMusic!
  status: RepertoireStatus!
  dateStarted: Date
  dateMemorized: Date
  dateLastPlayed: Date
  totalPracticeMinutes: Int!
  personalNotes: String
  difficultyRating: Int
}

enum RepertoireStatus {
  LEARNING
  MEMORIZED
  FORGOTTEN
  DROPPED
  WISHLIST
}
```

**Subtasks:**

1. Add new types to GraphQL schema
2. Create queries for repertoire management
3. Create mutations for status updates
4. Implement resolvers with proper authorization
5. Generate TypeScript types
6. Write resolver tests
7. Run lint & test

### Task 1.3: Implement Storage Service Extensions

```typescript
// backend/src/services/sheetMusic.ts
export class SheetMusicService {
  async createUserRepertoire(
    userId: string,
    sheetMusicId: string
  ): Promise<UserRepertoire>
  async updateRepertoireStatus(
    id: string,
    status: RepertoireStatus
  ): Promise<UserRepertoire>
  async getUserRepertoire(userId: string): Promise<UserRepertoire[]>
  async saveGeneratedExercise(exercise: GeneratedExercise): Promise<void>
}
```

**Subtasks:**

1. Extend existing services for repertoire tracking
2. Add transaction support for complex updates
3. Implement caching layer for frequently accessed data
4. Add data validation and sanitization
5. Write comprehensive service tests
6. Run lint & test

## Priority 2: Curated Repertoire & Content (Week 1-2)

### Task 2.1: Initial Sheet Music Database Population

**Content Priority (from practice data analysis):**

#### Piano:

1. Bach: Inventions (2-part), selections from WTC
2. Mozart: Sonata K.545, K.331
3. Chopin: Easier Waltzes (Op.69), Mazurkas
4. Czerny: Op.599 progressive studies
5. Technical: Hanon exercises 1-20

#### Guitar:

1. Carulli: Op.241 progressive studies
2. Sor: Op.60 (25 studies)
3. Carcassi: 25 Études Op.60
4. Giuliani: Op.48

**Subtasks:**

1. Source public domain scores from IMSLP
2. Convert to internal format with metadata
3. Add difficulty ratings and prerequisites
4. Tag with technical elements
5. Create seed data scripts
6. Validate data integrity
7. Run import tests

### Task 2.2: Implement Content Import Pipeline

```typescript
// scripts/import-sheet-music.ts
interface SheetMusicImport {
  title: string
  composer: string
  opus?: string
  difficulty: number // 1-10
  technicalElements: string[]
  musicalPeriod: string
  estimatedLearningHours: number
  prerequisitePieces?: string[]
}
```

**Subtasks:**

1. Create import script for batch processing
2. Add validation for required fields
3. Auto-generate thumbnails
4. Extract key musical features
5. Build import CLI tool
6. Document import process
7. Run import validation tests

## Priority 3: UI/UX Components (Week 2)

### Task 3.1: Create Music Library UI

```typescript
// frontend/src/components/MusicLibrary/MusicLibraryGrid.tsx
export const MusicLibraryGrid: React.FC<Props> = ({ pieces, onSelect }) => {
  // Responsive grid with filtering, sorting, and search
}
```

**Subtasks:**

1. Design responsive grid/list toggle view
2. Create sheet music preview cards
3. Add filtering sidebar (composer, difficulty, genre)
4. Implement search with debouncing
5. Add sorting options (title, composer, difficulty)
6. Create loading and empty states
7. Write component tests with MSW
8. Test accessibility (keyboard nav, screen readers)

### Task 3.2: Implement Repertoire Status Management

```typescript
// frontend/src/components/RepertoireStatus/StatusSelector.tsx
export const StatusSelector: React.FC<Props> = ({
  currentStatus,
  onChange,
}) => {
  // Visual status selector with icons
}
```

**Subtasks:**

1. Create status selector component
2. Add visual indicators (colors, icons)
3. Implement optimistic updates
4. Add confirmation for destructive actions
5. Create status history view
6. Write interaction tests
7. Ensure mobile responsiveness

### Task 3.3: Build Practice Progress Dashboard

```typescript
// frontend/src/pages/Progress.tsx
export const ProgressDashboard: React.FC = () => {
  // Main dashboard with heatmap, stats, and recommendations
}
```

**Subtasks:**

1. Create dashboard layout
2. Implement practice heatmap (like GitHub contributions)
3. Add repertoire statistics cards
4. Create recommendation carousel
5. Add time range filters
6. Implement data export
7. Write dashboard tests

## Priority 4: Search & Discovery (Week 3)

### Task 4.1: Implement Advanced Search

```typescript
// frontend/src/modules/sheetMusic/MusicSearchEngine.ts
export class MusicSearchEngine {
  async search(criteria: AdvancedSearchCriteria): Promise<SearchResults>
  private buildQuery(criteria: AdvancedSearchCriteria): string
  private scoreResults(results: SheetMusic[]): ScoredResult[]
}
```

**Subtasks:**

1. Implement full-text search with D1
2. Add faceted filtering
3. Create relevance scoring algorithm
4. Add search suggestions/autocomplete
5. Implement search history
6. Add search analytics
7. Write search tests

### Task 4.2: Create Recommendation Engine

```typescript
// frontend/src/modules/sheetMusic/RecommendationEngine.ts
export class RecommendationEngine {
  async getRecommendations(userId: string): Promise<Recommendation[]>
  private analyzeUserPreferences(userId: string): UserProfile
  private findSimilarPieces(sheetMusicId: string): SheetMusic[]
}
```

**Subtasks:**

1. Analyze user's practice history
2. Implement collaborative filtering
3. Add content-based recommendations
4. Create spaced repetition scheduler
5. Add recommendation explanations
6. Write recommendation tests
7. A/B test recommendation algorithms

## Week 4: Engagement & Gamification

### Task 5.1: Implement Achievement System

```typescript
// frontend/src/modules/achievements/AchievementModule.ts
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  criteria: AchievementCriteria
  points: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}
```

**Subtasks:**

1. Define achievement types and criteria
2. Create achievement tracking system
3. Implement unlock notifications
4. Add achievement gallery page
5. Create progress bars for multi-step achievements
6. Write achievement tests
7. Design achievement artwork

### Task 5.2: Add Spaced Repetition System

```typescript
// frontend/src/modules/sheetMusic/SpacedRepetitionEngine.ts
export class SpacedRepetitionEngine {
  calculateNextReview(piece: UserRepertoire): Date
  adjustInterval(performance: PerformanceMetrics): number
  getReviewQueue(userId: string): SheetMusic[]
}
```

**Subtasks:**

1. Implement modified SM-2 algorithm for music
2. Account for muscle memory vs cognitive retention
3. Add review notifications
4. Create review queue UI
5. Track review performance
6. Write algorithm tests
7. Validate with user studies

## Week 5: Import/Export & Advanced Features

### Task 6.1: MusicXML Import

```typescript
// frontend/src/modules/sheetMusic/importers/MusicXMLImporter.ts
export class MusicXMLImporter {
  async import(file: File): Promise<SheetMusic>
  private parse(xml: string): ParsedMusicXML
  private validate(parsed: ParsedMusicXML): ValidationResult
}
```

**Subtasks:**

1. Implement MusicXML parser
2. Add validation and error recovery
3. Extract metadata and difficulty
4. Generate preview thumbnail
5. Add import progress UI
6. Write import tests with various files
7. Handle edge cases and malformed files

### Task 6.2: Performance Analytics

```typescript
// frontend/src/modules/analytics/PerformanceAnalytics.ts
export class PerformanceAnalytics {
  analyzePracticeSession(session: PracticeSession): AnalyticsReport
  generateInsights(history: PracticeSession[]): Insight[]
  predictLearningCurve(sheetMusicId: string, userId: string): LearningCurve
}
```

**Subtasks:**

1. Implement session analysis algorithms
2. Create insight generation engine
3. Add predictive modeling
4. Build analytics dashboard
5. Add data visualization components
6. Write analytics tests
7. Validate predictions with real data

## Testing & Quality Assurance (Ongoing)

### Comprehensive Testing Requirements

For each module and feature:

- [ ] Unit tests with >85% coverage
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical user flows
- [ ] Performance tests (response time <100ms)
- [ ] Accessibility tests (WCAG 2.1 AA)
- [ ] Mobile responsiveness tests
- [ ] Error scenario coverage
- [ ] Loading state handling

### Performance Targets

1. **Search Performance**: <100ms for complex queries
2. **Page Load**: <2s for library grid with 100+ items
3. **Import Speed**: <5s for standard MusicXML files
4. **Recommendation Generation**: <200ms
5. **Exercise Generation**: <50ms

## Documentation Requirements

### For Each Major Feature

1. **User Documentation**: How-to guides and tutorials
2. **API Documentation**: GraphQL schema docs
3. **Technical Documentation**: Architecture decisions
4. **Testing Documentation**: Test plans and coverage reports

## Success Metrics

1. **User Engagement**: 50%+ increase in practice session duration
2. **Feature Adoption**: 80%+ users utilizing repertoire tracking
3. **Search Satisfaction**: 90%+ successful searches
4. **Performance**: All targets met consistently
5. **Quality**: <1% error rate in production

## Development Workflow

For each task:

```bash
# Create feature branch
git checkout -b feature/task-name

# Development cycle
npm run dev              # Frontend development
npm run dev:backend      # Backend development
npm run test -- --watch  # Test-driven development

# Before commit
npm run lint
npm run test
npm run test:coverage

# Commit with conventional commits
git commit -m "feat(module): implement feature"

# Create PR for review
```

---

This reorganized plan prioritizes the foundational backend work and core user-facing features that will provide immediate value while setting up the infrastructure for more advanced features in later phases.
