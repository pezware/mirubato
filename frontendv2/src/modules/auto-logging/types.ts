export type PracticeType = 'metronome' | 'score' | 'counter' | 'custom'

export interface PracticeMetadata {
  // Common fields
  title?: string
  composer?: string
  instrument?: 'piano' | 'guitar'
  tags?: string[]

  // Metronome specific
  tempoChanges?: Array<{ tempo: number; timestamp: number }>
  patterns?: string[]
  averageTempo?: number

  // Score specific
  scoreId?: string
  scoreTitle?: string
  scoreComposer?: string
  pagesViewed?: number[]

  // Counter specific
  repetitions?: Array<{
    repNumber: number
    duration: number
    timestamp: number
  }>
  totalReps?: number
  mode?: 'up' | 'down'

  // Custom fields for extensibility
  customData?: Record<string, string | number | boolean | string[] | number[]>
}

export interface PracticeSession {
  id: string
  type: PracticeType
  startTime: Date
  endTime?: Date
  duration: number // in milliseconds
  metadata: PracticeMetadata
  autoLogEnabled: boolean
}

export interface AutoLoggingConfig {
  enabled: boolean
  minDuration: number // minimum duration in seconds to auto-log
  roundingInterval: number // round duration to nearest X minutes (1, 5, 15)
  showSummary: boolean // show summary before saving
  defaultTags: string[]
  defaultInstrument: 'piano' | 'guitar'
}

export interface AutoLoggingContextValue {
  // Current session
  currentSession: PracticeSession | null

  // Actions
  startSession: (type: PracticeType, metadata?: PracticeMetadata) => void
  stopSession: () => Promise<PracticeSession | null>
  updateSession: (updates: Partial<PracticeMetadata>) => void
  cancelSession: () => void

  // Config
  config: AutoLoggingConfig
  updateConfig: (updates: Partial<AutoLoggingConfig>) => void

  // Utils
  isTracking: boolean
  elapsedTime: number
}
