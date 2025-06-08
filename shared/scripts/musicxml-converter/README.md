# MusicXML to SheetMusic Converter

This tool converts MusicXML files (.xml and .mxl) to the Rubato SheetMusic format.

## Setup

```bash
cd shared/scripts/musicxml-converter
npm install
npm run build
```

## Usage

Convert a MusicXML file:

```bash
# Convert and generate default output files
npm run convert -- <input-file>

# Convert with custom output filename
npm run convert -- <input-file> <output-file>
```

Examples:

```bash
# Convert Bach Minuet
npm run convert -- ./Bach_Minuet_in_G_Major_BWV_Anh._114.mxl

# Convert with custom output
npm run convert -- ./Bach_Minuet_in_G_Major_BWV_Anh._114.mxl ./bach-minuet-converted.ts
```

## Output

The converter generates two files:

1. **TypeScript file** (.ts) - Contains the SheetMusic object ready for use
2. **JSON file** (.json) - Raw JSON data for inspection

## Supported Features

- ✅ Basic note conversion (pitch, duration, time)
- ✅ Key signatures (major/minor)
- ✅ Time signatures (common meters)
- ✅ Clefs (treble, bass, alto, tenor)
- ✅ Measure organization
- ✅ Tempo markings
- ✅ Rest notes
- ✅ Dotted notes
- ✅ Stem directions
- ✅ Compressed (.mxl) and uncompressed (.xml) formats

## Current Limitations

- Single-part music only (first part is used)
- Basic metadata extraction
- Simple difficulty estimation
- No chord symbols or lyrics
- No advanced notations (slurs, dynamics, etc.)

## Available Test Files

From the musetrainer-library repository:

1. `Bach_Minuet_in_G_Major_BWV_Anh._114.mxl` - ✅ Tested
2. `Mozart_-_Piano_Sonata_No._16_-_Allegro.mxl` - ✅ Tested
3. `Prlude_Opus_28_No._4_in_E_Minor__Chopin.mxl` - In progress

## Integration with Frontend

After conversion, copy the generated data into your frontend project:

1. Copy the variable content from the .ts file
2. Add proper imports for SheetMusic types
3. Add to your curated pieces collection

Example integration:

```typescript
import type { SheetMusic } from '../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
} from '../../modules/sheetMusic/types'

// Paste converted data here with proper enum references
export const bachMinuetConverted: SheetMusic = {
  // ... converted data
}
```

## Future Improvements

- Multi-part support
- Better metadata extraction from MusicXML
- Chord and harmony support
- Dynamic markings
- Articulations and slurs
- Lyrics support
- Better instrument detection
- Validation and error recovery
