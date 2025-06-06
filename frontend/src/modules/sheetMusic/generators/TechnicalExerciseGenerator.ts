/**
 * Technical Exercise Generator
 *
 * Generates technical exercises including scales, arpeggios, and Hanon-style patterns.
 * Supports instrument-specific fingering suggestions for piano and guitar.
 */

import { ExerciseGenerator } from './ExerciseGenerator'
import {
  ExerciseParameters,
  Measure,
  Note,
  NoteDuration,
  ScaleType,
  KeySignature,
  getScaleNotes,
  getChordNotes,
  noteToMidi,
} from '../types'

/**
 * Parameters specific to technical exercises
 */
export interface TechnicalExerciseParameters extends ExerciseParameters {
  /** Type of technical exercise (scale, arpeggio, etc.) */
  technicalType: 'scale' | 'arpeggio' | 'hanon' | 'mixed'
  /** Scale type for scale exercises */
  scaleType?: ScaleType
  /** Arpeggio type (major, minor, diminished, augmented) */
  arpeggioType?: 'major' | 'minor' | 'diminished' | 'augmented' | 'dominant7'
  /** Pattern for Hanon-style exercises */
  hanonPattern?: number[]
  /** Whether to include reverse/descending patterns */
  includeDescending?: boolean
  /** Number of octaves to span */
  octaves?: number
}

/**
 * Generates technical exercises for practice
 */
export class TechnicalExerciseGenerator extends ExerciseGenerator {
  /**
   * Generate technical exercise measures
   */
  generate(params: TechnicalExerciseParameters): Measure[] {
    this.validateParameters(params)
    const constrainedParams = this.constrainToClefRange(params)

    // Default to scale exercise if no type specified
    const technicalParams: TechnicalExerciseParameters = {
      ...constrainedParams,
      technicalType: params.technicalType || 'scale',
      scaleType: params.scaleType || ScaleType.MAJOR,
      includeDescending: params.includeDescending ?? true,
      octaves: params.octaves || 1,
    }

    switch (technicalParams.technicalType) {
      case 'scale':
        return this.generateScaleExercise(technicalParams)
      case 'arpeggio':
        return this.generateArpeggioExercise(technicalParams)
      case 'hanon':
        return this.generateHanonExercise(technicalParams)
      case 'mixed':
        return this.generateMixedExercise(technicalParams)
      default:
        return this.generateScaleExercise(technicalParams)
    }
  }

  /**
   * Generate scale pattern exercise
   */
  private generateScaleExercise(
    params: TechnicalExerciseParameters
  ): Measure[] {
    const measures: Measure[] = []
    const scaleNotes = getScaleNotes(
      this.getKeyRoot(params.keySignature),
      params.scaleType || ScaleType.MAJOR
    )

    // Generate ascending and descending patterns
    const duration = this.getScaleDuration(params.difficulty)
    let measureNumber = 1
    let currentMeasure = this.generateMeasure(measureNumber, params)
    let currentTime = 0

    // Generate notes for the specified number of octaves
    const allNotes: string[] = []
    const startOctave = parseInt(params.range.lowest[1])

    for (let octave = 0; octave < (params.octaves || 1); octave++) {
      for (const scaleNote of scaleNotes) {
        const note = `${scaleNote}${startOctave + octave}`
        if (
          noteToMidi(note) >= noteToMidi(params.range.lowest) &&
          noteToMidi(note) <= noteToMidi(params.range.highest)
        ) {
          allNotes.push(note)
        }
      }
    }

    // Add the root note of the next octave if within range
    const topRoot = `${scaleNotes[0]}${startOctave + (params.octaves || 1)}`
    if (noteToMidi(topRoot) <= noteToMidi(params.range.highest)) {
      allNotes.push(topRoot)
    }

    // Generate ascending pattern
    for (const noteName of allNotes) {
      const note = this.createTechnicalNote(
        noteName,
        duration,
        currentTime,
        params
      )
      currentMeasure.notes.push(note)
      currentTime += this.getNoteDurationValue(duration)

      // Check if measure is complete
      if (this.isMeasureComplete(currentMeasure, params.timeSignature)) {
        measures.push(currentMeasure)
        measureNumber++
        currentMeasure = this.generateMeasure(measureNumber, params)
        currentTime = 0
      }
    }

    // Generate descending pattern if requested
    if (params.includeDescending) {
      const descendingNotes = [...allNotes].reverse()
      for (const noteName of descendingNotes) {
        const note = this.createTechnicalNote(
          noteName,
          duration,
          currentTime,
          params
        )
        currentMeasure.notes.push(note)
        currentTime += this.getNoteDurationValue(duration)

        if (this.isMeasureComplete(currentMeasure, params.timeSignature)) {
          measures.push(currentMeasure)
          measureNumber++
          currentMeasure = this.generateMeasure(measureNumber, params)
          currentTime = 0
        }
      }
    }

    // Add any incomplete measure
    if (currentMeasure.notes.length > 0) {
      this.addRestsToCompleteMeasure(currentMeasure, params.timeSignature)
      measures.push(currentMeasure)
    }

    // Ensure we have at least the requested number of measures
    while (measures.length < params.measures) {
      measureNumber++
      const emptyMeasure = this.generateMeasure(measureNumber, params)
      this.addRestsToCompleteMeasure(emptyMeasure, params.timeSignature)
      measures.push(emptyMeasure)
    }

    return measures.slice(0, params.measures)
  }

  /**
   * Generate arpeggio pattern exercise
   */
  private generateArpeggioExercise(
    params: TechnicalExerciseParameters
  ): Measure[] {
    const measures: Measure[] = []
    const root = this.getKeyRoot(params.keySignature)
    const chordType = params.arpeggioType || 'major'
    const chordNotes = getChordNotes(root, chordType)

    const duration = this.getArpeggioDuration(params.difficulty)
    let measureNumber = 1
    let currentMeasure = this.generateMeasure(measureNumber, params)
    let currentTime = 0

    // Generate arpeggio patterns for specified octaves
    const allNotes: string[] = []
    const startOctave = parseInt(params.range.lowest[1])

    for (let octave = 0; octave < (params.octaves || 1); octave++) {
      for (const chordNote of chordNotes) {
        const note = `${chordNote}${startOctave + octave}`
        if (
          noteToMidi(note) >= noteToMidi(params.range.lowest) &&
          noteToMidi(note) <= noteToMidi(params.range.highest)
        ) {
          allNotes.push(note)
        }
      }
    }

    // Add top root note
    const topRoot = `${chordNotes[0]}${startOctave + (params.octaves || 1)}`
    if (noteToMidi(topRoot) <= noteToMidi(params.range.highest)) {
      allNotes.push(topRoot)
    }

    // Generate ascending arpeggio
    for (const noteName of allNotes) {
      const note = this.createTechnicalNote(
        noteName,
        duration,
        currentTime,
        params
      )
      currentMeasure.notes.push(note)
      currentTime += this.getNoteDurationValue(duration)

      if (this.isMeasureComplete(currentMeasure, params.timeSignature)) {
        measures.push(currentMeasure)
        measureNumber++
        currentMeasure = this.generateMeasure(measureNumber, params)
        currentTime = 0
      }
    }

    // Generate descending pattern if requested
    if (params.includeDescending) {
      const descendingNotes = [...allNotes].reverse()
      for (const noteName of descendingNotes) {
        const note = this.createTechnicalNote(
          noteName,
          duration,
          currentTime,
          params
        )
        currentMeasure.notes.push(note)
        currentTime += this.getNoteDurationValue(duration)

        if (this.isMeasureComplete(currentMeasure, params.timeSignature)) {
          measures.push(currentMeasure)
          measureNumber++
          currentMeasure = this.generateMeasure(measureNumber, params)
          currentTime = 0
        }
      }
    }

    // Complete and add remaining measures
    if (currentMeasure.notes.length > 0) {
      this.addRestsToCompleteMeasure(currentMeasure, params.timeSignature)
      measures.push(currentMeasure)
    }

    while (measures.length < params.measures) {
      measureNumber++
      const emptyMeasure = this.generateMeasure(measureNumber, params)
      this.addRestsToCompleteMeasure(emptyMeasure, params.timeSignature)
      measures.push(emptyMeasure)
    }

    return measures.slice(0, params.measures)
  }

  /**
   * Generate Hanon-style technical exercise
   */
  private generateHanonExercise(
    params: TechnicalExerciseParameters
  ): Measure[] {
    const measures: Measure[] = []
    const pattern = params.hanonPattern || [1, 3, 5, 6, 5, 3] // Classic Hanon pattern
    const duration = NoteDuration.SIXTEENTH // Hanon exercises typically use 16th notes

    let measureNumber = 1
    let currentMeasure = this.generateMeasure(measureNumber, params)
    let currentTime = 0

    // Get scale notes for pattern
    const scaleNotes = getScaleNotes(
      this.getKeyRoot(params.keySignature),
      ScaleType.MAJOR
    )

    // Generate pattern starting from each scale degree
    for (let startDegree = 0; startDegree < 7; startDegree++) {
      // Apply pattern
      for (const interval of pattern) {
        const scaleDegree = (startDegree + interval - 1) % 7
        const octaveOffset = Math.floor((startDegree + interval - 1) / 7)
        const baseOctave = parseInt(params.range.lowest[1])
        const noteName = `${scaleNotes[scaleDegree]}${baseOctave + octaveOffset}`

        // Check if note is within range
        if (
          noteToMidi(noteName) >= noteToMidi(params.range.lowest) &&
          noteToMidi(noteName) <= noteToMidi(params.range.highest)
        ) {
          const note = this.createTechnicalNote(
            noteName,
            duration,
            currentTime,
            params
          )
          currentMeasure.notes.push(note)
          currentTime += this.getNoteDurationValue(duration)

          if (this.isMeasureComplete(currentMeasure, params.timeSignature)) {
            measures.push(currentMeasure)
            measureNumber++
            if (measures.length >= params.measures) {
              return measures.slice(0, params.measures)
            }
            currentMeasure = this.generateMeasure(measureNumber, params)
            currentTime = 0
          }
        }
      }
    }

    // Complete remaining measures
    if (currentMeasure.notes.length > 0) {
      this.addRestsToCompleteMeasure(currentMeasure, params.timeSignature)
      measures.push(currentMeasure)
    }

    while (measures.length < params.measures) {
      measureNumber++
      const emptyMeasure = this.generateMeasure(measureNumber, params)
      this.addRestsToCompleteMeasure(emptyMeasure, params.timeSignature)
      measures.push(emptyMeasure)
    }

    return measures.slice(0, params.measures)
  }

  /**
   * Generate mixed technical exercise combining scales and arpeggios
   */
  private generateMixedExercise(
    params: TechnicalExerciseParameters
  ): Measure[] {
    const measures: Measure[] = []
    const halfMeasures = Math.floor(params.measures / 2)

    // Generate scale section
    const scaleParams = { ...params, measures: halfMeasures }
    const scaleMeasures = this.generateScaleExercise(scaleParams)
    measures.push(...scaleMeasures)

    // Generate arpeggio section
    const arpeggioParams = {
      ...params,
      measures: params.measures - halfMeasures,
    }
    const arpeggioMeasures = this.generateArpeggioExercise(arpeggioParams)

    // Adjust measure numbers for arpeggio section
    arpeggioMeasures.forEach((measure, index) => {
      measure.number = halfMeasures + index + 1
    })

    measures.push(...arpeggioMeasures)

    return measures
  }

  /**
   * Create a technical exercise note with appropriate fingering
   */
  private createTechnicalNote(
    noteName: string,
    duration: NoteDuration,
    time: number,
    params: TechnicalExerciseParameters
  ): Note {
    const vexKey = this.noteToVexFlow(noteName)
    const note: Note = {
      keys: [vexKey],
      duration,
      time,
    }

    // Apply key signature
    this.applyKeySignature(note, params.keySignature)

    // Add fingering if requested
    if (params.includeFingerings && params.instrumentParams) {
      const fingering = this.getFingeringForNote(noteName, params)
      if (fingering) {
        note.fingering = fingering
      }
    }

    return note
  }

  /**
   * Get appropriate fingering for a note based on instrument
   */
  private getFingeringForNote(
    noteName: string,
    params: TechnicalExerciseParameters
  ): string | undefined {
    if (!params.instrumentParams) return undefined

    switch (params.instrumentParams.instrument) {
      case 'piano':
        return this.getPianoFingering(noteName, params)
      case 'guitar':
        return this.getGuitarFingering(noteName, params)
      default:
        return undefined
    }
  }

  /**
   * Get piano fingering for a note in a scale or arpeggio
   */
  private getPianoFingering(
    noteName: string,
    params: TechnicalExerciseParameters
  ): string {
    // Standard scale fingerings for right hand
    const scaleFingeringPatterns: Record<string, string[]> = {
      major: ['1', '2', '3', '1', '2', '3', '4', '5'],
      minor: ['1', '2', '3', '1', '2', '3', '4', '5'],
    }

    // Arpeggio fingerings
    const arpeggioFingeringPatterns: Record<string, string[]> = {
      major: ['1', '3', '5'],
      minor: ['1', '3', '5'],
      diminished: ['1', '2', '4'],
      dominant7: ['1', '2', '3', '5'],
      augmented: ['1', '3', '5'],
    }

    if (params.technicalType === 'scale') {
      // Map ScaleType enum to string keys
      const scaleTypeKey =
        params.scaleType === ScaleType.MAJOR
          ? 'major'
          : params.scaleType === ScaleType.NATURAL_MINOR
            ? 'minor'
            : 'major'
      const pattern = scaleFingeringPatterns[scaleTypeKey]
      const scaleNotes = getScaleNotes(
        this.getKeyRoot(params.keySignature),
        params.scaleType || ScaleType.MAJOR
      )
      const noteIndex = scaleNotes.findIndex(n => noteName.startsWith(n))
      return pattern[noteIndex % pattern.length]
    } else if (params.technicalType === 'arpeggio') {
      const pattern =
        arpeggioFingeringPatterns[params.arpeggioType || 'major'] ||
        arpeggioFingeringPatterns.major
      const chordNotes = getChordNotes(
        this.getKeyRoot(params.keySignature),
        params.arpeggioType || 'major'
      )
      const noteIndex = chordNotes.findIndex(n => noteName.startsWith(n))
      return pattern[noteIndex % pattern.length]
    }

    return '1' // Default fingering
  }

  /**
   * Get guitar fingering for a note
   */
  private getGuitarFingering(
    noteName: string,
    params: TechnicalExerciseParameters
  ): string {
    // Simplified guitar fingering based on fret position
    // In real implementation, this would consider position, string, and context
    const midi = noteToMidi(noteName)
    const position = params.instrumentParams?.guitar?.position || 1

    // Basic finger assignment based on fret position
    const fret = (midi - 40) % 12 // Simplified calculation
    const finger = ((fret - position + 1) % 4) + 1

    return finger.toString()
  }

  /**
   * Get the root note of a key signature
   */
  private getKeyRoot(keySignature: KeySignature): string {
    const keyName = keySignature.replace(/_/g, ' ').split(' ')[0]
    const rootNote =
      keyName.charAt(0).toUpperCase() + keyName.slice(1).toLowerCase()

    // Handle special cases for flat keys
    if (keySignature.includes('_FLAT_')) {
      if (rootNote.length === 1) {
        return `${rootNote}b`
      }
    } else if (keySignature.includes('_SHARP_')) {
      if (rootNote.length === 1) {
        return `${rootNote}#`
      }
    }

    return rootNote
  }

  /**
   * Get appropriate note duration for scales based on difficulty
   */
  private getScaleDuration(difficulty: number): NoteDuration {
    if (difficulty <= 3) return NoteDuration.QUARTER
    if (difficulty <= 6) return NoteDuration.EIGHTH
    return NoteDuration.SIXTEENTH
  }

  /**
   * Get appropriate note duration for arpeggios based on difficulty
   */
  private getArpeggioDuration(difficulty: number): NoteDuration {
    if (difficulty <= 4) return NoteDuration.QUARTER
    if (difficulty <= 7) return NoteDuration.EIGHTH
    return NoteDuration.SIXTEENTH
  }

  /**
   * Get numeric value of note duration
   */
  private getNoteDurationValue(duration: NoteDuration): number {
    const values: Record<NoteDuration, number> = {
      [NoteDuration.WHOLE]: 4,
      [NoteDuration.HALF]: 2,
      [NoteDuration.QUARTER]: 1,
      [NoteDuration.EIGHTH]: 0.5,
      [NoteDuration.SIXTEENTH]: 0.25,
      [NoteDuration.THIRTY_SECOND]: 0.125,
    }
    return values[duration] || 1
  }
}
