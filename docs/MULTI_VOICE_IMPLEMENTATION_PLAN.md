# Multi-Voice Implementation Plan

## Overview

This document outlines the complete plan to redesign Rubato's architecture for proper multi-voice support, enabling flawless MusicXML rendering.

## Current State Assessment

### Working Components to Keep

1. **EventBus** - Core event system works well
2. **Authentication** - Magic link auth is independent
3. **UI Components** - Can be adapted for multi-voice
4. **Storage Infrastructure** - Abstract enough to handle new data

### Components Requiring Major Changes

1. **SheetMusic Types** - Complete redesign needed
2. **NotationRenderer** - Needs multi-voice rendering
3. **MusicXML Converter** - Full rewrite required
4. **AudioManager** - Needs polyphonic support

### Components to Deprecate/Remove

1. **Current exercise generators** - Rebuild with voice support
2. **Single-voice sheet music data** - Migrate or remove
3. **Current MusicXML conversion** - Replace entirely

## Phase 1: Core Data Model (Week 1)

### 1.1 New Type Definitions

```typescript
// Core voice-aware types
interface Voice {
  id: string // "soprano", "alto", "tenor", "bass", "rightHand", "leftHand"
  name?: string // Display name
  stemDirection?: 'up' | 'down' | 'auto'
  notes: Note[]
}

interface Staff {
  id: string // "treble", "bass", or custom ID
  clef: Clef
  voices: Voice[] // Multiple voices per staff
}

interface Measure {
  number: number
  staves: Staff[] // Support multiple staves
  timeSignature?: TimeSignature
  keySignature?: KeySignature
  tempo?: number
  barLine?: BarLineType
}

interface Part {
  id: string // "piano", "violin1", etc.
  name: string
  instrument: Instrument
  staves: string[] // Reference to staff IDs
}

interface Score {
  title: string
  composer: string
  parts: Part[]
  measures: Measure[]
  metadata: ScoreMetadata
}

// Enhanced Note type
interface Note {
  // Existing properties...

  // New required properties
  voice: string // Voice ID this note belongs to
  staff?: string // Staff ID (for cross-staff notation)
  chord?: Note[] // Other notes in the chord
  grace?: GraceNote
  articulations?: Articulation[]
  ornaments?: Ornament[]
}
```

### 1.2 Migration Strategy

1. Create new types alongside existing ones
2. Add conversion utilities
3. Support both formats temporarily
4. Gradually migrate features

### 1.3 Tasks

- [ ] Create new TypeScript interfaces
- [ ] Add validation utilities
- [ ] Create conversion functions
- [ ] Write comprehensive type tests

## Phase 2: MusicXML Converter (Week 1)

### 2.1 New Converter Architecture

```typescript
class MusicXMLToScoreConverter {
  private parseScore(xml: Document): Score {
    const parts = this.extractParts(xml)
    const measures = this.extractMeasures(xml, parts)

    return {
      title: this.extractTitle(xml),
      composer: this.extractComposer(xml),
      parts,
      measures,
      metadata: this.extractMetadata(xml),
    }
  }

  private extractMeasures(xml: Document, parts: Part[]): Measure[] {
    // Properly separate voices and staves
    // Maintain timing relationships
    // Handle grand staff notation
  }
}
```

### 2.2 Voice Separation Logic

1. Identify parts (instruments)
2. Identify staves per part
3. Identify voices per staff
4. Maintain proper timing
5. Handle cross-staff notation

### 2.3 Tasks

- [ ] Study MusicXML voice structure
- [ ] Implement proper XML parsing
- [ ] Handle all voice scenarios
- [ ] Test with complex scores

## Phase 3: NotationRenderer Redesign (Week 2)

### 3.1 Multi-Voice Renderer

```typescript
class MultiVoiceNotationRenderer {
  render(score: Score, options: RenderOptions) {
    // Create stave systems
    const staveSystems = this.createStaveSystems(score, options)

    // Render each measure
    score.measures.forEach((measure, index) => {
      this.renderMeasure(measure, staveSystems[index], options)
    })
  }

  private renderMeasure(
    measure: Measure,
    staveSystem: StaveSystem,
    options: RenderOptions
  ) {
    // Create VexFlow voices for each logical voice
    const vexVoices = this.createVexVoices(measure)

    // Format all voices together
    const formatter = new Formatter()
    formatter.joinVoices(vexVoices).format(vexVoices, options.width)

    // Draw each voice on appropriate staff
    this.drawVoices(vexVoices, staveSystem)
  }

  private createGrandStaff(x: number, y: number, width: number): StaveSystem {
    const treble = new Stave(x, y, width)
    const bass = new Stave(x, y + 100, width)

    // Connect with brace
    const brace = new StaveConnector(treble, bass)
    brace.setType(StaveConnector.type.BRACE)

    return { treble, bass, connector: brace }
  }
}
```

### 3.2 Features to Implement

1. Multiple voices per staff
2. Grand staff support
3. Cross-staff beaming
4. Voice-specific styling
5. Intelligent layout

### 3.3 Tasks

- [ ] Create new renderer class
- [ ] Implement voice rendering
- [ ] Add grand staff support
- [ ] Handle layout complexity
- [ ] Optimize performance

## Phase 4: Module Updates (Week 2-3)

### 4.1 SheetMusicLibraryModule

```typescript
interface SheetMusicLibraryModule {
  // New methods
  getScore(id: string): Promise<Score>
  saveScore(score: Score): Promise<void>

  // Voice-aware generation
  generateExercise(params: ExerciseParams): Score

  // Voice isolation
  extractVoice(score: Score, voiceId: string): Score
}
```

### 4.2 PerformanceTrackingModule

- Track performance per voice
- Support hand independence metrics
- Polyphonic accuracy calculation

### 4.3 AudioManager

```typescript
interface AudioManager {
  // New methods
  playScore(score: Score): void
  playVoice(score: Score, voiceId: string): void
  muteVoice(voiceId: string): void

  // Metronome for specific time signature
  startMetronome(timeSignature: TimeSignature): void
}
```

### 4.4 Tasks

- [ ] Update SheetMusicLibraryModule interfaces
- [ ] Implement voice-aware storage
- [ ] Update PerformanceTrackingModule
- [ ] Add polyphonic audio support
- [ ] Update practice session tracking

## Phase 5: UI Updates (Week 3)

### 5.1 New UI Components

```typescript
// Voice control component
interface VoiceControl {
  score: Score
  onVoiceToggle: (voiceId: string, enabled: boolean) => void
  onVoiceHighlight: (voiceId: string) => void
}

// Staff display options
interface StaffDisplayOptions {
  showTrebleStaff: boolean
  showBassStaff: boolean
  showVoiceColors: boolean
  voiceOpacity: Record<string, number>
}
```

### 5.2 Practice Features

1. Practice single voice
2. Practice hands separately
3. Highlight active voice
4. Voice-specific tempo
5. Voice mixing controls

### 5.3 Tasks

- [ ] Create voice control UI
- [ ] Add staff visibility toggles
- [ ] Implement voice highlighting
- [ ] Add practice mode selector
- [ ] Update sheet music display

## Phase 6: Testing & Migration (Week 4)

### 6.1 Test Suite

```typescript
describe('Multi-Voice System', () => {
  test('renders two voices on single staff', ...)
  test('renders grand staff correctly', ...)
  test('handles complex rhythms', ...)
  test('voice isolation works', ...)
  test('cross-staff notation', ...)
})
```

### 6.2 Migration Tools

```typescript
// Convert old format to new
function migrateSheetMusic(old: SheetMusic): Score {
  return {
    parts: [
      {
        id: 'main',
        instrument: old.instrument,
        staves: ['main'],
      },
    ],
    measures: old.measures.map(convertMeasure),
  }
}
```

### 6.3 Tasks

- [ ] Write comprehensive tests
- [ ] Create migration utilities
- [ ] Test with real MusicXML files
- [ ] Performance benchmarking
- [ ] Update documentation

## Implementation Order

### Week 1: Foundation

1. ✅ Define new data models
2. ⬜ Create type definitions
3. ⬜ Start MusicXML converter
4. ⬜ Basic voice separation

### Week 2: Core Rendering

1. ⬜ Multi-voice renderer
2. ⬜ Grand staff support
3. ⬜ Voice synchronization
4. ⬜ Basic UI updates

### Week 3: Module Integration

1. ⬜ Update storage modules
2. ⬜ Performance tracking
3. ⬜ Audio playback
4. ⬜ Practice features

### Week 4: Polish & Migration

1. ⬜ Comprehensive testing
2. ⬜ Migration tools
3. ⬜ Performance optimization
4. ⬜ Documentation

## Success Criteria

1. **Can render Bach Minuet with both hands**
2. **Can display SATB choral music**
3. **Proper voice isolation for practice**
4. **No timing errors**
5. **Performance on par with current system**

## Risk Mitigation

1. **Keep old system functional** during development
2. **Feature flag** for new renderer
3. **Incremental migration** of content
4. **Extensive testing** before switching

## Alternative Approach: Clean Slate

If preferred, we could:

1. Create new `ScoreRenderer` alongside existing
2. New `Score` type hierarchy
3. Gradually move features
4. Delete old system when ready

This would be cleaner but requires maintaining two systems temporarily.

## Next Steps

1. **Approval of approach**
2. **Start with data model definition**
3. **Create proof of concept**
4. **Iterate based on findings**

The key is to build the foundation right this time, ensuring we can handle any MusicXML score properly.
