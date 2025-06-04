// Core module types and interfaces

export interface EventPayload {
  eventId: string
  timestamp: number
  source: string
  type: string
  data: any
  metadata: {
    userId?: string
    sessionId?: string
    version: string
  }
}

export enum EventPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface EventSubscription {
  id: string
  pattern: string
  callback: (payload: EventPayload) => void | Promise<void>
  priority?: EventPriority
  filter?: (payload: EventPayload) => boolean
}

export interface ModuleInterface {
  name: string
  version: string
  initialize(): Promise<void>
  shutdown(): Promise<void>
  getHealth(): ModuleHealth
}

export interface ModuleHealth {
  status: 'green' | 'yellow' | 'red' | 'gray'
  message?: string
  lastCheck: number
}

export type EventCallback = (payload: EventPayload) => void | Promise<void>

// Storage event types for decoupled storage access
export interface StorageRequestEvent {
  operation: 'get' | 'set' | 'remove' | 'clear' | 'getKeys'
  key?: string
  data?: any
  ttl?: number
  requestId: string
}

export interface StorageResponseEvent {
  requestId: string
  success: boolean
  data?: any
  error?: string
}
