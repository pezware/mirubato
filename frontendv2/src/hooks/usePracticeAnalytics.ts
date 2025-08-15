import { useMemo } from 'react'
import { LogbookEntry } from '../api/logbook'
import { reportsCache } from '../utils/reportsCacheManager'

export interface AnalyticsData {
  todayTotal: number
  todayCount: number
  weekTotal: number
  weekCount: number
  currentStreak: number
  practiceByDay: Map<string, number>
  uniqueComposers: number
  uniquePieces: number
  pieceStats: Map<
    string,
    {
      count: number
      totalDuration: number
      lastPracticed: string
      techniques: Set<string>
    }
  >
}

interface UsePracticeAnalyticsProps {
  entries: LogbookEntry[]
  sortBy: string
  selectedDate: string | null
  selectedPiece: string | null
  selectedComposer: string | null
  entriesHash: string
}

export function usePracticeAnalytics({
  entries,
  sortBy,
  selectedDate,
  selectedPiece,
  selectedComposer,
  entriesHash,
}: UsePracticeAnalyticsProps): AnalyticsData {
  return useMemo<AnalyticsData>(() => {
    // Check cache first
    const cached = reportsCache.getAnalytics(
      sortBy,
      selectedDate,
      selectedPiece || selectedComposer,
      entriesHash
    ) as AnalyticsData | null
    if (cached) return cached

    // Calculate analytics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    let todayTotal = 0
    let todayCount = 0
    let weekTotal = 0
    let weekCount = 0

    const practiceByDay = new Map<string, number>()
    const composers = new Set<string>()
    const pieces = new Set<string>()
    const pieceStats = new Map<
      string,
      {
        count: number
        totalDuration: number
        lastPracticed: string
        techniques: Set<string>
      }
    >()

    // Calculate current streak
    const practiceDates = new Set<string>()

    entries.forEach(entry => {
      const entryDate = new Date(entry.timestamp)
      const dateStr = entryDate.toDateString()

      // Track practice days
      practiceDates.add(dateStr)
      practiceByDay.set(
        dateStr,
        (practiceByDay.get(dateStr) || 0) + entry.duration
      )

      // Today's stats
      if (dateStr === today.toDateString()) {
        todayTotal += entry.duration
        todayCount++
      }

      // This week's stats
      if (entryDate >= weekStart) {
        weekTotal += entry.duration
        weekCount++
      }

      // Track composers and pieces
      // Divide duration equally among pieces in the same entry
      const durationPerPiece =
        entry.pieces.length > 0
          ? entry.duration / entry.pieces.length
          : entry.duration

      entry.pieces.forEach(piece => {
        const composer = piece.composer || 'Unknown'
        const pieceKey = `${composer} - ${piece.title}`

        composers.add(composer)
        pieces.add(pieceKey)

        // Update piece stats
        const existing = pieceStats.get(pieceKey) || {
          count: 0,
          totalDuration: 0,
          lastPracticed: entry.timestamp,
          techniques: new Set(),
        }

        existing.count++
        existing.totalDuration += durationPerPiece
        if (new Date(entry.timestamp) > new Date(existing.lastPracticed)) {
          existing.lastPracticed = entry.timestamp
        }
        entry.techniques.forEach(t => existing.techniques.add(t))

        pieceStats.set(pieceKey, existing)
      })
    })

    // Calculate streak
    let currentStreak = 0
    const sortedDates = Array.from(practiceDates).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )

    if (sortedDates.length > 0) {
      // Check if today has practice
      const todayHasPractice = practiceDates.has(today.toDateString())
      const streakStartDate = new Date(today)

      if (!todayHasPractice) {
        // If no practice today, start counting from yesterday
        streakStartDate.setDate(streakStartDate.getDate() - 1)
      }

      // Count consecutive days from the start date
      const checkDate = new Date(streakStartDate)

      for (const sortedDate of sortedDates) {
        if (sortedDate === checkDate.toDateString()) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (new Date(sortedDate) < checkDate) {
          // Gap found, stop counting
          break
        }
      }
    }

    const result: AnalyticsData = {
      todayTotal,
      todayCount,
      weekTotal,
      weekCount,
      currentStreak,
      practiceByDay,
      uniqueComposers: composers.size,
      uniquePieces: pieces.size,
      pieceStats,
    }

    // Cache the result
    reportsCache.setAnalytics(
      sortBy,
      selectedDate,
      selectedPiece || selectedComposer,
      entriesHash,
      result
    )

    return result
  }, [
    entries,
    sortBy,
    selectedDate,
    selectedPiece,
    selectedComposer,
    entriesHash,
  ])
}
