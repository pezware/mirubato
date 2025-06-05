// Event data types for type-safe event handling

export interface PerformanceNoteEventData {
  userId: string
  accuracy: number
  noteData: {
    type: 'rhythm' | 'pitch' | 'key_signature' | 'tempo'
    [key: string]: unknown
  }
}

export interface SessionEndedEventData {
  sessionId: string
  userId: string
  summary: {
    totalTime: number
    notesPlayed: number
    accuracy: number
    [key: string]: unknown
  }
}

export interface SessionEventData {
  session: {
    id: string
    userId: string
    [key: string]: unknown
  }
}

export interface UserEventData {
  userId: string
}

export interface MilestoneEventData {
  userId: string
  milestone: unknown
}

export interface LoggerEntryEventData {
  entry: {
    userId: string
    [key: string]: unknown
  }
}

export interface LinkedGoalsEventData {
  linkedGoals: string[]
}

export interface NoteEventData {
  sessionId: string
  noteId: string
  pitch: string
  actualDuration: number
  expectedDuration: number
  timingError: number
  isCorrect: boolean
  type: 'rhythm' | 'pitch' | 'both'
  timestamp: number
  rhythmScore?: number
}

export interface StorageOperationEventData {
  operation: 'save' | 'update'
  key: string
  data: unknown
}
