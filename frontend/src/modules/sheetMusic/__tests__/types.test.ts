import {
  isValidNoteRange,
  validateExerciseParameters,
  isScaleExerciseParameters,
  isArpeggioExerciseParameters,
  ExerciseParameters,
  KeySignature,
  TimeSignature,
  Clef,
  ScaleType,
  ChordType,
  NOTE_VALUES,
  NoteDuration,
  TIME_SIGNATURE_GROUPS,
  DIFFICULTY_PRESETS,
  noteToMidi,
  midiToNote,
  transposeNote,
  getScaleNotes,
  getKeySignatureAlterations,
  SCALE_INTERVALS,
  CHORD_INTERVALS,
} from '../types'

describe('Sheet Music Types', () => {
  describe('Note Range Validation', () => {
    it('should validate correct note ranges', () => {
      expect(isValidNoteRange({ lowest: 'C4', highest: 'C6' })).toBe(true)
      expect(isValidNoteRange({ lowest: 'A0', highest: 'G9' })).toBe(true)
      expect(isValidNoteRange({ lowest: 'F#3', highest: 'Bb5' })).toBe(true)
    })

    it('should reject invalid note ranges', () => {
      expect(isValidNoteRange({ lowest: 'H4', highest: 'C6' })).toBe(false)
      expect(isValidNoteRange({ lowest: 'C', highest: 'C6' })).toBe(false)
      expect(isValidNoteRange({ lowest: 'C4', highest: '6C' })).toBe(false)
      expect(isValidNoteRange({ lowest: 'C##4', highest: 'C6' })).toBe(false)
    })
  })

  describe('Exercise Parameter Validation', () => {
    const validParams: ExerciseParameters = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 8,
      tempo: 120,
    }

    it('should validate correct parameters', () => {
      const errors = validateExerciseParameters(validParams)
      expect(errors).toHaveLength(0)
    })

    it('should catch invalid note range', () => {
      const params = {
        ...validParams,
        range: { lowest: 'invalid', highest: 'C6' },
      }
      const errors = validateExerciseParameters(params)
      expect(errors).toContain('Invalid note range format')
    })

    it('should catch invalid difficulty', () => {
      const errors1 = validateExerciseParameters({
        ...validParams,
        difficulty: 0,
      })
      expect(errors1).toContain('Difficulty must be between 1 and 10')

      const errors2 = validateExerciseParameters({
        ...validParams,
        difficulty: 11,
      })
      expect(errors2).toContain('Difficulty must be between 1 and 10')
    })

    it('should catch invalid measures', () => {
      const errors1 = validateExerciseParameters({
        ...validParams,
        measures: 0,
      })
      expect(errors1).toContain('Measures must be between 1 and 100')

      const errors2 = validateExerciseParameters({
        ...validParams,
        measures: 101,
      })
      expect(errors2).toContain('Measures must be between 1 and 100')
    })

    it('should catch invalid tempo', () => {
      const errors1 = validateExerciseParameters({
        ...validParams,
        tempo: 19,
      })
      expect(errors1).toContain('Tempo must be between 20 and 300 BPM')

      const errors2 = validateExerciseParameters({
        ...validParams,
        tempo: 301,
      })
      expect(errors2).toContain('Tempo must be between 20 and 300 BPM')
    })

    it('should catch multiple errors', () => {
      const params = {
        ...validParams,
        difficulty: 15,
        tempo: 400,
        measures: 0,
      }
      const errors = validateExerciseParameters(params)
      expect(errors.length).toBeGreaterThan(1)
    })
  })

  describe('Type Guards', () => {
    const baseParams: ExerciseParameters = {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 8,
      tempo: 120,
    }

    it('should identify scale exercise parameters', () => {
      const scaleParams = {
        ...baseParams,
        scaleType: ScaleType.MAJOR,
        pattern: 'ascending' as const,
        octaves: 2 as const,
        startingNote: 'C4',
      }

      expect(isScaleExerciseParameters(scaleParams)).toBe(true)
      expect(isScaleExerciseParameters(baseParams)).toBe(false)
    })

    it('should identify arpeggio exercise parameters', () => {
      const arpeggioParams = {
        ...baseParams,
        chordType: ChordType.MAJOR,
        inversion: 'root' as const,
        pattern: 'broken' as const,
        direction: 'ascending' as const,
      }

      expect(isArpeggioExerciseParameters(arpeggioParams)).toBe(true)
      expect(isArpeggioExerciseParameters(baseParams)).toBe(false)
    })
  })

  describe('Constants', () => {
    it('should have correct note values', () => {
      expect(NOTE_VALUES[NoteDuration.WHOLE]).toBe(4)
      expect(NOTE_VALUES[NoteDuration.HALF]).toBe(2)
      expect(NOTE_VALUES[NoteDuration.QUARTER]).toBe(1)
      expect(NOTE_VALUES[NoteDuration.EIGHTH]).toBe(0.5)
      expect(NOTE_VALUES[NoteDuration.SIXTEENTH]).toBe(0.25)
      expect(NOTE_VALUES[NoteDuration.THIRTY_SECOND]).toBe(0.125)
    })

    it('should group time signatures correctly', () => {
      expect(TIME_SIGNATURE_GROUPS.simple).toContain(TimeSignature.FOUR_FOUR)
      expect(TIME_SIGNATURE_GROUPS.compound).toContain(TimeSignature.SIX_EIGHT)
      expect(TIME_SIGNATURE_GROUPS.complex).toContain(TimeSignature.FIVE_FOUR)
    })

    it('should have valid difficulty presets', () => {
      expect(DIFFICULTY_PRESETS.beginner.tempo).toBe(60)
      expect(DIFFICULTY_PRESETS.intermediate.tempo).toBe(90)
      expect(DIFFICULTY_PRESETS.advanced.tempo).toBe(120)

      // Validate that presets have valid ranges
      expect(isValidNoteRange(DIFFICULTY_PRESETS.beginner.noteRange)).toBe(true)
      expect(isValidNoteRange(DIFFICULTY_PRESETS.intermediate.noteRange)).toBe(
        true
      )
      expect(isValidNoteRange(DIFFICULTY_PRESETS.advanced.noteRange)).toBe(true)
    })
  })

  describe('Music Theory Helpers', () => {
    describe('Note Conversion', () => {
      it('should convert note names to MIDI numbers', () => {
        expect(noteToMidi('C4')).toBe(60) // Middle C
        expect(noteToMidi('A4')).toBe(69) // Concert A
        expect(noteToMidi('C#4')).toBe(61)
        expect(noteToMidi('Bb3')).toBe(58)
        expect(noteToMidi('G9')).toBe(127) // MIDI max is 127
      })

      it('should throw on invalid note format', () => {
        expect(() => noteToMidi('invalid')).toThrow('Invalid note format')
        expect(() => noteToMidi('H4')).toThrow('Invalid note format')
        expect(() => noteToMidi('C')).toThrow('Invalid note format')
      })

      it('should convert MIDI numbers to note names', () => {
        expect(midiToNote(60)).toBe('C4')
        expect(midiToNote(69)).toBe('A4')
        expect(midiToNote(61)).toBe('C#4')
        expect(midiToNote(58)).toBe('A#3')
      })

      it('should handle note transposition', () => {
        expect(transposeNote('C4', 12)).toBe('C5') // Octave up
        expect(transposeNote('C4', -12)).toBe('C3') // Octave down
        expect(transposeNote('C4', 7)).toBe('G4') // Perfect fifth
        expect(transposeNote('A4', 3)).toBe('C5') // Minor third
      })
    })

    describe('Scale Generation', () => {
      it('should generate correct scale notes', () => {
        const cMajor = getScaleNotes('C4', ScaleType.MAJOR)
        expect(cMajor).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])

        const aMinor = getScaleNotes('A4', ScaleType.NATURAL_MINOR)
        expect(aMinor).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'])

        const cPentatonic = getScaleNotes('C4', ScaleType.PENTATONIC_MAJOR)
        expect(cPentatonic).toEqual(['C4', 'D4', 'E4', 'G4', 'A4'])
      })

      it('should have correct scale intervals', () => {
        expect(SCALE_INTERVALS[ScaleType.MAJOR]).toEqual([0, 2, 4, 5, 7, 9, 11])
        expect(SCALE_INTERVALS[ScaleType.BLUES]).toEqual([0, 3, 5, 6, 7, 10])
        expect(SCALE_INTERVALS[ScaleType.CHROMATIC]).toHaveLength(12)
      })
    })

    describe('Chord Intervals', () => {
      it('should have correct chord intervals', () => {
        expect(CHORD_INTERVALS[ChordType.MAJOR]).toEqual([0, 4, 7])
        expect(CHORD_INTERVALS[ChordType.MINOR]).toEqual([0, 3, 7])
        expect(CHORD_INTERVALS[ChordType.DOMINANT_SEVENTH]).toEqual([
          0, 4, 7, 10,
        ])
      })
    })

    describe('Key Signatures', () => {
      it('should return correct sharps for major keys', () => {
        const cMajor = getKeySignatureAlterations(KeySignature.C_MAJOR)
        expect(cMajor.sharps).toEqual([])
        expect(cMajor.flats).toEqual([])

        const gMajor = getKeySignatureAlterations(KeySignature.G_MAJOR)
        expect(gMajor.sharps).toEqual(['F#'])
        expect(gMajor.flats).toEqual([])

        const dMajor = getKeySignatureAlterations(KeySignature.D_MAJOR)
        expect(dMajor.sharps).toEqual(['F#', 'C#'])
      })

      it('should return correct flats for major keys', () => {
        const fMajor = getKeySignatureAlterations(KeySignature.F_MAJOR)
        expect(fMajor.flats).toEqual(['Bb'])
        expect(fMajor.sharps).toEqual([])

        const bFlatMajor = getKeySignatureAlterations(KeySignature.B_FLAT_MAJOR)
        expect(bFlatMajor.flats).toEqual(['Bb', 'Eb'])
      })

      it('should handle minor keys correctly', () => {
        const aMinor = getKeySignatureAlterations(KeySignature.A_MINOR)
        expect(aMinor.sharps).toEqual([])
        expect(aMinor.flats).toEqual([])

        const eMinor = getKeySignatureAlterations(KeySignature.E_MINOR)
        expect(eMinor.sharps).toEqual(['F#'])
      })
    })
  })
})
