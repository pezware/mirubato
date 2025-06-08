#!/usr/bin/env node

/**
 * Convert JSON sheet music data to TypeScript format
 * This script reads the JSON files from MusicXML conversions and generates
 * complete TypeScript files with all measures included.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Map JSON duration values to TypeScript NoteDuration enum values
const durationMap = {
  w: 'NoteDuration.WHOLE',
  h: 'NoteDuration.HALF',
  q: 'NoteDuration.QUARTER',
  8: 'NoteDuration.EIGHTH',
  16: 'NoteDuration.SIXTEENTH',
  32: 'NoteDuration.THIRTY_SECOND',
}

// Map key signatures
const keySignatureMap = {
  'C Major': 'KeySignature.C_MAJOR',
  'G Major': 'KeySignature.G_MAJOR',
  G_MAJOR: 'KeySignature.G_MAJOR',
  'E Minor': 'KeySignature.E_MINOR',
  'E minor': 'KeySignature.E_MINOR',
}

// Map time signatures
const timeSignatureMap = {
  '4/4': 'TimeSignature.FOUR_FOUR',
  '3/4': 'TimeSignature.THREE_FOUR',
  '2/4': 'TimeSignature.TWO_FOUR',
  '6/8': 'TimeSignature.SIX_EIGHT',
}

function convertNote(note) {
  const parts = []

  // Keys
  if (note.keys && note.keys.length > 0) {
    const keysStr = note.keys.map(k => `'${k}'`).join(', ')
    parts.push(`keys: [${keysStr}]`)
  } else {
    parts.push(`keys: []`)
    if (!note.rest) parts.push(`rest: true`)
  }

  // Duration
  const duration = durationMap[note.duration] || `'${note.duration}'`
  parts.push(`duration: ${duration}`)

  // Time
  parts.push(`time: ${note.time}`)

  // Optional properties
  if (note.stem) parts.push(`stem: '${note.stem}'`)
  if (note.dots) parts.push(`dots: ${note.dots}`)
  if (note.rest) parts.push(`rest: true`)
  if (note.accidental) parts.push(`accidental: '${note.accidental}'`)
  if (note.clef) parts.push(`clef: Clef.${note.clef.toUpperCase()}`)

  return `{ ${parts.join(', ')} }`
}

function convertMeasure(measure, index) {
  const parts = [`number: ${measure.number}`]

  // Convert notes
  const notesStr = measure.notes
    .map(note => convertNote(note))
    .join(',\n        ')
  parts.push(`notes: [\n        ${notesStr}\n      ]`)

  // Optional properties - only add if different from defaults
  if (measure.keySignature && index === 0) {
    const keySig =
      keySignatureMap[measure.keySignature] || `'${measure.keySignature}'`
    parts.push(`keySignature: ${keySig}`)
  }

  if (measure.timeSignature && index === 0) {
    const timeSig =
      timeSignatureMap[measure.timeSignature] || `'${measure.timeSignature}'`
    parts.push(`timeSignature: ${timeSig}`)
  }

  if (measure.clef && index === 0) {
    parts.push(`clef: Clef.${measure.clef.toUpperCase()}`)
  }

  if (measure.tempo && index === 0) {
    parts.push(`tempo: ${measure.tempo}`)
  }

  return `{\n      ${parts.join(',\n      ')}\n    }`
}

function generateTypeScriptFile(jsonData, outputPath, pieceInfo) {
  const measures = jsonData.measures
    .map((m, i) => convertMeasure(m, i))
    .join(',\n    ')

  const template = `/**
 * ${pieceInfo.title}
 * ${pieceInfo.composer}
 * 
 * Complete transcription with all ${jsonData.measures.length} measures.
 * ${pieceInfo.description}
 */

import type { SheetMusic } from '../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../modules/sheetMusic/types'

export const ${pieceInfo.variableName}: SheetMusic = {
  id: '${jsonData.id}',
  title: '${jsonData.title}',
  composer: '${pieceInfo.composer}',
  opus: ${jsonData.opus ? `'${jsonData.opus}'` : 'undefined'},
  movement: ${jsonData.movement ? `'${jsonData.movement}'` : 'undefined'},
  instrument: '${jsonData.instrument}',
  difficulty: '${jsonData.difficulty}',
  difficultyLevel: ${jsonData.difficultyLevel},
  gradeLevel: '${pieceInfo.gradeLevel}',
  durationSeconds: ${jsonData.durationSeconds},
  timeSignature: '${jsonData.timeSignature}',
  keySignature: '${jsonData.keySignature}',
  tempoMarking: '${pieceInfo.tempoMarking}',
  suggestedTempo: ${jsonData.suggestedTempo},
  stylePeriod: '${pieceInfo.stylePeriod || jsonData.stylePeriod}',
  tags: ${JSON.stringify(
    [...new Set(['curated', 'educational', ...jsonData.tags])],
    null,
    2
  )
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n')},
  measures: [
    ${measures}
  ],
  metadata: {
    source: 'MusicXML Conversion',
    license: 'Public Domain',
    year: ${pieceInfo.year},
    musicalForm: '${pieceInfo.musicalForm}',
    technicalFocus: ${pieceInfo.technicalFocus},
    arrangedBy: 'Original',
    note: 'Complete ${jsonData.measures.length}-measure transcription from MusicXML conversion.',
  },
}`

  fs.writeFileSync(outputPath, template)
  console.log(
    `Generated ${outputPath} with ${jsonData.measures.length} measures`
  )
}

// Process files
const conversions = [
  {
    input: 'bach-minuet-in-g-major-bwv-anh-114.json',
    output: '../../frontend/src/data/sheetMusic/bachMinuetInG.ts',
    info: {
      variableName: 'bachMinuetInG',
      title: 'Bach - Minuet in G Major, BWV Anh. 114',
      composer: 'Johann Sebastian Bach (attr.)',
      description: 'Classic pedagogical piece, perfect for beginners.',
      gradeLevel: 'RCM 1',
      tempoMarking: 'Moderato',
      year: 1725,
      musicalForm: 'minuet',
      technicalFocus: '[TechnicalElement.SCALES, TechnicalElement.ARPEGGIOS]',
      stylePeriod: 'BAROQUE',
    },
  },
  {
    input: 'mozart-piano-sonata-no-16-allegro.json',
    output: '../../frontend/src/data/sheetMusic/mozartSonataK545.ts',
    info: {
      variableName: 'mozartSonataK545',
      title: 'Mozart - Piano Sonata No. 16 in C Major, K.545',
      composer: 'Wolfgang Amadeus Mozart',
      description:
        "First movement (Allegro) of Mozart's famous teaching sonata.",
      gradeLevel: 'RCM 8',
      tempoMarking: 'Allegro',
      year: 1788,
      musicalForm: 'sonata-allegro',
      technicalFocus:
        '[TechnicalElement.SCALES, TechnicalElement.ARPEGGIOS, TechnicalElement.ALBERTI_BASS]',
    },
  },
  {
    input: 'prlude-opus-28-no-4-in-e-minor-chopin.json',
    output: '../../frontend/src/data/sheetMusic/chopinPreludeOp28No4.ts',
    info: {
      variableName: 'chopinPreludeOp28No4',
      title: 'Chopin - Prelude Op.28 No.4 in E minor',
      composer: 'Frédéric Chopin',
      description:
        "One of Chopin's most famous preludes, known for its melancholic character.",
      gradeLevel: 'RCM 9',
      tempoMarking: 'Largo',
      year: 1839,
      musicalForm: 'prelude',
      technicalFocus: '[TechnicalElement.CHORDS]',
    },
  },
]

conversions.forEach(({ input, output, info }) => {
  const inputPath = path.join(__dirname, 'musicxml-converter', input)
  const outputPath = path.join(__dirname, output)

  try {
    const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
    generateTypeScriptFile(jsonData, outputPath, info)
  } catch (error) {
    console.error(`Error processing ${input}:`, error.message)
  }
})

console.log(
  '\nConversion complete! All pieces now include their full measure data.'
)
