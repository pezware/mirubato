import {
  TechnicalExerciseGenerator,
  TechnicalExerciseParameters,
} from '../TechnicalExerciseGenerator'
import {
  ExerciseParameters,
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  ScaleType,
  noteToMidi,
  NOTE_VALUES,
} from '../../types'

describe('TechnicalExerciseGenerator', () => {
  let generator: TechnicalExerciseGenerator
  let baseParams: ExerciseParameters
  let technicalParams: TechnicalExerciseParameters

  beforeEach(() => {
    generator = new TechnicalExerciseGenerator()
    baseParams = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 4,
      tempo: 120,
    }
    technicalParams = {
      ...baseParams,
      technicalType: 'scale',
      scaleType: ScaleType.MAJOR,
      includeDescending: true,
      octaves: 1,
    }
  })

  describe('Scale Exercise Generation', () => {
    it('should generate scale exercises with correct number of measures', () => {
      const measures = generator.generate(technicalParams)
      expect(measures).toHaveLength(4)
    })

    it('should generate ascending scale pattern', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        includeDescending: false,
      }
      const measures = generator.generate(params)

      // Extract all non-rest notes
      const notes: string[] = []
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental, octave] = match
              notes.push(`${pitch.toUpperCase()}${accidental}${octave}`)
            }
          }
        })
      })

      // Check that notes are in ascending order
      for (let i = 1; i < notes.length; i++) {
        const prevMidi = noteToMidi(notes[i - 1])
        const currMidi = noteToMidi(notes[i])
        expect(currMidi).toBeGreaterThanOrEqual(prevMidi)
      }
    })

    it('should generate ascending and descending pattern when requested', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        includeDescending: true,
      }
      const measures = generator.generate(params)

      // Extract all non-rest notes
      const notes: number[] = []
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental, octave] = match
              const midi = noteToMidi(
                `${pitch.toUpperCase()}${accidental}${octave}`
              )
              notes.push(midi)
            }
          }
        })
      })

      // Find the peak (highest note)
      const maxIndex = notes.indexOf(Math.max(...notes))

      // Check ascending portion
      for (let i = 1; i <= maxIndex; i++) {
        expect(notes[i]).toBeGreaterThanOrEqual(notes[i - 1])
      }

      // Check descending portion
      for (let i = maxIndex + 1; i < notes.length; i++) {
        expect(notes[i]).toBeLessThanOrEqual(notes[i - 1])
      }
    })

    it('should respect octave parameter', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        octaves: 2,
        includeDescending: false,
      }
      const measures = generator.generate(params)

      // Extract all non-rest notes
      const midiNotes: number[] = []
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental, octave] = match
              const midi = noteToMidi(
                `${pitch.toUpperCase()}${accidental}${octave}`
              )
              midiNotes.push(midi)
            }
          }
        })
      })

      // Check that we span approximately 2 octaves
      const range = Math.max(...midiNotes) - Math.min(...midiNotes)
      expect(range).toBeGreaterThan(12) // More than one octave
      expect(range).toBeLessThanOrEqual(24) // Up to two octaves
    })

    it('should use appropriate durations based on difficulty', () => {
      const easyParams: TechnicalExerciseParameters = {
        ...technicalParams,
        difficulty: 2,
      }
      const measures = generator.generate(easyParams)

      // Check that easy scales use quarter notes
      let hasQuarterNotes = false
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest && note.duration === NoteDuration.QUARTER) {
            hasQuarterNotes = true
          }
        })
      })

      expect(hasQuarterNotes).toBe(true)
    })

    it('should apply key signature correctly for G major', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        keySignature: KeySignature.G_MAJOR,
      }
      const measures = generator.generate(params)

      // Check for F# in scale
      let hasFSharp = false
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (
            !note.rest &&
            note.keys[0].includes('f/') &&
            note.accidental === '#'
          ) {
            hasFSharp = true
          }
        })
      })

      // G major scale should have F#
      const hasFNotes = measures.some(m =>
        m.notes.some(n => !n.rest && n.keys[0].includes('f/'))
      )

      if (hasFNotes) {
        expect(hasFSharp).toBe(true)
      }
    })
  })

  describe('Arpeggio Exercise Generation', () => {
    it('should generate arpeggio exercises', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'arpeggio',
        arpeggioType: 'major',
      }
      const measures = generator.generate(params)

      expect(measures).toHaveLength(4)
      expect(measures[0].notes.length).toBeGreaterThan(0)
    })

    it('should generate correct arpeggio pattern', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'arpeggio',
        arpeggioType: 'major',
        includeDescending: false,
        octaves: 1,
      }
      const measures = generator.generate(params)

      // Extract note pitches (without octave)
      const notePitches: string[] = []
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental] = match
              notePitches.push(`${pitch.toUpperCase()}${accidental}`)
            }
          }
        })
      })

      // Major arpeggio should contain C, E, G pattern
      const expectedNotes = ['C', 'E', 'G']
      for (const expected of expectedNotes) {
        expect(notePitches).toContain(expected)
      }
    })

    it('should generate minor arpeggio correctly', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'arpeggio',
        arpeggioType: 'minor',
        keySignature: KeySignature.A_MINOR,
        includeDescending: false,
      }
      const measures = generator.generate(params)

      // Extract note pitches
      const notePitches: string[] = []
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental] = match
              notePitches.push(`${pitch.toUpperCase()}${accidental}`)
            }
          }
        })
      })

      // A minor arpeggio should contain A, C, E
      const expectedNotes = ['A', 'C', 'E']
      for (const expected of expectedNotes) {
        expect(notePitches).toContain(expected)
      }
    })

    it('should handle dominant 7th arpeggios', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'arpeggio',
        arpeggioType: 'dominant7',
      }
      const measures = generator.generate(params)

      expect(measures).toHaveLength(4)
      expect(measures[0].notes.length).toBeGreaterThan(0)
    })
  })

  describe('Hanon Exercise Generation', () => {
    it('should generate Hanon-style exercises', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'hanon',
      }
      const measures = generator.generate(params)

      expect(measures).toHaveLength(4)
      expect(measures[0].notes.length).toBeGreaterThan(0)
    })

    it('should use sixteenth notes for Hanon exercises', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'hanon',
      }
      const measures = generator.generate(params)

      let hasSixteenthNotes = false
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest && note.duration === NoteDuration.SIXTEENTH) {
            hasSixteenthNotes = true
          }
        })
      })

      expect(hasSixteenthNotes).toBe(true)
    })

    it('should apply custom Hanon pattern', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'hanon',
        hanonPattern: [1, 3, 2, 4], // Custom pattern
      }
      const measures = generator.generate(params)

      expect(measures).toHaveLength(4)
      expect(measures[0].notes.length).toBeGreaterThan(0)
    })

    it('should stay within range for Hanon exercises', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'hanon',
        range: { lowest: 'C4', highest: 'G5' },
      }
      const measures = generator.generate(params)

      const lowestMidi = noteToMidi('C4')
      const highestMidi = noteToMidi('G5')

      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental, octave] = match
              const midi = noteToMidi(
                `${pitch.toUpperCase()}${accidental}${octave}`
              )
              expect(midi).toBeGreaterThanOrEqual(lowestMidi)
              expect(midi).toBeLessThanOrEqual(highestMidi)
            }
          }
        })
      })
    })
  })

  describe('Mixed Exercise Generation', () => {
    it('should generate mixed exercises', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'mixed',
      }
      const measures = generator.generate(params)

      expect(measures).toHaveLength(4)
    })

    it('should combine scale and arpeggio sections', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'mixed',
        measures: 8, // More measures to see both sections
      }
      const measures = generator.generate(params)

      expect(measures).toHaveLength(8)

      // First half should be scale-like
      const firstHalfNotes: number[] = []
      for (let i = 0; i < 4; i++) {
        measures[i].notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental, octave] = match
              firstHalfNotes.push(
                noteToMidi(`${pitch.toUpperCase()}${accidental}${octave}`)
              )
            }
          }
        })
      }

      // Check for some stepwise motion in first half
      let hasStepwiseMotion = false
      for (let i = 1; i < firstHalfNotes.length; i++) {
        const interval = Math.abs(firstHalfNotes[i] - firstHalfNotes[i - 1])
        if (interval <= 2) {
          hasStepwiseMotion = true
          break
        }
      }
      expect(hasStepwiseMotion).toBe(true)
    })
  })

  describe('Fingering Suggestions', () => {
    it('should add piano fingerings when requested', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        includeFingerings: true,
        instrumentParams: {
          instrument: 'piano',
          piano: { hand: 'right' },
        },
      }
      const measures = generator.generate(params)

      let hasFingering = false
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest && note.fingering) {
            hasFingering = true
            // Piano fingerings should be 1-5
            expect(['1', '2', '3', '4', '5']).toContain(note.fingering)
          }
        })
      })

      expect(hasFingering).toBe(true)
    })

    it('should add guitar fingerings when requested', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        includeFingerings: true,
        instrumentParams: {
          instrument: 'guitar',
          guitar: { position: 1 },
        },
      }
      const measures = generator.generate(params)

      let hasFingering = false
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest && note.fingering) {
            hasFingering = true
            // Guitar fingerings should be 1-4
            expect(['1', '2', '3', '4']).toContain(note.fingering)
          }
        })
      })

      expect(hasFingering).toBe(true)
    })

    it('should use appropriate fingering patterns for scales', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        technicalType: 'scale',
        includeFingerings: true,
        instrumentParams: {
          instrument: 'piano',
          piano: { hand: 'right' },
        },
      }
      const measures = generator.generate(params)

      const fingerings: string[] = []
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest && note.fingering) {
            fingerings.push(note.fingering)
          }
        })
      })

      // Should have standard scale fingering pattern
      expect(fingerings.length).toBeGreaterThan(0)
      // Check for thumb (1) usage
      expect(fingerings).toContain('1')
    })
  })

  describe('Time Signature Handling', () => {
    it('should complete measures correctly in 3/4 time', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        timeSignature: TimeSignature.THREE_FOUR,
      }
      const measures = generator.generate(params)

      measures.forEach(measure => {
        const totalDuration = measure.notes.reduce((sum, note) => {
          const baseValue = NOTE_VALUES[note.duration]
          const multiplier = note.dots ? Math.pow(1.5, note.dots) : 1
          return sum + baseValue * multiplier
        }, 0)

        expect(totalDuration).toBeCloseTo(3, 2) // 3/4 time
      })
    })

    it('should complete measures correctly in 6/8 time', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        timeSignature: TimeSignature.SIX_EIGHT,
      }
      const measures = generator.generate(params)

      measures.forEach(measure => {
        const totalDuration = measure.notes.reduce((sum, note) => {
          const baseValue = NOTE_VALUES[note.duration]
          const multiplier = note.dots ? Math.pow(1.5, note.dots) : 1
          return sum + baseValue * multiplier
        }, 0)

        expect(totalDuration).toBeCloseTo(3, 2) // 6/8 = 3 quarter notes
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very narrow range', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        range: { lowest: 'C4', highest: 'E4' },
      }
      const measures = generator.generate(params)

      expect(measures).toHaveLength(4)

      // All notes should be within range
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental, octave] = match
              const midi = noteToMidi(
                `${pitch.toUpperCase()}${accidental}${octave}`
              )
              expect(midi).toBeGreaterThanOrEqual(noteToMidi('C4'))
              expect(midi).toBeLessThanOrEqual(noteToMidi('E4'))
            }
          }
        })
      })
    })

    it('should handle bass clef', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        clef: Clef.BASS,
        range: { lowest: 'C2', highest: 'C4' },
      }
      const measures = generator.generate(params)

      expect(measures).toHaveLength(4)
      expect(measures[0].clef).toBe(Clef.BASS)
    })

    it('should default to scale exercise when type not specified', () => {
      const params = { ...baseParams } as TechnicalExerciseParameters
      const measures = generator.generate(params)

      expect(measures).toHaveLength(4)
      expect(measures[0].notes.length).toBeGreaterThan(0)
    })

    it('should handle chromatic scale', () => {
      const params: TechnicalExerciseParameters = {
        ...technicalParams,
        scaleType: ScaleType.CHROMATIC,
        includeDescending: false,
      }
      const measures = generator.generate(params)

      // Chromatic scale should have many half steps
      const midiNotes: number[] = []
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const match = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (match) {
              const [, pitch, accidental, octave] = match
              midiNotes.push(
                noteToMidi(`${pitch.toUpperCase()}${accidental}${octave}`)
              )
            }
          }
        })
      })

      // Check for half-step intervals
      let hasHalfSteps = false
      for (let i = 1; i < midiNotes.length; i++) {
        if (Math.abs(midiNotes[i] - midiNotes[i - 1]) === 1) {
          hasHalfSteps = true
          break
        }
      }
      expect(hasHalfSteps).toBe(true)
    })
  })

  describe('Parameter Validation', () => {
    it('should throw error for invalid parameters', () => {
      const invalidParams = {
        ...technicalParams,
        difficulty: 15, // Out of range
      }

      expect(() => generator.generate(invalidParams)).toThrow()
    })

    it('should throw error for invalid note range', () => {
      const invalidParams = {
        ...technicalParams,
        range: { lowest: 'X9', highest: 'Y10' }, // Invalid notes
      }

      expect(() => generator.generate(invalidParams)).toThrow()
    })
  })
})
