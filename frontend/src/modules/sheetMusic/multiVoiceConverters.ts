/**
 * Multi-Voice Conversion Utilities
 *
 * Provides functions to convert between the old single-voice format
 * and the new multi-voice format, enabling gradual migration.
 */

import {
  SheetMusic,
  Measure,
  Note,
  Clef,
  TimeSignature,
  KeySignature,
} from './types'
import {
  Score,
  MultiVoiceMeasure,
  MultiVoiceNote,
  Voice,
  Staff,
  Part,
  ScoreMetadata,
} from './multiVoiceTypes'

/**
 * Converts old single-voice SheetMusic to new multi-voice Score format
 */
export function sheetMusicToScore(sheetMusic: SheetMusic): Score {
  // Determine staff configuration based on clef
  const isGrandStaff = sheetMusic.measures.some(
    m => m.clef === Clef.GRAND_STAFF
  )

  // Create part
  const part: Part = {
    id: 'main',
    name: sheetMusic.instrument,
    instrument: sheetMusic.instrument.toLowerCase(),
    staves: isGrandStaff ? ['treble', 'bass'] : ['main'],
  }

  // Convert measures
  const measures: MultiVoiceMeasure[] = sheetMusic.measures.map(measure => {
    if (isGrandStaff) {
      return convertMeasureToGrandStaff(measure, sheetMusic)
    } else {
      return convertMeasureToSingleStaff(measure, sheetMusic)
    }
  })

  // Create metadata
  const metadata: ScoreMetadata = {
    createdAt: new Date(),
    modifiedAt: new Date(),
    source: 'Legacy format conversion',
    tags: sheetMusic.tags || [],
    difficulty: sheetMusic.difficultyLevel,
    duration: sheetMusic.durationSeconds,
  }

  return {
    title: sheetMusic.title,
    composer: sheetMusic.composer,
    parts: [part],
    measures,
    metadata,
  }
}

/**
 * Converts a single-staff measure to multi-voice format
 */
function convertMeasureToSingleStaff(
  measure: Measure,
  sheetMusic: SheetMusic
): MultiVoiceMeasure {
  const clef = measure.clef || Clef.TREBLE

  // Convert notes to multi-voice format
  const notes: MultiVoiceNote[] = measure.notes.map(note => ({
    ...note,
    voiceId: 'main',
    staffId: 'main',
  }))

  // Create voice
  const voice: Voice = {
    id: 'main',
    name: 'Main Voice',
    notes,
  }

  // Create staff
  const staff: Staff = {
    id: 'main',
    clef,
    voices: [voice],
  }

  return {
    number: measure.number,
    staves: [staff],
    timeSignature: (measure.timeSignature || sheetMusic.timeSignature) as
      | TimeSignature
      | undefined,
    keySignature: (measure.keySignature || sheetMusic.keySignature) as
      | KeySignature
      | undefined,
    tempo: measure.tempo,
    dynamics: measure.dynamics,
    rehearsalMark: measure.rehearsalMark,
    barLine: measure.barLine,
    repeatCount: measure.repeatCount,
  }
}

/**
 * Converts a measure to grand staff format by analyzing note ranges
 */
function convertMeasureToGrandStaff(
  measure: Measure,
  sheetMusic: SheetMusic
): MultiVoiceMeasure {
  // Separate notes by pitch (middle C = C4)
  const trebleNotes: MultiVoiceNote[] = []
  const bassNotes: MultiVoiceNote[] = []

  for (const note of measure.notes) {
    if (note.rest) {
      // Place rests in treble staff by default
      trebleNotes.push({
        ...note,
        voiceId: 'rightHand',
        staffId: 'treble',
      })
    } else {
      // Analyze pitch to determine staff
      const pitch = note.keys[0]
      const octave = parseInt(pitch.slice(-1))
      const isHighPitch = octave >= 4

      const multiVoiceNote: MultiVoiceNote = {
        ...note,
        voiceId: isHighPitch ? 'rightHand' : 'leftHand',
        staffId: isHighPitch ? 'treble' : 'bass',
      }

      if (isHighPitch) {
        trebleNotes.push(multiVoiceNote)
      } else {
        bassNotes.push(multiVoiceNote)
      }
    }
  }

  // Create voices
  const rightHandVoice: Voice = {
    id: 'rightHand',
    name: 'Right Hand',
    notes: trebleNotes,
    stemDirection: 'auto',
  }

  const leftHandVoice: Voice = {
    id: 'leftHand',
    name: 'Left Hand',
    notes: bassNotes,
    stemDirection: 'auto',
  }

  // Create staves
  const trebleStaff: Staff = {
    id: 'treble',
    clef: Clef.TREBLE,
    voices: trebleNotes.length > 0 ? [rightHandVoice] : [],
  }

  const bassStaff: Staff = {
    id: 'bass',
    clef: Clef.BASS,
    voices: bassNotes.length > 0 ? [leftHandVoice] : [],
  }

  return {
    number: measure.number,
    staves: [trebleStaff, bassStaff],
    timeSignature: (measure.timeSignature || sheetMusic.timeSignature) as
      | TimeSignature
      | undefined,
    keySignature: (measure.keySignature || sheetMusic.keySignature) as
      | KeySignature
      | undefined,
    tempo: measure.tempo,
    dynamics: measure.dynamics,
    rehearsalMark: measure.rehearsalMark,
    barLine: measure.barLine,
    repeatCount: measure.repeatCount,
  }
}

/**
 * Converts new multi-voice Score back to old single-voice SheetMusic format
 * Note: This is a lossy conversion as multiple voices will be flattened
 */
export function scoreToSheetMusic(score: Score): SheetMusic {
  // Flatten all notes from all voices into single array per measure
  const measures: Measure[] = score.measures.map(multiVoiceMeasure => {
    const allNotes: Note[] = []

    // Collect notes from all voices in all staves
    for (const staff of multiVoiceMeasure.staves) {
      for (const voice of staff.voices) {
        for (const multiVoiceNote of voice.notes) {
          // Convert back to simple note format
          const note: Note = {
            keys: multiVoiceNote.keys,
            duration: multiVoiceNote.duration,
            time: multiVoiceNote.time,
            accidental: multiVoiceNote.accidental,
            dots: multiVoiceNote.dots,
            stem: multiVoiceNote.stem,
            beam: multiVoiceNote.beam,
            articulation: multiVoiceNote.articulation,
            dynamic: multiVoiceNote.dynamic,
            fingering: multiVoiceNote.fingering,
            rest: multiVoiceNote.rest,
            tie: multiVoiceNote.tie,
          }
          allNotes.push(note)
        }
      }
    }

    // Sort notes by time position
    allNotes.sort((a, b) => a.time - b.time)

    // Determine clef based on staves
    let clef = Clef.TREBLE
    if (
      multiVoiceMeasure.staves.length === 2 &&
      multiVoiceMeasure.staves[0].clef === Clef.TREBLE &&
      multiVoiceMeasure.staves[1].clef === Clef.BASS
    ) {
      clef = Clef.GRAND_STAFF
    } else if (multiVoiceMeasure.staves[0]) {
      clef = multiVoiceMeasure.staves[0].clef
    }

    return {
      number: multiVoiceMeasure.number,
      notes: allNotes,
      timeSignature: multiVoiceMeasure.timeSignature,
      keySignature: multiVoiceMeasure.keySignature,
      clef,
      tempo: multiVoiceMeasure.tempo,
      dynamics: multiVoiceMeasure.dynamics,
      rehearsalMark: multiVoiceMeasure.rehearsalMark,
      barLine: multiVoiceMeasure.barLine as
        | 'single'
        | 'double'
        | 'end'
        | 'repeat-start'
        | 'repeat-end'
        | undefined,
      repeatCount: multiVoiceMeasure.repeatCount,
    }
  })

  // Extract basic info from first part
  const mainPart = score.parts[0]
  const instrument =
    mainPart?.instrument?.toUpperCase() === 'PIANO' ? 'PIANO' : 'GUITAR'

  return {
    id: `converted-${Date.now()}`,
    title: score.title,
    composer: score.composer,
    instrument: instrument as 'PIANO' | 'GUITAR',
    difficulty: 'INTERMEDIATE', // Default
    difficultyLevel: score.metadata.difficulty || 5,
    durationSeconds: score.metadata.duration || 60,
    timeSignature: measures[0]?.timeSignature || '4/4',
    keySignature: measures[0]?.keySignature || 'C major',
    suggestedTempo: measures[0]?.tempo || 120,
    stylePeriod: 'CLASSICAL', // Default
    tags: score.metadata.tags,
    measures,
  }
}

/**
 * Extracts a single voice from a Score
 * Useful for practice mode where user wants to focus on one voice
 */
export function extractVoiceFromScore(score: Score, voiceId: string): Score {
  const extractedMeasures: MultiVoiceMeasure[] = score.measures.map(measure => {
    const extractedStaves: Staff[] = []

    for (const staff of measure.staves) {
      const matchingVoices = staff.voices.filter(v => v.id === voiceId)
      if (matchingVoices.length > 0) {
        extractedStaves.push({
          ...staff,
          voices: matchingVoices,
        })
      }
    }

    return {
      ...measure,
      staves: extractedStaves,
    }
  })

  return {
    ...score,
    title: `${score.title} - ${voiceId}`,
    measures: extractedMeasures,
    metadata: {
      ...score.metadata,
      source: `Extracted voice: ${voiceId}`,
    },
  }
}

/**
 * Merges multiple Scores into one
 * Useful for combining parts into an ensemble score
 */
export function mergeScores(scores: Score[], title?: string): Score {
  if (scores.length === 0) {
    throw new Error('Cannot merge empty array of scores')
  }

  if (scores.length === 1) {
    return scores[0]
  }

  // Collect all parts
  const allParts: Part[] = []
  let partIdCounter = 0

  for (const score of scores) {
    for (const part of score.parts) {
      allParts.push({
        ...part,
        id: `part${partIdCounter++}`,
      })
    }
  }

  // Merge measures - assumes all scores have same number of measures
  const measureCount = Math.max(...scores.map(s => s.measures.length))
  const mergedMeasures: MultiVoiceMeasure[] = []

  for (let i = 0; i < measureCount; i++) {
    const stavesForMeasure: Staff[] = []
    let measureNumber = i + 1
    let timeSignature: string | undefined
    let keySignature: string | undefined
    let tempo: number | undefined

    for (const score of scores) {
      if (score.measures[i]) {
        const measure = score.measures[i]
        measureNumber = measure.number
        timeSignature = timeSignature || measure.timeSignature
        keySignature = keySignature || measure.keySignature
        tempo = tempo || measure.tempo

        // Add all staves from this measure
        stavesForMeasure.push(...measure.staves)
      }
    }

    mergedMeasures.push({
      number: measureNumber,
      staves: stavesForMeasure,
      timeSignature: timeSignature as TimeSignature | undefined,
      keySignature: keySignature as KeySignature | undefined,
      tempo,
    })
  }

  return {
    title: title || scores.map(s => s.title).join(' + '),
    composer: scores[0].composer,
    parts: allParts,
    measures: mergedMeasures,
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      source: 'Merged scores',
      tags: ['merged', 'ensemble'],
    },
  }
}
