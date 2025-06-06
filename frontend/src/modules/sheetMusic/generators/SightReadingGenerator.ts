/**
 * Sight-Reading Exercise Generator
 *
 * Generates sight-reading exercises with progressive difficulty,
 * melodic patterns, and rhythmic variations.
 */

import { ExerciseGenerator } from './ExerciseGenerator'
import {
  ExerciseParameters,
  SightReadingExerciseParameters,
  Measure,
  Note,
  NoteDuration,
  NOTE_VALUES,
  getScaleNotes,
  ScaleType,
  KeySignature,
  noteToMidi,
  midiToNote,
  DynamicMarking,
  Articulation,
} from '../types'

/**
 * Generator for sight-reading exercises
 */
export class SightReadingGenerator extends ExerciseGenerator {
  /**
   * Generate sight-reading exercise measures
   */
  generate(params: ExerciseParameters): Measure[] {
    this.validateParameters(params)

    // Constrain to clef range
    const constrainedParams = this.constrainToClefRange(params)
    const measures: Measure[] = []

    for (let i = 1; i <= constrainedParams.measures; i++) {
      const measure = this.generateSightReadingMeasure(i, constrainedParams)
      measures.push(measure)
    }

    return measures
  }

  /**
   * Generate a single sight-reading measure
   */
  private generateSightReadingMeasure(
    measureNumber: number,
    params: ExerciseParameters
  ): Measure {
    const measure = this.generateMeasure(measureNumber, params)
    const sightReadingParams = this.getSightReadingParams(params)

    // Generate melodic content
    const melody = this.generateMelody(params, sightReadingParams)

    // Apply rhythmic variation
    const rhythmicNotes = this.addRhythmicVariation(
      melody,
      params,
      sightReadingParams
    )

    // Apply articulations and dynamics if requested
    const styledNotes = this.applyMusicality(
      rhythmicNotes,
      params,
      sightReadingParams
    )

    // Apply key signature
    const finalNotes = styledNotes.map(note =>
      this.applyKeySignature(note, params.keySignature)
    )

    measure.notes = finalNotes

    // Add dynamics marking for first measure
    if (measureNumber === 1 && sightReadingParams.includeDynamics) {
      measure.dynamics = this.getRandomDynamic(params.difficulty)
    }

    // Sort notes by time before adding rests
    measure.notes = this.sortNotesByTime(measure.notes)

    // Ensure measure is complete
    this.addRestsToCompleteMeasure(measure, params.timeSignature)

    return measure
  }

  /**
   * Extract sight-reading specific parameters
   */
  private getSightReadingParams(
    params: ExerciseParameters
  ): SightReadingExerciseParameters {
    // Return default sight-reading params if not provided
    const defaults: SightReadingExerciseParameters = {
      ...params,
      includeAccidentals: params.difficulty > 3,
      melodicMotion: params.difficulty <= 3 ? 'stepwise' : 'mixed',
      includeDynamics: params.difficulty > 5,
      includeArticulations: params.difficulty > 6,
      phraseLength: 4,
    }

    // Override with any provided sight-reading specific params
    return 'melodicMotion' in params
      ? (params as SightReadingExerciseParameters)
      : defaults
  }

  /**
   * Generate melodic content based on parameters
   */
  private generateMelody(
    params: ExerciseParameters,
    sightReadingParams: SightReadingExerciseParameters
  ): Note[] {
    const notes: Note[] = []
    const durations = this.getAvailableDurations(params.difficulty)
    const expectedDuration = this.getExpectedMeasureDuration(
      params.timeSignature
    )

    let currentTime = 0
    let previousMidi: number | null = null

    // Get scale notes for melodic generation
    const scaleNotes = this.getScaleForKey(params.keySignature)

    while (currentTime < expectedDuration) {
      // Select duration
      const duration = this.selectDuration(
        durations,
        expectedDuration - currentTime
      )
      let durationValue = NOTE_VALUES[duration]

      // For difficulty >= 5, occasionally add dots during generation
      let dots = 0
      if (params.difficulty >= 5 && Math.random() < 0.3) {
        const dottedValue = durationValue * 1.5
        if (currentTime + dottedValue <= expectedDuration + 0.001) {
          dots = 1
          durationValue = dottedValue
        }
      }

      // Don't create a note if it would exceed measure
      if (currentTime + durationValue > expectedDuration + 0.001) {
        break
      }

      // Generate pitch based on melodic motion
      const pitch = this.generatePitch(
        params,
        sightReadingParams,
        previousMidi,
        scaleNotes
      )

      const note: Note = {
        keys: [this.noteToVexFlow(pitch)],
        duration,
        time: currentTime,
      }

      if (dots > 0) {
        note.dots = dots
      }

      notes.push(note)
      previousMidi = noteToMidi(pitch)
      currentTime += durationValue
    }

    return notes
  }

  /**
   * Generate a pitch based on melodic motion parameters
   */
  private generatePitch(
    params: ExerciseParameters,
    sightReadingParams: SightReadingExerciseParameters,
    previousMidi: number | null,
    scaleNotes: string[]
  ): string {
    const lowestMidi = noteToMidi(params.range.lowest)
    const highestMidi = noteToMidi(params.range.highest)

    if (previousMidi === null) {
      // First note - start in middle of range
      const middleMidi = Math.floor((lowestMidi + highestMidi) / 2)
      return this.findNearestScaleNote(
        middleMidi,
        scaleNotes,
        lowestMidi,
        highestMidi
      )
    }

    // Generate based on melodic motion type
    let nextMidi: number

    switch (sightReadingParams.melodicMotion) {
      case 'stepwise':
        nextMidi = this.generateStepwiseMotion(
          previousMidi,
          lowestMidi,
          highestMidi,
          scaleNotes
        )
        break

      case 'leaps':
        nextMidi = this.generateLeapMotion(
          previousMidi,
          lowestMidi,
          highestMidi,
          scaleNotes
        )
        break

      case 'mixed':
      default:
        // 70% stepwise, 30% leaps
        nextMidi =
          Math.random() < 0.7
            ? this.generateStepwiseMotion(
                previousMidi,
                lowestMidi,
                highestMidi,
                scaleNotes
              )
            : this.generateLeapMotion(
                previousMidi,
                lowestMidi,
                highestMidi,
                scaleNotes
              )
        break
    }

    return midiToNote(nextMidi)
  }

  /**
   * Generate stepwise motion (seconds)
   */
  private generateStepwiseMotion(
    previousMidi: number,
    lowestMidi: number,
    highestMidi: number,
    scaleNotes: string[]
  ): number {
    // Find current position in scale
    const currentNote = midiToNote(previousMidi)
    const scaleIndex = scaleNotes.findIndex(
      note => note.replace(/[0-9]/g, '') === currentNote.replace(/[0-9]/g, '')
    )

    // Move up or down by one scale degree
    const direction = Math.random() < 0.5 ? -1 : 1
    let nextIndex = scaleIndex + direction

    // Wrap around if needed
    if (nextIndex < 0) nextIndex = scaleNotes.length - 1
    if (nextIndex >= scaleNotes.length) nextIndex = 0

    // Calculate actual MIDI value
    let nextMidi = previousMidi + direction * 2 // Approximate

    // Ensure within range
    if (nextMidi < lowestMidi) nextMidi = previousMidi + 2
    if (nextMidi > highestMidi) nextMidi = previousMidi - 2

    // Find nearest scale note
    return this.findNearestScaleMidi(
      nextMidi,
      scaleNotes,
      lowestMidi,
      highestMidi
    )
  }

  /**
   * Generate leap motion (thirds or larger)
   */
  private generateLeapMotion(
    previousMidi: number,
    lowestMidi: number,
    highestMidi: number,
    scaleNotes: string[]
  ): number {
    // Generate leaps of 3rd to 5th
    const leapSizes = [3, 4, 5, 7] // Scale degrees
    const leapSize = leapSizes[Math.floor(Math.random() * leapSizes.length)]

    // Determine direction based on position
    let direction: number
    if (previousMidi < lowestMidi + 12) {
      direction = 1 // Near bottom, go up
    } else if (previousMidi > highestMidi - 12) {
      direction = -1 // Near top, go down
    } else {
      direction = Math.random() < 0.5 ? -1 : 1
    }

    const nextMidi = previousMidi + direction * leapSize * 2 // Approximate semitones

    // Ensure within range
    const constrainedMidi = Math.max(
      lowestMidi,
      Math.min(highestMidi, nextMidi)
    )

    return this.findNearestScaleMidi(
      constrainedMidi,
      scaleNotes,
      lowestMidi,
      highestMidi
    )
  }

  /**
   * Add rhythmic variation to melody
   */
  private addRhythmicVariation(
    notes: Note[],
    params: ExerciseParameters,
    _sightReadingParams: SightReadingExerciseParameters
  ): Note[] {
    if (params.difficulty <= 2) {
      // No variation for easiest levels
      return notes
    }

    const variedNotes: Note[] = []

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]

      // Occasionally split longer notes
      if (
        note.duration === NoteDuration.WHOLE &&
        params.difficulty > 3 &&
        Math.random() < 0.3
      ) {
        // Split whole note into two halves
        const firstHalf = { ...note, duration: NoteDuration.HALF }
        const secondHalf = {
          ...note,
          keys: [
            this.generateRandomNote(params, NoteDuration.HALF, note.time + 2)
              .keys[0],
          ],
          duration: NoteDuration.HALF,
          time: note.time + 2,
        }
        variedNotes.push(firstHalf, secondHalf)
      } else if (
        note.duration === NoteDuration.HALF &&
        params.difficulty > 5 &&
        Math.random() < 0.3
      ) {
        // Split half note into quarters
        variedNotes.push({
          ...note,
          duration: NoteDuration.QUARTER,
        })
        variedNotes.push({
          ...note,
          duration: NoteDuration.QUARTER,
          time: note.time + 1,
        })
      } else {
        // Keep original
        variedNotes.push(note)
      }
    }

    // Dots are now added during melody generation, so no need to add them here

    return variedNotes
  }

  /**
   * Apply musicality (articulations and dynamics)
   */
  private applyMusicality(
    notes: Note[],
    params: ExerciseParameters,
    sightReadingParams: SightReadingExerciseParameters
  ): Note[] {
    return notes.map((note, index) => {
      const styledNote = { ...note }

      // Add articulations
      if (sightReadingParams.includeArticulations && Math.random() < 0.3) {
        styledNote.articulation = this.getRandomArticulation(params.difficulty)
      }

      // Add slurs for melodic phrases
      if (
        index < notes.length - 1 &&
        params.difficulty > 5 &&
        Math.random() < 0.3
      ) {
        styledNote.tie = 'start'
      }

      return styledNote
    })
  }

  /**
   * Get scale notes for a given key signature
   */
  private getScaleForKey(keySignature: KeySignature): string[] {
    // Map key signatures to root notes and scale types
    const keyMap: Record<KeySignature, { root: string; type: ScaleType }> = {
      [KeySignature.C_MAJOR]: { root: 'C4', type: ScaleType.MAJOR },
      [KeySignature.G_MAJOR]: { root: 'G4', type: ScaleType.MAJOR },
      [KeySignature.D_MAJOR]: { root: 'D4', type: ScaleType.MAJOR },
      [KeySignature.A_MAJOR]: { root: 'A4', type: ScaleType.MAJOR },
      [KeySignature.E_MAJOR]: { root: 'E4', type: ScaleType.MAJOR },
      [KeySignature.B_MAJOR]: { root: 'B4', type: ScaleType.MAJOR },
      [KeySignature.F_MAJOR]: { root: 'F4', type: ScaleType.MAJOR },
      [KeySignature.B_FLAT_MAJOR]: { root: 'Bb4', type: ScaleType.MAJOR },
      [KeySignature.E_FLAT_MAJOR]: { root: 'Eb4', type: ScaleType.MAJOR },
      [KeySignature.A_FLAT_MAJOR]: { root: 'Ab4', type: ScaleType.MAJOR },
      [KeySignature.D_FLAT_MAJOR]: { root: 'Db4', type: ScaleType.MAJOR },
      [KeySignature.G_FLAT_MAJOR]: { root: 'Gb4', type: ScaleType.MAJOR },
      [KeySignature.C_FLAT_MAJOR]: { root: 'Cb4', type: ScaleType.MAJOR },
      [KeySignature.F_SHARP_MAJOR]: { root: 'F#4', type: ScaleType.MAJOR },
      [KeySignature.C_SHARP_MAJOR]: { root: 'C#4', type: ScaleType.MAJOR },
      // Minor keys
      [KeySignature.A_MINOR]: { root: 'A4', type: ScaleType.NATURAL_MINOR },
      [KeySignature.E_MINOR]: { root: 'E4', type: ScaleType.NATURAL_MINOR },
      [KeySignature.B_MINOR]: { root: 'B4', type: ScaleType.NATURAL_MINOR },
      [KeySignature.F_SHARP_MINOR]: {
        root: 'F#4',
        type: ScaleType.NATURAL_MINOR,
      },
      [KeySignature.C_SHARP_MINOR]: {
        root: 'C#4',
        type: ScaleType.NATURAL_MINOR,
      },
      [KeySignature.G_SHARP_MINOR]: {
        root: 'G#4',
        type: ScaleType.NATURAL_MINOR,
      },
      [KeySignature.D_SHARP_MINOR]: {
        root: 'D#4',
        type: ScaleType.NATURAL_MINOR,
      },
      [KeySignature.A_SHARP_MINOR]: {
        root: 'A#4',
        type: ScaleType.NATURAL_MINOR,
      },
      [KeySignature.D_MINOR]: { root: 'D4', type: ScaleType.NATURAL_MINOR },
      [KeySignature.G_MINOR]: { root: 'G4', type: ScaleType.NATURAL_MINOR },
      [KeySignature.C_MINOR]: { root: 'C4', type: ScaleType.NATURAL_MINOR },
      [KeySignature.F_MINOR]: { root: 'F4', type: ScaleType.NATURAL_MINOR },
      [KeySignature.B_FLAT_MINOR]: {
        root: 'Bb4',
        type: ScaleType.NATURAL_MINOR,
      },
      [KeySignature.E_FLAT_MINOR]: {
        root: 'Eb4',
        type: ScaleType.NATURAL_MINOR,
      },
      [KeySignature.A_FLAT_MINOR]: {
        root: 'Ab4',
        type: ScaleType.NATURAL_MINOR,
      },
    }

    const keyInfo = keyMap[keySignature] || {
      root: 'C4',
      type: ScaleType.MAJOR,
    }
    return getScaleNotes(keyInfo.root, keyInfo.type)
  }

  /**
   * Find nearest scale note to target MIDI
   */
  private findNearestScaleNote(
    targetMidi: number,
    scaleNotes: string[],
    lowestMidi: number,
    highestMidi: number
  ): string {
    let nearestNote = midiToNote(targetMidi)
    let minDistance = Infinity

    // Check all octaves of scale notes
    for (const scaleNote of scaleNotes) {
      const baseNote = scaleNote.replace(/[0-9]/g, '')

      // Try different octaves
      for (let octave = 0; octave <= 9; octave++) {
        const candidateNote = `${baseNote}${octave}`
        try {
          const candidateMidi = noteToMidi(candidateNote)

          if (candidateMidi >= lowestMidi && candidateMidi <= highestMidi) {
            const distance = Math.abs(candidateMidi - targetMidi)
            if (distance < minDistance) {
              minDistance = distance
              nearestNote = candidateNote
            }
          }
        } catch {
          // Invalid note, skip
        }
      }
    }

    return nearestNote
  }

  /**
   * Find nearest scale MIDI value
   */
  private findNearestScaleMidi(
    targetMidi: number,
    scaleNotes: string[],
    lowestMidi: number,
    highestMidi: number
  ): number {
    const nearestNote = this.findNearestScaleNote(
      targetMidi,
      scaleNotes,
      lowestMidi,
      highestMidi
    )
    return noteToMidi(nearestNote)
  }

  /**
   * Select appropriate duration for remaining time
   */
  private selectDuration(
    availableDurations: NoteDuration[],
    remainingTime: number
  ): NoteDuration {
    // Filter durations that fit
    const validDurations = availableDurations.filter(
      dur => NOTE_VALUES[dur] <= remainingTime + 0.001
    )

    if (validDurations.length === 0) {
      return NoteDuration.EIGHTH // Fallback
    }

    // Prefer variety - don't always use the longest
    if (Math.random() < 0.7 && validDurations.length > 1) {
      // Skip the longest duration sometimes
      validDurations.shift()
    }

    return validDurations[Math.floor(Math.random() * validDurations.length)]
  }

  /**
   * Get random articulation based on difficulty
   */
  private getRandomArticulation(difficulty: number): Articulation {
    const articulations: Articulation[] = [
      Articulation.STACCATO,
      Articulation.ACCENT,
    ]

    if (difficulty > 7) {
      articulations.push(Articulation.TENUTO, Articulation.MARCATO)
    }

    return articulations[Math.floor(Math.random() * articulations.length)]
  }

  /**
   * Get random dynamic marking
   */
  private getRandomDynamic(difficulty: number): DynamicMarking {
    const dynamics: DynamicMarking[] = [DynamicMarking.MF]

    if (difficulty > 4) {
      dynamics.push(DynamicMarking.F, DynamicMarking.P)
    }

    if (difficulty > 7) {
      dynamics.push(DynamicMarking.FF, DynamicMarking.PP)
    }

    return dynamics[Math.floor(Math.random() * dynamics.length)]
  }
}
