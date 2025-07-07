# Auto-Logging Module

A reusable module for tracking practice sessions and automatically logging them to the logbook.

## Features

- ✅ **Automatic Session Tracking**: Start/stop practice sessions with timing
- ✅ **Configurable Auto-Save**: Set minimum duration and rounding intervals
- ✅ **Practice Summary Modal**: Optional review before saving
- ✅ **Flexible Metadata**: Support for different practice types (metronome, score, counter, custom)
- ✅ **User Preferences**: Persistent settings stored in localStorage
- ✅ **Type-Safe**: Full TypeScript support

## Basic Usage

### 1. Import the hook and components

```typescript
import {
  usePracticeTracking,
  PracticeSummaryModal,
} from '@/modules/auto-logging'
```

### 2. Initialize tracking in your component

```typescript
const MyPracticeComponent = () => {
  const {
    isTracking,
    formattedTime,
    showSummary,
    pendingSession,
    start,
    stop,
    update,
    confirmSave,
    dismissSummary,
  } = usePracticeTracking({
    type: 'metronome', // or 'score', 'counter', 'custom'
    metadata: {
      title: 'Metronome Practice',
      instrument: 'PIANO',
    },
    onSessionEnd: (duration, metadata) => {
      // Optional callback after session is saved
      console.log('Practice saved!', duration, metadata)
    },
  })

  return (
    <>
      {/* Your UI */}
      <button onClick={isTracking ? stop : start}>
        {isTracking ? `Stop (${formattedTime})` : 'Start Practice'}
      </button>

      {/* Practice Summary Modal */}
      <PracticeSummaryModal
        isOpen={showSummary}
        onClose={dismissSummary}
        onSave={confirmSave}
        onDiscard={dismissSummary}
        duration={pendingSession?.duration || 0}
        metadata={pendingSession?.metadata || {}}
        title="Practice Complete!"
      />
    </>
  )
}
```

## Integration Examples

### Metronome Integration

```typescript
// In Toolbox.tsx
const {
  isTracking,
  formattedTime,
  showSummary,
  pendingSession,
  start,
  stop,
  update,
  confirmSave,
  dismissSummary,
} = usePracticeTracking({
  type: 'metronome',
  metadata: {
    title: 'Metronome Practice',
    instrument: 'PIANO',
  },
})

// Track tempo changes
useEffect(() => {
  if (isTracking) {
    update({
      averageTempo: currentTempo,
      patterns: [currentPattern.name],
    })
  }
}, [currentTempo, currentPattern, isTracking, update])

// Start tracking when metronome starts
const handleMetronomeStart = () => {
  setIsPlaying(true)
  if (!isTracking) {
    start()
  }
}

// Stop tracking when metronome stops
const handleMetronomeStop = () => {
  setIsPlaying(false)
  if (isTracking) {
    stop() // This will show the summary modal
  }
}
```

### Score Viewer Integration

```typescript
// In ScoreControls.tsx
const { isTracking, formattedTime, start, stop, update } = usePracticeTracking({
  type: 'score',
  metadata: {
    scoreId: score.id,
    scoreTitle: score.title,
    scoreComposer: score.composer,
    instrument: 'PIANO',
  },
})

// Track page views
const handlePageChange = (page: number) => {
  if (isTracking) {
    update({
      pagesViewed: [...(currentMetadata.pagesViewed || []), page],
    })
  }
}
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  enabled: true, // Enable auto-logging
  minDuration: 60, // Minimum 60 seconds
  roundingInterval: 1, // Round to nearest minute
  showSummary: true, // Show summary before saving
  defaultTags: ['auto-logged'],
  defaultInstrument: 'PIANO',
}
```

### Customizing Configuration

```typescript
// In your component or app initialization
const { updateConfig } = useAutoLogging()

// Update configuration
updateConfig({
  minDuration: 120, // 2 minutes minimum
  roundingInterval: 5, // Round to 5 minutes
  showSummary: false, // Auto-save without summary
})
```

## Metadata Fields

### Common Fields

- `title`: Practice session title
- `composer`: Composer name (if applicable)
- `instrument`: 'PIANO' | 'GUITAR'
- `tags`: Array of tags

### Type-Specific Fields

**Metronome**

- `tempoChanges`: Array of tempo changes with timestamps
- `patterns`: Pattern names used
- `averageTempo`: Average BPM

**Score**

- `scoreId`: Score identifier
- `scoreTitle`: Score title
- `scoreComposer`: Composer name
- `pagesViewed`: Array of page numbers viewed

**Counter**

- `repetitions`: Array of repetition data
- `totalReps`: Total number of repetitions
- `mode`: 'up' | 'down'

**Custom**

- `customData`: Any additional data as key-value pairs

## Advanced Usage

### Custom Practice Types

```typescript
const tracking = usePracticeTracking({
  type: 'custom',
  metadata: {
    title: 'Scales Practice',
    customData: {
      scale: 'C Major',
      tempo: 120,
      hands: 'both',
    },
  },
})

// Update custom data during practice
tracking.update({
  customData: {
    ...tracking.currentMetadata.customData,
    completedScales: ['C Major', 'G Major'],
  },
})
```

### Conditional Auto-Logging

```typescript
const { config } = useAutoLogging()

// Only auto-log if user is authenticated and has enabled it
if (isAuthenticated && config.enabled) {
  // Practice tracking logic
}
```

## Testing

The module includes comprehensive test coverage. Run tests with:

```bash
npm test -- src/modules/auto-logging
```

## Future Enhancements

- [ ] Practice goals integration
- [ ] Statistics and analytics
- [ ] Export practice data
- [ ] Practice reminders
- [ ] Social sharing
