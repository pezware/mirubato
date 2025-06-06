/**
 * Practice Logger Module - Professional practice logbook for musicians
 */

import { EventBus, EventDrivenStorage } from '../core'
import type { ModuleInterface, ModuleHealth, EventPayload } from '../core/types'
import type {
  LogbookEntry,
  Goal,
  LogFilters,
  ExportOptions,
  ExportResult,
  PracticeReport,
  LoggerConfig,
  GoalMilestone,
  PieceReference,
  PracticeSessionData,
} from './types'

export class PracticeLoggerModule implements ModuleInterface {
  public readonly name = 'PracticeLoggerModule'
  public readonly version = '1.0.0'

  private eventBus: EventBus
  private storage: EventDrivenStorage
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }
  private config: Required<LoggerConfig> = {
    autoSaveInterval: 30000, // 30 seconds
    maxEntriesPerPage: 50,
    enableAutoTagging: true,
    defaultMood: 'neutral',
  }

  constructor(config?: LoggerConfig, storage?: EventDrivenStorage) {
    this.eventBus = EventBus.getInstance()
    this.storage = storage || new EventDrivenStorage()
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.eventBus.publish({
        source: this.name,
        type: 'logger:init:start',
        data: {},
        metadata: { version: this.version },
      })

      // Storage initialization handled by constructor

      // Set up event subscriptions
      this.setupEventSubscriptions()

      this.health.status = 'green'

      await this.eventBus.publish({
        source: this.name,
        type: 'logger:init:complete',
        data: {},
        metadata: { version: this.version },
      })
    } catch (error) {
      this.health.status = 'red'
      this.health.message =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to initialize PracticeLoggerModule:', error)
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Unsubscribe from events
      this.eventBus.unsubscribe('practice:session:ended')
      this.eventBus.unsubscribe('progress:milestone:achieved')

      this.health.status = 'gray'

      await this.eventBus.publish({
        source: this.name,
        type: 'logger:shutdown:complete',
        data: {},
        metadata: { version: this.version },
      })
    } catch (error) {
      console.error('Error during shutdown:', error)
    }
  }

  getHealth(): ModuleHealth {
    return { ...this.health }
  }

  // Logbook Entry Management

  async createLogEntry(entry: Omit<LogbookEntry, 'id'>): Promise<LogbookEntry> {
    this.validateEntry(entry)

    const newEntry: LogbookEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    await this.storage.write(`logbook:${newEntry.id}`, newEntry)

    await this.eventBus.publish({
      source: this.name,
      type: 'logger:entry:created',
      data: { entry: newEntry },
      metadata: { version: this.version },
    })

    return newEntry
  }

  async updateLogEntry(
    id: string,
    updates: Partial<LogbookEntry>
  ): Promise<LogbookEntry> {
    const existing = await this.storage.read<LogbookEntry>(`logbook:${id}`)
    if (!existing) {
      throw new Error('Entry not found')
    }

    const updated: LogbookEntry = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
    }

    await this.storage.write(`logbook:${id}`, updated)

    await this.eventBus.publish({
      source: this.name,
      type: 'logger:entry:updated',
      data: { entry: updated, changes: updates },
      metadata: { version: this.version },
    })

    return updated
  }

  async deleteLogEntry(id: string): Promise<void> {
    await this.storage.delete(`logbook:${id}`)

    await this.eventBus.publish({
      source: this.name,
      type: 'logger:entry:deleted',
      data: { entryId: id },
      metadata: { version: this.version },
    })
  }

  async getLogEntries(filters: LogFilters): Promise<LogbookEntry[]> {
    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      throw new Error('Invalid date range')
    }

    const keys = await this.storage.getKeys()
    const logbookKeys = keys.filter((k: string) => k.startsWith('logbook:'))
    const entryPromises = logbookKeys.map((key: string) =>
      this.storage.read<LogbookEntry>(key)
    )
    const loadedEntries = await Promise.all(entryPromises)
    let entries = loadedEntries.filter((e): e is LogbookEntry => e !== null)

    // Apply filters
    if (filters.userId) {
      entries = entries.filter((e: LogbookEntry) => e.userId === filters.userId)
    }
    if (filters.startDate) {
      entries = entries.filter(
        (e: LogbookEntry) => e.timestamp >= filters.startDate!
      )
    }
    if (filters.endDate) {
      entries = entries.filter(
        (e: LogbookEntry) => e.timestamp <= filters.endDate!
      )
    }
    if (filters.type?.length) {
      entries = entries.filter((e: LogbookEntry) =>
        filters.type!.includes(e.type)
      )
    }
    if (filters.tags?.length) {
      entries = entries.filter((e: LogbookEntry) =>
        e.tags.some((tag: string) => filters.tags!.includes(tag))
      )
    }
    if (filters.mood?.length) {
      entries = entries.filter(
        (e: LogbookEntry) => e.mood && filters.mood!.includes(e.mood)
      )
    }

    // Sort by timestamp (most recent first)
    entries.sort(
      (a: LogbookEntry, b: LogbookEntry) => b.timestamp - a.timestamp
    )

    // Apply pagination
    const offset = filters.offset || 0
    const limit = filters.limit || this.config.maxEntriesPerPage
    return entries.slice(offset, offset + limit)
  }

  // Goal Management

  async createGoal(
    goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Goal> {
    const now = Date.now()
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    }

    await this.storage.write(`goal:${newGoal.id}`, newGoal)

    await this.eventBus.publish({
      source: this.name,
      type: 'logger:goal:created',
      data: { goal: newGoal },
      metadata: { version: this.version },
    })

    return newGoal
  }

  async updateGoalProgress(goalId: string, progress: number): Promise<Goal> {
    const goal = await this.storage.read<Goal>(`goal:${goalId}`)
    if (!goal) {
      throw new Error('Goal not found')
    }

    const updatedGoal: Goal = {
      ...goal,
      progress: Math.min(100, Math.max(0, progress)),
      updatedAt: Date.now(),
    }

    // Mark as completed if progress reaches 100
    if (updatedGoal.progress === 100 && goal.status === 'active') {
      updatedGoal.status = 'completed'
      updatedGoal.completedAt = Date.now()
    }

    await this.storage.write(`goal:${goalId}`, updatedGoal)

    await this.eventBus.publish({
      source: this.name,
      type: 'logger:goal:updated',
      data: { goal: updatedGoal, changes: { progress } },
      metadata: { version: this.version },
    })

    if (updatedGoal.status === 'completed' && goal.status !== 'completed') {
      await this.eventBus.publish({
        source: this.name,
        type: 'logger:goal:completed',
        data: { goal: updatedGoal },
        metadata: { version: this.version },
      })
    }

    return updatedGoal
  }

  async updateGoalMilestone(
    goalId: string,
    milestoneId: string,
    completed: boolean
  ): Promise<Goal> {
    const goal = await this.storage.read<Goal>(`goal:${goalId}`)
    if (!goal) {
      throw new Error('Goal not found')
    }

    const updatedGoal: Goal = {
      ...goal,
      milestones: goal.milestones.map((m: GoalMilestone) =>
        m.id === milestoneId
          ? { ...m, completed, completedAt: completed ? Date.now() : undefined }
          : m
      ),
      updatedAt: Date.now(),
    }

    await this.storage.write(`goal:${goalId}`, updatedGoal)

    return updatedGoal
  }

  async linkEntryToGoal(entryId: string, goalId: string): Promise<Goal> {
    const goal = await this.storage.read<Goal>(`goal:${goalId}`)
    if (!goal) {
      throw new Error('Goal not found')
    }

    const updatedGoal: Goal = {
      ...goal,
      linkedEntries: [...new Set([...goal.linkedEntries, entryId])],
      updatedAt: Date.now(),
    }

    await this.storage.write(`goal:${goalId}`, updatedGoal)

    return updatedGoal
  }

  async getActiveGoals(userId: string): Promise<Goal[]> {
    const keys = await this.storage.getKeys()
    const goalKeys = keys.filter((k: string) => k.startsWith('goal:'))
    const goalPromises = goalKeys.map((key: string) =>
      this.storage.read<Goal>(key)
    )
    const loadedGoals = await Promise.all(goalPromises)
    return loadedGoals
      .filter(
        (g): g is Goal =>
          g !== null && g.userId === userId && g.status === 'active'
      )
      .sort((a: Goal, b: Goal) => b.createdAt - a.createdAt)
  }

  // Export Functionality

  async exportLogs(options: ExportOptions): Promise<ExportResult> {
    try {
      const entries = await this.getLogEntries(options.filters)
      let result: ExportResult

      switch (options.format) {
        case 'json':
          result = await this.exportAsJSON(entries, options)
          break
        case 'csv':
          result = await this.exportAsCSV(entries)
          break
        case 'pdf':
          // PDF export would require additional libraries
          result = {
            success: false,
            error: 'PDF export not yet implemented',
          }
          break
        default:
          throw new Error('Unsupported export format')
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'logger:export:ready',
        data: { result },
        metadata: { version: this.version },
      })

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      }
    }
  }

  async generatePracticeReport(timeRange: {
    startDate: number
    endDate: number
  }): Promise<PracticeReport> {
    const entries = await this.getLogEntries({
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
    })

    const report: PracticeReport = {
      userId: entries[0]?.userId || '',
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
      totalDuration: entries.reduce((sum, e) => sum + e.duration, 0),
      totalEntries: entries.length,
      averageDuration: entries.length
        ? entries.reduce((sum, e) => sum + e.duration, 0) / entries.length
        : 0,
      entriesByType: this.countByType(entries),
      topPieces: this.getTopPieces(entries),
      goalProgress: [], // Would need to fetch and calculate
      moodDistribution: this.countMoods(entries),
      practiceStreak: this.calculateStreak(entries),
      longestSession: this.findLongestSession(entries),
    }

    await this.eventBus.publish({
      source: this.name,
      type: 'logger:report:generated',
      data: { report },
      metadata: { version: this.version },
    })

    return report
  }

  // Private Helper Methods

  private setupEventSubscriptions(): void {
    this.eventBus.subscribe(
      'practice:session:ended',
      this.handleSessionEnded.bind(this)
    )
    this.eventBus.subscribe(
      'progress:milestone:achieved',
      this.handleMilestoneAchieved.bind(this)
    )
  }

  private handleSessionEnded = async (event: EventPayload): Promise<void> => {
    const data = event.data as { session?: PracticeSessionData }
    if (data?.session) {
      const session = data.session
      const entry: Omit<LogbookEntry, 'id'> = {
        userId: session.userId,
        timestamp: Date.now(),
        duration: session.duration,
        type: 'practice',
        pieces: session.pieces || [],
        techniques: [],
        goals: [],
        notes: '',
        mood: this.config.defaultMood,
        tags: this.config.enableAutoTagging
          ? this.generateAutoTags(session)
          : [],
        sessionId: session.id,
      }

      await this.createLogEntry(entry)
    }
  }

  private handleMilestoneAchieved = async (
    event: EventPayload
  ): Promise<void> => {
    const data = event.data as { linkedGoals?: string[] }
    if (data?.linkedGoals) {
      for (const goalId of data.linkedGoals) {
        const goal = await this.storage.read<Goal>(`goal:${goalId}`)
        if (goal && goal.status === 'active') {
          // Increment progress based on milestone importance
          const progressIncrement = 100 / (goal.milestones.length || 1)
          await this.updateGoalProgress(
            goalId,
            Math.min(100, goal.progress + progressIncrement)
          )
        }
      }
    }
  }

  private validateEntry(entry: Omit<LogbookEntry, 'id'>): void {
    if (entry.duration < 0) {
      throw new Error('Invalid duration')
    }
    if (!entry.userId) {
      throw new Error('User ID is required')
    }
    if (!entry.type) {
      throw new Error('Entry type is required')
    }
  }

  private async exportAsJSON(
    entries: LogbookEntry[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportData: Record<string, unknown> = { entries }

    if (options.includeGoals) {
      const keys = await this.storage.getKeys()
      const goalKeys = keys.filter((k: string) => k.startsWith('goal:'))
      const goalPromises = goalKeys.map((key: string) =>
        this.storage.read<Goal>(key)
      )
      const loadedGoals = await Promise.all(goalPromises)
      exportData.goals = loadedGoals.filter((g): g is Goal => g !== null)
    }

    const data = JSON.stringify(exportData, null, 2)
    const filename = `practice-log-${Date.now()}.json`

    return {
      success: true,
      filename,
      data,
    }
  }

  private async exportAsCSV(entries: LogbookEntry[]): Promise<ExportResult> {
    const headers = [
      'Date',
      'Duration',
      'Type',
      'Pieces',
      'Techniques',
      'Mood',
      'Notes',
    ]
    const rows = entries.map((e: LogbookEntry) => [
      new Date(e.timestamp).toISOString(),
      `${Math.round(e.duration / 60)}`,
      e.type,
      e.pieces.map((p: PieceReference) => p.title).join('; '),
      e.techniques.join('; '),
      e.mood || '',
      e.notes.replace(/,/g, ';'),
    ])

    const csv = [headers, ...rows]
      .map((row: string[]) => row.join(','))
      .join('\n')
    const filename = `practice-log-${Date.now()}.csv`

    return {
      success: true,
      filename,
      data: csv,
    }
  }

  private countByType(
    entries: LogbookEntry[]
  ): Record<LogbookEntry['type'], number> {
    return entries.reduce(
      (acc: Record<LogbookEntry['type'], number>, e: LogbookEntry) => {
        acc[e.type] = (acc[e.type] || 0) + 1
        return acc
      },
      {} as Record<LogbookEntry['type'], number>
    )
  }

  private countMoods(
    entries: LogbookEntry[]
  ): Record<NonNullable<LogbookEntry['mood']>, number> {
    return entries.reduce(
      (
        acc: Record<NonNullable<LogbookEntry['mood']>, number>,
        e: LogbookEntry
      ) => {
        if (e.mood) {
          acc[e.mood] = (acc[e.mood] || 0) + 1
        }
        return acc
      },
      {} as Record<NonNullable<LogbookEntry['mood']>, number>
    )
  }

  private getTopPieces(
    entries: LogbookEntry[]
  ): Array<{ piece: PieceReference; duration: number; count: number }> {
    const pieceStats = new Map<
      string,
      {
        piece: PieceReference
        duration: number
        count: number
      }
    >()

    entries.forEach((e: LogbookEntry) => {
      e.pieces.forEach((p: PieceReference) => {
        const existing = pieceStats.get(p.id) || {
          piece: p,
          duration: 0,
          count: 0,
        }
        pieceStats.set(p.id, {
          piece: p,
          duration: existing.duration + e.duration,
          count: existing.count + 1,
        })
      })
    })

    return Array.from(pieceStats.values())
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
  }

  private calculateStreak(entries: LogbookEntry[]): number {
    if (entries.length === 0) return 0

    const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp)
    const today = new Date().setHours(0, 0, 0, 0)
    let streak = 0
    let currentDate = today

    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.timestamp).setHours(0, 0, 0, 0)
      if (entryDate === currentDate) {
        streak++
        currentDate -= 86400000 // Previous day
      } else if (entryDate < currentDate - 86400000) {
        break // Gap in practice
      }
    }

    return streak
  }

  private findLongestSession(entries: LogbookEntry[]): LogbookEntry | null {
    if (entries.length === 0) return null
    return entries.reduce((longest, current) =>
      current.duration > longest.duration ? current : longest
    )
  }

  private generateAutoTags(session: PracticeSessionData): string[] {
    const tags: string[] = []

    // Add tags based on session data
    if (session.accuracy && session.accuracy > 90) {
      tags.push('high-accuracy')
    }
    if (session.duration > 3600) {
      tags.push('extended-session')
    }

    return tags
  }
}
