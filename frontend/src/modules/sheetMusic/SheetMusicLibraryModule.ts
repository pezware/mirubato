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
  ExerciseType,
  ExerciseMetadata,
  Measure,
} from './types'
import { SightReadingGenerator } from './generators/SightReadingGenerator'
import { TechnicalExerciseGenerator } from './generators/TechnicalExerciseGenerator'
import { nanoid } from 'nanoid'
import {
  getCuratedPieces,
  getCuratedPianoPieces,
  getCuratedGuitarPieces,
  getPieceById,
  getCuratedPiecesByInstrument,
  getCuratedPiecesByDifficulty,
  getPresetWorkouts,
  getAllSheetMusic,
} from '../../data/sheetMusic'

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
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }
  private sightReadingGenerator: SightReadingGenerator
  private technicalExerciseGenerator: TechnicalExerciseGenerator

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
    // Initialize exercise generators
    this.sightReadingGenerator = new SightReadingGenerator()
    this.technicalExerciseGenerator = new TechnicalExerciseGenerator()
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
      this.health = {
        status: 'green',
        message: 'Module initialized successfully',
        lastCheck: Date.now(),
      }
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
    this.health = {
      status: 'gray',
      message: 'Module shut down',
      lastCheck: Date.now(),
    }
  }

  async shutdown(): Promise<void> {
    // Alias for destroy to match ModuleInterface
    await this.destroy()
  }

  getHealth(): ModuleHealth {
    this.health.lastCheck = Date.now()
    return this.health
  }

  // ============== Exercise Generation ==============

  async generateExercise(
    params: ExerciseParameters & { userId: string; type: ExerciseType }
  ): Promise<GeneratedExercise> {
    if (!this.initialized) {
      throw new Error('Module not initialized')
    }

    // Generate measures based on exercise type
    let measures
    switch (params.type) {
      case ExerciseType.SIGHT_READING:
        measures = this.sightReadingGenerator.generate(params)
        break
      case ExerciseType.TECHNICAL: {
        // For technical exercises, add default technicalType if not provided
        const technicalParams = {
          ...params,
          technicalType: 'scale' as const,
        }
        measures = this.technicalExerciseGenerator.generate(technicalParams)
        break
      }
      case ExerciseType.RHYTHM:
      case ExerciseType.HARMONY:
        // These will be implemented in future phases
        throw new Error(`Exercise type ${params.type} not implemented yet`)
      default:
        throw new Error(`Unknown exercise type: ${params.type}`)
    }

    // Create metadata based on exercise type and parameters
    const metadata: ExerciseMetadata = {
      title: this.generateExerciseTitle(params),
      description: this.generateExerciseDescription(params),
      focusAreas: this.identifyFocusAreas(params),
      estimatedDuration: this.estimateDuration(measures, params.tempo),
      prerequisites: [],
      tags: this.generateTags(params),
    }

    // Create the exercise object
    const exercise: GeneratedExercise = {
      id: nanoid(),
      userId: params.userId,
      type: params.type,
      parameters: params,
      measures,
      metadata,
      createdAt: new Date(),
      expiresAt: new Date(
        Date.now() + this.config.exerciseExpirationDays * 24 * 60 * 60 * 1000
      ),
    }

    // Save the exercise
    await this.saveExercise(exercise)

    return exercise
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

  async deleteExercise(exerciseId: string, userId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Module not initialized')
    }

    // Load the exercise to verify ownership
    const exercise = await this.loadExercise(exerciseId)

    if (!exercise) {
      throw new Error(`Exercise with id ${exerciseId} not found`)
    }

    if (exercise.userId !== userId) {
      throw new Error(
        'Unauthorized: Cannot delete exercise owned by another user'
      )
    }

    try {
      // Delete from storage
      const key = `exercise:${userId}:${exerciseId}`
      await this.storage.delete(key)

      // Remove from internal cache
      this.state.exercises.delete(exerciseId)

      // Publish deletion event
      this.eventBus.publish({
        source: 'sheet-music',
        type: 'sheet-music:exercise-deleted',
        data: {
          exerciseId,
          userId,
          exerciseType: exercise.type,
          timestamp: new Date(),
        },
        metadata: { version: '1.0.0' },
      })

      // Update health status on successful deletion
      this.health = {
        status: 'green',
        message: `Exercise ${exerciseId} deleted successfully`,
        lastCheck: Date.now(),
      }
    } catch (error) {
      // Update health status on error
      this.health = {
        status: 'yellow',
        message: `Failed to delete exercise: ${error}`,
        lastCheck: Date.now(),
      }

      throw new Error(`Failed to delete exercise: ${error}`)
    }
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
    // First check if it's a curated piece
    const curatedPiece = getPieceById(id)
    if (curatedPiece) {
      return curatedPiece
    }

    // Otherwise look in storage
    const key = `sheet-music:${id}`
    return await this.storage.read<SheetMusic>(key)
  }

  // ============== Curated Pieces ==============

  /**
   * Get all curated pieces (10 pieces total)
   */
  getCuratedPieces(): SheetMusic[] {
    return getCuratedPieces()
  }

  /**
   * Get curated pieces filtered by instrument
   */
  getCuratedPiecesByInstrument(instrument: 'PIANO' | 'GUITAR'): SheetMusic[] {
    return getCuratedPiecesByInstrument(instrument)
  }

  /**
   * Get curated pieces filtered by difficulty
   */
  getCuratedPiecesByDifficulty(
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  ): SheetMusic[] {
    return getCuratedPiecesByDifficulty(difficulty)
  }

  /**
   * Get curated piano pieces (5 pieces)
   */
  getCuratedPianoPieces(): SheetMusic[] {
    return getCuratedPianoPieces()
  }

  /**
   * Get curated guitar pieces (5 pieces)
   */
  getCuratedGuitarPieces(): SheetMusic[] {
    return getCuratedGuitarPieces()
  }

  /**
   * Get preset workout exercises (4 workouts)
   */
  getPresetWorkouts(): SheetMusic[] {
    return getPresetWorkouts()
  }

  /**
   * Get all sheet music including curated pieces and workouts
   */
  getAllSheetMusic(): SheetMusic[] {
    return getAllSheetMusic()
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

  // ============== Exercise Metadata Helpers ==============

  private generateExerciseTitle(
    params: ExerciseParameters & { type: ExerciseType }
  ): string {
    const keyName = params.keySignature.replace(/_/g, ' ').toLowerCase()
    const typeName = params.type.replace(/_/g, ' ').toLowerCase()

    switch (params.type) {
      case ExerciseType.SIGHT_READING:
        return `Sight-reading in ${keyName} - Level ${params.difficulty}`
      case ExerciseType.TECHNICAL: {
        const elements = params.technicalElements?.join(', ') || 'scales'
        return `Technical exercise: ${elements} in ${keyName}`
      }
      default:
        return `${typeName} exercise in ${keyName}`
    }
  }

  private generateExerciseDescription(
    params: ExerciseParameters & { type: ExerciseType }
  ): string {
    const keyName = params.keySignature.replace(/_/g, ' ').toLowerCase()
    const tempo = params.tempo
    const measures = params.measures

    switch (params.type) {
      case ExerciseType.SIGHT_READING:
        return `A ${measures}-measure sight-reading exercise in ${keyName} at ${tempo} BPM, difficulty level ${params.difficulty}/10`
      case ExerciseType.TECHNICAL: {
        const elements =
          params.technicalElements?.join(', ') || 'technical patterns'
        return `Practice ${elements} in ${keyName} at ${tempo} BPM across ${measures} measures`
      }
      default:
        return `${measures}-measure exercise in ${keyName} at ${tempo} BPM`
    }
  }

  private identifyFocusAreas(
    params: ExerciseParameters & { type: ExerciseType }
  ): string[] {
    const areas: string[] = []

    // Add type-specific focus areas
    switch (params.type) {
      case ExerciseType.SIGHT_READING:
        areas.push('note reading', 'rhythm accuracy')
        // Check for sight-reading specific parameters
        if ('includeAccidentals' in params && params.includeAccidentals) {
          areas.push('accidentals')
        }
        if ('includeDynamics' in params && params.includeDynamics) {
          areas.push('dynamics')
        }
        break
      case ExerciseType.TECHNICAL:
        if (params.technicalElements) {
          areas.push(...params.technicalElements)
        }
        areas.push('finger independence', 'technique')
        break
    }

    // Add general focus areas based on parameters
    if (params.difficulty >= 7) areas.push('advanced technique')
    if (params.tempo >= 120) areas.push('speed')
    if (params.rhythmicPatterns?.some(p => p.includes('syncopation')))
      areas.push('syncopation')

    return [...new Set(areas)] // Remove duplicates
  }

  private estimateDuration(measures: Measure[], tempo: number): number {
    // Estimate based on 4/4 time signature as default
    // Each measure in 4/4 at given tempo
    const beatsPerMeasure = 4
    const secondsPerBeat = 60 / tempo
    const secondsPerMeasure = beatsPerMeasure * secondsPerBeat

    return Math.ceil(measures.length * secondsPerMeasure)
  }

  private generateTags(
    params: ExerciseParameters & { type: ExerciseType }
  ): string[] {
    const tags: string[] = []

    // Add type tag
    tags.push(params.type.toLowerCase())

    // Add difficulty tag
    if (params.difficulty <= 3) tags.push('beginner')
    else if (params.difficulty <= 6) tags.push('intermediate')
    else tags.push('advanced')

    // Add key signature tag
    tags.push(params.keySignature.toLowerCase().replace(/_/g, '-'))

    // Add time signature tag
    tags.push(params.timeSignature.replace('/', '-'))

    // Add technical elements
    if (params.technicalElements) {
      tags.push(...params.technicalElements.map(e => e.toLowerCase()))
    }

    // Add instrument if specified
    if (params.instrumentParams?.instrument) {
      tags.push(params.instrumentParams.instrument)
    }

    return tags
  }
}
