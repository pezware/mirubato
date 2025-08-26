export interface LogbookEntry {
  id: string
  timestamp: string
  duration: number
  type:
    | 'practice'
    | 'performance'
    | 'lesson'
    | 'rehearsal'
    | 'technique'
    | 'status_change'
  instrument?: string
  pieces: Array<{
    id?: string
    title: string
    composer?: string | null
    measures?: string | null
    tempo?: number | null
  }>
  techniques: string[]
  goalIds: string[]
  notes?: string | null
  mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited' | null
  tags: string[]
  metadata?: {
    source: string
    accuracy?: number
    notesPlayed?: number
    mistakeCount?: number
  }
  scoreId?: string
  scoreTitle?: string
  scoreComposer?: string
  autoTracked?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface RepertoireItem {
  scoreId: string
  title: string
  composer?: string
  status: 'planned' | 'learning' | 'polished' | 'dropped'
  statusHistory: Array<{
    status: string
    timestamp: string
  }>
  lastPracticedAt?: string
  totalPracticeTime: number
  sessionCount: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface SyncData {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  data: string // JSON blob
  checksum: string
  version: number
  created_at: string
  updated_at: string
  deleted_at?: string
  device_id?: string
}

export interface DuplicateEntry {
  id: string
  entry: LogbookEntry
  duplicateOf: string
  confidence: number
  reason: string
}

export interface ScoreIdMismatch {
  oldId: string
  newId: string
  affectedEntries: string[]
  affectedRepertoire: string[]
}

export interface DataIssue {
  type: 'duplicate' | 'scoreId' | 'orphan' | 'checksum'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedRecords: string[]
  suggestedFix?: string
}

export interface FixResult {
  success: boolean
  fixed: number
  failed: number
  skipped: number
  errors: string[]
  backupFile?: string
  transactionId?: string
}

export interface Environment {
  name: 'local' | 'staging' | 'production'
  apiUrl: string
  frontendUrl: string
  d1DatabaseId?: string
  authToken?: string
  color: string
}
