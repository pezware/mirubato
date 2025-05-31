# Auto Page-Flip Feature Specification

## Overview

Automatically turn pages in the sheet music display to follow along with the currently playing measure during playback.

## User Experience

### During Playback

- Pages automatically advance when the playing measure reaches the next page
- Smooth transition between pages (fade effect)
- No jarring jumps or interruptions to the music

### During Pause

- Page remains on the current position
- User can manually navigate to any page
- Playback resumes from the paused position

### On Stop

- Returns to the first page
- Ready to start from the beginning

## Technical Implementation

### 1. Track Current Playing Measure

```typescript
// In MusicPlayer component
const [currentMeasure, setCurrentMeasure] = useState(0)

// Update during playback
sequenceRef.current = new Tone.Part((time, note) => {
  audioManager.playNoteAt(note.note, time, '16n', 0.7)

  Tone.Draw.schedule(() => {
    const measureNum = Math.floor(note.originalTime)
    setCurrentMeasure(measureNum)
    onMeasureChange?.(measureNum) // Callback to parent
  }, time)
}, notesToSchedule)
```

### 2. Pass Current Measure to SheetMusicDisplay

```typescript
<SheetMusicDisplay
  sheetMusic={currentPiece}
  currentPlayingMeasure={currentMeasure}
  onPageChange={setCurrentPage}
/>
```

### 3. Auto-flip Logic (Already Implemented)

```typescript
// In SheetMusicDisplay
useEffect(() => {
  if (currentPlayingMeasure !== undefined && !isMobilePortrait) {
    const { measuresPerPage: responsiveMeasuresPerPage } = getNotationDimensions()
    const effectiveMeasuresPerPage = responsiveMeasuresPerPage || measuresPerPage
    const targetPage = Math.floor(currentPlayingMeasure / effectiveMeasuresPerPage)

    if (targetPage !== currentPage && targetPage < totalPages) {
      setCurrentPage(targetPage)
      onPageChange?.(targetPage)
    }
  }
}, [currentPlayingMeasure, ...])
```

## Edge Cases to Handle

### 1. User Manual Navigation During Playback

- If user manually changes page during playback
- Should playback jump to that page's measures?
- Or should it continue and auto-flip back when needed?
- **Recommendation**: Continue playback, auto-flip when measure requires it

### 2. Loop Mode

- When piece loops back to beginning
- Should smoothly transition back to page 1
- Consider a brief pause before looping

### 3. Variable Tempo

- Page flips should remain smooth even at high tempos
- May need to anticipate page turns slightly early

### 4. Mobile Portrait Mode

- Auto-scroll to keep current measure visible
- Smooth scrolling, not jumpy
- Center the playing measure when possible

## Implementation Priority

1. **Phase 1**: Basic auto-flip

   - Track current measure in MusicPlayer
   - Pass to SheetMusicDisplay
   - Auto-advance pages

2. **Phase 2**: Enhanced UX

   - Anticipate page turns (flip slightly early)
   - Visual indicator of current playing measure
   - Smooth scroll for mobile portrait

3. **Phase 3**: Advanced Features
   - "Follow mode" toggle
   - Adjustable look-ahead timing
   - Practice mode with measure repeat

## Visual Indicators (Future)

### Current Measure Highlight

- Subtle background highlight
- Moving cursor/line
- Pulsing note heads

### Upcoming Page Turn Warning

- Brief flash at page edge
- Countdown dots
- Fade effect starts early

## Testing Considerations

1. Test with various tempos (30-180 BPM)
2. Test with different page sizes (2, 4, 8 measures)
3. Test interruption scenarios (pause, manual navigation)
4. Test on all device sizes
5. Performance testing (no lag or stutter)

## Dependencies

- Requires MusicPlayer to track current measure
- Requires SheetMusicDisplay to accept currentPlayingMeasure prop
- May need optimization for smooth transitions

## Future Enhancements

1. **Practice Mode**

   - Option to repeat current page
   - Slow down difficult passages
   - Loop specific measures

2. **Performance Mode**

   - Look-ahead page preparation
   - Dual-page view on tablets
   - Pedal/gesture control for manual override

3. **Accessibility**
   - Screen reader announcements for page turns
   - Keyboard shortcuts to toggle follow mode
   - High contrast mode for current measure
