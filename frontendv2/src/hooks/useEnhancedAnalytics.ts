import { useMemo } from 'react'
import { LogbookEntry } from '../api/logbook'
import {
  FilterCriteria,
  GroupingConfig,
  SortConfig,
  GroupedData,
  EnhancedAnalyticsData,
  TimeSeriesData,
  DistributionData,
  ComparativeData,
} from '../types/reporting'
import { reportsCache } from '../utils/reportsCacheManager'

interface UseEnhancedAnalyticsProps {
  entries: LogbookEntry[]
  filters: FilterCriteria[]
  groupBy?: GroupingConfig[]
  sortBy?: SortConfig[]
  entriesHash: string
}

export function useEnhancedAnalytics({
  entries,
  filters,
  groupBy,
  sortBy,
  entriesHash,
}: UseEnhancedAnalyticsProps): EnhancedAnalyticsData {
  return useMemo<EnhancedAnalyticsData>(() => {
    // Create cache key from filters, grouping, and sorting
    const cacheKey = JSON.stringify({ filters, groupBy, sortBy, entriesHash })

    // Check cache first
    const cached = reportsCache.get(cacheKey) as EnhancedAnalyticsData | null
    if (cached) return cached

    // Apply filters to entries
    const filteredEntries = applyFilters(entries, filters)

    // Calculate base analytics
    const baseAnalytics = calculateBaseAnalytics(filteredEntries)

    // Apply grouping if specified
    const groupedData = groupBy?.length
      ? applyGrouping(filteredEntries, groupBy)
      : undefined

    // Calculate time series data
    const timeSeriesData = calculateTimeSeriesData(filteredEntries)

    // Calculate distribution data
    const distributionData = calculateDistributionData(filteredEntries)

    // Calculate comparative data
    const comparativeData = calculateComparativeData(filteredEntries, entries)

    const result: EnhancedAnalyticsData = {
      ...baseAnalytics,
      groupedData,
      timeSeriesData,
      distributionData,
      comparativeData,
    }

    // Cache the result
    reportsCache.set(cacheKey, result)

    return result
  }, [entries, filters, groupBy, sortBy, entriesHash])
}

// Filter application logic
function applyFilters(
  entries: LogbookEntry[],
  filters: FilterCriteria[]
): LogbookEntry[] {
  if (!filters.length) return entries

  return entries.filter(entry => {
    let result = true
    let previousLogic: 'AND' | 'OR' = 'AND'

    for (const filter of filters) {
      const matches = evaluateFilter(entry, filter)

      if (previousLogic === 'AND') {
        result = result && matches
      } else {
        result = result || matches
      }

      previousLogic = filter.logic || 'AND'
    }

    return result
  })
}

function evaluateFilter(entry: LogbookEntry, filter: FilterCriteria): boolean {
  const { field, operator, value } = filter

  // Get the field value from the entry
  const fieldValue = getFieldValue(entry, field)

  // Apply the operator
  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'notEquals':
      return fieldValue !== value
    case 'contains':
      return String(fieldValue)
        .toLowerCase()
        .includes(String(value).toLowerCase())
    case 'notContains':
      return !String(fieldValue)
        .toLowerCase()
        .includes(String(value).toLowerCase())
    case 'startsWith':
      return String(fieldValue)
        .toLowerCase()
        .startsWith(String(value).toLowerCase())
    case 'endsWith':
      return String(fieldValue)
        .toLowerCase()
        .endsWith(String(value).toLowerCase())
    case 'between':
      if (
        field === 'date' &&
        value &&
        typeof value === 'object' &&
        'start' in value &&
        'end' in value
      ) {
        const date = new Date(entry.timestamp)
        return date >= value.start && date <= value.end
      }
      return false
    case 'greaterThan':
      return Number(fieldValue) > Number(value)
    case 'lessThan':
      return Number(fieldValue) < Number(value)
    case 'greaterThanOrEqual':
      return Number(fieldValue) >= Number(value)
    case 'lessThanOrEqual':
      return Number(fieldValue) <= Number(value)
    case 'in':
      return Array.isArray(value) && value.includes(String(fieldValue))
    case 'notIn':
      return Array.isArray(value) && !value.includes(String(fieldValue))
    case 'isEmpty':
      return (
        !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)
      )
    case 'isNotEmpty':
      return (
        !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0)
      )
    default:
      return true
  }
}

function getFieldValue(
  entry: LogbookEntry,
  field: string
): Date | number | string | string[] | boolean | null | undefined {
  switch (field) {
    case 'date':
      return new Date(entry.timestamp)
    case 'duration':
      return entry.duration
    case 'piece':
      return entry.pieces.map(p => `${p.composer || 'Unknown'} - ${p.title}`)
    case 'composer':
      return entry.pieces.map(p => p.composer || 'Unknown')
    case 'instrument':
      return entry.instrument
    case 'type':
      return entry.type
    case 'mood':
      return entry.mood
    case 'techniques':
      return entry.techniques
    case 'scoreId':
      return entry.scoreId
    case 'autoTracked':
      return entry.autoTracked
    default:
      return null
  }
}

// Grouping logic
function applyGrouping(
  entries: LogbookEntry[],
  groupConfigs: GroupingConfig[]
): GroupedData[] {
  if (!groupConfigs.length) return []

  // Start with all entries as a single group
  let groups: GroupedData[] = [
    {
      key: 'all',
      label: 'All Entries',
      count: entries.length,
      totalDuration: entries.reduce((sum, e) => sum + e.duration, 0),
      avgDuration:
        entries.length > 0
          ? entries.reduce((sum, e) => sum + e.duration, 0) / entries.length
          : 0,
      entries,
      aggregates: calculateAggregates(entries),
    },
  ]

  // Apply each grouping level
  for (const config of groupConfigs) {
    groups = applyGroupingLevel(groups, config)
  }

  return groups[0].children || []
}

function applyGroupingLevel(
  groups: GroupedData[],
  config: GroupingConfig
): GroupedData[] {
  return groups.map(group => {
    const grouped = new Map<string, LogbookEntry[]>()

    // Group entries by the specified field
    for (const entry of group.entries) {
      const keys = getGroupKeys(entry, config.field)
      for (const key of keys) {
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        grouped.get(key)!.push(entry)
      }
    }

    // Create child groups
    const children: GroupedData[] = Array.from(grouped.entries()).map(
      ([key, entries]) => ({
        key,
        label: formatGroupLabel(key, config.field),
        count: entries.length,
        totalDuration: entries.reduce((sum, e) => sum + e.duration, 0),
        avgDuration:
          entries.length > 0
            ? entries.reduce((sum, e) => sum + e.duration, 0) / entries.length
            : 0,
        entries,
        aggregates: calculateAggregates(entries),
      })
    )

    // Sort children
    children.sort((a, b) => {
      const multiplier = config.order === 'asc' ? 1 : -1
      return multiplier * (a.totalDuration - b.totalDuration)
    })

    return {
      ...group,
      children,
    }
  })
}

function getGroupKeys(entry: LogbookEntry, field: string): string[] {
  switch (field) {
    case 'date:day':
      return [new Date(entry.timestamp).toDateString()]
    case 'date:week':
      return [getWeekKey(new Date(entry.timestamp))]
    case 'date:month':
      return [getMonthKey(new Date(entry.timestamp))]
    case 'date:year':
      return [new Date(entry.timestamp).getFullYear().toString()]
    case 'piece':
      return entry.pieces.map(p => `${p.composer || 'Unknown'} - ${p.title}`)
    case 'composer':
      return [...new Set(entry.pieces.map(p => p.composer || 'Unknown'))]
    case 'instrument':
      return [entry.instrument]
    case 'type':
      return [entry.type]
    case 'mood':
      return [entry.mood || 'No mood']
    case 'duration:range':
      return [getDurationRange(entry.duration)]
    default:
      return ['Unknown']
  }
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const week = getWeekNumber(date)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return `${year}-${month.toString().padStart(2, '0')}`
}

function getWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )
  return weekNumber
}

function getDurationRange(minutes: number): string {
  if (minutes < 15) return '0-15 min'
  if (minutes < 30) return '15-30 min'
  if (minutes < 60) return '30-60 min'
  if (minutes < 120) return '1-2 hours'
  return '2+ hours'
}

function formatGroupLabel(key: string, field: string): string {
  if (field.startsWith('date:')) {
    const date = new Date(key)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString()
    }
  }
  return key
}

function calculateAggregates(entries: LogbookEntry[]) {
  const pieces = new Set<string>()
  const composers = new Set<string>()
  const techniques = new Set<string>()
  const moodDistribution: Record<string, number> = {}

  for (const entry of entries) {
    for (const piece of entry.pieces) {
      pieces.add(`${piece.composer || 'Unknown'} - ${piece.title}`)
      composers.add(piece.composer || 'Unknown')
    }
    for (const technique of entry.techniques) {
      techniques.add(technique)
    }
    if (entry.mood) {
      moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1
    }
  }

  return {
    uniquePieces: pieces.size,
    uniqueComposers: composers.size,
    techniques: Array.from(techniques),
    moodDistribution,
  }
}

// Calculate base analytics (similar to original usePracticeAnalytics)
function calculateBaseAnalytics(entries: LogbookEntry[]) {
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

  const practiceDates = new Set<string>()

  entries.forEach(entry => {
    const entryDate = new Date(entry.timestamp)
    const dateStr = entryDate.toDateString()

    practiceDates.add(dateStr)
    practiceByDay.set(
      dateStr,
      (practiceByDay.get(dateStr) || 0) + entry.duration
    )

    if (dateStr === today.toDateString()) {
      todayTotal += entry.duration
      todayCount++
    }

    if (entryDate >= weekStart) {
      weekTotal += entry.duration
      weekCount++
    }

    const durationPerPiece =
      entry.pieces.length > 0
        ? entry.duration / entry.pieces.length
        : entry.duration

    entry.pieces.forEach(piece => {
      const composer = piece.composer || 'Unknown'
      const pieceKey = `${composer} - ${piece.title}`

      composers.add(composer)
      pieces.add(pieceKey)

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

  if (sortedDates.length > 0 && sortedDates[0] === today.toDateString()) {
    currentStreak = 1
    const checkDate = new Date(today)

    for (let i = 1; i < sortedDates.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1)
      if (sortedDates[i] === checkDate.toDateString()) {
        currentStreak++
      } else {
        break
      }
    }
  }

  return {
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
}

// Calculate time series data for charts
function calculateTimeSeriesData(entries: LogbookEntry[]): TimeSeriesData[] {
  const dailyData = new Map<string, number>()

  entries.forEach(entry => {
    const date = new Date(entry.timestamp).toISOString().split('T')[0]
    dailyData.set(date, (dailyData.get(date) || 0) + entry.duration)
  })

  return Array.from(dailyData.entries())
    .map(([date, value]) => ({
      date,
      value,
      label: new Date(date).toLocaleDateString(),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Calculate distribution data for pie charts
function calculateDistributionData(
  entries: LogbookEntry[]
): DistributionData[] {
  const distribution = new Map<string, number>()
  const total = entries.reduce((sum, e) => sum + e.duration, 0)

  // Group by instrument
  entries.forEach(entry => {
    distribution.set(
      entry.instrument,
      (distribution.get(entry.instrument) || 0) + entry.duration
    )
  })

  return Array.from(distribution.entries()).map(([category, value]) => ({
    category,
    value,
    percentage: total > 0 ? (value / total) * 100 : 0,
  }))
}

// Calculate comparative data
function calculateComparativeData(
  filteredEntries: LogbookEntry[],
  allEntries: LogbookEntry[]
): ComparativeData[] {
  const current = filteredEntries.reduce((sum, e) => sum + e.duration, 0)
  const total = allEntries.reduce((sum, e) => sum + e.duration, 0)

  return [
    {
      category: 'Filtered Practice Time',
      current,
      previous: total - current,
      change: current - (total - current),
      changePercent: total > 0 ? (current / total) * 100 : 0,
    },
  ]
}
