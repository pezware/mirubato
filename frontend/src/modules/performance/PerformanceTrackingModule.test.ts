import { PerformanceTrackingModule } from './PerformanceTrackingModule'
import { EventBus, MockEventDrivenStorage } from '../core'
import { PerformanceData, RealTimeFeedback } from './types'

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

describe('PerformanceTrackingModule', () => {
  let performanceModule: PerformanceTrackingModule
  let mockStorage: MockEventDrivenStorage
  let eventBus: EventBus
  let publishSpy: jest.SpyInstance

  beforeEach(() => {
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
    publishSpy = jest.spyOn(eventBus, 'publish')

    // Use mock storage for tests
    mockStorage = new MockEventDrivenStorage()

    performanceModule = new PerformanceTrackingModule(
      {
        timingToleranceMs: 50,
        enableRealTimeAnalysis: true,
        feedbackDelay: 0, // No delay for testing
      },
      mockStorage
    )
  })

  afterEach(async () => {
    if (performanceModule) {
      await performanceModule.shutdown()
    }
    if (mockStorage) {
      mockStorage.clear()
    }
    jest.clearAllMocks()
    EventBus.resetInstance()
  })

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await performanceModule.initialize()

      const health = performanceModule.getHealth()
      expect(health.status).toBe('green')
      expect(health.message).toContain('initialized')

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:start',
          source: 'PerformanceTracking',
        })
      )

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:complete',
          source: 'PerformanceTracking',
        })
      )
    })

    it('should shutdown properly', async () => {
      await performanceModule.initialize()

      // Start tracking and add some data
      performanceModule.startSessionTracking('session_123')
      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'C4',
        correct: true,
        userId: 'user_123',
      })

      await performanceModule.shutdown()

      const health = performanceModule.getHealth()
      expect(health.status).toBe('gray')

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:shutdown:complete',
          source: 'PerformanceTracking',
        })
      )

      // Should save session data before shutdown
      const savedData =
        await mockStorage.read<PerformanceData[]>('performance_data')
      expect(savedData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sessionId: 'session_123',
          }),
        ])
      )
    })
  })

  describe('Session Tracking', () => {
    beforeEach(async () => {
      await performanceModule.initialize()
    })

    it('should start session tracking', () => {
      performanceModule.startSessionTracking('session_123')

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance:tracking:started',
          source: 'PerformanceTracking',
          data: { sessionId: 'session_123' },
        })
      )
    })

    it('should end session tracking and generate analysis', async () => {
      performanceModule.startSessionTracking('session_123')

      // Add some performance data
      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'C4',
        correct: true,
        userId: 'user_123',
        measure: 1,
        beat: 1,
      })

      await performanceModule.recordNoteEvent({
        expectedNote: 'D4',
        playedNote: 'E4',
        correct: false,
        userId: 'user_123',
        measure: 1,
        beat: 2,
      })

      const analysis = await performanceModule.endSessionTracking('session_123')

      expect(analysis).toMatchObject({
        sessionId: 'session_123',
        userId: 'user_123',
        overallMetrics: expect.objectContaining({
          totalNotes: 2,
          correctNotes: 1,
          wrongNotes: 1,
          accuracy: 50,
        }),
      })

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance:tracking:ended',
          source: 'PerformanceTracking',
          data: { sessionId: 'session_123', analysis },
        })
      )
    })

    it('should throw error for mismatched session ID', async () => {
      performanceModule.startSessionTracking('session_123')

      await expect(
        performanceModule.endSessionTracking('session_456')
      ).rejects.toThrow('Session ID mismatch')
    })
  })

  describe('Note Event Recording', () => {
    beforeEach(async () => {
      await performanceModule.initialize()
      performanceModule.startSessionTracking('session_123')
    })

    it('should record correct note events', async () => {
      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'C4',
        correct: true,
        userId: 'user_123',
        measure: 1,
        beat: 1,
        tempo: 120,
      })

      const sessionData = performanceModule.getCurrentSessionData()
      expect(sessionData).toHaveLength(1)

      const noteData = sessionData[0]
      expect(noteData.noteEvent).toMatchObject({
        expected: expect.objectContaining({
          pitch: 'C4',
        }),
        played: expect.objectContaining({
          pitch: 'C4',
        }),
        type: 'correct',
        measure: 1,
        beat: 1,
      })

      expect(noteData.accuracy.isCorrect).toBe(true)
      expect(noteData.accuracy.pitchAccuracy).toBe(1.0)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance:note:recorded',
          source: 'PerformanceTracking',
        })
      )
    })

    it('should record wrong note events', async () => {
      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'D4',
        correct: false,
        userId: 'user_123',
        measure: 1,
        beat: 1,
      })

      const sessionData = performanceModule.getCurrentSessionData()
      const noteData = sessionData[0]

      expect(noteData.noteEvent.type).toBe('wrong_note')
      expect(noteData.noteEvent.expected.pitch).toBe('C4')
      expect(noteData.noteEvent.played?.pitch).toBe('D4')
      expect(noteData.accuracy.isCorrect).toBe(false)
      expect(noteData.accuracy.pitchAccuracy).toBe(0.0)
    })

    it('should record missed note events', async () => {
      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        correct: false,
        type: 'missed_note',
        userId: 'user_123',
      })

      const sessionData = performanceModule.getCurrentSessionData()
      const noteData = sessionData[0]

      expect(noteData.noteEvent.type).toBe('missed_note')
      expect(noteData.noteEvent.expected.pitch).toBe('C4')
      expect(noteData.noteEvent.played).toBeUndefined()
    })

    it('should not record events without active session', async () => {
      // Make sure no session is active by starting and ending one
      performanceModule.startSessionTracking('session_123')
      await performanceModule.endSessionTracking('session_123')

      // Now try to record an event without an active session
      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'C4',
        correct: true,
      })

      const sessionData = performanceModule.getCurrentSessionData()
      expect(sessionData).toHaveLength(0)
    })
  })

  describe('Performance Analysis', () => {
    beforeEach(async () => {
      await performanceModule.initialize()
      performanceModule.startSessionTracking('session_123')
    })

    it('should calculate overall metrics correctly', async () => {
      // Record 10 notes: 7 correct, 2 wrong, 1 missed
      for (let i = 0; i < 7; i++) {
        await performanceModule.recordNoteEvent({
          expectedNote: 'C4',
          playedNote: 'C4',
          correct: true,
          userId: 'user_123',
        })
      }

      for (let i = 0; i < 2; i++) {
        await performanceModule.recordNoteEvent({
          expectedNote: 'C4',
          playedNote: 'D4',
          correct: false,
          userId: 'user_123',
        })
      }

      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        correct: false,
        type: 'missed_note',
        userId: 'user_123',
      })

      const analysis = await performanceModule.endSessionTracking('session_123')

      expect(analysis.overallMetrics).toMatchObject({
        totalNotes: 10,
        correctNotes: 7,
        wrongNotes: 2,
        missedNotes: 1,
        accuracy: 70,
      })
    })

    it('should identify problem areas', async () => {
      // Create data with many pitch errors
      for (let i = 0; i < 20; i++) {
        await performanceModule.recordNoteEvent({
          expectedNote: 'C4',
          playedNote: i < 5 ? 'C4' : 'D4', // 75% wrong notes
          correct: i < 5,
          userId: 'user_123',
          measure: Math.floor(i / 4) + 1,
        })
      }

      const analysis = await performanceModule.endSessionTracking('session_123')

      expect(analysis.problemAreas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'pitch',
            severity: 'high',
            description: 'Frequent wrong notes detected',
          }),
        ])
      )
    })

    it('should generate recommendations based on problems', async () => {
      // Create data with many pitch errors to trigger pitch recommendations
      for (let i = 0; i < 10; i++) {
        await performanceModule.recordNoteEvent({
          expectedNote: 'C4',
          playedNote: i < 3 ? 'C4' : 'D4', // 7 wrong notes out of 10
          correct: i < 3,
          userId: 'user_123',
        })
      }

      const analysis = await performanceModule.endSessionTracking('session_123')

      expect(analysis.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'practice',
            title: 'Improve Pitch Accuracy',
            practiceExercises: expect.arrayContaining(['Scale practice']),
          }),
        ])
      )
    })

    it('should analyze progress over time', async () => {
      // Record notes with improving accuracy
      for (let i = 0; i < 20; i++) {
        await performanceModule.recordNoteEvent({
          expectedNote: 'C4',
          playedNote: 'C4',
          correct: i > 5, // First 6 wrong, rest correct
          userId: 'user_123',
          measure: Math.floor(i / 2) + 1,
        })
      }

      const analysis = await performanceModule.endSessionTracking('session_123')

      expect(analysis.progressOverTime.length).toBeGreaterThan(0)
      expect(analysis.progressOverTime[0].accuracy).toBeLessThan(
        analysis.progressOverTime[analysis.progressOverTime.length - 1].accuracy
      )
    })
  })

  describe('Real-time Feedback', () => {
    beforeEach(async () => {
      await performanceModule.initialize()
      performanceModule.startSessionTracking('session_123')
    })

    it('should provide real-time feedback for correct notes', async () => {
      const feedbackPromise = new Promise<RealTimeFeedback>(resolve => {
        performanceModule.onRealTimeFeedback(resolve)
      })

      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'C4',
        correct: true,
        userId: 'user_123',
      })

      const feedback = await feedbackPromise

      expect(feedback).toMatchObject({
        type: 'correct',
        message: 'Great!',
        visualCue: 'green-flash',
        audioCue: 'success-chime',
        confidence: expect.any(Number),
      })
    })

    it('should provide real-time feedback for wrong notes', async () => {
      const feedbackPromise = new Promise<RealTimeFeedback>(resolve => {
        performanceModule.onRealTimeFeedback(resolve)
      })

      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'D4',
        correct: false,
        userId: 'user_123',
      })

      const feedback = await feedbackPromise

      expect(feedback).toMatchObject({
        type: 'incorrect',
        message: 'Expected C4, played D4',
        visualCue: 'red-flash',
        audioCue: 'error-beep',
      })
    })

    it('should allow unsubscribing from feedback', async () => {
      let feedbackReceived = false
      const unsubscribe = performanceModule.onRealTimeFeedback(() => {
        feedbackReceived = true
      })

      unsubscribe()

      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'C4',
        correct: true,
        userId: 'user_123',
      })

      await flushPromises()

      expect(feedbackReceived).toBe(false)
    })
  })

  describe('Data Persistence', () => {
    beforeEach(async () => {
      await performanceModule.initialize()
    })

    it('should save and retrieve session data', async () => {
      const mockData: PerformanceData[] = [
        {
          id: 'perf_1',
          sessionId: 'session_123',
          userId: 'user_123',
          timestamp: Date.now(),
          noteEvent: {
            expected: { pitch: 'C4', duration: 500 },
            played: { pitch: 'C4', duration: 500 },
            type: 'correct',
            measure: 1,
            beat: 1,
          },
          timing: {
            expectedTime: Date.now(),
            actualTime: Date.now(),
            delta: 0,
            tempo: 120,
            timeSignature: '4/4',
          },
          accuracy: {
            isCorrect: true,
            pitchAccuracy: 1.0,
            timingAccuracy: 1.0,
            rhythmAccuracy: 1.0,
            overallScore: 1.0,
          },
          difficulty: {
            key: 'C major',
            timeSignature: '4/4',
            tempo: 120,
            complexity: 1,
          },
        },
      ]

      // Set up storage state directly
      await mockStorage.write('performance_data', mockData)

      const sessionData = await performanceModule.getSessionData('session_123')

      expect(sessionData).toEqual(mockData)
    })

    it('should retrieve user stats', async () => {
      const mockData: PerformanceData[] = [
        {
          id: 'perf_1',
          sessionId: 'session_123',
          userId: 'user_123',
          timestamp: Date.now(),
          noteEvent: {
            expected: { pitch: 'C4', duration: 500 },
            played: { pitch: 'C4', duration: 500 },
            type: 'correct',
            measure: 1,
            beat: 1,
          },
          timing: {
            expectedTime: Date.now(),
            actualTime: Date.now(),
            delta: 0,
            tempo: 120,
            timeSignature: '4/4',
          },
          accuracy: {
            isCorrect: true,
            pitchAccuracy: 1.0,
            timingAccuracy: 1.0,
            rhythmAccuracy: 1.0,
            overallScore: 1.0,
          },
          difficulty: {
            key: 'C major',
            timeSignature: '4/4',
            tempo: 120,
            complexity: 1,
          },
        },
      ]

      // Set up storage state directly
      await mockStorage.write('performance_data', mockData)

      const userStats = await performanceModule.getUserStats('user_123')

      expect(userStats).toMatchObject({
        totalNotes: 1,
        correctNotes: 1,
        accuracy: 100,
      })
    })
  })

  describe('Configuration', () => {
    beforeEach(async () => {
      await performanceModule.initialize()
    })

    it('should update configuration', () => {
      performanceModule.updateConfig({
        timingToleranceMs: 100,
        enableRealTimeAnalysis: false,
      })

      const config = performanceModule.getConfig()

      expect(config.timingToleranceMs).toBe(100)
      expect(config.enableRealTimeAnalysis).toBe(false)
    })

    it('should use custom timing tolerance for accuracy calculation', async () => {
      performanceModule.updateConfig({ timingToleranceMs: 25 })
      performanceModule.startSessionTracking('session_123')

      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'C4',
        correct: true,
        userId: 'user_123',
        timingDelta: 30, // Just outside tolerance
      })

      const sessionData = performanceModule.getCurrentSessionData()
      const timingAccuracy = sessionData[0].accuracy.timingAccuracy

      expect(timingAccuracy).toBeLessThan(1.0) // Should be penalized for timing
    })
  })

  describe('Event Subscriptions', () => {
    beforeEach(async () => {
      await performanceModule.initialize()
    })

    it('should start tracking on practice session started', async () => {
      await eventBus.publish({
        source: 'Practice',
        type: 'practice:session:started',
        data: {
          session: { id: 'session_123' },
        },
        metadata: { version: '1.0.0' },
      })

      await flushPromises()

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance:tracking:started',
          data: { sessionId: 'session_123' },
        })
      )
    })

    it('should end tracking on practice session ended', async () => {
      performanceModule.startSessionTracking('session_123')

      // Add at least one note event to avoid the "no data" error
      await performanceModule.recordNoteEvent({
        expectedNote: 'C4',
        playedNote: 'C4',
        correct: true,
        userId: 'user_123',
      })

      await eventBus.publish({
        source: 'Practice',
        type: 'practice:session:ended',
        data: {
          session: { id: 'session_123' },
        },
        metadata: { version: '1.0.0' },
      })

      await flushPromises()

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance:tracking:ended',
        })
      )
    })

    it('should record notes from audio input events', async () => {
      performanceModule.startSessionTracking('session_123')

      await eventBus.publish({
        source: 'Audio',
        type: 'audio:note:detected',
        data: {
          expectedNote: 'C4',
          playedNote: 'C4',
          correct: true,
          userId: 'user_123',
        },
        metadata: { version: '1.0.0' },
      })

      await flushPromises()

      const sessionData = performanceModule.getCurrentSessionData()
      expect(sessionData).toHaveLength(1)
    })
  })

  describe('Helper Methods', () => {
    beforeEach(async () => {
      await performanceModule.initialize()
    })

    it('should clear all data', async () => {
      // Add some data first
      await mockStorage.write('performance_data', [{ id: 'test' }])
      await mockStorage.write('performance_analyses', [{ id: 'test2' }])

      await performanceModule.clearAllData()

      // Check that data was cleared
      const perfData = await mockStorage.read('performance_data')
      const analysesData = await mockStorage.read('performance_analyses')
      expect(perfData).toBeNull()
      expect(analysesData).toBeNull()
    })

    it('should return current session data', () => {
      performanceModule.startSessionTracking('session_123')

      // Test that we get a copy, not the original array
      const sessionData1 = performanceModule.getCurrentSessionData()
      const sessionData2 = performanceModule.getCurrentSessionData()

      expect(sessionData1).not.toBe(sessionData2) // Different array instances
      expect(sessionData1).toEqual(sessionData2) // But same content
    })
  })
})
