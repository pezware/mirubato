import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlanningAnalytics } from './usePlanningAnalytics'
import type { PlanOccurrence } from '@/api/planning'

// Mock the planning store selectors
vi.mock('@/stores/planningStore', () => ({
  useCompletedOccurrences: vi.fn(() => []),
  useDueTodayOccurrences: vi.fn(() => []),
  useUpcomingOccurrences: vi.fn(() => []),
  usePlanningStore: vi.fn(() => ({
    occurrences: [],
    plansMap: new Map(),
  })),
}))

describe('usePlanningAnalytics', () => {
  const now = new Date('2025-11-14T12:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(now)
  })

  describe('Adherence Metrics', () => {
    it('should calculate 100% adherence when all occurrences are completed', () => {
      const completedOccurrences: PlanOccurrence[] = [
        createMockOccurrence('occ1', 'completed', '2025-11-14T10:00:00Z'),
        createMockOccurrence('occ2', 'completed', '2025-11-14T11:00:00Z'),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: completedOccurrences,
          dueToday: [],
          upcoming: [],
          allOccurrences: completedOccurrences,
        })
      )

      expect(result.current.adherence.overall).toBe(100)
    })

    it('should calculate 50% adherence when half are completed', () => {
      const completed: PlanOccurrence[] = [
        createMockOccurrence('occ1', 'completed', '2025-11-14T10:00:00Z'),
      ]
      const dueToday: PlanOccurrence[] = [
        createMockOccurrence('occ2', 'scheduled', '2025-11-14T14:00:00Z'),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed,
          dueToday,
          upcoming: [],
          allOccurrences: [...completed, ...dueToday],
        })
      )

      expect(result.current.adherence.overall).toBe(50)
    })

    it('should calculate 0% adherence when nothing is completed', () => {
      const dueToday: PlanOccurrence[] = [
        createMockOccurrence('occ1', 'scheduled', '2025-11-14T14:00:00Z'),
        createMockOccurrence('occ2', 'scheduled', '2025-11-14T15:00:00Z'),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: [],
          dueToday,
          upcoming: [],
          allOccurrences: dueToday,
        })
      )

      expect(result.current.adherence.overall).toBe(0)
    })

    it('should handle empty data gracefully', () => {
      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: [],
          dueToday: [],
          upcoming: [],
          allOccurrences: [],
        })
      )

      expect(result.current.adherence.overall).toBe(0)
      expect(result.current.adherence.thisWeek).toBe(0)
      expect(result.current.adherence.thisMonth).toBe(0)
    })
  })

  describe('Streak Metrics', () => {
    it('should calculate current streak for consecutive days', () => {
      const completed: PlanOccurrence[] = [
        createMockOccurrence('occ1', 'completed', '2025-11-14T10:00:00Z'), // Today
        createMockOccurrence('occ2', 'completed', '2025-11-13T10:00:00Z'), // Yesterday
        createMockOccurrence('occ3', 'completed', '2025-11-12T10:00:00Z'), // 2 days ago
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed,
          dueToday: [],
          upcoming: [],
          allOccurrences: completed,
        })
      )

      expect(result.current.streak.currentStreak).toBe(3)
    })

    it('should stop streak count at first gap', () => {
      const completed: PlanOccurrence[] = [
        createMockOccurrence('occ1', 'completed', '2025-11-14T10:00:00Z'), // Today
        createMockOccurrence('occ2', 'completed', '2025-11-13T10:00:00Z'), // Yesterday
        // Gap on Nov 12
        createMockOccurrence('occ3', 'completed', '2025-11-11T10:00:00Z'), // 3 days ago
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed,
          dueToday: [],
          upcoming: [],
          allOccurrences: completed,
        })
      )

      expect(result.current.streak.currentStreak).toBe(2)
    })

    it('should calculate streak starting from yesterday if no practice today', () => {
      const completed: PlanOccurrence[] = [
        createMockOccurrence('occ1', 'completed', '2025-11-13T10:00:00Z'), // Yesterday
        createMockOccurrence('occ2', 'completed', '2025-11-12T10:00:00Z'), // 2 days ago
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed,
          dueToday: [],
          upcoming: [],
          allOccurrences: completed,
        })
      )

      expect(result.current.streak.currentStreak).toBe(2)
    })

    it('should calculate longest streak correctly', () => {
      const completed: PlanOccurrence[] = [
        createMockOccurrence('occ1', 'completed', '2025-11-14T10:00:00Z'), // Current streak: 1 day
        // Gap
        createMockOccurrence('occ2', 'completed', '2025-11-11T10:00:00Z'), // Longest streak: 3 days
        createMockOccurrence('occ3', 'completed', '2025-11-10T10:00:00Z'),
        createMockOccurrence('occ4', 'completed', '2025-11-09T10:00:00Z'),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed,
          dueToday: [],
          upcoming: [],
          allOccurrences: completed,
        })
      )

      expect(result.current.streak.currentStreak).toBe(1)
      expect(result.current.streak.longestStreak).toBe(3)
    })
  })

  describe('Missed Occurrences', () => {
    it('should count overdue occurrences', () => {
      const overdue: PlanOccurrence[] = [
        createMockOccurrence(
          'occ1',
          'scheduled',
          '2025-11-13T10:00:00Z',
          '2025-11-13T11:00:00Z'
        ), // Past scheduledEnd
        createMockOccurrence(
          'occ2',
          'scheduled',
          '2025-11-12T10:00:00Z',
          '2025-11-12T11:00:00Z'
        ),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: [],
          dueToday: [],
          upcoming: [],
          allOccurrences: overdue,
        })
      )

      expect(result.current.missed.overdueCount).toBe(2)
    })

    it('should not count completed occurrences as overdue', () => {
      const occurrences: PlanOccurrence[] = [
        createMockOccurrence(
          'occ1',
          'completed',
          '2025-11-13T10:00:00Z',
          '2025-11-13T11:00:00Z'
        ),
        createMockOccurrence(
          'occ2',
          'scheduled',
          '2025-11-12T10:00:00Z',
          '2025-11-12T11:00:00Z'
        ),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: [occurrences[0]],
          dueToday: [],
          upcoming: [],
          allOccurrences: occurrences,
        })
      )

      expect(result.current.missed.overdueCount).toBe(1)
    })

    it('should calculate missed this week and this month', () => {
      const occurrences: PlanOccurrence[] = [
        // Missed this week
        createMockOccurrence(
          'occ1',
          'scheduled',
          '2025-11-13T10:00:00Z',
          '2025-11-13T11:00:00Z'
        ),
        // Missed this month but not this week
        createMockOccurrence(
          'occ2',
          'scheduled',
          '2025-11-01T10:00:00Z',
          '2025-11-01T11:00:00Z'
        ),
        // Missed last month
        createMockOccurrence(
          'occ3',
          'scheduled',
          '2025-10-15T10:00:00Z',
          '2025-10-15T11:00:00Z'
        ),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: [],
          dueToday: [],
          upcoming: [],
          allOccurrences: occurrences,
        })
      )

      expect(result.current.missed.missedThisWeek).toBe(1)
      expect(result.current.missed.missedThisMonth).toBe(2)
    })
  })

  describe('Workload Forecast', () => {
    it('should forecast 7 days of upcoming occurrences', () => {
      const upcoming: PlanOccurrence[] = [
        createMockOccurrenceWithDuration('occ1', '2025-11-15T10:00:00Z', 30),
        createMockOccurrenceWithDuration('occ2', '2025-11-15T14:00:00Z', 45),
        createMockOccurrenceWithDuration('occ3', '2025-11-16T10:00:00Z', 60),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: [],
          dueToday: [],
          upcoming,
          allOccurrences: upcoming,
        })
      )

      expect(result.current.forecast.days).toHaveLength(7)
      expect(result.current.forecast.days[0].date).toBe('2025-11-15')
      expect(result.current.forecast.days[0].count).toBe(2)
      expect(result.current.forecast.days[0].totalMinutes).toBe(75)
      expect(result.current.forecast.days[1].count).toBe(1)
      expect(result.current.forecast.days[1].totalMinutes).toBe(60)
    })

    it('should identify peak day correctly', () => {
      const upcoming: PlanOccurrence[] = [
        createMockOccurrenceWithDuration('occ1', '2025-11-15T10:00:00Z', 30),
        createMockOccurrenceWithDuration('occ2', '2025-11-16T10:00:00Z', 45),
        createMockOccurrenceWithDuration('occ3', '2025-11-16T14:00:00Z', 45),
        createMockOccurrenceWithDuration('occ4', '2025-11-16T18:00:00Z', 30),
      ]

      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: [],
          dueToday: [],
          upcoming,
          allOccurrences: upcoming,
        })
      )

      expect(result.current.forecast.peakDay).toEqual({
        date: '2025-11-16',
        count: 3,
      })
    })

    it('should handle empty forecast gracefully', () => {
      const { result } = renderHook(() =>
        usePlanningAnalytics({
          completed: [],
          dueToday: [],
          upcoming: [],
          allOccurrences: [],
        })
      )

      expect(result.current.forecast.days).toHaveLength(7)
      expect(result.current.forecast.totalOccurrences).toBe(0)
      expect(result.current.forecast.totalMinutes).toBe(0)
      expect(result.current.forecast.peakDay).toBeNull()
    })
  })
})

// Test helpers
function createMockOccurrence(
  id: string,
  status: 'scheduled' | 'completed',
  scheduledStart: string,
  scheduledEnd?: string
): PlanOccurrence {
  return {
    id,
    planId: 'plan1',
    scheduledStart,
    scheduledEnd: scheduledEnd || scheduledStart,
    flexWindow: null,
    recurrenceKey: null,
    segments: [],
    targets: {},
    reflectionPrompts: [],
    status,
    logEntryId: status === 'completed' ? 'log1' : null,
    checkIn: undefined,
    notes: null,
    reminderState: undefined,
    metrics: {},
    createdAt: scheduledStart,
    updatedAt: scheduledStart,
    deletedAt: null,
  }
}

function createMockOccurrenceWithDuration(
  id: string,
  scheduledStart: string,
  durationMinutes: number
): PlanOccurrence {
  return {
    id,
    planId: 'plan1',
    scheduledStart,
    scheduledEnd: new Date(
      new Date(scheduledStart).getTime() + durationMinutes * 60000
    ).toISOString(),
    flexWindow: null,
    recurrenceKey: null,
    segments: [
      {
        id: `${id}_segment1`,
        label: 'Practice',
        durationMinutes,
      },
    ],
    targets: {},
    reflectionPrompts: [],
    status: 'scheduled',
    logEntryId: null,
    checkIn: undefined,
    notes: null,
    reminderState: undefined,
    metrics: {},
    createdAt: scheduledStart,
    updatedAt: scheduledStart,
    deletedAt: null,
  }
}
