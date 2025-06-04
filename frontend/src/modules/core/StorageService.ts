import { EventBus } from './EventBus'
import { StorageRequestEvent, StorageResponseEvent } from './types'

/**
 * Event-driven storage service that decouples business modules from direct storage dependencies.
 * Uses the EventBus to communicate with the actual storage implementation.
 */
export class StorageService {
  private eventBus: EventBus
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  > = new Map()
  private readonly REQUEST_TIMEOUT = 2000 // 2 seconds (shorter for tests)
  private isTestMode: boolean = false

  constructor(eventBus?: EventBus, options?: { testMode?: boolean }) {
    this.eventBus = eventBus || EventBus.getInstance()
    this.isTestMode = options?.testMode ?? false
    this.initializeResponseHandler()
  }

  private initializeResponseHandler(): void {
    this.eventBus.subscribe(
      'storage:response',
      this.handleStorageResponse.bind(this)
    )
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async makeRequest<T>(request: StorageRequestEvent): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.requestId)
        reject(new Error(`Storage request timeout: ${request.operation}`))
      }, this.REQUEST_TIMEOUT)

      this.pendingRequests.set(request.requestId, {
        resolve,
        reject,
        timeout,
      })

      // Emit the storage request event
      this.eventBus
        .publish({
          source: 'StorageService',
          type: 'storage:request',
          data: request,
          metadata: { version: '1.0.0' },
        })
        .catch(error => {
          this.pendingRequests.delete(request.requestId)
          clearTimeout(timeout)
          reject(
            new Error(`Failed to publish storage request: ${error.message}`)
          )
        })
    })
  }

  private async handleStorageResponse(event: any): Promise<void> {
    const response = event.data as StorageResponseEvent
    const pendingRequest = this.pendingRequests.get(response.requestId)

    if (!pendingRequest) {
      // Request might have timed out or was already resolved
      return
    }

    clearTimeout(pendingRequest.timeout)
    this.pendingRequests.delete(response.requestId)

    if (response.success) {
      pendingRequest.resolve(response.data)
    } else {
      pendingRequest.reject(
        new Error(response.error || 'Storage operation failed')
      )
    }
  }

  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    const requestId = this.generateRequestId()
    const request: StorageRequestEvent = {
      operation: 'get',
      key,
      requestId,
    }

    return this.makeRequest<T | null>(request)
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const requestId = this.generateRequestId()
    const request: StorageRequestEvent = {
      operation: 'set',
      key,
      data: value,
      ttl,
      requestId,
    }

    return this.makeRequest<void>(request)
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    const requestId = this.generateRequestId()
    const request: StorageRequestEvent = {
      operation: 'remove',
      key,
      requestId,
    }

    return this.makeRequest<void>(request)
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    const requestId = this.generateRequestId()
    const request: StorageRequestEvent = {
      operation: 'clear',
      requestId,
    }

    return this.makeRequest<void>(request)
  }

  /**
   * Get all storage keys
   */
  async getKeys(): Promise<string[]> {
    const requestId = this.generateRequestId()
    const request: StorageRequestEvent = {
      operation: 'getKeys',
      requestId,
    }

    return this.makeRequest<string[]>(request)
  }

  /**
   * Cleanup pending requests and unsubscribe from events
   */
  destroy(): void {
    // Clear all pending requests
    for (const [requestId, pendingRequest] of this.pendingRequests) {
      clearTimeout(pendingRequest.timeout)
      pendingRequest.reject(new Error('StorageService destroyed'))
    }
    this.pendingRequests.clear()

    // Note: EventBus doesn't currently have an unsubscribe method
    // This should be added to the EventBus implementation for proper cleanup
  }
}
