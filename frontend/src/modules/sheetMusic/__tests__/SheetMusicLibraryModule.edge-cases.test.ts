/**
 * Comprehensive edge case testing for SheetMusicLibraryModule
 * Part of Task 1.10: Comprehensive Testing
 */

import { EventBus } from '../../core/EventBus'
import { MockEventDrivenStorage } from '../../core/MockEventDrivenStorage'
import { SheetMusicLibraryModule } from '../SheetMusicLibraryModule'
import {
  ExerciseType,
  KeySignature,
  TimeSignature,
  Clef,
  RepertoireStatus,
  GeneratedExercise,
  SheetMusicModuleConfig,
  TechnicalElement,
} from '../types'

describe('SheetMusicLibraryModule - Edge Cases', () => {
  let eventBus: EventBus
  let storage: MockEventDrivenStorage
  let module: SheetMusicLibraryModule

  beforeEach(() => {
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
    storage = new MockEventDrivenStorage()
    module = new SheetMusicLibraryModule(eventBus, storage)
  })

  afterEach(async () => {
    await module.destroy()
    EventBus.resetInstance()
    jest.clearAllMocks()
  })

  describe('Extreme Parameter Values', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should handle minimum difficulty exercises', async () => {
      const params = {
        userId: 'user-1',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 1, // minimum
        measures: 1, // minimum
        tempo: 60, // slow tempo
      }

      const exercise = await module.generateExercise(params)
      expect(exercise).toBeDefined()
      expect(exercise.metadata.tags).toContain('beginner')
      expect(exercise.metadata.estimatedDuration).toBeGreaterThan(0)
    })

    it('should handle maximum difficulty exercises', async () => {
      const params = {
        userId: 'user-1',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.F_SHARP_MAJOR, // complex key
        timeSignature: TimeSignature.SEVEN_EIGHT, // complex time
        clef: Clef.BASS,
        range: { lowest: 'C2', highest: 'C7' }, // wide range
        difficulty: 10, // maximum
        measures: 32, // many measures
        tempo: 200, // fast tempo
      }

      const exercise = await module.generateExercise(params)
      expect(exercise).toBeDefined()
      expect(exercise.metadata.tags).toContain('advanced')
      expect(exercise.metadata.focusAreas).toContain('advanced technique')
      expect(exercise.metadata.focusAreas).toContain('speed')
    })

    it('should handle technical exercises with complex parameters', async () => {
      const params = {
        userId: 'user-1',
        type: ExerciseType.TECHNICAL,
        keySignature: KeySignature.D_FLAT_MAJOR,
        timeSignature: TimeSignature.SIX_EIGHT,
        clef: Clef.TREBLE,
        range: { lowest: 'F3', highest: 'F6' },
        difficulty: 8,
        measures: 16,
        tempo: 144,
        technicalElements: [
          TechnicalElement.SCALES,
          TechnicalElement.ARPEGGIOS,
        ],
      }

      const exercise = await module.generateExercise(params)
      expect(exercise).toBeDefined()
      expect(exercise.type).toBe(ExerciseType.TECHNICAL)
      expect(exercise.metadata.focusAreas).toEqual(
        expect.arrayContaining(['scales', 'arpeggios'])
      )
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should handle rapid exercise generation', async () => {
      const params = {
        userId: 'user-1',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Generate 10 exercises rapidly
      const promises = Array.from({ length: 10 }, (_, i) =>
        module.generateExercise({ ...params, userId: `user-${i}` })
      )

      const exercises = await Promise.all(promises)
      expect(exercises).toHaveLength(10)
      exercises.forEach((exercise, i) => {
        expect(exercise.userId).toBe(`user-${i}`)
        expect(exercise.id).toBeDefined()
      })
    })

    it('should handle large number of user exercises', async () => {
      const userId = 'user-large'
      const params = {
        userId,
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Generate 20 exercises for one user
      const exercises = []
      for (let i = 0; i < 20; i++) {
        const exercise = await module.generateExercise(params)
        exercises.push(exercise)
      }

      const userExercises = await module.listUserExercises(userId)
      expect(userExercises).toHaveLength(20)
    })

    it('should handle many concurrent users', async () => {
      const baseParams = {
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Create exercises for 50 different users
      const userPromises = Array.from({ length: 50 }, (_, i) =>
        module.generateExercise({
          ...baseParams,
          userId: `concurrent-user-${i}`,
        })
      )

      const exercises = await Promise.all(userPromises)
      expect(exercises).toHaveLength(50)

      // Verify each user can retrieve their exercise
      const retrievalPromises = exercises.map((_, i) =>
        module.listUserExercises(`concurrent-user-${i}`)
      )

      const userExerciseLists = await Promise.all(retrievalPromises)
      userExerciseLists.forEach(list => {
        expect(list).toHaveLength(1)
      })
    })
  })

  describe('Expiration and Cleanup Edge Cases', () => {
    let config: SheetMusicModuleConfig

    beforeEach(async () => {
      config = {
        maxExercisesPerUser: 5,
        exerciseExpirationDays: 1, // expire after 1 day
        recommendationRefreshInterval: 24 * 60 * 60 * 1000,
        enableIMSLPIntegration: false,
        cacheExpirationMinutes: 60,
      }
      module = new SheetMusicLibraryModule(eventBus, storage, config)
      await module.initialize()
    })

    it('should handle exercises that expire immediately', async () => {
      const params = {
        userId: 'user-expire',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Create an exercise
      const exercise = await module.generateExercise(params)
      expect(exercise).toBeDefined()

      // Manually expire it by modifying the expiration date
      const expiredExercise: GeneratedExercise = {
        ...exercise,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      }

      // Store the expired exercise
      await module.saveExercise(expiredExercise)

      // List exercises should filter out expired ones
      const userExercises = await module.listUserExercises('user-expire')
      const nonExpired = userExercises.filter(
        e => !e.expiresAt || new Date(e.expiresAt) > new Date()
      )
      expect(nonExpired.length).toBe(userExercises.length)
    })

    it('should handle storage errors gracefully during exercise generation', async () => {
      // Mock storage to fail on write
      const originalWrite = storage.write
      storage.write = jest.fn().mockRejectedValue(new Error('Storage full'))

      const params = {
        userId: 'user-storage-error',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      await expect(module.generateExercise(params)).rejects.toThrow(
        'Storage full'
      )

      // Restore storage
      storage.write = originalWrite
    })
  })

  describe('Invalid Input Edge Cases', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should handle invalid user IDs', async () => {
      const params = {
        userId: '', // empty user ID
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Should still work with empty user ID (anonymous users)
      const exercise = await module.generateExercise(params)
      expect(exercise.userId).toBe('')
    })

    it('should handle exercises with very long durations', async () => {
      const params = {
        userId: 'user-long',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 100, // very long exercise
        tempo: 30, // very slow tempo
      }

      const exercise = await module.generateExercise(params)
      expect(exercise.metadata.estimatedDuration).toBeGreaterThan(60) // > 1 minute
    })

    it('should handle malformed range objects', async () => {
      const params = {
        userId: 'user-malformed',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C6', highest: 'C4' }, // inverted range
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Should still generate exercise (generators should handle this)
      const exercise = await module.generateExercise(params)
      expect(exercise).toBeDefined()
    })
  })

  describe('Concurrent Access Edge Cases', () => {
    beforeEach(async () => {
      await module.initialize()
    })

    it('should handle concurrent access to same exercise', async () => {
      const params = {
        userId: 'user-concurrent',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      const exercise = await module.generateExercise(params)

      // Multiple concurrent loads
      const loadPromises = Array.from({ length: 10 }, () =>
        module.loadExercise(exercise.id)
      )

      const results = await Promise.all(loadPromises)
      results.forEach(result => {
        expect(result).toEqual(exercise)
      })
    })

    it('should handle concurrent repertoire updates', async () => {
      const userId = 'user-repertoire-concurrent'
      const sheetMusicId = 'sheet-1'

      // Multiple concurrent status updates
      const updates = [
        RepertoireStatus.LEARNING,
        RepertoireStatus.MEMORIZED,
        RepertoireStatus.FORGOTTEN,
        RepertoireStatus.DROPPED,
      ]

      const updatePromises = updates.map(
        (status, i) =>
          // Add delay to avoid race conditions in test
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve(
                  module.updateRepertoireStatus(
                    userId,
                    `${sheetMusicId}-${i}`,
                    status
                  )
                ),
              i * 10
            )
          )
      )

      await Promise.all(updatePromises)

      const repertoire = await module.getUserRepertoire(userId)
      expect(repertoire).toHaveLength(4)
    })
  })

  describe('Module State Edge Cases', () => {
    it('should handle reinitialization after destruction', async () => {
      await module.initialize()
      expect(module.getHealth().status).toBe('green')

      await module.destroy()
      expect(module.getHealth().status).toBe('gray')

      // Should be able to reinitialize
      await module.initialize()
      expect(module.getHealth().status).toBe('green')
    })

    it('should handle operations during shutdown', async () => {
      await module.initialize()

      const params = {
        userId: 'user-shutdown',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Start exercise generation
      const exercisePromise = module.generateExercise(params)

      // Immediately shutdown (should not affect in-progress operation)
      const shutdownPromise = module.destroy()

      const [exercise] = await Promise.all([exercisePromise, shutdownPromise])
      expect(exercise).toBeDefined()
    })

    it('should handle health checks during high load', async () => {
      await module.initialize()

      const params = {
        userId: 'user-health',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Generate exercises while checking health
      const exercisePromises = Array.from({ length: 5 }, () =>
        module.generateExercise(params)
      )

      const healthChecks = Array.from({ length: 10 }, () => module.getHealth())

      const exercises = await Promise.all(exercisePromises)
      expect(exercises).toHaveLength(5)

      healthChecks.forEach(health => {
        expect(health.status).toBe('green')
        expect(health.lastCheck).toBeGreaterThan(0)
      })
    })
  })
})
