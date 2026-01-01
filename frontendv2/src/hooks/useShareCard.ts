import { useMemo, useState, useCallback } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import { useAuthStore } from '../stores/authStore'
import { useUserPreferences } from './useUserPreferences'
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  subMonths,
  subDays,
  subWeeks,
  addDays,
  addWeeks,
  addMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  startOfMonth,
  endOfMonth,
  isSameDay,
  differenceInDays,
} from 'date-fns'
import { formatDuration, formatDurationLong } from '../utils/dateUtils'
import { getCanonicalComposerName } from '../utils/composerCanonicalizer'

/**
 * Normalizes a piece title for deduplication matching
 * Handles case variations, extra whitespace, and common formatting differences
 */
function normalizeTitleForMatching(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/[–—]/g, '-') // Normalize dashes
}

export interface ShareCardPiece {
  title: string
  composer: string | null
  duration: number // minutes spent on this piece
}

export interface ShareCardEvent {
  type: 'status_change'
  pieceTitle: string
  pieceComposer: string | null
  oldStatus: string
  newStatus: string
  timestamp: Date
}

export interface DailyPracticeData {
  date: Date
  dateStr: string // yyyy-MM-dd
  dayLabel: string // e.g., "Mon", "Tue"
  minutes: number
}

export type ShareCardViewMode =
  | 'day'
  | 'week'
  | 'last7days'
  | 'last30days'
  | 'last365days'

export interface BreakdownDataItem {
  date: Date
  dateStr: string // yyyy-MM-dd or week identifier
  label: string // e.g., "Mon", "Dec 25", "Week 1", "Jan"
  minutes: number
}

export interface ShareCardData {
  // View mode
  viewMode: ShareCardViewMode

  // Current period info
  periodDate: Date
  periodLabel: string // e.g., "November 25, 2024" or "Nov 18 - Nov 24, 2024"

  // Today/this week data
  periodPieces: ShareCardPiece[]
  periodTotalMinutes: number
  periodTotalFormatted: string
  periodNotes: string[]

  // Weekly specific data (kept for backward compatibility)
  weeklyDailyData: DailyPracticeData[] // 7 days of data for bar chart
  weeklySessionCount: number
  weeklyConsistency: number // percentage of days practiced
  weeklyEvents: ShareCardEvent[] // status changes

  // Unified breakdown data for all multi-day modes
  breakdownData: BreakdownDataItem[] // variable length based on mode
  breakdownType: 'daily' | 'weekly' // granularity of breakdown
  periodDays: number // total days in the period

  // Total stats (all time)
  totalMinutes: number
  totalFormatted: string
  totalEntries: number
  totalPieces: number

  // Heatmap data (last 4-6 months)
  heatmapData: Map<string, number>

  // User info
  displayName: string
  hasData: boolean

  // Navigation
  canGoBack: boolean
  canGoForward: boolean
  periodOffset: number // 0 = today/this week, -1 = yesterday/last week, etc.
}

export interface UseShareCardReturn extends ShareCardData {
  setViewMode: (mode: ShareCardViewMode) => void
  goBack: () => void
  goForward: () => void
  goToToday: () => void
}

export function useShareCard(): UseShareCardReturn {
  const { entries } = useLogbookStore()
  const { user } = useAuthStore()
  const { preferences } = useUserPreferences()

  const [viewMode, setViewMode] = useState<ShareCardViewMode>('day')
  const [periodOffset, setPeriodOffset] = useState(0)

  const goBack = useCallback(() => {
    setPeriodOffset(prev => prev - 1)
  }, [])

  const goForward = useCallback(() => {
    setPeriodOffset(prev => Math.min(prev + 1, 0))
  }, [])

  const goToToday = useCallback(() => {
    setPeriodOffset(0)
  }, [])

  const data = useMemo(() => {
    const today = new Date()

    // Calculate the target date/period based on offset
    let targetDate: Date
    let periodStart: Date
    let periodEnd: Date
    let periodLabel: string

    if (viewMode === 'day') {
      targetDate =
        periodOffset === 0 ? today : subDays(today, Math.abs(periodOffset))
      if (periodOffset < 0) {
        targetDate = addDays(today, periodOffset)
      }
      periodStart = startOfDay(targetDate)
      periodEnd = endOfDay(targetDate)

      if (isSameDay(targetDate, today)) {
        periodLabel = format(targetDate, 'MMMM d, yyyy') + ' (Today)'
      } else if (periodOffset === -1) {
        periodLabel = format(targetDate, 'MMMM d, yyyy') + ' (Yesterday)'
      } else {
        periodLabel = format(targetDate, 'MMMM d, yyyy')
      }
    } else if (viewMode === 'week') {
      // Calendar week mode (Mon-Sun)
      targetDate =
        periodOffset === 0 ? today : subWeeks(today, Math.abs(periodOffset))
      if (periodOffset < 0) {
        targetDate = addWeeks(today, periodOffset)
      }
      periodStart = startOfWeek(targetDate, { weekStartsOn: 1 }) // Monday
      periodEnd = endOfWeek(targetDate, { weekStartsOn: 1 }) // Sunday

      const startLabel = format(periodStart, 'MMM d')
      const endLabel = format(periodEnd, 'MMM d, yyyy')

      if (periodOffset === 0) {
        periodLabel = `${startLabel} - ${endLabel} (This Week)`
      } else if (periodOffset === -1) {
        periodLabel = `${startLabel} - ${endLabel} (Last Week)`
      } else {
        periodLabel = `${startLabel} - ${endLabel}`
      }
    } else if (viewMode === 'last7days') {
      // Rolling 7-day period - offset shifts by days
      const endDate =
        periodOffset === 0 ? today : subDays(today, Math.abs(periodOffset))
      periodEnd = endOfDay(
        periodOffset < 0 ? addDays(today, periodOffset) : endDate
      )
      periodStart = startOfDay(subDays(periodEnd, 6))
      targetDate = periodEnd

      const startLabel = format(periodStart, 'MMM d')
      const endLabel = format(periodEnd, 'MMM d, yyyy')
      periodLabel = `${startLabel} - ${endLabel}`
    } else if (viewMode === 'last30days') {
      // Rolling 30-day period - offset shifts by weeks
      const weeksBack = Math.abs(periodOffset) * 7
      const endDate = periodOffset === 0 ? today : subDays(today, weeksBack)
      periodEnd = endOfDay(
        periodOffset < 0 ? addDays(today, periodOffset * 7) : endDate
      )
      periodStart = startOfDay(subDays(periodEnd, 29))
      targetDate = periodEnd

      const startLabel = format(periodStart, 'MMM d')
      const endLabel = format(periodEnd, 'MMM d, yyyy')
      periodLabel = `${startLabel} - ${endLabel}`
    } else {
      // last365days - offset shifts by months
      const endDate =
        periodOffset === 0 ? today : subMonths(today, Math.abs(periodOffset))
      periodEnd = endOfDay(
        periodOffset < 0 ? addMonths(today, periodOffset) : endDate
      )
      periodStart = startOfDay(subDays(periodEnd, 364))
      targetDate = periodEnd

      const startLabel = format(periodStart, 'MMM d, yyyy')
      const endLabel = format(periodEnd, 'MMM d, yyyy')
      periodLabel = `${startLabel} - ${endLabel}`
    }

    // Filter entries for the period
    const periodEntries = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      return isWithinInterval(entryDate, { start: periodStart, end: periodEnd })
    })

    // Aggregate pieces with their durations and collect notes
    // Use normalized keys for deduplication but preserve best display names
    const pieceMap = new Map<
      string,
      ShareCardPiece & { normalizedTitle: string; normalizedComposer: string }
    >()
    const periodNotes: string[] = []
    let periodTotalMinutes = 0
    const events: ShareCardEvent[] = []

    periodEntries.forEach(entry => {
      periodTotalMinutes += entry.duration || 0

      // Collect notes from entries
      if (entry.notes && entry.notes.trim()) {
        // Check for status change entries
        if (
          entry.type === 'status_change' &&
          entry.notes.includes('Status changed:')
        ) {
          const match = entry.notes.match(/Status changed: (\w+) → (\w+)/)
          if (match) {
            const [, oldStatus, newStatus] = match
            const pieceTitle = entry.pieces?.[0]?.title || 'Unknown'
            const pieceComposer = entry.pieces?.[0]?.composer || null
            events.push({
              type: 'status_change',
              pieceTitle,
              pieceComposer,
              oldStatus,
              newStatus,
              timestamp: new Date(entry.timestamp),
            })
          }
        } else if (entry.type !== 'status_change') {
          periodNotes.push(entry.notes.trim())
        }
      }

      // Skip status_change entries for piece aggregation
      if (entry.type === 'status_change') return

      entry.pieces?.forEach(piece => {
        // Normalize for deduplication key
        const normalizedTitle = normalizeTitleForMatching(piece.title || '')
        const normalizedComposer = getCanonicalComposerName(piece.composer)
          .toLowerCase()
          .trim()
        const key = `${normalizedTitle}|${normalizedComposer}`

        const existing = pieceMap.get(key)
        const durationPerPiece =
          (entry.duration || 0) / (entry.pieces?.length || 1)

        if (existing) {
          existing.duration += durationPerPiece
          // Prefer properly capitalized versions (longer or has more uppercase)
          const existingTitleScore =
            existing.title.length +
            (existing.title.match(/[A-Z]/g)?.length || 0)
          const newTitleScore =
            (piece.title?.length || 0) +
            (piece.title?.match(/[A-Z]/g)?.length || 0)
          if (newTitleScore > existingTitleScore && piece.title) {
            existing.title = piece.title
          }
          // Use canonical composer name if available
          const canonicalComposer = getCanonicalComposerName(piece.composer)
          if (canonicalComposer && !existing.composer) {
            existing.composer = canonicalComposer
          } else if (
            canonicalComposer &&
            canonicalComposer.length > (existing.composer?.length || 0)
          ) {
            existing.composer = canonicalComposer
          }
        } else {
          pieceMap.set(key, {
            title: piece.title || '',
            composer: getCanonicalComposerName(piece.composer) || null,
            duration: durationPerPiece,
            normalizedTitle,
            normalizedComposer,
          })
        }
      })
    })

    // Calculate breakdown data for multi-day modes
    let weeklyDailyData: DailyPracticeData[] = []
    let weeklySessionCount = 0
    let weeklyConsistency = 0
    let breakdownData: BreakdownDataItem[] = []
    let breakdownType: 'daily' | 'weekly' = 'daily'
    let periodDays = 1

    const isMultiDayMode = viewMode !== 'day'

    if (isMultiDayMode) {
      periodDays = differenceInDays(periodEnd, periodStart) + 1
      const practiceEntries = periodEntries.filter(
        e => e.type !== 'status_change'
      )
      weeklySessionCount = practiceEntries.length

      if (viewMode === 'last365days') {
        // Group into weekly summaries for readability (52 bars)
        breakdownType = 'weekly'
        const weeks = eachWeekOfInterval(
          { start: periodStart, end: periodEnd },
          { weekStartsOn: 1 }
        )
        let lastMonth = -1
        breakdownData = weeks.map(weekStart => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
          const weekEntries = periodEntries.filter(entry => {
            const entryDate = new Date(entry.timestamp)
            return (
              isWithinInterval(entryDate, { start: weekStart, end: weekEnd }) &&
              entry.type !== 'status_change'
            )
          })
          const weekMinutes = weekEntries.reduce(
            (sum, e) => sum + (e.duration || 0),
            0
          )

          // Only show month abbreviation when month changes
          const currentMonth = weekStart.getMonth()
          let label = ''
          if (currentMonth !== lastMonth) {
            label = format(weekStart, 'MMM')
            lastMonth = currentMonth
          }

          return {
            date: weekStart,
            dateStr: format(weekStart, 'yyyy-ww'),
            label,
            minutes: weekMinutes,
          }
        })

        // Consistency: weeks with practice / total weeks
        const weeksWithPractice = breakdownData.filter(
          w => w.minutes > 0
        ).length
        weeklyConsistency = Math.round(
          (weeksWithPractice / breakdownData.length) * 100
        )
      } else {
        // Daily breakdown for week, last7days, last30days
        breakdownType = 'daily'
        const days = eachDayOfInterval({ start: periodStart, end: periodEnd })
        let lastMonth30 = -1
        breakdownData = days.map((day, index) => {
          const dayStart = startOfDay(day)
          const dayEnd = endOfDay(day)
          const dayEntries = periodEntries.filter(entry => {
            const entryDate = new Date(entry.timestamp)
            return (
              isWithinInterval(entryDate, { start: dayStart, end: dayEnd }) &&
              entry.type !== 'status_change'
            )
          })
          const dayMinutes = dayEntries.reduce(
            (sum, e) => sum + (e.duration || 0),
            0
          )

          // Determine label based on mode
          let label: string
          if (viewMode === 'week' || viewMode === 'last7days') {
            label = format(day, 'EEE') // Mon, Tue, etc.
          } else {
            // last30days - show month abbreviation only when month changes
            const currentMonth = day.getMonth()
            if (currentMonth !== lastMonth30 || index === 0) {
              label = format(day, 'MMM')
              lastMonth30 = currentMonth
            } else {
              label = '' // Empty for other days to reduce overlap
            }
          }

          return {
            date: day,
            dateStr: format(day, 'yyyy-MM-dd'),
            label,
            minutes: dayMinutes,
          }
        })

        const daysWithPractice = breakdownData.filter(d => d.minutes > 0).length
        weeklyConsistency = Math.round((daysWithPractice / periodDays) * 100)
      }

      // Keep weeklyDailyData for backward compatibility (week mode)
      if (viewMode === 'week') {
        weeklyDailyData = breakdownData.map(d => ({
          date: d.date,
          dateStr: d.dateStr,
          dayLabel: d.label,
          minutes: d.minutes,
        }))
      }
    }

    // Calculate total stats
    let totalMinutes = 0
    const allPieces = new Set<string>()

    entries.forEach(entry => {
      if (entry.type !== 'status_change') {
        totalMinutes += entry.duration || 0
        entry.pieces?.forEach(piece => {
          allPieces.add(`${piece.title}|${piece.composer || ''}`)
        })
      }
    })

    // Build heatmap data (last 6 months)
    const heatmapData = new Map<string, number>()
    const sixMonthsAgo = startOfMonth(subMonths(today, 5))
    const monthEnd = endOfMonth(today)

    const allDays = eachDayOfInterval({ start: sixMonthsAgo, end: monthEnd })
    allDays.forEach(day => {
      heatmapData.set(format(day, 'yyyy-MM-dd'), 0)
    })

    entries.forEach(entry => {
      if (entry.type === 'status_change') return
      const entryDate = new Date(entry.timestamp)
      const dateStr = format(entryDate, 'yyyy-MM-dd')

      if (heatmapData.has(dateStr)) {
        const current = heatmapData.get(dateStr) || 0
        heatmapData.set(dateStr, current + (entry.duration || 0))
      }
    })

    // Get display name
    const displayName =
      preferences.displayName ||
      user?.displayName ||
      user?.email?.split('@')[0] ||
      'Musician'

    // Check if we can navigate (limit to ~1 year back)
    const canGoBack = periodOffset > -52
    const canGoForward = periodOffset < 0

    return {
      viewMode,
      periodDate: targetDate,
      periodLabel,
      periodPieces: Array.from(pieceMap.values())
        .map(({ title, composer, duration }) => ({ title, composer, duration }))
        .sort((a, b) => b.duration - a.duration),
      periodTotalMinutes,
      periodTotalFormatted: formatDuration(periodTotalMinutes),
      periodNotes,
      weeklyDailyData,
      weeklySessionCount,
      weeklyConsistency,
      weeklyEvents: events.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
      breakdownData,
      breakdownType,
      periodDays,
      totalMinutes,
      totalFormatted: formatDurationLong(totalMinutes),
      totalEntries: entries.filter(e => e.type !== 'status_change').length,
      totalPieces: allPieces.size,
      heatmapData,
      displayName,
      hasData: periodTotalMinutes > 0 || entries.length > 0,
      canGoBack,
      canGoForward,
      periodOffset,
    }
  }, [entries, user, preferences, viewMode, periodOffset])

  return {
    ...data,
    setViewMode: (mode: ShareCardViewMode) => {
      setViewMode(mode)
      setPeriodOffset(0) // Reset offset when switching modes
    },
    goBack,
    goForward,
    goToToday,
  }
}
