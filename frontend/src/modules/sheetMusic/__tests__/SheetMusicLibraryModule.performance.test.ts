/**
 * Performance testing for SheetMusicLibraryModule
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
  SheetMusicModuleConfig,
} from '../types'

describe('SheetMusicLibraryModule - Performance Tests', () => {
  let eventBus: EventBus
  let storage: MockEventDrivenStorage
  let module: SheetMusicLibraryModule

  beforeEach(() => {
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
    storage = new MockEventDrivenStorage()
  })

  afterEach(async () => {
    await module?.destroy()
    EventBus.resetInstance()
    jest.clearAllMocks()
  })

  describe('Exercise Generation Performance', () => {
    beforeEach(async () => {
      module = new SheetMusicLibraryModule(eventBus, storage)
      await module.initialize()
    })

    it('should generate exercises within reasonable time limits', async () => {
      const params = {
        userId: 'perf-user-1',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 8,
        tempo: 120,
      }

      const startTime = performance.now()
      const exercise = await module.generateExercise(params)
      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(100) // Should complete in under 100ms
      expect(exercise).toBeDefined()
    })

    it('should handle large exercises efficiently', async () => {
      const params = {
        userId: 'perf-user-large',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 64, // Large exercise
        tempo: 120,
      }

      const startTime = performance.now()
      const exercise = await module.generateExercise(params)
      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(500) // Should complete in under 500ms even for large exercises
      expect(exercise.measures).toHaveLength(64)
    })

    it('should maintain performance under concurrent load', async () => {
      const params = {
        userId: 'perf-user-concurrent',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 8,
        tempo: 120,
      }

      const concurrency = 20
      const startTime = performance.now()

      // Generate 20 exercises concurrently
      const promises = Array.from({ length: concurrency }, (_, i) =>
        module.generateExercise({ ...params, userId: `concurrent-${i}` })
      )

      const exercises = await Promise.all(promises)
      const endTime = performance.now()

      const duration = endTime - startTime
      const avgTimePerExercise = duration / concurrency

      expect(exercises).toHaveLength(concurrency)
      expect(avgTimePerExercise).toBeLessThan(200) // Average time should be under 200ms
      expect(duration).toBeLessThan(2000) // Total time should be under 2 seconds
    })
  })

  describe('Storage Performance', () => {
    beforeEach(async () => {
      const config: SheetMusicModuleConfig = {
        maxExercisesPerUser: 1000, // Large cache
        exerciseExpirationDays: 30,
        recommendationRefreshInterval: 24 * 60 * 60 * 1000,
        enableIMSLPIntegration: false,
        cacheExpirationMinutes: 60,
      }
      module = new SheetMusicLibraryModule(eventBus, storage, config)
      await module.initialize()
    })

    it('should handle large numbers of stored exercises efficiently', async () => {
      const userId = 'perf-user-storage'
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

      // Generate 100 exercises
      for (let i = 0; i < 100; i++) {
        await module.generateExercise(params)
      }

      const startTime = performance.now()
      const exercises = await module.listUserExercises(userId)
      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(50) // Should list 100 exercises in under 50ms
      expect(exercises).toHaveLength(100)
    })

    it('should efficiently load individual exercises from large collections', async () => {
      const userId = 'perf-user-load'
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

      // Generate 50 exercises and collect IDs
      const exerciseIds: string[] = []
      for (let i = 0; i < 50; i++) {
        const exercise = await module.generateExercise(params)
        exerciseIds.push(exercise.id)
      }

      // Test loading random exercises
      const randomId =
        exerciseIds[Math.floor(Math.random() * exerciseIds.length)]

      const startTime = performance.now()
      const loadedExercise = await module.loadExercise(randomId)
      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(20) // Should load in under 20ms
      expect(loadedExercise).toBeDefined()
      expect(loadedExercise!.id).toBe(randomId)
    })
  })

  describe('Memory Usage Performance', () => {
    beforeEach(async () => {
      module = new SheetMusicLibraryModule(eventBus, storage)
      await module.initialize()
    })

    it('should not cause memory leaks with repeated operations', async () => {
      const params = {
        userId: 'perf-user-memory',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 8,
        tempo: 120,
      }

      // Measure initial memory usage (approximate)
      const initialTime = performance.now()

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const exercise = await module.generateExercise(params)
        await module.loadExercise(exercise.id)
        await module.listUserExercises(params.userId)
      }

      const finalTime = performance.now()
      const totalDuration = finalTime - initialTime

      // If there were severe memory leaks, operations would slow down significantly
      const avgOperationTime = totalDuration / 300 // 100 iterations × 3 operations each
      expect(avgOperationTime).toBeLessThan(10) // Should maintain performance
    })

    it('should handle module reinitialization efficiently', async () => {
      const params = {
        userId: 'perf-user-reinit',
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 4,
        tempo: 120,
      }

      // Generate some exercises
      await module.generateExercise(params)
      await module.generateExercise(params)

      const startTime = performance.now()

      // Destroy and reinitialize
      await module.destroy()
      await module.initialize()

      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(100) // Should reinitialize quickly

      // Verify module still works
      const exercise = await module.generateExercise(params)
      expect(exercise).toBeDefined()
    })
  })

  describe('Complex Operations Performance', () => {
    beforeEach(async () => {
      module = new SheetMusicLibraryModule(eventBus, storage)
      await module.initialize()
    })

    it('should handle complex technical exercises efficiently', async () => {
      const params = {
        userId: 'perf-user-technical',
        type: ExerciseType.TECHNICAL,
        keySignature: KeySignature.D_FLAT_MAJOR,
        timeSignature: TimeSignature.SIX_EIGHT,
        clef: Clef.TREBLE,
        range: { lowest: 'F3', highest: 'F6' },
        difficulty: 9,
        measures: 32,
        tempo: 144,
        technicalElements: ['scales', 'arpeggios', 'chromatic', 'octaves'],
      }

      const startTime = performance.now()
      const exercise = await module.generateExercise(params)
      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(300) // Complex exercises should still be fast
      expect(exercise.measures).toHaveLength(32)
      expect(exercise.metadata.focusAreas.length).toBeGreaterThan(3)
    })

    it('should efficiently generate varied exercises', async () => {
      const baseParams = {
        userId: 'perf-user-varied',
        type: ExerciseType.SIGHT_READING,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        measures: 8,
        tempo: 120,
      }

      const variations = [
        {
          keySignature: KeySignature.C_MAJOR,
          timeSignature: TimeSignature.FOUR_FOUR,
          difficulty: 1,
        },
        {
          keySignature: KeySignature.G_MAJOR,
          timeSignature: TimeSignature.THREE_FOUR,
          difficulty: 3,
        },
        {
          keySignature: KeySignature.F_MAJOR,
          timeSignature: TimeSignature.TWO_FOUR,
          difficulty: 5,
        },
        {
          keySignature: KeySignature.D_MAJOR,
          timeSignature: TimeSignature.SIX_EIGHT,
          difficulty: 7,
        },
        {
          keySignature: KeySignature.A_MAJOR,
          timeSignature: TimeSignature.NINE_EIGHT,
          difficulty: 9,
        },
      ]

      const startTime = performance.now()

      const exercises = await Promise.all(
        variations.map(variation =>
          module.generateExercise({ ...baseParams, ...variation })
        )
      )

      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(400) // 5 varied exercises in under 400ms
      expect(exercises).toHaveLength(5)
      exercises.forEach(exercise => {
        expect(exercise).toBeDefined()
        expect(exercise.measures).toHaveLength(8)
      })
    })
  })
})
