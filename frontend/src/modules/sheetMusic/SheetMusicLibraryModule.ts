/**
 * @module SheetMusicLibraryModule
 * @category Modules
 *
 * Advanced sheet music library module providing exercise generation,
 * difficulty assessment, and personalized recommendations.
 *
 * @example
 * ```typescript
 * const sheetMusicModule = new SheetMusicLibraryModule(eventBus, storage, config)
 * await sheetMusicModule.initialize()
 *
 * // Generate a sight-reading exercise
 * const exercise = await sheetMusicModule.generateExercise({
 *   type: ExerciseType.SIGHT_READING,
 *   keySignature: KeySignature.C_MAJOR,
 *   difficulty: 5
 * })
 * ```
 */

import { EventBus } from '../core/EventBus'
import { EventDrivenStorage } from '../core/eventDrivenStorage'
import { ModuleInterface, ModuleHealth } from '../core/types'
import {
  SheetMusicModuleConfig,
  SheetMusicModuleState,
  SheetMusicModuleInterface,
  ExerciseParameters,
  GeneratedExercise,
  MusicSearchCriteria,
  SearchResults,
  SheetMusic,
  DifficultyAssessment,
  MusicRecommendation,
  UserRepertoire,
  RepertoireStatus,
  PerformanceEntry,
  ExerciseGeneratedEvent,
  RepertoireStatusChangedEvent,
  PracticeSessionRecordedEvent,
} from './types'

const DEFAULT_CONFIG: SheetMusicModuleConfig = {
  maxExercisesPerUser: 100,
  exerciseExpirationDays: 30,
  recommendationRefreshInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableIMSLPIntegration: false,
  cacheExpirationMinutes: 60,
}

export class SheetMusicLibraryModule
  implements ModuleInterface, SheetMusicModuleInterface
{
  public readonly name = 'SheetMusicLibraryModule'
  public readonly version = '1.0.0'

  private eventBus: EventBus
  private storage: EventDrivenStorage
  private config: SheetMusicModuleConfig
  private state: SheetMusicModuleState
  private initialized = false
  private lastHealthCheck = 0

  constructor(
    eventBus: EventBus,
    storage: EventDrivenStorage,
    config: Partial<SheetMusicModuleConfig> = {}
  ) {
    this.eventBus = eventBus
    this.storage = storage
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = {
      exercises: new Map(),
      searchCache: new Map(),
      recommendations: new Map(),
      userRepertoire: new Map(),
    }
    this.lastHealthCheck = Date.now()
  }

  // ============== Module Lifecycle ==============

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load cached data from storage
      await this.loadCachedData()

      // Set up event listeners
      this.setupEventListeners()

      // Schedule periodic tasks
      this.schedulePeriodicTasks()

      this.initialized = true
    } catch (error) {
      throw new Error(`Failed to initialize SheetMusicLibraryModule: ${error}`)
    }
  }

  async destroy(): Promise<void> {
    // Save state to storage
    await this.saveState()

    // Clear caches
    this.state.exercises.clear()
    this.state.searchCache.clear()
    this.state.recommendations.clear()
    this.state.userRepertoire.clear()

    this.initialized = false
  }

  async shutdown(): Promise<void> {
    // Alias for destroy to match ModuleInterface
    await this.destroy()
  }

  getHealth(): ModuleHealth {
    const now = Date.now()
    const previousCheck = this.lastHealthCheck
    this.lastHealthCheck = now

    return {
      status: this.initialized ? 'green' : 'red',
      message: this.initialized
        ? `Module is healthy (last check was ${now - previousCheck}ms ago)`
        : 'Module not initialized',
      lastCheck: now,
    }
  }

  // ============== Exercise Generation ==============

  async generateExercise(
    _params: ExerciseParameters
  ): Promise<GeneratedExercise> {
    // Implementation will be added in next task
    throw new Error('Not implemented yet')
  }

  async saveExercise(exercise: GeneratedExercise): Promise<void> {
    const key = `exercise:${exercise.userId}:${exercise.id}`
    await this.storage.write(key, exercise)

    // Update local cache
    this.state.exercises.set(exercise.id, exercise)

    // Emit event
    this.eventBus.publish({
      source: 'sheet-music',
      type: 'sheet-music:exercise-generated',
      data: {
        exercise,
        timestamp: new Date(),
      } as ExerciseGeneratedEvent,
      metadata: { version: '1.0.0' },
    })
  }

  async loadExercise(id: string): Promise<GeneratedExercise | null> {
    // Check cache first
    if (this.state.exercises.has(id)) {
      return this.state.exercises.get(id)!
    }

    // Load from storage
    const exercises = await this.listAllExercises()
    const exercise = exercises.find(e => e.id === id)

    if (exercise) {
      this.state.exercises.set(id, exercise)
    }

    return exercise || null
  }

  async listUserExercises(userId: string): Promise<GeneratedExercise[]> {
    const prefix = `exercise:${userId}:`
    const keys = await this.storage.getKeys(prefix)

    const exercises: GeneratedExercise[] = []
    for (const key of keys) {
      const exercise = await this.storage.read<GeneratedExercise>(key)
      if (
        exercise &&
        (!exercise.expiresAt || new Date(exercise.expiresAt) > new Date())
      ) {
        exercises.push(exercise)
      }
    }

    // Sort by creation date, newest first
    return exercises.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  // ============== Music Search ==============

  async searchMusic(criteria: MusicSearchCriteria): Promise<SearchResults> {
    // Check cache
    const cacheKey = JSON.stringify(criteria)
    if (this.state.searchCache.has(cacheKey)) {
      const cached = this.state.searchCache.get(cacheKey)!
      // Check if cache is still valid
      // Implementation will be completed in search task
      return cached
    }

    // Perform search - implementation in next tasks
    throw new Error('Search not implemented yet')
  }

  async getSheetMusic(id: string): Promise<SheetMusic | null> {
    const key = `sheet-music:${id}`
    return await this.storage.read<SheetMusic>(key)
  }

  // ============== Difficulty Assessment ==============

  async assessDifficulty(
    _sheetMusicId: string,
    _userId: string
  ): Promise<DifficultyAssessment> {
    // Implementation will be added in AI features phase
    throw new Error('Not implemented yet')
  }

  // ============== Recommendations ==============

  async getRecommendations(userId: string): Promise<MusicRecommendation[]> {
    if (this.state.recommendations.has(userId)) {
      return this.state.recommendations.get(userId)!
    }

    await this.refreshRecommendations(userId)
    return this.state.recommendations.get(userId) || []
  }

  async refreshRecommendations(userId: string): Promise<void> {
    // Implementation will be added in recommendation phase
    this.state.recommendations.set(userId, [])
  }

  // ============== User Repertoire ==============

  async getUserRepertoire(userId: string): Promise<UserRepertoire[]> {
    if (this.state.userRepertoire.has(userId)) {
      return this.state.userRepertoire.get(userId)!
    }

    const prefix = `repertoire:${userId}:`
    const keys = await this.storage.getKeys(prefix)

    const repertoire: UserRepertoire[] = []
    for (const key of keys) {
      const item = await this.storage.read<UserRepertoire>(key)
      if (item) repertoire.push(item)
    }

    this.state.userRepertoire.set(userId, repertoire)
    return repertoire
  }

  async updateRepertoireStatus(
    userId: string,
    sheetMusicId: string,
    status: RepertoireStatus
  ): Promise<void> {
    const key = `repertoire:${userId}:${sheetMusicId}`
    let repertoire = await this.storage.read<UserRepertoire>(key)

    const oldStatus = repertoire?.status

    if (!repertoire) {
      repertoire = {
        id: `${userId}-${sheetMusicId}`,
        userId,
        sheetMusicId,
        status,
        totalPracticeMinutes: 0,
        performanceHistory: [],
      }
    } else {
      repertoire.status = status
    }

    // Update dates based on status
    if (status === RepertoireStatus.MEMORIZED && !repertoire.dateMemorized) {
      repertoire.dateMemorized = new Date()
    }

    await this.storage.write(key, repertoire)

    // Update cache
    const userRep = this.state.userRepertoire.get(userId) || []
    const index = userRep.findIndex(r => r.sheetMusicId === sheetMusicId)
    if (index >= 0) {
      userRep[index] = repertoire
    } else {
      userRep.push(repertoire)
    }
    this.state.userRepertoire.set(userId, userRep)

    // Emit event
    this.eventBus.publish({
      source: 'sheet-music',
      type: 'sheet-music:repertoire-status-changed',
      data: {
        userId,
        sheetMusicId,
        oldStatus,
        newStatus: status,
        timestamp: new Date(),
      } as RepertoireStatusChangedEvent,
      metadata: { version: '1.0.0' },
    })
  }

  async recordPracticeSession(
    userId: string,
    sheetMusicId: string,
    entry: PerformanceEntry
  ): Promise<void> {
    const key = `repertoire:${userId}:${sheetMusicId}`
    let repertoire = await this.storage.read<UserRepertoire>(key)

    if (!repertoire) {
      repertoire = {
        id: `${userId}-${sheetMusicId}`,
        userId,
        sheetMusicId,
        status: RepertoireStatus.LEARNING,
        totalPracticeMinutes: 0,
        performanceHistory: [],
      }
    }

    repertoire.performanceHistory.push(entry)
    repertoire.dateLastPlayed = entry.date

    await this.storage.write(key, repertoire)

    // Emit event
    this.eventBus.publish({
      source: 'sheet-music',
      type: 'sheet-music:practice-session-recorded',
      data: {
        userId,
        sheetMusicId,
        entry,
        timestamp: new Date(),
      } as PracticeSessionRecordedEvent,
      metadata: { version: '1.0.0' },
    })
  }

  // ============== Import/Export ==============

  async importMusicXML(_file: File): Promise<SheetMusic> {
    // Implementation will be added in import/export phase
    throw new Error('Not implemented yet')
  }

  async exportMusicXML(_sheetMusicId: string): Promise<Blob> {
    // Implementation will be added in import/export phase
    throw new Error('Not implemented yet')
  }

  // ============== Private Methods ==============

  private async loadCachedData(): Promise<void> {
    // Load exercises with user context
    const exerciseKeys = await this.storage.getKeys('exercise:')
    for (const key of exerciseKeys.slice(0, 50)) {
      // Limit initial load
      const exercise = await this.storage.read<GeneratedExercise>(key)
      if (exercise) {
        this.state.exercises.set(exercise.id, exercise)
      }
    }
  }

  private setupEventListeners(): void {
    // Listen for practice completion to update repertoire
    this.eventBus.subscribe('practice:session-completed', async _event => {
      // Update repertoire based on practice session
      // Implementation depends on practice module integration
    })
  }

  private schedulePeriodicTasks(): void {
    // Clean up expired exercises
    setInterval(
      () => {
        this.cleanupExpiredExercises()
      },
      24 * 60 * 60 * 1000
    ) // Daily

    // Clear search cache
    setInterval(
      () => {
        this.state.searchCache.clear()
      },
      this.config.cacheExpirationMinutes * 60 * 1000
    )
  }

  private async cleanupExpiredExercises(): Promise<void> {
    const now = new Date()
    const expiredIds: string[] = []

    this.state.exercises.forEach((exercise, id) => {
      if (exercise.expiresAt && new Date(exercise.expiresAt) < now) {
        expiredIds.push(id)
      }
    })

    for (const id of expiredIds) {
      this.state.exercises.delete(id)
      // Also remove from storage
      const exercise = await this.loadExercise(id)
      if (exercise) {
        await this.storage.delete(`exercise:${exercise.userId}:${id}`)
      }
    }
  }

  private async listAllExercises(): Promise<GeneratedExercise[]> {
    const keys = await this.storage.getKeys('exercise:')
    const exercises: GeneratedExercise[] = []

    for (const key of keys) {
      const exercise = await this.storage.read<GeneratedExercise>(key)
      if (exercise) exercises.push(exercise)
    }

    return exercises
  }

  private async saveState(): Promise<void> {
    // Save critical state to storage for recovery
    // This is called on destroy
  }
}
