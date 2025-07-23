# Clock Interface Improvement Mockup (#272)

## Issue

Users report difficulty selecting between hours and minutes in the clock interface. The selection feels "somewhat random".

## Current Implementation

- Single clock face with both hour and minute hands
- Unclear which hand is being dragged
- No visual feedback for active selection

## Proposed Solution: Option A - Separate Selection Modes

### Design Concept

Split the time selection into two distinct modes with clear visual indicators.

### Mockup

```
┌─────────────────────────────────────────┐
│         Select Practice Time            │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐    ┌─────────────┐    │
│  │   HOUR  ✓   │    │   MINUTE    │    │
│  └─────────────┘    └─────────────┘    │
│                                         │
│       ┌─────────────────┐               │
│       │                 │               │
│       │      12         │               │
│       │   11    1       │               │
│       │ 10   ╱   2     │               │
│       │   ╱             │               │
│       │ 9  ●      3    │               │
│       │   ╲             │               │
│       │ 8   ╲     4    │               │
│       │   7     5       │               │
│       │       6         │               │
│       │                 │               │
│       └─────────────────┘               │
│                                         │
│         [ 09:30 AM ]                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │       Confirm Time              │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Key Improvements

1. **Mode Toggle Buttons**
   - Clear "HOUR" and "MINUTE" buttons at top
   - Active mode highlighted with checkmark
   - One mode active at a time

2. **Visual Feedback**
   - Active mode's numbers highlighted
   - Single hand shown based on mode
   - Larger touch targets for numbers

3. **Digital Display**
   - Shows selected time in real-time
   - Click to edit directly (existing feature)
   - AM/PM toggle remains

4. **Mobile Optimization**
   - Larger hit areas for touch
   - Clear mode indicators
   - Responsive sizing

### Implementation Notes

```tsx
// ClockTimePicker.tsx modifications
interface ClockTimePickerProps {
  value: string
  onChange: (time: string) => void
  mode?: 'hour' | 'minute'  // New prop
}

// State management
const [selectionMode, setSelectionMode] = useState<'hour' | 'minute'>('hour')
const [hours, setHours] = useState(9)
const [minutes, setMinutes] = useState(30)

// Mode toggle UI
<div className="flex gap-2 mb-4">
  <button
    className={`px-4 py-2 rounded ${
      selectionMode === 'hour'
        ? 'bg-sage-500 text-white'
        : 'bg-gray-200'
    }`}
    onClick={() => setSelectionMode('hour')}
  >
    Hour {selectionMode === 'hour' && '✓'}
  </button>
  <button
    className={`px-4 py-2 rounded ${
      selectionMode === 'minute'
        ? 'bg-sage-500 text-white'
        : 'bg-gray-200'
    }`}
    onClick={() => setSelectionMode('minute')}
  >
    Minute {selectionMode === 'minute' && '✓'}
  </button>
</div>
```

### Benefits

- Clear separation of hour/minute selection
- No ambiguity about what's being adjusted
- Better mobile usability
- Maintains familiar clock metaphor
- Progressive enhancement (fallback to text input)

### Alternative Considerations

- **Option B**: Dropdown selects (simpler but less visual)
- **Option C**: Numeric steppers (fastest but less intuitive)

## Next Steps

1. Implement prototype with mode toggle
2. A/B test with users
3. Gather feedback on usability
4. Iterate based on results
