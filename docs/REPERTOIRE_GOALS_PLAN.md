# Repertoire & Goals Integration Plan

## EARS Requirements

### Environment

- **Platform**: Mirubato - Music practice tracking application
- **Infrastructure**: Cloudflare Workers, D1 Database, React 18 + TypeScript
- **Current State**:
  - Logbook with practice tracking
  - Pieces view showing analytics
  - Goals database table exists but unused
  - Scores service with PDF/image viewing
  - Auto-logging for practice sessions

### Assumptions

1. Users want to track their musical repertoire progression
2. Goals are primarily tied to specific pieces/scores
3. PDF annotation is needed for marking practice sections
4. Both time-bound and open-ended goals are valuable
5. Integration should leverage existing infrastructure

### Requirements

#### Functional Requirements

1. **Repertoire Management**
   - Transform Pieces tab into Repertoire system
   - Track piece status: Planned, Learning, Working, Polished, Performance-Ready
   - Add personal notes and reference links per piece
   - View practice history and time invested per piece

2. **Goals Integration**
   - Create goals linked to specific pieces
   - Support time-bound goals (by date) and open goals
   - Track progress automatically through practice sessions
   - Visual progress indicators and milestone tracking

3. **Score Annotations**
   - Add annotations to PDF scores (markings, notes)
   - Quote specific measures for daily practice
   - Export/review annotated sections
   - Persist annotations across sessions

4. **Analytics & Progress**
   - Show time spent per piece
   - Track which measures need work
   - Progress visualization over time
   - Goal completion tracking

#### Non-Functional Requirements

- Maintain offline-first architecture
- Consistent UI with existing components
- Performance: <100ms API responses
- Mobile-responsive design
- i18n support for all new features

### Scope

- **In Scope**: Repertoire management, goals, basic PDF annotations
- **Out of Scope**: Audio recording, video tutorials, social sharing
- **Future Consideration**: Teacher assignments, collaborative annotations

## Implementation Plan

### Phase 1: Backend Infrastructure (Week 1)

#### 1.1 Database Schema Updates

```sql
-- Extend goals table with repertoire-specific fields
ALTER TABLE goals ADD COLUMN score_id TEXT REFERENCES scores(id);
ALTER TABLE goals ADD COLUMN measures TEXT; -- JSON array of measure numbers
ALTER TABLE goals ADD COLUMN practice_plan TEXT; -- JSON structure for practice requirements

-- Create repertoire status tracking
CREATE TABLE user_repertoire (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  score_id TEXT NOT NULL REFERENCES scores(id),
  status TEXT CHECK (status IN ('planned', 'learning', 'working', 'polished', 'performance_ready')),
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  personal_notes TEXT,
  reference_links TEXT, -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, score_id)
);

-- Create annotations table
CREATE TABLE score_annotations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  score_id TEXT NOT NULL REFERENCES scores(id),
  page_number INTEGER NOT NULL,
  annotation_data TEXT NOT NULL, -- JSON with drawing data
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX idx_repertoire_user ON user_repertoire(user_id);
CREATE INDEX idx_repertoire_score ON user_repertoire(score_id);
CREATE INDEX idx_annotations_user_score ON score_annotations(user_id, score_id);
```

#### 1.2 API Endpoints (Using existing patterns)

```typescript
// api/src/api/handlers/goals.ts
export const goalsHandler = new Hono<HonoEnv>()
  .post('/', createGoal) // Create repertoire goal
  .get('/', listGoals) // List user's goals with filters
  .get('/:id', getGoal) // Get specific goal details
  .put('/:id', updateGoal) // Update goal progress
  .delete('/:id', deleteGoal) // Remove goal
  .post('/:id/progress', trackProgress) // Log progress event

// api/src/api/handlers/repertoire.ts
export const repertoireHandler = new Hono<HonoEnv>()
  .get('/', listRepertoire) // List user's repertoire
  .post('/', addToRepertoire) // Add piece to repertoire
  .put('/:scoreId', updateRepertoireStatus)
  .delete('/:scoreId', removeFromRepertoire)
  .get('/:scoreId/stats', getRepertoireStats)

// api/src/api/handlers/annotations.ts
export const annotationsHandler = new Hono<HonoEnv>()
  .get('/:scoreId', getAnnotations)
  .post('/:scoreId', saveAnnotations)
  .delete('/:scoreId/:page', deletePageAnnotations)
```

### Phase 2: Frontend - Repertoire Tab (Week 1-2)

#### 2.1 Transform Pieces Tab to Repertoire

**Reuse Components:**

- `PiecesView.tsx` → `RepertoireView.tsx`
- Keep existing search and filtering
- Add status badges and goal indicators

**New Components:**

```typescript
// frontendv2/src/components/repertoire/
├── RepertoireView.tsx          // Main view (extends PiecesView)
├── RepertoireCard.tsx          // Individual piece card with status
├── RepertoireFilters.tsx       // Filter by status, goals, etc.
├── RepertoireStats.tsx         // Overview statistics
├── AddToRepertoireModal.tsx    // Add piece with initial goal
└── RepertoireDetailModal.tsx   // Detailed view with notes, goals
```

#### 2.2 Goals Integration

**Activate Existing Goal Code:**

- Enable goals in `logbookStore`
- Add goals API client
- Link goals to repertoire pieces

**New Components:**

```typescript
// frontendv2/src/components/goals/
├── GoalsList.tsx               // List goals for a piece
├── CreateGoalModal.tsx         // Create goal with templates
├── GoalProgress.tsx            // Visual progress indicator
├── GoalMilestones.tsx          // Milestone tracking
└── GoalSuggestions.tsx         // Smart practice suggestions
```

### Phase 3: Score Annotations (Week 2)

#### 3.1 PDF Annotation Layer

**Use react-pdf-highlighter as base:**

```bash
pnpm add react-pdf-highlighter
```

**Extend Existing Components:**

```typescript
// frontendv2/src/components/scores/
├── AnnotatedPdfViewer.tsx      // Wrapper for PDF with annotations
├── AnnotationToolbar.tsx       // Drawing tools UI
├── AnnotationLayer.tsx         // Canvas overlay for drawings
└── MeasureSelector.tsx         // Select measures for practice
```

#### 3.2 Annotation Features

- **Tools**: Pen, highlighter, text notes, measure brackets
- **Actions**: Save, load, clear, export
- **Integration**: Link annotations to practice sessions

### Phase 4: Integration & Polish (Week 2-3)

#### 4.1 Auto-Logging Integration

- Track goal progress during practice
- Update repertoire stats automatically
- Record which measures were practiced

#### 4.2 Reporting Integration

- Add Repertoire tab to reports
- Show goal progress charts
- Measure-specific practice time

#### 4.3 UI/UX Polish

- Consistent with Morandi design system
- Mobile-responsive layouts
- Loading states and error handling

## Technical Implementation Details

### State Management (Zustand)

```typescript
// frontendv2/src/store/repertoireStore.ts
interface RepertoireStore {
  repertoire: Map<string, RepertoireItem>
  goals: Map<string, Goal>
  annotations: Map<string, ScoreAnnotation[]>

  // Actions
  loadRepertoire: () => Promise<void>
  updateStatus: (scoreId: string, status: RepertoireStatus) => Promise<void>
  createGoal: (goal: CreateGoalInput) => Promise<void>
  saveAnnotations: (scoreId: string, annotations: Annotation[]) => Promise<void>
}
```

### API Integration

```typescript
// frontendv2/src/api/repertoire.ts
export const repertoireApi = {
  list: () => apiClient.get<RepertoireItem[]>('/api/repertoire'),
  add: (data: AddRepertoireInput) => apiClient.post('/api/repertoire', data),
  updateStatus: (scoreId: string, status: string) =>
    apiClient.put(`/api/repertoire/${scoreId}`, { status }),
  getStats: (scoreId: string) =>
    apiClient.get<RepertoireStats>(`/api/repertoire/${scoreId}/stats`),
}
```

### Mock UI Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│ 📚 Repertoire                                    [+ Add Piece]   │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Active Goals] [This Month]     Search: [____]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🎵 Chopin - Nocturne Op.9 No.2          [Performance Ready] │ │
│ │ ⏱ 42h total · Last: 2 days ago · 📊 Goal: Polish by Aug 1  │ │
│ │ Progress: ████████░░ 80% · Next: Work on dynamics m.17-24   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🎵 Bach - Invention No.1 in C Major            [Working] 🔥 │ │
│ │ ⏱ 18h total · Last: Today · 📊 Goal: Memorize by Sept 15   │ │
│ │ Progress: ████░░░░░░ 40% · Focus: m.8-12 hand independence  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🎵 Mozart - Sonata K.331 1st mov.              [Learning]   │ │
│ │ ⏱ 5h total · Last: 1 week ago · 📊 Goal: Learn exposition   │ │
│ │ Progress: ██░░░░░░░░ 20% · TODO: Practice scales in A major │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Migration Strategy

1. **Gradual Rollout**
   - Keep existing Pieces tab functional
   - Add Repertoire as new tab initially
   - Migrate users gradually

2. **Data Migration**
   - Analyze existing practice data
   - Auto-create repertoire entries for practiced pieces
   - Preserve all historical data

3. **Feature Flags**
   - Use feature flags for new functionality
   - A/B test with subset of users
   - Rollback capability if needed

## Success Metrics

- **Adoption**: 60% of active users use repertoire within 1 month
- **Engagement**: Average 3+ goals created per user
- **Retention**: 20% increase in weekly active users
- **Satisfaction**: User feedback score > 4.5/5

## Timeline

- **Week 1**: Backend API + Basic Repertoire UI
- **Week 2**: Goals Integration + Annotations
- **Week 3**: Polish + Testing + i18n
- **Week 4**: Deployment + Monitoring

Total: 4 weeks for full implementation
