import { ExerciseGenerator } from '../ExerciseGenerator'
import {
  ExerciseParameters,
  Measure,
  Note,
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  noteToMidi,
} from '../../types'

// Concrete implementation for testing
class TestExerciseGenerator extends ExerciseGenerator {
  generate(params: ExerciseParameters): Measure[] {
    this.validateParameters(params)
    const measures: Measure[] = []

    for (let i = 1; i <= params.measures; i++) {
      const measure = this.generateMeasure(i, params)
      // Add a simple whole note
      measure.notes.push({
        keys: ['c/4'],
        duration: NoteDuration.WHOLE,
        time: 0,
      })
      measures.push(measure)
    }

    return measures
  }

  // Expose protected methods for testing
  public testValidateParameters(params: ExerciseParameters): void {
    return this.validateParameters(params)
  }

  public testGenerateMeasure(
    measureNumber: number,
    params: ExerciseParameters
  ): Measure {
    return this.generateMeasure(measureNumber, params)
  }

  public testCalculateMeasureDuration(notes: Note[]): number {
    return this.calculateMeasureDuration(notes)
  }

  public testGetExpectedMeasureDuration(timeSignature: TimeSignature): number {
    return this.getExpectedMeasureDuration(timeSignature)
  }

  public testIsMeasureComplete(
    measure: Measure,
    timeSignature: TimeSignature
  ): boolean {
    return this.isMeasureComplete(measure, timeSignature)
  }

  public testGenerateRandomNote(
    params: ExerciseParameters,
    duration: NoteDuration,
    time: number
  ): Note {
    return this.generateRandomNote(params, duration, time)
  }

  public testNoteToVexFlow(note: string): string {
    return this.noteToVexFlow(note)
  }

  public testVexFlowToNote(vexKey: string): string {
    return this.vexFlowToNote(vexKey)
  }

  public testGetAvailableDurations(difficulty: number): NoteDuration[] {
    return this.getAvailableDurations(difficulty)
  }

  public testApplyKeySignature(note: Note, keySignature: KeySignature): Note {
    return this.applyKeySignature(note, keySignature)
  }

  public testAddRestsToCompleteMeasure(
    measure: Measure,
    timeSignature: TimeSignature
  ): void {
    return this.addRestsToCompleteMeasure(measure, timeSignature)
  }

  public testSortNotesByTime(notes: Note[]): Note[] {
    return this.sortNotesByTime(notes)
  }

  public testGetClefRange(clef: Clef): { lowest: string; highest: string } {
    return this.getClefRange(clef)
  }

  public testConstrainToClefRange(
    params: ExerciseParameters
  ): ExerciseParameters {
    return this.constrainToClefRange(params)
  }
}

describe('ExerciseGenerator', () => {
  let generator: TestExerciseGenerator
  let validParams: ExerciseParameters

  beforeEach(() => {
    generator = new TestExerciseGenerator()
    validParams = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 4,
      tempo: 120,
    }
  })

  describe('Parameter Validation', () => {
    it('should validate correct parameters', () => {
      expect(() => generator.testValidateParameters(validParams)).not.toThrow()
    })

    it('should throw on invalid parameters', () => {
      const invalidParams = { ...validParams, difficulty: 15 }
      expect(() => generator.testValidateParameters(invalidParams)).toThrow(
        'Invalid parameters: Difficulty must be between 1 and 10'
      )
    })

    it('should throw on multiple invalid parameters', () => {
      const invalidParams = {
        ...validParams,
        difficulty: 15,
        tempo: 400,
      }
      expect(() => generator.testValidateParameters(invalidParams)).toThrow()
    })
  })

  describe('Measure Generation', () => {
    it('should generate a basic measure structure', () => {
      const measure = generator.testGenerateMeasure(1, validParams)

      expect(measure.number).toBe(1)
      expect(measure.notes).toEqual([])
      expect(measure.timeSignature).toBe(TimeSignature.FOUR_FOUR)
      expect(measure.keySignature).toBe(KeySignature.C_MAJOR)
      expect(measure.clef).toBe(Clef.TREBLE)
      expect(measure.tempo).toBe(120)
    })

    it('should not include metadata on subsequent measures', () => {
      const measure = generator.testGenerateMeasure(2, validParams)

      expect(measure.number).toBe(2)
      expect(measure.timeSignature).toBeUndefined()
      expect(measure.keySignature).toBeUndefined()
      expect(measure.clef).toBeUndefined()
      expect(measure.tempo).toBeUndefined()
    })
  })

  describe('Duration Calculations', () => {
    it('should calculate measure duration correctly', () => {
      const notes: Note[] = [
        { keys: ['c/4'], duration: NoteDuration.WHOLE, time: 0 },
      ]
      expect(generator.testCalculateMeasureDuration(notes)).toBe(4)

      const mixedNotes: Note[] = [
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['d/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 3 },
      ]
      expect(generator.testCalculateMeasureDuration(mixedNotes)).toBe(4)
    })

    it('should handle dotted notes', () => {
      const notes: Note[] = [
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 0, dots: 1 },
        { keys: ['d/4'], duration: NoteDuration.QUARTER, time: 3 },
      ]
      expect(generator.testCalculateMeasureDuration(notes)).toBe(4)
    })

    it('should calculate expected measure duration', () => {
      expect(
        generator.testGetExpectedMeasureDuration(TimeSignature.FOUR_FOUR)
      ).toBe(4)
      expect(
        generator.testGetExpectedMeasureDuration(TimeSignature.THREE_FOUR)
      ).toBe(3)
      expect(
        generator.testGetExpectedMeasureDuration(TimeSignature.SIX_EIGHT)
      ).toBe(3)
      expect(
        generator.testGetExpectedMeasureDuration(TimeSignature.TWELVE_EIGHT)
      ).toBe(6)
    })

    it('should check if measure is complete', () => {
      const measure: Measure = {
        number: 1,
        notes: [{ keys: ['c/4'], duration: NoteDuration.WHOLE, time: 0 }],
      }

      expect(
        generator.testIsMeasureComplete(measure, TimeSignature.FOUR_FOUR)
      ).toBe(true)
      expect(
        generator.testIsMeasureComplete(measure, TimeSignature.THREE_FOUR)
      ).toBe(false)
    })
  })

  describe('Note Generation', () => {
    it('should generate random notes within range', () => {
      const note = generator.testGenerateRandomNote(
        validParams,
        NoteDuration.QUARTER,
        0
      )

      expect(note.duration).toBe(NoteDuration.QUARTER)
      expect(note.time).toBe(0)
      expect(note.keys).toHaveLength(1)

      // Check note is within range
      const noteName = generator.testVexFlowToNote(note.keys[0])
      const noteMidi = noteToMidi(noteName)
      const lowestMidi = noteToMidi('C4')
      const highestMidi = noteToMidi('C6')

      expect(noteMidi).toBeGreaterThanOrEqual(lowestMidi)
      expect(noteMidi).toBeLessThanOrEqual(highestMidi)
    })
  })

  describe('Format Conversions', () => {
    it('should convert note names to VexFlow format', () => {
      expect(generator.testNoteToVexFlow('C4')).toBe('c/4')
      expect(generator.testNoteToVexFlow('F#5')).toBe('f#/5')
      expect(generator.testNoteToVexFlow('Bb3')).toBe('bb/3')
      expect(generator.testNoteToVexFlow('G2')).toBe('g/2')
    })

    it('should convert VexFlow format to note names', () => {
      expect(generator.testVexFlowToNote('c/4')).toBe('C4')
      expect(generator.testVexFlowToNote('f#/5')).toBe('F#5')
      expect(generator.testVexFlowToNote('bb/3')).toBe('Bb3')
      expect(generator.testVexFlowToNote('g/2')).toBe('G2')
    })

    it('should throw on invalid formats', () => {
      expect(() => generator.testNoteToVexFlow('invalid')).toThrow()
      expect(() => generator.testVexFlowToNote('invalid')).toThrow()
    })
  })

  describe('Difficulty-based Features', () => {
    it('should return appropriate durations for difficulty', () => {
      expect(generator.testGetAvailableDurations(1)).toEqual([
        NoteDuration.WHOLE,
        NoteDuration.HALF,
        NoteDuration.QUARTER,
      ])

      expect(generator.testGetAvailableDurations(5)).toEqual([
        NoteDuration.HALF,
        NoteDuration.QUARTER,
        NoteDuration.EIGHTH,
      ])

      expect(generator.testGetAvailableDurations(8)).toEqual([
        NoteDuration.QUARTER,
        NoteDuration.EIGHTH,
        NoteDuration.SIXTEENTH,
      ])
    })
  })

  describe('Key Signature Application', () => {
    it('should apply sharps from key signature', () => {
      const note: Note = {
        keys: ['f/4'],
        duration: NoteDuration.QUARTER,
        time: 0,
      }
      const result = generator.testApplyKeySignature(note, KeySignature.G_MAJOR)

      expect(result.accidental).toBe('#')
    })

    it('should apply flats from key signature', () => {
      const note: Note = {
        keys: ['b/4'],
        duration: NoteDuration.QUARTER,
        time: 0,
      }
      const result = generator.testApplyKeySignature(note, KeySignature.F_MAJOR)

      expect(result.accidental).toBe('b')
    })

    it('should not modify notes already with correct accidental', () => {
      const note: Note = {
        keys: ['f#/4'],
        duration: NoteDuration.QUARTER,
        time: 0,
      }
      const result = generator.testApplyKeySignature(note, KeySignature.G_MAJOR)

      expect(result.accidental).toBeUndefined()
    })
  })

  describe('Rest Completion', () => {
    it('should add rests to complete a measure', () => {
      const measure: Measure = {
        number: 1,
        notes: [{ keys: ['c/4'], duration: NoteDuration.HALF, time: 0 }],
      }

      generator.testAddRestsToCompleteMeasure(measure, TimeSignature.FOUR_FOUR)

      expect(measure.notes).toHaveLength(2)
      expect(measure.notes[1].rest).toBe(true)
      expect(measure.notes[1].duration).toBe(NoteDuration.HALF)
    })

    it('should not add rests to complete measures', () => {
      const measure: Measure = {
        number: 1,
        notes: [{ keys: ['c/4'], duration: NoteDuration.WHOLE, time: 0 }],
      }

      generator.testAddRestsToCompleteMeasure(measure, TimeSignature.FOUR_FOUR)

      expect(measure.notes).toHaveLength(1)
    })

    it('should handle complex rest combinations', () => {
      const measure: Measure = {
        number: 1,
        notes: [{ keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 0 }],
      }

      generator.testAddRestsToCompleteMeasure(measure, TimeSignature.FOUR_FOUR)

      const totalDuration = generator.testCalculateMeasureDuration(
        measure.notes
      )
      expect(totalDuration).toBeCloseTo(4, 3)
    })
  })

  describe('Note Sorting', () => {
    it('should sort notes by time', () => {
      const notes: Note[] = [
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 3 },
        { keys: ['d/4'], duration: NoteDuration.QUARTER, time: 1 },
      ]

      const sorted = generator.testSortNotesByTime(notes)

      expect(sorted[0].time).toBe(0)
      expect(sorted[1].time).toBe(1)
      expect(sorted[2].time).toBe(2)
      expect(sorted[3].time).toBe(3)
    })
  })

  describe('Clef Range Constraints', () => {
    it('should return appropriate ranges for each clef', () => {
      expect(generator.testGetClefRange(Clef.TREBLE)).toEqual({
        lowest: 'C4',
        highest: 'C7',
      })

      expect(generator.testGetClefRange(Clef.BASS)).toEqual({
        lowest: 'C2',
        highest: 'C5',
      })

      expect(generator.testGetClefRange(Clef.GRAND_STAFF)).toEqual({
        lowest: 'C2',
        highest: 'C7',
      })
    })

    it('should constrain parameters to clef range', () => {
      const params = {
        ...validParams,
        clef: Clef.BASS,
        range: { lowest: 'C1', highest: 'C7' },
      }

      const constrained = generator.testConstrainToClefRange(params)

      expect(constrained.range.lowest).toBe('C2')
      expect(constrained.range.highest).toBe('C5')
    })
  })

  describe('Integration', () => {
    it('should generate complete exercises', () => {
      const measures = generator.generate(validParams)

      expect(measures).toHaveLength(4)
      expect(measures[0].number).toBe(1)
      expect(measures[0].timeSignature).toBe(TimeSignature.FOUR_FOUR)
      expect(measures[3].number).toBe(4)
    })
  })
})
