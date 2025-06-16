import { SyncOperation, SyncResult } from './types'

export interface SyncQueueConfig {
  maxRetries?: number
  retryDelayMs?: number
  backoffMultiplier?: number
  maxBackoffMs?: number
  batchSize?: number
}

export interface ProcessResult {
  processed: number
  failed: number
  pending: number
}

/**
 * Queue for managing sync operations with retry logic
 */
export class SyncQueue {
  private queue: Map<string, SyncOperation> = new Map()
  private processing = false
  private config: Required<SyncQueueConfig>
  private storage: Storage

  constructor(storage: Storage = localStorage, config: SyncQueueConfig = {}) {
    this.storage = storage
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 30000,
      batchSize: 10,
      ...config,
    }

    // Load queue from storage
    this.loadQueue()
  }

  /**
   * Add an operation to the queue
   */
  async addOperation(operation: SyncOperation): Promise<void> {
    // Deduplicate by resource and type
    const dataId =
      operation.data &&
      typeof operation.data === 'object' &&
      'id' in operation.data
        ? (operation.data as { id: string }).id
        : operation.timestamp
    const key = `${operation.resource}:${operation.type}:${dataId}`

    // If same operation exists and is pending, update it
    const existing = this.queue.get(key)
    if (existing && existing.status === 'pending') {
      operation.timestamp = existing.timestamp // Keep original timestamp
    }

    this.queue.set(key, operation)
    await this.persistQueue()
  }

  /**
   * Process the queue
   */
  async processQueue(
    processor?: (operations: SyncOperation[]) => Promise<SyncResult>
  ): Promise<ProcessResult> {
    if (this.processing) {
      return {
        processed: 0,
        failed: 0,
        pending: this.queue.size,
      }
    }

    this.processing = true
    const result: ProcessResult = {
      processed: 0,
      failed: 0,
      pending: 0,
    }

    try {
      // Get pending operations
      const pendingOps = Array.from(this.queue.values())
        .filter(op => op.status === 'pending' || op.status === 'failed')
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, this.config.batchSize)

      if (pendingOps.length === 0) {
        return result
      }

      // Mark as syncing
      pendingOps.forEach(op => {
        op.status = 'syncing'
      })
      await this.persistQueue()

      // Process operations
      if (processor) {
        try {
          const syncResult = await processor(pendingOps)

          if (syncResult.status === 'success') {
            // Mark all as completed
            pendingOps.forEach(op => {
              op.status = 'completed'
              this.queue.delete(this.getOperationKey(op))
              result.processed++
            })
          } else {
            // Handle partial success or failure
            pendingOps.forEach(op => {
              if (this.shouldRetry(op)) {
                op.status = 'pending'
                op.retryCount++
                op.error = syncResult.message
              } else {
                op.status = 'failed'
                op.error = 'Max retries exceeded'
                result.failed++
              }
            })
          }
        } catch (error) {
          // Handle processing error
          pendingOps.forEach(op => {
            if (this.shouldRetry(op)) {
              op.status = 'pending'
              op.retryCount++
              op.error = error instanceof Error ? error.message : String(error)
            } else {
              op.status = 'failed'
              op.error = 'Max retries exceeded'
              result.failed++
            }
          })
        }
      }

      // Clean up completed operations
      this.cleanupCompleted()

      // Update pending count
      result.pending = Array.from(this.queue.values()).filter(
        op => op.status === 'pending' || op.status === 'failed'
      ).length

      await this.persistQueue()
      return result
    } finally {
      this.processing = false
    }
  }

  /**
   * Retry failed operations
   */
  async retryFailed(): Promise<void> {
    const failedOps = Array.from(this.queue.values()).filter(
      op => op.status === 'failed'
    )

    failedOps.forEach(op => {
      if (this.shouldRetry(op)) {
        op.status = 'pending'
        op.retryCount = 0
        delete op.error
      }
    })

    await this.persistQueue()
  }

  /**
   * Get queue status
   */
  getStatus(): {
    total: number
    pending: number
    syncing: number
    completed: number
    failed: number
  } {
    const operations = Array.from(this.queue.values())

    return {
      total: operations.length,
      pending: operations.filter(op => op.status === 'pending').length,
      syncing: operations.filter(op => op.status === 'syncing').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length,
    }
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.queue.values())
      .filter(op => op.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Clear all operations
   */
  async clear(): Promise<void> {
    this.queue.clear()
    await this.persistQueue()
  }

  /**
   * Clear completed operations
   */
  async clearCompleted(): Promise<void> {
    const completed = Array.from(this.queue.entries())
      .filter(([_, op]) => op.status === 'completed')
      .map(([key]) => key)

    completed.forEach(key => this.queue.delete(key))
    await this.persistQueue()
  }

  /**
   * Get retry delay for an operation
   */
  getRetryDelay(operation: SyncOperation): number {
    const baseDelay = this.config.retryDelayMs
    const multiplier = Math.pow(
      this.config.backoffMultiplier,
      operation.retryCount
    )
    const delay = baseDelay * multiplier

    return Math.min(delay, this.config.maxBackoffMs)
  }

  // Private methods

  private shouldRetry(operation: SyncOperation): boolean {
    return operation.retryCount < this.config.maxRetries
  }

  private getOperationKey(operation: SyncOperation): string {
    const dataId =
      operation.data &&
      typeof operation.data === 'object' &&
      'id' in operation.data
        ? (operation.data as { id: string }).id
        : operation.timestamp
    return `${operation.resource}:${operation.type}:${dataId}`
  }

  private cleanupCompleted(): void {
    const completed = Array.from(this.queue.entries())
      .filter(([_, op]) => op.status === 'completed')
      .map(([key]) => key)

    // Keep last 100 completed for history
    if (completed.length > 100) {
      completed.slice(0, completed.length - 100).forEach(key => {
        this.queue.delete(key)
      })
    }
  }

  private async persistQueue(): Promise<void> {
    const data = Array.from(this.queue.entries()).map(([key, op]) => ({
      key,
      operation: op,
    }))

    this.storage.setItem('sync:queue', JSON.stringify(data))
  }

  private loadQueue(): void {
    try {
      const data = this.storage.getItem('sync:queue')
      if (data) {
        const parsed = JSON.parse(data) as Array<{
          key: string
          operation: SyncOperation
        }>

        this.queue.clear()
        parsed.forEach(({ key, operation }) => {
          // Reset syncing operations to pending
          if (operation.status === 'syncing') {
            operation.status = 'pending'
          }
          this.queue.set(key, operation)
        })
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error)
      this.queue.clear()
    }
  }
}
