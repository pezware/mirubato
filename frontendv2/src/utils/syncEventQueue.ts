/**
 * Sync event queue for coalescence - batches multiple sync triggers
 * within a short window to prevent duplicate operations
 */

export interface SyncEvent {
  id: string
  trigger: string
  timestamp: number
  priority: number
  metadata?: Record<string, unknown>
}

export const TRIGGER_PRIORITIES: Record<string, number> = {
  manual: 10, // Highest priority - user initiated
  online: 8, // Coming back online
  'route-change': 7, // Navigation
  focus: 5, // Tab/window focus
  visibility: 5, // Page visibility
  periodic: 3, // Background sync
  automatic: 1, // Lowest priority
}

export class SyncEventQueue {
  private queue: SyncEvent[] = []
  private coalescenceTimer: NodeJS.Timeout | null = null
  private eventCounter = 0
  private readonly coalescenceWindows: Map<string, number> = new Map([
    ['manual', 100], // Process manual syncs quickly
    ['online', 500], // Online events can wait a bit
    ['default', 1000], // Default coalescence window
  ])

  constructor(
    private readonly onProcessQueue: (event: SyncEvent) => Promise<void>
  ) {}

  /**
   * Add a sync event to the queue
   */
  queueEvent(trigger: string, metadata?: Record<string, unknown>): void {
    const event: SyncEvent = {
      id: `sync-${++this.eventCounter}`,
      trigger,
      timestamp: Date.now(),
      priority: TRIGGER_PRIORITIES[trigger] || TRIGGER_PRIORITIES.automatic,
      metadata,
    }

    this.queue.push(event)
    console.log(
      `[SyncQueue] Queued event: ${trigger} (priority: ${event.priority})`
    )

    this.scheduleProcessing(trigger)
  }

  /**
   * Schedule queue processing with appropriate coalescence window
   */
  private scheduleProcessing(trigger: string): void {
    // Clear existing timer
    if (this.coalescenceTimer) {
      clearTimeout(this.coalescenceTimer)
    }

    // Get coalescence window for this trigger type
    const window =
      this.coalescenceWindows.get(trigger) ||
      this.coalescenceWindows.get('default')!

    this.coalescenceTimer = setTimeout(() => {
      this.processQueue()
    }, window)
  }

  /**
   * Process the queue, selecting the highest priority event
   */
  private async processQueue(): Promise<void> {
    const events = [...this.queue]
    this.queue = []
    this.coalescenceTimer = null

    if (events.length === 0) return

    // Sort by priority (descending) then by timestamp (ascending)
    events.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return a.timestamp - b.timestamp
    })

    const highestPriorityEvent = events[0]

    console.log(
      `[SyncQueue] Processing ${events.length} coalesced events, ` +
        `selected: ${highestPriorityEvent.trigger} (priority: ${highestPriorityEvent.priority})`
    )

    // Log coalesced events for debugging
    if (events.length > 1) {
      const coalescedTriggers = events
        .slice(1)
        .map(e => e.trigger)
        .join(', ')
      console.log(`[SyncQueue] Coalesced events: ${coalescedTriggers}`)
    }

    try {
      await this.onProcessQueue(highestPriorityEvent)
    } catch (error) {
      console.error('[SyncQueue] Error processing event:', error)
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length
  }

  /**
   * Clear the queue (for cleanup)
   */
  clear(): void {
    this.queue = []
    if (this.coalescenceTimer) {
      clearTimeout(this.coalescenceTimer)
      this.coalescenceTimer = null
    }
  }

  /**
   * Get queue status for debugging
   */
  getStatus(): {
    queueSize: number
    isProcessing: boolean
    events: Array<{ trigger: string; priority: number; age: number }>
  } {
    const now = Date.now()
    return {
      queueSize: this.queue.length,
      isProcessing: this.coalescenceTimer !== null,
      events: this.queue.map(e => ({
        trigger: e.trigger,
        priority: e.priority,
        age: now - e.timestamp,
      })),
    }
  }

  /**
   * Force immediate processing (bypasses coalescence)
   */
  forceProcess(): void {
    if (this.coalescenceTimer) {
      clearTimeout(this.coalescenceTimer)
      this.coalescenceTimer = null
    }
    this.processQueue()
  }
}
