import { useMemo } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import { useAuthStore } from '../stores/authStore'
import { useUserPreferences } from './useUserPreferences'
import {
  format,
  startOfDay,
  endOfDay,
  isWithinInterval,
  subDays,
  eachDayOfInterval,
} from 'date-fns'

export interface WeeklyPieceData {
  title: string
  composer: string | null
  totalMinutes: number
  sessionCount: number
}

export interface DailyData {
  date: Date
  dateFormatted: string
  dayName: string
  minutes: number
}

export interface WeeklyShareCardData {
  // Date range
  startDate: Date
  endDate: Date
  dateRangeFormatted: string

  // Summary stats
  totalMinutes: number
  totalFormatted: string
  sessionCount: number
  pieceCount: number
  consistencyPercent: number // days practiced / 7 * 100

  // Averages
  avgSessionMinutes: number
  avgSessionFormatted: string
  dailyAvgMinutes: number
  dailyAvgFormatted: string

  // Daily breakdown
  dailyData: DailyData[]
  maxDailyMinutes: number // for chart scaling

  // Pieces practiced (sorted by time)
  pieces: WeeklyPieceData[]

  // User info
  displayName: string
  hasData: boolean
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function formatTotalDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

export function useWeeklyShareCard(): WeeklyShareCardData {
  const { entries } = useLogbookStore()
  const { user } = useAuthStore()
  const { preferences } = useUserPreferences()

  return useMemo(() => {
    const today = new Date()
    const endDate = endOfDay(today)
    const startDate = startOfDay(subDays(today, 6)) // Last 7 days including today

    // Get all days in the week
    const weekDays = eachDayOfInterval({ start: startDate, end: endDate })

    // Filter entries within the week
    const weekEntries = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      return isWithinInterval(entryDate, { start: startDate, end: endDate })
    })

    // Initialize daily data
    const dailyDataMap = new Map<
      string,
      { minutes: number; sessions: number }
    >()
    weekDays.forEach(day => {
      dailyDataMap.set(format(day, 'yyyy-MM-dd'), { minutes: 0, sessions: 0 })
    })

    // Aggregate piece data
    const pieceMap = new Map<
      string,
      {
        title: string
        composer: string | null
        minutes: number
        sessions: Set<string>
      }
    >()

    // Process entries
    let totalMinutes = 0
    weekEntries.forEach(entry => {
      const duration = entry.duration || 0
      totalMinutes += duration

      // Update daily data
      const dateStr = format(new Date(entry.timestamp), 'yyyy-MM-dd')
      const dailyEntry = dailyDataMap.get(dateStr)
      if (dailyEntry) {
        dailyEntry.minutes += duration
        dailyEntry.sessions += 1
      }

      // Aggregate pieces
      entry.pieces?.forEach(piece => {
        const key = `${piece.title}|${piece.composer || ''}`
        const durationPerPiece = duration / (entry.pieces?.length || 1)

        if (pieceMap.has(key)) {
          const existing = pieceMap.get(key)!
          existing.minutes += durationPerPiece
          existing.sessions.add(entry.id)
        } else {
          pieceMap.set(key, {
            title: piece.title,
            composer: piece.composer || null,
            minutes: durationPerPiece,
            sessions: new Set([entry.id]),
          })
        }
      })
    })

    // Build daily data array
    const dailyData: DailyData[] = weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const data = dailyDataMap.get(dateStr) || { minutes: 0, sessions: 0 }
      return {
        date: day,
        dateFormatted: format(day, 'MMM d'),
        dayName: format(day, 'EEE'),
        minutes: data.minutes,
      }
    })

    // Calculate max daily minutes for chart scaling
    const maxDailyMinutes = Math.max(...dailyData.map(d => d.minutes), 1)

    // Build pieces array (sorted by time, filter out pieces not practiced)
    const pieces: WeeklyPieceData[] = Array.from(pieceMap.values())
      .filter(p => p.minutes > 0)
      .map(p => ({
        title: p.title,
        composer: p.composer,
        totalMinutes: p.minutes,
        sessionCount: p.sessions.size,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)

    // Calculate stats
    const sessionCount = weekEntries.length
    const daysPracticed = dailyData.filter(d => d.minutes > 0).length
    const consistencyPercent = Math.round((daysPracticed / 7) * 100)
    const avgSessionMinutes = sessionCount > 0 ? totalMinutes / sessionCount : 0
    const dailyAvgMinutes = totalMinutes / 7

    // Get display name
    const displayName =
      preferences.displayName ||
      user?.displayName ||
      user?.email?.split('@')[0] ||
      'Musician'

    return {
      startDate,
      endDate,
      dateRangeFormatted: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
      totalMinutes,
      totalFormatted: formatTotalDuration(totalMinutes),
      sessionCount,
      pieceCount: pieces.length,
      consistencyPercent,
      avgSessionMinutes,
      avgSessionFormatted: formatDuration(avgSessionMinutes),
      dailyAvgMinutes,
      dailyAvgFormatted: formatDuration(dailyAvgMinutes),
      dailyData,
      maxDailyMinutes,
      pieces,
      displayName,
      hasData: totalMinutes > 0,
    }
  }, [entries, user, preferences])
}
