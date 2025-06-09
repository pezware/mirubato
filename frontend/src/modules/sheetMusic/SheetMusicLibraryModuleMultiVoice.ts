/**
 * Multi-Voice Extensions for SheetMusicLibraryModule
 *
 * This file extends the SheetMusicLibraryModule with multi-voice support
 * as specified in Phase 4 of the Multi-Voice Implementation Plan.
 */

import { EventBus } from '../core/EventBus'
import { EventDrivenStorage } from '../core/eventDrivenStorage'
import { SheetMusicLibraryModule } from './SheetMusicLibraryModule'
import {
  Score,
  Part,
  Staff,
  Voice,
  MultiVoiceNote,
  MultiVoiceMeasure,
  isScore,
  VOICE_CONFIGURATIONS,
} from './multiVoiceTypes'
import { ExerciseParameters } from './types'
import { nanoid } from 'nanoid'

/**
 * Extended interface for multi-voice sheet music module
 */
export interface MultiVoiceSheetMusicModuleInterface {
  // New multi-voice methods
  getScore(id: string): Promise<Score | null>
  saveScore(score: Score): Promise<void>
  generateMultiVoiceExercise(params: MultiVoiceExerciseParams): Promise<Score>
  extractVoice(score: Score, voiceId: string): Score
  extractStaff(score: Score, staffId: string): Score
  mergeVoices(score: Score, voiceIds: string[]): Score

  // Voice manipulation
  muteVoice(score: Score, voiceId: string): Score
  soloVoice(score: Score, voiceId: string): Score
  transposeVoice(score: Score, voiceId: string, semitones: number): Score

  // Analysis
  analyzeVoiceComplexity(score: Score, voiceId: string): VoiceComplexityAnalysis
  identifyVoiceLeading(score: Score): VoiceLeadingAnalysis[]
  detectPolyphonicPatterns(score: Score): PolyphonicPattern[]
}

/**
 * Parameters for multi-voice exercise generation
 */
export interface MultiVoiceExerciseParams extends ExerciseParameters {
  /** Number of voices to generate */
  voiceCount?: number
  /** Voice configuration preset */
  voicePreset?: 'piano' | 'satb' | 'duet' | 'custom'
  /** Custom voice configuration */
  customVoices?: Array<{
    id: string
    name: string
    range: { low: string; high: string }
    clef: string
  }>
  /** Whether to include counterpoint */
  includeCounterpoint?: boolean
  /** Voice independence level (0-1) */
  voiceIndependence?: number
  /** Harmonic progression to follow */
  harmonicProgression?: string[]
}

/**
 * Voice complexity analysis result
 */
export interface VoiceComplexityAnalysis {
  voiceId: string
  noteCount: number
  averageInterval: number
  rhythmicComplexity: number
  rangeSpan: number
  difficulty: number
  technicalElements: string[]
}

/**
 * Voice leading analysis
 */
export interface VoiceLeadingAnalysis {
  fromMeasure: number
  toMeasure: number
  voiceId: string
  motion: 'parallel' | 'contrary' | 'oblique' | 'similar'
  intervals: number[]
  quality: 'good' | 'acceptable' | 'poor'
}

/**
 * Polyphonic pattern detection
 */
export interface PolyphonicPattern {
  type: 'canon' | 'fugue' | 'sequence' | 'imitation'
  measures: number[]
  voices: string[]
  description: string
}

/**
 * Extended SheetMusicLibraryModule with multi-voice support
 */
export class SheetMusicLibraryModuleMultiVoice
  extends SheetMusicLibraryModule
  implements MultiVoiceSheetMusicModuleInterface
{
  constructor(eventBus: EventBus, storage: EventDrivenStorage, config?: any) {
    super(eventBus, storage, config)
  }

  // ============== Multi-Voice Score Management ==============

  async getScore(id: string): Promise<Score | null> {
    // Check if it's a converted multi-voice piece
    const key = `score:${id}`
    const score = await this.storage.read<Score>(key)

    if (score && isScore(score)) {
      return score
    }

    // Try to load from curated multi-voice pieces
    try {
      const { convertedMultiVoicePieces } = await import(
        '../../data/sheetMusic/multiVoice/convertedPieces'
      )
      const found = convertedMultiVoicePieces.find(
        piece =>
          piece.title.toLowerCase().includes(id.toLowerCase()) ||
          piece.metadata.originalFilename?.includes(id)
      )
      return found || null
    } catch {
      return null
    }
  }

  async saveScore(score: Score): Promise<void> {
    if (!isScore(score)) {
      throw new Error('Invalid score format')
    }

    const id = nanoid()
    const key = `score:${id}`

    // Add ID to metadata for retrieval
    const scoreWithId = {
      ...score,
      metadata: {
        ...score.metadata,
        id,
        modifiedAt: new Date(),
      },
    }

    await this.storage.write(key, scoreWithId)

    // Emit event
    this.eventBus.publish({
      source: 'sheet-music',
      type: 'sheet-music:score-saved',
      data: {
        scoreId: id,
        title: score.title,
        partCount: score.parts.length,
        measureCount: score.measures.length,
        timestamp: new Date(),
      },
      metadata: { version: '1.0.0' },
    })
  }

  // ============== Multi-Voice Exercise Generation ==============

  async generateMultiVoiceExercise(
    params: MultiVoiceExerciseParams
  ): Promise<Score> {
    const {
      voiceCount = 2,
      voicePreset = 'piano',
      customVoices,
      includeCounterpoint = false,
      voiceIndependence = 0.5,
      harmonicProgression,
      ...baseParams
    } = params

    // Get voice configuration
    const voiceConfig =
      customVoices || this.getVoiceConfiguration(voicePreset, voiceCount)

    // Create parts and staves based on voice configuration
    const parts = this.createParts(voiceConfig, voicePreset)
    const measures = this.generateMultiVoiceMeasures(
      baseParams,
      voiceConfig,
      includeCounterpoint,
      voiceIndependence,
      harmonicProgression
    )

    const score: Score = {
      title: `Multi-Voice Exercise`,
      composer: 'Rubato Exercise Generator',
      parts,
      measures,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        source: 'Exercise generator',
        tags: ['exercise', 'multi-voice'],
        difficulty: params.difficulty,
        duration: this.estimateMultiVoiceDuration(
          measures,
          params.tempo || 120
        ),
      },
    }

    // Save the generated exercise
    await this.saveScore(score)

    return score
  }

  // ============== Voice Extraction and Manipulation ==============

  extractVoice(score: Score, voiceId: string): Score {
    // Create a new score with only the specified voice
    const extractedMeasures: MultiVoiceMeasure[] = score.measures.map(
      measure => ({
        ...measure,
        staves: measure.staves
          .map(staff => ({
            ...staff,
            voices: staff.voices.filter(voice => voice.id === voiceId),
          }))
          .filter(staff => staff.voices.length > 0),
      })
    )

    // Keep only parts that contain the extracted voice
    const relevantParts = score.parts.filter(part =>
      extractedMeasures.some(measure =>
        measure.staves.some(
          staff => part.staves.includes(staff.id) && staff.voices.length > 0
        )
      )
    )

    return {
      ...score,
      title: `${score.title} - ${voiceId}`,
      parts: relevantParts,
      measures: extractedMeasures,
      metadata: {
        ...score.metadata,
        modifiedAt: new Date(),
        tags: [...score.metadata.tags, 'extracted-voice', voiceId],
      },
    }
  }

  extractStaff(score: Score, staffId: string): Score {
    // Create a new score with only the specified staff
    const extractedMeasures: MultiVoiceMeasure[] = score.measures.map(
      measure => ({
        ...measure,
        staves: measure.staves.filter(staff => staff.id === staffId),
      })
    )

    // Keep only parts that contain the extracted staff
    const relevantParts = score.parts.filter(part =>
      part.staves.includes(staffId)
    )

    return {
      ...score,
      title: `${score.title} - Staff ${staffId}`,
      parts: relevantParts,
      measures: extractedMeasures,
      metadata: {
        ...score.metadata,
        modifiedAt: new Date(),
        tags: [...score.metadata.tags, 'extracted-staff', staffId],
      },
    }
  }

  mergeVoices(score: Score, voiceIds: string[]): Score {
    // Merge specified voices into a single voice
    const mergedVoiceId = voiceIds.join('-')

    const mergedMeasures: MultiVoiceMeasure[] = score.measures.map(measure => ({
      ...measure,
      staves: measure.staves.map(staff => {
        const voicesToMerge = staff.voices.filter(v => voiceIds.includes(v.id))
        const otherVoices = staff.voices.filter(v => !voiceIds.includes(v.id))

        if (voicesToMerge.length === 0) {
          return staff
        }

        // Merge notes from all voices, sorted by time
        const mergedNotes: MultiVoiceNote[] = voicesToMerge
          .flatMap(v => v.notes)
          .sort((a, b) => a.time - b.time)

        const mergedVoice: Voice = {
          id: mergedVoiceId,
          name: `Merged (${voiceIds.join(', ')})`,
          notes: mergedNotes,
          stemDirection: 'auto',
        }

        return {
          ...staff,
          voices: [...otherVoices, mergedVoice],
        }
      }),
    }))

    return {
      ...score,
      measures: mergedMeasures,
      metadata: {
        ...score.metadata,
        modifiedAt: new Date(),
        tags: [...score.metadata.tags, 'merged-voices'],
      },
    }
  }

  muteVoice(score: Score, voiceId: string): Score {
    // Mark a voice as muted (for playback purposes)
    const mutedScore = { ...score }

    // Add mute metadata
    mutedScore.metadata = {
      ...score.metadata,
      mutedVoices: [...(score.metadata.mutedVoices || []), voiceId],
    }

    return mutedScore
  }

  soloVoice(score: Score, voiceId: string): Score {
    // Solo a voice (mute all others)
    const allVoiceIds = new Set<string>()

    score.measures.forEach(measure => {
      measure.staves.forEach(staff => {
        staff.voices.forEach(voice => {
          allVoiceIds.add(voice.id)
        })
      })
    })

    const voicesToMute = Array.from(allVoiceIds).filter(id => id !== voiceId)

    return {
      ...score,
      metadata: {
        ...score.metadata,
        mutedVoices: voicesToMute,
        soloVoice: voiceId,
      },
    }
  }

  transposeVoice(score: Score, voiceId: string, semitones: number): Score {
    // Transpose a specific voice by the given number of semitones
    const transposedMeasures = score.measures.map(measure => ({
      ...measure,
      staves: measure.staves.map(staff => ({
        ...staff,
        voices: staff.voices.map(voice => {
          if (voice.id !== voiceId) {
            return voice
          }

          return {
            ...voice,
            notes: voice.notes.map(note => ({
              ...note,
              keys: note.keys.map(key => this.transposeKey(key, semitones)),
            })),
          }
        }),
      })),
    }))

    return {
      ...score,
      measures: transposedMeasures,
      metadata: {
        ...score.metadata,
        modifiedAt: new Date(),
        tags: [...score.metadata.tags, `transposed-${voiceId}`],
      },
    }
  }

  // ============== Analysis Methods ==============

  analyzeVoiceComplexity(
    score: Score,
    voiceId: string
  ): VoiceComplexityAnalysis {
    const notes: MultiVoiceNote[] = []

    // Collect all notes for the voice
    score.measures.forEach(measure => {
      measure.staves.forEach(staff => {
        staff.voices.forEach(voice => {
          if (voice.id === voiceId) {
            notes.push(...voice.notes)
          }
        })
      })
    })

    if (notes.length === 0) {
      return {
        voiceId,
        noteCount: 0,
        averageInterval: 0,
        rhythmicComplexity: 0,
        rangeSpan: 0,
        difficulty: 0,
        technicalElements: [],
      }
    }

    // Calculate metrics
    const pitches = notes
      .filter(n => !n.rest)
      .flatMap(n => n.keys)
      .map(k => this.keyToPitchNumber(k))

    const intervals = []
    for (let i = 1; i < pitches.length; i++) {
      intervals.push(Math.abs(pitches[i] - pitches[i - 1]))
    }

    const averageInterval =
      intervals.length > 0
        ? intervals.reduce((sum, i) => sum + i, 0) / intervals.length
        : 0

    const rangeSpan =
      pitches.length > 0 ? Math.max(...pitches) - Math.min(...pitches) : 0

    // Analyze rhythmic complexity
    const rhythmicComplexity = this.calculateRhythmicComplexity(notes)

    // Identify technical elements
    const technicalElements = this.identifyTechnicalElements(notes)

    // Calculate overall difficulty (1-10)
    const difficulty = Math.min(
      10,
      Math.max(
        1,
        averageInterval / 4 +
          rangeSpan / 12 +
          rhythmicComplexity * 3 +
          technicalElements.length / 2
      )
    )

    return {
      voiceId,
      noteCount: notes.length,
      averageInterval,
      rhythmicComplexity,
      rangeSpan,
      difficulty: Math.round(difficulty),
      technicalElements,
    }
  }

  identifyVoiceLeading(_score: Score): VoiceLeadingAnalysis[] {
    // TODO: Implement voice leading analysis
    // This would analyze the motion between voices across measures
    return []
  }

  detectPolyphonicPatterns(_score: Score): PolyphonicPattern[] {
    // TODO: Implement polyphonic pattern detection
    // This would identify canons, fugues, sequences, etc.
    return []
  }

  // ============== Private Helper Methods ==============

  private getVoiceConfiguration(preset: string, voiceCount: number): any[] {
    switch (preset) {
      case 'piano':
        return [
          {
            id: 'rightHand',
            name: 'Right Hand',
            range: { low: 'c/4', high: 'c/7' },
            clef: 'treble',
          },
          {
            id: 'leftHand',
            name: 'Left Hand',
            range: { low: 'a/1', high: 'c/5' },
            clef: 'bass',
          },
        ]
      case 'satb':
        return VOICE_CONFIGURATIONS.satb.voices.slice(0, voiceCount)
      case 'duet':
        return [
          {
            id: 'voice1',
            name: 'Voice 1',
            range: { low: 'c/4', high: 'g/5' },
            clef: 'treble',
          },
          {
            id: 'voice2',
            name: 'Voice 2',
            range: { low: 'g/3', high: 'e/5' },
            clef: 'treble',
          },
        ]
      default:
        // Generate generic voices
        const voices = []
        for (let i = 0; i < voiceCount; i++) {
          voices.push({
            id: `voice${i + 1}`,
            name: `Voice ${i + 1}`,
            range: { low: 'c/3', high: 'c/6' },
            clef: 'treble',
          })
        }
        return voices
    }
  }

  private createParts(voiceConfig: any[], preset: string): Part[] {
    if (preset === 'piano') {
      return [
        {
          id: 'piano',
          name: 'Piano',
          instrument: 'piano',
          staves: ['treble-staff', 'bass-staff'],
          midiProgram: 0,
          volume: 100,
        },
      ]
    }

    // For other presets, create individual parts
    return voiceConfig.map(voice => ({
      id: voice.id,
      name: voice.name,
      instrument: preset === 'satb' ? 'voice' : 'instrument',
      staves: [`${voice.id}-staff`],
      midiProgram: preset === 'satb' ? 52 : 0, // Choir Aahs for SATB
      volume: 100,
    }))
  }

  private generateMultiVoiceMeasures(
    params: ExerciseParameters,
    voiceConfig: any[],
    includeCounterpoint: boolean,
    voiceIndependence: number,
    harmonicProgression?: string[]
  ): MultiVoiceMeasure[] {
    // This is a simplified implementation
    // In a real implementation, this would generate complex multi-voice exercises

    const measures: MultiVoiceMeasure[] = []
    const measureCount = params.measures || 8

    for (let i = 0; i < measureCount; i++) {
      const staves: Staff[] = []

      // Create staves based on voice configuration
      if (params.instrumentParams?.instrument === 'piano') {
        // Grand staff for piano
        staves.push(
          {
            id: 'treble-staff',
            clef: 'treble' as any,
            voices: this.generateVoicesForStaff(
              voiceConfig.filter(v => v.clef === 'treble'),
              params,
              i,
              includeCounterpoint,
              voiceIndependence
            ),
          },
          {
            id: 'bass-staff',
            clef: 'bass' as any,
            voices: this.generateVoicesForStaff(
              voiceConfig.filter(v => v.clef === 'bass'),
              params,
              i,
              includeCounterpoint,
              voiceIndependence
            ),
          }
        )
      } else {
        // Individual staves for other instruments
        voiceConfig.forEach(voice => {
          staves.push({
            id: `${voice.id}-staff`,
            clef: voice.clef as any,
            voices: [
              {
                id: voice.id,
                name: voice.name,
                notes: this.generateNotesForVoice(
                  voice,
                  params,
                  i,
                  harmonicProgression
                ),
              },
            ],
          })
        })
      }

      measures.push({
        number: i + 1,
        staves,
        timeSignature: i === 0 ? params.timeSignature : undefined,
        keySignature: i === 0 ? params.keySignature : undefined,
        tempo: i === 0 ? params.tempo : undefined,
      })
    }

    return measures
  }

  private generateVoicesForStaff(
    voiceConfigs: any[],
    params: ExerciseParameters,
    measureIndex: number,
    _includeCounterpoint: boolean,
    _voiceIndependence: number
  ): Voice[] {
    return voiceConfigs.map(config => ({
      id: config.id,
      name: config.name,
      notes: this.generateNotesForVoice(config, params, measureIndex),
    }))
  }

  private generateNotesForVoice(
    _voiceConfig: any,
    _params: ExerciseParameters,
    _measureIndex: number,
    _harmonicProgression?: string[]
  ): MultiVoiceNote[] {
    // Simplified note generation
    // In a real implementation, this would generate appropriate notes
    // based on the voice range, harmonic progression, etc.

    return [
      {
        keys: ['c/4'],
        duration: 'q' as any,
        time: 0,
        voiceId: _voiceConfig.id,
      },
      {
        keys: ['e/4'],
        duration: 'q' as any,
        time: 1,
        voiceId: _voiceConfig.id,
      },
      {
        keys: ['g/4'],
        duration: 'q' as any,
        time: 2,
        voiceId: _voiceConfig.id,
      },
      {
        keys: ['c/5'],
        duration: 'q' as any,
        time: 3,
        voiceId: _voiceConfig.id,
      },
    ]
  }

  private transposeKey(key: string, semitones: number): string {
    // Parse the key (e.g., "c/4" -> note: "c", octave: 4)
    const match = key.match(/^([a-g][#b]?)\/(\d)$/)
    if (!match) return key

    const [, note, octave] = match
    const noteIndex = this.noteToIndex(note)
    const newIndex = noteIndex + semitones

    // Calculate new octave and note
    const newOctave = parseInt(octave) + Math.floor(newIndex / 12)
    const newNoteIndex = ((newIndex % 12) + 12) % 12
    const newNote = this.indexToNote(newNoteIndex)

    return `${newNote}/${newOctave}`
  }

  private keyToPitchNumber(key: string): number {
    const match = key.match(/^([a-g][#b]?)\/(\d)$/)
    if (!match) return 60 // Default to middle C

    const [, note, octave] = match
    const noteIndex = this.noteToIndex(note)
    return (parseInt(octave) + 1) * 12 + noteIndex
  }

  private noteToIndex(note: string): number {
    const noteMap: Record<string, number> = {
      c: 0,
      'c#': 1,
      db: 1,
      d: 2,
      'd#': 3,
      eb: 3,
      e: 4,
      f: 5,
      'f#': 6,
      gb: 6,
      g: 7,
      'g#': 8,
      ab: 8,
      a: 9,
      'a#': 10,
      bb: 10,
      b: 11,
    }
    return noteMap[note.toLowerCase()] || 0
  }

  private indexToNote(index: number): string {
    const notes = [
      'c',
      'c#',
      'd',
      'd#',
      'e',
      'f',
      'f#',
      'g',
      'g#',
      'a',
      'a#',
      'b',
    ]
    return notes[index]
  }

  private calculateRhythmicComplexity(notes: MultiVoiceNote[]): number {
    // Count different rhythm values
    const rhythmTypes = new Set(notes.map(n => n.duration))
    const hasDots = notes.some(n => n.dots)
    const hasTies = notes.some(n => n.tie)

    let complexity = rhythmTypes.size / 8 // Normalize by typical rhythm count
    if (hasDots) complexity += 0.2
    if (hasTies) complexity += 0.3

    return Math.min(1, complexity)
  }

  private identifyTechnicalElements(notes: MultiVoiceNote[]): string[] {
    const elements = new Set<string>()

    // Check for various technical elements
    if (notes.some(n => n.keys.length > 1)) elements.add('chords')
    if (notes.some(n => n.grace)) elements.add('grace notes')
    if (notes.some(n => n.ornaments && n.ornaments.length > 0))
      elements.add('ornaments')
    if (notes.some(n => n.articulation)) elements.add('articulations')

    // Check for large intervals
    const intervals = []
    for (let i = 1; i < notes.length; i++) {
      if (!notes[i].rest && !notes[i - 1].rest) {
        const interval = Math.abs(
          this.keyToPitchNumber(notes[i].keys[0]) -
            this.keyToPitchNumber(notes[i - 1].keys[0])
        )
        intervals.push(interval)
      }
    }

    if (intervals.some(i => i > 12)) elements.add('large intervals')
    if (intervals.some(i => i > 7)) elements.add('octaves')

    return Array.from(elements)
  }

  private estimateMultiVoiceDuration(
    measures: MultiVoiceMeasure[],
    tempo: number
  ): number {
    // Estimate based on 4/4 time signature as default
    const beatsPerMeasure = 4
    const secondsPerBeat = 60 / tempo
    const secondsPerMeasure = beatsPerMeasure * secondsPerBeat

    return Math.ceil(measures.length * secondsPerMeasure)
  }
}

// Add to Score metadata interface
declare module './multiVoiceTypes' {
  interface ScoreMetadata {
    id?: string
    mutedVoices?: string[]
    soloVoice?: string
  }
}
