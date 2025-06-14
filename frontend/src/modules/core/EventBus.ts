import {
  EventPayload,
  EventSubscription,
  EventPriority,
  EventCallback,
} from './types'

/**
 * Central event bus for module communication using pub/sub pattern.
 * Provides event subscription, publishing, and history management for decoupled architecture.
 *
 * @category Core
 * @subcategory Infrastructure
 * @example
 * ```typescript
 * const eventBus = EventBus.getInstance();
 *
 * // Subscribe to events
 * const subscriptionId = eventBus.subscribe('user:login', (payload) => {
 *   console.log('User logged in:', payload.data.userId);
 * });
 *
 * // Publish events
 * await eventBus.publish({
 *   source: 'auth',
 *   type: 'user:login',
 *   data: { userId: '123', timestamp: Date.now() }
 * });
 *
 * // Unsubscribe when done
 * eventBus.unsubscribe(subscriptionId);
 * ```
 */
export class EventBus {
  private static instance: EventBus | null = null
  private subscriptions: Map<string, EventSubscription[]> = new Map()
  private eventHistory: EventPayload[] = []
  private maxHistorySize = 1000
  private nextSubscriptionId = 1

  private constructor() {}

  /**
   * Gets the singleton instance of EventBus.
   * Creates a new instance if none exists.
   *
   * @returns The EventBus singleton instance
   * @static
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * Resets the singleton instance (primarily for testing).
   * Use with caution as this will clear all subscriptions and history.
   *
   * @static
   */
  static resetInstance(): void {
    EventBus.instance = null
  }

  /**
   * Subscribes to events matching a pattern.
   * Supports wildcard patterns and priority-based execution order.
   *
   * @param pattern - Event type pattern to match (supports wildcards like 'user:*')
   * @param callback - Function to call when matching events are published
   * @param options - Optional subscription configuration
   * @param options.priority - Execution priority (lower numbers execute first)
   * @param options.filter - Additional filter function for fine-grained matching
   * @returns Subscription ID for later unsubscription
   *
   * @example
   * ```typescript
   * // Basic subscription
   * const id = eventBus.subscribe('practice:session:start', (payload) => {
   *   console.log('Practice started:', payload.data);
   * });
   *
   * // Wildcard subscription with priority
   * const id2 = eventBus.subscribe('practice:*', handlePracticeEvent, {
   *   priority: EventPriority.HIGH,
   *   filter: (payload) => payload.data.userId === currentUser.id
   * });
   * ```
   */
  subscribe(
    pattern: string,
    callback: EventCallback,
    options?: {
      priority?: EventPriority
      filter?: (payload: EventPayload) => boolean
    }
  ): string {
    const subscription: EventSubscription = {
      id: `sub_${this.nextSubscriptionId++}`,
      pattern,
      callback,
      priority: options?.priority ?? EventPriority.NORMAL,
      filter: options?.filter,
    }

    const subs = this.subscriptions.get(pattern) || []
    subs.push(subscription)

    // Sort by priority (lower number = higher priority)
    subs.sort(
      (a, b) =>
        (a.priority ?? EventPriority.NORMAL) -
        (b.priority ?? EventPriority.NORMAL)
    )

    this.subscriptions.set(pattern, subs)

    return subscription.id
  }

  /**
   * Unsubscribes from events using the subscription ID.
   *
   * @param subscriptionId - The subscription ID returned by subscribe()
   * @returns True if subscription was found and removed, false otherwise
   *
   * @example
   * ```typescript
   * const id = eventBus.subscribe('user:logout', handleLogout);
   * // Later...
   * const success = eventBus.unsubscribe(id);
   * console.log(success ? 'Unsubscribed' : 'Subscription not found');
   * ```
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [pattern, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
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
   * Publishes an event to all matching subscribers.
   * Automatically adds eventId and timestamp to the payload.
   *
   * @param event - Event data without eventId and timestamp (added automatically)
   * @returns Promise that resolves when all subscribers have been notified
   *
   * @example
   * ```typescript
   * // Simple event
   * await eventBus.publish({
   *   source: 'practice',
   *   type: 'session:complete',
   *   data: { duration: 1800, score: 85 }
   * });
   *
   * // Complex event with metadata
   * await eventBus.publish({
   *   source: 'analytics',
   *   type: 'progress:milestone',
   *   data: {
   *     userId: '123',
   *     milestone: 'first_perfect_score',
   *     achievedAt: Date.now()
   *   },
   *   metadata: { importance: 'high' }
   * });
   * ```
   */
  async publish(
    event: Omit<EventPayload, 'eventId' | 'timestamp'>
  ): Promise<void> {
    const payload: EventPayload = {
      ...event,
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }

    // Add to history
    this.eventHistory.push(payload)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    // Find matching subscriptions
    const matchingSubscriptions: EventSubscription[] = []

    for (const [pattern, subs] of this.subscriptions.entries()) {
      if (this.matchesPattern(payload.type, pattern)) {
        for (const sub of subs) {
          if (!sub.filter || sub.filter(payload)) {
            matchingSubscriptions.push(sub)
          }
        }
      }
    }

    // Execute callbacks in priority order
    for (const sub of matchingSubscriptions) {
      try {
        await sub.callback(payload)
      } catch (error) {
        // Error in event subscriber
      }
    }
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === eventType) return true

    // Support wildcard patterns
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      return regex.test(eventType)
    }

    return false
  }

  /**
   * Retrieves event history with optional filtering.
   * Useful for debugging, analytics, and event replay scenarios.
   *
   * @param filter - Optional filter criteria
   * @param filter.source - Filter by event source
   * @param filter.type - Filter by event type (supports wildcards)
   * @param filter.limit - Maximum number of events to return (from most recent)
   * @param filter.since - Only events after this timestamp
   * @returns Array of matching events in chronological order
   *
   * @example
   * ```typescript
   * // Get all events from practice module
   * const practiceEvents = eventBus.getEventHistory({
   *   source: 'practice',
   *   limit: 50
   * });
   *
   * // Get recent error events
   * const recentErrors = eventBus.getEventHistory({
   *   type: '*:error',
   *   since: Date.now() - (60 * 1000) // Last minute
   * });
   * ```
   */
  getEventHistory(filter?: {
    source?: string
    type?: string
    limit?: number
    since?: number
  }): EventPayload[] {
    let events = [...this.eventHistory]

    if (filter?.source) {
      events = events.filter(e => e.source === filter.source)
    }

    if (filter?.type) {
      const typeFilter = filter.type
      events = events.filter(e => this.matchesPattern(e.type, typeFilter))
    }

    if (filter?.since !== undefined) {
      const sinceTimestamp = filter.since
      events = events.filter(e => e.timestamp >= sinceTimestamp)
    }

    if (filter?.limit) {
      events = events.slice(-filter.limit)
    }

    return events
  }

  /**
   * Clears all event history.
   * Use with caution as this removes debugging information.
   *
   * @example
   * ```typescript
   * // Clear history for memory management
   * eventBus.clearHistory();
   * ```
   */
  clearHistory(): void {
    this.eventHistory = []
  }

  /**
   * Gets the total number of active subscriptions across all patterns.
   * Useful for monitoring and debugging subscription leaks.
   *
   * @returns Total number of active subscriptions
   *
   * @example
   * ```typescript
   * console.log(`Active subscriptions: ${eventBus.getSubscriptionCount()}`);
   * ```
   */
  getSubscriptionCount(): number {
    let count = 0
    for (const subs of this.subscriptions.values()) {
      count += subs.length
    }
    return count
  }
}
