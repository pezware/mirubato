import { EventBus, StorageService } from '../core'
import type { EventPayload, ModuleHealth, IStorageService } from '../core/types'
import type {
  PerformanceNoteEventData,
  SessionEndedEventData,
} from '../core/eventTypes'
import type {
  ProgressAnalyticsModuleInterface,
  ProgressAnalyticsModuleConfig,
  TimeRange,
  ProgressReport,
  WeakArea,
  FocusArea,
  SessionData,
  PerformanceData,
  Milestone,
  TrendData,
  ConsistencyMetrics,
} from './types'

/**
 * Progress Analytics Module
 *
 * Provides comprehensive analytics and insights for user practice sessions.
 * This module tracks performance metrics, identifies areas for improvement,
 * and monitors progress over time.
 *
 * @module ProgressAnalyticsModule
 * @implements {ProgressAnalyticsModuleInterface}
 *
 * @example
 * ```typescript
 * const analytics = new ProgressAnalyticsModule(eventBus, storageModule);
 * await analytics.initialize();
 *
 * // Get progress report
 * const report = await analytics.getProgressReport('user123', {
 *   start: Date.now() - 7 * 24 * 60 * 60 * 1000,
 *   end: Date.now()
 * });
 * ```
 */
export class ProgressAnalyticsModule
  implements ProgressAnalyticsModuleInterface
{
  name = 'ProgressAnalyticsModule'
  version = '1.0.0'

  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }

  private config: Required<ProgressAnalyticsModuleConfig>
  private subscriptions: string[] = []

  private storageService: IStorageService

  constructor(
    private eventBus: EventBus,
    config?: Partial<ProgressAnalyticsModuleConfig>,
    storageService?: IStorageService
  ) {
    this.storageService = storageService || new StorageService(this.eventBus)
    this.config = {
      milestoneThresholds: {
        accuracy: [0.7, 0.8, 0.9, 0.95],
        consistency: [3, 7, 14, 30],
        time: [1800, 3600, 7200, 14400], // seconds
      },
      analysisWindow: 30,
      minSessionsForTrend: 3,
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
      this.subscriptions.push(
        this.eventBus.subscribe(
          'performance:note:recorded',
          this.handlePerformanceNote.bind(this)
        )
      )
      this.subscriptions.push(
        this.eventBus.subscribe(
          'practice:session:ended',
          this.handleSessionEnded.bind(this)
        )
      )
      this.subscriptions.push(
        this.eventBus.subscribe(
          'practice:session:summary',
          this.handleSessionSummary.bind(this)
        )
      )

      this.health.status = 'green'
      this.health.lastCheck = Date.now()

      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:complete',
        data: { module: this.name },
        metadata: { version: this.version },
      })
    } catch (error) {
      this.health.status = 'red'
      this.health.message =
        error instanceof Error ? error.message : 'Unknown error'

      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:error',
        data: { module: this.name, error: this.health.message },
        metadata: { version: this.version },
      })
    }
  }

  async shutdown(): Promise<void> {
    // Unsubscribe from events if needed
    this.subscriptions = []

    this.health.status = 'gray'
    this.health.lastCheck = Date.now()

    await this.eventBus.publish({
      source: this.name,
      type: 'module:shutdown:complete',
      data: { module: this.name },
      metadata: { version: this.version },
    })
  }

  getHealth(): ModuleHealth {
    return { ...this.health }
  }

  /**
   * Generates a comprehensive progress report for a user within a specified time range
   *
   * @param userId - The unique identifier of the user
   * @param timeRange - The time range for the report (start and end timestamps)
   * @returns A promise that resolves to a detailed progress report
   *
   * @example
   * ```typescript
   * const report = await analytics.getProgressReport('user123', {
   *   start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
   *   end: Date.now()
   * });
   * ```
   */
  async getProgressReport(
    userId: string,
    timeRange: TimeRange
  ): Promise<ProgressReport> {
    try {
      const sessions = await this.getSessionsInRange(userId, timeRange)

      if (!sessions || sessions.length === 0) {
        return this.createEmptyReport(userId, timeRange)
      }

      const totalPracticeTime = sessions.reduce((sum, s) => sum + s.duration, 0)
      const averageAccuracy =
        sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
      const improvementRate = this.calculateImprovementRate(sessions)
      const weakAreas = await this.getWeakAreas(userId)
      const milestones = await this.getMilestoneHistory(userId)

      return {
        userId,
        timeRange,
        totalPracticeTime,
        sessionsCompleted: sessions.length,
        averageAccuracy,
        improvementRate,
        strengthAreas: this.identifyStrengthAreas(sessions),
        weakAreas,
        milestones,
      }
    } catch (error) {
      console.error('Error generating progress report:', error)
      return this.createEmptyReport(userId, timeRange)
    }
  }

  /**
   * Identifies areas where the user needs improvement based on performance data
   *
   * @param userId - The unique identifier of the user
   * @returns A promise that resolves to an array of weak areas with suggestions
   */
  async getWeakAreas(userId: string): Promise<WeakArea[]> {
    try {
      const performanceData = await this.storageService.get<PerformanceData[]>(
        `analytics:performance:${userId}`
      )

      if (!performanceData || !Array.isArray(performanceData)) {
        return []
      }

      const weakAreas: WeakArea[] = []
      const threshold = 0.75 // Consider below 75% as weak

      for (const data of performanceData) {
        if (data.accuracy < threshold) {
          weakAreas.push({
            type: data.type,
            accuracy: data.accuracy,
            occurrences: data.count || data.occurrences || 0,
            suggestions: this.generateSuggestions(data.type),
          })
        }
      }

      return weakAreas
    } catch (error) {
      console.error('Error identifying weak areas:', error)
      return []
    }
  }

  /**
   * Provides personalized practice recommendations based on identified weak areas
   *
   * @param userId - The unique identifier of the user
   * @returns A promise that resolves to prioritized focus areas with exercises
   */
  async getSuggestedFocus(userId: string): Promise<FocusArea[]> {
    const weakAreas = await this.getWeakAreas(userId)

    return weakAreas.map(area => ({
      type: area.type,
      priority: this.calculatePriority(area.accuracy),
      practiceTimeMinutes: this.calculatePracticeTime(area.accuracy),
      exercises: this.getExercisesForType(area.type),
    }))
  }

  /**
   * Checks if any milestones were achieved during a practice session
   *
   * @param sessionData - The data from the completed practice session
   * @returns A promise that resolves to an array of achieved milestones
   */
  async checkMilestones(sessionData: SessionData): Promise<Milestone[]> {
    const achievedMilestones: Milestone[] = []

    // Check accuracy milestones
    const accuracyThresholds = this.config.milestoneThresholds?.accuracy || []
    for (const threshold of accuracyThresholds) {
      if (sessionData.accuracy >= threshold) {
        const milestoneId = `accuracy_${threshold * 100}`
        const existing = await this.getMilestone(
          sessionData.userId,
          milestoneId
        )

        if (!existing || !existing.achieved) {
          const milestone: Milestone = {
            id: milestoneId,
            type: 'accuracy',
            achieved: true,
            achievedAt: Date.now(),
            criteria: { type: 'accuracy', target: threshold },
          }
          achievedMilestones.push(milestone)
        }
      }
    }

    // Save milestones and publish events
    for (const milestone of achievedMilestones) {
      await this.saveMilestone(sessionData.userId, milestone)
      await this.eventBus.publish({
        source: this.name,
        type: 'progress:milestone:achieved',
        data: { milestone, userId: sessionData.userId },
        metadata: { version: this.version, userId: sessionData.userId },
      })
    }

    return achievedMilestones
  }

  async getMilestoneHistory(userId: string): Promise<Milestone[]> {
    try {
      const milestones = await this.storageService.get<Milestone[]>(
        `analytics:milestones:${userId}`
      )
      return Array.isArray(milestones) ? milestones : []
    } catch (error) {
      console.error('Error getting milestone history:', error)
      return []
    }
  }

  /**
   * Analyzes accuracy trends over a specified number of days
   *
   * @param userId - The unique identifier of the user
   * @param days - Number of days to analyze
   * @returns A promise that resolves to trend data with improvement analysis
   */
  async getAccuracyTrend(userId: string, days: number): Promise<TrendData> {
    try {
      const sessions = await this.getRecentSessions(userId, days)

      if (!sessions || sessions.length < this.config.minSessionsForTrend) {
        return {
          dataPoints: [],
          trend: 'stable',
          changePercent: 0,
        }
      }

      const dataPoints = sessions.map(s => ({
        timestamp: s.timestamp,
        value: s.accuracy,
      }))

      const trend = this.calculateTrend(dataPoints)
      const changePercent = this.calculateChangePercent(dataPoints)

      return { dataPoints, trend, changePercent }
    } catch (error) {
      console.error('Error calculating accuracy trend:', error)
      return {
        dataPoints: [],
        trend: 'stable',
        changePercent: 0,
      }
    }
  }

  /**
   * Evaluates practice consistency including streaks and session frequency
   *
   * @param userId - The unique identifier of the user
   * @returns A promise that resolves to consistency metrics
   */
  async getPracticeConsistency(userId: string): Promise<ConsistencyMetrics> {
    try {
      const practiceData = await this.storageService.get<{
        sessions: SessionData[]
      }>(`analytics:practice:${userId}`)

      if (!practiceData?.sessions) {
        return {
          daysActive: 0,
          currentStreak: 0,
          longestStreak: 0,
          averageSessionsPerWeek: 0,
          missedDays: [],
        }
      }

      const sessionDates = practiceData.sessions.map((s: SessionData) =>
        new Date(s.date || s.timestamp).toDateString()
      )
      const uniqueDays = new Set(sessionDates)

      const { currentStreak, longestStreak } = this.calculateStreaks(
        practiceData.sessions.map((s: SessionData) => ({
          date: s.date || s.timestamp,
        }))
      )
      const missedDays = this.findMissedDays(
        practiceData.sessions.map((s: SessionData) => ({
          date: s.date || s.timestamp,
        }))
      )

      return {
        daysActive: uniqueDays.size,
        currentStreak,
        longestStreak,
        averageSessionsPerWeek: this.calculateAverageSessionsPerWeek(
          practiceData.sessions.map((s: SessionData) => ({
            date: s.date || s.timestamp,
          }))
        ),
        missedDays,
      }
    } catch (error) {
      console.error('Error calculating practice consistency:', error)
      return {
        daysActive: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageSessionsPerWeek: 0,
        missedDays: [],
      }
    }
  }

  // Private helper methods
  private async handlePerformanceNote(event: EventPayload): Promise<void> {
    const data = event.data as PerformanceNoteEventData
    const { userId, accuracy, noteData } = data

    // Store performance data for analysis
    const key = `analytics:performance:${userId}`
    const existing =
      (await this.storageService.get<PerformanceData[]>(key)) || []

    // Convert noteData to proper performance data
    if (noteData && typeof noteData === 'object' && 'type' in noteData) {
      existing.push({
        type: noteData.type as 'rhythm' | 'pitch' | 'key_signature' | 'tempo',
        accuracy,
        count: 1,
      })
    }

    await this.storageService.set(key, existing)
  }

  private async handleSessionEnded(event: EventPayload): Promise<void> {
    const data = event.data as SessionEndedEventData
    const { sessionId, userId, summary } = data

    // Process session data
    const sessionData: SessionData = {
      sessionId,
      userId,
      accuracy: summary.accuracy,
      duration: summary.totalTime || 0,
      timestamp: event.timestamp,
      notesPlayed: summary.notesPlayed,
    }

    // Check for milestones
    await this.checkMilestones(sessionData)

    // Generate and publish report
    const report = await this.getProgressReport(userId, {
      start: Date.now() - 30 * 24 * 60 * 60 * 1000,
      end: Date.now(),
    })

    await this.eventBus.publish({
      source: this.name,
      type: 'progress:report:ready',
      data: { report, userId },
      metadata: { version: this.version, userId },
    })
  }

  private async handleSessionSummary(event: EventPayload): Promise<void> {
    // Similar to handleSessionEnded
    await this.handleSessionEnded(event)
  }

  private async getSessionsInRange(
    userId: string,
    timeRange: TimeRange
  ): Promise<SessionData[]> {
    const sessions = await this.storageService.get<SessionData[]>(
      `analytics:sessions:${userId}`
    )

    if (!Array.isArray(sessions)) return []

    return sessions.filter(
      s => s.timestamp >= timeRange.start && s.timestamp <= timeRange.end
    )
  }

  private createEmptyReport(
    userId: string,
    timeRange: TimeRange
  ): ProgressReport {
    return {
      userId,
      timeRange,
      totalPracticeTime: 0,
      sessionsCompleted: 0,
      averageAccuracy: 0,
      improvementRate: 0,
      strengthAreas: [],
      weakAreas: [],
      milestones: [],
    }
  }

  private calculateImprovementRate(sessions: SessionData[]): number {
    if (sessions.length < 2) return 0

    const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2))
    const secondHalf = sessions.slice(Math.floor(sessions.length / 2))

    const firstAvg =
      firstHalf.reduce((sum, s) => sum + s.accuracy, 0) / firstHalf.length
    const secondAvg =
      secondHalf.reduce((sum, s) => sum + s.accuracy, 0) / secondHalf.length

    return ((secondAvg - firstAvg) / firstAvg) * 100
  }

  private identifyStrengthAreas(sessions: SessionData[]): string[] {
    // Simplified implementation
    const strengths: string[] = []
    const avgAccuracy =
      sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length

    if (avgAccuracy > 0.85) strengths.push('accuracy')
    if (sessions.length > 10) strengths.push('consistency')

    return strengths
  }

  private generateSuggestions(type: string): string[] {
    const suggestions: string[] = []

    switch (type) {
      case 'rhythm':
        suggestions.push('Practice with metronome at slower tempo')
        suggestions.push('Focus on rhythm patterns exercises')
        break
      case 'pitch':
        suggestions.push('Practice scales and intervals')
        suggestions.push('Use pitch recognition exercises')
        break
      case 'tempo':
        suggestions.push('Start at 50% speed and gradually increase')
        suggestions.push('Use tempo ramping exercises')
        break
    }

    return suggestions
  }

  private calculatePriority(accuracy: number): 'high' | 'medium' | 'low' {
    if (accuracy < 0.7) return 'high'
    if (accuracy < 0.8) return 'medium'
    return 'low'
  }

  private calculatePracticeTime(accuracy: number): number {
    if (accuracy < 0.6) return 30
    if (accuracy < 0.75) return 20
    return 15
  }

  private getExercisesForType(type: string): string[] {
    const exercises: Record<string, string[]> = {
      rhythm: [
        'Rhythm patterns',
        'Syncopation exercises',
        'Polyrhythm practice',
      ],
      pitch: ['Interval training', 'Scale practice', 'Chord progressions'],
      tempo: ['Tempo gradation', 'Speed drills', 'Slow practice'],
      key_signature: ['Key signature drills', 'Transposition practice'],
    }

    return exercises[type] || []
  }

  private async getMilestone(
    userId: string,
    milestoneId: string
  ): Promise<Milestone | null> {
    const milestones = await this.getMilestoneHistory(userId)
    return milestones.find(m => m.id === milestoneId) || null
  }

  private async saveMilestone(
    userId: string,
    milestone: Milestone
  ): Promise<void> {
    const key = `analytics:milestones:${userId}`
    const existing = await this.getMilestoneHistory(userId)
    existing.push(milestone)

    await this.storageService.set(key, existing)
  }

  private async getRecentSessions(
    userId: string,
    days: number
  ): Promise<SessionData[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const sessions = await this.storageService.get<SessionData[]>(
      `analytics:sessions:${userId}`
    )

    if (!Array.isArray(sessions)) return []

    return sessions
      .filter(s => s.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  private calculateTrend(
    dataPoints: Array<{ timestamp: number; value: number }>
  ): 'improving' | 'stable' | 'declining' {
    if (dataPoints.length < 2) return 'stable'

    // Simple linear regression
    const n = dataPoints.length
    const sumX = dataPoints.reduce((sum, _, i) => sum + i, 0)
    const sumY = dataPoints.reduce((sum, p) => sum + p.value, 0)
    const sumXY = dataPoints.reduce((sum, p, i) => sum + i * p.value, 0)
    const sumX2 = dataPoints.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    if (slope > 0.01) return 'improving'
    if (slope < -0.01) return 'declining'
    return 'stable'
  }

  private calculateChangePercent(
    dataPoints: Array<{ timestamp: number; value: number }>
  ): number {
    if (dataPoints.length < 2) return 0

    const first = dataPoints[0].value
    const last = dataPoints[dataPoints.length - 1].value

    return ((last - first) / first) * 100
  }

  private calculateStreaks(sessions: Array<{ date: number }>): {
    currentStreak: number
    longestStreak: number
  } {
    if (!sessions || sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 }
    }

    // Sort sessions by date
    const sorted = [...sessions].sort((a, b) => a.date - b.date)

    let currentStreak = 1
    let longestStreak = 1
    let tempStreak = 1

    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].date)
      const currDate = new Date(sorted[i].date)
      const dayDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (dayDiff === 1) {
        tempStreak++
        currentStreak = tempStreak
      } else if (dayDiff > 1) {
        tempStreak = 1
      }

      longestStreak = Math.max(longestStreak, tempStreak)
    }

    // Check if current streak is still active
    const lastSession = new Date(sorted[sorted.length - 1].date)
    const today = new Date()
    const daysSinceLastSession = Math.floor(
      (today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastSession > 1) {
      currentStreak = 0
    }

    return { currentStreak, longestStreak }
  }

  private findMissedDays(sessions: Array<{ date: number }>): number[] {
    // Return timestamps of missed days in the last 30 days
    const missedDays: number[] = []
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const sessionDates = new Set(
      sessions
        .filter(s => s.date >= thirtyDaysAgo)
        .map(s => new Date(s.date).toDateString())
    )

    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      if (!sessionDates.has(date.toDateString())) {
        missedDays.push(date.getTime())
      }
    }

    return missedDays
  }

  private calculateAverageSessionsPerWeek(
    sessions: Array<{ date: number }>
  ): number {
    if (!sessions || sessions.length === 0) return 0

    const firstDate = new Date(Math.min(...sessions.map(s => s.date)))
    const lastDate = new Date(Math.max(...sessions.map(s => s.date)))
    const weeks = Math.max(
      1,
      (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
    )

    return sessions.length / weeks
  }
}
