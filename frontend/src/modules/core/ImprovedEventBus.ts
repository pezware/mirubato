import {
  EventPayload,
  EventSubscription,
  EventPriority,
  EventCallback,
} from './types'

/**
 * Improved EventBus with proper memory management and weak references.
 * Prevents memory leaks through:
 * 1. Bounded circular buffer for history
 * 2. WeakMap for subscription callbacks
 * 3. Automatic cleanup of stale subscriptions
 * 4. Event type specific history limits
 */
export class ImprovedEventBus {
  private static instance: ImprovedEventBus | null = null
  private subscriptions: Map<
    string,
    Array<EventSubscription & { callbackRef?: WeakRef<EventCallback> }>
  > = new Map()

  // Use circular buffer for history with fixed size
  private eventHistory: EventPayload[] = []
  private historyHead = 0
  private historySize = 0
  private readonly maxHistorySize = 1000

  // Event type specific history limits
  private eventTypeHistoryLimits: Map<string, number> = new Map([
    ['debug:*', 100], // Keep fewer debug events
    ['mouse:*', 50], // Keep fewer mouse events
    ['error:*', 500], // Keep more error events
  ])

  // WeakMap to allow garbage collection of callbacks
  private callbackRefs: WeakMap<object, EventCallback> = new WeakMap()

  // Track subscription cleanup
  private cleanupInterval: number | null = null
  private readonly cleanupIntervalMs = 60000 // 1 minute

  private nextSubscriptionId = 1

  private constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup()
  }

  static getInstance(): ImprovedEventBus {
    if (!ImprovedEventBus.instance) {
      ImprovedEventBus.instance = new ImprovedEventBus()
    }
    return ImprovedEventBus.instance
  }

  static resetInstance(): void {
    if (ImprovedEventBus.instance) {
      ImprovedEventBus.instance.destroy()
    }
    ImprovedEventBus.instance = null
  }

  /**
   * Subscribe with automatic cleanup support
   */
  subscribe(
    pattern: string,
    callback: EventCallback,
    options?: {
      priority?: EventPriority
      filter?: (payload: EventPayload) => boolean
      weakRef?: boolean // Allow weak reference for auto-cleanup
    }
  ): string {
    const subscription: EventSubscription & {
      callbackRef?: WeakRef<EventCallback>
    } = {
      id: `sub_${this.nextSubscriptionId++}`,
      pattern,
      callback,
      priority: options?.priority ?? EventPriority.NORMAL,
      filter: options?.filter,
    }

    // Store weak reference if requested
    if (options?.weakRef && typeof WeakRef !== 'undefined') {
      subscription.callbackRef = new WeakRef(callback)
      this.callbackRefs.set(callback as object, callback)
    }

    const subs = this.subscriptions.get(pattern) || []
    subs.push(subscription)

    // Sort by priority
    subs.sort(
      (a, b) =>
        (a.priority ?? EventPriority.NORMAL) -
        (b.priority ?? EventPriority.NORMAL)
    )

    this.subscriptions.set(pattern, subs)
    return subscription.id
  }

  /**
   * Unsubscribe and clean up resources
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [pattern, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
        const sub = subs[index]

        // Clean up weak references
        if (sub.callback && typeof sub.callback === 'object') {
          this.callbackRefs.delete(sub.callback)
        }

        subs.splice(index, 1)
        if (subs.length === 0) {
          this.subscriptions.delete(pattern)
        }
        return true
      }
    }
    return false
  }

  /**
   * Publish with circular buffer for history
   */
  async publish(
    event: Omit<EventPayload, 'eventId' | 'timestamp'>
  ): Promise<void> {
    const payload: EventPayload = {
      ...event,
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }

    // Add to circular buffer
    this.addToHistory(payload)

    // Find and execute matching subscriptions
    const matchingSubscriptions = this.findMatchingSubscriptions(payload)

    for (const sub of matchingSubscriptions) {
      try {
        // Handle weak references
        let callback = sub.callback
        if ('callbackRef' in sub && sub.callbackRef) {
          const derefCallback = sub.callbackRef.deref()
          if (!derefCallback) {
            // Callback has been garbage collected, remove subscription
            this.unsubscribe(sub.id)
            continue
          }
          callback = derefCallback
        }

        await callback(payload)
      } catch (error) {
        console.error(`Error in event subscriber for ${payload.type}:`, error)
      }
    }
  }

  /**
   * Add event to circular buffer with type-specific limits
   */
  private addToHistory(payload: EventPayload): void {
    // Check type-specific limit
    const typeLimit = this.getEventTypeLimit(payload.type)
    const typeCount = this.countEventType(payload.type)

    if (typeCount >= typeLimit) {
      // Remove oldest event of this type
      this.removeOldestEventOfType(payload.type)
    }

    // Add to circular buffer
    if (this.historySize < this.maxHistorySize) {
      this.eventHistory[this.historySize] = payload
      this.historySize++
    } else {
      // Overwrite oldest entry
      this.eventHistory[this.historyHead] = payload
      this.historyHead = (this.historyHead + 1) % this.maxHistorySize
    }
  }

  /**
   * Get type-specific history limit
   */
  private getEventTypeLimit(eventType: string): number {
    for (const [pattern, limit] of this.eventTypeHistoryLimits) {
      if (this.matchesPattern(eventType, pattern)) {
        return limit
      }
    }
    return Math.floor(this.maxHistorySize / 10) // Default to 10% of total
  }

  /**
   * Count events of specific type in history
   */
  private countEventType(eventType: string): number {
    let count = 0
    const events = this.getEventHistoryArray()
    for (const event of events) {
      if (event.type === eventType) {
        count++
      }
    }
    return count
  }

  /**
   * Remove oldest event of specific type
   */
  private removeOldestEventOfType(eventType: string): void {
    const events = this.getEventHistoryArray()
    const index = events.findIndex(e => e.type === eventType)
    if (index !== -1) {
      // Shift events to remove the found one
      // const actualIndex = (this.historyHead + index) % this.maxHistorySize
      for (let i = index; i < events.length - 1; i++) {
        const currentIdx = (this.historyHead + i) % this.maxHistorySize
        const nextIdx = (this.historyHead + i + 1) % this.maxHistorySize
        this.eventHistory[currentIdx] = this.eventHistory[nextIdx]
      }
      this.historySize--
    }
  }

  /**
   * Get history as array from circular buffer
   */
  private getEventHistoryArray(): EventPayload[] {
    const events: EventPayload[] = []
    if (this.historySize < this.maxHistorySize) {
      // Buffer not full yet
      for (let i = 0; i < this.historySize; i++) {
        events.push(this.eventHistory[i])
      }
    } else {
      // Buffer is full, read in circular order
      for (let i = 0; i < this.maxHistorySize; i++) {
        const index = (this.historyHead + i) % this.maxHistorySize
        events.push(this.eventHistory[index])
      }
    }
    return events
  }

  /**
   * Find matching subscriptions for an event
   */
  private findMatchingSubscriptions(
    payload: EventPayload
  ): Array<EventSubscription & { callbackRef?: WeakRef<EventCallback> }> {
    const matchingSubscriptions: Array<
      EventSubscription & { callbackRef?: WeakRef<EventCallback> }
    > = []

    for (const [pattern, subs] of this.subscriptions.entries()) {
      if (this.matchesPattern(payload.type, pattern)) {
        for (const sub of subs) {
          if (!sub.filter || sub.filter(payload)) {
            matchingSubscriptions.push(sub)
          }
        }
      }
    }

    return matchingSubscriptions
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === eventType) return true

    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      return regex.test(eventType)
    }

    return false
  }

  /**
   * Get filtered event history
   */
  getEventHistory(filter?: {
    source?: string
    type?: string
    limit?: number
    since?: number
  }): EventPayload[] {
    let events = this.getEventHistoryArray()

    if (filter?.source) {
      events = events.filter(e => e.source === filter.source)
    }

    if (filter?.type) {
      events = events.filter(e => this.matchesPattern(e.type, filter.type!))
    }

    if (filter?.since !== undefined) {
      events = events.filter(e => e.timestamp >= filter.since!)
    }

    if (filter?.limit) {
      events = events.slice(-filter.limit)
    }

    return events
  }

  /**
   * Clear history by event type or all
   */
  clearHistory(eventType?: string): void {
    if (eventType) {
      const events = this.getEventHistoryArray()
      const filtered = events.filter(
        e => !this.matchesPattern(e.type, eventType)
      )

      // Rebuild history
      this.eventHistory = []
      this.historyHead = 0
      this.historySize = 0

      for (const event of filtered) {
        this.addToHistory(event)
      }
    } else {
      this.eventHistory = []
      this.historyHead = 0
      this.historySize = 0
    }
  }

  /**
   * Start periodic cleanup of stale subscriptions
   */
  private startPeriodicCleanup(): void {
    if (typeof window !== 'undefined') {
      this.cleanupInterval = window.setInterval(() => {
        this.cleanupStaleSubscriptions()
      }, this.cleanupIntervalMs)
    }
  }

  /**
   * Clean up stale subscriptions (weak refs that have been GC'd)
   */
  private cleanupStaleSubscriptions(): void {
    let cleanedCount = 0

    for (const [pattern, subs] of this.subscriptions.entries()) {
      const activeSubs = subs.filter(sub => {
        if ('callbackRef' in sub && sub.callbackRef) {
          const callback = sub.callbackRef.deref()
          if (!callback) {
            cleanedCount++
            return false
          }
        }
        return true
      })

      if (activeSubs.length === 0) {
        this.subscriptions.delete(pattern)
      } else if (activeSubs.length !== subs.length) {
        this.subscriptions.set(pattern, activeSubs)
      }
    }

    if (cleanedCount > 0) {
      console.debug(`Cleaned up ${cleanedCount} stale subscriptions`)
    }
  }

  /**
   * Get subscription count by pattern
   */
  getSubscriptionCount(pattern?: string): number {
    if (pattern) {
      const subs = this.subscriptions.get(pattern)
      return subs ? subs.length : 0
    }

    let count = 0
    for (const subs of this.subscriptions.values()) {
      count += subs.length
    }
    return count
  }

  /**
   * Get memory usage stats
   */
  getMemoryStats(): {
    historySize: number
    maxHistorySize: number
    subscriptionCount: number
    patternCount: number
  } {
    return {
      historySize: this.historySize,
      maxHistorySize: this.maxHistorySize,
      subscriptionCount: this.getSubscriptionCount(),
      patternCount: this.subscriptions.size,
    }
  }

  /**
   * Destroy and clean up all resources
   */
  destroy(): void {
    if (this.cleanupInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.subscriptions.clear()
    this.eventHistory = []
    this.historyHead = 0
    this.historySize = 0
    this.callbackRefs = new WeakMap()
  }
}
