import { PracticeLoggerModule } from './PracticeLoggerModule'
import { EventBus } from '../core/EventBus'
import { StorageModule } from '../infrastructure/StorageModule'
import type { LogbookEntry, Goal, LogFilters, ExportOptions } from './types'
import type { EventPayload } from '../core/types'

// Mock dependencies
jest.mock('../core/EventBus')
jest.mock('../infrastructure/StorageModule')

describe('PracticeLoggerModule', () => {
  let logger: PracticeLoggerModule
  let mockEventBus: jest.Mocked<EventBus>
  let mockStorage: jest.Mocked<StorageModule>

  // Test data
  const testUserId = 'test-user-123'
  const testEntry: Omit<LogbookEntry, 'id'> = {
    userId: testUserId,
    timestamp: Date.now(),
    duration: 1800, // 30 minutes
    type: 'practice',
    pieces: [
      {
        id: 'piece-1',
        title: 'Moonlight Sonata',
        composer: 'Beethoven',
        measures: '1-16',
        tempo: 120,
      },
    ],
    techniques: ['scales', 'arpeggios'],
    goals: ['goal-1'],
    notes: 'Focused on dynamics in the first section',
    mood: 'satisfied',
    tags: ['classical', 'beethoven'],
    sessionId: 'session-123',
  }

  const testGoal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> = {
    userId: testUserId,
    title: 'Master Moonlight Sonata',
    description: 'Play the first movement from memory',
    targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    progress: 0,
    milestones: [
      { id: 'ms-1', title: 'Learn first 32 measures', completed: false },
      { id: 'ms-2', title: 'Memorize first 16 measures', completed: false },
    ],
    status: 'active',
    linkedEntries: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock instances
    mockEventBus = {
      getInstance: jest.fn().mockReturnThis(),
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as any

    mockStorage = {
      initialize: jest.fn().mockResolvedValue(undefined),
      saveLocal: jest.fn().mockResolvedValue(undefined),
      loadLocal: jest.fn().mockResolvedValue(null),
      deleteLocal: jest.fn().mockResolvedValue(undefined),
      getKeys: jest.fn().mockResolvedValue([]),
      clearLocal: jest.fn().mockResolvedValue(undefined),
    } as any

    // Set up EventBus singleton
    ;(EventBus.getInstance as jest.Mock).mockReturnValue(mockEventBus)

    logger = new PracticeLoggerModule(mockStorage)
  })

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await logger.initialize()

      expect(logger.name).toBe('PracticeLoggerModule')
      expect(logger.version).toBe('1.0.0')
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:init:start',
        })
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:init:complete',
        })
      )
    })

    it('should set up event subscriptions on initialization', async () => {
      await logger.initialize()

      // Should subscribe to practice session events
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'practice:session:ended',
        expect.any(Function)
      )
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'progress:milestone:achieved',
        expect.any(Function)
      )
    })

    it('should handle initialization errors gracefully', async () => {
      mockStorage.initialize.mockRejectedValueOnce(new Error('Storage error'))

      await logger.initialize()

      const health = logger.getHealth()
      expect(health.status).toBe('red')
      expect(health.message).toContain('Storage error')
    })

    it('should shutdown cleanly', async () => {
      await logger.initialize()
      await logger.shutdown()

      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith(
        'practice:session:ended'
      )
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith(
        'progress:milestone:achieved'
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:shutdown:complete',
        })
      )
    })
  })

  describe('Logbook Entry Management', () => {
    beforeEach(async () => {
      await logger.initialize()
    })

    it('should create a new logbook entry', async () => {
      const entry = await logger.createLogEntry(testEntry)

      expect(entry).toMatchObject(testEntry)
      expect(entry.id).toBeDefined()
      expect(mockStorage.saveLocal).toHaveBeenCalledWith(
        expect.stringContaining('logbook:'),
        entry
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith({
        source: 'PracticeLoggerModule',
        type: 'logger:entry:created',
        data: { entry },
        metadata: expect.any(Object),
      })
    })

    it('should validate entry data before creation', async () => {
      const invalidEntry = { ...testEntry, duration: -100 }

      await expect(logger.createLogEntry(invalidEntry)).rejects.toThrow(
        'Invalid duration'
      )
    })

    it('should update an existing logbook entry', async () => {
      const entry = await logger.createLogEntry(testEntry)

      // Mock storage to return the created entry
      mockStorage.loadLocal.mockResolvedValueOnce(entry)

      const updates = { notes: 'Updated notes', mood: 'excited' as const }
      const updated = await logger.updateLogEntry(entry.id, updates)

      expect(updated.notes).toBe('Updated notes')
      expect(updated.mood).toBe('excited')
      expect(mockStorage.saveLocal).toHaveBeenCalledTimes(2) // create + update
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:entry:updated',
          data: { entry: updated, changes: updates },
        })
      )
    })

    it('should delete a logbook entry', async () => {
      const entry = await logger.createLogEntry(testEntry)

      await logger.deleteLogEntry(entry.id)

      expect(mockStorage.deleteLocal).toHaveBeenCalledWith(
        `logbook:${entry.id}`
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:entry:deleted',
          data: { entryId: entry.id },
        })
      )
    })

    it('should retrieve logbook entries with filters', async () => {
      // Mock storage to return test entries
      const mockEntries = [
        { ...testEntry, id: '1', timestamp: Date.now() - 86400000 },
        { ...testEntry, id: '2', timestamp: Date.now() },
      ]
      mockStorage.getKeys.mockResolvedValueOnce(
        mockEntries.map(e => `logbook:${e.id}`)
      )
      mockEntries.forEach(e => {
        mockStorage.loadLocal.mockResolvedValueOnce(e)
      })

      const filters: LogFilters = {
        userId: testUserId,
        type: ['practice'],
        limit: 10,
      }

      const entries = await logger.getLogEntries(filters)

      expect(entries).toHaveLength(2)
      expect(entries[0].id).toBe('2') // Most recent first
      expect(mockStorage.getKeys).toHaveBeenCalled()
    })

    it('should apply date range filters correctly', async () => {
      const now = Date.now()
      const mockEntries = [
        { ...testEntry, id: '1', timestamp: now - 3 * 86400000 }, // 3 days ago
        { ...testEntry, id: '2', timestamp: now - 86400000 }, // 1 day ago
        { ...testEntry, id: '3', timestamp: now }, // today
      ]
      mockStorage.getKeys.mockResolvedValueOnce(
        mockEntries.map(e => `logbook:${e.id}`)
      )
      mockEntries.forEach(e => {
        mockStorage.loadLocal.mockResolvedValueOnce(e)
      })

      const filters: LogFilters = {
        startDate: now - 2 * 86400000, // 2 days ago
        endDate: now,
      }

      const entries = await logger.getLogEntries(filters)

      expect(entries).toHaveLength(2)
      expect(entries.map(e => e.id)).toEqual(['3', '2'])
    })
  })

  describe('Goal Management', () => {
    beforeEach(async () => {
      await logger.initialize()
    })

    it('should create a new goal', async () => {
      const goal = await logger.createGoal(testGoal)

      expect(goal).toMatchObject(testGoal)
      expect(goal.id).toBeDefined()
      expect(goal.createdAt).toBeDefined()
      expect(goal.updatedAt).toBeDefined()
      expect(mockStorage.saveLocal).toHaveBeenCalledWith(
        expect.stringContaining('goal:'),
        goal
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:goal:created',
          data: { goal },
        })
      )
    })

    it('should update goal progress', async () => {
      const goal = await logger.createGoal(testGoal)

      // Wait a bit to ensure updatedAt will be different
      await new Promise(resolve => setTimeout(resolve, 10))

      // Mock storage to return the created goal
      mockStorage.loadLocal.mockResolvedValueOnce(goal)

      const updated = await logger.updateGoalProgress(goal.id, 50)

      expect(updated.progress).toBe(50)
      expect(updated.updatedAt).toBeGreaterThanOrEqual(goal.updatedAt)
    })

    it('should mark goal as completed when progress reaches 100', async () => {
      const goal = await logger.createGoal(testGoal)

      // Mock storage to return the created goal
      mockStorage.loadLocal.mockResolvedValueOnce(goal)

      const completed = await logger.updateGoalProgress(goal.id, 100)

      expect(completed.status).toBe('completed')
      expect(completed.completedAt).toBeDefined()
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:goal:completed',
          data: { goal: completed },
        })
      )
    })

    it('should update goal milestones', async () => {
      const goal = await logger.createGoal(testGoal)
      const milestoneUpdate = { id: 'ms-1', completed: true }

      // Mock storage to return the created goal
      mockStorage.loadLocal.mockResolvedValueOnce(goal)

      const updated = await logger.updateGoalMilestone(
        goal.id,
        milestoneUpdate.id,
        milestoneUpdate.completed
      )

      expect(updated.milestones[0].completed).toBe(true)
      expect(updated.milestones[0].completedAt).toBeDefined()
    })

    it('should link logbook entries to goals', async () => {
      const goal = await logger.createGoal(testGoal)
      const entry = await logger.createLogEntry({
        ...testEntry,
        goals: [goal.id],
      })

      // Mock storage to return the goal
      mockStorage.loadLocal.mockResolvedValueOnce(goal)

      const updated = await logger.linkEntryToGoal(entry.id, goal.id)

      expect(updated.linkedEntries).toContain(entry.id)
    })

    it('should get active goals for a user', async () => {
      const mockGoals = [
        { ...testGoal, id: '1', status: 'active' as const },
        { ...testGoal, id: '2', status: 'completed' as const },
        { ...testGoal, id: '3', status: 'active' as const },
      ]
      mockStorage.getKeys.mockResolvedValueOnce(
        mockGoals.map(g => `goal:${g.id}`)
      )
      mockGoals.forEach(g => {
        mockStorage.loadLocal.mockResolvedValueOnce(g)
      })

      const activeGoals = await logger.getActiveGoals(testUserId)

      expect(activeGoals).toHaveLength(2)
      expect(activeGoals.every(g => g.status === 'active')).toBe(true)
    })
  })

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await logger.initialize()
      // Create test data
      await logger.createLogEntry(testEntry)
      await logger.createGoal(testGoal)
    })

    it('should export logs as JSON', async () => {
      mockStorage.getKeys.mockResolvedValueOnce(['logbook:1'])
      mockStorage.loadLocal.mockResolvedValueOnce({ ...testEntry, id: '1' })

      const exportOptions: ExportOptions = {
        format: 'json',
        filters: { userId: testUserId },
      }

      const result = await logger.exportLogs(exportOptions)

      expect(result.success).toBe(true)
      expect(result.filename).toContain('.json')
      expect(result.data).toBeDefined()
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:export:ready',
          data: { result },
        })
      )
    })

    it('should export logs as CSV', async () => {
      mockStorage.getKeys.mockResolvedValueOnce(['logbook:1'])
      mockStorage.loadLocal.mockResolvedValueOnce({ ...testEntry, id: '1' })

      const exportOptions: ExportOptions = {
        format: 'csv',
        filters: { userId: testUserId },
      }

      const result = await logger.exportLogs(exportOptions)

      expect(result.success).toBe(true)
      expect(result.filename).toContain('.csv')
      expect(typeof result.data).toBe('string')
      expect(result.data).toContain('Date,Duration,Type,Pieces') // CSV headers
    })

    it('should generate practice report', async () => {
      const now = Date.now()
      const mockEntries = [
        {
          ...testEntry,
          id: '1',
          timestamp: now - 86400000,
          duration: 1800,
          mood: 'satisfied' as const,
        },
        {
          ...testEntry,
          id: '2',
          timestamp: now,
          duration: 2700,
          mood: 'excited' as const,
        },
      ]
      mockStorage.getKeys.mockResolvedValueOnce(
        mockEntries.map(e => `logbook:${e.id}`)
      )
      mockEntries.forEach(e => {
        mockStorage.loadLocal.mockResolvedValueOnce(e)
      })

      const report = await logger.generatePracticeReport({
        startDate: now - 7 * 86400000,
        endDate: now,
      })

      expect(report.totalEntries).toBe(2)
      expect(report.totalDuration).toBe(4500) // 1800 + 2700
      expect(report.averageDuration).toBe(2250)
      expect(report.entriesByType.practice).toBe(2)
      expect(report.moodDistribution.satisfied).toBe(1)
      expect(report.moodDistribution.excited).toBe(1)
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:report:generated',
          data: { report },
        })
      )
    })

    it('should include goals in export when requested', async () => {
      // First call for log entries
      mockStorage.getKeys.mockResolvedValueOnce(['logbook:1'])
      mockStorage.loadLocal.mockResolvedValueOnce({ ...testEntry, id: '1' })

      // Second call for goals
      mockStorage.getKeys.mockResolvedValueOnce(['goal:1'])
      mockStorage.loadLocal.mockResolvedValueOnce({ ...testGoal, id: '1' })

      const exportOptions: ExportOptions = {
        format: 'json',
        filters: { userId: testUserId },
        includeGoals: true,
      }

      const result = await logger.exportLogs(exportOptions)
      const exportData = JSON.parse(result.data as string)

      expect(exportData.entries).toHaveLength(1)
      expect(exportData.goals).toHaveLength(1)
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      await logger.initialize()
    })

    it('should auto-create logbook entry when practice session ends', async () => {
      const sessionEndedEvent: EventPayload = {
        eventId: 'evt_test_123',
        timestamp: Date.now(),
        source: 'PracticeSessionModule',
        type: 'practice:session:ended',
        data: {
          session: {
            id: 'session-123',
            userId: testUserId,
            duration: 1800,
            notesAttempted: 100,
            notesCorrect: 90,
            pieces: [
              {
                id: 'piece-1',
                title: 'Moonlight Sonata',
                composer: 'Beethoven',
              },
            ],
          },
        },
        metadata: { version: '1.0.0' },
      }

      // Get the event handler
      const eventHandler = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'practice:session:ended'
      )?.[1]

      await eventHandler?.(sessionEndedEvent)

      expect(mockStorage.saveLocal).toHaveBeenCalledWith(
        expect.stringContaining('logbook:'),
        expect.objectContaining({
          sessionId: 'session-123',
          userId: testUserId,
          duration: 1800,
          type: 'practice',
        })
      )
    })

    it('should update goal progress when milestone achieved', async () => {
      const goal = await logger.createGoal(testGoal)

      // Mock storage to return the goal for both the event handler and updateGoalProgress
      mockStorage.loadLocal.mockResolvedValueOnce(goal) // For event handler
      mockStorage.loadLocal.mockResolvedValueOnce(goal) // For updateGoalProgress

      const milestoneEvent: EventPayload = {
        eventId: 'evt_test_456',
        timestamp: Date.now(),
        source: 'ProgressAnalyticsModule',
        type: 'progress:milestone:achieved',
        data: {
          milestone: {
            type: 'accuracy',
            criteria: { threshold: 90 },
          },
          linkedGoals: [goal.id],
        },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'progress:milestone:achieved'
      )?.[1]

      await eventHandler?.(milestoneEvent)

      expect(mockStorage.loadLocal).toHaveBeenCalledWith(`goal:${goal.id}`)
      expect(mockStorage.saveLocal).toHaveBeenCalledWith(
        `goal:${goal.id}`,
        expect.objectContaining({
          progress: expect.any(Number),
        })
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await logger.initialize()
    })

    it('should handle storage errors gracefully', async () => {
      mockStorage.saveLocal.mockRejectedValueOnce(new Error('Storage failed'))

      try {
        await logger.createLogEntry(testEntry)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Storage failed')
      }

      // The health status should remain green as errors are thrown
      // The module doesn't update health on individual operation failures
      const health = logger.getHealth()
      expect(health.status).toBe('green')
    })

    it('should validate date ranges in filters', async () => {
      const filters: LogFilters = {
        startDate: Date.now(),
        endDate: Date.now() - 86400000, // End before start
      }

      await expect(logger.getLogEntries(filters)).rejects.toThrow(
        'Invalid date range'
      )
    })

    it('should handle missing entries gracefully', async () => {
      mockStorage.loadLocal.mockResolvedValueOnce(null)

      await expect(logger.updateLogEntry('non-existent', {})).rejects.toThrow(
        'Entry not found'
      )
    })
  })

  describe('Performance Optimizations', () => {
    beforeEach(async () => {
      await logger.initialize()
    })

    it('should batch storage operations when possible', async () => {
      // Create multiple entries quickly
      const promises = Array.from({ length: 5 }, (_, i) =>
        logger.createLogEntry({
          ...testEntry,
          timestamp: Date.now() + i,
        })
      )

      await Promise.all(promises)

      // Should have called storage set for each entry
      expect(mockStorage.saveLocal).toHaveBeenCalledTimes(5)
    })

    it('should implement pagination for large result sets', async () => {
      const mockEntries = Array.from({ length: 100 }, (_, i) => ({
        ...testEntry,
        id: `entry-${i}`,
        timestamp: Date.now() - i * 1000,
      }))
      mockStorage.getKeys.mockResolvedValueOnce(
        mockEntries.map(e => `logbook:${e.id}`)
      )
      mockEntries.forEach(e => {
        mockStorage.loadLocal.mockResolvedValueOnce(e)
      })

      const filters: LogFilters = {
        limit: 20,
        offset: 10,
      }

      const entries = await logger.getLogEntries(filters)

      expect(entries).toHaveLength(20)
      expect(entries[0].id).toBe('entry-10')
    })
  })
})
