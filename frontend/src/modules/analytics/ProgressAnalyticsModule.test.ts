import { ProgressAnalyticsModule } from './ProgressAnalyticsModule'
import { EventBus } from '../core/EventBus'
import { StorageModule } from '../infrastructure/StorageModule'
import type { EventPayload } from '../core/types'
import type { SessionData, Milestone } from './types'

describe('ProgressAnalyticsModule', () => {
  let module: ProgressAnalyticsModule
  let eventBus: EventBus
  let storageModule: StorageModule
  let publishSpy: jest.SpyInstance
  let subscribeSpy: jest.SpyInstance

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Reset EventBus instance
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()

    // Create storage module
    storageModule = new StorageModule({ namespace: 'test' })

    // Spy on methods
    publishSpy = jest.spyOn(eventBus, 'publish')
    subscribeSpy = jest.spyOn(eventBus, 'subscribe')
    jest.spyOn(storageModule, 'loadLocal').mockResolvedValue(null)
    jest.spyOn(storageModule, 'saveLocal').mockResolvedValue(undefined)

    // Create module instance
    module = new ProgressAnalyticsModule(eventBus, storageModule)
  })

  afterEach(async () => {
    // Ensure module is shut down
    if (module) {
      await module.shutdown()
    }
    jest.clearAllMocks()
    EventBus.resetInstance()
  })

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await module.initialize()

      expect(module.getHealth().status).toBe('green')
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:start',
          source: 'ProgressAnalyticsModule',
        })
      )
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:complete',
          source: 'ProgressAnalyticsModule',
        })
      )
    })

    it('should subscribe to relevant events on initialization', async () => {
      await module.initialize()

      expect(subscribeSpy).toHaveBeenCalledWith(
        'performance:note:recorded',
        expect.any(Function)
      )
      expect(subscribeSpy).toHaveBeenCalledWith(
        'practice:session:ended',
        expect.any(Function)
      )
      expect(subscribeSpy).toHaveBeenCalledWith(
        'practice:session:summary',
        expect.any(Function)
      )
    })

    it('should handle initialization errors', async () => {
      subscribeSpy.mockImplementation(() => {
        throw new Error('Subscription failed')
      })

      await module.initialize()

      expect(module.getHealth().status).toBe('red')
      expect(module.getHealth().message).toBe('Subscription failed')
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:error',
          source: 'ProgressAnalyticsModule',
        })
      )
    })

    it('should shutdown gracefully', async () => {
      await module.initialize()
      await module.shutdown()

      expect(module.getHealth().status).toBe('gray')
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:shutdown:complete',
          source: 'ProgressAnalyticsModule',
        })
      )
    })
  })

  describe('Progress Analysis', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should get progress report for a user', async () => {
      const timeRange = {
        start: Date.now() - 7 * 24 * 60 * 60 * 1000,
        end: Date.now(),
      }
      const mockSessions = [
        {
          sessionId: 's1',
          userId: 'user123',
          accuracy: 0.85,
          duration: 1800,
          timestamp: Date.now() - 1000000,
          notesPlayed: 100,
        },
        {
          sessionId: 's2',
          userId: 'user123',
          accuracy: 0.9,
          duration: 2400,
          timestamp: Date.now() - 500000,
          notesPlayed: 150,
        },
      ]

      ;(storageModule.loadLocal as jest.Mock).mockResolvedValue(mockSessions)

      const report = await module.getProgressReport('user123', timeRange)

      expect(report).toMatchObject({
        userId: 'user123',
        timeRange,
        totalPracticeTime: 4200, // 1800 + 2400
        sessionsCompleted: 2,
        averageAccuracy: 0.875,
        improvementRate: expect.any(Number),
        strengthAreas: expect.any(Array),
        weakAreas: expect.any(Array),
        milestones: expect.any(Array),
      })
    })

    it('should identify weak areas', async () => {
      const mockPerformanceData = [
        { type: 'rhythm', accuracy: 0.65, count: 50 },
        { type: 'pitch', accuracy: 0.92, count: 100 },
        { type: 'tempo', accuracy: 0.7, count: 30 },
      ]

      ;(storageModule.loadLocal as jest.Mock).mockResolvedValue(
        mockPerformanceData
      )

      const weakAreas = await module.getWeakAreas('user123')

      expect(weakAreas).toHaveLength(2) // rhythm and tempo
      expect(weakAreas[0]).toMatchObject({
        type: 'rhythm',
        accuracy: 0.65,
        occurrences: 50,
        suggestions: expect.any(Array),
      })
    })

    it('should suggest focus areas based on weak areas', async () => {
      const mockWeakAreas = [
        { type: 'rhythm', accuracy: 0.65, occurrences: 50 },
        { type: 'tempo', accuracy: 0.7, occurrences: 30 },
      ]

      ;(storageModule.loadLocal as jest.Mock).mockResolvedValue(mockWeakAreas)

      const focusAreas = await module.getSuggestedFocus('user123')

      expect(focusAreas).toHaveLength(2)
      expect(focusAreas[0]).toMatchObject({
        type: 'rhythm',
        priority: 'high',
        practiceTimeMinutes: expect.any(Number),
        exercises: expect.any(Array),
      })
    })
  })

  describe('Milestone Tracking', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should check and award milestones based on session data', async () => {
      const sessionData: SessionData = {
        sessionId: 'session123',
        userId: 'user123',
        accuracy: 0.95,
        duration: 3600,
        timestamp: Date.now(),
        notesPlayed: 200,
      }

      const milestones = await module.checkMilestones(sessionData)

      expect(milestones.length).toBeGreaterThan(0)
      expect(milestones[0]).toMatchObject({
        id: expect.any(String),
        type: expect.stringMatching(/accuracy|consistency|level|time/),
        achieved: true,
        achievedAt: expect.any(Number),
        criteria: expect.any(Object),
      })

      // Should publish milestone achieved event
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progress:milestone:achieved',
          source: 'ProgressAnalyticsModule',
          data: expect.objectContaining({
            milestone: expect.any(Object),
            userId: 'user123',
          }),
        })
      )
    })

    it('should retrieve milestone history for a user', async () => {
      const mockMilestones: Milestone[] = [
        {
          id: 'm1',
          type: 'accuracy',
          achieved: true,
          achievedAt: Date.now() - 1000000,
          criteria: { type: 'accuracy', target: 0.9 },
        },
        {
          id: 'm2',
          type: 'consistency',
          achieved: true,
          achievedAt: Date.now() - 500000,
          criteria: { type: 'consistency', target: 7 },
        },
      ]

      ;(storageModule.loadLocal as jest.Mock).mockResolvedValue(mockMilestones)

      const history = await module.getMilestoneHistory('user123')

      expect(history).toHaveLength(2)
      expect(history[0]).toMatchObject(mockMilestones[0])
    })
  })

  describe('Trend Analysis', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should calculate accuracy trend over time', async () => {
      const mockSessionData = [
        { timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, accuracy: 0.75 },
        { timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, accuracy: 0.78 },
        { timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000, accuracy: 0.8 },
        { timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, accuracy: 0.82 },
        { timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, accuracy: 0.85 },
        { timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, accuracy: 0.87 },
      ]

      ;(storageModule.loadLocal as jest.Mock).mockResolvedValue(mockSessionData)

      const trend = await module.getAccuracyTrend('user123', 7)

      expect(trend).toMatchObject({
        dataPoints: expect.any(Array),
        trend: 'improving',
        changePercent: expect.any(Number),
      })
      expect(trend.dataPoints).toHaveLength(6)
      expect(trend.changePercent).toBeGreaterThan(0)
    })

    it('should calculate practice consistency metrics', async () => {
      const mockPracticeData = {
        sessions: [
          { date: Date.now() - 0 * 24 * 60 * 60 * 1000 },
          { date: Date.now() - 1 * 24 * 60 * 60 * 1000 },
          { date: Date.now() - 2 * 24 * 60 * 60 * 1000 },
          { date: Date.now() - 4 * 24 * 60 * 60 * 1000 },
          { date: Date.now() - 5 * 24 * 60 * 60 * 1000 },
        ],
      }

      ;(storageModule.loadLocal as jest.Mock).mockResolvedValue(
        mockPracticeData
      )

      const consistency = await module.getPracticeConsistency('user123')

      expect(consistency).toMatchObject({
        daysActive: 5,
        currentStreak: 3,
        longestStreak: 3,
        averageSessionsPerWeek: expect.any(Number),
        missedDays: expect.any(Array),
      })
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should process performance:note:recorded events', async () => {
      const performanceEvent: EventPayload = {
        eventId: 'e1',
        source: 'PerformanceModule',
        type: 'performance:note:recorded',
        data: {
          userId: 'user123',
          accuracy: 0.85,
          noteData: { pitch: 'C4', duration: 0.5 },
        },
        timestamp: Date.now(),
        metadata: { version: '1.0.0' },
      }

      // Get the event handler
      const handler = (subscribeSpy as jest.Mock).mock.calls.find(
        call => call[0] === 'performance:note:recorded'
      )?.[1]

      await handler(performanceEvent)

      // Should process and store the performance data
      expect(storageModule.saveLocal).toHaveBeenCalled()
    })

    it('should process practice:session:ended events', async () => {
      const sessionEvent: EventPayload = {
        eventId: 'e2',
        source: 'PracticeModule',
        type: 'practice:session:ended',
        data: {
          sessionId: 'session123',
          userId: 'user123',
          summary: {
            accuracy: 0.88,
            duration: 2400,
            notesPlayed: 150,
          },
        },
        timestamp: Date.now(),
        metadata: { version: '1.0.0', userId: 'user123' },
      }

      // Get the event handler
      const handler = (subscribeSpy as jest.Mock).mock.calls.find(
        call => call[0] === 'practice:session:ended'
      )?.[1]

      await handler(sessionEvent)

      // Should publish analysis complete event
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progress:report:ready',
          source: 'ProgressAnalyticsModule',
        })
      )
    })
  })

  describe('Data Management', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should persist analytics data', async () => {
      const sessionData: SessionData = {
        sessionId: 'session123',
        userId: 'user123',
        accuracy: 0.85,
        duration: 1800,
        timestamp: Date.now(),
        notesPlayed: 100,
      }

      await module.checkMilestones(sessionData)

      expect(storageModule.saveLocal).toHaveBeenCalledWith(
        expect.stringContaining('analytics:'),
        expect.any(Object)
      )
    })

    it('should handle storage errors gracefully', async () => {
      ;(storageModule.loadLocal as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      )

      const report = await module.getProgressReport('user123', {
        start: 0,
        end: Date.now(),
      })

      expect(report).toMatchObject({
        userId: 'user123',
        totalPracticeTime: 0,
        sessionsCompleted: 0,
        averageAccuracy: 0,
        weakAreas: [],
        milestones: [],
      })
    })
  })
})
