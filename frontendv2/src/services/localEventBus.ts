/**
 * Local Event Bus for cross-store communication
 *
 * This service provides a simple event-based communication mechanism
 * to avoid circular dependencies between Zustand stores.
 *
 * Unlike WebSocketSync which handles remote events, this handles
 * only local, in-memory events within the application.
 */

import type { LogbookEntry } from '../api/logbook'

// Event type definitions
export interface LocalEventMap {
  // Fired when a new practice entry is created
  PRACTICE_CREATED: {
    entry: LogbookEntry
  }

  // Fired when a piece is dissociated from repertoire
  PIECE_DISSOCIATED: {
    scoreId: string
    updatedEntries: Map<string, LogbookEntry>
    pieceTitle: string
    pieceComposer: string
  }
}

export type LocalEventType = keyof LocalEventMap
export type LocalEventData<T extends LocalEventType> = LocalEventMap[T]
export type LocalEventHandler<T extends LocalEventType> = (
  data: LocalEventData<T>
) => void | Promise<void>

class LocalEventBus {
  private handlers: Map<LocalEventType, Set<LocalEventHandler<any>>> = new Map()
  private isDebugMode = process.env.NODE_ENV === 'development'

  /**
   * Emit an event with optional data
   */
  emit<T extends LocalEventType>(event: T, data: LocalEventData<T>): void {
    if (this.isDebugMode) {
      console.log(`[LocalEventBus] Emitting ${event}`, data)
    }

    const eventHandlers = this.handlers.get(event)
    if (!eventHandlers) return

    // Execute handlers asynchronously to avoid blocking
    eventHandlers.forEach(handler => {
      // Wrap in Promise to handle both sync and async handlers
      Promise.resolve(handler(data)).catch(error => {
        console.error(`[LocalEventBus] Error in handler for ${event}:`, error)
      })
    })
  }

  /**
   * Register an event handler
   */
  on<T extends LocalEventType>(event: T, handler: LocalEventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as LocalEventHandler<any>)

    if (this.isDebugMode) {
      console.log(`[LocalEventBus] Registered handler for ${event}`)
    }
  }

  /**
   * Remove an event handler
   */
  off<T extends LocalEventType>(event: T, handler: LocalEventHandler<T>): void {
    const eventHandlers = this.handlers.get(event)
    if (!eventHandlers) return

    eventHandlers.delete(handler as LocalEventHandler<any>)

    // Clean up empty sets
    if (eventHandlers.size === 0) {
      this.handlers.delete(event)
    }

    if (this.isDebugMode) {
      console.log(`[LocalEventBus] Removed handler for ${event}`)
    }
  }

  /**
   * Remove all handlers for a specific event
   */
  offAll(event?: LocalEventType): void {
    if (event) {
      this.handlers.delete(event)
      if (this.isDebugMode) {
        console.log(`[LocalEventBus] Removed all handlers for ${event}`)
      }
    } else {
      this.handlers.clear()
      if (this.isDebugMode) {
        console.log(`[LocalEventBus] Removed all handlers`)
      }
    }
  }

  /**
   * Get the number of handlers for an event
   */
  getHandlerCount(event: LocalEventType): number {
    return this.handlers.get(event)?.size ?? 0
  }

  /**
   * Check if there are any handlers for an event
   */
  hasHandlers(event: LocalEventType): boolean {
    return this.getHandlerCount(event) > 0
  }
}

// Export singleton instance
export const localEventBus = new LocalEventBus()

// For testing purposes, allow resetting the event bus
export function resetLocalEventBus(): void {
  localEventBus.offAll()
}
