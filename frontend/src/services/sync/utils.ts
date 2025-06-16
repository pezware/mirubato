/**
 * Utility functions for sync operations
 */

/**
 * Create a hash of an object for comparison
 */
export function createHash(data: unknown): string {
  const sortedKeys =
    data && typeof data === 'object' && data !== null
      ? Object.keys(data).sort()
      : []
  const str = JSON.stringify(data, sortedKeys)
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

/**
 * Deep compare two objects
 */
export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true

  if (obj1 == null || obj2 == null) return false

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2
  }

  const keys1 = Object.keys(obj1 as object)
  const keys2 = Object.keys(obj2 as object)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (
      !deepEqual(
        (obj1 as Record<string, unknown>)[key],
        (obj2 as Record<string, unknown>)[key]
      )
    )
      return false
  }

  return true
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options

  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (i === maxRetries - 1) {
        throw error
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, i),
        maxDelay
      )

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Batch operations for efficient processing
 */
export function batchOperations<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  return batches
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/**
 * Format sync error for display
 */
export function formatSyncError(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return (error as Error).message
  }

  if (error && typeof error === 'object' && 'code' in error) {
    return `Sync error: ${(error as { code: string | number }).code}`
  }

  return 'An unknown sync error occurred'
}

/**
 * Calculate sync progress percentage
 */
export function calculateSyncProgress(
  completed: number,
  total: number
): number {
  if (total === 0) return 100
  return Math.round((completed / total) * 100)
}

/**
 * Merge sync results
 */
export function mergeSyncResults(
  results: Array<{
    uploaded?: number
    downloaded?: number
    conflicts?: number
    merged?: number
  }>
): {
  uploaded: number
  downloaded: number
  conflicts: number
  merged: number
} {
  return results.reduce(
    (
      acc: {
        uploaded: number
        downloaded: number
        conflicts: number
        merged: number
      },
      result
    ) => ({
      uploaded: acc.uploaded + (result.uploaded || 0),
      downloaded: acc.downloaded + (result.downloaded || 0),
      conflicts: acc.conflicts + (result.conflicts || 0),
      merged: acc.merged + (result.merged || 0),
    }),
    { uploaded: 0, downloaded: 0, conflicts: 0, merged: 0 }
  )
}
