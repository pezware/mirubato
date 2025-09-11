# Practice Tools Specification

Status: ✅ Active

## Purpose

Practice Tools provide essential utilities that musicians need during practice sessions. These tools integrate seamlessly with the practice logging system, automatically tracking usage and contributing to practice analytics.

## Why Integrated Practice Tools Matter

Traditional practice tools (standalone metronomes, timers, etc.) create data silos. Musicians lose valuable information about:

- How tempo affects practice quality
- Which exercises are used most
- How tools correlate with progress
- When external aids are needed

Integrated tools solve this by automatically capturing tool usage as part of the practice narrative.

## Core Tools

### 1. Metronome

**Purpose**: Develop and maintain consistent tempo and rhythm.

**Why This Implementation**:

- **Visual + Audio**: Some musicians need visual cues in loud environments
- **Pattern Programming**: Complex rhythms need more than basic beats
- **Auto-logging**: Track when and how metronome practice occurs
- **Tempo Ramping**: Gradually increase tempo for technique building

**Essential Features**:

```typescript
interface MetronomeConfig {
  // Basic settings
  bpm: number // 20-300
  beatsPerMeasure: number // 1-12
  beatUnit: 4 | 8 | 16 // Quarter, eighth, sixteenth

  // Advanced patterns
  pattern: BeatPattern // Custom accents and subdivisions
  subdivision: 'none' | 'duplet' | 'triplet' | 'quadruplet'

  // Practice features
  tempoRamp?: {
    startBpm: number
    endBpm: number
    incrementPerBar: number
    barsPerIncrement: number
  }

  // Feedback
  sound: 'click' | 'wood' | 'bell' | 'voice'
  volume: number // 0-100
  visualFlash: boolean
  vibration: boolean // Mobile haptic feedback

  // Auto-logging
  autoLog: boolean
  logThreshold: number // Minimum seconds before logging (default ~60s)
}
```

**Proper Implementation Principles**:

1. **Precise Timing**: Use Web Audio API, not setTimeout
2. **Look-ahead Scheduling**: Queue beats in advance for accuracy
3. **Visual Sync**: Flash must align exactly with audio
4. **Background Support**: Continue in background (mobile)
5. **Latency Compensation**: Adjust for Bluetooth delay

**Audio Engine Architecture**:

```typescript
class MetronomeEngine {
  private audioContext: AudioContext
  private nextNoteTime: number = 0
  private scheduleAheadTime: number = 0.1 // Schedule 100ms ahead
  private lookahead: number = 25 // How often to check (ms)

  // Use oscillator for precise timing
  private scheduleNote(beatNumber: number, time: number) {
    const osc = this.audioContext.createOscillator()
    const env = this.audioContext.createGain()

    osc.frequency.value = this.isAccent(beatNumber) ? 1000 : 800
    env.gain.setValueAtTime(1, time)
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.05)

    osc.connect(env)
    env.connect(this.audioContext.destination)
    osc.start(time)
    osc.stop(time + 0.05)

    // Trigger visual feedback
    this.scheduleVisual(time)
  }
}
```

**Usage Tracking**:

- Start/stop times
- BPM used and changes
- Pattern complexity
- Duration of use
- Associated pieces (if selected)

### 2. Practice Timer

**Purpose**: Structure practice sessions with time awareness.

**Why More Than a Simple Timer**:

- **Pomodoro Technique**: Built-in break reminders
- **Section Timing**: Allocate time to different pieces/techniques
- **Auto-pause Detection (Planned)**: Recognize when practice stops
- **Session Templates**: Reusable practice structures

**Timer Modes**:

```typescript
type TimerMode =
  | 'simple' // Count up
  | 'countdown' // Count down from set time
  | 'pomodoro' // 25 min work, 5 min break
  | 'interval' // Custom work/rest periods
  | 'structured' // Pre-planned session segments

interface PracticeSession {
  segments: Array<{
    name: string // "Warm-up", "Scales", "Piece work"
    duration: number // minutes
    piece?: RepertoireItem
    notes?: string
  }>

  // Auto-pause detection
  pauseThreshold: number // Seconds of inactivity
  pauseBehavior: 'pause' | 'prompt' | 'continue'

  // Notifications
  segmentAlerts: boolean
  breakReminders: boolean
  halfwayAlert: boolean
}
```

**Proper Session Management**:

1. **Persistence**: Sessions survive page refresh
2. **Background Tracking**: Continue timing when minimized
3. **Smart Pausing**: Detect lack of activity
4. **Graceful Recovery**: Handle interruptions properly
5. **Automatic Logging**: Create logbook entry on completion

**Integration with Logbook**:

```typescript
interface TimerLogbookIntegration {
  // Real-time tracking
  updateEntryDraft(): void // Update draft as timer runs

  // Completion handling
  async onTimerComplete(session: TimerSession) {
    const entry = {
      duration: session.totalTime,
      segments: session.segments.map(s => ({
        duration: s.actualTime,
        piece: s.piece,
        notes: s.notes
      })),
      type: 'practice',
      source: 'timer'
    }

    await logbookStore.addEntry(entry)
  }

  // Pause tracking
  trackPauses(pauses: Pause[]) // Record interruptions
}
```

### 3. Circle of Fifths

**Purpose**: Interactive music theory reference and learning tool.

**Why Interactive Matters**:

- **Visual Learning**: See key relationships spatially
- **Audio Reinforcement**: Hear the keys/chords
- **Scale Generation**: Instantly see scales for any key
- **Progression Building**: Understand chord relationships

**Interactive Features**:

```typescript
interface CircleOfFifths {
  // Display modes
  mode: 'keys' | 'chords' | 'scales' | 'modes'
  notation: 'letters' | 'roman' | 'nashville'

  // Interaction
  selectedKey: Key
  highlightMode: {
    relative: boolean // Show relative major/minor
    parallel: boolean // Show parallel major/minor
    dominant: boolean // Show dominant relationships
    subdominant: boolean
    tritone: boolean
  }

  // Audio playback
  playKey(key: Key): void
  playChord(chord: Chord): void
  playScale(scale: Scale): void
  playProgression(progression: ChordProgression): void

  // Educational features
  quiz: {
    type: 'identify' | 'relationships' | 'progressions'
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  }
}
```

**Proper Visual Design**:

- SVG-based for crisp scaling
- Touch-optimized hit targets
- Color coding for relationships
- Animated transitions between selections
- Responsive to screen size

**Educational Value Tracking**:

- Time spent exploring
- Keys/scales accessed
- Quiz scores and progress
- Common lookup patterns

### 4. Practice Counter

**Purpose**: Track repetitions for focused technique practice.

**Why Dedicated Counter**:

- **Gamification**: Visual progress motivates
- **Accuracy**: Harder to lose count
- **History**: Track improvement over sessions
- **Flexibility**: Different counting modes

**Counter Modes**:

```typescript
interface PracticeCounter {
  // Counting modes
  mode: 'up' | 'down' | 'target' | 'infinite'

  // Configuration
  target?: number
  increment: number // Count by 1s, 5s, 10s

  // Interaction
  shortcuts: {
    increment: string[] // Keyboard shortcuts
    decrement: string[]
    reset: string[]
  }

  // Feedback
  milestones: number[] // Celebrate at specific counts
  sounds: boolean
  vibration: boolean

  // Sessions
  sets: Array<{
    count: number
    timestamp: number
    notes?: string
  }>

  // Auto-logging
  logAsRepetitions: boolean
  attachToPiece?: string // Link to repertoire item
}
```

**Visual Feedback Design**:

```
┌─────────────────────────┐
│      47 / 100           │
│   ████████████░░░░░     │
│                         │
│  [+1] [+5] [+10] [-1]  │
│                         │
│  Set 1: 50 ✓            │
│  Set 2: 47 ...          │
└─────────────────────────┘
```

**Proper Implementation**:

- Large touch targets for mobile
- Keyboard shortcuts for desktop
- Prevent accidental resets
- Save progress automatically
- Link to specific exercises

### 5. Tuner (Future Enhancement)

**Purpose**: Ensure accurate intonation for instruments.

**Why Include a Tuner**:

- Complete practice toolkit
- Track intonation improvement
- Instrument-specific references
- Temperature compensation awareness

**Core Requirements**:

- Microphone permission handling
- FFT for pitch detection
- Cents deviation display
- Multiple temperaments
- Instrument presets

## Integration Architecture

### Automatic Usage Logging

**What Gets Logged**:

```typescript
interface ToolUsageLog {
  tool: 'metronome' | 'timer' | 'circle' | 'counter' | 'tuner'
  startTime: number
  endTime: number
  configuration: any // Tool-specific settings

  // Context
  associatedPiece?: string
  practiceSessionId?: string

  // Metrics
  interactions: number // Clicks, taps, changes

  // Auto-create logbook entry if:
  // - Duration > 5 minutes
  // - User explicitly saves
  // - Part of timer session
}
```

### Cross-Tool Coordination

**Scenario: Metronome + Timer**:

```typescript
class ToolCoordinator {
  // When timer starts, offer metronome
  onTimerStart(session: TimerSession) {
    if (session.piece?.targetTempo) {
      this.promptMetronome(session.piece.targetTempo)
    }
  }

  // When metronome runs long, suggest timer
  onMetronomeUsage(duration: number) {
    if (duration > 5 * 60 && !this.timerActive) {
      this.suggestTimer('Track this practice session?')
    }
  }

  // Unified practice mode
  startPracticeMode(piece: RepertoireItem) {
    this.timer.start()
    this.metronome.setBpm(piece.currentTempo)
    this.showScore(piece.scoreId)
  }
}
```

## Mobile Optimization

### Touch-First Design

**Requirements**:

- Minimum 44px touch targets
- Gesture support (swipe for BPM)
- Haptic feedback for counts
- Portrait and landscape layouts
- One-thumb operation possible

### Background Behavior

**iOS Considerations**:

- Audio must continue in background
- Use Audio Session API
- Show in Control Center
- Handle interruptions gracefully

**Android Considerations**:

- Foreground service for timer
- Notification controls
- Wakelock for metronome
- Power management exemption

## Performance Requirements

### Metronome Precision

**Acceptable Tolerances**:

- Audio timing: < 5ms deviation
- Visual sync: < 16ms (one frame)
- BPM accuracy: ± 0.1%
- Latency: < 20ms response

### Resource Management

**Optimization Strategies**:

- Web Workers for timing
- RequestAnimationFrame for visuals
- AudioWorklet for processing
- Throttle UI updates
- Release resources when idle

## Best Practices

### For Users

1. **Start Simple**: Master basic tempo before patterns
2. **Use Visual Cues**: Helpful in noisy environments
3. **Track Progress**: Note tempo achievements
4. **Structure Sessions**: Use timer segments
5. **Regular Breaks**: Prevent fatigue and injury

### For Implementation

1. **Precise Timing**: Never use setTimeout for audio
2. **Save State**: Persist settings between sessions
3. **Offline First**: Tools work without connection
4. **Accessibility**: Keyboard navigation essential
5. **Battery Aware**: Reduce usage on low battery

## Success Metrics

**Usage Analytics**:

- Daily active tool users
- Average session duration
- Tool combination patterns
- Settings complexity used
- Auto-log conversion rate

**Value Indicators**:

- Tempo improvement correlation
- Timer use vs. practice consistency
- Counter use vs. technique mastery
- Theory tool vs. repertoire diversity

## Common Pitfalls to Avoid

1. **Timing Drift**: JavaScript timers are imprecise
2. **Audio Latency**: Bluetooth adds delay
3. **Battery Drain**: Continuous audio/vibration
4. **Complexity Creep**: Too many features
5. **Poor Offline Support**: Tools should work anywhere

## Related Documentation

- [Logbook](./logbook.md) - Automatic logging integration
- [Repertoire](./repertoire.md) - Piece-specific settings
- [Mobile Optimization](../04-frontend/responsive-design.md) - Touch interactions

## Code References

- Metronome: `frontendv2/src/services/{metronomeService,patternMetronomeService}.ts`
- Timer: `frontendv2/src/contexts/TimerContext.tsx`, `frontendv2/src/components/timer/{TimerWidget,TimerSettings}.tsx`
- Circle of Fifths: `frontendv2/src/components/circle-of-fifths/*`
- Practice Counter: `frontendv2/src/components/practice-counter/*`
- Auto-logging: `frontendv2/src/modules/auto-logging/*`

---

_Last updated: 2025-09-09 | Version 1.7.6_
