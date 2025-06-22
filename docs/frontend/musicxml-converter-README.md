# MusicXML to Multi-Voice Score Converter

This Node.js script converts MXL (compressed MusicXML) files to TypeScript Score format using the multi-voice data model from the Rubato frontend.

## Features

- Reads MXL (compressed MusicXML) files
- Extracts MusicXML content from ZIP archives
- Handles both score-partwise and score-timewise formats
- Converts to multi-voice Score format with proper TypeScript typing
- Generates both TypeScript (.ts) and JSON (.json) output files
- Supports multiple staves, voices, and complex musical notation

## Setup

```bash
cd shared/scripts/musicxml-converter
npm install
npm run build
```

## Usage

### Convert Specific Files

```bash
npm run convert:mxl
```

This processes the following files from `/Users/arbeitandy/src/others/musetrainer-library/scores/`:

- `Bach_Minuet_in_G_Major_BWV_Anh._114.mxl` - ✅ Converted (32 measures)
- `Mozart_-_Piano_Sonata_No._16_-_Allegro.mxl` - ✅ Converted (73 measures)
- `Prlude_Opus_28_No._4_in_E_Minor__Chopin.mxl` - ✅ Converted (26 measures)

### Output

Generated files are saved to the `output/` directory:

- TypeScript files with proper enum imports and typing
- JSON files with the raw score data
- Both formats are compatible with the Rubato multi-voice architecture

## Output Format

The converter generates TypeScript files that export a `Score` object with:

```typescript
export const bach_minuet_in_g_major_bwv_anh_114: Score = {
  title: "Bach Minuet in G Major",
  composer: "J.S. Bach",
  parts: [...],      // Array of Part objects (instruments)
  measures: [...],   // Array of MultiVoiceMeasure objects
  metadata: {...}    // ScoreMetadata with creation info
}
```

### Data Structure

- **Parts**: Define instruments with their staves and MIDI information
- **Measures**: Contains musical content organized by:
  - **Staves**: Individual staff lines (treble, bass, etc.)
  - **Voices**: Independent musical lines within each staff
  - **Notes**: Individual notes with timing, pitch, and notation data
- **Metadata**: Creation date, source, encoding software, tags

## Supported Features

- ✅ Multi-voice notation (multiple independent voices per staff)
- ✅ Multi-staff notation (treble, bass clefs)
- ✅ Basic note conversion (pitch, duration, time)
- ✅ Key signatures (major/minor)
- ✅ Time signatures (common meters)
- ✅ Clefs (treble, bass, alto, tenor)
- ✅ Measure organization with proper timing
- ✅ Tempo markings
- ✅ Rest notes
- ✅ Dotted notes
- ✅ Stem directions (up/down/auto)
- ✅ Compressed (.mxl) and uncompressed (.xml) formats
- ✅ Proper MXL archive handling (container.xml parsing)
- ✅ Score-partwise and score-timewise format support

## Architecture

The converter uses the same multi-voice data model as the Rubato frontend, ensuring compatibility with:

- `MultiVoiceNotationRenderer`
- `MultiVoiceSheetMusicDisplay`
- Existing VexFlow rendering pipeline

## Dependencies

- `fast-xml-parser`: For parsing MusicXML content
- `yauzl`: For reading MXL (ZIP) archives
- `typescript`: For compilation

## Integration with Frontend

The generated TypeScript files are ready for direct import:

```typescript
import { bach_minuet_in_g_major_bwv_anh_114 } from './path/to/generated/file'
import { MultiVoiceSheetMusicDisplay } from '../components/MultiVoiceSheetMusicDisplay'

// Use with multi-voice display
<MultiVoiceSheetMusicDisplay score={bach_minuet_in_g_major_bwv_anh_114} />
```

## Generated Files

Each conversion produces:

1. **TypeScript file**: Importable Score object with proper typing
2. **JSON file**: Raw data for debugging and analysis

The TypeScript files include all necessary imports and enum references, making them ready for use in the Rubato frontend.

## Current Status

✅ **Successfully converted all three target files:**

- Bach Minuet in G Major (32 measures, 1 part)
- Mozart Piano Sonata No. 16 Allegro (73 measures, 1 part)
- Chopin Prelude Opus 28 No. 4 (26 measures, 1 part)

## Future Improvements

- Better metadata extraction (proper titles, composers)
- Chord and harmony support
- Dynamic markings
- Articulations and slurs
- Lyrics support
- Multi-part ensemble music
- Validation and error recovery
