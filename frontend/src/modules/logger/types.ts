/**
 * Types for the Practice Logger Module
 */

export interface LogbookEntry {
  id: string
  userId: string
  timestamp: number
  duration: number
  type: 'practice' | 'performance' | 'lesson' | 'rehearsal'
  pieces: PieceReference[]
  techniques: string[]
  goals: string[]
  notes: string
  mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited'
  tags: string[]
  sessionId?: string // Links to practice session
  metadata?: Record<string, any>
}

export interface PieceReference {
  id: string
  title: string
  composer?: string
  measures?: string // e.g., "1-16" or "full"
  tempo?: number
}

export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  targetDate: number
  progress: number // 0-100
  milestones: GoalMilestone[]
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  createdAt: number
  updatedAt: number
  completedAt?: number
  linkedEntries: string[] // logbook entry IDs
}

export interface GoalMilestone {
  id: string
  title: string
  completed: boolean
  completedAt?: number
}

export interface LogFilters {
  userId?: string
  startDate?: number
  endDate?: number
  type?: LogbookEntry['type'][]
  tags?: string[]
  mood?: LogbookEntry['mood'][]
  pieceIds?: string[]
  goalIds?: string[]
  limit?: number
  offset?: number
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json'
  filters: LogFilters
  includeGoals?: boolean
  includeSummary?: boolean
  groupBy?: 'date' | 'piece' | 'type'
}

export interface ExportResult {
  success: boolean
  filename?: string
  data?: Blob | string
  error?: string
}

export interface PracticeReport {
  userId: string
  startDate: number
  endDate: number
  totalDuration: number
  totalEntries: number
  averageDuration: number
  entriesByType: Record<LogbookEntry['type'], number>
  topPieces: Array<{ piece: PieceReference; duration: number; count: number }>
  goalProgress: Array<{ goal: Goal; progress: number }>
  moodDistribution: Record<NonNullable<LogbookEntry['mood']>, number>
  practiceStreak: number
  longestSession: LogbookEntry | null
}

export interface LoggerConfig {
  autoSaveInterval?: number
  maxEntriesPerPage?: number
  enableAutoTagging?: boolean
  defaultMood?: LogbookEntry['mood']
}

export interface LoggerEvents {
  'logger:entry:created': { entry: LogbookEntry }
  'logger:entry:updated': {
    entry: LogbookEntry
    changes: Partial<LogbookEntry>
  }
  'logger:entry:deleted': { entryId: string }
  'logger:goal:created': { goal: Goal }
  'logger:goal:updated': { goal: Goal; changes: Partial<Goal> }
  'logger:goal:completed': { goal: Goal }
  'logger:export:ready': { result: ExportResult }
  'logger:report:generated': { report: PracticeReport }
}
