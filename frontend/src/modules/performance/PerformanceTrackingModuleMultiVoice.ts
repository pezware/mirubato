/**
 * Multi-Voice Extensions for PerformanceTrackingModule
 *
 * This file extends the PerformanceTrackingModule with multi-voice support
 * as specified in Phase 4 of the Multi-Voice Implementation Plan.
 */

import { PerformanceTrackingModule } from './PerformanceTrackingModule'
import {
  PerformanceData,
  PerformanceAnalysis,
  PerformanceMetrics,
  NoteEventData,
  ProblemArea,
  Recommendation,
} from './types'
import { Score } from '../sheetMusic/multiVoiceTypes'

/**
 * Extended performance data for multi-voice tracking
 */
export interface MultiVoicePerformanceData extends PerformanceData {
  /** Voice-specific performance data */
  voiceData?: {
    voiceId: string
    staffId: string
    handPosition?: 'left' | 'right'
  }
  /** Polyphonic context */
  polyphonicContext?: {
    simultaneousNotes: number
    voiceCount: number
    harmonicInterval?: number
  }
}

/**
 * Voice-specific performance metrics
 */
export interface VoicePerformanceMetrics extends PerformanceMetrics {
  voiceId: string
  handIndependenceScore?: number
  voiceLeadingAccuracy?: number
  polyphonicAccuracy?: number
}

/**
 * Hand independence metrics for piano
 */
export interface HandIndependenceMetrics {
  leftHandAccuracy: number
  rightHandAccuracy: number
  handCoordination: number
  rhythmicIndependence: number
  dynamicIndependence: number
}

/**
 * Polyphonic performance analysis
 */
export interface PolyphonicPerformanceAnalysis extends PerformanceAnalysis {
  /** Metrics per voice */
  voiceMetrics: VoicePerformanceMetrics[]
  /** Hand independence analysis (for piano) */
  handIndependence?: HandIndependenceMetrics
  /** Voice-specific problem areas */
  voiceProblems: Map<string, ProblemArea[]>
  /** Polyphonic-specific recommendations */
  polyphonicRecommendations: Recommendation[]
}

/**
 * Extended PerformanceTrackingModule with multi-voice support
 */
export class PerformanceTrackingModuleMultiVoice extends PerformanceTrackingModule {
  private currentScore: Score | null = null
  private voicePerformanceData: Map<string, MultiVoicePerformanceData[]> =
    new Map()

  // ============== Multi-Voice Performance Tracking ==============

  /**
   * Set the current score being practiced
   */
  setCurrentScore(score: Score): void {
    this.currentScore = score
    this.voicePerformanceData.clear()

    // Initialize voice tracking
    score.measures.forEach(measure => {
      measure.staves.forEach(staff => {
        staff.voices.forEach(voice => {
          if (!this.voicePerformanceData.has(voice.id)) {
            this.voicePerformanceData.set(voice.id, [])
          }
        })
      })
    })
  }

  /**
   * Record a multi-voice note event
   */
  async recordMultiVoiceNoteEvent(
    data: NoteEventData & {
      voiceId?: string
      staffId?: string
      simultaneousNotes?: number
    }
  ): Promise<void> {
    // Call parent method first
    await super.recordNoteEvent(data)

    if (!data.voiceId || !this.currentScore) {
      return
    }

    // Create multi-voice performance data
    const mvData: MultiVoicePerformanceData = {
      id: `mv_perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.currentSessionId || '',
      userId: data.userId || 'anonymous',
      timestamp: Date.now(),
      noteEvent: this.parseNoteEvent(data),
      timing: this.parseTimingData(data),
      accuracy: this.calculateAccuracy(data),
      difficulty: this.assessDifficulty(data),
      voiceData: {
        voiceId: data.voiceId,
        staffId: data.staffId || '',
        handPosition: this.determineHandPosition(data.staffId),
      },
      polyphonicContext: {
        simultaneousNotes: data.simultaneousNotes || 1,
        voiceCount: this.countActiveVoices(data.measure || 1, data.beat || 1),
        harmonicInterval: this.calculateHarmonicInterval(data),
      },
    }

    // Store voice-specific data
    const voiceData = this.voicePerformanceData.get(data.voiceId) || []
    voiceData.push(mvData)
    this.voicePerformanceData.set(data.voiceId, voiceData)
  }

  /**
   * Generate polyphonic performance analysis
   */
  async generatePolyphonicAnalysis(
    sessionId: string
  ): Promise<PolyphonicPerformanceAnalysis> {
    const baseAnalysis = await super.generatePerformanceAnalysis(sessionId)

    // Calculate voice-specific metrics
    const voiceMetrics: VoicePerformanceMetrics[] = []
    const voiceProblems = new Map<string, ProblemArea[]>()

    for (const [voiceId, voiceData] of this.voicePerformanceData) {
      const metrics = this.calculateVoiceMetrics(voiceId, voiceData)
      voiceMetrics.push(metrics)

      const problems = this.identifyVoiceProblems(voiceId, voiceData)
      voiceProblems.set(voiceId, problems)
    }

    // Calculate hand independence metrics (if piano)
    const handIndependence = this.calculateHandIndependence()

    // Generate polyphonic recommendations
    const polyphonicRecommendations = this.generatePolyphonicRecommendations(
      voiceMetrics,
      handIndependence
    )

    return {
      ...baseAnalysis,
      voiceMetrics,
      handIndependence: handIndependence || undefined,
      voiceProblems,
      polyphonicRecommendations,
    }
  }

  /**
   * Track performance per voice
   */
  getVoicePerformance(voiceId: string): VoicePerformanceMetrics | null {
    const voiceData = this.voicePerformanceData.get(voiceId)
    if (!voiceData || voiceData.length === 0) {
      return null
    }

    return this.calculateVoiceMetrics(voiceId, voiceData)
  }

  /**
   * Get hand independence metrics
   */
  getHandIndependenceMetrics(): HandIndependenceMetrics | null {
    if (
      !this.currentScore ||
      this.currentScore.parts[0]?.instrument !== 'piano'
    ) {
      return null
    }

    return this.calculateHandIndependence()
  }

  /**
   * Identify problematic voice combinations
   */
  identifyPolyphonicProblems(): PolyphonicProblem[] {
    const problems: PolyphonicProblem[] = []

    // Analyze voice combinations with high error rates
    const voiceCombinations = this.analyzeVoiceCombinations()

    for (const combo of voiceCombinations) {
      if (combo.errorRate > 0.3) {
        problems.push({
          type: 'voice-coordination',
          voices: combo.voices,
          errorRate: combo.errorRate,
          measures: combo.problematicMeasures,
          description: `Difficulty coordinating ${combo.voices.join(' and ')}`,
          severity: combo.errorRate > 0.5 ? 'high' : 'medium',
        })
      }
    }

    return problems
  }

  // ============== Private Helper Methods ==============

  private determineHandPosition(
    staffId?: string
  ): 'left' | 'right' | undefined {
    if (!staffId || !this.currentScore) return undefined

    // For piano, typically treble staff = right hand, bass staff = left hand
    if (staffId.includes('treble') || staffId === 'P1-staff1') {
      return 'right'
    } else if (staffId.includes('bass') || staffId === 'P1-staff2') {
      return 'left'
    }

    return undefined
  }

  private countActiveVoices(measureNumber: number, beat: number): number {
    if (!this.currentScore) return 1

    const measure = this.currentScore.measures[measureNumber - 1]
    if (!measure) return 1

    let activeVoices = 0
    measure.staves.forEach(staff => {
      staff.voices.forEach(voice => {
        // Check if voice has notes at this beat
        const hasNoteAtBeat = voice.notes.some(
          note =>
            note.time <= beat &&
            note.time + this.getNoteDurationInBeats(note.duration) > beat
        )
        if (hasNoteAtBeat) activeVoices++
      })
    })

    return activeVoices
  }

  private calculateHarmonicInterval(_data: NoteEventData): number | undefined {
    // This would calculate the interval between simultaneous notes
    // Simplified for now
    return undefined
  }

  private calculateVoiceMetrics(
    voiceId: string,
    voiceData: MultiVoicePerformanceData[]
  ): VoicePerformanceMetrics {
    const baseMetrics = this.calculateOverallMetrics(voiceData)

    // Calculate voice-specific metrics
    const handIndependenceScore = this.calculateVoiceIndependence(voiceData)
    const voiceLeadingAccuracy = this.calculateVoiceLeadingAccuracy(voiceData)
    const polyphonicAccuracy = this.calculatePolyphonicAccuracy(voiceData)

    return {
      ...baseMetrics,
      voiceId,
      handIndependenceScore,
      voiceLeadingAccuracy,
      polyphonicAccuracy,
    }
  }

  private calculateVoiceIndependence(
    voiceData: MultiVoicePerformanceData[]
  ): number {
    // Measure how well the voice maintains independence
    const timingVariances = voiceData.map(d => Math.abs(d.timing.delta))
    const avgVariance =
      timingVariances.reduce((sum, v) => sum + v, 0) / timingVariances.length

    // Lower variance = better independence
    return Math.max(0, 100 - avgVariance)
  }

  private calculateVoiceLeadingAccuracy(
    _voiceData: MultiVoicePerformanceData[]
  ): number {
    // Would analyze smooth voice leading
    // Placeholder implementation
    return 85
  }

  private calculatePolyphonicAccuracy(
    voiceData: MultiVoicePerformanceData[]
  ): number {
    // Accuracy when playing with other voices
    const polyphonicNotes = voiceData.filter(
      d => d.polyphonicContext && d.polyphonicContext.voiceCount > 1
    )

    if (polyphonicNotes.length === 0) return 100

    const correctPolyphonic = polyphonicNotes.filter(
      d => d.accuracy.isCorrect
    ).length
    return (correctPolyphonic / polyphonicNotes.length) * 100
  }

  private identifyVoiceProblems(
    voiceId: string,
    voiceData: MultiVoicePerformanceData[]
  ): ProblemArea[] {
    const problems: ProblemArea[] = []

    // Check for voice-specific timing issues
    const timingErrors = voiceData.filter(
      d => Math.abs(d.timing.delta) > this.config.timingToleranceMs
    )

    if (timingErrors.length / voiceData.length > 0.2) {
      problems.push({
        type: 'timing',
        description: `Voice ${voiceId}: Inconsistent timing`,
        severity:
          timingErrors.length / voiceData.length > 0.4 ? 'high' : 'medium',
        frequency: timingErrors.length / voiceData.length,
        measures: [...new Set(timingErrors.map(d => d.noteEvent.measure))],
        suggestions: [
          `Practice ${voiceId} voice separately`,
          'Use slower tempo for this voice',
          'Focus on rhythmic precision',
        ],
      })
    }

    // Check for polyphonic coordination issues
    const polyErrors = voiceData.filter(
      d =>
        d.polyphonicContext &&
        d.polyphonicContext.voiceCount > 1 &&
        !d.accuracy.isCorrect
    )

    if (polyErrors.length / voiceData.length > 0.25) {
      problems.push({
        type: 'coordination',
        description: `Voice ${voiceId}: Difficulty with polyphonic coordination`,
        severity: 'high',
        frequency: polyErrors.length / voiceData.length,
        measures: [...new Set(polyErrors.map(d => d.noteEvent.measure))],
        suggestions: [
          'Practice voices separately first',
          'Slowly combine voices',
          'Focus on vertical alignment',
        ],
      })
    }

    return problems
  }

  private calculateHandIndependence(): HandIndependenceMetrics | null {
    const leftHandData = Array.from(this.voicePerformanceData.values())
      .flat()
      .filter(d => d.voiceData?.handPosition === 'left')

    const rightHandData = Array.from(this.voicePerformanceData.values())
      .flat()
      .filter(d => d.voiceData?.handPosition === 'right')

    if (leftHandData.length === 0 || rightHandData.length === 0) {
      return null
    }

    const leftMetrics = this.calculateOverallMetrics(leftHandData)
    const rightMetrics = this.calculateOverallMetrics(rightHandData)

    // Calculate coordination score based on timing alignment
    const coordinationScore = this.calculateHandCoordination(
      leftHandData,
      rightHandData
    )

    // Calculate rhythmic independence
    const rhythmicIndependence = this.calculateRhythmicIndependence(
      leftHandData,
      rightHandData
    )

    return {
      leftHandAccuracy: leftMetrics.accuracy,
      rightHandAccuracy: rightMetrics.accuracy,
      handCoordination: coordinationScore,
      rhythmicIndependence,
      dynamicIndependence: 85, // Placeholder
    }
  }

  private calculateHandCoordination(
    leftData: MultiVoicePerformanceData[],
    rightData: MultiVoicePerformanceData[]
  ): number {
    // Find simultaneous notes and check timing alignment
    let alignedNotes = 0
    let totalSimultaneous = 0

    for (const left of leftData) {
      const simultaneous = rightData.filter(
        right => Math.abs(right.timestamp - left.timestamp) < 50 // 50ms window
      )

      totalSimultaneous += simultaneous.length
      alignedNotes += simultaneous.filter(
        right =>
          Math.abs(right.timing.delta - left.timing.delta) <
          this.config.timingToleranceMs
      ).length
    }

    return totalSimultaneous > 0
      ? (alignedNotes / totalSimultaneous) * 100
      : 100
  }

  private calculateRhythmicIndependence(
    leftData: MultiVoicePerformanceData[],
    rightData: MultiVoicePerformanceData[]
  ): number {
    // Measure how well each hand maintains its own rhythm
    const leftRhythmScore = 100 - this.calculateTimingVariability(leftData)
    const rightRhythmScore = 100 - this.calculateTimingVariability(rightData)

    return (leftRhythmScore + rightRhythmScore) / 2
  }

  private calculateTimingVariability(data: PerformanceData[]): number {
    const timingDeltas = data.map(d => d.timing.delta)
    if (timingDeltas.length < 2) return 0

    const mean =
      timingDeltas.reduce((sum, d) => sum + d, 0) / timingDeltas.length
    const variance =
      timingDeltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
      timingDeltas.length

    return Math.sqrt(variance)
  }

  private analyzeVoiceCombinations(): VoiceCombinationAnalysis[] {
    const combinations: VoiceCombinationAnalysis[] = []
    const voiceIds = Array.from(this.voicePerformanceData.keys())

    // Analyze pairs of voices
    for (let i = 0; i < voiceIds.length; i++) {
      for (let j = i + 1; j < voiceIds.length; j++) {
        const voice1 = voiceIds[i]
        const voice2 = voiceIds[j]

        const combo = this.analyzeVoicePair(voice1, voice2)
        combinations.push(combo)
      }
    }

    return combinations
  }

  private analyzeVoicePair(
    voice1: string,
    voice2: string
  ): VoiceCombinationAnalysis {
    const data1 = this.voicePerformanceData.get(voice1) || []
    const data2 = this.voicePerformanceData.get(voice2) || []

    // Find measures where both voices are active
    const commonMeasures = new Set<number>()
    data1.forEach(d => commonMeasures.add(d.noteEvent.measure))

    const problematicMeasures: number[] = []
    let totalErrors = 0
    let totalNotes = 0

    for (const measure of commonMeasures) {
      const measure1Data = data1.filter(d => d.noteEvent.measure === measure)
      const measure2Data = data2.filter(d => d.noteEvent.measure === measure)

      if (measure1Data.length > 0 && measure2Data.length > 0) {
        const errors1 = measure1Data.filter(d => !d.accuracy.isCorrect).length
        const errors2 = measure2Data.filter(d => !d.accuracy.isCorrect).length

        totalErrors += errors1 + errors2
        totalNotes += measure1Data.length + measure2Data.length

        if (
          (errors1 + errors2) / (measure1Data.length + measure2Data.length) >
          0.3
        ) {
          problematicMeasures.push(measure)
        }
      }
    }

    return {
      voices: [voice1, voice2],
      errorRate: totalNotes > 0 ? totalErrors / totalNotes : 0,
      problematicMeasures,
    }
  }

  private generatePolyphonicRecommendations(
    voiceMetrics: VoicePerformanceMetrics[],
    handIndependence: HandIndependenceMetrics | null
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Check for voices with low accuracy
    const weakVoices = voiceMetrics.filter(m => m.accuracy < 70)
    if (weakVoices.length > 0) {
      recommendations.push({
        type: 'practice',
        priority: 'high',
        title: 'Isolate Weak Voices',
        description: `Practice these voices separately: ${weakVoices.map(v => v.voiceId).join(', ')}`,
        practiceExercises: [
          'Single voice repetition',
          'Slow practice with metronome',
          'Gradual tempo increase',
        ],
        estimatedTime: 20,
      })
    }

    // Check hand independence
    if (handIndependence && handIndependence.handCoordination < 70) {
      recommendations.push({
        type: 'technique',
        priority: 'high',
        title: 'Improve Hand Coordination',
        description: 'Work on coordinating both hands',
        practiceExercises: [
          'Hands separate practice',
          'Slow hands together',
          'Focus on synchronization points',
        ],
        estimatedTime: 25,
      })
    }

    // Check polyphonic accuracy
    const avgPolyphonicAccuracy =
      voiceMetrics.reduce((sum, m) => sum + (m.polyphonicAccuracy || 0), 0) /
      voiceMetrics.length

    if (avgPolyphonicAccuracy < 75) {
      recommendations.push({
        type: 'focus',
        priority: 'medium',
        title: 'Polyphonic Awareness',
        description: 'Improve awareness of multiple voices',
        practiceExercises: [
          'Voice highlighting exercises',
          'Sing one voice while playing another',
          'Mental practice with score',
        ],
        estimatedTime: 15,
      })
    }

    return recommendations
  }

  private getNoteDurationInBeats(duration: string): number {
    const durationMap: Record<string, number> = {
      w: 4, // whole
      h: 2, // half
      q: 1, // quarter
      '8': 0.5, // eighth
      '16': 0.25, // sixteenth
    }
    return durationMap[duration] || 1
  }
}

// ============== Additional Types ==============

interface VoiceCombinationAnalysis {
  voices: string[]
  errorRate: number
  problematicMeasures: number[]
}

interface PolyphonicProblem {
  type: 'voice-coordination' | 'hand-independence' | 'polyphonic-complexity'
  voices: string[]
  errorRate: number
  measures: number[]
  description: string
  severity: 'high' | 'medium' | 'low'
}

// Note: ProblemArea type has been extended in types.ts to include 'coordination'
