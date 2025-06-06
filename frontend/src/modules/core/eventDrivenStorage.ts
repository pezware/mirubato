/**
 * Event-driven storage utility for modules
 *
 * This utility provides a simple interface for modules to interact with storage
 * using the EventBus, eliminating direct dependencies on StorageModule.
 */

import { EventBus } from './EventBus'
import { nanoid } from 'nanoid'
import {
  StorageReadEventData,
  StorageWriteEventData,
  StorageDeleteEventData,
  StorageGetKeysEventData,
  StorageResponseEventData,
} from './eventTypes'
import { EventPayload } from './types'

export interface EventDrivenStorageConfig {
  timeout?: number // Timeout in milliseconds (default: 5000)
}

export class EventDrivenStorage {
  private eventBus: EventBus | null = null
  private config: EventDrivenStorageConfig
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  >()
  private initialized = false

  constructor(config: EventDrivenStorageConfig = {}) {
    this.config = {
      timeout: 5000,
      ...config,
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      try {
        this.eventBus = EventBus.getInstance()
        // Subscribe to storage responses
        this.eventBus.subscribe(
          'storage:response',
          this.handleStorageResponse.bind(this)
        )
        this.initialized = true
      } catch (error) {
        throw new Error(
          'EventBus not available - cannot initialize EventDrivenStorage'
        )
      }
    }
  }

  /**
   * Read data from storage via events
   */
  async read<T>(key: string, defaultValue?: T): Promise<T | null> {
    this.ensureInitialized()

    return new Promise<T | null>((resolve, reject) => {
      const requestId = nanoid()

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Storage read timeout for key: ${key}`))
      }, this.config.timeout)

      // Store the pending request
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      })

      // Emit storage read event
      const eventData: StorageReadEventData = {
        key,
        requestId,
        defaultValue,
      }

      this.eventBus!.publish({
        source: 'EventDrivenStorage',
        type: 'storage:read',
        data: eventData,
        metadata: { version: '1.0.0' },
      }).catch(error => {
        this.pendingRequests.delete(requestId)
        clearTimeout(timeout)
        reject(
          new Error(`Failed to publish storage read event: ${error.message}`)
        )
      })
    })
  }

  /**
   * Write data to storage via events
   */
  async write<T>(key: string, data: T, ttl?: number): Promise<void> {
    this.ensureInitialized()

    return new Promise<void>((resolve, reject) => {
      const requestId = nanoid()

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Storage write timeout for key: ${key}`))
      }, this.config.timeout)

      // Store the pending request
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      })

      // Emit storage write event
      const eventData: StorageWriteEventData = {
        key,
        data,
        requestId,
        ttl,
      }

      this.eventBus!.publish({
        source: 'EventDrivenStorage',
        type: 'storage:write',
        data: eventData,
        metadata: { version: '1.0.0' },
      }).catch(error => {
        this.pendingRequests.delete(requestId)
        clearTimeout(timeout)
        reject(
          new Error(`Failed to publish storage write event: ${error.message}`)
        )
      })
    })
  }

  /**
   * Delete data from storage via events
   */
  async delete(key: string): Promise<void> {
    this.ensureInitialized()

    return new Promise<void>((resolve, reject) => {
      const requestId = nanoid()

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Storage delete timeout for key: ${key}`))
      }, this.config.timeout)

      // Store the pending request
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      })

      // Emit storage delete event
      const eventData: StorageDeleteEventData = {
        key,
        requestId,
      }

      this.eventBus!.publish({
        source: 'EventDrivenStorage',
        type: 'storage:delete',
        data: eventData,
        metadata: { version: '1.0.0' },
      }).catch(error => {
        this.pendingRequests.delete(requestId)
        clearTimeout(timeout)
        reject(
          new Error(`Failed to publish storage delete event: ${error.message}`)
        )
      })
    })
  }

  /**
   * Get storage keys via events
   */
  async getKeys(prefix?: string): Promise<string[]> {
    this.ensureInitialized()

    return new Promise<string[]>((resolve, reject) => {
      const requestId = nanoid()

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Storage getKeys timeout`))
      }, this.config.timeout)

      // Store the pending request
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      })

      // Emit storage getKeys event
      const eventData: StorageGetKeysEventData = {
        requestId,
        prefix,
      }

      this.eventBus!.publish({
        source: 'EventDrivenStorage',
        type: 'storage:getKeys',
        data: eventData,
        metadata: { version: '1.0.0' },
      }).catch(error => {
        this.pendingRequests.delete(requestId)
        clearTimeout(timeout)
        reject(
          new Error(`Failed to publish storage getKeys event: ${error.message}`)
        )
      })
    })
  }

  /**
   * Handle storage response events
   */
  private handleStorageResponse(event: EventPayload): void {
    const response = event.data as StorageResponseEventData
    const pending = this.pendingRequests.get(response.requestId)

    if (!pending) {
      // Response for unknown request, ignore
      return
    }

    // Clean up
    this.pendingRequests.delete(response.requestId)
    clearTimeout(pending.timeout)

    if (response.success) {
      pending.resolve(response.data || null)
    } else {
      pending.reject(new Error(response.error || 'Unknown storage error'))
    }
  }

  /**
   * Clean up pending requests (useful for testing)
   */
  cleanup(): void {
    for (const [_requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Storage cleanup: request cancelled'))
    }
    this.pendingRequests.clear()
  }
}

// Export singleton instance for convenience
export const eventDrivenStorage = new EventDrivenStorage()
