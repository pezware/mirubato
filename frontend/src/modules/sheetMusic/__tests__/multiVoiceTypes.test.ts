/**
 * Tests for Multi-Voice Types and Validation
 */
import {
  Voice,
  MultiVoiceNote,
  Staff,
  Part,
  MultiVoiceMeasure,
  Score,
  isMultiVoiceMeasure,
  isScore,
  VOICE_CONFIGURATIONS,
} from '../multiVoiceTypes'
import {
  validateMultiVoiceNote,
  validateVoice,
  validateStaff,
  validatePart,
  validateScore,
  calculateVoiceDuration,
  validateMeasureTiming,
} from '../multiVoiceValidation'
import { Clef, NoteDuration, TimeSignature } from '../types'

describe('Multi-Voice Types', () => {
  describe('Type Guards', () => {
    it('should correctly identify MultiVoiceMeasure', () => {
      const validMeasure: MultiVoiceMeasure = {
        number: 1,
        staves: [],
      }
      expect(isMultiVoiceMeasure(validMeasure)).toBe(true)

      const invalidMeasure = {
        number: 1,
        notes: [], // Old format
      }
      expect(isMultiVoiceMeasure(invalidMeasure)).toBe(false)
    })

    it('should correctly identify Score', () => {
      const validScore: Score = {
        title: 'Test Score',
        composer: 'Test Composer',
        parts: [
          {
            id: 'piano',
            name: 'Piano',
            instrument: 'piano',
            staves: ['treble', 'bass'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }
      expect(isScore(validScore)).toBe(true)

      const invalidScore = {
        title: 'Test',
        measures: [{ number: 1, notes: [] }], // Old format
      }
      expect(isScore(invalidScore)).toBe(false)
    })
  })

  describe('Voice Configurations', () => {
    it('should have piano configuration', () => {
      const pianoConfig = VOICE_CONFIGURATIONS.piano
      expect(pianoConfig.instrument).toBe('piano')
      expect(pianoConfig.voices).toHaveLength(2)
      expect(pianoConfig.voices[0].id).toBe('rightHand')
      expect(pianoConfig.voices[1].id).toBe('leftHand')
    })

    it('should have SATB choir configuration', () => {
      const satbConfig = VOICE_CONFIGURATIONS.satb
      expect(satbConfig.instrument).toBe('choir')
      expect(satbConfig.voices).toHaveLength(4)
      expect(satbConfig.voices.map(v => v.id)).toEqual([
        'soprano',
        'alto',
        'tenor',
        'bass',
      ])
    })
  })
})

describe('Multi-Voice Validation', () => {
  describe('validateMultiVoiceNote', () => {
    it('should validate a valid note', () => {
      const note: MultiVoiceNote = {
        keys: ['c/4'],
        duration: NoteDuration.QUARTER,
        time: 0,
        voiceId: 'soprano',
      }
      const result = validateMultiVoiceNote(note)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate a chord', () => {
      const chord: MultiVoiceNote = {
        keys: ['c/4', 'e/4', 'g/4'],
        duration: NoteDuration.HALF,
        time: 0,
        voiceId: 'rightHand',
      }
      const result = validateMultiVoiceNote(chord)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid key format', () => {
      const note: MultiVoiceNote = {
        keys: ['invalid'],
        duration: NoteDuration.QUARTER,
        time: 0,
        voiceId: 'soprano',
      }
      const result = validateMultiVoiceNote(note)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid key format: invalid')
    })

    it('should reject missing required fields', () => {
      const note = {
        keys: ['c/4'],
      } as MultiVoiceNote
      const result = validateMultiVoiceNote(note)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateVoice', () => {
    it('should validate a valid voice', () => {
      const voice: Voice = {
        id: 'soprano',
        name: 'Soprano',
        stemDirection: 'up',
        notes: [
          {
            keys: ['c/5'],
            duration: NoteDuration.QUARTER,
            time: 0,
            voiceId: 'soprano',
          },
        ],
      }
      const result = validateVoice(voice)
      expect(result.valid).toBe(true)
    })

    it('should detect out-of-order notes', () => {
      const voice: Voice = {
        id: 'alto',
        notes: [
          {
            keys: ['a/4'],
            duration: NoteDuration.QUARTER,
            time: 1,
            voiceId: 'alto',
          },
          {
            keys: ['g/4'],
            duration: NoteDuration.QUARTER,
            time: 0,
            voiceId: 'alto',
          },
        ],
      }
      const result = validateVoice(voice)
      expect(result.warnings).toContain(
        'Notes in voice alto may not be in chronological order'
      )
    })
  })

  describe('validateStaff', () => {
    it('should validate a valid staff', () => {
      const staff: Staff = {
        id: 'treble',
        clef: Clef.TREBLE,
        voices: [
          {
            id: 'soprano',
            notes: [],
          },
        ],
      }
      const result = validateStaff(staff)
      expect(result.valid).toBe(true)
    })

    it('should detect duplicate voice IDs', () => {
      const staff: Staff = {
        id: 'treble',
        clef: Clef.TREBLE,
        voices: [
          { id: 'voice1', notes: [] },
          { id: 'voice1', notes: [] },
        ],
      }
      const result = validateStaff(staff)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Staff contains duplicate voice IDs')
    })
  })

  describe('validatePart', () => {
    it('should validate a valid part', () => {
      const part: Part = {
        id: 'piano',
        name: 'Piano',
        instrument: 'piano',
        staves: ['treble', 'bass'],
        midiProgram: 0,
        volume: 100,
        pan: 0,
      }
      const result = validatePart(part)
      expect(result.valid).toBe(true)
    })

    it('should validate MIDI values', () => {
      const part: Part = {
        id: 'piano',
        name: 'Piano',
        instrument: 'piano',
        staves: ['treble'],
        midiProgram: 200, // Invalid
      }
      const result = validatePart(part)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('MIDI program must be between 0 and 127')
    })
  })

  describe('calculateVoiceDuration', () => {
    it('should calculate correct duration for simple rhythm', () => {
      const voice: Voice = {
        id: 'test',
        notes: [
          {
            keys: ['c/4'],
            duration: NoteDuration.QUARTER,
            time: 0,
            voiceId: 'test',
          },
          {
            keys: ['d/4'],
            duration: NoteDuration.QUARTER,
            time: 1,
            voiceId: 'test',
          },
          {
            keys: ['e/4'],
            duration: NoteDuration.HALF,
            time: 2,
            voiceId: 'test',
          },
        ],
      }
      const { expected, actual } = calculateVoiceDuration(
        voice,
        TimeSignature.FOUR_FOUR
      )
      expect(expected).toBe(4)
      expect(actual).toBe(4)
    })

    it('should handle dotted notes', () => {
      const voice: Voice = {
        id: 'test',
        notes: [
          {
            keys: ['c/4'],
            duration: NoteDuration.HALF,
            dots: 1, // Dotted half = 3 beats
            time: 0,
            voiceId: 'test',
          },
          {
            keys: ['d/4'],
            duration: NoteDuration.QUARTER,
            time: 3,
            voiceId: 'test',
          },
        ],
      }
      const { expected, actual } = calculateVoiceDuration(
        voice,
        TimeSignature.FOUR_FOUR
      )
      expect(expected).toBe(4)
      expect(actual).toBe(4)
    })
  })

  describe('validateMeasureTiming', () => {
    it('should validate correct measure timing', () => {
      const measure: MultiVoiceMeasure = {
        number: 1,
        staves: [
          {
            id: 'treble',
            clef: Clef.TREBLE,
            voices: [
              {
                id: 'soprano',
                notes: [
                  {
                    keys: ['c/5'],
                    duration: NoteDuration.QUARTER,
                    time: 0,
                    voiceId: 'soprano',
                  },
                  {
                    keys: ['d/5'],
                    duration: NoteDuration.QUARTER,
                    time: 1,
                    voiceId: 'soprano',
                  },
                  {
                    keys: ['e/5'],
                    duration: NoteDuration.QUARTER,
                    time: 2,
                    voiceId: 'soprano',
                  },
                ],
              },
            ],
          },
        ],
      }
      const result = validateMeasureTiming(measure, TimeSignature.THREE_FOUR)
      expect(result.valid).toBe(true)
    })

    it('should detect timing errors', () => {
      const measure: MultiVoiceMeasure = {
        number: 1,
        staves: [
          {
            id: 'treble',
            clef: Clef.TREBLE,
            voices: [
              {
                id: 'soprano',
                notes: [
                  {
                    keys: ['c/5'],
                    duration: NoteDuration.WHOLE,
                    time: 0,
                    voiceId: 'soprano',
                  },
                ],
              },
            ],
          },
        ],
      }
      const result = validateMeasureTiming(measure, TimeSignature.THREE_FOUR)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Expected 3 beats, got 4 beats')
    })
  })

  describe('validateScore', () => {
    it('should validate a complete valid score', () => {
      const score: Score = {
        title: 'Test Piece',
        composer: 'Test Composer',
        parts: [
          {
            id: 'piano',
            name: 'Piano',
            instrument: 'piano',
            staves: ['treble', 'bass'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'treble',
                clef: Clef.TREBLE,
                voices: [
                  {
                    id: 'rightHand',
                    notes: [
                      {
                        keys: ['c/5'],
                        duration: NoteDuration.WHOLE,
                        time: 0,
                        voiceId: 'rightHand',
                      },
                    ],
                  },
                ],
              },
              {
                id: 'bass',
                clef: Clef.BASS,
                voices: [
                  {
                    id: 'leftHand',
                    notes: [
                      {
                        keys: ['c/3'],
                        duration: NoteDuration.WHOLE,
                        time: 0,
                        voiceId: 'leftHand',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }
      const result = validateScore(score)
      expect(result.valid).toBe(true)
    })

    it('should detect staff reference errors', () => {
      const score: Score = {
        title: 'Test',
        composer: 'Test',
        parts: [
          {
            id: 'piano',
            name: 'Piano',
            instrument: 'piano',
            staves: ['treble', 'bass', 'nonexistent'], // Reference to non-existent staff
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'treble',
                clef: Clef.TREBLE,
                voices: [],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }
      const result = validateScore(score)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('references non-existent staff')
    })
  })
})
