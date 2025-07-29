import { nanoid } from 'nanoid'

export interface SyncEvent {
  id: string
  trigger: string
  timestamp: number
  duration?: number
  status: 'started' | 'completed' | 'failed'
  error?: string
  stats?: {
    entriesProcessed: number
    duplicatesPrevented: number
    goalsProcessed?: number
  }
  metadata?: Record<string, unknown>
}

const SYNC_LOG_KEY = 'mirubato_sync_log'
const MAX_LOG_ENTRIES = 50

export class SyncEventLogger {
  private events: SyncEvent[] = []

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Log a sync event
   */
  logEvent(event: Omit<SyncEvent, 'id' | 'timestamp'>): string {
    const fullEvent: SyncEvent = {
      id: nanoid(),
      timestamp: Date.now(),
      ...event,
    }

    this.events.unshift(fullEvent)

    // Keep only recent events
    if (this.events.length > MAX_LOG_ENTRIES) {
      this.events = this.events.slice(0, MAX_LOG_ENTRIES)
    }

    this.saveToStorage()

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji =
        event.status === 'started'
          ? '🔄'
          : event.status === 'completed'
            ? '✅'
            : '❌'

      console.log(
        `[SyncLog] ${emoji} ${event.trigger} - ${event.status}`,
        event.stats || event.error || ''
      )
    }

    return fullEvent.id
  }

  /**
   * Start a sync operation
   */
  startSync(trigger: string, metadata?: Record<string, unknown>): string {
    return this.logEvent({
      trigger,
      status: 'started',
      metadata,
    })
  }

  /**
   * Complete a sync operation
   */
  completeSync(
    id: string,
    stats: SyncEvent['stats'],
    metadata?: Record<string, unknown>
  ): void {
    const event = this.events.find(e => e.id === id)
    if (event) {
      event.status = 'completed'
      event.duration = Date.now() - event.timestamp
      event.stats = stats
      if (metadata) {
        event.metadata = { ...event.metadata, ...metadata }
      }
      this.saveToStorage()
    }
  }

  /**
   * Fail a sync operation
   */
  failSync(id: string, error: string | Error): void {
    const event = this.events.find(e => e.id === id)
    if (event) {
      event.status = 'failed'
      event.duration = Date.now() - event.timestamp
      event.error = error instanceof Error ? error.message : error
      this.saveToStorage()
    }
  }

  /**
   * Get all events
   */
  getEvents(): SyncEvent[] {
    return [...this.events]
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): SyncEvent[] {
    return this.events.slice(0, count)
  }

  /**
   * Get events by trigger type
   */
  getEventsByTrigger(trigger: string): SyncEvent[] {
    return this.events.filter(e => e.trigger === trigger)
  }

  /**
   * Get failure rate
   */
  getFailureRate(windowMs: number = 3600000): number {
    const cutoff = Date.now() - windowMs
    const recentEvents = this.events.filter(e => e.timestamp > cutoff)

    if (recentEvents.length === 0) return 0

    const failures = recentEvents.filter(e => e.status === 'failed').length
    return (failures / recentEvents.length) * 100
  }

  /**
   * Get duplicate prevention rate
   */
  getDuplicatePreventionRate(windowMs: number = 3600000): number {
    const cutoff = Date.now() - windowMs
    const recentEvents = this.events.filter(
      e => e.timestamp > cutoff && e.status === 'completed' && e.stats
    )

    if (recentEvents.length === 0) return 0

    const totalProcessed = recentEvents.reduce(
      (sum, e) => sum + (e.stats?.entriesProcessed || 0),
      0
    )
    const duplicatesPrevented = recentEvents.reduce(
      (sum, e) => sum + (e.stats?.duplicatesPrevented || 0),
      0
    )

    if (totalProcessed === 0) return 0

    return (duplicatesPrevented / totalProcessed) * 100
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = []
    this.saveToStorage()
  }

  /**
   * Export events as JSON
   */
  export(): string {
    return JSON.stringify(this.events, null, 2)
  }

  /**
   * Export as CSV
   */
  exportCSV(): string {
    const headers = [
      'ID',
      'Trigger',
      'Status',
      'Timestamp',
      'Duration (ms)',
      'Entries Processed',
      'Duplicates Prevented',
      'Error',
    ]

    const rows = this.events.map(e => [
      e.id,
      e.trigger,
      e.status,
      new Date(e.timestamp).toISOString(),
      e.duration || '',
      e.stats?.entriesProcessed || '',
      e.stats?.duplicatesPrevented || '',
      e.error || '',
    ])

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalEvents: number
    successRate: number
    averageDuration: number
    duplicatePreventionRate: number
    eventsByTrigger: Record<string, number>
    recentFailures: SyncEvent[]
  } {
    const completedEvents = this.events.filter(e => e.status === 'completed')
    const successRate =
      this.events.length > 0
        ? (completedEvents.length / this.events.length) * 100
        : 0

    const averageDuration =
      completedEvents.length > 0
        ? completedEvents.reduce((sum, e) => sum + (e.duration || 0), 0) /
          completedEvents.length
        : 0

    const eventsByTrigger: Record<string, number> = {}
    this.events.forEach(e => {
      eventsByTrigger[e.trigger] = (eventsByTrigger[e.trigger] || 0) + 1
    })

    const recentFailures = this.events
      .filter(e => e.status === 'failed')
      .slice(0, 5)

    return {
      totalEvents: this.events.length,
      successRate,
      averageDuration: Math.round(averageDuration),
      duplicatePreventionRate: this.getDuplicatePreventionRate(),
      eventsByTrigger,
      recentFailures,
    }
  }

  /**
   * Load events from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(SYNC_LOG_KEY)
      if (stored) {
        this.events = JSON.parse(stored)
      }
    } catch (error) {
      console.error('[SyncLog] Failed to load from storage:', error)
      this.events = []
    }
  }

  /**
   * Save events to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(this.events))
    } catch (error) {
      console.error('[SyncLog] Failed to save to storage:', error)
    }
  }
}

// Singleton instance
export const syncEventLogger = new SyncEventLogger()

// Export to window for debugging
if (typeof window !== 'undefined') {
  ;(window as any).syncEventLogger = syncEventLogger
}
