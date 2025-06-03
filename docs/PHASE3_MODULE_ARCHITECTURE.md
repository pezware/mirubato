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
