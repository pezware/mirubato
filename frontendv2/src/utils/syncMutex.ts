import { Mutex } from 'async-mutex'

/**
 * Sync mutex manager to prevent concurrent sync operations
 * Implements the async mutex pattern for serializing sync requests
 */
export class SyncMutexManager {
  private readonly globalMutex: Mutex
  private readonly operationMutexes: Map<string, Mutex>
  private readonly lastSyncTimes: Map<string, number>

  constructor() {
    this.globalMutex = new Mutex()
    this.operationMutexes = new Map()
    this.lastSyncTimes = new Map()
  }

  /**
   * Get or create a mutex for a specific operation type
   */
  private getOperationMutex(operation: string): Mutex {
    if (!this.operationMutexes.has(operation)) {
      this.operationMutexes.set(operation, new Mutex())
    }
    return this.operationMutexes.get(operation)!
  }

  /**
   * Acquire global sync lock with timeout
   */
  async acquireGlobalLock(timeoutMs: number = 30000): Promise<() => void> {
    return this.globalMutex.acquire()
  }

  /**
   * Acquire operation-specific lock
   */
  async acquireOperationLock(operation: string): Promise<() => void> {
    const mutex = this.getOperationMutex(operation)
    return mutex.acquire()
  }

  /**
   * Check if enough time has passed since last sync
   */
  shouldSync(trigger: string, minIntervalMs: number): boolean {
    const lastSync = this.lastSyncTimes.get(trigger) || 0
    const now = Date.now()
    const elapsed = now - lastSync

    return elapsed >= minIntervalMs
  }

  /**
   * Update last sync time for a trigger
   */
  updateLastSyncTime(trigger: string): void {
    this.lastSyncTimes.set(trigger, Date.now())
  }

  /**
   * Check if any mutex is currently locked
   */
  isLocked(): boolean {
    return this.globalMutex.isLocked()
  }

  /**
   * Get lock status for debugging
   */
  getLockStatus(): {
    global: boolean
    operations: Record<string, boolean>
  } {
    const operations: Record<string, boolean> = {}

    this.operationMutexes.forEach((mutex, name) => {
      operations[name] = mutex.isLocked()
    })

    return {
      global: this.globalMutex.isLocked(),
      operations,
    }
  }
}

// Singleton instance
export const syncMutex = new SyncMutexManager()
