/**
 * Multi-Voice Type Validation Utilities
 *
 * Provides validation functions for the new multi-voice data structures
 * to ensure data integrity and catch errors early.
 */

import {
  Voice,
  MultiVoiceNote,
  Staff,
  Part,
  MultiVoiceMeasure,
  Score,
} from './multiVoiceTypes'
import { TimeSignature, Clef } from './types'

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Creates a validation result
 */
function createValidationResult(): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
  }
}

/**
 * Validates a MultiVoiceNote
 */
export function validateMultiVoiceNote(note: MultiVoiceNote): ValidationResult {
  const result = createValidationResult()

  // Check required fields
  if (!note.keys || !Array.isArray(note.keys) || note.keys.length === 0) {
    result.valid = false
    result.errors.push('Note must have at least one key')
  }

  if (!note.duration) {
    result.valid = false
    result.errors.push('Note must have a duration')
  }

  if (typeof note.time !== 'number' || note.time < 0) {
    result.valid = false
    result.errors.push('Note must have a valid time position')
  }

  if (!note.voiceId) {
    result.valid = false
    result.errors.push('Note must have a voiceId')
  }

  // Validate keys format
  if (note.keys) {
    const keyPattern = /^[a-g][#b]?\/[0-9]$/i
    for (const key of note.keys) {
      if (!keyPattern.test(key)) {
        result.valid = false
        result.errors.push(`Invalid key format: ${key}`)
      }
    }
  }

  // Check stem direction
  if (note.stem && !['up', 'down', 'auto'].includes(note.stem)) {
    result.valid = false
    result.errors.push('Invalid stem direction')
  }

  // Check tie
  if (note.tie && !['start', 'stop', 'continue'].includes(note.tie)) {
    result.valid = false
    result.errors.push('Invalid tie type')
  }

  return result
}

/**
 * Validates a Voice
 */
export function validateVoice(voice: Voice): ValidationResult {
  const result = createValidationResult()

  if (!voice.id) {
    result.valid = false
    result.errors.push('Voice must have an id')
  }

  if (!voice.notes || !Array.isArray(voice.notes)) {
    result.valid = false
    result.errors.push('Voice must have a notes array')
  }

  // Validate stem direction
  if (
    voice.stemDirection &&
    !['up', 'down', 'auto'].includes(voice.stemDirection)
  ) {
    result.valid = false
    result.errors.push('Invalid voice stem direction')
  }

  // Validate each note
  for (let i = 0; i < voice.notes.length; i++) {
    const noteResult = validateMultiVoiceNote(voice.notes[i])
    if (!noteResult.valid) {
      result.valid = false
      result.errors.push(
        `Note ${i} in voice ${voice.id}: ${noteResult.errors.join(', ')}`
      )
    }
    result.warnings.push(...noteResult.warnings)
  }

  // Check timing consistency
  if (voice.notes.length > 1) {
    for (let i = 1; i < voice.notes.length; i++) {
      if (voice.notes[i].time < voice.notes[i - 1].time) {
        result.warnings.push(
          `Notes in voice ${voice.id} may not be in chronological order`
        )
        break
      }
    }
  }

  return result
}

/**
 * Validates a Staff
 */
export function validateStaff(staff: Staff): ValidationResult {
  const result = createValidationResult()

  if (!staff.id) {
    result.valid = false
    result.errors.push('Staff must have an id')
  }

  if (!staff.clef) {
    result.valid = false
    result.errors.push('Staff must have a clef')
  }

  if (!staff.voices || !Array.isArray(staff.voices)) {
    result.valid = false
    result.errors.push('Staff must have a voices array')
  }

  // Validate clef value
  if (staff.clef && !Object.values(Clef).includes(staff.clef)) {
    result.valid = false
    result.errors.push(`Invalid clef: ${staff.clef}`)
  }

  // Validate each voice
  for (const voice of staff.voices) {
    const voiceResult = validateVoice(voice)
    if (!voiceResult.valid) {
      result.valid = false
      result.errors.push(...voiceResult.errors)
    }
    result.warnings.push(...voiceResult.warnings)
  }

  // Check for duplicate voice IDs
  const voiceIds = staff.voices.map(v => v.id)
  const uniqueVoiceIds = new Set(voiceIds)
  if (voiceIds.length !== uniqueVoiceIds.size) {
    result.valid = false
    result.errors.push('Staff contains duplicate voice IDs')
  }

  return result
}

/**
 * Validates a Part
 */
export function validatePart(part: Part): ValidationResult {
  const result = createValidationResult()

  if (!part.id) {
    result.valid = false
    result.errors.push('Part must have an id')
  }

  if (!part.name) {
    result.valid = false
    result.errors.push('Part must have a name')
  }

  if (!part.instrument) {
    result.valid = false
    result.errors.push('Part must have an instrument')
  }

  if (!part.staves || !Array.isArray(part.staves) || part.staves.length === 0) {
    result.valid = false
    result.errors.push('Part must have at least one staff')
  }

  // Validate MIDI values
  if (part.midiProgram !== undefined) {
    if (
      typeof part.midiProgram !== 'number' ||
      part.midiProgram < 0 ||
      part.midiProgram > 127
    ) {
      result.valid = false
      result.errors.push('MIDI program must be between 0 and 127')
    }
  }

  if (part.volume !== undefined) {
    if (
      typeof part.volume !== 'number' ||
      part.volume < 0 ||
      part.volume > 127
    ) {
      result.valid = false
      result.errors.push('Volume must be between 0 and 127')
    }
  }

  if (part.pan !== undefined) {
    if (typeof part.pan !== 'number' || part.pan < -64 || part.pan > 63) {
      result.valid = false
      result.errors.push('Pan must be between -64 and 63')
    }
  }

  return result
}

/**
 * Validates a MultiVoiceMeasure
 */
export function validateMultiVoiceMeasure(
  measure: MultiVoiceMeasure
): ValidationResult {
  const result = createValidationResult()

  if (typeof measure.number !== 'number' || measure.number < 1) {
    result.valid = false
    result.errors.push('Measure must have a positive number')
  }

  if (!measure.staves || !Array.isArray(measure.staves)) {
    result.valid = false
    result.errors.push('Measure must have a staves array')
  }

  // Validate each staff
  for (const staff of measure.staves) {
    const staffResult = validateStaff(staff)
    if (!staffResult.valid) {
      result.valid = false
      result.errors.push(...staffResult.errors)
    }
    result.warnings.push(...staffResult.warnings)
  }

  // Validate time signature format
  if (measure.timeSignature) {
    if (
      !Object.values(TimeSignature).includes(
        measure.timeSignature as TimeSignature
      )
    ) {
      result.warnings.push(
        `Non-standard time signature: ${measure.timeSignature}`
      )
    }
  }

  // Validate tempo
  if (measure.tempo !== undefined) {
    if (
      typeof measure.tempo !== 'number' ||
      measure.tempo < 20 ||
      measure.tempo > 300
    ) {
      result.warnings.push('Tempo should be between 20 and 300 BPM')
    }
  }

  // Validate bar line
  if (measure.barLine) {
    const validBarLines = [
      'single',
      'double',
      'end',
      'repeat-start',
      'repeat-end',
      'repeat-both',
    ]
    if (!validBarLines.includes(measure.barLine)) {
      result.valid = false
      result.errors.push(`Invalid bar line type: ${measure.barLine}`)
    }
  }

  return result
}

/**
 * Validates a complete Score
 */
export function validateScore(score: Score): ValidationResult {
  const result = createValidationResult()

  if (!score.title) {
    result.valid = false
    result.errors.push('Score must have a title')
  }

  if (!score.composer) {
    result.valid = false
    result.errors.push('Score must have a composer')
  }

  if (!score.parts || !Array.isArray(score.parts) || score.parts.length === 0) {
    result.valid = false
    result.errors.push('Score must have at least one part')
  }

  if (
    !score.measures ||
    !Array.isArray(score.measures) ||
    score.measures.length === 0
  ) {
    result.valid = false
    result.errors.push('Score must have at least one measure')
  }

  // Validate each part
  for (const part of score.parts) {
    const partResult = validatePart(part)
    if (!partResult.valid) {
      result.valid = false
      result.errors.push(...partResult.errors)
    }
    result.warnings.push(...partResult.warnings)
  }

  // Validate each measure
  for (const measure of score.measures) {
    const measureResult = validateMultiVoiceMeasure(measure)
    if (!measureResult.valid) {
      result.valid = false
      result.errors.push(...measureResult.errors)
    }
    result.warnings.push(...measureResult.warnings)
  }

  // Check part/staff consistency
  const allStaffIds = new Set<string>()
  for (const measure of score.measures) {
    for (const staff of measure.staves) {
      allStaffIds.add(staff.id)
    }
  }

  for (const part of score.parts) {
    for (const staffId of part.staves) {
      if (!allStaffIds.has(staffId)) {
        result.valid = false
        result.errors.push(
          `Part ${part.id} references non-existent staff ${staffId}`
        )
      }
    }
  }

  // Check measure numbering
  const measureNumbers = score.measures.map(m => m.number)
  const sortedNumbers = [...measureNumbers].sort((a, b) => a - b)
  if (JSON.stringify(measureNumbers) !== JSON.stringify(sortedNumbers)) {
    result.warnings.push('Measures may not be in sequential order')
  }

  return result
}

/**
 * Calculates the total duration of notes in a voice for a given time signature
 */
export function calculateVoiceDuration(
  voice: Voice,
  timeSignature: TimeSignature
): { expected: number; actual: number } {
  const [numBeats, beatValue] = timeSignature.split('/').map(Number)
  const expected = (numBeats / beatValue) * 4 // Convert to quarter note units

  let actual = 0
  for (const note of voice.notes) {
    const durationMap: Record<string, number> = {
      w: 4,
      h: 2,
      q: 1,
      '8': 0.5,
      '16': 0.25,
      '32': 0.125,
    }
    let noteDuration = durationMap[note.duration] || 1

    // Add dots
    if (note.dots) {
      let dotValue = noteDuration / 2
      for (let i = 0; i < note.dots; i++) {
        noteDuration += dotValue
        dotValue /= 2
      }
    }

    actual += noteDuration
  }

  return { expected, actual }
}

/**
 * Validates timing alignment between voices in a measure
 */
export function validateMeasureTiming(
  measure: MultiVoiceMeasure,
  timeSignature: TimeSignature
): ValidationResult {
  const result = createValidationResult()

  for (const staff of measure.staves) {
    for (const voice of staff.voices) {
      const { expected, actual } = calculateVoiceDuration(voice, timeSignature)

      if (Math.abs(expected - actual) > 0.001) {
        result.valid = false
        result.errors.push(
          `Voice ${voice.id} in measure ${measure.number}: ` +
            `Expected ${expected} beats, got ${actual} beats`
        )
      }
    }
  }

  return result
}
