export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString()
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function getDayOfWeek(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString([], { weekday: 'long' })
}

export function getMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' })
}

export function formatRelativeTime(timestamp: number | Date | string): string {
  const date =
    typeof timestamp === 'number'
      ? new Date(timestamp)
      : typeof timestamp === 'string'
        ? new Date(timestamp)
        : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} Days Ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} Weeks Ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} Months Ago`
  return `${Math.floor(diffDays / 365)} Years Ago`
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
