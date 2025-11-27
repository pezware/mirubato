import { useMemo } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import { useAuthStore } from '../stores/authStore'
import { useUserPreferences } from './useUserPreferences'
import {
  format,
  startOfDay,
  endOfDay,
  isWithinInterval,
  subMonths,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
} from 'date-fns'

export interface ShareCardPiece {
  title: string
  composer: string | null
  duration: number // minutes spent on this piece today
}

export interface ShareCardData {
  // Today's data
  todayDate: Date
  todayFormatted: string
  todayPieces: ShareCardPiece[]
  todayTotalMinutes: number
  todayTotalFormatted: string

  // Total stats
  totalMinutes: number
  totalFormatted: string
  totalEntries: number
  totalPieces: number

  // Heatmap data (last 4 months for mobile, 6 for desktop)
  heatmapData: Map<string, number> // date string (yyyy-MM-dd) -> minutes

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

export function useShareCard(): ShareCardData {
  const { entries } = useLogbookStore()
  const { user } = useAuthStore()
  const { preferences } = useUserPreferences()

  return useMemo(() => {
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // Filter today's entries
    const todayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      return isWithinInterval(entryDate, { start: todayStart, end: todayEnd })
    })

    // Aggregate today's pieces with their durations
    const pieceMap = new Map<string, ShareCardPiece>()
    let todayTotalMinutes = 0

    todayEntries.forEach(entry => {
      todayTotalMinutes += entry.duration || 0

      entry.pieces?.forEach(piece => {
        const key = `${piece.title}|${piece.composer || ''}`
        const existing = pieceMap.get(key)

        if (existing) {
          // Add duration proportionally (assume equal time per piece in entry)
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

    // Calculate total stats
    let totalMinutes = 0
    const allPieces = new Set<string>()

    entries.forEach(entry => {
      totalMinutes += entry.duration || 0
      entry.pieces?.forEach(piece => {
        allPieces.add(`${piece.title}|${piece.composer || ''}`)
      })
    })

    // Build heatmap data (last 6 months)
    const heatmapData = new Map<string, number>()
    const sixMonthsAgo = startOfMonth(subMonths(today, 5))
    const monthEnd = endOfMonth(today)

    // Initialize all days with 0
    const allDays = eachDayOfInterval({ start: sixMonthsAgo, end: monthEnd })
    allDays.forEach(day => {
      heatmapData.set(format(day, 'yyyy-MM-dd'), 0)
    })

    // Fill in actual practice data
    entries.forEach(entry => {
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

    return {
      todayDate: today,
      todayFormatted: format(today, 'MMMM d, yyyy'),
      todayPieces: Array.from(pieceMap.values()).sort(
        (a, b) => b.duration - a.duration
      ),
      todayTotalMinutes,
      todayTotalFormatted: formatDuration(todayTotalMinutes),
      totalMinutes,
      totalFormatted: formatTotalDuration(totalMinutes),
      totalEntries: entries.length,
      totalPieces: allPieces.size,
      heatmapData,
      displayName,
      hasData: todayTotalMinutes > 0 || entries.length > 0,
    }
  }, [entries, user, preferences])
}
