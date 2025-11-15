import { useMemo } from 'react'
import type { PlanOccurrence } from '@/api/planning'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  startOfDay,
} from 'date-fns'

export interface AdherenceMetrics {
  overall: number // % of all occurrences completed
  thisWeek: number // % of this week's occurrences completed
  thisMonth: number // % of this month's occurrences completed
}

export interface StreakMetrics {
  currentStreak: number // Consecutive days with completed occurrences
  longestStreak: number // Longest streak ever
  lastCompletedDate: string | null // Last completion timestamp
}

export interface MissedMetrics {
  overdueCount: number // Occurrences past scheduledEnd but not completed
  missedThisWeek: number // Missed in the past 7 days
  missedThisMonth: number // Missed in the past 30 days
}

export interface WorkloadForecast {
  days: Array<{
    date: string // YYYY-MM-DD
    count: number // Number of occurrences scheduled
    totalMinutes: number // Sum of durationMinutes
    occurrenceIds: string[] // For drill-down
  }>
  totalOccurrences: number
  totalMinutes: number
  peakDay: { date: string; count: number } | null
}

export interface PlanningAnalyticsData {
  adherence: AdherenceMetrics
  streak: StreakMetrics
  missed: MissedMetrics
  forecast: WorkloadForecast
}

interface UsePlanningAnalyticsProps {
  completed: PlanOccurrence[]
  dueToday: PlanOccurrence[]
  upcoming: PlanOccurrence[]
  allOccurrences: PlanOccurrence[]
}

export function usePlanningAnalytics({
  completed,
  dueToday,
  upcoming,
  allOccurrences,
}: UsePlanningAnalyticsProps): PlanningAnalyticsData {
  // Calculate adherence metrics
  const adherence = useMemo<AdherenceMetrics>(() => {
    return calculateAdherenceMetrics(completed, dueToday, allOccurrences)
  }, [completed, dueToday, allOccurrences])

  // Calculate streak metrics
  const streak = useMemo<StreakMetrics>(() => {
    return calculateStreakMetrics(completed)
  }, [completed])

  // Calculate missed occurrences
  const missed = useMemo<MissedMetrics>(() => {
    return calculateMissedMetrics(allOccurrences, completed)
  }, [allOccurrences, completed])

  // Calculate 7-day forecast
  const forecast = useMemo<WorkloadForecast>(() => {
    return calculateWorkloadForecast(upcoming)
  }, [upcoming])

  return {
    adherence,
    streak,
    missed,
    forecast,
  }
}

// Helper: Calculate adherence percentages
function calculateAdherenceMetrics(
  completed: PlanOccurrence[],
  dueToday: PlanOccurrence[],
  allOccurrences: PlanOccurrence[]
): AdherenceMetrics {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }) // Sunday
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Overall adherence: completed / (completed + due + overdue)
  const overdueOccurrences = allOccurrences.filter(occ => {
    if (occ.status !== 'scheduled') return false
    const end = occ.scheduledEnd ? new Date(occ.scheduledEnd) : null
    return end && end < now
  })

  const totalDueOrCompleted =
    completed.length + dueToday.length + overdueOccurrences.length
  const overall =
    totalDueOrCompleted > 0 ? (completed.length / totalDueOrCompleted) * 100 : 0

  // This week's adherence
  const weekCompleted = completed.filter(occ => {
    const start = occ.scheduledStart ? new Date(occ.scheduledStart) : null
    return start && start >= weekStart && start <= weekEnd
  })

  const weekDue = allOccurrences.filter(occ => {
    const start = occ.scheduledStart ? new Date(occ.scheduledStart) : null
    return (
      start &&
      start >= weekStart &&
      start <= weekEnd &&
      (occ.status === 'scheduled' || occ.status === 'completed')
    )
  })

  const thisWeek =
    weekDue.length > 0 ? (weekCompleted.length / weekDue.length) * 100 : 0

  // This month's adherence
  const monthCompleted = completed.filter(occ => {
    const start = occ.scheduledStart ? new Date(occ.scheduledStart) : null
    return start && start >= monthStart && start <= monthEnd
  })

  const monthDue = allOccurrences.filter(occ => {
    const start = occ.scheduledStart ? new Date(occ.scheduledStart) : null
    return (
      start &&
      start >= monthStart &&
      start <= monthEnd &&
      (occ.status === 'scheduled' || occ.status === 'completed')
    )
  })

  const thisMonth =
    monthDue.length > 0 ? (monthCompleted.length / monthDue.length) * 100 : 0

  return {
    overall: Math.round(overall),
    thisWeek: Math.round(thisWeek),
    thisMonth: Math.round(thisMonth),
  }
}

// Helper: Calculate streak metrics
function calculateStreakMetrics(completed: PlanOccurrence[]): StreakMetrics {
  if (completed.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
    }
  }

  // Group completions by day
  const completionDates = new Set<string>()
  let lastCompletedDate: string | null = null

  completed.forEach(occ => {
    if (occ.scheduledStart) {
      const dateStr = format(new Date(occ.scheduledStart), 'yyyy-MM-dd')
      completionDates.add(dateStr)

      if (
        !lastCompletedDate ||
        new Date(occ.scheduledStart) > new Date(lastCompletedDate)
      ) {
        lastCompletedDate = occ.scheduledStart
      }
    }
  })

  const sortedDates = Array.from(completionDates).sort((a, b) =>
    b.localeCompare(a)
  ) // Descending

  // Calculate current streak
  const today = startOfDay(new Date())
  const todayStr = format(today, 'yyyy-MM-dd')
  const yesterdayStr = format(addDays(today, -1), 'yyyy-MM-dd')

  let currentStreak = 0
  let checkDate = completionDates.has(todayStr)
    ? today
    : completionDates.has(yesterdayStr)
      ? addDays(today, -1)
      : null

  if (checkDate) {
    for (const dateStr of sortedDates) {
      const expectedStr = format(checkDate, 'yyyy-MM-dd')
      if (dateStr === expectedStr) {
        currentStreak++
        checkDate = addDays(checkDate, -1)
      } else if (new Date(dateStr) < checkDate) {
        // Gap found
        break
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 0
  let prevDate: Date | null = null

  // Sort dates ascending for longest streak calculation
  const ascendingDates = [...sortedDates].reverse()

  ascendingDates.forEach(dateStr => {
    const date = new Date(dateStr)

    if (prevDate === null) {
      tempStreak = 1
    } else {
      const dayDiff = Math.round(
        (date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (dayDiff === 1) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }

    prevDate = date
  })

  longestStreak = Math.max(longestStreak, tempStreak)

  return {
    currentStreak,
    longestStreak,
    lastCompletedDate,
  }
}

// Helper: Calculate missed occurrences
function calculateMissedMetrics(
  allOccurrences: PlanOccurrence[],
  completed: PlanOccurrence[]
): MissedMetrics {
  const now = new Date()
  const weekAgo = addDays(now, -7)
  const monthAgo = addDays(now, -30)

  const completedIds = new Set(completed.map(occ => occ.id))

  const overdueOccurrences = allOccurrences.filter(occ => {
    if (occ.status !== 'scheduled') return false
    if (completedIds.has(occ.id)) return false

    const end = occ.scheduledEnd ? new Date(occ.scheduledEnd) : null
    return end && end < now
  })

  const overdueCount = overdueOccurrences.length

  const missedThisWeek = overdueOccurrences.filter(occ => {
    const end = occ.scheduledEnd ? new Date(occ.scheduledEnd) : null
    return end && end >= weekAgo
  }).length

  const missedThisMonth = overdueOccurrences.filter(occ => {
    const end = occ.scheduledEnd ? new Date(occ.scheduledEnd) : null
    return end && end >= monthAgo
  }).length

  return {
    overdueCount,
    missedThisWeek,
    missedThisMonth,
  }
}

// Helper: Calculate 7-day workload forecast
function calculateWorkloadForecast(
  upcoming: PlanOccurrence[]
): WorkloadForecast {
  const now = new Date()
  const tomorrow = addDays(startOfDay(now), 1)
  const forecastDays: WorkloadForecast['days'] = []
  const dayMap = new Map<
    string,
    { count: number; totalMinutes: number; occurrenceIds: string[] }
  >()

  // Initialize 7 days starting from tomorrow
  for (let i = 0; i < 7; i++) {
    const date = addDays(tomorrow, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    dayMap.set(dateStr, { count: 0, totalMinutes: 0, occurrenceIds: [] })
  }

  // Filter to next 7 days (starting from tomorrow) and group
  const sevenDaysFromTomorrow = addDays(tomorrow, 7)

  upcoming.forEach(occ => {
    if (!occ.scheduledStart) return

    const start = new Date(occ.scheduledStart)
    if (start >= tomorrow && start < sevenDaysFromTomorrow) {
      const dateStr = format(start, 'yyyy-MM-dd')
      const dayData = dayMap.get(dateStr)

      if (dayData) {
        dayData.count++
        dayData.occurrenceIds.push(occ.id)

        // Calculate duration from segments
        const duration =
          occ.segments?.reduce(
            (sum, seg) => sum + (seg.durationMinutes || 0),
            0
          ) || 0
        dayData.totalMinutes += duration
      }
    }
  })

  // Convert to array
  dayMap.forEach((data, date) => {
    forecastDays.push({
      date,
      ...data,
    })
  })

  // Sort by date
  forecastDays.sort((a, b) => a.date.localeCompare(b.date))

  // Calculate totals
  const totalOccurrences = forecastDays.reduce((sum, day) => sum + day.count, 0)
  const totalMinutes = forecastDays.reduce(
    (sum, day) => sum + day.totalMinutes,
    0
  )

  // Find peak day
  const peakDay =
    forecastDays.length > 0
      ? forecastDays.reduce((peak, day) =>
          day.count > (peak?.count || 0) ? day : peak
        )
      : null

  return {
    days: forecastDays,
    totalOccurrences,
    totalMinutes,
    peakDay:
      peakDay && peakDay.count > 0
        ? { date: peakDay.date, count: peakDay.count }
        : null,
  }
}
