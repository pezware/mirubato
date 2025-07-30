/**
 * Async Mutex implementation for preventing concurrent sync operations
 * Ensures that only one sync operation runs at a time per context
 */

interface MutexQueueItem {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  operation: () => Promise<unknown>
  context: string
  timestamp: number
}

export class AsyncMutex {
  private locked = false
  private queue: MutexQueueItem[] = []
  private currentOperation: string | null = null
  private debugLogging = false

  constructor(enableDebugLogging = false) {
    this.debugLogging = enableDebugLogging
  }

  /**
   * Execute an operation exclusively
   * Only one operation can run at a time
   */
  async runExclusive<T>(
    operation: () => Promise<T>,
    context = 'default'
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queueItem: MutexQueueItem = {
        resolve: resolve as (value: unknown) => void,
        reject,
        operation: operation as () => Promise<unknown>,
        context,
        timestamp: Date.now(),
      }

      this.queue.push(queueItem)

      if (this.debugLogging) {
        console.log(
          `[AsyncMutex] Queued operation: ${context}, queue length: ${this.queue.length}`
        )
      }

      this.processQueue()
    })
  }

  /**
   * Check if the mutex is currently locked
   */
  isLocked(): boolean {
    return this.locked
  }

  /**
   * Get the current operation context
   */
  getCurrentOperation(): string | null {
    return this.currentOperation
  }

  /**
   * Get the number of queued operations
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Wait for all queued operations to complete
   */
  async waitForEmpty(): Promise<void> {
    return new Promise<void>(resolve => {
      const checkEmpty = () => {
        if (!this.locked && this.queue.length === 0) {
          resolve()
        } else {
          setTimeout(checkEmpty, 10)
        }
      }
      checkEmpty()
    })
  }

  /**
   * Clear all queued operations (emergency cleanup)
   */
  clearQueue(): void {
    const clearedCount = this.queue.length
    this.queue.forEach(item => {
      item.reject(new Error('Operation cancelled: queue cleared'))
    })
    this.queue = []

    if (this.debugLogging) {
      console.log(`[AsyncMutex] Cleared ${clearedCount} queued operations`)
    }
  }

  /**
   * Process the queue of operations
   */
  private async processQueue(): Promise<void> {
    if (this.locked || this.queue.length === 0) {
      return
    }

    this.locked = true
    const item = this.queue.shift()!
    this.currentOperation = item.context

    const startTime = Date.now()
    if (this.debugLogging) {
      const queueTime = startTime - item.timestamp
      console.log(
        `[AsyncMutex] Starting operation: ${item.context}, queued for ${queueTime}ms`
      )
    }

    try {
      const result = await item.operation()
      item.resolve(result)

      if (this.debugLogging) {
        const duration = Date.now() - startTime
        console.log(
          `[AsyncMutex] Completed operation: ${item.context} in ${duration}ms`
        )
      }
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error(String(error)))

      if (this.debugLogging) {
        const duration = Date.now() - startTime
        console.error(
          `[AsyncMutex] Failed operation: ${item.context} after ${duration}ms`,
          error
        )
      }
    } finally {
      this.locked = false
      this.currentOperation = null

      // Process next item in queue
      if (this.queue.length > 0) {
        // Use setTimeout to prevent stack overflow with many queued operations
        setTimeout(() => this.processQueue(), 0)
      }
    }
  }
}

/**
 * Global sync mutex instance for logbook operations
 * Prevents concurrent sync operations across the application
 */
export const syncMutex = new AsyncMutex(true) // Enable debug logging

/**
 * Decorator for automatic mutex protection
 */
export function withMutex<T extends unknown[], R>(
  mutex: AsyncMutex,
  context: string
) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: T): Promise<R> {
      return mutex.runExclusive(async () => {
        return originalMethod.apply(this, args)
      }, `${context}.${propertyKey}`)
    }

    return descriptor
  }
}

/**
 * Higher-order function for protecting async functions with mutex
 */
export function protectWithMutex<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  mutex: AsyncMutex,
  context: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return mutex.runExclusive(async () => {
      return fn(...args)
    }, context)
  }
}

/**
 * Utility to create a context-specific mutex protector
 */
export function createMutexProtector(mutex: AsyncMutex, baseContext: string) {
  return function protect<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    subContext: string
  ): (...args: T) => Promise<R> {
    return protectWithMutex(fn, mutex, `${baseContext}.${subContext}`)
  }
}
