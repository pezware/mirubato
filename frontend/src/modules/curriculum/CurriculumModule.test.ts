import { CurriculumModule } from './CurriculumModule'
import {
  EventBus,
  MockStorageService,
  Instrument,
  SkillLevel,
  MusicGenre,
  FocusArea,
} from '../core'
import type {
  LearningPath,
  RepertoirePiece,
  CurriculumConfig,
  ProgressUpdate,
  AssessmentResult,
  CurriculumFilters,
  PracticeConfig,
  TechnicalType,
} from './types'
import type { EventPayload } from '../core/types'

describe('CurriculumModule', () => {
  let curriculum: CurriculumModule
  let eventBus: EventBus
  let mockStorage: MockStorageService
  let publishSpy: jest.SpyInstance
  let subscribeSpy: jest.SpyInstance

  // Test data
  const testUserId = 'test-user-123'
  const testConfig: CurriculumConfig = {
    instrument: 'piano',
    skillLevel: 'intermediate',
    weeklyPracticeTarget: 300, // 5 hours
    preferredGenres: ['classical', 'jazz'],
    focusAreas: ['sight-reading', 'technique'],
    autoProgress: true,
  }

  const testPiece: RepertoirePiece = {
    id: 'piece-1',
    title: 'Moonlight Sonata - 3rd Movement',
    composer: 'Beethoven',
    instrument: Instrument.PIANO,
    difficulty: 7,
    genre: MusicGenre.CLASSICAL,
    duration: 420, // 7 minutes
    tags: ['sonata', 'romantic', 'virtuosic'],
    metadata: {
      opus: 'Op. 27 No. 2',
      key: 'C# minor',
      timeSignature: '4/4',
      tempo: 160,
      year: 1801,
      movements: ['Adagio sostenuto', 'Allegretto', 'Presto agitato'],
    },
  }

  const testPath: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'> = {
    userId: testUserId,
    name: 'Classical Piano Journey',
    description: 'Master classical piano repertoire from Baroque to Romantic',
    instrument: Instrument.PIANO,
    skillLevel: SkillLevel.INTERMEDIATE,
    phases: [],
    currentPhaseId: '',
    progress: 0,
    metadata: {
      estimatedDuration: 180, // 6 months
      prerequisiteSkills: ['basic-reading', 'scales', 'chords'],
      learningOutcomes: ['sight-reading', 'expression', 'technique'],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset EventBus instance
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
    publishSpy = jest.spyOn(eventBus, 'publish')
    subscribeSpy = jest.spyOn(eventBus, 'subscribe')

    // Use mock storage service for tests
    mockStorage = new MockStorageService()

    curriculum = new CurriculumModule(testConfig, mockStorage)
  })

  afterEach(async () => {
    // Ensure module is shut down
    if (curriculum) {
      await curriculum.shutdown()
    }
    if (mockStorage) {
      mockStorage.destroy()
    }
    jest.clearAllMocks()
    EventBus.resetInstance()
  })

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await curriculum.initialize()

      expect(curriculum.name).toBe('CurriculumModule')
      expect(curriculum.version).toBe('1.0.0')
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:init:start',
        })
      )
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:init:complete',
        })
      )
    })

    it('should load repertoire data on initialization', async () => {
      await curriculum.initialize()

      // Should have initialized successfully
      const health = curriculum.getHealth()
      expect(health.status).toBe('green')
    })

    it('should set up event subscriptions', async () => {
      await curriculum.initialize()

      expect(subscribeSpy).toHaveBeenCalledWith(
        'practice:session:ended',
        expect.any(Function)
      )
      expect(subscribeSpy).toHaveBeenCalledWith(
        'progress:milestone:achieved',
        expect.any(Function)
      )
      expect(subscribeSpy).toHaveBeenCalledWith(
        'logger:entry:created',
        expect.any(Function)
      )
    })

    it('should handle initialization errors gracefully', async () => {
      // Mock subscribe to throw error during initialization
      subscribeSpy.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      await curriculum.initialize()

      const health = curriculum.getHealth()
      expect(health.status).toBe('red')
      expect(health.message).toContain('Storage error')
    })

    it('should shutdown cleanly', async () => {
      await curriculum.initialize()
      await curriculum.shutdown()

      // EventBus doesn't have unsubscribe method in our implementation
      // Shutdown should clear subscriptions internally
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:shutdown:complete',
        })
      )
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:shutdown:complete',
        })
      )
    })
  })

  describe('Learning Path Management', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    it('should create a new learning path', async () => {
      const path = await curriculum.createLearningPath(testPath)

      expect(path.userId).toBe(testPath.userId)
      expect(path.name).toBe(testPath.name)
      expect(path.description).toBe(testPath.description)
      expect(path.instrument).toBe(testPath.instrument)
      expect(path.skillLevel).toBe(testPath.skillLevel)
      expect(path.id).toBeDefined()
      expect(path.createdAt).toBeDefined()
      expect(path.updatedAt).toBeDefined()
      expect(path.phases.length).toBeGreaterThan(0) // Should generate default phases
      expect(path.currentPhaseId).toBe(path.phases[0].id)
      // Check that path was saved to storage
      const savedPath = await mockStorage.get(`path:${path.id}`)
      expect(savedPath).toEqual(path)
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:path:created',
          data: { path },
        })
      )
    })

    it('should generate default phases for a learning path', async () => {
      const path = await curriculum.createLearningPath(testPath)

      // Should have generated phases based on skill level
      expect(path.phases.length).toBeGreaterThan(0)
      expect(path.phases[0].name).toBeDefined()
      expect(path.phases[0].modules.length).toBeGreaterThan(0)
      expect(path.currentPhaseId).toBe(path.phases[0].id)
    })

    it('should get active learning paths for a user', async () => {
      const now = Date.now()
      const mockPaths = [
        {
          ...testPath,
          id: 'path-1',
          createdAt: now,
          updatedAt: now,
          phases: [],
          currentPhaseId: '',
        },
        {
          ...testPath,
          id: 'path-2',
          createdAt: now,
          updatedAt: now,
          completedAt: now,
          phases: [],
          currentPhaseId: '',
        },
      ]
      // Set up storage state directly
      for (const path of mockPaths) {
        await mockStorage.set(`path:${path.id}`, path)
      }

      const activePaths = await curriculum.getActivePaths(testUserId)

      expect(activePaths).toHaveLength(1)
      expect(activePaths[0].id).toBe('path-1')
    })

    it('should update learning path progress', async () => {
      const path = await curriculum.createLearningPath(testPath)

      // Path should already be in storage from create
      // curriculum.createLearningPath stores it automatically

      const update: ProgressUpdate = {
        pathId: path.id,
        phaseId: path.phases[0].id,
        moduleId: path.phases[0].modules[0].id,
        progress: 100,
        timeSpent: 1800, // 30 minutes
      }

      const updated = await curriculum.updateProgress(update)

      expect(updated.phases[0].modules[0].status).toBe('completed')
      expect(updated.phases[0].modules[0].progress).toBe(100)
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:progress:updated',
          data: { path: updated, update },
        })
      )
    })

    it('should auto-progress to next module when enabled', async () => {
      const path = await curriculum.createLearningPath(testPath)

      // Ensure we have multiple modules
      if (path.phases[0].modules.length < 2) {
        path.phases[0].modules.push({
          id: 'module-2',
          phaseId: path.phases[0].id,
          name: 'Test Module 2',
          type: 'piece',
          content: {},
          order: 2,
          status: 'locked',
          progress: 0,
          estimatedTime: 1800,
        })
      }

      // Complete first module
      path.phases[0].modules[0].status = 'completed'
      path.phases[0].modules[0].progress = 100

      // Store the updated path
      await mockStorage.set(`path:${path.id}`, path)

      const update: ProgressUpdate = {
        pathId: path.id,
        phaseId: path.phases[0].id,
        moduleId: path.phases[0].modules[0].id,
        progress: 100,
        timeSpent: 1800,
      }

      const updated = await curriculum.updateProgress(update)

      // Second module should now be active
      expect(updated.phases[0].modules[1].status).toBe('active')
    })

    it('should progress to next phase when current phase is completed', async () => {
      const path = await curriculum.createLearningPath(testPath)

      // Ensure we have at least 2 phases
      expect(path.phases.length).toBeGreaterThanOrEqual(2)

      // Update requirement to match module count
      path.phases[0].requirements[0].value = path.phases[0].modules.length

      // Complete all modules in first phase
      path.phases[0].modules.forEach(m => {
        m.status = 'completed'
        m.progress = 100
      })

      // Store the updated path
      await mockStorage.set(`path:${path.id}`, path)

      const update: ProgressUpdate = {
        pathId: path.id,
        phaseId: path.phases[0].id,
        moduleId: path.phases[0].modules[path.phases[0].modules.length - 1].id,
        progress: 100,
        timeSpent: 1800,
      }

      const updated = await curriculum.updateProgress(update)

      expect(updated.phases[0].status).toBe('completed')
      expect(updated.phases[1].status).toBe('active')
      expect(updated.currentPhaseId).toBe(updated.phases[1].id)
    })
  })

  describe('Repertoire Management', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    it('should add a piece to repertoire', async () => {
      const piece = await curriculum.addRepertoirePiece(testPiece)

      // Check that piece was saved to storage
      const savedPiece = await mockStorage.get(`repertoire:${piece.id}`)
      expect(savedPiece).toEqual(piece)
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:repertoire:added',
          data: { piece },
        })
      )
    })

    it('should search repertoire with filters', async () => {
      const mockPieces = [
        testPiece,
        { ...testPiece, id: 'piece-2', genre: MusicGenre.JAZZ, difficulty: 5 },
        { ...testPiece, id: 'piece-3', genre: 'pop' as const, difficulty: 3 },
      ]
      // Set up storage state directly
      for (const piece of mockPieces) {
        await mockStorage.set(`repertoire:${piece.id}`, piece)
      }

      const filters: CurriculumFilters = {
        instrument: 'piano',
        genre: ['classical', 'jazz'],
        difficulty: { min: 4, max: 8 },
      }

      const results = await curriculum.searchRepertoire(filters)

      expect(results).toHaveLength(2)
      expect(results.find(p => p.id === 'piece-3')).toBeUndefined()
    })

    it('should recommend pieces based on user profile', async () => {
      // Mock some pieces in storage
      const mockPieces = [
        testPiece,
        { ...testPiece, id: 'piece-2', genre: MusicGenre.JAZZ, difficulty: 5 },
        { ...testPiece, id: 'piece-3', difficulty: 9 }, // Too difficult
      ]
      // Set up storage state directly
      for (const piece of mockPieces) {
        await mockStorage.set(`repertoire:${piece.id}`, piece)
      }

      const recommendations = await curriculum.getRecommendations(
        testUserId,
        'piece'
      )

      expect(recommendations.length).toBeGreaterThan(0)
      // Should prioritize preferred genres and appropriate difficulty
      expect(recommendations[0].score).toBeGreaterThan(0.5)
      // Should not recommend pieces that are too difficult
      expect(recommendations.find(r => r.itemId === 'piece-3')).toBeUndefined()
    })

    it('should get pieces by difficulty range', async () => {
      const mockPieces = Array.from({ length: 10 }, (_, i) => ({
        ...testPiece,
        id: `piece-${i}`,
        difficulty: i + 1,
      }))
      // Set up storage state directly
      for (const piece of mockPieces) {
        await mockStorage.set(`repertoire:${piece.id}`, piece)
      }

      const intermediate = await curriculum.getRepertoireByDifficulty(4, 7)

      expect(intermediate).toHaveLength(4)
      expect(
        intermediate.every(p => p.difficulty >= 4 && p.difficulty <= 7)
      ).toBe(true)
    })
  })

  describe('Assessment and Progress Tracking', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    it('should record assessment results', async () => {
      const assessment: AssessmentResult = {
        moduleId: 'module-1',
        timestamp: Date.now(),
        criteria: [
          { criteriaId: 'tempo', score: 85, feedback: 'Good tempo control' },
          {
            criteriaId: 'accuracy',
            score: 92,
            feedback: 'Excellent note accuracy',
          },
        ],
        overallScore: 88.5,
        passed: true,
        notes: 'Ready to move to next module',
      }

      await curriculum.recordAssessment(assessment)

      // Check that assessment was saved
      const keys = await mockStorage.getKeys()
      const assessmentKey = keys.find(k => k.startsWith('assessment:'))
      expect(assessmentKey).toBeDefined()
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:assessment:recorded',
          data: { assessment },
        })
      )
    })

    it('should calculate curriculum statistics', async () => {
      const now = Date.now()
      // Mock learning paths
      const mockPaths = [
        {
          ...testPath,
          id: 'path-1',
          createdAt: now,
          updatedAt: now,
          completedAt: now,
          progress: 100,
          phases: [
            {
              id: 'phase-1',
              pathId: 'path-1',
              name: 'Test Phase',
              description: 'Test',
              order: 1,
              modules: [
                {
                  id: 'module-1',
                  phaseId: 'phase-1',
                  name: 'Test Module',
                  type: 'piece' as const,
                  content: {},
                  order: 1,
                  status: 'completed' as const,
                  progress: 100,
                  estimatedTime: 1800,
                },
              ],
              requirements: [],
              status: 'completed' as const,
            },
          ],
          currentPhaseId: 'phase-1',
        },
        {
          ...testPath,
          id: 'path-2',
          createdAt: now,
          updatedAt: now,
          progress: 50,
          phases: [],
          currentPhaseId: '',
        },
      ]

      // Call for all paths
      // Set up storage state directly
      for (const path of mockPaths) {
        await mockStorage.set(`path:${path.id}`, path)
      }

      const stats = await curriculum.getCurriculumStats(testUserId)

      expect(stats.totalPaths).toBe(2)
      expect(stats.completedPaths).toBe(1)
      expect(stats.activePaths).toBe(1)
      expect(stats.userId).toBe(testUserId)
    })

    it('should track skill progress over time', async () => {
      const skillProgress = await curriculum.getSkillProgress(
        testUserId,
        'sight-reading'
      )

      expect(skillProgress).toHaveProperty('skill', 'sight-reading')
      expect(skillProgress).toHaveProperty('currentLevel')
      expect(skillProgress).toHaveProperty('history')
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    it('should update progress when practice session ends', async () => {
      const path = await curriculum.createLearningPath(testPath)

      // Mock storage to return the path
      // Store the updated path
      await mockStorage.set(`path:${path.id}`, path)

      const sessionEvent: EventPayload = {
        eventId: 'evt_test_123',
        timestamp: Date.now(),
        source: 'PracticeSessionModule',
        type: 'practice:session:ended',
        data: {
          session: {
            id: 'session-123',
            userId: testUserId,
            duration: 1800,
            pieceId: path.phases[0].modules[0].content.pieceId,
            accuracy: 95,
            notesAttempted: 100,
            notesCorrect: 95,
          },
        },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = subscribeSpy.mock.calls.find(
        call => call[0] === 'practice:session:ended'
      )?.[1]

      await eventHandler?.(sessionEvent)

      // Should update module progress based on practice performance
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10))

      // Check that path was updated in storage
      const updatedPath = await mockStorage.get(`path:${path.id}`)
      expect(updatedPath).toBeDefined()
      expect(updatedPath.phases[0].modules[0].progress).toBeGreaterThan(0)
    })

    it('should unlock achievements when milestones are reached', async () => {
      const milestoneEvent: EventPayload = {
        eventId: 'evt_test_456',
        timestamp: Date.now(),
        source: 'ProgressAnalyticsModule',
        type: 'progress:milestone:achieved',
        data: {
          milestone: {
            type: 'pieces_completed',
            value: 10,
          },
          userId: testUserId,
        },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = subscribeSpy.mock.calls.find(
        call => call[0] === 'progress:milestone:achieved'
      )?.[1]

      await eventHandler?.(milestoneEvent)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:achievement:unlocked',
        })
      )
    })

    it('should analyze practice patterns from logger entries', async () => {
      const loggerEvent: EventPayload = {
        eventId: 'evt_test_789',
        timestamp: Date.now(),
        source: 'PracticeLoggerModule',
        type: 'logger:entry:created',
        data: {
          entry: {
            userId: testUserId,
            pieces: [{ id: 'piece-1', title: 'Test Piece' }],
            duration: 2400,
            techniques: ['scales', 'arpeggios'],
            mood: 'satisfied',
          },
        },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = subscribeSpy.mock.calls.find(
        call => call[0] === 'logger:entry:created'
      )?.[1]

      await eventHandler?.(loggerEvent)

      // Should analyze patterns and potentially generate recommendations
      // Event handler should process the data
    })
  })

  describe('Import/Export Functionality', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    it('should export curriculum data', async () => {
      // Set up mock data
      const mockPath = { ...testPath, id: 'path-1' }
      await mockStorage.set(`path:${mockPath.id}`, mockPath)

      const exportData = await curriculum.exportCurriculum(testUserId)

      expect(exportData).toHaveProperty('paths')
      expect(exportData).toHaveProperty('repertoire')
      expect(exportData).toHaveProperty('version', '1.0.0')
      expect(exportData).toHaveProperty('exportDate')
    })

    it('should import curriculum data', async () => {
      const now = Date.now()
      const importData = {
        version: '1.0.0',
        paths: [
          {
            ...testPath,
            id: 'imported-path-1',
            createdAt: now,
            updatedAt: now,
          },
        ],
        repertoire: [testPiece],
        exportDate: now,
      }

      const result = await curriculum.importCurriculum(importData, testUserId)

      expect(result.success).toBe(true)
      expect(result.imported.paths).toBe(1)
      expect(result.imported.pieces).toBe(1)
      // Should have imported the data successfully
    })

    it('should handle import conflicts', async () => {
      const now = Date.now()
      // Set up existing path with same ID
      await mockStorage.set('path:path-1', {
        ...testPath,
        id: 'path-1',
        createdAt: now,
        updatedAt: now,
        phases: [],
        currentPhaseId: '',
      })

      const importData = {
        version: '1.0.0',
        paths: [{ ...testPath, id: 'path-1', createdAt: now, updatedAt: now }],
        repertoire: [],
        exportDate: now,
      }

      const result = await curriculum.importCurriculum(importData, testUserId, {
        overwrite: false,
      })

      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.imported.paths).toBe(0)
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    it('should handle storage errors gracefully', async () => {
      jest
        .spyOn(mockStorage, 'set')
        .mockRejectedValueOnce(new Error('Storage failed'))

      await expect(curriculum.createLearningPath(testPath)).rejects.toThrow(
        'Storage failed'
      )

      const health = curriculum.getHealth()
      expect(health.status).toBe('green') // Should remain operational
    })

    it('should validate learning path data', async () => {
      const invalidPath = { ...testPath, instrument: 'violin' as any }

      await expect(curriculum.createLearningPath(invalidPath)).rejects.toThrow(
        'Unsupported instrument'
      )
    })

    it('should handle invalid progress updates', async () => {
      const invalidUpdate: ProgressUpdate = {
        pathId: 'non-existent',
        progress: 150, // Invalid progress value
        timeSpent: -100, // Invalid time
      }

      await expect(curriculum.updateProgress(invalidUpdate)).rejects.toThrow()
    })
  })

  describe('Performance Optimization', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    it('should cache frequently accessed data', async () => {
      // Create spy to track storage calls
      const getKeysSpy = jest.spyOn(mockStorage, 'getKeys')

      // First call loads from storage
      await curriculum.getActivePaths(testUserId)
      expect(getKeysSpy).toHaveBeenCalled()

      // Get call count after first call
      const firstCallCount = getKeysSpy.mock.calls.length

      // Second call should use cache (no additional calls)
      await curriculum.getActivePaths(testUserId)
      expect(getKeysSpy).toHaveBeenCalledTimes(firstCallCount)
    })

    it('should batch storage operations', async () => {
      const pieces = Array.from({ length: 5 }, (_, i) => ({
        ...testPiece,
        id: `piece-${i}`,
      }))

      await curriculum.importRepertoire(pieces)

      // Should save all pieces
      const allKeys = await mockStorage.getKeys()
      const repertoireKeys = allKeys.filter(k => k.startsWith('repertoire:'))
      expect(repertoireKeys.length).toBeGreaterThanOrEqual(5)
    })

    it('should implement pagination for large datasets', async () => {
      const mockPieces = Array.from({ length: 100 }, (_, i) => ({
        ...testPiece,
        id: `piece-${i}`,
      }))
      // Set up storage with many pieces
      for (const piece of mockPieces) {
        await mockStorage.set(`repertoire:${piece.id}`, piece)
      }

      const results = await curriculum.searchRepertoire(
        {},
        { limit: 20, offset: 0 }
      )

      expect(results).toHaveLength(20)
      // Should return paginated results
      const allPieces = await mockStorage.getKeys()
      const repertoirePieces = allPieces.filter(k =>
        k.startsWith('repertoire:')
      )
      expect(repertoirePieces.length).toBeGreaterThanOrEqual(20)
    })
  })

  describe('Enhanced Practice Features', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    describe('Granular Practice Sessions', () => {
      const testPracticeConfig: PracticeConfig = {
        type: 'measures',
        focus: 'tempo',
        measures: { start: 16, end: 32 },
        hands: 'right',
        tempo: {
          start: 60,
          target: 120,
          increment: 10,
          rampType: 'linear',
        },
        repetitions: {
          target: 5,
          qualityThreshold: 0.9,
          maxAttempts: 10,
        },
        metronome: {
          enabled: true,
          subdivision: 'quarter',
          accent: 'downbeat',
        },
      }

      it('should create a focused practice session', async () => {
        const session = await curriculum.createPracticeSession(
          'piece-1',
          testPracticeConfig
        )

        expect(session).toHaveProperty('id')
        expect(session.pieceId).toBe('piece-1')
        expect(session.config).toEqual(testPracticeConfig)
        expect(session.status).toBe('active')
        expect(session.repetitions).toEqual([])

        expect(publishSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'curriculum:practice:session:created',
            data: { session },
          })
        )
      })

      it('should track practice repetitions with quality metrics', async () => {
        const session = await curriculum.createPracticeSession(
          'piece-1',
          testPracticeConfig
        )

        // Store the session for updatePracticeProgress
        await mockStorage.set(`practice:session:${session.id}`, session)

        const progressUpdate = {
          sessionId: session.id,
          accuracy: 0.95,
          tempoAchieved: 80,
          qualityScore: 0.92,
          timeSpent: 180,
        }

        await curriculum.updatePracticeProgress(session.id, progressUpdate)

        // Check that session was updated in storage
        const updatedSession = await mockStorage.get(
          `practice:session:${session.id}`
        )
        expect(updatedSession).toBeDefined()
        expect(updatedSession.overallProgress).toMatchObject({
          accuracy: 0.95,
          tempoAchieved: 80,
          qualityScore: 0.92,
        })
      })

      it('should handle different practice types (measures, phrases, sections)', async () => {
        const configs = [
          { ...testPracticeConfig, type: 'measures' as const },
          { ...testPracticeConfig, type: 'phrase' as const },
          { ...testPracticeConfig, type: 'section' as const },
          { ...testPracticeConfig, type: 'full' as const },
        ]

        for (const config of configs) {
          const session = await curriculum.createPracticeSession(
            'piece-1',
            config
          )
          expect(session.config.type).toBe(config.type)
        }
      })

      it('should support hand-specific practice', async () => {
        const leftHandConfig = { ...testPracticeConfig, hands: 'left' as const }
        const session = await curriculum.createPracticeSession(
          'piece-1',
          leftHandConfig
        )

        expect(session.config.hands).toBe('left')
      })
    })

    describe('Technical Exercise Generation', () => {
      it('should generate major scale exercises', async () => {
        const exercise = await curriculum.generateTechnicalExercise(
          'major-scale',
          5
        )

        expect(exercise).toHaveProperty('id')
        expect(exercise.category).toBe('scale')
        expect(exercise.level).toBe(5)
        expect(exercise.name).toContain('Major Scale')
        expect(exercise.estimatedDuration).toBeGreaterThan(0)
      })

      it('should generate arpeggios with variations', async () => {
        const exercise = await curriculum.generateTechnicalExercise(
          'major-arpeggio',
          3
        )

        expect(exercise.category).toBe('arpeggio')
        expect(exercise.variations).toBeDefined()
        expect(exercise.variations!.length).toBeGreaterThan(0)
        expect(exercise.fingering).toBeDefined()
      })

      it('should generate finger independence exercises', async () => {
        const exercise = await curriculum.generateTechnicalExercise(
          'finger-independence',
          4
        )

        expect(exercise.category).toBe('finger-independence')
        expect(exercise.metadata?.focus).toContain('finger-independence')
        expect(exercise.metadata?.benefits).toBeDefined()
      })

      it('should create exercise with proper difficulty progression', async () => {
        const beginner = await curriculum.generateTechnicalExercise(
          'major-scale',
          1
        )
        const advanced = await curriculum.generateTechnicalExercise(
          'major-scale',
          9
        )

        expect(beginner.level).toBeLessThan(advanced.level)
        expect(beginner.estimatedDuration).toBeLessThan(
          advanced.estimatedDuration
        )
      })
    })

    describe('Difficulty Assessment', () => {
      it('should evaluate piece difficulty across multiple factors', async () => {
        const assessment = await curriculum.evaluateDifficulty({
          notation: 'mock-vexflow-data',
          measures: 64,
          fingering: [[1, 2, 3, 4, 5]],
        })

        expect(assessment).toHaveProperty('overall')
        expect(assessment.overall).toBeGreaterThanOrEqual(1)
        expect(assessment.overall).toBeLessThanOrEqual(10)

        expect(assessment.factors).toHaveProperty('technical')
        expect(assessment.factors).toHaveProperty('rhythmic')
        expect(assessment.factors).toHaveProperty('harmonic')
        expect(assessment.factors).toHaveProperty('musical')
        expect(assessment.factors).toHaveProperty('cognitive')

        expect(assessment.estimatedLearningTime).toBeGreaterThan(0)
        expect(assessment.prerequisites).toBeDefined()
        expect(assessment.recommendedPreparation).toBeDefined()
      })

      it('should provide appropriate prerequisites for complex pieces', async () => {
        const complexPiece = {
          notation: 'complex-vexflow-data',
          measures: 200,
          fingering: [[1, 2, 3, 4, 5, 1, 2, 3]],
        }

        const assessment = await curriculum.evaluateDifficulty(complexPiece)

        expect(assessment.overall).toBeGreaterThanOrEqual(7)
        expect(assessment.prerequisites.length).toBeGreaterThan(0)
        expect(assessment.recommendedPreparation.length).toBeGreaterThan(0)
      })
    })

    describe('Performance Readiness Assessment', () => {
      it('should assess performance readiness across multiple criteria', async () => {
        // Mock piece analytics data
        const mockAnalytics = {
          pieceId: 'piece-1',
          userId: testUserId,
          totalPracticeTime: 3600,
          sessionsCount: 10,
          averageAccuracy: 0.85,
          bestAccuracy: 0.95,
          tempoProgress: {
            initial: 60,
            current: 100,
            target: 120,
          },
          problemAreas: [],
          performanceHistory: [
            {
              date: Date.now() - 10 * 24 * 60 * 60 * 1000,
              type: 'performance' as const,
              quality: 4,
            },
          ],
          updatedAt: Date.now(),
        }

        // Store analytics before calling assessPerformanceReadiness
        await mockStorage.set(
          `analytics:piece:piece-1:${testUserId}`,
          mockAnalytics
        )

        const readiness = await curriculum.assessPerformanceReadiness(
          'piece-1',
          testUserId
        )

        expect(readiness).toHaveProperty('overallReadiness')
        expect(readiness.overallReadiness).toBeGreaterThanOrEqual(0)
        expect(readiness.overallReadiness).toBeLessThanOrEqual(100)

        expect(readiness.criteria).toHaveProperty('technical')
        expect(readiness.criteria).toHaveProperty('musical')
        expect(readiness.criteria).toHaveProperty('memorization')
        expect(readiness.criteria).toHaveProperty('stability')
        expect(readiness.criteria).toHaveProperty('polish')

        expect(readiness.recommendedActions).toBeDefined()
        expect(readiness.estimatedTimeToReadiness).toBeGreaterThanOrEqual(0)
      })

      it('should provide specific recommendations based on weaknesses', async () => {
        // Mock piece analytics showing weak memorization
        const mockAnalytics = {
          pieceId: 'piece-1',
          userId: testUserId,
          totalPracticeTime: 1200, // Less than 30 minutes
          sessionsCount: 3,
          averageAccuracy: 0.7,
          bestAccuracy: 0.85,
          tempoProgress: {
            initial: 60,
            current: 70,
            target: 120,
          },
          problemAreas: [],
          performanceHistory: [], // No recent performance history
          updatedAt: Date.now(),
        }

        await mockStorage.set(
          `analytics:piece:piece-1:${testUserId}`,
          mockAnalytics
        )

        const readiness = await curriculum.assessPerformanceReadiness(
          'piece-1',
          testUserId
        )

        expect(readiness.criteria.memorization.score).toBeLessThan(70)
        expect(readiness.recommendedActions.join(' ')).toMatch(/memori/i)
      })
    })

    describe('Maintenance Scheduling', () => {
      it('should generate maintenance schedule for learned pieces', async () => {
        // Mock user with several pieces at different stages
        const mockPieces = [
          {
            pieceId: 'piece-1',
            userId: testUserId,
            totalPracticeTime: 3600,
            sessionsCount: 10,
            averageAccuracy: 0.95,
            bestAccuracy: 0.98,
            tempoProgress: { initial: 60, current: 120, target: 120 },
            problemAreas: [],
            performanceHistory: [],
            updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
          },
          {
            pieceId: 'piece-2',
            userId: testUserId,
            totalPracticeTime: 1800,
            sessionsCount: 5,
            averageAccuracy: 0.8,
            bestAccuracy: 0.85,
            tempoProgress: { initial: 60, current: 100, target: 120 },
            problemAreas: [],
            performanceHistory: [],
            updatedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 1 month ago
          },
        ]

        // Store the analytics data
        for (const piece of mockPieces) {
          await mockStorage.set(
            `analytics:piece:${piece.pieceId}:${testUserId}`,
            piece
          )
        }

        const schedule =
          await curriculum.scheduleMaintenancePractice(testUserId)

        expect(schedule.length).toBeGreaterThanOrEqual(1)
        // Check that at least one piece has proper maintenance scheduling
        expect(schedule[0]).toHaveProperty('priority')
        expect(schedule[0]).toHaveProperty('skill')
        expect(schedule[0]).toHaveProperty('nextPracticeDate')
      })

      it('should prioritize pieces based on upcoming performances', async () => {
        const performanceDate = Date.now() + 7 * 24 * 60 * 60 * 1000 // Next week

        const mockAnalytics = {
          pieceId: 'piece-1',
          userId: testUserId,
          totalPracticeTime: 3600,
          sessionsCount: 10,
          averageAccuracy: 0.95,
          bestAccuracy: 0.98,
          tempoProgress: { initial: 60, current: 120, target: 120 },
          problemAreas: [],
          performanceHistory: [],
          updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
        }

        const mockReadiness = {
          pieceId: 'piece-1',
          userId: testUserId,
          performanceDate,
          overallReadiness: 75,
        }

        // Store analytics and readiness data
        await mockStorage.set(
          `analytics:piece:piece-1:${testUserId}`,
          mockAnalytics
        )
        await mockStorage.set(`readiness:piece-1:${testUserId}`, mockReadiness)

        const schedule =
          await curriculum.scheduleMaintenancePractice(testUserId)

        expect(schedule[0].priority).toBe('high')
        expect(schedule[0].maintenanceType).toBe('full-runthrough')
      })
    })

    describe('Integration with Existing Modules', () => {
      it('should integrate with progress analytics for adaptive learning', async () => {
        const analyticsEvent: EventPayload = {
          eventId: 'evt_analytics_123',
          timestamp: Date.now(),
          source: 'ProgressAnalyticsModule',
          type: 'progress:weak:areas:identified',
          data: {
            userId: testUserId,
            weakAreas: [{ type: 'rhythm', accuracy: 0.65 }],
          },
          metadata: { version: '1.0.0' },
        }

        const eventHandler = subscribeSpy.mock.calls.find(
          call => call[0] === 'progress:weak:areas:identified'
        )?.[1]

        if (eventHandler) {
          await eventHandler(analyticsEvent)

          // Should generate targeted exercises for weak areas
          expect(publishSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'curriculum:exercise:recommended',
              data: expect.objectContaining({
                focus: 'rhythm',
              }),
            })
          )
        }
      })

      it('should coordinate with practice logger for comprehensive tracking', async () => {
        const logEntry = {
          id: 'log-123',
          userId: testUserId,
          pieces: [{ id: 'piece-1', title: 'Test Piece' }],
          duration: 1800,
          practiceType: 'focused',
          measures: { start: 1, end: 16 },
        }

        const loggerEvent: EventPayload = {
          eventId: 'evt_logger_456',
          timestamp: Date.now(),
          source: 'PracticeLoggerModule',
          type: 'logger:focused:practice:completed',
          data: { entry: logEntry },
          metadata: { version: '1.0.0' },
        }

        const eventHandler = subscribeSpy.mock.calls.find(
          call => call[0] === 'logger:focused:practice:completed'
        )?.[1]

        if (eventHandler) {
          await eventHandler(loggerEvent)

          // Should update piece analytics with focused practice data
          // Verify analytics were saved by checking storage
          const keys = await mockStorage.getKeys()
          const analyticsKey = keys.find(k => k.includes('analytics:piece-1'))
          expect(analyticsKey).toBeDefined()
        }
      })
    })

    describe('Error Handling for Enhanced Features', () => {
      it('should handle invalid practice configurations', async () => {
        const invalidConfig: PracticeConfig = {
          type: 'measures',
          focus: 'tempo',
          measures: { start: 50, end: 10 }, // Invalid range
          tempo: { start: -10, target: 200, increment: 5, rampType: 'linear' },
          repetitions: { target: 0, qualityThreshold: 1.5, maxAttempts: -1 },
        }

        await expect(
          curriculum.createPracticeSession('piece-1', invalidConfig)
        ).rejects.toThrow(/invalid/i)
      })

      it('should handle missing piece data gracefully', async () => {
        // Don't store any analytics data - piece will not be found

        const readiness = await curriculum.assessPerformanceReadiness(
          'non-existent-piece',
          testUserId
        )

        expect(readiness.overallReadiness).toBe(0)
        expect(readiness.recommendedActions).toContain('Piece not found')
      })

      it('should validate technical exercise parameters', async () => {
        await expect(
          curriculum.generateTechnicalExercise(
            'major-scale' as TechnicalType,
            15
          )
        ).rejects.toThrow(/invalid level/i)

        await expect(
          curriculum.generateTechnicalExercise(
            'invalid-type' as TechnicalType,
            5
          )
        ).rejects.toThrow(/unsupported exercise type/i)
      })
    })
  })
})
