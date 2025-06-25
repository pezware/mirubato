# Module Impact Analysis for Multi-Voice Architecture

## Overview

This document analyzes each existing module and determines whether to keep, modify, or rebuild it for multi-voice support.

## Module Assessment

### ✅ Keep As-Is (No Changes Needed)

#### 1. **EventBus**

- **Status**: Fully compatible
- **Reason**: Generic pub/sub system, agnostic to data structure
- **Action**: None needed

#### 2. **AuthContext**

- **Status**: Fully compatible
- **Reason**: Authentication is independent of music notation
- **Action**: None needed

#### 3. **StorageModule** (Infrastructure)

- **Status**: Mostly compatible
- **Changes**: Add new storage keys for Score type
- **Action**: Minor updates only

#### 4. **SyncModule**

- **Status**: Fully compatible
- **Reason**: Generic sync mechanism
- **Action**: None needed

### 🔄 Modify (Significant Updates Required)

#### 5. **SheetMusicLibraryModule**

- **Current**: Handles single-voice SheetMusic type
- **Required Changes**:
  - Support both SheetMusic (legacy) and Score (new)
  - Update exercise generation for voices
  - New methods for voice extraction
  - Update search/filter for multi-voice
- **Effort**: High
- **Action**: Extend with new interfaces, maintain backward compatibility

#### 6. **PerformanceTrackingModule**

- **Current**: Tracks single note stream
- **Required Changes**:
  - Track notes per voice
  - Hand independence metrics
  - Polyphonic accuracy calculation
  - Voice-specific timing analysis
- **Effort**: High
- **Action**: Redesign performance model

#### 7. **AudioContext/AudioManager**

- **Current**: Monophonic playback
- **Required Changes**:
  - Multi-voice synthesis
  - Voice mixing controls
  - Per-voice volume/mute
  - Instrument assignment per voice
- **Effort**: High
- **Action**: Add polyphonic capabilities

#### 8. **PracticeSessionModule**

- **Current**: Generic session tracking
- **Required Changes**:
  - Voice selection for practice
  - Hand-specific practice modes
  - Multi-voice performance stats
- **Effort**: Medium
- **Action**: Extend practice options

### ❌ Rebuild (Start Fresh)

#### 9. **NotationRenderer**

- **Current**: Single-voice only
- **Issues**: Core logic assumes one voice
- **Action**: Create new `MultiVoiceRenderer` class
- **Migration**: Keep old renderer, use based on data type

#### 10. **Exercise Generators** (All)

- **Current**: Generate single-voice exercises
- **Issues**: Fundamental assumption of one voice
- **Action**: Rebuild with voice-aware generation
- **New Approach**:
  ```typescript
  interface ExerciseGenerator {
    generateScore(params: ExerciseParams): Score
    // Not: generateMeasures(): Measure[]
  }
  ```

#### 11. **MusicXML Converter**

- **Current**: Merges all voices incorrectly
- **Issues**: Fundamental parsing errors
- **Action**: Complete rewrite
- **New**: Proper voice/part/staff separation

### 📊 Module Dependency Impact

```
High Impact (needs major work):
├── SheetMusicLibraryModule
├── PerformanceTrackingModule
├── NotationRenderer
└── AudioManager

Medium Impact:
├── PracticeSessionModule
├── ProgressAnalyticsModule
└── CurriculumModule

Low/No Impact:
├── EventBus
├── StorageModule
├── SyncModule
├── AuthContext
├── PracticeLoggerModule
└── VisualizationModule
```

## Recommended Module Approach

### Option 1: Gradual Migration (Recommended)

1. **Create parallel implementations**:

   ```typescript
   // Old (keep working)
   class NotationRenderer {}

   // New (build alongside)
   class MultiVoiceNotationRenderer {}

   // Factory to choose
   function createRenderer(data: SheetMusic | Score) {
     return isScore(data)
       ? new MultiVoiceNotationRenderer()
       : new NotationRenderer()
   }
   ```

2. **Advantages**:
   - No breaking changes
   - Can test incrementally
   - Rollback capability
   - Users unaffected

3. **Disadvantages**:
   - More code to maintain
   - Longer timeline
   - Potential confusion

### Option 2: Clean Break

1. **Create new module set**:

   ```
   src/modules/v2/
   ├── score/
   ├── rendering/
   ├── performance/
   └── audio/
   ```

2. **Advantages**:
   - Clean architecture
   - No legacy constraints
   - Faster development
   - Better long-term

3. **Disadvantages**:
   - Temporary feature loss
   - Migration complexity
   - User disruption

## Module Priority Order

### Phase 1 (Foundation)

1. Create new type system
2. Build MusicXML converter
3. Create MultiVoiceRenderer

### Phase 2 (Core Features)

1. Update SheetMusicLibraryModule
2. Update AudioManager
3. Basic UI for voice display

### Phase 3 (Practice Features)

1. Update PerformanceTrackingModule
2. Update PracticeSessionModule
3. Voice practice modes

### Phase 4 (Advanced)

1. Update exercise generators
2. Update analytics
3. Migration tools

## Data Flow Changes

### Current Flow

```
MusicXML → Converter → SheetMusic → Renderer → Display
                            ↓
                    AudioManager → Playback
```

### New Flow

```
MusicXML → Parser → Score → MultiVoiceRenderer → Display
                      ↓
              Voice Extractor
                      ↓
              PolyphonicAudio → Playback
```

## Testing Strategy

### Keep Existing Tests

- All current tests remain valid
- Add new test suites for Score type
- Parallel testing of both systems

### New Test Requirements

```typescript
// Test voice rendering
describe('MultiVoiceRenderer', () => {
  test('renders piano grand staff')
  test('renders SATB choir')
  test('handles voice collisions')
})

// Test voice isolation
describe('VoiceExtraction', () => {
  test('extracts single voice from score')
  test('maintains timing relationships')
  test('preserves articulations')
})
```

## Conclusion

The modular architecture works in our favor—we can update modules independently. The recommended approach:

1. **Build new alongside old** (Option 1)
2. **Start with rendering pipeline** (highest user value)
3. **Gradually migrate modules** (lowest risk)
4. **Delete old system** once stable

This preserves all current functionality while building proper multi-voice support.
