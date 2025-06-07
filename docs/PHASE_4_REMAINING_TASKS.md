# Phase 4: Advanced Sheet Music Module - Remaining Tasks

## Overview

This document consolidates the remaining Phase 4 tasks after completing Phase 1 (Exercise Generation Core). Tasks have been reprioritized to focus on backend data layer, storage, curated repertoire, and UI/UX as top priorities.

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
