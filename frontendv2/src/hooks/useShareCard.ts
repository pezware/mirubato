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
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameDay,
} from 'date-fns'
import { formatDuration, formatDurationLong } from '../utils/dateUtils'

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

export interface ShareCardData {
  // View mode
  viewMode: 'day' | 'week'

  // Current period info
  periodDate: Date
  periodLabel: string // e.g., "November 25, 2024" or "Nov 18 - Nov 24, 2024"

  // Today/this week data
  periodPieces: ShareCardPiece[]
  periodTotalMinutes: number
  periodTotalFormatted: string
  periodNotes: string[]

  // Weekly specific data
  weeklyDailyData: DailyPracticeData[] // 7 days of data for bar chart
  weeklySessionCount: number
  weeklyConsistency: number // percentage of days practiced
  weeklyEvents: ShareCardEvent[] // status changes

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
  setViewMode: (mode: 'day' | 'week') => void
  goBack: () => void
  goForward: () => void
  goToToday: () => void
}

export function useShareCard(): UseShareCardReturn {
  const { entries } = useLogbookStore()
  const { user } = useAuthStore()
  const { preferences } = useUserPreferences()

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
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
    } else {
      // Week mode
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
    }

    // Filter entries for the period
    const periodEntries = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      return isWithinInterval(entryDate, { start: periodStart, end: periodEnd })
    })

    // Aggregate pieces with their durations and collect notes
    const pieceMap = new Map<string, ShareCardPiece>()
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
        const key = `${piece.title}|${piece.composer || ''}`
        const existing = pieceMap.get(key)

        if (existing) {
          const durationPerPiece =
            (entry.duration || 0) / (entry.pieces?.length || 1)
          existing.duration += durationPerPiece
        } else {
          const durationPerPiece =
            (entry.duration || 0) / (entry.pieces?.length || 1)
          pieceMap.set(key, {
            title: piece.title,
            composer: piece.composer || null,
            duration: durationPerPiece,
          })
        }
      })
    })

    // Calculate weekly specific data
    let weeklyDailyData: DailyPracticeData[] = []
    let weeklySessionCount = 0
    let weeklyConsistency = 0

    if (viewMode === 'week') {
      const weekDays = eachDayOfInterval({ start: periodStart, end: periodEnd })
      weeklyDailyData = weekDays.map(day => {
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

        return {
          date: day,
          dateStr: format(day, 'yyyy-MM-dd'),
          dayLabel: format(day, 'EEE'),
          minutes: dayMinutes,
        }
      })

      const practiceEntries = periodEntries.filter(
        e => e.type !== 'status_change'
      )
      weeklySessionCount = practiceEntries.length
      const daysWithPractice = weeklyDailyData.filter(d => d.minutes > 0).length
      weeklyConsistency = Math.round((daysWithPractice / 7) * 100)
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
      periodPieces: Array.from(pieceMap.values()).sort(
        (a, b) => b.duration - a.duration
      ),
      periodTotalMinutes,
      periodTotalFormatted: formatDuration(periodTotalMinutes),
      periodNotes,
      weeklyDailyData,
      weeklySessionCount,
      weeklyConsistency,
      weeklyEvents: events.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
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
    setViewMode: (mode: 'day' | 'week') => {
      setViewMode(mode)
      setPeriodOffset(0) // Reset offset when switching modes
    },
    goBack,
    goForward,
    goToToday,
  }
}
