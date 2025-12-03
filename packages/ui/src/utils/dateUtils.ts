import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { enUS, es, fr, de, zhCN, zhTW } from 'date-fns/locale'
import type { Locale } from 'date-fns'

// Locale mapping for date-fns
const localeMap: Record<string, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
}

/**
 * Get the appropriate date-fns locale based on current language
 */
export function getDateLocale(language?: string): Locale {
  const lang = language || 'en'
  return localeMap[lang] || enUS
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Format duration in minutes to longer human-readable string
 * Example: "5 hr 30 min" instead of "5h 30m"
 */
export function formatDurationLong(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

/**
 * Format date for display (localized)
 */
export function formatDate(date: Date | string, language?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(language)
}

/**
 * Format time for display (12/24 hour based on locale)
 */
export function formatTime(date: Date | string, language?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(language || [], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format full date and time
 * Example: "Jan 5, 2024 3:30 PM"
 */
export function formatDateTime(
  date: Date | string | number,
  language?: string
): string {
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return format(d, 'MMM d, yyyy h:mm a', { locale: getDateLocale(language) })
}

/**
 * Format date for HTML date input (yyyy-MM-dd)
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}

/**
 * Format date for section separators
 * Example: "Jan 05, 2024"
 */
export function formatDateSeparator(
  date: Date | string | number,
  language?: string
): string {
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return d.toLocaleDateString(language, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format full date with weekday
 * Example: "Monday, January 5, 2024"
 */
export function formatFullDate(date: Date | string, language?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Get day of week
 */
export function getDayOfWeek(date: Date | string, language?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(language || [], { weekday: 'long' })
}

/**
 * Get month and year
 */
export function getMonthYear(date: Date | string, language?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(language || [], {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format month for grouping
 * Example: "January 2024"
 */
export function formatMonthGroup(
  date: Date | string | number,
  language?: string
): string {
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return format(d, 'MMMM yyyy', { locale: getDateLocale(language) })
}

/**
 * Format relative time with intelligent display
 * - "Today" for today
 * - "Yesterday" for yesterday
 * - "X days ago" for recent dates
 * - Full relative time for older dates
 */
export function formatRelativeTime(
  timestamp: number | Date | string,
  options?: {
    capitalize?: boolean
    language?: string
    addSuffix?: boolean
  }
): string {
  const date =
    typeof timestamp === 'number'
      ? new Date(timestamp)
      : typeof timestamp === 'string'
        ? new Date(timestamp)
        : timestamp

  // Check for today/yesterday first
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'

  // Use date-fns for other relative times
  const relativeStr = formatDistanceToNow(date, {
    addSuffix: options?.addSuffix !== false,
    locale: getDateLocale(options?.language),
  })

  // Capitalize if requested
  return options?.capitalize ? capitalizeTimeString(relativeStr) : relativeStr
}

/**
 * Capitalizes time-related words in a string
 * Used to fix date-fns formatDistanceToNow output
 * Example: "about 1 week ago" → "About 1 Week Ago"
 */
export function capitalizeTimeString(str: string): string {
  const wordsToCapitalize = [
    'about',
    'less',
    'over',
    'almost',
    'second',
    'seconds',
    'minute',
    'minutes',
    'hour',
    'hours',
    'day',
    'days',
    'week',
    'weeks',
    'month',
    'months',
    'year',
    'years',
    'ago',
  ]

  let result = str
  wordsToCapitalize.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    result = result.replace(regex, word.charAt(0).toUpperCase() + word.slice(1))
  })

  return result
}

/**
 * Check if a date is today
 */
export function checkIsToday(date: Date | string | number): boolean {
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return isToday(d)
}

/**
 * Check if a date is yesterday
 */
export function checkIsYesterday(date: Date | string | number): boolean {
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return isYesterday(d)
}

/**
 * Format time only (without date)
 * Example: "3:30 PM"
 */
export function formatTimeOnly(
  date: Date | string | number,
  language?: string
): string {
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return format(d, 'h:mm a', { locale: getDateLocale(language) })
}

// =============================================================================
// Timer Utilities - for formatting raw seconds (timers, countdowns, stopwatches)
// =============================================================================

/**
 * Format total seconds to timer display format
 * Example: 3665 → "1:01:05" (hours shown only if > 0)
 * Example: 125 → "2:05"
 *
 * @param totalSeconds - Total seconds to format
 * @returns Formatted string in H:MM:SS or M:SS format
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format total seconds to compact human-readable format
 * Example: 3665 → "1h 1m"
 * Example: 125 → "2m"
 * Example: 45 → "45s"
 *
 * @param totalSeconds - Total seconds to format
 * @returns Formatted string like "Xh Ym" or "Xm" or "Xs"
 */
export function formatTimerCompact(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${totalSeconds}s`
}
