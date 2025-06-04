import {
  ModuleInterface,
  ModuleHealth,
  EventBus,
  StorageService,
} from '../core'
import {
  PerformanceData,
  PerformanceMetrics,
  PerformanceAnalysis,
  PerformanceConfig,
  RealTimeFeedback,
  NoteEvent,
  TimingData,
  AccuracyData,
  DifficultyContext,
  ProblemArea,
  ProgressPoint,
  Recommendation,
} from './types'

export class PerformanceTrackingModule implements ModuleInterface {
  name = 'PerformanceTracking'
  version = '1.0.0'

  private eventBus: EventBus
  private storageService: StorageService
  private config: PerformanceConfig
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }

  private currentSessionData: PerformanceData[] = []
  private currentSessionId: string | null = null
  private realTimeAnalysisEnabled = false
  private feedbackCallbacks: Set<(feedback: RealTimeFeedback) => void> =
    new Set()

  constructor(config?: Partial<PerformanceConfig>, storageService?: any) {
    this.eventBus = EventBus.getInstance()
    this.storageService = storageService || new StorageService(this.eventBus)

    this.config = {
      timingToleranceMs: 50,
      pitchToleranceHz: 10,
      enableRealTimeAnalysis: true,
      enableMLPredictions: false,
      difficultyAdjustment: true,
      feedbackDelay: 100,
      ...config,
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:start',
        data: { module: this.name },
        metadata: { version: this.version },
      })

      // Subscribe to relevant events
      this.setupEventSubscriptions()

      this.health = {
        status: 'green',
        message: 'Performance tracking module initialized',
        lastCheck: Date.now(),
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:complete',
        data: { module: this.name },
        metadata: { version: this.version },
      })
    } catch (error) {
      this.health = {
        status: 'red',
        message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: Date.now(),
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:error',
        data: {
          module: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: { version: this.version },
      })

      throw error
    }
  }

  async shutdown(): Promise<void> {
    // Save any pending session data
    if (this.currentSessionData.length > 0) {
      await this.saveSessionData()
    }

    // Clear callbacks
    this.feedbackCallbacks.clear()

    await this.eventBus.publish({
      source: this.name,
      type: 'module:shutdown:complete',
      data: { module: this.name },
      metadata: { version: this.version },
    })

    this.health = {
      status: 'gray',
      message: 'Module shut down',
      lastCheck: Date.now(),
    }
  }

  getHealth(): ModuleHealth {
    return { ...this.health }
  }

  private setupEventSubscriptions(): void {
    // Subscribe to practice session events
    this.eventBus.subscribe('practice:session:started', async payload => {
      this.startSessionTracking(payload.data.session.id)
    })

    this.eventBus.subscribe('practice:session:ended', async payload => {
      await this.endSessionTracking(payload.data.session.id)
    })

    // Subscribe to note events from audio input or practice modules
    this.eventBus.subscribe('audio:note:detected', async payload => {
      await this.recordNoteEvent(payload.data)
    })

    this.eventBus.subscribe('practice:note:played', async payload => {
      await this.recordNoteEvent(payload.data)
    })
  }

  startSessionTracking(sessionId: string): void {
    this.currentSessionId = sessionId
    this.currentSessionData = []
    this.realTimeAnalysisEnabled = this.config.enableRealTimeAnalysis

    this.eventBus.publish({
      source: this.name,
      type: 'performance:tracking:started',
      data: { sessionId },
      metadata: { version: this.version },
    })
  }

  async endSessionTracking(sessionId: string): Promise<PerformanceAnalysis> {
    if (this.currentSessionId !== sessionId) {
      throw new Error(
        `Session ID mismatch: expected ${this.currentSessionId}, got ${sessionId}`
      )
    }

    // Save session data
    await this.saveSessionData()

    // Generate analysis
    const analysis = await this.generatePerformanceAnalysis(sessionId)

    // Clear current session
    this.currentSessionId = null
    this.currentSessionData = []
    this.realTimeAnalysisEnabled = false

    await this.eventBus.publish({
      source: this.name,
      type: 'performance:tracking:ended',
      data: { sessionId, analysis },
      metadata: { version: this.version },
    })

    return analysis
  }

  async recordNoteEvent(data: any): Promise<void> {
    if (!this.currentSessionId) {
      return
    }

    const performanceData: PerformanceData = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.currentSessionId,
      userId: data.userId || 'anonymous',
      timestamp: Date.now(),
      noteEvent: this.parseNoteEvent(data),
      timing: this.parseTimingData(data),
      accuracy: this.calculateAccuracy(data),
      difficulty: this.assessDifficulty(data),
    }

    this.currentSessionData.push(performanceData)

    // Real-time analysis and feedback
    if (this.realTimeAnalysisEnabled) {
      await this.processRealTimeFeedback(performanceData)
    }

    await this.eventBus.publish({
      source: this.name,
      type: 'performance:note:recorded',
      data: { performanceData },
      metadata: { version: this.version },
    })
  }

  async generatePerformanceAnalysis(
    sessionId: string
  ): Promise<PerformanceAnalysis> {
    // Use current session data if this is the active session, otherwise load from storage
    const sessionData =
      this.currentSessionId === sessionId
        ? this.currentSessionData
        : await this.getSessionData(sessionId)

    if (sessionData.length === 0) {
      // Return empty analysis for sessions with no data
      return {
        sessionId,
        userId: 'unknown',
        startTime: Date.now(),
        endTime: Date.now(),
        overallMetrics: {
          totalNotes: 0,
          correctNotes: 0,
          wrongNotes: 0,
          missedNotes: 0,
          extraNotes: 0,
          accuracy: 0,
          averageTimingDelta: 0,
          timingVariability: 0,
          rhythmStability: 0,
        },
        progressOverTime: [],
        problemAreas: [],
        improvements: [],
        recommendations: [],
      }
    }

    const overallMetrics = this.calculateOverallMetrics(sessionData)
    const progressOverTime = this.analyzeProgressOverTime(sessionData)
    const problemAreas = this.identifyProblemAreas(sessionData)
    const improvements = this.calculateImprovements(sessionData)
    const recommendations = await this.generateRecommendations(
      sessionData,
      problemAreas
    )

    const analysis: PerformanceAnalysis = {
      sessionId,
      userId: sessionData[0].userId,
      startTime: Math.min(...sessionData.map(d => d.timestamp)),
      endTime: Math.max(...sessionData.map(d => d.timestamp)),
      overallMetrics,
      progressOverTime,
      problemAreas,
      improvements,
      recommendations,
    }

    // Save analysis
    await this.saveAnalysis(analysis)

    return analysis
  }

  private parseNoteEvent(data: any): NoteEvent {
    return {
      expected: {
        pitch: data.expectedNote || data.expected || 'C4',
        duration: data.expectedDuration || 500,
        velocity: data.expectedVelocity || 64,
        finger: data.expectedFinger,
        position: data.expectedPosition,
      },
      played: data.playedNote
        ? {
            pitch: data.playedNote || data.played,
            duration: data.playedDuration || 500,
            velocity: data.playedVelocity || 64,
            finger: data.playedFinger,
            position: data.playedPosition,
          }
        : undefined,
      type: this.determineNoteEventType(data),
      measure: data.measure || 1,
      beat: data.beat || 1,
      voiceIndex: data.voiceIndex || 0,
    }
  }

  private parseTimingData(data: any): TimingData {
    const expectedTime = data.expectedTime || Date.now()
    const actualTime = data.actualTime || data.timestamp || Date.now()

    return {
      expectedTime,
      actualTime,
      delta: actualTime - expectedTime,
      tempo: data.tempo || 120,
      timeSignature: data.timeSignature || '4/4',
    }
  }

  private calculateAccuracy(data: any): AccuracyData {
    const isCorrect = data.correct === true || data.type === 'correct'
    const pitchAccuracy = this.calculatePitchAccuracy(data)
    const timingAccuracy = this.calculateTimingAccuracy(data)
    const rhythmAccuracy = this.calculateRhythmAccuracy(data)

    return {
      isCorrect,
      pitchAccuracy,
      timingAccuracy,
      rhythmAccuracy,
      overallScore: (pitchAccuracy + timingAccuracy + rhythmAccuracy) / 3,
    }
  }

  private assessDifficulty(data: any): DifficultyContext {
    return {
      key: data.key || 'C major',
      timeSignature: data.timeSignature || '4/4',
      tempo: data.tempo || 120,
      complexity: this.calculateComplexity(data),
      handPosition: data.handPosition,
      guitarPosition: data.guitarPosition,
    }
  }

  private determineNoteEventType(
    data: any
  ): 'correct' | 'wrong_note' | 'missed_note' | 'extra_note' {
    if (data.correct === true || data.type === 'correct') return 'correct'
    if (
      data.type === 'wrong_note' ||
      (data.expected && data.played && data.expected !== data.played)
    )
      return 'wrong_note'
    if (data.type === 'missed_note' || (data.expected && !data.played))
      return 'missed_note'
    if (data.type === 'extra_note' || (!data.expected && data.played))
      return 'extra_note'
    return 'wrong_note'
  }

  private calculatePitchAccuracy(data: any): number {
    if (data.correct === true) return 1.0
    if (!data.expected || !data.played) return 0.0

    // Simple pitch comparison - could be enhanced with frequency analysis
    return data.expected === data.played ? 1.0 : 0.0
  }

  private calculateTimingAccuracy(data: any): number {
    const timingDelta = Math.abs(data.timingDelta || 0)
    const tolerance = this.config.timingToleranceMs

    if (timingDelta <= tolerance) return 1.0
    if (timingDelta > tolerance * 3) return 0.0

    return Math.max(0, 1 - (timingDelta - tolerance) / (tolerance * 2))
  }

  private calculateRhythmAccuracy(data: any): number {
    // Simplified rhythm accuracy - could be enhanced
    return data.rhythmScore || this.calculateTimingAccuracy(data)
  }

  private calculateComplexity(data: any): number {
    let complexity = 1

    // Tempo factor
    const tempo = data.tempo || 120
    if (tempo > 140) complexity += 2
    else if (tempo > 120) complexity += 1

    // Key signature factor
    const key = data.key || 'C major'
    const accidentals = (key.match(/#|♯|b|♭/g) || []).length
    complexity += Math.min(accidentals, 3)

    // Time signature factor
    const timeSignature = data.timeSignature || '4/4'
    if (timeSignature !== '4/4') complexity += 1

    return Math.min(complexity, 10)
  }

  private calculateOverallMetrics(
    sessionData: PerformanceData[]
  ): PerformanceMetrics {
    const totalNotes = sessionData.length
    const correctNotes = sessionData.filter(d => d.accuracy.isCorrect).length
    const wrongNotes = sessionData.filter(
      d => d.noteEvent.type === 'wrong_note'
    ).length
    const missedNotes = sessionData.filter(
      d => d.noteEvent.type === 'missed_note'
    ).length
    const extraNotes = sessionData.filter(
      d => d.noteEvent.type === 'extra_note'
    ).length

    const accuracy = totalNotes > 0 ? (correctNotes / totalNotes) * 100 : 0
    const timingDeltas = sessionData
      .map(d => d.timing.delta)
      .filter(d => !isNaN(d))
    const averageTimingDelta =
      timingDeltas.length > 0
        ? timingDeltas.reduce((sum, delta) => sum + Math.abs(delta), 0) /
          timingDeltas.length
        : 0

    // Calculate timing variability (standard deviation)
    const timingVariability =
      timingDeltas.length > 1
        ? Math.sqrt(
            timingDeltas.reduce(
              (sum, delta) => sum + Math.pow(delta - averageTimingDelta, 2),
              0
            ) / timingDeltas.length
          )
        : 0

    // Rhythm stability (inverse of timing variability, normalized)
    const rhythmStability = Math.max(0, 100 - timingVariability / 10)

    return {
      totalNotes,
      correctNotes,
      wrongNotes,
      missedNotes,
      extraNotes,
      accuracy,
      averageTimingDelta,
      timingVariability,
      rhythmStability,
    }
  }

  private analyzeProgressOverTime(
    sessionData: PerformanceData[]
  ): ProgressPoint[] {
    const windowSize = Math.max(5, Math.floor(sessionData.length / 20)) // 5% of data or minimum 5
    const progressPoints: ProgressPoint[] = []

    for (let i = windowSize; i <= sessionData.length; i += windowSize) {
      const window = sessionData.slice(i - windowSize, i)
      const accuracy =
        (window.filter(d => d.accuracy.isCorrect).length / window.length) * 100
      const avgTempo =
        window.reduce((sum, d) => sum + d.difficulty.tempo, 0) / window.length
      const confidence = Math.min(accuracy, 100 - (window.length < 10 ? 20 : 0)) // Reduce confidence for small windows

      progressPoints.push({
        timestamp: window[window.length - 1].timestamp,
        accuracy,
        tempo: avgTempo,
        confidence,
        measure: window[window.length - 1].noteEvent.measure,
      })
    }

    return progressPoints
  }

  private identifyProblemAreas(sessionData: PerformanceData[]): ProblemArea[] {
    const problemAreas: ProblemArea[] = []
    const totalNotes = sessionData.length

    // Analyze pitch problems
    const pitchErrors = sessionData.filter(
      d => d.noteEvent.type === 'wrong_note'
    )
    if (pitchErrors.length / totalNotes > 0.1) {
      // More than 10% pitch errors
      problemAreas.push({
        type: 'pitch',
        description: 'Frequent wrong notes detected',
        severity: pitchErrors.length / totalNotes > 0.2 ? 'high' : 'medium',
        frequency: pitchErrors.length / totalNotes,
        measures: [...new Set(pitchErrors.map(d => d.noteEvent.measure))],
        suggestions: [
          'Practice scales in the current key',
          'Slow down tempo',
          'Focus on finger positions',
        ],
      })
    }

    // Analyze timing problems
    const timingErrors = sessionData.filter(
      d => Math.abs(d.timing.delta) > this.config.timingToleranceMs
    )
    if (timingErrors.length / totalNotes > 0.15) {
      // More than 15% timing errors
      problemAreas.push({
        type: 'timing',
        description: 'Inconsistent timing detected',
        severity: timingErrors.length / totalNotes > 0.3 ? 'high' : 'medium',
        frequency: timingErrors.length / totalNotes,
        measures: [...new Set(timingErrors.map(d => d.noteEvent.measure))],
        suggestions: [
          'Practice with metronome',
          'Focus on steady pulse',
          'Start at slower tempo',
        ],
      })
    }

    // Analyze rhythm problems
    const rhythmErrors = sessionData.filter(
      d => d.accuracy.rhythmAccuracy < 0.7
    )
    if (rhythmErrors.length / totalNotes > 0.2) {
      problemAreas.push({
        type: 'rhythm',
        description: 'Rhythm accuracy needs improvement',
        severity: rhythmErrors.length / totalNotes > 0.4 ? 'high' : 'medium',
        frequency: rhythmErrors.length / totalNotes,
        measures: [...new Set(rhythmErrors.map(d => d.noteEvent.measure))],
        suggestions: [
          'Count aloud while playing',
          'Practice rhythm patterns separately',
          'Use rhythmic subdivisions',
        ],
      })
    }

    return problemAreas
  }

  private calculateImprovements(_sessionData: PerformanceData[]): any[] {
    // For now, return empty array - could be enhanced to compare with previous sessions
    return []
  }

  private async generateRecommendations(
    sessionData: PerformanceData[],
    problemAreas: ProblemArea[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []
    const overallMetrics = this.calculateOverallMetrics(sessionData)

    // Generate recommendations based on problem areas
    for (const problem of problemAreas) {
      switch (problem.type) {
        case 'pitch':
          recommendations.push({
            type: 'practice',
            priority: problem.severity === 'high' ? 'high' : 'medium',
            title: 'Improve Pitch Accuracy',
            description: 'Focus on playing the correct notes',
            practiceExercises: [
              'Scale practice',
              'Interval training',
              'Sight-reading exercises',
            ],
            estimatedTime: 15,
          })
          break

        case 'timing':
          recommendations.push({
            type: 'technique',
            priority: problem.severity === 'high' ? 'high' : 'medium',
            title: 'Improve Timing Consistency',
            description: 'Work on maintaining steady tempo',
            practiceExercises: [
              'Metronome practice',
              'Clapping exercises',
              'Slow practice',
            ],
            estimatedTime: 20,
          })
          break

        case 'rhythm':
          recommendations.push({
            type: 'focus',
            priority: 'medium',
            title: 'Rhythm Training',
            description: 'Strengthen rhythmic accuracy',
            practiceExercises: [
              'Counting exercises',
              'Rhythm clapping',
              'Subdivision practice',
            ],
            estimatedTime: 10,
          })
          break
      }
    }

    // Add general recommendations based on overall performance
    if (overallMetrics.accuracy < 70) {
      recommendations.push({
        type: 'tempo',
        priority: 'high',
        title: 'Reduce Practice Tempo',
        description: 'Slow down to build accuracy before increasing speed',
        estimatedTime: 5,
      })
    }

    return recommendations
  }

  private async processRealTimeFeedback(
    performanceData: PerformanceData
  ): Promise<void> {
    if (this.feedbackCallbacks.size === 0) return

    const feedback: RealTimeFeedback = {
      type: performanceData.accuracy.isCorrect ? 'correct' : 'incorrect',
      message: this.generateFeedbackMessage(performanceData),
      confidence: performanceData.accuracy.overallScore,
      timestamp: performanceData.timestamp,
    }

    // Add visual/audio cues based on performance
    if (performanceData.accuracy.isCorrect) {
      feedback.visualCue = 'green-flash'
      feedback.audioCue = 'success-chime'
    } else {
      feedback.visualCue = 'red-flash'
      feedback.audioCue = 'error-beep'
    }

    // Delay feedback if configured
    setTimeout(() => {
      this.feedbackCallbacks.forEach(callback => callback(feedback))
    }, this.config.feedbackDelay)
  }

  private generateFeedbackMessage(performanceData: PerformanceData): string {
    if (performanceData.accuracy.isCorrect) {
      return 'Great!'
    }

    switch (performanceData.noteEvent.type) {
      case 'wrong_note':
        return `Expected ${performanceData.noteEvent.expected.pitch}, played ${performanceData.noteEvent.played?.pitch || 'unknown'}`
      case 'missed_note':
        return `Missed ${performanceData.noteEvent.expected.pitch}`
      case 'extra_note':
        return 'Extra note played'
      default:
        return 'Try again'
    }
  }

  // Public API methods

  async getSessionData(sessionId: string): Promise<PerformanceData[]> {
    const allData =
      (await this.storageService.get<PerformanceData[]>('performance_data')) ||
      []
    return allData.filter(d => d.sessionId === sessionId)
  }

  async getAnalysis(sessionId: string): Promise<PerformanceAnalysis | null> {
    const allAnalyses =
      (await this.storageService.get<PerformanceAnalysis[]>(
        'performance_analyses'
      )) || []
    return allAnalyses.find(a => a.sessionId === sessionId) || null
  }

  async getUserStats(userId: string): Promise<PerformanceMetrics> {
    const allData =
      (await this.storageService.get<PerformanceData[]>('performance_data')) ||
      []
    const userData = allData.filter(d => d.userId === userId)
    return this.calculateOverallMetrics(userData)
  }

  onRealTimeFeedback(
    callback: (feedback: RealTimeFeedback) => void
  ): () => void {
    this.feedbackCallbacks.add(callback)
    return () => this.feedbackCallbacks.delete(callback)
  }

  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): PerformanceConfig {
    return { ...this.config }
  }

  // Private storage methods

  private async saveSessionData(): Promise<void> {
    if (this.currentSessionData.length === 0) return

    const existingData =
      (await this.storageService.get<PerformanceData[]>('performance_data')) ||
      []
    const updatedData = [...existingData, ...this.currentSessionData]

    await this.storageService.set('performance_data', updatedData)

    // Emit sync event
    await this.eventBus.publish({
      source: this.name,
      type: 'data:sync:required',
      data: {
        key: `performance_data_${this.currentSessionId}`,
        operation: 'save',
        data: this.currentSessionData,
      },
      metadata: { version: this.version },
    })
  }

  private async saveAnalysis(analysis: PerformanceAnalysis): Promise<void> {
    const existingAnalyses =
      (await this.storageService.get<PerformanceAnalysis[]>(
        'performance_analyses'
      )) || []
    const updatedAnalyses = [...existingAnalyses, analysis]

    await this.storageService.set('performance_analyses', updatedAnalyses)
  }

  // Testing helpers
  async clearAllData(): Promise<void> {
    await this.storageService.remove('performance_data')
    await this.storageService.remove('performance_analyses')
  }

  getCurrentSessionData(): PerformanceData[] {
    return [...this.currentSessionData]
  }
}
