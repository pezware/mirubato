/**
 * Date utility functions
 */

/**
 * Format date to ISO string
 */
export function toISOString(date: Date | string | number): string {
  return new Date(date).toISOString()
}

/**
 * Get Unix timestamp (seconds)
 */
export function toUnixTimestamp(date: Date | string | number): number {
  return Math.floor(new Date(date).getTime() / 1000)
}

/**
 * Convert Unix timestamp to Date
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000)
}

/**
 * Add duration to date
 */
export function addDuration(
  date: Date,
  duration: {
    days?: number
    hours?: number
    minutes?: number
    seconds?: number
  }
): Date {
  const result = new Date(date)

  if (duration.days) {
    result.setDate(result.getDate() + duration.days)
  }
  if (duration.hours) {
    result.setHours(result.getHours() + duration.hours)
  }
  if (duration.minutes) {
    result.setMinutes(result.getMinutes() + duration.minutes)
  }
  if (duration.seconds) {
    result.setSeconds(result.getSeconds() + duration.seconds)
  }

  return result
}

/**
 * Check if date is expired
 */
export function isExpired(date: Date | string | number): boolean {
  return new Date(date) < new Date()
}

/**
 * Get date range for filtering
 */
export function getDateRange(period: 'day' | 'week' | 'month' | 'year'): {
  start: Date
  end: Date
} {
  const end = new Date()
  const start = new Date()

  switch (period) {
    case 'day':
      start.setDate(start.getDate() - 1)
      break
    case 'week':
      start.setDate(start.getDate() - 7)
      break
    case 'month':
      start.setMonth(start.getMonth() - 1)
      break
    case 'year':
      start.setFullYear(start.getFullYear() - 1)
      break
  }

  return { start, end }
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []

  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}
