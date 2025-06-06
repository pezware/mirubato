/**
 * Base Exercise Generator
 *
 * Abstract base class for all exercise generators.
 * Provides common functionality for parameter validation,
 * measure generation, and music theory utilities.
 */

import {
  ExerciseParameters,
  Measure,
  Note,
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  validateExerciseParameters,
  NOTE_VALUES,
  getKeySignatureAlterations,
  noteToMidi,
  midiToNote,
} from '../types'

/**
 * Abstract base class for exercise generators
 */
export abstract class ExerciseGenerator {
  /**
   * Generate measures based on exercise parameters
   * Must be implemented by subclasses
   */
  abstract generate(params: ExerciseParameters): Measure[]

  /**
   * Validate exercise parameters
   * @throws Error if parameters are invalid
   */
  protected validateParameters(params: ExerciseParameters): void {
    const errors = validateExerciseParameters(params)
    if (errors.length > 0) {
      throw new Error(`Invalid parameters: ${errors.join(', ')}`)
    }
  }

  /**
   * Generate a single measure with basic structure
   */
  protected generateMeasure(
    measureNumber: number,
    params: ExerciseParameters
  ): Measure {
    const measure: Measure = {
      number: measureNumber,
      notes: [],
    }

    // Add time signature on first measure
    if (measureNumber === 1) {
      measure.timeSignature = params.timeSignature
      measure.keySignature = params.keySignature
      measure.clef = params.clef
      measure.tempo = params.tempo
    }

    return measure
  }

  /**
   * Calculate the total duration of notes in a measure
   */
  protected calculateMeasureDuration(notes: Note[]): number {
    return notes.reduce((total, note) => {
      const baseValue = NOTE_VALUES[note.duration]
      const dotMultiplier = note.dots ? Math.pow(1.5, note.dots) : 1
      return total + baseValue * dotMultiplier
    }, 0)
  }

  /**
   * Get the expected measure duration based on time signature
   */
  protected getExpectedMeasureDuration(timeSignature: TimeSignature): number {
    const [beats, noteValue] = timeSignature.split('/').map(Number)
    return beats * (4 / noteValue)
  }

  /**
   * Check if a measure is complete (has correct duration)
   */
  protected isMeasureComplete(
    measure: Measure,
    timeSignature: TimeSignature
  ): boolean {
    const actualDuration = this.calculateMeasureDuration(measure.notes)
    const expectedDuration = this.getExpectedMeasureDuration(timeSignature)
    return Math.abs(actualDuration - expectedDuration) < 0.001 // Allow for floating point errors
  }

  /**
   * Generate a random note within the specified range
   */
  protected generateRandomNote(
    params: ExerciseParameters,
    duration: NoteDuration,
    time: number
  ): Note {
    const lowestMidi = noteToMidi(params.range.lowest)
    const highestMidi = noteToMidi(params.range.highest)
    const midiNote =
      Math.floor(Math.random() * (highestMidi - lowestMidi + 1)) + lowestMidi
    const noteName = midiToNote(midiNote)

    // Convert to VexFlow format (e.g., "C4" -> "c/4")
    const vexKey = this.noteToVexFlow(noteName)

    return {
      keys: [vexKey],
      duration,
      time,
    }
  }

  /**
   * Convert note name to VexFlow format
   * e.g., "C4" -> "c/4", "F#5" -> "f#/5"
   */
  protected noteToVexFlow(note: string): string {
    const match = note.match(/^([A-G])([#b]?)([0-9])$/)
    if (!match) throw new Error(`Invalid note format: ${note}`)

    const [, noteName, accidental, octave] = match
    return `${noteName.toLowerCase()}${accidental}/${octave}`
  }

  /**
   * Convert VexFlow format to note name
   * e.g., "c/4" -> "C4", "f#/5" -> "F#5"
   */
  protected vexFlowToNote(vexKey: string): string {
    const match = vexKey.match(/^([a-g])([#b]?)\/([0-9])$/)
    if (!match) throw new Error(`Invalid VexFlow key format: ${vexKey}`)

    const [, noteName, accidental, octave] = match
    return `${noteName.toUpperCase()}${accidental}${octave}`
  }

  /**
   * Get available note durations based on difficulty
   */
  protected getAvailableDurations(difficulty: number): NoteDuration[] {
    if (difficulty <= 3) {
      return [NoteDuration.WHOLE, NoteDuration.HALF, NoteDuration.QUARTER]
    } else if (difficulty <= 6) {
      return [NoteDuration.HALF, NoteDuration.QUARTER, NoteDuration.EIGHTH]
    } else {
      return [NoteDuration.QUARTER, NoteDuration.EIGHTH, NoteDuration.SIXTEENTH]
    }
  }

  /**
   * Apply key signature to a note (add accidentals if needed)
   */
  protected applyKeySignature(note: Note, keySignature: KeySignature): Note {
    const { sharps, flats } = getKeySignatureAlterations(keySignature)
    const vexKey = note.keys[0]
    const noteName = this.vexFlowToNote(vexKey)
    const baseNote = noteName[0]

    // Check if this note should have an accidental based on key signature
    if (sharps.includes(`${baseNote}#`)) {
      // Note should be sharp in this key
      if (!noteName.includes('#')) {
        note.accidental = '#'
      }
    } else if (flats.includes(`${baseNote}b`)) {
      // Note should be flat in this key
      if (!noteName.includes('b')) {
        note.accidental = 'b'
      }
    }

    return note
  }

  /**
   * Add rests to complete a measure
   */
  protected addRestsToCompleteMeasure(
    measure: Measure,
    timeSignature: TimeSignature
  ): void {
    const currentDuration = this.calculateMeasureDuration(measure.notes)
    const expectedDuration = this.getExpectedMeasureDuration(timeSignature)
    const remainingDuration = expectedDuration - currentDuration

    if (remainingDuration <= 0.001) return // Measure is complete

    // Find the largest rest that fits
    const restDurations = [
      { duration: NoteDuration.WHOLE, value: 4 },
      { duration: NoteDuration.HALF, value: 2 },
      { duration: NoteDuration.QUARTER, value: 1 },
      { duration: NoteDuration.EIGHTH, value: 0.5 },
      { duration: NoteDuration.SIXTEENTH, value: 0.25 },
    ]

    let remainingToFill = remainingDuration
    let currentTime = currentDuration

    for (const { duration, value } of restDurations) {
      while (remainingToFill >= value - 0.001) {
        measure.notes.push({
          keys: ['r'], // Rest in VexFlow
          duration,
          time: currentTime,
          rest: true,
        })
        remainingToFill -= value
        currentTime += value
      }
    }
  }

  /**
   * Sort notes by time position in measure
   */
  protected sortNotesByTime(notes: Note[]): Note[] {
    return [...notes].sort((a, b) => a.time - b.time)
  }

  /**
   * Get clef-appropriate range constraints
   */
  protected getClefRange(clef: Clef): { lowest: string; highest: string } {
    switch (clef) {
      case Clef.TREBLE:
        return { lowest: 'C4', highest: 'C7' }
      case Clef.BASS:
        return { lowest: 'C2', highest: 'C5' }
      case Clef.ALTO:
        return { lowest: 'G3', highest: 'G6' }
      case Clef.TENOR:
        return { lowest: 'C3', highest: 'C6' }
      case Clef.GRAND_STAFF:
        return { lowest: 'C2', highest: 'C7' }
      default:
        return { lowest: 'C3', highest: 'C6' }
    }
  }

  /**
   * Constrain range to clef limits
   */
  protected constrainToClefRange(
    params: ExerciseParameters
  ): ExerciseParameters {
    const clefRange = this.getClefRange(params.clef)
    const lowestMidi = Math.max(
      noteToMidi(params.range.lowest),
      noteToMidi(clefRange.lowest)
    )
    const highestMidi = Math.min(
      noteToMidi(params.range.highest),
      noteToMidi(clefRange.highest)
    )

    return {
      ...params,
      range: {
        lowest: midiToNote(lowestMidi),
        highest: midiToNote(highestMidi),
      },
    }
  }
}
