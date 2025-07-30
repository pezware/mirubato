import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePracticeAnalytics } from '../../../hooks/usePracticeAnalytics'
import { LogbookEntry } from '../../../api/logbook'

// Mock the reports cache manager
vi.mock('../../../utils/reportsCacheManager', () => ({
  reportsCache: {
    getAnalytics: vi.fn().mockReturnValue(null),
    setAnalytics: vi.fn(),
  },
}))

describe('usePracticeAnalytics - Streak Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock the current date to a fixed date for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T10:00:00Z')) // Friday, March 15, 2024
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockEntry = (
    id: string,
    timestamp: string,
    duration: number = 30
  ): LogbookEntry => ({
    id,
    timestamp,
    duration,
    pieces: [{ title: 'Test Piece', composer: 'Test Composer' }],
    techniques: [],
    instrument: 'piano',
    type: 'repertoire',
    tags: [],
    userId: 'user-1',
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  describe('Streak calculation with practice today', () => {
    it('should count streak including today when user practiced today', () => {
      const entries: LogbookEntry[] = [
        createMockEntry('1', '2024-03-15T09:00:00Z'), // Today
        createMockEntry('2', '2024-03-14T09:00:00Z'), // Yesterday
        createMockEntry('3', '2024-03-13T09:00:00Z'), // Day before yesterday
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(3)
    })

    it('should count streak including today with gaps in older days', () => {
      const entries: LogbookEntry[] = [
        createMockEntry('1', '2024-03-15T09:00:00Z'), // Today
        createMockEntry('2', '2024-03-14T09:00:00Z'), // Yesterday
        // Gap on March 13th
        createMockEntry('3', '2024-03-12T09:00:00Z'), // March 12th (should not be counted)
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(2) // Only today and yesterday
    })
  })

  describe('Streak calculation without practice today', () => {
    it('should count streak up to yesterday when no practice today', () => {
      const entries: LogbookEntry[] = [
        // No entry for today (March 15th)
        createMockEntry('1', '2024-03-14T09:00:00Z'), // Yesterday
        createMockEntry('2', '2024-03-13T09:00:00Z'), // Day before yesterday
        createMockEntry('3', '2024-03-12T09:00:00Z'), // March 12th
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(3) // Yesterday and two days before
    })

    it('should return 0 when no practice today and gap yesterday', () => {
      const entries: LogbookEntry[] = [
        // No entry for today (March 15th)
        // No entry for yesterday (March 14th)
        createMockEntry('1', '2024-03-13T09:00:00Z'), // Day before yesterday
        createMockEntry('2', '2024-03-12T09:00:00Z'), // March 12th
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(0)
    })

    it('should maintain streak when no practice today but consecutive days before', () => {
      const entries: LogbookEntry[] = [
        // No entry for today (March 15th)
        createMockEntry('1', '2024-03-14T09:00:00Z'), // Yesterday
        createMockEntry('2', '2024-03-13T09:00:00Z'), // Day before yesterday
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(2) // Yesterday and day before, but not broken
    })
  })

  describe('Edge cases', () => {
    it('should return 0 streak when no entries exist', () => {
      const entries: LogbookEntry[] = []

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(0)
    })

    it('should handle single day practice (today only)', () => {
      const entries: LogbookEntry[] = [
        createMockEntry('1', '2024-03-15T09:00:00Z'), // Today only
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(1)
    })

    it('should handle single day practice (yesterday only, no practice today)', () => {
      const entries: LogbookEntry[] = [
        createMockEntry('1', '2024-03-14T09:00:00Z'), // Yesterday only
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(1)
    })

    it('should handle multiple entries on the same day', () => {
      const entries: LogbookEntry[] = [
        createMockEntry('1', '2024-03-15T09:00:00Z'), // Today - entry 1
        createMockEntry('2', '2024-03-15T14:00:00Z'), // Today - entry 2
        createMockEntry('3', '2024-03-14T09:00:00Z'), // Yesterday
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(2) // Today (counted once) and yesterday
    })
  })

  describe('Long streak scenarios', () => {
    it('should correctly count a week-long streak including today', () => {
      const entries: LogbookEntry[] = [
        createMockEntry('1', '2024-03-15T09:00:00Z'), // Today (Friday)
        createMockEntry('2', '2024-03-14T09:00:00Z'), // Thursday
        createMockEntry('3', '2024-03-13T09:00:00Z'), // Wednesday
        createMockEntry('4', '2024-03-12T09:00:00Z'), // Tuesday
        createMockEntry('5', '2024-03-11T09:00:00Z'), // Monday
        createMockEntry('6', '2024-03-10T09:00:00Z'), // Sunday
        createMockEntry('7', '2024-03-09T09:00:00Z'), // Saturday
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(7)
    })

    it('should correctly count a week-long streak excluding today', () => {
      const entries: LogbookEntry[] = [
        // No entry for today (March 15th)
        createMockEntry('1', '2024-03-14T09:00:00Z'), // Thursday
        createMockEntry('2', '2024-03-13T09:00:00Z'), // Wednesday
        createMockEntry('3', '2024-03-12T09:00:00Z'), // Tuesday
        createMockEntry('4', '2024-03-11T09:00:00Z'), // Monday
        createMockEntry('5', '2024-03-10T09:00:00Z'), // Sunday
        createMockEntry('6', '2024-03-09T09:00:00Z'), // Saturday
        createMockEntry('7', '2024-03-08T09:00:00Z'), // Friday
      ]

      const { result } = renderHook(() =>
        usePracticeAnalytics({
          entries,
          sortBy: 'date',
          selectedDate: null,
          selectedPiece: null,
          selectedComposer: null,
          entriesHash: 'test-hash',
        })
      )

      expect(result.current.currentStreak).toBe(7) // All 7 consecutive days up to yesterday
    })
  })
})
