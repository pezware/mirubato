# Font Usage Documentation

## Typography System

Mirubato uses a carefully selected typography system with three primary font families:

1. **Noto Serif** - Used for musical content (titles, composers)
   - Excellent multilingual support including CJK characters
   - Provides academic/classical aesthetic appropriate for music education

2. **Inter** - Used for UI elements, metadata, and body text
   - Clean, modern sans-serif for interface elements
   - Excellent readability at small sizes

3. **Lexend** - Used for headers and section titles
   - Designed specifically for reading proficiency

## Intentional Monospace Font Usage

The `font-mono` class is intentionally used in specific components for technical display purposes:

### 1. Timer Display (TimerEntry.tsx)

- **Location**: Line 95
- **Purpose**: Display timer in fixed-width format (00:00:00)
- **Rationale**: Ensures digits don't shift position as timer counts, providing better visual stability

### 2. Metronome BPM Display (ScoreControls.tsx)

- **Location**: Lines 344, 636
- **Purpose**: Display tempo/BPM values
- **Rationale**: Prevents layout shift when tempo values change (e.g., 60 → 120 BPM)

### 3. IPA Pronunciation (DictionaryTerm.tsx)

- **Location**: Line 237
- **Purpose**: Display International Phonetic Alphabet notation
- **Rationale**: Standard practice for phonetic transcription, ensures proper alignment of phonetic symbols

## Implementation Status

✅ All musical content (score titles, composers) correctly use Noto Serif
✅ All UI elements use Inter as specified
✅ Monospace usage is limited to technical displays where fixed-width is beneficial
✅ No instances of default Vite styling or inappropriate font usage found
