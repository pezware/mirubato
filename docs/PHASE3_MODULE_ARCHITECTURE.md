# Phase 3 Module Architecture Plan

## Overview

This document outlines the architecture and implementation plan for Phase 3 modules: Progress Analytics, Professional Practice Logger, and Curriculum Module.

## Architectural Principles

### 1. Module Independence

- Each module must function independently
- Dependencies only through constructor injection
- Communication only through EventBus

### 2. Event-Driven Architecture

- All inter-module communication via events
- No direct method calls between modules
- Events follow pattern: `source:action:status`

### 3. Local-First Design

- All data stored locally first
- Sync to cloud is optional enhancement
- Offline functionality is primary

### 4. Test-Driven Development

- Write tests before implementation
- Minimum 80% coverage
- Integration tests for module interactions

## Module Specifications

### Progress Analytics Module

**Purpose**: Aggregate and analyze performance data to provide insights and track improvement.

**Dependencies**:

- EventBus (for communication)
- StorageModule (for data persistence)

**Key Events**:

- Subscribes to:
  - `performance:note:recorded`
  - `practice:session:ended`
  - `practice:session:summary`
- Publishes:
  - `progress:milestone:achieved`
  - `progress:insight:generated`
  - `progress:report:ready`

**Core Methods**:

```typescript
interface ProgressAnalyticsModule {
  // Analysis methods
  getProgressReport(userId: string, timeRange: TimeRange): ProgressReport
  getWeakAreas(userId: string): WeakArea[]
  getSuggestedFocus(userId: string): FocusArea[]

  // Milestone tracking
  checkMilestones(sessionData: SessionData): Milestone[]
  getMilestoneHistory(userId: string): Milestone[]

  // Trend analysis
  getAccuracyTrend(userId: string, days: number): TrendData
  getPracticeConsistency(userId: string): ConsistencyMetrics
}
```

**Data Structures**:

```typescript
interface ProgressReport {
  userId: string
  timeRange: TimeRange
  totalPracticeTime: number
  sessionsCompleted: number
  averageAccuracy: number
  improvementRate: number
  strengthAreas: string[]
  weakAreas: WeakArea[]
  milestones: Milestone[]
}

interface WeakArea {
  type: 'rhythm' | 'pitch' | 'key_signature' | 'tempo'
  accuracy: number
  occurrences: number
  suggestions: string[]
}

interface Milestone {
  id: string
  type: 'accuracy' | 'consistency' | 'level' | 'time'
  achieved: boolean
  achievedAt?: number
  criteria: MilestoneCriteria
}
```

### Professional Practice Logger Module

**Purpose**: Provide comprehensive practice journaling and goal tracking for serious musicians.

**Dependencies**:

- EventBus (for communication)
- StorageModule (for data persistence)

**Key Events**:

- Subscribes to:
  - `practice:session:*` (all session events)
  - `performance:*` (all performance events)
  - `user:goal:created`
- Publishes:
  - `practice:log:entry:created`
  - `practice:log:entry:updated`
  - `practice:goal:completed`
  - `practice:export:ready`

**Core Methods**:

```typescript
interface PracticeLoggerModule {
  // Logging methods
  createLogEntry(entry: LogEntryInput): LogEntry
  updateLogEntry(id: string, updates: Partial<LogEntry>): LogEntry
  getLogEntries(filters: LogFilters): LogEntry[]

  // Goal management
  createGoal(goal: GoalInput): Goal
  updateGoalProgress(goalId: string, progress: number): Goal
  getActiveGoals(userId: string): Goal[]

  // Export functionality
  exportLogs(format: 'pdf' | 'csv' | 'json', filters: LogFilters): ExportResult
  generatePracticeReport(timeRange: TimeRange): PracticeReport
}
```

**Data Structures**:

```typescript
interface LogEntry {
  id: string
  userId: string
  timestamp: number
  duration: number
  type: 'practice' | 'performance' | 'lesson' | 'rehearsal'
  pieces: PieceReference[]
  techniques: string[]
  goals: string[]
  notes: string
  mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited'
  tags: string[]
}

interface Goal {
  id: string
  userId: string
  title: string
  description: string
  targetDate: number
  progress: number
  milestones: GoalMilestone[]
  status: 'active' | 'completed' | 'paused'
}
```

### Curriculum Module

**Purpose**: Manage learning paths, exercise progression, and adaptive difficulty.

**Dependencies**:

- EventBus (for communication)
- StorageModule (for data persistence)
- ProgressAnalyticsModule (for adaptive learning)

**Key Events**:

- Subscribes to:
  - `progress:milestone:achieved`
  - `practice:session:ended`
  - `performance:accuracy:calculated`
- Publishes:
  - `curriculum:exercise:recommended`
  - `curriculum:level:completed`
  - `curriculum:path:updated`
  - `curriculum:difficulty:adjusted`

**Core Methods**:

```typescript
interface CurriculumModule {
  // Exercise management
  getNextExercise(userId: string): Exercise
  getExercisesByLevel(level: number): Exercise[]
  markExerciseComplete(userId: string, exerciseId: string): void

  // Learning path management
  getCurrentPath(userId: string): LearningPath
  switchPath(userId: string, pathId: string): LearningPath
  getAvailablePaths(userId: string): LearningPath[]

  // Adaptive learning
  adjustDifficulty(userId: string, performance: PerformanceData): void
  checkPrerequisites(exerciseId: string, userId: string): boolean
  getRecommendations(userId: string, count: number): Exercise[]
}
```

**Data Structures**:

```typescript
interface Exercise {
  id: string
  title: string
  level: number
  type: 'sight-reading' | 'rhythm' | 'scales' | 'chords'
  prerequisites: string[]
  musicData: MusicXML | VexFlowData
  targetDuration: number
  passingCriteria: PassingCriteria
}

interface LearningPath {
  id: string
  name: string
  description: string
  levels: Level[]
  prerequisites: string[]
  estimatedDuration: number
}

interface Level {
  number: number
  title: string
  exercises: Exercise[]
  passingCriteria: LevelCriteria
  unlocks: string[]
}
```

## Module Interaction Patterns

### 1. Session Flow with All Modules

```typescript
// 1. User starts practice
PracticeSessionModule.startSession()
  → publishes 'practice:session:started'

// 2. Curriculum recommends exercise
CurriculumModule (listening to session:started)
  → publishes 'curriculum:exercise:recommended'

// 3. Performance tracking begins
PerformanceTrackingModule (already implemented)
  → tracks accuracy
  → publishes 'performance:note:recorded'

// 4. Session ends
PracticeSessionModule.endSession()
  → publishes 'practice:session:ended' with summary

// 5. Progress analysis
ProgressAnalyticsModule (listening to session:ended)
  → analyzes performance
  → publishes 'progress:milestone:achieved' (if applicable)

// 6. Logger records
PracticeLoggerModule (listening to all events)
  → creates comprehensive log entry
  → publishes 'practice:log:entry:created'

// 7. Curriculum adapts
CurriculumModule (listening to milestones)
  → adjusts difficulty
  → updates learning path
  → publishes 'curriculum:difficulty:adjusted'
```

### 2. Data Synchronization Pattern

All modules follow the same sync pattern:

1. Store data locally via StorageModule
2. StorageModule publishes 'data:sync:required'
3. SyncModule handles cloud synchronization
4. Conflict resolution follows last-write-wins

### 3. Error Handling Pattern

```typescript
try {
  // Module operation
} catch (error) {
  // Update health status
  this.health.status = 'red'
  this.health.error = error.message

  // Publish error event
  await this.eventBus.publish({
    source: this.name,
    type: `${this.name}:error:occurred`,
    data: { error: error.message },
  })

  // Graceful degradation
  // Continue with reduced functionality
}
```

## Implementation Timeline

### Week 1-2: Progress Analytics Module

- [ ] Core analytics engine
- [ ] Milestone detection
- [ ] Trend analysis
- [ ] Integration tests

### Week 3-4: Practice Logger Module

- [ ] Log entry management
- [ ] Goal tracking
- [ ] Export functionality
- [ ] Integration tests

### Week 5-6: Curriculum Module

- [ ] Exercise management
- [ ] Learning path system
- [ ] Adaptive difficulty
- [ ] Integration tests

### Week 7: Integration Testing

- [ ] Full system integration tests
- [ ] Performance optimization
- [ ] Documentation updates

## Testing Strategy

### Unit Tests (Per Module)

- Test all public methods
- Mock dependencies
- Test error scenarios
- Verify event publishing

### Integration Tests

- Test module interactions
- Verify event flow
- Test data persistence
- Test offline scenarios

### E2E Tests

- Test complete user workflows
- Verify UI updates from events
- Test sync behavior
- Performance benchmarks

## Performance Considerations

### 1. Event Throttling

- Progress analytics should throttle calculations
- Batch multiple note events before analysis
- Use debouncing for UI updates

### 2. Storage Optimization

- Implement data rotation for logs
- Compress historical data
- Index frequently queried fields

### 3. Memory Management

- Clear event listeners on shutdown
- Implement data pagination
- Use weak references where appropriate

## Security Considerations

### 1. Data Privacy

- All data encrypted at rest
- User data isolated by userId
- No PII in event metadata

### 2. Export Security

- Sanitize data before export
- Verify user ownership
- Rate limit export requests

## Migration Strategy

### From Current to New Architecture

1. Deploy modules incrementally
2. Run in parallel with existing features
3. Migrate data gradually
4. Deprecate old code after verification

## Success Metrics

### Technical Metrics

- 80%+ test coverage
- <100ms module initialization
- <50ms event processing
- Zero memory leaks

### User Metrics

- Improved practice consistency
- Higher user retention
- Positive feedback on insights
- Increased session duration

## Implementation Work Plan

### Overview

This work plan details the implementation strategy for the remaining Phase 3 modules: PracticeLoggerModule (Logbook) and CurriculumModule, following our established architectural patterns and TDD approach.

### Module Implementation Order

#### 1. PracticeLoggerModule (Week 1-2)

**Purpose**: Professional practice logbook for tracking, journaling, and goal management.

**Day 1-2: Test Suite Development**

- [ ] Create `PracticeLoggerModule.test.ts` with comprehensive test coverage
- [ ] Define test cases for:
  - Log entry creation/update/deletion
  - Goal management lifecycle
  - Export functionality (PDF/CSV/JSON)
  - Event subscription patterns
  - Error handling and edge cases

**Day 3-4: Core Implementation**

- [ ] Implement `PracticeLoggerModule.ts` following test specifications
- [ ] Create `types.ts` with interfaces for LogbookEntry
- [ ] Implement storage integration for persistence

**Day 5-6: Advanced Features**

- [ ] Goal tracking system implementation
- [ ] Export functionality with formatting
- [ ] Rich metadata support (tags, mood, custom fields)
- [ ] Event aggregation from practice sessions

**Day 7-8: Integration & Polish**

- [ ] Integration tests with existing modules
- [ ] Performance optimization
- [ ] TypeDoc documentation
- [ ] UI components for logbook interface

#### 2. CurriculumModule (Week 3-4)

**Purpose**: Adaptive learning system with exercise progression and difficulty adjustment.

**Day 1-2: Test Suite Development**

- [ ] Create `CurriculumModule.test.ts` with comprehensive coverage
- [ ] Define test cases for:
  - Exercise recommendation algorithm
  - Prerequisite checking system
  - Learning path management
  - Adaptive difficulty adjustment
  - Spaced repetition logic

**Day 3-4: Core Implementation**

- [ ] Implement `CurriculumModule.ts` following test specifications
- [ ] Create `types.ts` with Exercise and LearningPath interfaces
- [ ] Implement DAG for prerequisite management

**Day 5-6: Curriculum Content**

- [ ] Import initial repertoire from analyzed CSV data:
  - RCM 5-6: Foundation pieces
  - RCM 7-8: Intermediate repertoire
  - RCM 9-10: Advanced works
- [ ] Create learning paths:
  - Classical pathway (Bach → Mozart → Chopin)
  - Technical pathway (Scales → Hanon → Etudes)
  - Style-focused paths (Baroque, Romantic, Latin)

**Day 7-8: Adaptive Learning**

- [ ] Implement performance-based difficulty adjustment
- [ ] Create recommendation algorithm
- [ ] Add spaced repetition for review
- [ ] Integration with ProgressAnalyticsModule

#### 3. Integration Testing (Week 5)

**Day 1-2: Module Integration**

- [ ] Test complete session flow with all modules
- [ ] Verify event communication patterns
- [ ] Test data persistence and sync

**Day 3-4: User Journey Testing**

- [ ] Create E2E tests for common workflows:
  - New user onboarding with curriculum selection
  - Practice session with logbook entry
  - Goal completion triggering curriculum advancement
  - Export logbook for teacher review

**Day 5: Performance & Optimization**

- [ ] Load testing with large repertoire database
- [ ] Memory profiling for long practice sessions
- [ ] Event bus optimization for high-frequency events

### Repertoire Data Integration

Based on analysis of the CSV files in `/tmp/`, the curriculum will include:

**Foundation Module (RCM 5-6)**:

- Bach: March in G Major, Polonaise in G Minor
- Burgmüller: Progressive etudes
- Early Romantic character pieces

**Intermediate Module (RCM 7-8)**:

- Bach: Two-Part Inventions (1, 4, 8, 13, 14)
- Chopin: Waltz in A Minor, Prelude in E Minor
- Spanish/Latin: Introduction to Granados and Ginastera

**Advanced Module (RCM 9-10)**:

- Chopin: Nocturnes, advanced Mazurkas
- Complex character pieces
- Contemporary repertoire

**Technical Development**:

- Systematic scale work (tracked daily in logbook)
- Hanon progression (numbered exercises)
- Sight-reading practice with progressive difficulty

### Risk Mitigation Strategies

**Technical Risks**:

1. **Large repertoire database performance**

   - Implement pagination and lazy loading
   - Use indexes for fast lookups

2. **Complex prerequisite graphs**

   - Use proven DAG algorithms
   - Cache prerequisite calculations

3. **Export file size for long-term users**
   - Implement date range filters
   - Compress exported data

**Design Risks**:

1. **Over-complexity in curriculum paths**

   - Start with 3 basic paths
   - Expand based on user feedback

2. **Logbook entry fatigue**
   - Auto-populate from session data
   - Make manual notes optional

### Updated Timeline

- **Week 1-2**: PracticeLoggerModule implementation
- **Week 3-4**: CurriculumModule implementation
- **Week 5**: Integration testing and optimization
- **Week 6**: Buffer for issues and polish

Total: 6 weeks to complete Phase 3 implementation

## Remaining Modules Implementation Plan

### Current Status Update

As of the latest sync, the following Phase 3 modules have been completed:

- ✅ **ProgressAnalyticsModule**: 90%+ test coverage
- ✅ **PracticeLoggerModule**: 90.4% test coverage
- ✅ **CurriculumModule**: 87.37% test coverage

The remaining modules to implement are:

- 🚧 **CurriculumModule Enhancements**: Advanced practice features and technical exercises
- 🚧 **AudioFeedbackModule**: Real-time audio analysis
- 🚧 **VisualizationModule**: Data visualization and charts

### CurriculumModule Enhancements Specification

**Purpose**: Extend the existing CurriculumModule with granular practice features, technical exercises, and performance tracking.

**Rationale**: Instead of creating a separate RepertoireManagerModule, we'll enhance the existing CurriculumModule to avoid duplication and maintain a single source of truth for all learning content.

**New Features to Add**:

- Measure-by-measure and phrase-level practice
- Technical exercise generation (scales, arpeggios, patterns)
- Practice repetition tracking with quality metrics
- Performance readiness assessment
- Maintenance scheduling for learned repertoire
- Multi-factor difficulty evaluation

**Enhanced Core Interfaces**:

```typescript
// Extend existing CurriculumModule interface
interface CurriculumModule {
  // ... existing methods ...

  // New granular practice methods
  createPracticeSession(
    pieceId: string,
    config: PracticeConfig
  ): PracticeSession
  updatePracticeProgress(sessionId: string, progress: PracticeProgress): void
  generateTechnicalExercise(type: TechnicalType, level: number): Exercise
  assessPerformanceReadiness(
    pieceId: string,
    userId: string
  ): ReadinessAssessment
  scheduleMaintenancePractice(userId: string): MaintenanceSchedule[]
  evaluateDifficulty(content: MusicContent): DifficultyAssessment
}

interface PracticeConfig {
  type: 'full' | 'section' | 'measures' | 'phrase' | 'pattern'
  focus: 'accuracy' | 'tempo' | 'dynamics' | 'articulation' | 'memorization'
  measures?: { start: number; end: number }
  hands?: 'both' | 'left' | 'right' | 'alternating'
  tempo?: {
    start: number
    target: number
    increment: number
    rampType: 'linear' | 'exponential' | 'stepped'
  }
  repetitions?: {
    target: number
    qualityThreshold: number
    maxAttempts: number
  }
  metronome?: {
    enabled: boolean
    subdivision: 'quarter' | 'eighth' | 'sixteenth'
    accent: 'downbeat' | 'strong' | 'all'
  }
}

interface TechnicalExercise extends Exercise {
  category:
    | 'scale'
    | 'arpeggio'
    | 'chord'
    | 'pattern'
    | 'etude'
    | 'finger-independence'
  key?: string
  pattern?: string
  handPosition?: 'parallel' | 'contrary' | 'alternating'
  fingering?: number[]
  variations?: TechnicalVariation[]
}

interface TechnicalVariation {
  name: string
  description: string
  rhythmPattern?: string
  dynamicPattern?: string
  articulationPattern?: string
  tempoMultiplier?: number
}

interface DifficultyAssessment {
  overall: number // 1-10 scale
  factors: {
    technical: number // finger patterns, stretches, coordination
    rhythmic: number // rhythm complexity, polyrhythms
    harmonic: number // chord progressions, key changes
    musical: number // phrasing, dynamics, expression
    cognitive: number // reading complexity, memorization
  }
  prerequisites: string[]
  estimatedLearningTime: number // hours
  recommendedPreparation: string[]
}

interface PerformanceReadiness {
  pieceId: string
  userId: string
  overallReadiness: number // 0-100%
  criteria: {
    technical: { score: number; notes: string[] }
    musical: { score: number; notes: string[] }
    memorization: { score: number; notes: string[] }
    stability: { score: number; notes: string[] }
    polish: { score: number; notes: string[] }
  }
  recommendedActions: string[]
  estimatedTimeToReadiness: number
}

interface MaintenanceSchedule {
  pieceId: string
  lastPracticed: number
  skill: 'maintaining' | 'declining' | 'forgotten'
  priority: 'high' | 'medium' | 'low'
  recommendedFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  nextPracticeDate: number
  maintenanceType: 'full-runthrough' | 'problem-spots' | 'memory-refresh'
}
```

### AudioFeedbackModule Specification

**Purpose**: Real-time audio analysis with visual feedback during practice.

**Core Technologies**:

- Web Audio API for audio processing
- Pitch detection algorithms (autocorrelation/YIN)
- Real-time visual feedback system
- Audio recording capabilities

**Dependencies**:

- EventBus (singleton)
- StorageModule (injected)
- Tone.js (for audio utilities)

**Event Subscriptions**:

- `practice:session:started` - Initialize audio monitoring
- `practice:session:paused` - Pause monitoring
- `practice:session:ended` - Stop and save analysis

**Event Publications**:

- `audio:monitoring:started`
- `audio:note:detected`
- `audio:accuracy:calculated`
- `audio:feedback:generated`
- `audio:recording:saved`

**Core Interfaces**:

```typescript
interface AudioFeedbackConfig {
  enableMicrophone: boolean
  sensitivity: 'low' | 'medium' | 'high'
  pitchAlgorithm: 'autocorrelation' | 'yin' | 'ml-based'
  feedbackMode: 'visual' | 'haptic' | 'both'
  recordingEnabled: boolean
  noiseGate: number
  calibrationProfile?: CalibrationProfile
}

interface AudioAnalysisFrame {
  timestamp: number
  detectedPitch?: {
    frequency: number
    note: string
    cents: number
    confidence: number
  }
  expectedPitch?: {
    frequency: number
    note: string
  }
  volume: number
  timingDelta: number
  intonationScore: number
}

interface RealtimeFeedback {
  type: 'pitch' | 'rhythm' | 'dynamics' | 'articulation'
  severity: 'good' | 'warning' | 'error'
  message?: string
  visualIndicator: {
    color: string
    position: { x: number; y: number }
    animation?: string
  }
}
```

### VisualizationModule Specification

**Purpose**: Comprehensive data visualization for progress, analytics, and insights.

**Visualization Types**:

- Progress charts (line, area, bar)
- Practice heat maps (calendar view)
- Performance radar charts
- Goal progress indicators
- Repertoire status overview
- Skill progression trees

**Dependencies**:

- EventBus (singleton)
- StorageModule (injected)
- D3.js or Chart.js (TBD based on requirements)

**Event Subscriptions**:

- `progress:report:ready` - Update progress charts
- `repertoire:analytics:ready` - Update repertoire visualizations
- `logger:report:generated` - Update practice insights
- `curriculum:stats:calculated` - Update learning progress

**Event Publications**:

- `visualization:rendered`
- `visualization:exported`
- `visualization:interaction`

**Core Interfaces**:

```typescript
interface VisualizationConfig {
  library: 'chartjs' | 'd3' | 'custom'
  theme: 'light' | 'dark' | 'auto'
  animations: boolean
  responsiveBreakpoints: number[]
  exportFormats: ('png' | 'svg' | 'pdf')[]
  accessibility: {
    announceUpdates: boolean
    keyboardNavigation: boolean
    highContrast: boolean
  }
}

interface ChartSpecification {
  id: string
  type: ChartType
  dataSource: string // Event type or data key
  updateFrequency: 'realtime' | 'session' | 'daily'
  dimensions: {
    width?: number | 'auto'
    height?: number | 'auto'
    aspectRatio?: number
  }
  interactivity: {
    zoom: boolean
    pan: boolean
    tooltips: boolean
    legend: boolean
  }
}

type ChartType =
  | 'progressLine'
  | 'practiceHeatmap'
  | 'skillRadar'
  | 'repertoireTree'
  | 'goalProgress'
  | 'accuracyHistogram'
```

### Implementation Timeline (Remaining Modules)

#### Week 1-2: CurriculumModule Enhancements

**Day 1-2: Design & Test Suite Enhancement**

- Extend existing test suite with new functionality
- Design enhanced data structures and interfaces
- Plan backward compatibility with existing implementation

**Day 3-5: Granular Practice Features**

- Implement measure/phrase-level practice configuration
- Add practice repetition tracking with quality metrics
- Create tempo ramping and metronome integration

**Day 6-8: Technical Exercise System**

- Build technical exercise generation (scales, arpeggios, patterns)
- Implement exercise variations and progressions
- Add hand independence and finger pattern exercises

**Day 9-10: Performance Assessment & Maintenance**

- Implement multi-factor difficulty evaluation
- Build performance readiness assessment system
- Create maintenance scheduling for learned repertoire

#### Week 3-4: AudioFeedbackModule

**Day 1-2: Audio Infrastructure**

- Set up Web Audio API pipeline
- Implement pitch detection algorithm
- Create audio processing workers

**Day 3-5: Real-time Analysis**

- Build note detection system
- Implement accuracy calculation
- Create timing analysis

**Day 6-8: Feedback System**

- Design visual feedback components
- Implement real-time UI updates
- Add recording functionality

**Day 9-10: Testing & Optimization**

- Mock audio APIs for testing
- Optimize for low latency
- Handle edge cases and errors

#### Week 3-4: VisualizationModule

**Day 1-2: Chart Infrastructure**

- Evaluate and choose charting library
- Set up visualization pipeline
- Create base chart components

**Day 3-5: Core Visualizations**

- Implement progress charts
- Build practice heatmap
- Create repertoire visualizations

**Day 6-8: Advanced Features**

- Add interactivity and animations
- Implement export functionality
- Build responsive layouts

**Day 9-10: Polish & Accessibility**

- Add keyboard navigation
- Implement screen reader support
- Performance optimization

#### Week 5: AudioFeedbackModule

**Day 1-2: Audio Infrastructure**

- Set up Web Audio API pipeline
- Implement pitch detection algorithm
- Create audio processing workers

**Day 3-5: Real-time Analysis**

- Build note detection system
- Implement accuracy calculation
- Create timing analysis

**Day 6-8: Feedback System**

- Design visual feedback components
- Implement real-time UI updates
- Add recording functionality

**Day 9-10: Testing & Optimization**

- Mock audio APIs for testing
- Optimize for low latency
- Handle edge cases and errors

#### Week 6: Full Integration & Testing

**Day 1-2: System Integration**

- Test all module interactions
- Verify event flow completeness
- Check data consistency

**Day 3-4: Performance Testing**

- Load test with large datasets
- Profile memory usage
- Optimize bottlenecks

**Day 5: Documentation**

- Update API documentation
- Create integration guides
- Add usage examples

### Module Integration Example

```typescript
// Complete practice session with enhanced modules

// 1. User creates focused practice session
CurriculumModule.createPracticeSession(pieceId, {
  type: 'measures',
  measures: { start: 16, end: 32 },
  focus: 'tempo',
  hands: 'right',
  tempo: { start: 60, target: 120, increment: 10 },
  repetitions: { target: 5, qualityThreshold: 0.9 }
})
  → publishes 'curriculum:practice:session:created'

// 2. Audio monitoring begins
AudioFeedbackModule (listening to practice:session:created)
  → starts microphone capture
  → publishes 'audio:monitoring:started'

// 3. Real-time feedback during focused practice
AudioFeedbackModule
  → publishes 'audio:note:detected' (continuous)
  → publishes 'audio:tempo:analysis'
  → publishes 'audio:accuracy:calculated'

// 4. Visualizations update in real-time
VisualizationModule (listening to audio events)
  → updates tempo progression chart
  → shows accuracy indicator for current measures
  → displays repetition quality metrics

// 5. Practice session completes repetitions
CurriculumModule
  → evaluates performance quality
  → updates practice progress
  → publishes 'curriculum:practice:progress:updated'

// 6. Session ends
PracticeSessionModule.endSession()
  → publishes 'practice:session:ended'

// 7. Enhanced curriculum tracking
CurriculumModule
  → updates piece-specific analytics
  → checks performance readiness
  → updates maintenance schedule
  → publishes 'curriculum:performance:assessed'

// 8. Analytics and visualizations refresh
ProgressAnalyticsModule → processes granular practice data
VisualizationModule → updates practice insight charts
```

### Technical Considerations

#### Performance Requirements

- **AudioFeedbackModule**: <20ms latency for real-time feedback
- **VisualizationModule**: 60fps animations, <200ms chart renders
- **RepertoireManagerModule**: <100ms for searches and filters

#### Browser Compatibility

- **AudioFeedbackModule**: Chrome 66+, Firefox 53+, Safari 11+
- **VisualizationModule**: All modern browsers with Canvas/SVG
- **All modules**: Progressive enhancement for older browsers

#### Mobile Optimizations

- Touch-optimized visualizations
- Reduced audio processing on low-end devices
- Responsive layouts for all screen sizes
- Battery-efficient algorithms

### Testing Strategy

#### Unit Tests (85%+ coverage target)

- Mock all external APIs (Web Audio, Canvas, etc.)
- Test error handling and edge cases
- Verify event emission patterns
- Test state management

#### Integration Tests

- Cross-module event flow
- Data persistence and retrieval
- Concurrent module operations
- Performance under load

#### E2E Tests

- Complete user workflows
- Real browser environments
- Mobile device testing
- Accessibility validation

### Success Metrics

#### Technical Metrics

- Test coverage: >85% per module
- Initialization time: <100ms
- Memory usage: <50MB baseline
- No memory leaks

#### User Experience Metrics

- Audio latency: <20ms perceived
- Chart interaction: Smooth at 60fps
- Data load time: <500ms
- Accessibility: WCAG 2.1 AA compliant

### Risk Mitigation

#### Technical Risks

1. **Audio API Limitations**

   - Mitigation: Fallback to non-real-time analysis
   - Alternative: Server-side processing option

2. **Large Dataset Performance**

   - Mitigation: Data pagination and virtualization
   - Alternative: Progressive data loading

3. **Browser Compatibility**
   - Mitigation: Feature detection and polyfills
   - Alternative: Graceful degradation

#### User Experience Risks

1. **Complex Visualizations**

   - Mitigation: Progressive disclosure
   - Alternative: Simplified view options

2. **Audio Permission Denial**
   - Mitigation: Clear value proposition
   - Alternative: Manual entry mode

Total revised timeline: 6 weeks for remaining Phase 3 work

- Week 1-2: CurriculumModule Enhancements
- Week 3-4: VisualizationModule
- Week 5: AudioFeedbackModule
- Week 6: Integration & Testing

This approach eliminates module duplication while providing comprehensive learning management capabilities through an enhanced CurriculumModule that handles everything from basic repertoire to advanced technical exercises with granular practice control.
