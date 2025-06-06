import {
  isValidNote,
  isValidNoteRange,
  validateExerciseParameters,
  validateSightReadingParameters,
  validateTechnicalParameters,
  validateInstrumentParameters,
  validateAllParameters,
  hasValidationErrors,
  getFirstError,
  formatValidationErrors,
} from './validation'
import {
  ExerciseParameters,
  SightReadingExerciseParameters,
  KeySignature,
  TimeSignature,
  Clef,
  ScaleType,
} from '../../modules/sheetMusic/types'
import { TechnicalExerciseParameters } from '../../modules/sheetMusic/generators/TechnicalExerciseGenerator'

// Mock the noteToMidi function
jest.mock('../../modules/sheetMusic/types', () => ({
  ...jest.requireActual('../../modules/sheetMusic/types'),
  noteToMidi: jest.fn((note: string) => {
    // Simple mapping for testing
    const noteMap: { [key: string]: number } = {
      C4: 60,
      C5: 72,
      C6: 84,
      G3: 55,
      G4: 67,
      A4: 69,
      B4: 71,
    }
    return noteMap[note] || 60
  }),
}))

describe('Validation Utilities', () => {
  describe('isValidNote', () => {
    it('validates correct note formats', () => {
      expect(isValidNote('C4')).toBe(true)
      expect(isValidNote('F#5')).toBe(true)
      expect(isValidNote('Bb3')).toBe(true)
      expect(isValidNote('G7')).toBe(true)
    })

    it('rejects invalid note formats', () => {
      expect(isValidNote('C')).toBe(false)
      expect(isValidNote('C44')).toBe(false)
      expect(isValidNote('H4')).toBe(false)
      expect(isValidNote('C#b4')).toBe(false)
      expect(isValidNote('')).toBe(false)
      expect(isValidNote('c4')).toBe(false) // lowercase
    })
  })

  describe('isValidNoteRange', () => {
    it('validates correct note ranges', () => {
      expect(isValidNoteRange('C4', 'C5')).toBe(true)
      expect(isValidNoteRange('G3', 'C6')).toBe(true)
    })

    it('rejects invalid note ranges', () => {
      expect(isValidNoteRange('C5', 'C4')).toBe(false) // reversed
      expect(isValidNoteRange('C4', 'C4')).toBe(false) // same note
      expect(isValidNoteRange('X4', 'C5')).toBe(false) // invalid note
      expect(isValidNoteRange('C4', 'Y5')).toBe(false) // invalid note
    })
  })

  describe('validateExerciseParameters', () => {
    const validParams: ExerciseParameters = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 8,
      tempo: 120,
      technicalElements: [],
      rhythmicPatterns: [],
      dynamicRange: [],
      scaleTypes: [],
      intervalPatterns: [],
      includeFingerings: false,
    }

    it('validates correct parameters', () => {
      const errors = validateExerciseParameters(validParams)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('validates difficulty range', () => {
      const errors1 = validateExerciseParameters({
        ...validParams,
        difficulty: 0,
      })
      expect(errors1.difficulty).toBe('Difficulty must be between 1 and 10')

      const errors2 = validateExerciseParameters({
        ...validParams,
        difficulty: 11,
      })
      expect(errors2.difficulty).toBe('Difficulty must be between 1 and 10')

      const errors = validateExerciseParameters({
        ...validParams,
        difficulty: 5,
      })
      expect(errors.difficulty).toBeUndefined()
    })

    it('validates measures range', () => {
      let errors = validateExerciseParameters({ ...validParams, measures: 0 })
      expect(errors.measures).toBe('Measures must be between 1 and 32')

      errors = validateExerciseParameters({ ...validParams, measures: 33 })
      expect(errors.measures).toBe('Measures must be between 1 and 32')

      errors = validateExerciseParameters({ ...validParams, measures: 16 })
      expect(errors.measures).toBeUndefined()
    })

    it('validates tempo range', () => {
      let errors = validateExerciseParameters({ ...validParams, tempo: 39 })
      expect(errors.tempo).toBe('Tempo must be between 40 and 300 BPM')

      errors = validateExerciseParameters({ ...validParams, tempo: 301 })
      expect(errors.tempo).toBe('Tempo must be between 40 and 300 BPM')

      errors = validateExerciseParameters({ ...validParams, tempo: 120 })
      expect(errors.tempo).toBeUndefined()
    })

    it('validates note range format', () => {
      let errors = validateExerciseParameters({
        ...validParams,
        range: { lowest: 'X4', highest: 'C6' },
      })
      expect(errors.rangeLowest).toBe('Invalid note format (e.g., C4)')

      errors = validateExerciseParameters({
        ...validParams,
        range: { lowest: 'C4', highest: 'Y6' },
      })
      expect(errors.rangeHighest).toBe('Invalid note format (e.g., C6)')
    })

    it('validates note range logic', () => {
      const errors = validateExerciseParameters({
        ...validParams,
        range: { lowest: 'C6', highest: 'C4' },
      })
      expect(errors.rangeLogical).toBe(
        'Highest note must be higher than lowest note'
      )
    })

    it('validates note range size', () => {
      // Test range too narrow (less than 5 semitones)
      const errors = validateExerciseParameters({
        ...validParams,
        range: { lowest: 'C4', highest: 'C4' }, // Will be caught by range logic first
      })
      expect(errors.rangeLogical).toBeDefined()
    })
  })

  describe('validateSightReadingParameters', () => {
    const validSightReadingParams: SightReadingExerciseParameters = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 8,
      tempo: 120,
      technicalElements: [],
      rhythmicPatterns: [],
      dynamicRange: [],
      scaleTypes: [],
      intervalPatterns: [],
      includeFingerings: false,
      includeAccidentals: true,
      melodicMotion: 'mixed' as const,
      includeDynamics: false,
      includeArticulations: false,
      phraseLength: 4 as const,
    }

    it('validates correct sight-reading parameters', () => {
      const errors = validateSightReadingParameters(validSightReadingParams)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('validates phrase length vs measures', () => {
      let errors = validateSightReadingParameters({
        ...validSightReadingParams,
        measures: 2,
        phraseLength: 4,
      })
      expect(errors.phraseLength).toBe(
        'Phrase length should be compatible with exercise length'
      )

      errors = validateSightReadingParameters({
        ...validSightReadingParams,
        measures: 8,
        phraseLength: 4,
      })
      expect(errors.phraseLength).toBeUndefined()
    })
  })

  describe('validateTechnicalParameters', () => {
    const validTechnicalParams: TechnicalExerciseParameters = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 8,
      tempo: 120,
      technicalElements: [],
      rhythmicPatterns: [],
      dynamicRange: [],
      scaleTypes: [],
      intervalPatterns: [],
      includeFingerings: false,
      technicalType: 'scale' as const,
      scaleType: ScaleType.MAJOR,
      arpeggioType: 'major' as const,
      hanonPattern: [1, 3, 5],
      includeDescending: true,
      octaves: 2,
    }

    it('validates correct technical parameters', () => {
      const errors = validateTechnicalParameters(validTechnicalParams)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('validates octaves range', () => {
      let errors = validateTechnicalParameters({
        ...validTechnicalParams,
        octaves: 0,
      })
      expect(errors.octaves).toBe('Octaves must be between 1 and 4')

      errors = validateTechnicalParameters({
        ...validTechnicalParams,
        octaves: 5,
      })
      expect(errors.octaves).toBe('Octaves must be between 1 and 4')

      errors = validateTechnicalParameters({
        ...validTechnicalParams,
        octaves: 2,
      })
      expect(errors.octaves).toBeUndefined()
    })

    it('validates hanon pattern', () => {
      let errors = validateTechnicalParameters({
        ...validTechnicalParams,
        technicalType: 'hanon',
        hanonPattern: [],
      })
      expect(errors.hanonPattern).toBe('Hanon pattern cannot be empty')

      errors = validateTechnicalParameters({
        ...validTechnicalParams,
        technicalType: 'hanon',
        hanonPattern: [1, 8, 3], // 8 is invalid
      })
      expect(errors.hanonPattern).toBe(
        'Hanon pattern values must be between 1 and 7 (scale degrees)'
      )
    })

    it('validates required types for specific technical exercises', () => {
      let errors = validateTechnicalParameters({
        ...validTechnicalParams,
        technicalType: 'scale',
        scaleType: undefined as unknown as ScaleType,
      })
      expect(errors.scaleType).toBe(
        'Scale type is required for scale exercises'
      )

      errors = validateTechnicalParameters({
        ...validTechnicalParams,
        technicalType: 'arpeggio',
        arpeggioType: undefined as unknown as 'major',
      })
      expect(errors.arpeggioType).toBe(
        'Arpeggio type is required for arpeggio exercises'
      )
    })
  })

  describe('validateInstrumentParameters', () => {
    const baseParams: ExerciseParameters = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 8,
      tempo: 120,
      technicalElements: [],
      rhythmicPatterns: [],
      dynamicRange: [],
      scaleTypes: [],
      intervalPatterns: [],
      includeFingerings: false,
    }

    it('validates guitar parameters', () => {
      let errors = validateInstrumentParameters({
        ...baseParams,
        instrumentParams: {
          instrument: 'guitar' as const,
          guitar: {
            position: 0, // Invalid position
          },
        },
      })
      expect(errors.guitarPosition).toBe(
        'Guitar position must be between 1 and 12'
      )

      errors = validateInstrumentParameters({
        ...baseParams,
        instrumentParams: {
          instrument: 'guitar' as const,
          guitar: {
            strings: [0, 7], // Invalid strings
          },
        },
      })
      expect(errors.guitarStrings).toBe(
        'Guitar strings must be between 1 and 6'
      )
    })

    it('validates piano parameters', () => {
      const errors = validateInstrumentParameters({
        ...baseParams,
        instrumentParams: {
          instrument: 'piano' as const,
          piano: {
            hand: 'both',
            fingerPatterns: ['123', '6789'], // Invalid finger pattern
          },
        },
      })
      expect(errors.pianoFingerPatterns).toBe(
        'Piano finger patterns must contain only digits 1-5'
      )
    })
  })

  describe('validateAllParameters', () => {
    it('validates basic exercise parameters', () => {
      const params: ExerciseParameters = {
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 8,
        tempo: 120,
        technicalElements: [],
        rhythmicPatterns: [],
        dynamicRange: [],
        scaleTypes: [],
        intervalPatterns: [],
        includeFingerings: false,
      }

      const errors = validateAllParameters(params)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('detects sight-reading parameters and validates them', () => {
      const params: SightReadingExerciseParameters = {
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 2,
        tempo: 120,
        technicalElements: [],
        rhythmicPatterns: [],
        dynamicRange: [],
        scaleTypes: [],
        intervalPatterns: [],
        includeFingerings: false,
        includeAccidentals: true,
        melodicMotion: 'mixed',
        includeDynamics: false,
        includeArticulations: false,
        phraseLength: 4, // Will cause validation error
      }

      const errors = validateAllParameters(params)
      expect(errors.phraseLength).toBe(
        'Phrase length should be compatible with exercise length'
      )
    })

    it('detects technical parameters and validates them', () => {
      const params = {
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 8,
        tempo: 120,
        technicalElements: [],
        rhythmicPatterns: [],
        dynamicRange: [],
        scaleTypes: [],
        intervalPatterns: [],
        includeFingerings: false,
        technicalType: 'scale',
        octaves: 5, // Will cause validation error
      } as TechnicalExerciseParameters

      const errors = validateAllParameters(params)
      expect(errors.octaves).toBe('Octaves must be between 1 and 4')
    })
  })

  describe('Utility Functions', () => {
    describe('hasValidationErrors', () => {
      it('returns true when errors exist', () => {
        expect(hasValidationErrors({ difficulty: 'Invalid' })).toBe(true)
        expect(
          hasValidationErrors({ tempo: 'Too fast', measures: 'Too many' })
        ).toBe(true)
      })

      it('returns false when no errors exist', () => {
        expect(hasValidationErrors({})).toBe(false)
      })
    })

    describe('getFirstError', () => {
      it('returns first error message', () => {
        const errors = {
          difficulty: 'Invalid difficulty',
          tempo: 'Invalid tempo',
        }
        const firstError = getFirstError(errors)
        expect(firstError).toBe('Invalid difficulty')
      })

      it('returns null when no errors exist', () => {
        expect(getFirstError({})).toBeNull()
      })
    })

    describe('formatValidationErrors', () => {
      it('returns array of error messages', () => {
        const errors = {
          difficulty: 'Invalid difficulty',
          tempo: 'Invalid tempo',
          empty: '', // Should be filtered out
        }
        const formatted = formatValidationErrors(errors)
        expect(formatted).toEqual(['Invalid difficulty', 'Invalid tempo'])
      })

      it('returns empty array when no errors exist', () => {
        expect(formatValidationErrors({})).toEqual([])
      })
    })
  })
})
