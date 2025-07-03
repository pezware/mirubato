import type { D1Database } from '@cloudflare/workers-types'
import type { CollectionVisibility } from '../types/collections'
import { generateId } from '../utils/generateId'

export class VisibilityService {
  constructor(private db: D1Database) {}

  /**
   * Update a score's derived visibility based on its collections
   */
  async updateScoreVisibility(
    scoreId: string,
    changedBy: string
  ): Promise<void> {
    // Get all collections containing this score
    const collections = await this.db
      .prepare(
        `SELECT uc.visibility, uc.featured_at 
         FROM collection_members cm
         JOIN user_collections uc ON cm.collection_id = uc.id
         WHERE cm.score_id = ?`
      )
      .bind(scoreId)
      .all()

    // Determine the most permissive visibility
    let derivedVisibility: CollectionVisibility = 'private'

    for (const collection of collections.results) {
      if (collection.visibility === 'public' || collection.featured_at) {
        derivedVisibility = 'public'
        break // Public is the most permissive, no need to check further
      } else if (
        collection.visibility === 'unlisted' &&
        derivedVisibility === 'private'
      ) {
        derivedVisibility = 'unlisted'
      }
    }

    // Get current visibility
    const currentScore = await this.db
      .prepare('SELECT visibility, derived_visibility FROM scores WHERE id = ?')
      .bind(scoreId)
      .first()

    if (!currentScore) {
      throw new Error('Score not found')
    }

    // Update if changed
    if (currentScore.derived_visibility !== derivedVisibility) {
      // Log the change
      await this.db
        .prepare(
          `INSERT INTO collection_visibility_log 
           (id, collection_id, score_id, old_visibility, new_visibility, changed_by)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          generateId(),
          'system', // System-generated change
          scoreId,
          currentScore.derived_visibility || currentScore.visibility,
          derivedVisibility,
          changedBy
        )
        .run()

      // Update the score
      await this.db
        .prepare('UPDATE scores SET derived_visibility = ? WHERE id = ?')
        .bind(derivedVisibility, scoreId)
        .run()
    }
  }

  /**
   * Update all scores in a collection when its visibility changes
   */
  async updateCollectionScoresVisibility(
    collectionId: string,
    changedBy: string
  ): Promise<void> {
    // Get all scores in the collection
    const members = await this.db
      .prepare(
        'SELECT score_id FROM collection_members WHERE collection_id = ?'
      )
      .bind(collectionId)
      .all()

    // Update each score's visibility
    for (const member of members.results) {
      await this.updateScoreVisibility(member.score_id as string, changedBy)
    }
  }

  /**
   * Check if a score would become public by adding to a collection
   */
  async wouldBecomePublic(
    scoreId: string,
    collectionId: string
  ): Promise<boolean> {
    const collection = await this.db
      .prepare(
        'SELECT visibility, featured_at FROM user_collections WHERE id = ?'
      )
      .bind(collectionId)
      .first()

    if (!collection) {
      throw new Error('Collection not found')
    }

    return collection.visibility === 'public' || !!collection.featured_at
  }

  /**
   * Get visibility summary for a score
   */
  async getScoreVisibilitySummary(scoreId: string): Promise<{
    originalVisibility: CollectionVisibility
    derivedVisibility?: CollectionVisibility
    publicCollections: Array<{ id: string; name: string }>
    privateCollections: Array<{ id: string; name: string }>
  }> {
    const score = await this.db
      .prepare('SELECT visibility, derived_visibility FROM scores WHERE id = ?')
      .bind(scoreId)
      .first()

    if (!score) {
      throw new Error('Score not found')
    }

    // Get collections grouped by visibility
    const collections = await this.db
      .prepare(
        `SELECT uc.id, uc.name, uc.visibility, uc.featured_at
         FROM collection_members cm
         JOIN user_collections uc ON cm.collection_id = uc.id
         WHERE cm.score_id = ?`
      )
      .bind(scoreId)
      .all()

    const publicCollections = collections.results
      .filter(c => c.visibility === 'public' || c.featured_at)
      .map(c => ({ id: c.id as string, name: c.name as string }))

    const privateCollections = collections.results
      .filter(c => c.visibility === 'private' && !c.featured_at)
      .map(c => ({ id: c.id as string, name: c.name as string }))

    return {
      originalVisibility: score.visibility as CollectionVisibility,
      derivedVisibility: score.derived_visibility as
        | CollectionVisibility
        | undefined,
      publicCollections,
      privateCollections,
    }
  }

  /**
   * Create a default "General" collection for a user
   */
  async createDefaultCollection(userId: string): Promise<string> {
    const collectionId = generateId()
    const slug = `general-${userId.substring(0, 8)}`

    await this.db
      .prepare(
        `INSERT INTO user_collections (
          id, user_id, name, description, slug, visibility,
          is_default, collection_type, owner_type, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        collectionId,
        userId,
        'General',
        'Your default collection for uploaded scores',
        slug,
        'private',
        1, // is_default = true
        'personal',
        'user',
        '["default", "general"]'
      )
      .run()

    return collectionId
  }

  /**
   * Get or create default collection for a user
   */
  async getOrCreateDefaultCollection(userId: string): Promise<string> {
    const existing = await this.db
      .prepare(
        'SELECT id FROM user_collections WHERE user_id = ? AND is_default = 1'
      )
      .bind(userId)
      .first()

    if (existing) {
      return existing.id as string
    }

    return this.createDefaultCollection(userId)
  }
}
