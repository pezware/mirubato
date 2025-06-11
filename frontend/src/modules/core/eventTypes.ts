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

// Enhanced storage event types for true event-driven storage
export interface StorageReadEventData {
  key: string
  requestId: string
  defaultValue?: unknown
}

export interface StorageWriteEventData {
  key: string
  data: unknown
  requestId: string
  ttl?: number
}

export interface StorageDeleteEventData {
  key: string
  requestId: string
}

export interface StorageGetKeysEventData {
  requestId: string
  prefix?: string
}

export interface StorageResponseEventData {
  requestId: string
  success: boolean
  data?: unknown
  error?: string
}

export interface StorageErrorEventData {
  operation: 'read' | 'write' | 'delete' | 'clear'
  key?: string
  error: string
  requestId?: string
}

// Auth event types
export interface AuthLoginEventData {
  user: {
    id: string
    email?: string
    displayName: string | null
    primaryInstrument: 'PIANO' | 'GUITAR'
    isAnonymous: boolean
    hasCloudStorage: boolean
  }
  timestamp: number
}

export interface AuthLogoutEventData {
  user: {
    id: string
    email?: string
    displayName: string | null
    primaryInstrument: 'PIANO' | 'GUITAR'
    isAnonymous: boolean
    hasCloudStorage: boolean
  }
  timestamp: number
}
