/**
 * Curriculum Module - Manages structured learning paths and repertoire
 */

import { EventBus } from '../core/EventBus'
import { StorageModule } from '../infrastructure/StorageModule'
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
  private storage: StorageModule
  private config: Required<CurriculumConfig>
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }
  private cache = new Map<string, CacheEntry<any>>()
  private readonly CACHE_TTL = 60000 // 1 minute

  constructor(storage: StorageModule, config: CurriculumConfig) {
    this.eventBus = EventBus.getInstance()
    this.storage = storage
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

      // Initialize storage if needed
      if (this.storage.initialize) {
        await this.storage.initialize()
      }

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

    await this.storage.saveLocal(`path:${newPath.id}`, newPath)
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
      this.storage.loadLocal<LearningPath>(key)
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

    const path = await this.storage.loadLocal<LearningPath>(
      `path:${update.pathId}`
    )
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

    await this.storage.saveLocal(`path:${update.pathId}`, updatedPath)
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
    await this.storage.saveLocal(`repertoire:${piece.id}`, piece)
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
      this.storage.loadLocal<RepertoirePiece>(key)
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
    await this.storage.saveLocal(`assessment:${assessmentId}`, assessment)

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
        const path = await this.storage.loadLocal<LearningPath>(pathKey)
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
      const path = await this.storage.loadLocal<LearningPath>(key)
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
      const existing = await this.storage.loadLocal<LearningPath>(
        `path:${path.id}`
      )
      if (existing && !options?.overwrite) {
        result.conflicts.push(`Path: ${path.name}`)
        continue
      }
      path.userId = userId // Assign to current user
      await this.storage.saveLocal(`path:${path.id}`, path)
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
      await this.storage.saveLocal(
        `patterns:${entry.userId}:${Date.now()}`,
        patterns
      )
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
      const repertoireData = await this.storage.loadLocal(
        'curriculum:repertoire'
      )
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
}
