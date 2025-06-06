import {
  ExerciseParameters,
  SightReadingExerciseParameters,
  noteToMidi,
} from '../../modules/sheetMusic/types'
import { TechnicalExerciseParameters } from '../../modules/sheetMusic/generators/TechnicalExerciseGenerator'

export interface ValidationErrors {
  [key: string]: string
}

/**
 * Validates a note string format (e.g., "C4", "F#5", "Bb3")
 */
export function isValidNote(note: string): boolean {
  const noteRegex = /^[A-G][#b]?[0-9]$/
  return noteRegex.test(note)
}

/**
 * Validates that the note range is logical (lowest < highest)
 */
export function isValidNoteRange(lowest: string, highest: string): boolean {
  if (!isValidNote(lowest) || !isValidNote(highest)) {
    return false
  }

  try {
    const lowestMidi = noteToMidi(lowest)
    const highestMidi = noteToMidi(highest)
    return lowestMidi < highestMidi
  } catch {
    return false
  }
}

/**
 * Validates basic exercise parameters
 */
export function validateExerciseParameters(
  params: ExerciseParameters
): ValidationErrors {
  const errors: ValidationErrors = {}

  // Difficulty validation
  if (params.difficulty < 1 || params.difficulty > 10) {
    errors.difficulty = 'Difficulty must be between 1 and 10'
  }

  // Measures validation
  if (params.measures < 1 || params.measures > 32) {
    errors.measures = 'Measures must be between 1 and 32'
  }

  // Tempo validation
  if (params.tempo < 40 || params.tempo > 300) {
    errors.tempo = 'Tempo must be between 40 and 300 BPM'
  }

  // Note range validation
  if (!isValidNote(params.range.lowest)) {
    errors.rangeLowest = 'Invalid note format (e.g., C4)'
  }

  if (!isValidNote(params.range.highest)) {
    errors.rangeHighest = 'Invalid note format (e.g., C6)'
  }

  // Range logic validation
  if (isValidNote(params.range.lowest) && isValidNote(params.range.highest)) {
    if (!isValidNoteRange(params.range.lowest, params.range.highest)) {
      errors.rangeLogical = 'Highest note must be higher than lowest note'
    }

    // Check if range is too narrow (less than an octave might be limiting)
    try {
      const lowestMidi = noteToMidi(params.range.lowest)
      const highestMidi = noteToMidi(params.range.highest)
      const rangeSize = highestMidi - lowestMidi

      if (rangeSize < 5) {
        errors.rangeSize =
          'Note range should be at least 5 semitones for meaningful exercises'
      }

      if (rangeSize > 36) {
        errors.rangeSize =
          'Note range should not exceed 3 octaves for practical exercises'
      }
    } catch {
      // Already handled by individual note validation
    }
  }

  return errors
}

/**
 * Validates sight-reading specific parameters
 */
export function validateSightReadingParameters(
  params: SightReadingExerciseParameters
): ValidationErrors {
  const errors = validateExerciseParameters(params)

  // Phrase length should not exceed total measures
  if (params.phraseLength > params.measures) {
    errors.phraseLength = 'Phrase length cannot exceed total measures'
  }

  // For very short exercises, ensure phrase length makes sense
  if (params.measures < 4 && params.phraseLength > params.measures) {
    errors.phraseLength =
      'Phrase length should be compatible with exercise length'
  }

  return errors
}

/**
 * Validates technical exercise specific parameters
 */
export function validateTechnicalParameters(
  params: TechnicalExerciseParameters
): ValidationErrors {
  const errors = validateExerciseParameters(params)

  // Octaves validation
  if (
    params.octaves !== undefined &&
    (params.octaves < 1 || params.octaves > 4)
  ) {
    errors.octaves = 'Octaves must be between 1 and 4'
  }

  // Hanon pattern validation
  if (params.technicalType === 'hanon' && params.hanonPattern) {
    if (params.hanonPattern.length === 0) {
      errors.hanonPattern = 'Hanon pattern cannot be empty'
    }

    const invalidValues = params.hanonPattern.filter(
      (val: number) => val < 1 || val > 7
    )
    if (invalidValues.length > 0) {
      errors.hanonPattern =
        'Hanon pattern values must be between 1 and 7 (scale degrees)'
    }
  }

  // Check if scale type is provided for scale exercises
  if (params.technicalType === 'scale' && !params.scaleType) {
    errors.scaleType = 'Scale type is required for scale exercises'
  }

  // Check if arpeggio type is provided for arpeggio exercises
  if (params.technicalType === 'arpeggio' && !params.arpeggioType) {
    errors.arpeggioType = 'Arpeggio type is required for arpeggio exercises'
  }

  return errors
}

/**
 * Validates instrument parameters
 */
export function validateInstrumentParameters(
  params: ExerciseParameters
): ValidationErrors {
  const errors: ValidationErrors = {}

  if (params.instrumentParams) {
    const { instrument, piano, guitar } = params.instrumentParams

    // Guitar position validation
    if (instrument === 'guitar' && guitar?.position !== undefined) {
      if (guitar.position < 1 || guitar.position > 12) {
        errors.guitarPosition = 'Guitar position must be between 1 and 12'
      }
    }

    // Guitar strings validation
    if (instrument === 'guitar' && guitar?.strings) {
      const invalidStrings = guitar.strings.filter(str => str < 1 || str > 6)
      if (invalidStrings.length > 0) {
        errors.guitarStrings = 'Guitar strings must be between 1 and 6'
      }
    }

    // Piano finger patterns validation
    if (instrument === 'piano' && piano?.fingerPatterns) {
      const invalidPatterns = piano.fingerPatterns.filter(
        pattern => !/^[1-5]+$/.test(pattern)
      )
      if (invalidPatterns.length > 0) {
        errors.pianoFingerPatterns =
          'Piano finger patterns must contain only digits 1-5'
      }
    }
  }

  return errors
}

/**
 * Comprehensive validation function that checks all parameter types
 */
export function validateAllParameters(
  params:
    | ExerciseParameters
    | SightReadingExerciseParameters
    | TechnicalExerciseParameters
): ValidationErrors {
  let errors: ValidationErrors = {}

  // Check if it's a sight-reading exercise
  if ('includeAccidentals' in params) {
    errors = {
      ...errors,
      ...validateSightReadingParameters(
        params as SightReadingExerciseParameters
      ),
    }
  }
  // Check if it's a technical exercise
  else if ('technicalType' in params) {
    errors = {
      ...errors,
      ...validateTechnicalParameters(params as TechnicalExerciseParameters),
    }
  }
  // Default to basic exercise parameters
  else {
    errors = { ...errors, ...validateExerciseParameters(params) }
  }

  // Add instrument-specific validation
  const instrumentErrors = validateInstrumentParameters(params)
  errors = { ...errors, ...instrumentErrors }

  return errors
}

/**
 * Utility function to check if there are any validation errors
 */
export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Utility function to get the first error message
 */
export function getFirstError(errors: ValidationErrors): string | null {
  const errorKeys = Object.keys(errors)
  return errorKeys.length > 0 ? errors[errorKeys[0]] : null
}

/**
 * Utility function to format validation errors for display
 */
export function formatValidationErrors(errors: ValidationErrors): string[] {
  return Object.values(errors).filter(Boolean)
}
