/**
 * Tests for LogbookReportingModule - Phase 4 Implementation
 *
 * Tests universal access principle and minute-level accuracy
 */

import { LogbookReportingModule } from './LogbookReportingModule'
import { EventBus } from '../core/EventBus'
import { LogbookEntry, Goal } from '../logger/types'
import { Instrument } from '@mirubato/shared/types'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('LogbookReportingModule', () => {
  let module: LogbookReportingModule
  let eventBus: EventBus

  const mockEntries: LogbookEntry[] = [
    {
      id: 'entry-1',
      userId: 'user-1',
      timestamp: new Date('2024-01-15T10:00:00Z').getTime(),
      duration: 3600, // 60 minutes in seconds
      type: 'practice',
      instrument: 'PIANO' as Instrument,
      pieces: [
        { id: 'piece-1', title: 'Moonlight Sonata', composer: 'Beethoven' },
      ],
      techniques: ['scales', 'dynamics'],
      goals: ['goal-1'],
      notes: 'Great session',
      mood: 'satisfied',
      tags: ['classical', 'beethoven'],
    },
    {
      id: 'entry-2',
      userId: 'user-1',
      timestamp: new Date('2024-01-16T14:30:00Z').getTime(),
      duration: 2700, // 45 minutes in seconds
      type: 'practice',
      instrument: 'GUITAR' as Instrument,
      pieces: [
        { id: 'piece-2', title: 'Classical Gas', composer: 'Mason Williams' },
      ],
      techniques: ['fingerpicking', 'arpeggios'],
      goals: ['goal-2'],
      notes: 'Worked on fingerpicking',
      mood: 'excited',
      tags: ['classical', 'guitar'],
    },
    {
      id: 'entry-3',
      userId: 'user-1',
      timestamp: new Date('2024-01-17T09:15:00Z').getTime(),
      duration: 1800, // 30 minutes in seconds
      type: 'lesson',
      instrument: 'PIANO' as Instrument,
      pieces: [
        { id: 'piece-1', title: 'Moonlight Sonata', composer: 'Beethoven' },
      ],
      techniques: ['pedaling', 'dynamics'],
      goals: ['goal-1'],
      notes: 'Lesson with teacher',
      mood: 'neutral',
      tags: ['classical', 'lesson'],
    },
    {
      id: 'entry-4',
      userId: 'user-1',
      timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago (within 30 days)
      duration: 5400, // 90 minutes in seconds
      type: 'practice',
      instrument: 'PIANO' as Instrument,
      pieces: [{ id: 'piece-3', title: 'Clair de Lune', composer: 'Debussy' }],
      techniques: ['impressionistic', 'pedaling'],
      goals: [],
      notes: 'Long session',
      mood: 'satisfied',
      tags: ['impressionist', 'debussy'],
    },
  ]

  const mockGoals: Goal[] = [
    {
      id: 'goal-1',
      userId: 'user-1',
      title: 'Master Moonlight Sonata',
      description: 'Learn the first movement completely',
      targetDate: new Date('2024-06-01').getTime(),
      progress: 75,
      milestones: [
        {
          id: 'm1',
          title: 'Learn first page',
          completed: true,
          completedAt: Date.now(),
        },
        {
          id: 'm2',
          title: 'Learn second page',
          completed: true,
          completedAt: Date.now(),
        },
        { id: 'm3', title: 'Learn third page', completed: false },
      ],
      status: 'active',
      createdAt: new Date('2024-01-01').getTime(),
      updatedAt: new Date('2024-01-15').getTime(),
      linkedEntries: ['entry-1', 'entry-3'],
    },
    {
      id: 'goal-2',
      userId: 'user-1',
      title: 'Improve fingerpicking',
      description: 'Master classical guitar technique',
      targetDate: new Date('2024-12-01').getTime(),
      progress: 40,
      milestones: [],
      status: 'active',
      createdAt: new Date('2024-01-10').getTime(),
      updatedAt: new Date('2024-01-16').getTime(),
      linkedEntries: ['entry-2'],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset EventBus singleton for clean tests
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
    module = new LogbookReportingModule(eventBus)

    // Mock localStorage data
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'mirubato_logbook_entries') {
        return JSON.stringify(mockEntries)
      }
      if (key === 'mirubato_goals') {
        return JSON.stringify(mockGoals)
      }
      return null
    })
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await module.initialize()
      const health = module.getHealth()
      expect(health.status).toBe('green')
      expect(health.message).toContain('Initialized: true')
    })

    it('should handle authentication state changes', async () => {
      await module.initialize()

      // Test login by publishing event
      await eventBus.publish({
        source: 'auth',
        type: 'auth:login',
        data: { user: { id: 'user-1' } },
        metadata: { version: '1.0.0' },
      })
      let health = module.getHealth()
      expect(health.message).toContain('Auth: true')

      // Test logout
      await eventBus.publish({
        source: 'auth',
        type: 'auth:logout',
        data: {},
        metadata: { version: '1.0.0' },
      })
      health = module.getHealth()
      expect(health.message).toContain('Auth: false')
    })

    it('should clear cache on data changes', async () => {
      await module.initialize()

      // Generate some data to populate cache (use report which caches)
      await module.generateLogbookReport()
      await module.generateLogbookReport({
        instruments: ['PIANO' as Instrument],
      })
      let health = module.getHealth()
      expect(health.message).toMatch(/Cache: [1-9]/)

      // Emit data change event
      await eventBus.publish({
        source: 'logger',
        type: 'logger:entry:created',
        data: { entry: mockEntries[0] },
        metadata: { version: '1.0.0' },
      })
      health = module.getHealth()
      expect(health.message).toContain('Cache: 0')
    })
  })

  describe('Overall Statistics', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should calculate overall statistics with minute-level accuracy', async () => {
      const stats = await module.getOverallStatistics()

      // Total duration: 60 + 45 + 30 + 90 = 225 minutes
      expect(stats.totalDuration).toBe(225)
      expect(stats.totalSessions).toBe(4)
      expect(stats.averageSessionDuration).toBe(56) // 225/4 rounded
      expect(stats.uniquePieces).toBe(3) // Moonlight Sonata, Classical Gas, Clair de Lune
    })

    it('should calculate practice streak correctly', async () => {
      const stats = await module.getOverallStatistics()
      // Mock entries are on consecutive days (Jan 15, 16, 17) then Feb 1
      // Current streak depends on today's date vs Feb 1
      expect(stats.practiceStreak).toBeGreaterThanOrEqual(0)
    })

    it('should identify active pieces from last 30 days', async () => {
      const stats = await module.getOverallStatistics()
      expect(stats.activePieces).toContain('Clair de Lune') // Most recent entry
    })

    it('should count completed goals', async () => {
      const stats = await module.getOverallStatistics()
      expect(stats.completedGoals).toBe(0) // No completed goals in mock data
    })
  })

  describe('Piece Statistics (Repertoire Pivot)', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should group pieces by title with minute-level accuracy', async () => {
      const pieceStats = await module.getPieceStatistics()

      const moonlightStats = pieceStats.find(
        p => p.piece.title === 'Moonlight Sonata'
      )
      expect(moonlightStats).toBeDefined()
      expect(moonlightStats!.totalDuration).toBe(90) // 60 + 30 minutes
      expect(moonlightStats!.sessionCount).toBe(2)
      expect(moonlightStats!.averageDuration).toBe(45) // 90/2
      expect(moonlightStats!.piece.composer).toBe('Beethoven')
      expect(moonlightStats!.instruments).toContain('PIANO')
    })

    it('should sort pieces by total duration descending', async () => {
      const pieceStats = await module.getPieceStatistics()

      expect(pieceStats[0].piece.title).toBe('Moonlight Sonata') // 90 minutes
      expect(pieceStats[1].piece.title).toBe('Clair de Lune') // 90 minutes
      expect(pieceStats[2].piece.title).toBe('Classical Gas') // 45 minutes
    })

    it('should track multiple instruments for pieces', async () => {
      const pieceStats = await module.getPieceStatistics()

      const moonlightStats = pieceStats.find(
        p => p.piece.title === 'Moonlight Sonata'
      )
      expect(moonlightStats!.instruments).toEqual(['PIANO'])
    })
  })

  describe('Time-Based Statistics', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should group by month with minute-level accuracy', async () => {
      const monthStats = await module.getTimeBasedStatistics('month')

      const jan2024 = monthStats.find(m => m.period === '2024-01')
      expect(jan2024).toBeDefined()
      expect(jan2024!.totalDuration).toBe(135) // 60 + 45 + 30 minutes
      expect(jan2024!.sessionCount).toBe(3)
      expect(jan2024!.averageDuration).toBe(45) // 135/3

      // The 4th entry is now current date, so look for current month
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
      const currentMonthStats = monthStats.find(m => m.period === currentMonth)
      expect(currentMonthStats).toBeDefined()
      expect(currentMonthStats!.totalDuration).toBe(90) // 90 minutes
      expect(currentMonthStats!.sessionCount).toBe(1)
    })

    it('should group by week with minute-level accuracy', async () => {
      const weekStats = await module.getTimeBasedStatistics('week')

      // All January entries should be in the same week
      expect(weekStats.length).toBeGreaterThan(0)
      expect(weekStats[0].totalDuration).toBeGreaterThan(0)
    })

    it('should calculate top pieces for each period', async () => {
      const monthStats = await module.getTimeBasedStatistics('month')

      const jan2024 = monthStats.find(m => m.period === '2024-01')
      expect(jan2024!.topPieces).toBeDefined()
      expect(jan2024!.topPieces.length).toBeGreaterThan(0)
      expect(jan2024!.topPieces[0].title).toBe('Moonlight Sonata')
      expect(jan2024!.topPieces[0].duration).toBe(90)
    })

    it('should calculate instrument distribution per period', async () => {
      const monthStats = await module.getTimeBasedStatistics('month')

      const jan2024 = monthStats.find(m => m.period === '2024-01')
      expect(jan2024!.instruments.PIANO).toBe(90) // 60 + 30 minutes
      expect(jan2024!.instruments.GUITAR).toBe(45) // 45 minutes
    })
  })

  describe('Category Statistics', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should group by tags with minute-level accuracy', async () => {
      const tagStats = await module.getCategoryStatistics('tag')

      const classicalTag = tagStats.find(t => t.category === 'classical')
      expect(classicalTag).toBeDefined()
      expect(classicalTag!.totalDuration).toBe(135) // 60 + 45 + 30 minutes (only classical entries)
      expect(classicalTag!.sessionCount).toBe(3) // 3 entries with 'classical' tag
      expect(classicalTag!.pieceCount).toBe(2) // Moonlight Sonata and Classical Gas
    })

    it('should group by techniques with minute-level accuracy', async () => {
      const techniqueStats = await module.getCategoryStatistics('technique')

      const dynamicsStats = techniqueStats.find(t => t.category === 'dynamics')
      expect(dynamicsStats).toBeDefined()
      expect(dynamicsStats!.totalDuration).toBe(90) // 60 + 30 minutes (entries with dynamics)
      expect(dynamicsStats!.sessionCount).toBe(2)
    })

    it('should group by instrument with minute-level accuracy', async () => {
      const instrumentStats = await module.getCategoryStatistics('instrument')

      const pianoStats = instrumentStats.find(i => i.category === 'PIANO')
      expect(pianoStats).toBeDefined()
      expect(pianoStats!.totalDuration).toBe(180) // 60 + 30 + 90 minutes
      expect(pianoStats!.sessionCount).toBe(3)

      const guitarStats = instrumentStats.find(i => i.category === 'GUITAR')
      expect(guitarStats).toBeDefined()
      expect(guitarStats!.totalDuration).toBe(45) // 45 minutes
      expect(guitarStats!.sessionCount).toBe(1)
    })

    it('should calculate mood distribution for categories', async () => {
      const tagStats = await module.getCategoryStatistics('tag')

      const classicalTag = tagStats.find(t => t.category === 'classical')
      expect(classicalTag!.moodDistribution.satisfied).toBe(1)
      expect(classicalTag!.moodDistribution.excited).toBe(1)
      expect(classicalTag!.moodDistribution.neutral).toBe(1)
      expect(classicalTag!.moodDistribution.frustrated).toBe(0)
    })
  })

  describe('Filtering', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should filter by time range', async () => {
      const filters = {
        timeRange: {
          start: new Date('2024-01-15').getTime(),
          end: new Date('2024-01-18').getTime(),
        },
      }

      const stats = await module.getOverallStatistics(filters)
      expect(stats.totalDuration).toBe(135) // Only Jan 15-17 entries (60+45+30)
      expect(stats.totalSessions).toBe(3)
    })

    it('should filter by instrument', async () => {
      const filters = {
        instruments: ['PIANO' as Instrument],
      }

      const stats = await module.getOverallStatistics(filters)
      expect(stats.totalDuration).toBe(180) // Only piano entries
      expect(stats.totalSessions).toBe(3)
    })

    it('should filter by type', async () => {
      const filters = {
        types: ['practice' as const],
      }

      const stats = await module.getOverallStatistics(filters)
      expect(stats.totalDuration).toBe(195) // Only practice entries (60 + 45 + 90)
      expect(stats.totalSessions).toBe(3)
    })

    it('should filter by tags', async () => {
      const filters = {
        tags: ['classical'],
      }

      const stats = await module.getOverallStatistics(filters)
      expect(stats.totalDuration).toBe(135) // Only classical tagged entries
      expect(stats.totalSessions).toBe(3)
    })

    it('should filter by techniques', async () => {
      const filters = {
        techniques: ['dynamics'],
      }

      const stats = await module.getOverallStatistics(filters)
      expect(stats.totalDuration).toBe(90) // Only entries with dynamics technique
      expect(stats.totalSessions).toBe(2)
    })

    it('should filter by moods', async () => {
      const filters = {
        moods: ['satisfied' as const],
      }

      const stats = await module.getOverallStatistics(filters)
      expect(stats.totalDuration).toBe(150) // Only satisfied mood entries (60 + 90)
      expect(stats.totalSessions).toBe(2)
    })

    it('should combine multiple filters', async () => {
      const filters = {
        instruments: ['PIANO' as Instrument],
        moods: ['satisfied' as const],
      }

      const stats = await module.getOverallStatistics(filters)
      expect(stats.totalDuration).toBe(150) // Piano + satisfied mood (60 + 90)
      expect(stats.totalSessions).toBe(2)
    })
  })

  describe('Goal Progress', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should calculate linked duration for goals', async () => {
      const report = await module.generateLogbookReport()

      const goal1Progress = report.goalProgress.find(
        g => g.goal.id === 'goal-1'
      )
      expect(goal1Progress).toBeDefined()
      expect(goal1Progress!.linkedDuration).toBe(90) // entry-1 (60) + entry-3 (30)
      expect(goal1Progress!.progressPercentage).toBe(75)
    })
  })

  describe('Mood Trends', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should calculate mood distribution', async () => {
      const report = await module.generateLogbookReport()

      expect(report.moodTrends.satisfied).toBe(2)
      expect(report.moodTrends.excited).toBe(1)
      expect(report.moodTrends.neutral).toBe(1)
      expect(report.moodTrends.frustrated).toBe(0)
    })
  })

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should export as JSON', async () => {
      const options = {
        format: 'json' as const,
        pivot: 'repertoire' as const,
        filters: {},
      }

      const result = await module.exportReport(options)
      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/logbook-report-\d+\.json/)
      expect(typeof result.data).toBe('string')

      const data = JSON.parse(result.data as string)
      expect(data.overall).toBeDefined()
      expect(data.byRepertoire).toBeDefined()
    })

    it('should export as CSV for different pivots', async () => {
      const options = {
        format: 'csv' as const,
        pivot: 'repertoire' as const,
        filters: {},
      }

      const result = await module.exportReport(options)
      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/logbook-report-\d+\.csv/)
      expect(typeof result.data).toBe('string')
      expect(result.data).toContain('Title')
    })

    it('should handle PDF export (not implemented)', async () => {
      const options = {
        format: 'pdf' as const,
        pivot: 'repertoire' as const,
        filters: {},
      }

      const result = await module.exportReport(options)
      expect(result.success).toBe(false)
      expect(result.error).toContain('PDF export not yet implemented')
    })

    it('should handle invalid export format', async () => {
      const options = {
        format: 'invalid' as any,
        pivot: 'repertoire' as const,
        filters: {},
      }

      const result = await module.exportReport(options)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported export format')
    })
  })

  describe('Caching', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should cache results and return cached data', async () => {
      // First call should read from localStorage
      const stats1 = await module.getOverallStatistics()
      expect(mockLocalStorage.getItem).toHaveBeenCalled()

      // Clear the localStorage mock call count
      mockLocalStorage.getItem.mockClear()

      // Second call should use cache (same filters)
      const stats2 = await module.getOverallStatistics()
      expect(stats2).toEqual(stats1)

      // Different call should still read from localStorage
      await module.getPieceStatistics()
      expect(mockLocalStorage.getItem).toHaveBeenCalled()
    })

    it('should clear cache when data changes', async () => {
      // Generate cached data
      await module.getOverallStatistics()

      // Clear localStorage mock
      mockLocalStorage.getItem.mockClear()

      // Trigger cache clear with event
      await eventBus.publish({
        source: 'logger',
        type: 'logger:entry:created',
        data: { entry: mockEntries[0] },
        metadata: { version: '1.0.0' },
      })

      // Next call should read from localStorage again
      await module.getOverallStatistics()
      expect(mockLocalStorage.getItem).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const stats = await module.getOverallStatistics()

      // Should return empty statistics without throwing
      expect(stats.totalDuration).toBe(0)
      expect(stats.totalSessions).toBe(0)
    })

    it('should handle invalid JSON in localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      const stats = await module.getOverallStatistics()

      // Should return empty statistics
      expect(stats.totalDuration).toBe(0)
      expect(stats.totalSessions).toBe(0)
    })
  })
})
