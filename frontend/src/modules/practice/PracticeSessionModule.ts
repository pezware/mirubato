import {
  ModuleInterface,
  ModuleHealth,
  EventBus,
  SessionStatus,
  EventPayload,
} from '../core'
import { EventDrivenStorage } from '../core/eventDrivenStorage'
import {
  PracticeSession,
  PracticeConfig,
  SessionTemplate,
  PracticeStats,
  Mistake,
  NotePerformanceData,
} from './types'
import { MistakeType } from '../core/sharedTypes'
import { Instrument } from '../../../../shared/types'

export class PracticeSessionModule implements ModuleInterface {
  name = 'PracticeSession'
  version = '1.0.0'

  private eventBus: EventBus
  private storage: EventDrivenStorage
  private config: PracticeConfig
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }

  private currentSession: PracticeSession | null = null
  private sessionTimer: NodeJS.Timeout | null = null
  private autoSaveTimer: NodeJS.Timeout | null = null
  private sessionStartHandlers: Set<() => void> = new Set()
  private sessionEndHandlers: Set<() => void> = new Set()

  constructor(config?: Partial<PracticeConfig>, storage?: EventDrivenStorage) {
    this.eventBus = EventBus.getInstance()
    this.storage = storage || new EventDrivenStorage()

    this.config = {
      autoSaveInterval: 30000, // 30 seconds
      maxSessionDuration: 7200000, // 2 hours
      enableMetronome: true,
      countInMeasures: 2,
      practiceMode: 'normal',
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

      // Restore any active session
      await this.restoreActiveSession()

      // Subscribe to relevant events
      this.setupEventSubscriptions()

      this.health = {
        status: 'green',
        message: 'Practice session module initialized',
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
    // Save current session if active
    if (
      this.currentSession &&
      this.currentSession.status === SessionStatus.ACTIVE
    ) {
      await this.pauseSession()
    }

    // Clear timers
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
      this.sessionTimer = null
    }

    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }

    // Clear handlers
    this.sessionStartHandlers.clear()
    this.sessionEndHandlers.clear()

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
    // Subscribe to performance events
    this.eventBus.subscribe(
      'performance:note:played',
      async (payload: EventPayload) => {
        if (this.currentSession?.status === SessionStatus.ACTIVE) {
          await this.recordNotePerformance(payload.data as NotePerformanceData)
        }
      }
    )

    // Subscribe to navigation events
    this.eventBus.subscribe(
      'navigation:leaving:practice',
      async (_payload: EventPayload) => {
        if (this.currentSession?.status === SessionStatus.ACTIVE) {
          await this.pauseSession()
        }
      }
    )
  }

  async startSession(
    sheetMusicId: string,
    sheetMusicTitle: string,
    instrument: Instrument,
    userId?: string
  ): Promise<PracticeSession> {
    // End any existing session
    if (this.currentSession) {
      await this.endSession(SessionStatus.ABANDONED)
    }

    const now = Date.now()
    const session: PracticeSession = {
      id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId || 'anonymous',
      createdAt: now,
      updatedAt: now,
      startTime: now,
      sheetMusicId,
      sheetMusicTitle,
      instrument,
      tempo: 120,
      status: SessionStatus.ACTIVE,
      totalPausedDuration: 0,
      performance: {
        notesPlayed: 0,
        correctNotes: 0,
        accuracy: { percentage: 100, notesCorrect: 0, notesTotal: 0 },
        averageTiming: 0,
        mistakes: [],
        progress: 0,
      },
    }

    this.currentSession = session

    // Start auto-save timer
    this.startAutoSave()

    // Start session duration timer
    this.startSessionTimer()

    // Execute start handlers
    this.sessionStartHandlers.forEach(handler => handler())

    await this.eventBus.publish({
      source: this.name,
      type: 'practice:session:started',
      data: { session },
      metadata: { version: this.version },
    })

    return session
  }

  async pauseSession(): Promise<void> {
    if (
      !this.currentSession ||
      this.currentSession.status !== SessionStatus.ACTIVE
    ) {
      return
    }

    this.currentSession.status = SessionStatus.PAUSED
    this.currentSession.pausedTime = Date.now()

    await this.saveSession()

    await this.eventBus.publish({
      source: this.name,
      type: 'practice:session:paused',
      data: { session: this.currentSession },
      metadata: { version: this.version },
    })
  }

  async resumeSession(): Promise<void> {
    if (
      !this.currentSession ||
      this.currentSession.status !== SessionStatus.PAUSED
    ) {
      return
    }

    if (this.currentSession.pausedTime) {
      this.currentSession.totalPausedDuration +=
        Date.now() - this.currentSession.pausedTime
      this.currentSession.pausedTime = undefined
    }

    this.currentSession.status = SessionStatus.ACTIVE

    await this.eventBus.publish({
      source: this.name,
      type: 'practice:session:resumed',
      data: { session: this.currentSession },
      metadata: { version: this.version },
    })
  }

  async endSession(
    status: SessionStatus = SessionStatus.COMPLETED
  ): Promise<void> {
    if (!this.currentSession) {
      return
    }

    this.currentSession.status = status
    this.currentSession.endTime = Date.now()

    // Calculate final stats
    if (this.currentSession.performance) {
      const perf = this.currentSession.performance
      perf.accuracy = {
        percentage:
          perf.notesPlayed > 0
            ? Math.round((perf.correctNotes / perf.notesPlayed) * 100)
            : 100,
        notesCorrect: perf.correctNotes,
        notesTotal: perf.notesPlayed,
      }
    }

    await this.saveSession()

    // Update user stats
    await this.updateUserStats()

    // Clear timers
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }

    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
      this.sessionTimer = null
    }

    // Execute end handlers
    this.sessionEndHandlers.forEach(handler => handler())

    await this.eventBus.publish({
      source: this.name,
      type: 'practice:session:ended',
      data: { session: this.currentSession },
      metadata: { version: this.version },
    })

    this.currentSession = null
  }

  getCurrentSession(): PracticeSession | null {
    return this.currentSession ? { ...this.currentSession } : null
  }

  async getSessionHistory(limit = 10, offset = 0): Promise<PracticeSession[]> {
    const sessions =
      (await this.storage.read<PracticeSession[]>('practice_sessions')) || []

    return sessions
      .sort((a, b) => b.startTime - a.startTime)
      .slice(offset, offset + limit)
  }

  async getStats(userId?: string): Promise<PracticeStats> {
    const stats = await this.storage.read<PracticeStats>(
      `practice_stats_${userId || 'anonymous'}`
    )

    return (
      stats || {
        totalSessions: 0,
        totalPracticeTime: 0,
        averageSessionLength: 0,
        averageAccuracy: 0,
        streakDays: 0,
        lastPracticeDate: 0,
        instrumentStats: {},
      }
    )
  }

  async applyTemplate(templateId: string): Promise<void> {
    const templates =
      (await this.storage.read<SessionTemplate[]>('session_templates')) || []

    const template = templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Apply template config
    this.config = { ...this.config, ...template.config }

    await this.eventBus.publish({
      source: this.name,
      type: 'practice:template:applied',
      data: { template },
      metadata: { version: this.version },
    })
  }

  async saveTemplate(template: SessionTemplate): Promise<void> {
    const templates =
      (await this.storage.read<SessionTemplate[]>('session_templates')) || []

    const existingIndex = templates.findIndex(t => t.id === template.id)
    if (existingIndex >= 0) {
      templates[existingIndex] = template
    } else {
      templates.push(template)
    }

    await this.storage.write('session_templates', templates)
  }

  updateConfig(config: Partial<PracticeConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart auto-save if interval changed
    if (config.autoSaveInterval && this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.startAutoSave()
    }
  }

  getConfig(): PracticeConfig {
    return { ...this.config }
  }

  // Handler management
  onSessionStart(handler: () => void): () => void {
    this.sessionStartHandlers.add(handler)
    return () => this.sessionStartHandlers.delete(handler)
  }

  onSessionEnd(handler: () => void): () => void {
    this.sessionEndHandlers.add(handler)
    return () => this.sessionEndHandlers.delete(handler)
  }

  // Private methods
  private async recordNotePerformance(
    data: NotePerformanceData
  ): Promise<void> {
    if (!this.currentSession?.performance) return

    const perf = this.currentSession.performance
    perf.notesPlayed++

    if (data.correct) {
      perf.correctNotes++
    } else {
      const mistake: Mistake = {
        timestamp: Date.now(),
        noteExpected: data.expected,
        notePlayed: data.played,
        type: data.played ? MistakeType.WRONG_NOTE : MistakeType.MISSED_NOTE,
        measure: data.measure,
        beat: data.beat,
      }
      perf.mistakes.push(mistake)
    }

    // Update accuracy metrics
    perf.accuracy = {
      percentage:
        perf.notesPlayed > 0
          ? Math.round((perf.correctNotes / perf.notesPlayed) * 100)
          : 100,
      notesCorrect: perf.correctNotes,
      notesTotal: perf.notesPlayed,
    }

    // Update average timing
    if (data.timingDelta !== undefined) {
      perf.averageTiming =
        (perf.averageTiming * (perf.notesPlayed - 1) + data.timingDelta) /
        perf.notesPlayed
    }

    // Update progress
    if (data.progress !== undefined) {
      perf.progress = data.progress
    }
  }

  private async saveSession(): Promise<void> {
    if (!this.currentSession) return

    const sessions =
      (await this.storage.read<PracticeSession[]>('practice_sessions')) || []

    const existingIndex = sessions.findIndex(
      s => s.id === this.currentSession!.id
    )

    if (existingIndex >= 0) {
      sessions[existingIndex] = this.currentSession
    } else {
      sessions.push(this.currentSession)
    }

    await this.storage.write('practice_sessions', sessions)

    await this.eventBus.publish({
      source: this.name,
      type: 'data:sync:required',
      data: {
        key: `practice_session_${this.currentSession.id}`,
        operation: 'save',
        data: this.currentSession,
      },
      metadata: { version: this.version },
    })
  }

  private async restoreActiveSession(): Promise<void> {
    const sessions =
      (await this.storage.read<PracticeSession[]>('practice_sessions')) || []

    const activeSession = sessions.find(
      s =>
        s.status === SessionStatus.ACTIVE || s.status === SessionStatus.PAUSED
    )

    if (activeSession) {
      this.currentSession = activeSession

      // Check if session is too old (> max duration)
      const sessionAge = Date.now() - activeSession.startTime
      if (sessionAge > this.config.maxSessionDuration) {
        await this.endSession(SessionStatus.ABANDONED)
        return
      }

      // Restore timers if active
      if (activeSession.status === SessionStatus.ACTIVE) {
        this.startAutoSave()
        this.startSessionTimer()
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'practice:session:restored',
        data: { session: activeSession },
        metadata: { version: this.version },
      })
    }
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      if (this.currentSession?.status === SessionStatus.ACTIVE) {
        await this.saveSession()
      }
    }, this.config.autoSaveInterval)
  }

  private startSessionTimer(): void {
    this.sessionTimer = setInterval(async () => {
      if (this.currentSession?.status === SessionStatus.ACTIVE) {
        const duration = Date.now() - this.currentSession.startTime
        if (duration >= this.config.maxSessionDuration) {
          await this.endSession(SessionStatus.COMPLETED)
        }
      }
    }, 60000) // Check every minute
  }

  private async updateUserStats(): Promise<void> {
    if (!this.currentSession) return

    const userId = this.currentSession.userId
    const stats = await this.getStats(userId)

    // Update basic stats
    stats.totalSessions++
    const sessionDuration = this.currentSession.endTime
      ? this.currentSession.endTime -
        this.currentSession.startTime -
        this.currentSession.totalPausedDuration
      : 0
    stats.totalPracticeTime += sessionDuration
    stats.averageSessionLength = stats.totalPracticeTime / stats.totalSessions

    // Update accuracy
    if (this.currentSession.performance) {
      const prevTotal = stats.averageAccuracy * (stats.totalSessions - 1)
      stats.averageAccuracy =
        (prevTotal + this.currentSession.performance.accuracy.percentage) /
        stats.totalSessions
    }

    // Update streak
    const today = new Date().setHours(0, 0, 0, 0)
    const lastPractice = new Date(stats.lastPracticeDate).setHours(0, 0, 0, 0)
    const daysDiff = Math.floor((today - lastPractice) / (1000 * 60 * 60 * 24))

    if (daysDiff === 1) {
      stats.streakDays++
    } else if (daysDiff > 1) {
      stats.streakDays = 1
    }
    stats.lastPracticeDate = Date.now()

    // Update instrument stats
    const instrument = this.currentSession.instrument
    if (!stats.instrumentStats[instrument]) {
      stats.instrumentStats[instrument] = {
        totalTime: 0,
        sessionCount: 0,
        averageAccuracy: 0,
        piecesPlayed: 0,
      }
    }

    const instrumentStats = stats.instrumentStats[instrument]
    instrumentStats.sessionCount++
    instrumentStats.totalTime += sessionDuration

    if (this.currentSession.performance) {
      const prevAccuracy =
        instrumentStats.averageAccuracy * (instrumentStats.sessionCount - 1)
      instrumentStats.averageAccuracy =
        (prevAccuracy + this.currentSession.performance.accuracy.percentage) /
        instrumentStats.sessionCount
    }

    await this.storage.write(`practice_stats_${userId || 'anonymous'}`, stats)
  }

  // Testing helpers
  async clearHistory(): Promise<void> {
    await this.storage.write('practice_sessions', [])
  }

  async clearStats(userId?: string): Promise<void> {
    await this.storage.delete(`practice_stats_${userId || 'anonymous'}`)
  }
}
