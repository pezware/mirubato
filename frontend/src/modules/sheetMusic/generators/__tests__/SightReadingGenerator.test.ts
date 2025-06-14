import { SightReadingGenerator } from '../SightReadingGenerator'
import {
  ExerciseParameters,
  SightReadingExerciseParameters,
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  noteToMidi,
  NOTE_VALUES,
} from '../../types'

describe('SightReadingGenerator', () => {
  let generator: SightReadingGenerator
  let baseParams: ExerciseParameters
  let sightReadingParams: SightReadingExerciseParameters

  beforeEach(() => {
    generator = new SightReadingGenerator()
    baseParams = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 4,
      tempo: 120,
    }
    sightReadingParams = {
      ...baseParams,
      includeAccidentals: false,
      melodicMotion: 'mixed',
      includeDynamics: false,
      includeArticulations: false,
      phraseLength: 4,
    }
  })

  describe('Exercise Generation', () => {
    it('should generate the requested number of measures', () => {
      const measures = generator.generate(baseParams)
      expect(measures).toHaveLength(4)
    })

    it('should include metadata only in first measure', () => {
      const measures = generator.generate(baseParams)

      expect(measures[0].timeSignature).toBe(TimeSignature.FOUR_FOUR)
      expect(measures[0].keySignature).toBe(KeySignature.C_MAJOR)
      expect(measures[0].clef).toBe(Clef.TREBLE)
      expect(measures[0].tempo).toBe(120)

      expect(measures[1].timeSignature).toBeUndefined()
      expect(measures[1].keySignature).toBeUndefined()
    })

    it('should generate notes within specified range', () => {
      const measures = generator.generate(baseParams)
      const lowestMidi = noteToMidi('C4')
      const highestMidi = noteToMidi('C6')

      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const noteName = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (noteName) {
              const [, pitch, accidental, octave] = noteName
              const midiNote = noteToMidi(
                `${pitch.toUpperCase()}${accidental}${octave}`
              )
              expect(midiNote).toBeGreaterThanOrEqual(lowestMidi)
              expect(midiNote).toBeLessThanOrEqual(highestMidi)
            }
          }
        })
      })
    })

    it('should create complete measures', () => {
      const measures = generator.generate(baseParams)

      measures.forEach(measure => {
        const totalDuration = measure.notes.reduce((sum, note) => {
          const baseValue = NOTE_VALUES[note.duration]
          const multiplier = note.dots ? Math.pow(1.5, note.dots) : 1
          return sum + baseValue * multiplier
        }, 0)

        expect(totalDuration).toBeCloseTo(4, 2) // 4/4 time
      })
    })
  })

  describe('Difficulty-based Features', () => {
    it('should use simple durations for easy exercises', () => {
      const easyParams = { ...baseParams, difficulty: 2 }
      const measures = generator.generate(easyParams)

      const durations = new Set<NoteDuration>()
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            durations.add(note.duration)
          }
        })
      })

      // Should only use whole, half, and quarter notes
      expect(durations.has(NoteDuration.EIGHTH)).toBe(false)
      expect(durations.has(NoteDuration.SIXTEENTH)).toBe(false)
    })

    it('should use complex durations for hard exercises', () => {
      const hardParams = { ...baseParams, difficulty: 8 }
      const measures = generator.generate(hardParams)

      const durations = new Set<NoteDuration>()
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            durations.add(note.duration)
          }
        })
      })

      // Should include shorter note values
      expect(
        durations.has(NoteDuration.QUARTER) ||
          durations.has(NoteDuration.EIGHTH) ||
          durations.has(NoteDuration.SIXTEENTH)
      ).toBe(true)
    })

    it('should include dynamics for higher difficulty', () => {
      const hardParams: SightReadingExerciseParameters = {
        ...sightReadingParams,
        difficulty: 7,
        includeDynamics: true,
      }
      const measures = generator.generate(hardParams)

      expect(measures[0].dynamics).toBeDefined()
      expect(['p', 'mp', 'mf', 'f', 'ff', 'pp']).toContain(measures[0].dynamics)
    })

    it('should include articulations for higher difficulty', () => {
      const hardParams: SightReadingExerciseParameters = {
        ...sightReadingParams,
        difficulty: 7,
        includeArticulations: true,
      }
      const measures = generator.generate(hardParams)

      let hasArticulation = false
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (note.articulation) {
            hasArticulation = true
          }
        })
      })

      expect(hasArticulation).toBe(true)
    })
  })

  describe('Melodic Motion', () => {
    // TODO: Fix flaky test - uses randomness without seed, threshold too strict (expects 60%, sometimes gets 58%)
    it.skip('should generate stepwise motion when specified', () => {
      const stepwiseParams: SightReadingExerciseParameters = {
        ...sightReadingParams,
        melodicMotion: 'stepwise',
      }
      const measures = generator.generate(stepwiseParams)

      // Check that most intervals are seconds
      let totalIntervals = 0
      let stepwiseIntervals = 0

      measures.forEach(measure => {
        const nonRestNotes = measure.notes.filter(n => !n.rest)
        for (let i = 1; i < nonRestNotes.length; i++) {
          const prevNote = nonRestNotes[i - 1].keys[0]
          const currNote = nonRestNotes[i].keys[0]

          const prevMatch = prevNote.match(/^([a-g])([#b]?)\/([0-9])$/)
          const currMatch = currNote.match(/^([a-g])([#b]?)\/([0-9])$/)

          if (prevMatch && currMatch) {
            const prevMidi = noteToMidi(
              `${prevMatch[1].toUpperCase()}${prevMatch[2]}${prevMatch[3]}`
            )
            const currMidi = noteToMidi(
              `${currMatch[1].toUpperCase()}${currMatch[2]}${currMatch[3]}`
            )

            const interval = Math.abs(currMidi - prevMidi)
            totalIntervals++

            if (interval <= 2) {
              stepwiseIntervals++
            }
          }
        }
      })

      // Most intervals should be stepwise
      expect(stepwiseIntervals / totalIntervals).toBeGreaterThanOrEqual(0.6)
    })

    it('should generate leaps when specified', () => {
      const leapParams: SightReadingExerciseParameters = {
        ...sightReadingParams,
        melodicMotion: 'leaps',
      }
      const measures = generator.generate(leapParams)

      // Check that we have some larger intervals
      let hasLeap = false

      measures.forEach(measure => {
        const nonRestNotes = measure.notes.filter(n => !n.rest)
        for (let i = 1; i < nonRestNotes.length; i++) {
          const prevNote = nonRestNotes[i - 1].keys[0]
          const currNote = nonRestNotes[i].keys[0]

          const prevMatch = prevNote.match(/^([a-g])([#b]?)\/([0-9])$/)
          const currMatch = currNote.match(/^([a-g])([#b]?)\/([0-9])$/)

          if (prevMatch && currMatch) {
            const prevMidi = noteToMidi(
              `${prevMatch[1].toUpperCase()}${prevMatch[2]}${prevMatch[3]}`
            )
            const currMidi = noteToMidi(
              `${currMatch[1].toUpperCase()}${currMatch[2]}${currMatch[3]}`
            )

            const interval = Math.abs(currMidi - prevMidi)
            if (interval >= 3) {
              hasLeap = true
            }
          }
        }
      })

      expect(hasLeap).toBe(true)
    })
  })

  describe('Key Signature Application', () => {
    it('should apply correct accidentals for G major', () => {
      const gMajorParams = {
        ...baseParams,
        keySignature: KeySignature.G_MAJOR,
      }
      const measures = generator.generate(gMajorParams)

      // Check if F notes have sharps
      let hasFSharp = false
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest && note.keys[0].includes('f/')) {
            if (note.accidental === '#') {
              hasFSharp = true
            }
          }
        })
      })

      // Should have at least one F# if there are F notes
      const hasFNotes = measures.some(m =>
        m.notes.some(n => !n.rest && n.keys[0].includes('f/'))
      )

      if (hasFNotes) {
        expect(hasFSharp).toBe(true)
      }
    })

    it('should apply correct accidentals for F major', () => {
      const fMajorParams = {
        ...baseParams,
        keySignature: KeySignature.F_MAJOR,
      }
      const measures = generator.generate(fMajorParams)

      // Check if B notes have flats
      let hasBFlat = false
      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest && note.keys[0].includes('b/')) {
            if (note.accidental === 'b') {
              hasBFlat = true
            }
          }
        })
      })

      // Should have at least one Bb if there are B notes
      const hasBNotes = measures.some(m =>
        m.notes.some(n => !n.rest && n.keys[0].includes('b/'))
      )

      if (hasBNotes) {
        expect(hasBFlat).toBe(true)
      }
    })
  })

  describe('Rhythmic Variation', () => {
    it('should add rhythmic variation for higher difficulties', () => {
      const complexParams = { ...baseParams, difficulty: 7 }
      const measures = generator.generate(complexParams)

      // Count different duration types
      const durationCounts = new Map<NoteDuration, number>()

      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const count = durationCounts.get(note.duration) || 0
            durationCounts.set(note.duration, count + 1)
          }
        })
      })

      // Should have variety in rhythms
      expect(durationCounts.size).toBeGreaterThan(1)
    })

    it('should occasionally add dots for medium difficulty', () => {
      const mediumParams = { ...baseParams, difficulty: 5 }
      let hasDots = false

      // Generate multiple exercises to increase chance of dots
      for (let i = 0; i < 10; i++) {
        const measures = generator.generate(mediumParams)
        measures.forEach(measure => {
          measure.notes.forEach(note => {
            if (note.dots && note.dots > 0) {
              hasDots = true
            }
          })
        })

        if (hasDots) break
      }

      expect(hasDots).toBe(true)
    })
  })

  describe('Clef Constraints', () => {
    it('should respect bass clef range', () => {
      const bassParams = {
        ...baseParams,
        clef: Clef.BASS,
        range: { lowest: 'C1', highest: 'C6' }, // Will be constrained
      }
      const measures = generator.generate(bassParams)

      const lowestMidi = noteToMidi('C2') // Bass clef lower limit
      const highestMidi = noteToMidi('C5') // Bass clef upper limit

      measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const noteName = note.keys[0].match(/^([a-g])([#b]?)\/([0-9])$/)
            if (noteName) {
              const [, pitch, accidental, octave] = noteName
              const midiNote = noteToMidi(
                `${pitch.toUpperCase()}${accidental}${octave}`
              )
              expect(midiNote).toBeGreaterThanOrEqual(lowestMidi)
              expect(midiNote).toBeLessThanOrEqual(highestMidi)
            }
          }
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle single measure generation', () => {
      const singleMeasureParams = { ...baseParams, measures: 1 }
      const measures = generator.generate(singleMeasureParams)

      expect(measures).toHaveLength(1)
      expect(measures[0].notes.length).toBeGreaterThan(0)
    })

    it('should handle very easy exercises', () => {
      const veryEasyParams = { ...baseParams, difficulty: 1 }
      const measures = generator.generate(veryEasyParams)

      // Should generate valid music
      expect(measures.length).toBeGreaterThan(0)
      measures.forEach(measure => {
        expect(measure.notes.length).toBeGreaterThan(0)
      })
    })

    it('should handle very difficult exercises', () => {
      const veryHardParams = { ...baseParams, difficulty: 10 }
      const measures = generator.generate(veryHardParams)

      // Should generate valid music
      expect(measures.length).toBeGreaterThan(0)
      measures.forEach(measure => {
        expect(measure.notes.length).toBeGreaterThan(0)
      })
    })

    it('should handle unusual time signatures', () => {
      const unusualParams = {
        ...baseParams,
        timeSignature: TimeSignature.FIVE_FOUR,
      }
      const measures = generator.generate(unusualParams)

      // Check measure completeness for 5/4
      measures.forEach(measure => {
        const totalDuration = measure.notes.reduce((sum, note) => {
          const baseValue = NOTE_VALUES[note.duration]
          const multiplier = note.dots ? Math.pow(1.5, note.dots) : 1
          return sum + baseValue * multiplier
        }, 0)

        expect(totalDuration).toBeCloseTo(5, 2) // 5/4 time
      })
    })
  })
})
