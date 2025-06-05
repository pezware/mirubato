import { ModuleInterface } from '../core/types'

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
