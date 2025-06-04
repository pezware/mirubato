import { CurriculumModule } from './CurriculumModule'
import { EventBus } from '../core/EventBus'
import { StorageModule } from '../infrastructure/StorageModule'
import type {
  LearningPath,
  RepertoirePiece,
  CurriculumConfig,
  ProgressUpdate,
  AssessmentResult,
  CurriculumFilters,
} from './types'
import type { EventPayload } from '../core/types'

// Mock dependencies
jest.mock('../core/EventBus')
jest.mock('../infrastructure/StorageModule')

describe('CurriculumModule', () => {
  let curriculum: CurriculumModule
  let mockEventBus: jest.Mocked<EventBus>
  let mockStorage: jest.Mocked<StorageModule>

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
    instrument: 'piano',
    difficulty: 7,
    genre: 'classical',
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
    instrument: 'piano',
    skillLevel: 'intermediate',
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

    curriculum = new CurriculumModule(mockStorage, testConfig)
  })

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await curriculum.initialize()

      expect(curriculum.name).toBe('CurriculumModule')
      expect(curriculum.version).toBe('1.0.0')
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:init:start',
        })
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:init:complete',
        })
      )
    })

    it('should load repertoire data on initialization', async () => {
      await curriculum.initialize()

      // Should attempt to load repertoire
      expect(mockStorage.loadLocal).toHaveBeenCalledWith(
        'curriculum:repertoire'
      )
    })

    it('should set up event subscriptions', async () => {
      await curriculum.initialize()

      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'practice:session:ended',
        expect.any(Function)
      )
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'progress:milestone:achieved',
        expect.any(Function)
      )
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'logger:entry:created',
        expect.any(Function)
      )
    })

    it('should handle initialization errors gracefully', async () => {
      mockStorage.initialize.mockRejectedValueOnce(new Error('Storage error'))

      await curriculum.initialize()

      const health = curriculum.getHealth()
      expect(health.status).toBe('red')
      expect(health.message).toContain('Storage error')
    })

    it('should shutdown cleanly', async () => {
      await curriculum.initialize()
      await curriculum.shutdown()

      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith(
        'practice:session:ended'
      )
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith(
        'progress:milestone:achieved'
      )
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith(
        'logger:entry:created'
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
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
      expect(mockStorage.saveLocal).toHaveBeenCalledWith(
        expect.stringContaining('path:'),
        path
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
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
      mockStorage.getKeys.mockResolvedValueOnce(
        mockPaths.map(p => `path:${p.id}`)
      )
      mockPaths.forEach(p => {
        mockStorage.loadLocal.mockResolvedValueOnce(p)
      })

      const activePaths = await curriculum.getActivePaths(testUserId)

      expect(activePaths).toHaveLength(1)
      expect(activePaths[0].id).toBe('path-1')
    })

    it('should update learning path progress', async () => {
      const path = await curriculum.createLearningPath(testPath)

      // Mock storage to return the created path
      mockStorage.loadLocal.mockResolvedValueOnce(path)

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
      expect(mockEventBus.publish).toHaveBeenCalledWith(
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

      mockStorage.loadLocal.mockResolvedValueOnce(path)

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

      mockStorage.loadLocal.mockResolvedValueOnce(path)

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

      expect(mockStorage.saveLocal).toHaveBeenCalledWith(
        `repertoire:${piece.id}`,
        piece
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'curriculum:repertoire:added',
          data: { piece },
        })
      )
    })

    it('should search repertoire with filters', async () => {
      const mockPieces = [
        testPiece,
        { ...testPiece, id: 'piece-2', genre: 'jazz' as const, difficulty: 5 },
        { ...testPiece, id: 'piece-3', genre: 'pop' as const, difficulty: 3 },
      ]
      mockStorage.getKeys.mockResolvedValueOnce(
        mockPieces.map(p => `repertoire:${p.id}`)
      )
      mockPieces.forEach(p => {
        mockStorage.loadLocal.mockResolvedValueOnce(p)
      })

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
        { ...testPiece, id: 'piece-2', genre: 'jazz' as const, difficulty: 5 },
        { ...testPiece, id: 'piece-3', difficulty: 9 }, // Too difficult
      ]
      mockStorage.getKeys.mockResolvedValueOnce(
        mockPieces.map(p => `repertoire:${p.id}`)
      )
      mockPieces.forEach(p => {
        mockStorage.loadLocal.mockResolvedValueOnce(p)
      })

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
      mockStorage.getKeys.mockResolvedValueOnce(
        mockPieces.map(p => `repertoire:${p.id}`)
      )
      mockPieces.forEach(p => {
        mockStorage.loadLocal.mockResolvedValueOnce(p)
      })

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

      expect(mockStorage.saveLocal).toHaveBeenCalledWith(
        expect.stringContaining('assessment:'),
        assessment
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
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
      mockStorage.getKeys.mockResolvedValueOnce(
        mockPaths.map(p => `path:${p.id}`)
      )
      mockPaths.forEach(p => {
        mockStorage.loadLocal.mockResolvedValueOnce(p)
      })

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
      mockStorage.loadLocal.mockResolvedValueOnce(path)

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

      const eventHandler = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'practice:session:ended'
      )?.[1]

      await eventHandler?.(sessionEvent)

      // Should update module progress based on practice performance
      expect(mockStorage.saveLocal).toHaveBeenCalledWith(
        `path:${path.id}`,
        expect.objectContaining({
          phases: expect.arrayContaining([
            expect.objectContaining({
              modules: expect.arrayContaining([
                expect.objectContaining({
                  progress: expect.any(Number),
                }),
              ]),
            }),
          ]),
        })
      )
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

      const eventHandler = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'progress:milestone:achieved'
      )?.[1]

      await eventHandler?.(milestoneEvent)

      expect(mockEventBus.publish).toHaveBeenCalledWith(
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

      const eventHandler = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'logger:entry:created'
      )?.[1]

      await eventHandler?.(loggerEvent)

      // Should analyze patterns and potentially generate recommendations
      expect(mockStorage.saveLocal).toHaveBeenCalled()
    })
  })

  describe('Import/Export Functionality', () => {
    beforeEach(async () => {
      await curriculum.initialize()
    })

    it('should export curriculum data', async () => {
      const mockPaths = [testPath]
      mockStorage.getKeys.mockResolvedValueOnce(
        mockPaths.map(() => `path:path-1`)
      )
      mockStorage.loadLocal.mockResolvedValueOnce({ ...testPath, id: 'path-1' })

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
      expect(mockStorage.saveLocal).toHaveBeenCalledTimes(2) // 1 path + 1 piece
    })

    it('should handle import conflicts', async () => {
      const now = Date.now()
      // Mock existing path with same ID
      mockStorage.loadLocal.mockResolvedValueOnce({
        ...testPath,
        id: 'path-1',
        createdAt: now,
        updatedAt: now,
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
      mockStorage.saveLocal.mockRejectedValueOnce(new Error('Storage failed'))

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
      // First call loads from storage
      await curriculum.getActivePaths(testUserId)
      expect(mockStorage.loadLocal).toHaveBeenCalled()

      // Reset mock
      mockStorage.loadLocal.mockClear()

      // Second call should use cache
      await curriculum.getActivePaths(testUserId)
      expect(mockStorage.loadLocal).not.toHaveBeenCalled()
    })

    it('should batch storage operations', async () => {
      const pieces = Array.from({ length: 5 }, (_, i) => ({
        ...testPiece,
        id: `piece-${i}`,
      }))

      await curriculum.importRepertoire(pieces)

      // Should batch save operations
      expect(mockStorage.saveLocal).toHaveBeenCalledTimes(5)
    })

    it('should implement pagination for large datasets', async () => {
      const mockPieces = Array.from({ length: 100 }, (_, i) => ({
        ...testPiece,
        id: `piece-${i}`,
      }))
      mockStorage.getKeys.mockResolvedValueOnce(
        mockPieces.map(p => `repertoire:${p.id}`)
      )
      mockPieces.slice(0, 20).forEach(p => {
        mockStorage.loadLocal.mockResolvedValueOnce(p)
      })

      const results = await curriculum.searchRepertoire(
        {},
        { limit: 20, offset: 0 }
      )

      expect(results).toHaveLength(20)
      // loadLocal is called 20 times for pagination + 1 for repertoire data in init
      expect(mockStorage.loadLocal).toHaveBeenCalledTimes(21)
    })
  })
})
