import { ModuleInterface } from '../core/types'
import { LogbookEntry, Goal } from '../logger/types'
import { Instrument } from '@mirubato/shared/types'

export interface TimeRange {
  start: number
  end: number
}

export interface WeakArea {
  type: 'rhythm' | 'pitch' | 'key_signature' | 'tempo'
  accuracy: number
  occurrences: number
  suggestions: string[]
}

export interface FocusArea {
  type: 'rhythm' | 'pitch' | 'key_signature' | 'tempo'
  priority: 'high' | 'medium' | 'low'
  practiceTimeMinutes: number
  exercises: string[]
}

export interface Milestone {
  id: string
  type: 'accuracy' | 'consistency' | 'level' | 'time'
  achieved: boolean
  achievedAt?: number
  criteria: MilestoneCriteria
}

export interface MilestoneCriteria {
  type: string
  target: number
  window?: number // time window in days
}

export interface ProgressReport {
  userId: string
  timeRange: TimeRange
  totalPracticeTime: number
  sessionsCompleted: number
  averageAccuracy: number
  improvementRate: number
  strengthAreas: string[]
  weakAreas: WeakArea[]
  milestones: Milestone[]
}

export interface TrendData {
  dataPoints: Array<{
    timestamp: number
    value: number
  }>
  trend: 'improving' | 'stable' | 'declining'
  changePercent: number
}

export interface ConsistencyMetrics {
  daysActive: number
  currentStreak: number
  longestStreak: number
  averageSessionsPerWeek: number
  missedDays: number[]
}

export interface SessionData {
  sessionId: string
  userId: string
  accuracy: number
  duration: number
  timestamp: number
  notesPlayed: number
  exerciseType?: string
  date?: number
}

export interface PerformanceData {
  type: 'rhythm' | 'pitch' | 'key_signature' | 'tempo'
  accuracy: number
  count?: number
  occurrences?: number
}

export interface ProgressAnalyticsModuleConfig {
  milestoneThresholds?: {
    accuracy?: number[]
    consistency?: number[]
    time?: number[]
  }
  analysisWindow?: number // days to analyze
  minSessionsForTrend?: number
}

export interface ProgressAnalyticsModuleInterface extends ModuleInterface {
  // Analysis methods
  getProgressReport(
    userId: string,
    timeRange: TimeRange
  ): Promise<ProgressReport>
  getWeakAreas(userId: string): Promise<WeakArea[]>
  getSuggestedFocus(userId: string): Promise<FocusArea[]>

  // Milestone tracking
  checkMilestones(sessionData: SessionData): Promise<Milestone[]>
  getMilestoneHistory(userId: string): Promise<Milestone[]>

  // Trend analysis
  getAccuracyTrend(userId: string, days: number): Promise<TrendData>
  getPracticeConsistency(userId: string): Promise<ConsistencyMetrics>
}

// Logbook Reporting Types (Phase 4)

export interface ReportFilters {
  timeRange?: TimeRange
  instruments?: Instrument[]
  types?: LogbookEntry['type'][]
  tags?: string[]
  techniques?: string[]
  moods?: LogbookEntry['mood'][]
}

export interface PieceStatistics {
  piece: {
    title: string
    composer?: string
  }
  totalDuration: number // in minutes (minute-level accuracy)
  sessionCount: number
  averageDuration: number // in minutes
  instruments: Instrument[]
  firstPracticed: number
  lastPracticed: number
}

export interface TimeBasedStatistics {
  period: string // "2024-01" for month, "2024-W48" for week
  totalDuration: number // in minutes (minute-level accuracy)
  sessionCount: number
  averageDuration: number // in minutes
  topPieces: Array<{
    title: string
    duration: number // in minutes
  }>
  instruments: Record<Instrument, number> // duration per instrument in minutes
}

export interface CategoryStatistics {
  category: string // tag name, technique name, or instrument
  totalDuration: number // in minutes (minute-level accuracy)
  sessionCount: number
  averageDuration: number // in minutes
  pieceCount: number // unique pieces practiced
  moodDistribution: Record<NonNullable<LogbookEntry['mood']>, number>
}

export interface OverallStatistics {
  totalDuration: number // in minutes (minute-level accuracy)
  totalSessions: number
  averageSessionDuration: number // in minutes
  practiceStreak: number // consecutive days
  currentWeekTotal: number // in minutes
  currentMonthTotal: number // in minutes
  uniquePieces: number
  completedGoals: number
  activePieces: string[] // pieces practiced in last 30 days
}

export interface LogbookReportData {
  overall: OverallStatistics
  byRepertoire: PieceStatistics[]
  byMonth: TimeBasedStatistics[]
  byWeek: TimeBasedStatistics[]
  byTag: CategoryStatistics[]
  byTechnique: CategoryStatistics[]
  byInstrument: CategoryStatistics[]
  moodTrends: Record<NonNullable<LogbookEntry['mood']>, number>
  goalProgress: Array<{
    goal: Goal
    linkedDuration: number // total practice time for linked entries in minutes
    progressPercentage: number
  }>
}

export interface ReportExportOptions {
  format: 'pdf' | 'csv' | 'json'
  pivot: 'repertoire' | 'month' | 'week' | 'tag' | 'technique' | 'instrument'
  filters: ReportFilters
  includeCharts?: boolean
  includeSummary?: boolean
}

export interface ReportExportResult {
  success: boolean
  filename?: string
  data?: Blob | string
  error?: string
}

export interface LogbookReportingInterface {
  generateLogbookReport(filters?: ReportFilters): Promise<LogbookReportData>
  getPieceStatistics(filters?: ReportFilters): Promise<PieceStatistics[]>
  getTimeBasedStatistics(
    pivot: 'month' | 'week',
    filters?: ReportFilters
  ): Promise<TimeBasedStatistics[]>
  getCategoryStatistics(
    category: 'tag' | 'technique' | 'instrument',
    filters?: ReportFilters
  ): Promise<CategoryStatistics[]>
  getOverallStatistics(filters?: ReportFilters): Promise<OverallStatistics>
  exportReport(options: ReportExportOptions): Promise<ReportExportResult>
}
