/**
 * Logbook Reporting Module - Phase 4 Implementation
 *
 * Follows core principle: Universal access for all users
 * - Anonymous users: Uses localStorage data
 * - Authenticated users: Uses D1 database via GraphQL
 *
 * Provides minute-level accuracy for all time calculations
 */

import {
  LogbookReportingInterface,
  LogbookReportData,
  PieceStatistics,
  TimeBasedStatistics,
  CategoryStatistics,
  OverallStatistics,
  ReportFilters,
  ReportExportOptions,
  ReportExportResult,
} from './types'
import { LogbookEntry, Goal } from '../logger/types'
import { PracticeLoggerModule } from '../logger'
import { Instrument } from '@mirubato/shared/types'
import { ModuleInterface, ModuleHealth } from '../core/types'
import { EventBus } from '../core/EventBus'
import { AuthLoginEventData } from '../core/eventTypes'

export class LogbookReportingModule
  implements ModuleInterface, LogbookReportingInterface
{
  public readonly name = 'LogbookReportingModule'
  public readonly version = '1.0.0'

  private eventBus: EventBus
  private isInitialized = false
  private isAuthenticated = false
  private hasCloudStorage = false
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private practiceLoggerModule: PracticeLoggerModule | null = null

  constructor(eventBus: EventBus, practiceLoggerModule?: PracticeLoggerModule) {
    this.eventBus = eventBus
    this.practiceLoggerModule = practiceLoggerModule || null
  }

  async initialize(): Promise<void> {
    try {
      // Listen for authentication state changes
      this.eventBus.subscribe('auth:login', payload => {
        const authData = payload.data as AuthLoginEventData
        this.isAuthenticated = true
        // Check if user has cloud storage access
        this.hasCloudStorage = authData.user.hasCloudStorage
        this.clearCache() // Clear cache on auth state change
      })

      this.eventBus.subscribe('auth:logout', () => {
        this.isAuthenticated = false
        this.hasCloudStorage = false
        this.clearCache()
      })

      // Listen for logbook data changes to invalidate cache
      this.eventBus.subscribe('logger:entry:created', () => this.clearCache())
      this.eventBus.subscribe('logger:entry:updated', () => this.clearCache())
      this.eventBus.subscribe('logger:entry:deleted', () => this.clearCache())
      this.eventBus.subscribe('logger:goal:updated', () => this.clearCache())

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize LogbookReportingModule:', error)
      throw error
    }
  }

  getHealth(): ModuleHealth {
    return {
      status: this.isInitialized ? 'green' : 'red',
      lastCheck: Date.now(),
      message: `Initialized: ${this.isInitialized}, Auth: ${this.isAuthenticated}, CloudStorage: ${this.hasCloudStorage}, Cache: ${this.cache.size}`,
    }
  }

  async shutdown(): Promise<void> {
    this.clearCache()
    this.isInitialized = false
  }

  async generateLogbookReport(
    filters?: ReportFilters
  ): Promise<LogbookReportData> {
    const cacheKey = `report:${JSON.stringify(filters)}`
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    const [entries, goals] = await this.getLogbookData(filters)

    const report: LogbookReportData = {
      overall: await this.calculateOverallStatistics(entries, goals, filters),
      byRepertoire: await this.calculatePieceStatistics(entries, filters),
      byMonth: await this.calculateTimeBasedStatistics(
        'month',
        entries,
        filters
      ),
      byWeek: await this.calculateTimeBasedStatistics('week', entries, filters),
      byTag: await this.calculateCategoryStatistics('tag', entries, filters),
      byTechnique: await this.calculateCategoryStatistics(
        'technique',
        entries,
        filters
      ),
      byInstrument: await this.calculateCategoryStatistics(
        'instrument',
        entries,
        filters
      ),
      moodTrends: this.calculateMoodTrends(entries),
      goalProgress: this.calculateGoalProgress(entries, goals),
    }

    this.setCachedData(cacheKey, report)
    return report
  }

  async getPieceStatistics(
    filters?: ReportFilters
  ): Promise<PieceStatistics[]> {
    const entries = await this.getLogbookEntries(filters)
    return this.calculatePieceStatistics(entries, filters)
  }

  async getTimeBasedStatistics(
    pivot: 'month' | 'week',
    filters?: ReportFilters
  ): Promise<TimeBasedStatistics[]> {
    const entries = await this.getLogbookEntries(filters)
    return this.calculateTimeBasedStatistics(pivot, entries, filters)
  }

  async getCategoryStatistics(
    category: 'tag' | 'technique' | 'instrument',
    filters?: ReportFilters
  ): Promise<CategoryStatistics[]> {
    const entries = await this.getLogbookEntries(filters)
    return this.calculateCategoryStatistics(category, entries, filters)
  }

  async getOverallStatistics(
    filters?: ReportFilters
  ): Promise<OverallStatistics> {
    const [entries, goals] = await this.getLogbookData(filters)
    return this.calculateOverallStatistics(entries, goals, filters)
  }

  async exportReport(
    options: ReportExportOptions
  ): Promise<ReportExportResult> {
    try {
      const report = await this.generateLogbookReport(options.filters)

      switch (options.format) {
        case 'json':
          return this.exportAsJSON(report, options)
        case 'csv':
          return this.exportAsCSV(report, options)
        case 'pdf':
          return this.exportAsPDF(report, options)
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      }
    }
  }

  // Private helper methods

  private async getLogbookData(
    filters?: ReportFilters
  ): Promise<[LogbookEntry[], Goal[]]> {
    // Only use cloud data if authenticated AND has cloud storage
    if (this.isAuthenticated && this.hasCloudStorage) {
      return this.getAuthenticatedData(filters)
    } else {
      return this.getLocalStorageData(filters)
    }
  }

  private async getLogbookEntries(
    filters?: ReportFilters
  ): Promise<LogbookEntry[]> {
    const [entries] = await this.getLogbookData(filters)
    return entries
  }

  private async getAuthenticatedData(
    filters?: ReportFilters
  ): Promise<[LogbookEntry[], Goal[]]> {
    try {
      // Get Apollo client from the context or initialize it
      const { GET_LOGBOOK_ENTRIES, GET_GOALS } = await import(
        '../../graphql/queries/practice'
      )
      const { apolloClient } = await import('../../lib/apollo/client')

      // Build filter object for logbook entries
      const logbookFilter: Record<string, unknown> = {}
      if (filters?.timeRange?.start) {
        logbookFilter.startDate = new Date(
          filters.timeRange.start
        ).toISOString()
      }
      if (filters?.timeRange?.end) {
        logbookFilter.endDate = new Date(filters.timeRange.end).toISOString()
      }
      if (filters?.types?.length) {
        logbookFilter.type = filters.types
      }
      if (filters?.moods?.length) {
        logbookFilter.mood = filters.moods
      }
      if (filters?.tags?.length) {
        logbookFilter.tags = filters.tags
      }
      if (filters?.instruments?.length && filters.instruments.length > 0) {
        logbookFilter.instrument = filters.instruments[0]
      }

      // Fetch logbook entries from backend
      const entriesResult = await apolloClient.query({
        query: GET_LOGBOOK_ENTRIES,
        variables: {
          filter:
            Object.keys(logbookFilter).length > 0 ? logbookFilter : undefined,
          limit: 1000,
          offset: 0,
        },
      })

      // Fetch goals from backend
      const goalsResult = await apolloClient.query({
        query: GET_GOALS,
        variables: {
          status: 'ACTIVE',
          limit: 100,
          offset: 0,
        },
      })

      // Transform the data to match our LogbookEntry interface
      const entries: LogbookEntry[] = (
        entriesResult.data?.myLogbookEntries?.edges || []
      )
        .map((edge: { node: unknown }) => edge.node as any)
        .map(
          (entry: {
            id: string
            userId: string
            timestamp: string
            duration: number
            type: string
            instrument: string
            pieces: Array<{ id: string; title: string; composer?: string }>
            techniques: string[]
            goalIds: string[]
            notes?: string
            mood?: string
            tags: string[]
            metadata?: { source: string; accuracy?: number }
            createdAt: string
            updatedAt: string
          }) => ({
            ...entry,
            timestamp: new Date(entry.timestamp).getTime(),
            goals: entry.goalIds, // Map goalIds to goals field
          })
        )

      // Transform goals to match our Goal interface
      const goals: Goal[] = (goalsResult.data?.myGoals?.edges || [])
        .map((edge: { node: unknown }) => edge.node as any)
        .map(
          (goal: {
            id: string
            userId: string
            title: string
            description?: string
            targetDate?: string
            progress: number
            status: string
            linkedEntries: string[]
            milestones: Array<{ id: string; title: string; completed: boolean }>
            createdAt: string
            updatedAt: string
          }) => ({
            ...goal,
            targetDate: goal.targetDate
              ? new Date(goal.targetDate).getTime()
              : undefined,
          })
        )

      return [entries, goals]
    } catch (error) {
      console.error('Error fetching data from GraphQL:', error)
      // Fallback to localStorage on error
      return this.getLocalStorageData(filters)
    }
  }

  private async getLocalStorageData(
    filters?: ReportFilters
  ): Promise<[LogbookEntry[], Goal[]]> {
    try {
      // If we have a reference to PracticeLoggerModule, use it
      if (this.practiceLoggerModule) {
        const logFilters = {
          startDate: filters?.timeRange?.start,
          endDate: filters?.timeRange?.end,
          type: filters?.types,
          mood: filters?.moods,
          tags: filters?.tags,
          instrument: filters?.instruments,
          limit: 1000, // Get all entries for reporting
        }

        const entries =
          await this.practiceLoggerModule.getLogEntries(logFilters)
        const goals = await this.practiceLoggerModule.getGoals({})

        return [entries, goals]
      }

      // Fallback: Try to read directly from localStorage
      const entriesData = localStorage.getItem('mirubato_logbook_entries')
      const goalsData = localStorage.getItem('mirubato_goals')

      const entries: LogbookEntry[] = entriesData ? JSON.parse(entriesData) : []
      const goals: Goal[] = goalsData ? JSON.parse(goalsData) : []

      return [this.applyFilters(entries, filters), goals]
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return [[], []]
    }
  }

  private applyFilters(
    entries: LogbookEntry[],
    filters?: ReportFilters
  ): LogbookEntry[] {
    if (!filters) return entries

    return entries.filter(entry => {
      // Time range filter
      if (filters.timeRange) {
        if (
          entry.timestamp < filters.timeRange.start ||
          entry.timestamp > filters.timeRange.end
        ) {
          return false
        }
      }

      // Instrument filter
      if (
        filters.instruments &&
        !filters.instruments.includes(entry.instrument)
      ) {
        return false
      }

      // Type filter
      if (filters.types && !filters.types.includes(entry.type)) {
        return false
      }

      // Tags filter
      if (filters.tags && !filters.tags.some(tag => entry.tags.includes(tag))) {
        return false
      }

      // Techniques filter
      if (
        filters.techniques &&
        !filters.techniques.some(tech => entry.techniques.includes(tech))
      ) {
        return false
      }

      // Mood filter
      if (filters.moods && entry.mood && !filters.moods.includes(entry.mood)) {
        return false
      }

      return true
    })
  }

  private async calculatePieceStatistics(
    entries: LogbookEntry[],
    _filters?: ReportFilters
  ): Promise<PieceStatistics[]> {
    const pieceMap = new Map<
      string,
      {
        piece: { title: string; composer?: string }
        sessions: LogbookEntry[]
        instruments: Set<Instrument>
      }
    >()

    // Group entries by piece title (case-insensitive)
    entries.forEach(entry => {
      entry.pieces.forEach(piece => {
        const key = piece.title.toLowerCase()
        if (!pieceMap.has(key)) {
          pieceMap.set(key, {
            piece: { title: piece.title, composer: piece.composer },
            sessions: [],
            instruments: new Set(),
          })
        }

        const pieceData = pieceMap.get(key)!
        pieceData.sessions.push(entry)
        pieceData.instruments.add(entry.instrument)
      })
    })

    // Calculate statistics for each piece
    const statistics: PieceStatistics[] = []

    for (const [, pieceData] of pieceMap) {
      const sessions = pieceData.sessions
      const totalDurationMinutes = Math.round(
        sessions.reduce((sum, session) => sum + session.duration, 0) / 60
      )
      const timestamps = sessions.map(s => s.timestamp)

      statistics.push({
        piece: pieceData.piece,
        totalDuration: totalDurationMinutes,
        sessionCount: sessions.length,
        averageDuration: Math.round(totalDurationMinutes / sessions.length),
        instruments: Array.from(pieceData.instruments),
        firstPracticed: Math.min(...timestamps),
        lastPracticed: Math.max(...timestamps),
      })
    }

    // Sort by total duration descending
    return statistics.sort((a, b) => b.totalDuration - a.totalDuration)
  }

  private async calculateTimeBasedStatistics(
    pivot: 'month' | 'week',
    entries: LogbookEntry[],
    _filters?: ReportFilters
  ): Promise<TimeBasedStatistics[]> {
    const periodMap = new Map<string, LogbookEntry[]>()

    // Group entries by time period
    entries.forEach(entry => {
      const date = new Date(entry.timestamp)
      let period: string

      if (pivot === 'month') {
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else {
        // Week calculation (ISO week)
        const week = this.getISOWeek(date)
        period = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
      }

      if (!periodMap.has(period)) {
        periodMap.set(period, [])
      }
      periodMap.get(period)!.push(entry)
    })

    // Calculate statistics for each period
    const statistics: TimeBasedStatistics[] = []

    for (const [period, periodEntries] of periodMap) {
      const totalDurationMinutes = Math.round(
        periodEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60
      )

      // Calculate top pieces for this period
      const pieceMap = new Map<string, number>()
      periodEntries.forEach(entry => {
        entry.pieces.forEach(piece => {
          const title = piece.title
          pieceMap.set(
            title,
            (pieceMap.get(title) || 0) + Math.round(entry.duration / 60)
          )
        })
      })

      const topPieces = Array.from(pieceMap.entries())
        .map(([title, duration]) => ({ title, duration }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)

      // Calculate instrument distribution
      const instruments: Record<Instrument, number> = {} as Record<
        Instrument,
        number
      >
      periodEntries.forEach(entry => {
        const durationMinutes = Math.round(entry.duration / 60)
        instruments[entry.instrument] =
          (instruments[entry.instrument] || 0) + durationMinutes
      })

      statistics.push({
        period,
        totalDuration: totalDurationMinutes,
        sessionCount: periodEntries.length,
        averageDuration: Math.round(
          totalDurationMinutes / periodEntries.length
        ),
        topPieces,
        instruments,
      })
    }

    // Sort by period descending (most recent first)
    return statistics.sort((a, b) => b.period.localeCompare(a.period))
  }

  private async calculateCategoryStatistics(
    category: 'tag' | 'technique' | 'instrument',
    entries: LogbookEntry[],
    _filters?: ReportFilters
  ): Promise<CategoryStatistics[]> {
    const categoryMap = new Map<string, LogbookEntry[]>()

    // Group entries by category
    entries.forEach(entry => {
      let categories: string[] = []

      switch (category) {
        case 'tag':
          categories = entry.tags
          break
        case 'technique':
          categories = entry.techniques
          break
        case 'instrument':
          categories = [entry.instrument]
          break
      }

      categories.forEach(cat => {
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, [])
        }
        categoryMap.get(cat)!.push(entry)
      })
    })

    // Calculate statistics for each category
    const statistics: CategoryStatistics[] = []

    for (const [categoryName, categoryEntries] of categoryMap) {
      const totalDurationMinutes = Math.round(
        categoryEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60
      )

      // Count unique pieces
      const uniquePieces = new Set<string>()
      categoryEntries.forEach(entry => {
        entry.pieces.forEach(piece =>
          uniquePieces.add(piece.title.toLowerCase())
        )
      })

      // Calculate mood distribution
      const moodDistribution: Record<
        NonNullable<LogbookEntry['mood']>,
        number
      > = {
        frustrated: 0,
        neutral: 0,
        satisfied: 0,
        excited: 0,
      }

      categoryEntries.forEach(entry => {
        if (entry.mood) {
          moodDistribution[entry.mood]++
        }
      })

      statistics.push({
        category: categoryName,
        totalDuration: totalDurationMinutes,
        sessionCount: categoryEntries.length,
        averageDuration: Math.round(
          totalDurationMinutes / categoryEntries.length
        ),
        pieceCount: uniquePieces.size,
        moodDistribution,
      })
    }

    // Sort by total duration descending
    return statistics.sort((a, b) => b.totalDuration - a.totalDuration)
  }

  private async calculateOverallStatistics(
    entries: LogbookEntry[],
    goals: Goal[],
    _filters?: ReportFilters
  ): Promise<OverallStatistics> {
    const totalDurationMinutes = Math.round(
      entries.reduce((sum, entry) => sum + entry.duration, 0) / 60
    )

    // Calculate practice streak (consecutive days)
    const practiceStreak = this.calculatePracticeStreak(entries)

    // Calculate current week and month totals
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const currentWeekEntries = entries.filter(
      entry => entry.timestamp >= startOfWeek.getTime()
    )
    const currentMonthEntries = entries.filter(
      entry => entry.timestamp >= startOfMonth.getTime()
    )

    const currentWeekTotal = Math.round(
      currentWeekEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60
    )
    const currentMonthTotal = Math.round(
      currentMonthEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60
    )

    // Count unique pieces
    const uniquePieces = new Set<string>()
    entries.forEach(entry => {
      entry.pieces.forEach(piece => uniquePieces.add(piece.title.toLowerCase()))
    })

    // Count completed goals
    const completedGoals = goals.filter(
      goal => goal.status === 'completed'
    ).length

    // Find active pieces (practiced in last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recentEntries = entries.filter(
      entry => entry.timestamp >= thirtyDaysAgo
    )
    const activePieces = new Set<string>()
    recentEntries.forEach(entry => {
      entry.pieces.forEach(piece => activePieces.add(piece.title))
    })

    return {
      totalDuration: totalDurationMinutes,
      totalSessions: entries.length,
      averageSessionDuration:
        entries.length > 0
          ? Math.round(totalDurationMinutes / entries.length)
          : 0,
      practiceStreak,
      currentWeekTotal,
      currentMonthTotal,
      uniquePieces: uniquePieces.size,
      completedGoals,
      activePieces: Array.from(activePieces),
    }
  }

  private calculateMoodTrends(
    entries: LogbookEntry[]
  ): Record<NonNullable<LogbookEntry['mood']>, number> {
    const moodCounts: Record<NonNullable<LogbookEntry['mood']>, number> = {
      frustrated: 0,
      neutral: 0,
      satisfied: 0,
      excited: 0,
    }

    entries.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood]++
      }
    })

    return moodCounts
  }

  private calculateGoalProgress(
    entries: LogbookEntry[],
    goals: Goal[]
  ): Array<{
    goal: Goal
    linkedDuration: number
    progressPercentage: number
  }> {
    return goals.map(goal => {
      // Find entries linked to this goal
      const linkedEntries = entries.filter(
        entry =>
          entry.goals?.includes(goal.id) ||
          goal.linkedEntries.includes(entry.id)
      )

      const linkedDuration = Math.round(
        linkedEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60
      )

      return {
        goal,
        linkedDuration,
        progressPercentage: goal.progress,
      }
    })
  }

  private calculatePracticeStreak(entries: LogbookEntry[]): number {
    if (entries.length === 0) return 0

    // Group entries by date
    const dateSet = new Set<string>()
    entries.forEach(entry => {
      const date = new Date(entry.timestamp)
      const dateStr = date.toISOString().split('T')[0]
      dateSet.add(dateStr)
    })

    const dates = Array.from(dateSet).sort()
    if (dates.length === 0) return 0

    // Get today's date string
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Get yesterday's date string
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Get the most recent practice date
    const mostRecentDate = dates[dates.length - 1]

    // If the most recent practice is not today or yesterday, streak is 0
    if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
      return 0
    }

    // Count consecutive days backwards from the most recent date
    let streak = 0
    const checkDate = new Date(mostRecentDate)

    for (let i = dates.length - 1; i >= 0; i--) {
      const dateStr = dates[i]
      const checkDateStr = checkDate.toISOString().split('T')[0]

      if (dateStr === checkDateStr) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (new Date(dateStr) < checkDate) {
        // We've skipped a day, streak ends
        break
      }
    }

    return streak
  }

  private getISOWeek(date: Date): number {
    const target = new Date(date.valueOf())
    const dayNr = (date.getDay() + 6) % 7
    target.setDate(target.getDate() - dayNr + 3)
    const jan4 = new Date(target.getFullYear(), 0, 4)
    const dayDiff = (target.getTime() - jan4.getTime()) / 86400000
    return 1 + Math.ceil(dayDiff / 7)
  }

  // Export methods

  private exportAsJSON(
    report: LogbookReportData,
    _options: ReportExportOptions
  ): ReportExportResult {
    const filename = `logbook-report-${Date.now()}.json`
    const data = JSON.stringify(report, null, 2)

    return {
      success: true,
      filename,
      data,
    }
  }

  private exportAsCSV(
    report: LogbookReportData,
    options: ReportExportOptions
  ): ReportExportResult {
    const filename = `logbook-report-${Date.now()}.csv`

    let csv = ''

    // Export based on pivot
    switch (options.pivot) {
      case 'repertoire':
        csv = this.generatePieceCSV(report.byRepertoire)
        break
      case 'month':
        csv = this.generateTimeCSV(report.byMonth, 'Month')
        break
      case 'week':
        csv = this.generateTimeCSV(report.byWeek, 'Week')
        break
      case 'tag':
        csv = this.generateCategoryCSV(report.byTag, 'Tag')
        break
      case 'technique':
        csv = this.generateCategoryCSV(report.byTechnique, 'Technique')
        break
      case 'instrument':
        csv = this.generateCategoryCSV(report.byInstrument, 'Instrument')
        break
      default:
        csv = this.generateOverallCSV(report.overall)
    }

    return {
      success: true,
      filename,
      data: csv,
    }
  }

  private exportAsPDF(
    _report: LogbookReportData,
    _options: ReportExportOptions
  ): ReportExportResult {
    // TODO: Implement PDF export using a library like jsPDF
    return {
      success: false,
      error: 'PDF export not yet implemented',
    }
  }

  private generatePieceCSV(pieces: PieceStatistics[]): string {
    const headers = [
      'Title',
      'Composer',
      'Total Duration (min)',
      'Sessions',
      'Avg Duration (min)',
      'Instruments',
    ]
    const rows = pieces.map(piece => [
      piece.piece.title,
      piece.piece.composer || '',
      piece.totalDuration.toString(),
      piece.sessionCount.toString(),
      piece.averageDuration.toString(),
      piece.instruments.join('; '),
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }

  private generateTimeCSV(
    timeStats: TimeBasedStatistics[],
    periodType: string
  ): string {
    const headers = [
      periodType,
      'Total Duration (min)',
      'Sessions',
      'Avg Duration (min)',
    ]
    const rows = timeStats.map(stat => [
      stat.period,
      stat.totalDuration.toString(),
      stat.sessionCount.toString(),
      stat.averageDuration.toString(),
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }

  private generateCategoryCSV(
    categories: CategoryStatistics[],
    categoryType: string
  ): string {
    const headers = [
      categoryType,
      'Total Duration (min)',
      'Sessions',
      'Avg Duration (min)',
      'Unique Pieces',
    ]
    const rows = categories.map(cat => [
      cat.category,
      cat.totalDuration.toString(),
      cat.sessionCount.toString(),
      cat.averageDuration.toString(),
      cat.pieceCount.toString(),
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }

  private generateOverallCSV(overall: OverallStatistics): string {
    const data = [
      ['Metric', 'Value'],
      ['Total Duration (min)', overall.totalDuration.toString()],
      ['Total Sessions', overall.totalSessions.toString()],
      [
        'Average Session Duration (min)',
        overall.averageSessionDuration.toString(),
      ],
      ['Practice Streak (days)', overall.practiceStreak.toString()],
      ['Current Week Total (min)', overall.currentWeekTotal.toString()],
      ['Current Month Total (min)', overall.currentMonthTotal.toString()],
      ['Unique Pieces', overall.uniquePieces.toString()],
      ['Completed Goals', overall.completedGoals.toString()],
    ]

    return data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  // Cache management

  private getCachedData(key: string): LogbookReportData | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as LogbookReportData
    }
    return null
  }

  private setCachedData(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  private clearCache(): void {
    this.cache.clear()
  }
}
