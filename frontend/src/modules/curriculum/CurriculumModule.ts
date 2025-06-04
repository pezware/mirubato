/**
 * Curriculum Module - Manages structured learning paths and repertoire
 */

import { EventBus, StorageService } from '../core'
import type { ModuleInterface, ModuleHealth, EventPayload } from '../core/types'
import type {
  CurriculumConfig,
  LearningPath,
  Phase,
  CurriculumModule as CurriculumModuleType,
  RepertoirePiece,
  ProgressUpdate,
  AssessmentResult,
  CurriculumRecommendation,
  CurriculumFilters,
  CurriculumStats,
  SkillLevel,
  FocusArea,
  PracticeSession,
  PracticeConfig,
  PracticeProgress,
  TechnicalExercise,
  TechnicalType,
  MusicContent,
  DifficultyAssessment,
  PerformanceReadiness,
  MaintenanceSchedule,
  PieceAnalytics,
} from './types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CurriculumModule implements ModuleInterface {
  public readonly name = 'CurriculumModule'
  public readonly version = '1.0.0'

  private eventBus: EventBus
  private storage: StorageService
  private config: Required<CurriculumConfig>
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }
  private cache = new Map<string, CacheEntry<any>>()
  private readonly CACHE_TTL = 60000 // 1 minute

  constructor(config: CurriculumConfig, storageService?: any) {
    this.eventBus = EventBus.getInstance()
    this.storage = storageService || new StorageService(this.eventBus)
    this.config = {
      ...config,
      preferredGenres: config.preferredGenres || [],
      focusAreas: config.focusAreas || [],
      autoProgress: config.autoProgress ?? true,
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.eventBus.publish({
        source: this.name,
        type: 'curriculum:init:start',
        data: {},
        metadata: { version: this.version },
      })

      // Storage initialization handled by constructor

      // Load repertoire data
      await this.loadRepertoireData()

      // Set up event subscriptions
      this.setupEventSubscriptions()

      this.health.status = 'green'

      await this.eventBus.publish({
        source: this.name,
        type: 'curriculum:init:complete',
        data: {},
        metadata: { version: this.version },
      })
    } catch (error) {
      this.health.status = 'red'
      this.health.message =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to initialize CurriculumModule:', error)
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Unsubscribe from events
      this.eventBus.unsubscribe('practice:session:ended')
      this.eventBus.unsubscribe('progress:milestone:achieved')
      this.eventBus.unsubscribe('logger:entry:created')

      // Clear cache
      this.cache.clear()

      this.health.status = 'gray'

      await this.eventBus.publish({
        source: this.name,
        type: 'curriculum:shutdown:complete',
        data: {},
        metadata: { version: this.version },
      })
    } catch (error) {
      console.error('Error during shutdown:', error)
    }
  }

  getHealth(): ModuleHealth {
    return { ...this.health }
  }

  // Learning Path Management

  async createLearningPath(
    path: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LearningPath> {
    this.validateLearningPath(path)

    const now = Date.now()
    const phases =
      path.phases.length > 0
        ? path.phases
        : this.generateDefaultPhases(path.instrument, path.skillLevel)

    const newPath: LearningPath = {
      ...path,
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phases,
      currentPhaseId: phases[0]?.id || '',
      createdAt: now,
      updatedAt: now,
    }

    await this.storage.set(`path:${newPath.id}`, newPath)
    this.invalidateCache(`paths:${path.userId}`)

    await this.eventBus.publish({
      source: this.name,
      type: 'curriculum:path:created',
      data: { path: newPath },
      metadata: { version: this.version },
    })

    return newPath
  }

  async getActivePaths(userId: string): Promise<LearningPath[]> {
    const cacheKey = `paths:${userId}`
    const cached = this.getFromCache<LearningPath[]>(cacheKey)
    if (cached) return cached

    const keys = await this.storage.getKeys()
    const pathKeys = keys.filter((k: string) => k.startsWith('path:'))
    const pathPromises = pathKeys.map((key: string) =>
      this.storage.get<LearningPath>(key)
    )
    const loadedPaths = await Promise.all(pathPromises)
    const activePaths = loadedPaths
      .filter(
        (p): p is LearningPath =>
          p !== null && p.userId === userId && p.completedAt === undefined
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)

    this.setCache(cacheKey, activePaths)
    return activePaths
  }

  async updateProgress(update: ProgressUpdate): Promise<LearningPath> {
    this.validateProgressUpdate(update)

    const path = await this.storage.get<LearningPath>(`path:${update.pathId}`)
    if (!path) {
      throw new Error('Learning path not found')
    }

    let updatedPath = { ...path, updatedAt: Date.now() }

    // Update module progress
    if (update.moduleId) {
      updatedPath = this.updateModuleProgress(updatedPath, update)
    }

    // Update phase progress
    if (update.phaseId) {
      updatedPath = this.updatePhaseProgress(updatedPath, update.phaseId)
    }

    // Update overall path progress
    updatedPath.progress = this.calculatePathProgress(updatedPath)

    // Handle auto-progression
    if (this.config.autoProgress) {
      updatedPath = this.handleAutoProgression(updatedPath)
    }

    await this.storage.set(`path:${update.pathId}`, updatedPath)
    this.invalidateCache(`paths:${path.userId}`)

    await this.eventBus.publish({
      source: this.name,
      type: 'curriculum:progress:updated',
      data: { path: updatedPath, update },
      metadata: { version: this.version },
    })

    return updatedPath
  }

  // Repertoire Management

  async addRepertoirePiece(piece: RepertoirePiece): Promise<RepertoirePiece> {
    await this.storage.set(`repertoire:${piece.id}`, piece)
    this.invalidateCache('repertoire:all')

    await this.eventBus.publish({
      source: this.name,
      type: 'curriculum:repertoire:added',
      data: { piece },
      metadata: { version: this.version },
    })

    return piece
  }

  async searchRepertoire(
    filters: CurriculumFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<RepertoirePiece[]> {
    const keys = await this.storage.getKeys()
    const repKeys = keys.filter((k: string) => k.startsWith('repertoire:'))

    const limit = pagination?.limit || 20
    const offset = pagination?.offset || 0

    // Only load the pieces we need for pagination
    const piecesToLoad = repKeys.slice(offset, offset + limit)
    const piecePromises = piecesToLoad.map((key: string) =>
      this.storage.get<RepertoirePiece>(key)
    )
    const loadedPieces = await Promise.all(piecePromises)
    let pieces = loadedPieces.filter((p): p is RepertoirePiece => p !== null)

    // Apply filters
    if (filters.instrument) {
      pieces = pieces.filter(p => p.instrument === filters.instrument)
    }
    if (filters.genre?.length) {
      pieces = pieces.filter(p => filters.genre!.includes(p.genre))
    }
    if (filters.difficulty) {
      pieces = pieces.filter(
        p =>
          p.difficulty >= filters.difficulty!.min &&
          p.difficulty <= filters.difficulty!.max
      )
    }
    if (filters.tags?.length) {
      pieces = pieces.filter(p =>
        p.tags.some(tag => filters.tags!.includes(tag))
      )
    }

    return pieces
  }

  async getRecommendations(
    userId: string,
    type: 'path' | 'piece' | 'exercise' | 'resource'
  ): Promise<CurriculumRecommendation[]> {
    const recommendations: CurriculumRecommendation[] = []

    if (type === 'piece') {
      const pieces = await this.searchRepertoire({
        instrument: this.config.instrument,
      })

      // Score pieces based on user preferences
      const scoredPieces: (CurriculumRecommendation | null)[] = pieces.map(
        piece => {
          let score = 0.5 // Base score

          // Genre preference
          if (this.config.preferredGenres.includes(piece.genre)) {
            score += 0.2
          }

          // Difficulty appropriateness
          const difficultyRange = this.getDifficultyRange(
            this.config.skillLevel
          )
          if (
            piece.difficulty >= difficultyRange.min &&
            piece.difficulty <= difficultyRange.max
          ) {
            score += 0.3
          } else if (piece.difficulty > difficultyRange.max) {
            return null // Too difficult
          }

          const recommendation: CurriculumRecommendation = {
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            type: 'piece',
            itemId: piece.id,
            reason: this.generateRecommendationReason(piece, score),
            score,
            createdAt: Date.now(),
          }
          return recommendation
        }
      )

      const validRecommendations = scoredPieces.filter(
        (r): r is CurriculumRecommendation => r !== null
      )

      // Sort by score and take top recommendations
      validRecommendations.sort((a, b) => b.score - a.score)
      recommendations.push(...validRecommendations.slice(0, 10))
    }

    return recommendations
  }

  async getRepertoireByDifficulty(
    minDifficulty: number,
    maxDifficulty: number
  ): Promise<RepertoirePiece[]> {
    return this.searchRepertoire({
      difficulty: { min: minDifficulty, max: maxDifficulty },
    })
  }

  async importRepertoire(pieces: RepertoirePiece[]): Promise<void> {
    for (const piece of pieces) {
      await this.addRepertoirePiece(piece)
    }
  }

  // Assessment and Progress Tracking

  async recordAssessment(assessment: AssessmentResult): Promise<void> {
    const assessmentId = `assessment_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`
    await this.storage.set(`assessment:${assessmentId}`, assessment)

    await this.eventBus.publish({
      source: this.name,
      type: 'curriculum:assessment:recorded',
      data: { assessment },
      metadata: { version: this.version },
    })

    // Update module progress based on assessment
    if (assessment.passed) {
      // Find the module and update its progress
      const keys = await this.storage.getKeys()
      const pathKeys = keys.filter((k: string) => k.startsWith('path:'))

      for (const pathKey of pathKeys) {
        const path = await this.storage.get<LearningPath>(pathKey)
        if (path) {
          const hasModule = path.phases.some(phase =>
            phase.modules.some(m => m.id === assessment.moduleId)
          )
          if (hasModule) {
            await this.updateProgress({
              pathId: path.id,
              moduleId: assessment.moduleId,
              progress: 100,
              timeSpent: 0,
              assessment,
            })
            break
          }
        }
      }
    }
  }

  async getCurriculumStats(userId: string): Promise<CurriculumStats> {
    const allPathKeys = await this.storage.getKeys()
    const userPathKeys = allPathKeys.filter((k: string) =>
      k.startsWith('path:')
    )

    const allPaths: LearningPath[] = []
    for (const key of userPathKeys) {
      const path = await this.storage.get<LearningPath>(key)
      if (path && path.userId === userId) {
        allPaths.push(path)
      }
    }

    const activePaths = allPaths.filter(p => !p.completedAt)

    const stats: CurriculumStats = {
      userId,
      totalPaths: allPaths.length,
      completedPaths: allPaths.filter(p => p.completedAt).length,
      activePaths: activePaths.length,
      totalModules: allPaths.reduce(
        (sum, p) => sum + p.phases.reduce((s, ph) => s + ph.modules.length, 0),
        0
      ),
      completedModules: allPaths.reduce(
        (sum, p) =>
          sum +
          p.phases.reduce(
            (s, ph) =>
              s + ph.modules.filter(m => m.status === 'completed').length,
            0
          ),
        0
      ),
      totalPracticeTime: 0, // Would need to aggregate from practice sessions
      averageModuleTime: 0, // Would need to calculate from module completion times
      preferredGenres: [],
      skillProgress: [],
      streakDays: 0,
      lastPracticeDate: Date.now(),
    }

    return stats
  }

  async getSkillProgress(
    _userId: string,
    skill: FocusArea
  ): Promise<{
    skill: FocusArea
    currentLevel: number
    history: Array<{ date: number; level: number }>
  }> {
    // This would be calculated from assessment results and practice data
    return {
      skill,
      currentLevel: 5, // Placeholder
      history: [],
    }
  }

  // Import/Export

  async exportCurriculum(userId: string): Promise<{
    version: string
    exportDate: number
    paths: LearningPath[]
    repertoire: RepertoirePiece[]
  }> {
    const paths = await this.getActivePaths(userId)
    const repertoire = await this.searchRepertoire({})

    return {
      version: this.version,
      exportDate: Date.now(),
      paths,
      repertoire,
    }
  }

  async importCurriculum(
    data: {
      version: string
      paths: LearningPath[]
      repertoire: RepertoirePiece[]
      exportDate: number
    },
    userId: string,
    options?: { overwrite?: boolean }
  ): Promise<{
    success: boolean
    imported: { paths: number; pieces: number }
    conflicts: string[]
  }> {
    const result = {
      success: true,
      imported: { paths: 0, pieces: 0 },
      conflicts: [] as string[],
    }

    // Import paths
    for (const path of data.paths) {
      const existing = await this.storage.get<LearningPath>(`path:${path.id}`)
      if (existing && !options?.overwrite) {
        result.conflicts.push(`Path: ${path.name}`)
        continue
      }
      path.userId = userId // Assign to current user
      await this.storage.set(`path:${path.id}`, path)
      result.imported.paths++
    }

    // Import repertoire
    for (const piece of data.repertoire) {
      await this.addRepertoirePiece(piece)
      result.imported.pieces++
    }

    return result
  }

  // Private Helper Methods

  private setupEventSubscriptions(): void {
    this.eventBus.subscribe(
      'practice:session:ended',
      this.handlePracticeSessionEnded
    )
    this.eventBus.subscribe(
      'progress:milestone:achieved',
      this.handleMilestoneAchieved
    )
    this.eventBus.subscribe('logger:entry:created', this.handleLoggerEntry)
  }

  private handlePracticeSessionEnded = async (
    event: EventPayload
  ): Promise<void> => {
    if (event.data?.session) {
      const session = event.data.session

      // Find learning path containing this piece
      const paths = await this.getActivePaths(session.userId)

      for (const path of paths) {
        for (const phase of path.phases) {
          for (const module of phase.modules) {
            if (module.content.pieceId === session.pieceId) {
              // Calculate progress based on practice performance
              const accuracy = session.notesCorrect / session.notesAttempted
              const progressIncrement = Math.min(20, accuracy * 20) // Up to 20% per session

              await this.updateProgress({
                pathId: path.id,
                phaseId: phase.id,
                moduleId: module.id,
                progress: Math.min(100, module.progress + progressIncrement),
                timeSpent: session.duration,
              })

              return
            }
          }
        }
      }
    }
  }

  private handleMilestoneAchieved = async (
    event: EventPayload
  ): Promise<void> => {
    if (event.data?.userId) {
      await this.eventBus.publish({
        source: this.name,
        type: 'curriculum:achievement:unlocked',
        data: {
          userId: event.data.userId,
          achievement: 'milestone_master',
          milestone: event.data.milestone,
        },
        metadata: { version: this.version },
      })
    }
  }

  private handleLoggerEntry = async (event: EventPayload): Promise<void> => {
    if (event.data?.entry) {
      const entry = event.data.entry

      // Analyze practice patterns
      const patterns = {
        pieceIds: entry.pieces.map((p: any) => p.id),
        techniques: entry.techniques,
        duration: entry.duration,
        mood: entry.mood,
      }

      // Store patterns for recommendation engine
      await this.storage.set(`patterns:${entry.userId}:${Date.now()}`, patterns)
    }
  }

  private validateLearningPath(
    path: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>
  ): void {
    if (!['piano', 'guitar'].includes(path.instrument)) {
      throw new Error('Unsupported instrument')
    }
    if (!path.userId) {
      throw new Error('User ID is required')
    }
    if (!path.name) {
      throw new Error('Path name is required')
    }
  }

  private validateProgressUpdate(update: ProgressUpdate): void {
    if (update.progress < 0 || update.progress > 100) {
      throw new Error('Invalid progress value')
    }
    if (update.timeSpent < 0) {
      throw new Error('Invalid time spent')
    }
  }

  private generateDefaultPhases(
    instrument: 'piano' | 'guitar',
    skillLevel: SkillLevel
  ): Phase[] {
    const phases: Phase[] = []

    if (instrument === 'piano' && skillLevel === 'intermediate') {
      phases.push({
        id: `phase_${Date.now()}_1`,
        pathId: '', // Will be set by parent
        name: 'Foundation Review',
        description: 'Solidify fundamental techniques and theory',
        order: 1,
        modules: this.generateModulesForPhase(
          'foundation',
          instrument,
          skillLevel
        ),
        requirements: [
          {
            id: 'req_1',
            type: 'modules_completed',
            value: 5,
            current: 0,
            description: 'Complete all foundation modules',
          },
        ],
        status: 'active',
      })

      phases.push({
        id: `phase_${Date.now()}_2`,
        pathId: '',
        name: 'Classical Repertoire',
        description: 'Explore classical masterpieces',
        order: 2,
        modules: this.generateModulesForPhase(
          'classical',
          instrument,
          skillLevel
        ),
        requirements: [
          {
            id: 'req_2',
            type: 'pieces_memorized',
            value: 2,
            current: 0,
            description: 'Memorize 2 classical pieces',
          },
        ],
        status: 'locked',
      })
    }

    return phases
  }

  private generateModulesForPhase(
    phaseType: string,
    _instrument: 'piano' | 'guitar',
    _skillLevel: SkillLevel
  ): CurriculumModuleType[] {
    const modules: CurriculumModuleType[] = []

    if (phaseType === 'foundation') {
      modules.push({
        id: `module_${Date.now()}_1`,
        phaseId: '', // Will be set by parent
        name: 'Scale Mastery',
        type: 'scale',
        content: {
          instructions: 'Practice major and minor scales in all keys',
          assessmentCriteria: [
            {
              id: 'tempo',
              type: 'tempo',
              targetValue: 120,
              weight: 0.5,
              description: 'Play at 120 BPM',
            },
          ],
        },
        order: 1,
        status: 'active',
        progress: 0,
        estimatedTime: 1800, // 30 minutes
      })
    }

    return modules
  }

  private updateModuleProgress(
    path: LearningPath,
    update: ProgressUpdate
  ): LearningPath {
    const updatedPath = { ...path }

    for (const phase of updatedPath.phases) {
      for (const module of phase.modules) {
        if (module.id === update.moduleId) {
          module.progress = update.progress
          module.actualTime = (module.actualTime || 0) + update.timeSpent

          if (update.progress === 100) {
            module.status = 'completed'
            module.completedAt = Date.now()
          } else if (module.progress > 0) {
            module.status = 'in_progress'
            if (!module.startedAt) {
              module.startedAt = Date.now()
            }
          }

          // Record assessment if provided
          if (update.assessment) {
            // Assessment is already saved separately
          }

          return updatedPath
        }
      }
    }

    return updatedPath
  }

  private updatePhaseProgress(
    path: LearningPath,
    phaseId: string
  ): LearningPath {
    const updatedPath = { ...path }

    for (const phase of updatedPath.phases) {
      if (phase.id === phaseId) {
        // Update phase requirements
        for (const req of phase.requirements) {
          if (req.type === 'modules_completed') {
            req.current = phase.modules.filter(
              m => m.status === 'completed'
            ).length
          }
        }

        // Check if phase is completed
        const allRequirementsMet = phase.requirements.every(
          req => req.current >= req.value
        )

        if (allRequirementsMet && phase.status !== 'completed') {
          phase.status = 'completed'
          phase.completedAt = Date.now()

          // Unlock next phase
          const nextPhase = updatedPath.phases.find(
            p => p.order === phase.order + 1
          )
          if (nextPhase) {
            nextPhase.status = 'active'
            updatedPath.currentPhaseId = nextPhase.id
          }
        }
      }
    }

    return updatedPath
  }

  private calculatePathProgress(path: LearningPath): number {
    const totalModules = path.phases.reduce(
      (sum, phase) => sum + phase.modules.length,
      0
    )

    if (totalModules === 0) return 0

    const completedModules = path.phases.reduce(
      (sum, phase) =>
        sum + phase.modules.filter(m => m.status === 'completed').length,
      0
    )

    return Math.round((completedModules / totalModules) * 100)
  }

  private handleAutoProgression(path: LearningPath): LearningPath {
    const updatedPath = { ...path }

    // Find current phase
    const currentPhase = updatedPath.phases.find(
      p => p.id === updatedPath.currentPhaseId
    )

    if (currentPhase) {
      // Find active modules
      const activeModules = currentPhase.modules.filter(
        m => m.status === 'active'
      )

      // If no active modules and there are more modules to unlock
      if (activeModules.length === 0) {
        const nextModule = currentPhase.modules.find(m => m.status === 'locked')
        if (nextModule) {
          nextModule.status = 'active'
        }
      }
    }

    return updatedPath
  }

  private getDifficultyRange(skillLevel: SkillLevel): {
    min: number
    max: number
  } {
    const ranges = {
      beginner: { min: 1, max: 3 },
      intermediate: { min: 4, max: 7 },
      advanced: { min: 7, max: 9 },
      professional: { min: 8, max: 10 },
    }
    return ranges[skillLevel]
  }

  private generateRecommendationReason(
    piece: RepertoirePiece,
    score: number
  ): string {
    const reasons = []

    if (this.config.preferredGenres.includes(piece.genre)) {
      reasons.push(`matches your ${piece.genre} preference`)
    }

    const difficultyRange = this.getDifficultyRange(this.config.skillLevel)
    if (
      piece.difficulty >= difficultyRange.min &&
      piece.difficulty <= difficultyRange.max
    ) {
      reasons.push('appropriate difficulty level')
    }

    if (score > 0.7) {
      reasons.push('highly recommended')
    }

    return reasons.join(', ')
  }

  private async loadRepertoireData(): Promise<void> {
    try {
      const repertoireData = await this.storage.get('curriculum:repertoire')
      if (repertoireData) {
        // Repertoire data loaded
      }
    } catch (error) {
      console.log('No existing repertoire data found')
    }
  }

  // Cache management

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CACHE_TTL,
    })
  }

  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Enhanced Practice Feature Methods

  /**
   * Creates a focused practice session with specific configuration
   *
   * @param pieceId - The piece to practice
   * @param config - Practice configuration (measures, tempo, hands, etc.)
   * @returns Promise resolving to the created practice session
   */
  async createPracticeSession(
    pieceId: string,
    config: PracticeConfig
  ): Promise<PracticeSession> {
    try {
      this.validatePracticeConfig(config)

      const session: PracticeSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.config.instrument, // Use config as proxy for user context
        pieceId,
        config,
        startTime: Date.now(),
        status: 'active',
        repetitions: [],
        overallProgress: {
          sessionId: '',
          accuracy: 0,
          tempoAchieved: config.tempo?.start || 0,
          repetitionsCompleted: 0,
          qualityScore: 0,
          timeSpent: 0,
          status: 'improving',
        },
      }

      session.overallProgress.sessionId = session.id

      // Store the session
      await this.storage.set(`practice:session:${session.id}`, session)

      // Publish event
      await this.eventBus.publish({
        source: this.name,
        type: 'curriculum:practice:session:created',
        data: { session },
        metadata: { version: this.version },
      })

      return session
    } catch (error) {
      console.error('Error creating practice session:', error)
      throw error
    }
  }

  /**
   * Updates practice progress for an active session
   */
  async updatePracticeProgress(
    sessionId: string,
    progress: Partial<PracticeProgress>
  ): Promise<void> {
    try {
      const session = await this.storage.get<PracticeSession>(
        `practice:session:${sessionId}`
      )

      if (!session) {
        throw new Error('Practice session not found')
      }

      // Update overall progress
      session.overallProgress = {
        ...session.overallProgress,
        ...progress,
      }

      // Add repetition if this represents a completed attempt
      if (
        progress.accuracy !== undefined &&
        progress.tempoAchieved !== undefined
      ) {
        const repetition = {
          id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId,
          attempt: session.repetitions.length + 1,
          startTime: Date.now() - (progress.timeSpent || 0) * 1000,
          endTime: Date.now(),
          tempo: progress.tempoAchieved || 0,
          accuracy: progress.accuracy || 0,
          quality: progress.qualityScore || 0,
        }

        session.repetitions.push(repetition)
        session.overallProgress.repetitionsCompleted =
          session.repetitions.length
      }

      // Update status based on progress
      if (session.repetitions.length >= 3) {
        const recentAccuracy =
          session.repetitions
            .slice(-3)
            .reduce((sum, rep) => sum + rep.accuracy, 0) / 3

        session.overallProgress.status =
          recentAccuracy > session.overallProgress.accuracy * 1.1
            ? 'improving'
            : recentAccuracy < session.overallProgress.accuracy * 0.9
              ? 'struggling'
              : 'stable'
      }

      // Save updated session
      await this.storage.set(`practice:session:${sessionId}`, session)

      // Publish progress update
      await this.eventBus.publish({
        source: this.name,
        type: 'curriculum:practice:progress:updated',
        data: { sessionId, progress: session.overallProgress },
        metadata: { version: this.version },
      })
    } catch (error) {
      console.error('Error updating practice progress:', error)
      throw error
    }
  }

  /**
   * Generates a technical exercise based on type and level
   */
  async generateTechnicalExercise(
    type: TechnicalType,
    level: number
  ): Promise<TechnicalExercise> {
    try {
      if (level < 1 || level > 10) {
        throw new Error('Invalid level: must be between 1 and 10')
      }

      const exerciseGenerators = {
        'major-scale': this.generateMajorScale.bind(this),
        'minor-scale': this.generateMinorScale.bind(this),
        'major-arpeggio': this.generateMajorArpeggio.bind(this),
        'minor-arpeggio': this.generateMinorArpeggio.bind(this),
        'finger-independence': this.generateFingerIndependence.bind(this),
        'hanon-exercise': this.generateHanonExercise.bind(this),
        'chord-progression': this.generateChordProgression.bind(this),
        'chromatic-scale': this.generateChromaticScale.bind(this),
        'dominant-seventh': this.generateDominantSeventh.bind(this),
        'diminished-seventh': this.generateDiminishedSeventh.bind(this),
        'alberti-bass': this.generateAlbertiBass.bind(this),
        tremolo: this.generateTremolo.bind(this),
        trill: this.generateTrill.bind(this),
        'octave-study': this.generateOctaveStudy.bind(this),
      }

      const generator = exerciseGenerators[type]
      if (!generator) {
        throw new Error(`Unsupported exercise type: ${type}`)
      }

      const exercise = await generator(level)

      // Store the generated exercise
      await this.storage.set(`exercise:${exercise.id}`, exercise)

      return exercise
    } catch (error) {
      console.error('Error generating technical exercise:', error)
      throw error
    }
  }

  /**
   * Evaluates the difficulty of a piece across multiple factors
   */
  async evaluateDifficulty(
    content: MusicContent
  ): Promise<DifficultyAssessment> {
    try {
      const assessment: DifficultyAssessment = {
        pieceId: `piece_${Date.now()}`,
        overall: 5,
        factors: {
          technical: this.assessTechnicalDifficulty(content),
          rhythmic: this.assessRhythmicDifficulty(content),
          harmonic: this.assessHarmonicDifficulty(content),
          musical: this.assessMusicalDifficulty(content),
          cognitive: this.assessCognitiveDifficulty(content),
        },
        prerequisites: [],
        estimatedLearningTime: 0,
        recommendedPreparation: [],
        assessedAt: Date.now(),
        assessor: 'algorithm',
      }

      // Calculate overall difficulty (weighted average)
      assessment.overall = Math.round(
        assessment.factors.technical * 0.25 +
          assessment.factors.rhythmic * 0.2 +
          assessment.factors.harmonic * 0.2 +
          assessment.factors.musical * 0.15 +
          assessment.factors.cognitive * 0.2
      )

      // Determine prerequisites based on difficulty
      if (assessment.overall >= 7) {
        assessment.prerequisites.push('solid-technique', 'advanced-reading')
        assessment.recommendedPreparation.push(
          'Scale work',
          'Etude preparation'
        )
      } else if (assessment.overall >= 5) {
        assessment.prerequisites.push('intermediate-technique')
        assessment.recommendedPreparation.push('Technical exercises')
      }

      // Estimate learning time (hours)
      assessment.estimatedLearningTime = Math.max(
        content.measures * assessment.overall * 0.5,
        assessment.overall * 2
      )

      return assessment
    } catch (error) {
      console.error('Error evaluating difficulty:', error)
      throw error
    }
  }

  /**
   * Assesses performance readiness for a specific piece
   */
  async assessPerformanceReadiness(
    pieceId: string,
    userId: string
  ): Promise<PerformanceReadiness> {
    try {
      // Load piece analytics
      const analytics = await this.storage.get<PieceAnalytics>(
        `analytics:piece:${pieceId}:${userId}`
      )

      if (!analytics) {
        return {
          pieceId,
          userId,
          overallReadiness: 0,
          criteria: {
            technical: {
              score: 0,
              notes: ['Piece not found or no practice data'],
            },
            musical: { score: 0, notes: ['No performance data available'] },
            memorization: { score: 0, notes: ['Not practiced'] },
            stability: { score: 0, notes: ['Insufficient data'] },
            polish: { score: 0, notes: ['Needs practice'] },
          },
          recommendedActions: ['Piece not found'],
          estimatedTimeToReadiness: 0,
          assessedAt: Date.now(),
        }
      }

      const criteria = {
        technical: this.assessTechnicalReadiness(analytics),
        musical: this.assessMusicalReadiness(analytics),
        memorization: this.assessMemorizationReadiness(analytics),
        stability: this.assessStabilityReadiness(analytics),
        polish: this.assessPolishReadiness(analytics),
      }

      const overallReadiness = Math.round(
        (criteria.technical.score +
          criteria.musical.score +
          criteria.memorization.score +
          criteria.stability.score +
          criteria.polish.score) /
          5
      )

      const recommendedActions = this.generateReadinessRecommendations(criteria)
      const estimatedTimeToReadiness = this.calculateTimeToReadiness(
        criteria,
        overallReadiness
      )

      return {
        pieceId,
        userId,
        overallReadiness,
        criteria,
        recommendedActions,
        estimatedTimeToReadiness,
        assessedAt: Date.now(),
      }
    } catch (error) {
      console.error('Error assessing performance readiness:', error)
      throw error
    }
  }

  /**
   * Generates maintenance schedule for learned repertoire
   */
  async scheduleMaintenancePractice(
    userId: string
  ): Promise<MaintenanceSchedule[]> {
    try {
      const schedule: MaintenanceSchedule[] = []

      // Get all piece analytics for the user
      const keys = await this.storage.getKeys()
      const analyticsKeys = keys.filter(
        k => k.startsWith(`analytics:piece:`) && k.includes(userId)
      )

      for (const key of analyticsKeys) {
        const analytics = await this.storage.get<PieceAnalytics>(key)
        if (!analytics) continue

        const daysSinceLastPractice = Math.floor(
          (Date.now() - analytics.updatedAt) / (1000 * 60 * 60 * 24)
        )

        let skill: MaintenanceSchedule['skill'] = 'maintaining'
        let priority: MaintenanceSchedule['priority'] = 'medium'
        let frequency: MaintenanceSchedule['recommendedFrequency'] = 'weekly'
        let maintenanceType: MaintenanceSchedule['maintenanceType'] =
          'full-runthrough'

        // Determine skill status based on practice frequency and accuracy
        if (daysSinceLastPractice > 30) {
          skill = 'forgotten'
          priority = 'high'
          frequency = 'daily'
          maintenanceType = 'memory-refresh'
        } else if (
          daysSinceLastPractice > 14 ||
          analytics.averageAccuracy < 0.8
        ) {
          skill = 'declining'
          priority = 'high'
          frequency = 'weekly'
          maintenanceType = 'problem-spots'
        }

        // Check for upcoming performances
        const performanceReadiness =
          await this.storage.get<PerformanceReadiness>(
            `readiness:${analytics.pieceId}:${userId}`
          )

        if (performanceReadiness?.performanceDate) {
          const daysToPerformance = Math.floor(
            (performanceReadiness.performanceDate - Date.now()) /
              (1000 * 60 * 60 * 24)
          )

          if (daysToPerformance <= 14) {
            priority = 'high'
            frequency = 'daily'
            maintenanceType = 'full-runthrough'
          }
        }

        const nextPracticeDate = this.calculateNextPracticeDate(
          frequency,
          analytics.updatedAt
        )

        schedule.push({
          pieceId: analytics.pieceId,
          userId,
          lastPracticed: analytics.updatedAt,
          practiceFrequency:
            analytics.sessionsCount / Math.max(1, daysSinceLastPractice / 7),
          skill,
          priority,
          recommendedFrequency: frequency,
          nextPracticeDate,
          maintenanceType,
          estimatedTime: this.estimateMaintenanceTime(
            maintenanceType,
            analytics
          ),
        })
      }

      // Sort by priority and next practice date
      schedule.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return (
          priorityOrder[a.priority] - priorityOrder[b.priority] ||
          a.nextPracticeDate - b.nextPracticeDate
        )
      })

      return schedule
    } catch (error) {
      console.error('Error generating maintenance schedule:', error)
      return []
    }
  }

  // Private helper methods for enhanced features

  private validatePracticeConfig(config: PracticeConfig): void {
    if (config.measures && config.measures.start >= config.measures.end) {
      throw new Error('Invalid measure range: start must be less than end')
    }

    if (config.tempo) {
      if (
        config.tempo.start <= 0 ||
        config.tempo.target <= 0 ||
        config.tempo.increment <= 0
      ) {
        throw new Error('Invalid tempo configuration: values must be positive')
      }
    }

    if (config.repetitions) {
      if (
        config.repetitions.target <= 0 ||
        config.repetitions.maxAttempts <= 0
      ) {
        throw new Error(
          'Invalid repetition configuration: values must be positive'
        )
      }
      if (
        config.repetitions.qualityThreshold < 0 ||
        config.repetitions.qualityThreshold > 1
      ) {
        throw new Error('Invalid quality threshold: must be between 0 and 1')
      }
    }
  }

  // Technical exercise generators
  private async generateMajorScale(level: number): Promise<TechnicalExercise> {
    const keys = [
      'C',
      'G',
      'D',
      'A',
      'E',
      'B',
      'F#',
      'F',
      'Bb',
      'Eb',
      'Ab',
      'Db',
    ]
    const key = keys[Math.min(level - 1, keys.length - 1)]

    return {
      id: `scale_major_${key}_${Date.now()}`,
      name: `${key} Major Scale`,
      category: 'scale',
      instrument: this.config.instrument,
      level,
      key,
      fingering:
        this.config.instrument === 'piano'
          ? [1, 2, 3, 1, 2, 3, 4, 5]
          : [0, 2, 3, 0, 2, 3, 4, 0],
      variations: [
        {
          id: 'v1',
          name: 'Parallel Motion',
          description: 'Both hands playing in parallel',
          difficulty: level,
        },
        {
          id: 'v2',
          name: 'Contrary Motion',
          description: 'Hands moving in opposite directions',
          difficulty: level + 1,
        },
      ],
      estimatedDuration: Math.max(5, level * 2),
      metadata: {
        focus: ['finger-technique', 'hand-coordination'],
        benefits: [
          'Develops finger independence',
          'Improves hand coordination',
        ],
        prerequisites: level > 3 ? ['basic-scales'] : [],
      },
    }
  }

  private async generateMajorArpeggio(
    level: number
  ): Promise<TechnicalExercise> {
    const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb']
    const key = keys[Math.min(level - 1, keys.length - 1)]

    return {
      id: `arpeggio_major_${key}_${Date.now()}`,
      name: `${key} Major Arpeggio`,
      category: 'arpeggio',
      instrument: this.config.instrument,
      level,
      key,
      fingering:
        this.config.instrument === 'piano' ? [1, 2, 3, 5] : [1, 2, 4, 1],
      variations: [
        {
          id: 'v1',
          name: 'Solid Form',
          description: 'Block chord form',
          difficulty: level,
        },
        {
          id: 'v2',
          name: 'Broken Form',
          description: 'Arpeggiated form',
          difficulty: level + 1,
        },
      ],
      estimatedDuration: Math.max(8, level * 3),
      metadata: {
        focus: ['chord-knowledge', 'finger-technique'],
        benefits: ['Develops chord familiarity', 'Improves finger technique'],
        prerequisites: level > 2 ? ['basic-chords'] : [],
      },
    }
  }

  private async generateFingerIndependence(
    level: number
  ): Promise<TechnicalExercise> {
    return {
      id: `finger_independence_${level}_${Date.now()}`,
      name: `Finger Independence Exercise Level ${level}`,
      category: 'finger-independence',
      instrument: this.config.instrument,
      level,
      pattern: `Pattern ${level}`,
      variations: [
        {
          id: 'v1',
          name: 'Basic Pattern',
          description: 'Basic finger independence pattern',
          difficulty: level,
        },
        {
          id: 'v2',
          name: 'Advanced Pattern',
          description: 'Advanced finger independence with rhythm',
          difficulty: level + 1,
        },
      ],
      estimatedDuration: Math.max(10, level * 4),
      metadata: {
        focus: ['finger-independence', 'hand-coordination'],
        benefits: ['Develops finger independence', 'Improves dexterity'],
        prerequisites: level > 5 ? ['intermediate-technique'] : [],
      },
    }
  }

  // Add placeholder implementations for other exercise generators
  private async generateMinorScale(level: number): Promise<TechnicalExercise> {
    return {
      ...(await this.generateMajorScale(level)),
      name: 'Minor Scale Exercise',
    }
  }

  private async generateMinorArpeggio(
    level: number
  ): Promise<TechnicalExercise> {
    return {
      ...(await this.generateMajorArpeggio(level)),
      name: 'Minor Arpeggio Exercise',
    }
  }

  private async generateHanonExercise(
    level: number
  ): Promise<TechnicalExercise> {
    return {
      ...(await this.generateFingerIndependence(level)),
      name: `Hanon Exercise ${level}`,
    }
  }

  private async generateChordProgression(
    level: number
  ): Promise<TechnicalExercise> {
    return {
      ...(await this.generateMajorArpeggio(level)),
      name: 'Chord Progression Exercise',
      category: 'chord',
    }
  }

  private async generateChromaticScale(
    level: number
  ): Promise<TechnicalExercise> {
    return {
      ...(await this.generateMajorScale(level)),
      name: 'Chromatic Scale Exercise',
    }
  }

  private async generateDominantSeventh(
    level: number
  ): Promise<TechnicalExercise> {
    return {
      ...(await this.generateMajorArpeggio(level)),
      name: 'Dominant 7th Exercise',
    }
  }

  private async generateDiminishedSeventh(
    level: number
  ): Promise<TechnicalExercise> {
    return {
      ...(await this.generateMajorArpeggio(level)),
      name: 'Diminished 7th Exercise',
    }
  }

  private async generateAlbertiBass(level: number): Promise<TechnicalExercise> {
    return {
      ...(await this.generateMajorArpeggio(level)),
      name: 'Alberti Bass Exercise',
      category: 'pattern',
    }
  }

  private async generateTremolo(level: number): Promise<TechnicalExercise> {
    return {
      ...(await this.generateFingerIndependence(level)),
      name: 'Tremolo Exercise',
      category: 'technique',
    }
  }

  private async generateTrill(level: number): Promise<TechnicalExercise> {
    return {
      ...(await this.generateFingerIndependence(level)),
      name: 'Trill Exercise',
      category: 'technique',
    }
  }

  private async generateOctaveStudy(level: number): Promise<TechnicalExercise> {
    return {
      ...(await this.generateMajorScale(level)),
      name: 'Octave Study Exercise',
      category: 'technique',
    }
  }

  // Difficulty assessment helpers
  private assessTechnicalDifficulty(content: MusicContent): number {
    let score = 1

    // Base score on number of measures and fingering complexity
    if (content.measures > 50) score += 2
    if (content.measures > 100) score += 2

    if (content.fingering && content.fingering.length > 0) {
      const avgFingeringComplexity =
        content.fingering.reduce((sum, fingers) => sum + fingers.length, 0) /
        content.fingering.length
      score += Math.min(3, avgFingeringComplexity / 2)
    }

    return Math.min(10, score)
  }

  private assessRhythmicDifficulty(content: MusicContent): number {
    // Simplified assessment - would analyze actual rhythmic patterns in real implementation
    let score = Math.min(8, Math.floor(content.measures / 20) + 1)
    return score
  }

  private assessHarmonicDifficulty(content: MusicContent): number {
    // Simplified assessment - would analyze harmonic complexity
    let score = Math.min(7, Math.floor(content.measures / 30) + 2)
    return score
  }

  private assessMusicalDifficulty(content: MusicContent): number {
    // Simplified assessment - would analyze musical expression requirements
    let score = Math.min(6, Math.floor(content.measures / 25) + 1)
    return score
  }

  private assessCognitiveDifficulty(content: MusicContent): number {
    // Simplified assessment - would analyze reading complexity
    let score = Math.min(9, Math.floor(content.measures / 15) + 1)
    return score
  }

  // Performance readiness assessment helpers
  private assessTechnicalReadiness(analytics: PieceAnalytics): {
    score: number
    notes: string[]
  } {
    const score = Math.min(100, analytics.averageAccuracy * 100)
    const notes = []

    if (score < 80) notes.push('Work on technical accuracy')
    if (
      analytics.tempoProgress.current <
      analytics.tempoProgress.target * 0.9
    ) {
      notes.push('Continue tempo development')
    }

    return { score, notes }
  }

  private assessMusicalReadiness(analytics: PieceAnalytics): {
    score: number
    notes: string[]
  } {
    // Simplified - would assess musical expression
    const score = Math.min(100, (analytics.averageAccuracy + 0.1) * 90)
    const notes = score < 75 ? ['Focus on musical expression'] : []
    return { score, notes }
  }

  private assessMemorizationReadiness(analytics: PieceAnalytics): {
    score: number
    notes: string[]
  } {
    // Check if piece has been practiced from memory recently
    const memoryScore = analytics.performanceHistory.some(
      p =>
        p.type === 'performance' &&
        Date.now() - p.date < 30 * 24 * 60 * 60 * 1000
    )
      ? 85
      : 30

    const notes =
      memoryScore < 70
        ? ['Work on memorization', 'Practice without sheet music']
        : []
    return { score: memoryScore, notes }
  }

  private assessStabilityReadiness(analytics: PieceAnalytics): {
    score: number
    notes: string[]
  } {
    const consistencyScore =
      analytics.sessionsCount > 5
        ? Math.min(100, analytics.averageAccuracy * 95)
        : 40

    const notes =
      consistencyScore < 75
        ? ['Practice more consistently', 'Focus on problem areas']
        : []
    return { score: consistencyScore, notes }
  }

  private assessPolishReadiness(analytics: PieceAnalytics): {
    score: number
    notes: string[]
  } {
    const polishScore =
      analytics.totalPracticeTime > 1800 // 30 minutes
        ? Math.min(100, analytics.bestAccuracy * 90)
        : 50

    const notes =
      polishScore < 80
        ? ['Work on musical details', 'Refine interpretation']
        : []
    return { score: polishScore, notes }
  }

  private generateReadinessRecommendations(
    criteria: PerformanceReadiness['criteria']
  ): string[] {
    const recommendations: string[] = []

    Object.entries(criteria).forEach(([key, value]) => {
      if (value.score < 75) {
        recommendations.push(`Improve ${key}: ${value.notes.join(', ')}`)
      }
    })

    return recommendations.length > 0
      ? recommendations
      : ['Ready for performance!']
  }

  private calculateTimeToReadiness(
    criteria: PerformanceReadiness['criteria'],
    overall: number
  ): number {
    if (overall >= 85) return 0

    const hoursNeeded = Object.values(criteria).reduce((sum, criterion) => {
      if (criterion.score < 75) {
        return sum + (75 - criterion.score) * 0.5 // 30 minutes per point needed
      }
      return sum
    }, 0)

    return Math.ceil(hoursNeeded)
  }

  private calculateNextPracticeDate(
    frequency: MaintenanceSchedule['recommendedFrequency'],
    lastPracticed: number
  ): number {
    const intervals = {
      daily: 1,
      weekly: 7,
      biweekly: 14,
      monthly: 30,
    }

    return lastPracticed + intervals[frequency] * 24 * 60 * 60 * 1000
  }

  private estimateMaintenanceTime(
    type: MaintenanceSchedule['maintenanceType'],
    analytics: PieceAnalytics
  ): number {
    const baseTimes = {
      'full-runthrough': 20,
      'problem-spots': 15,
      'memory-refresh': 10,
    }

    return Math.min(
      60,
      baseTimes[type] + Math.floor(analytics.totalPracticeTime / 3600)
    )
  }
}
