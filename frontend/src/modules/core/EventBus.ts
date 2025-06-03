import {
  EventPayload,
  EventSubscription,
  EventPriority,
  EventCallback,
} from './types'

export class EventBus {
  private static instance: EventBus | null = null
  private subscriptions: Map<string, EventSubscription[]> = new Map()
  private eventHistory: EventPayload[] = []
  private maxHistorySize = 1000
  private nextSubscriptionId = 1

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  static resetInstance(): void {
    EventBus.instance = null
  }

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
        console.error(`Error in event subscriber ${sub.id}:`, error)
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

  clearHistory(): void {
    this.eventHistory = []
  }

  getSubscriptionCount(): number {
    let count = 0
    for (const subs of this.subscriptions.values()) {
      count += subs.length
    }
    return count
  }
}
