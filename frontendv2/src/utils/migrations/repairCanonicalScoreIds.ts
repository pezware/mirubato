/**
 * Migration to repair corrupted canonical scoreIds
 *
 * This migration fixes scoreIds that were incorrectly transformed from
 * canonical format (score_abc123) to corrupted format (score_abc123-unknown).
 * This corruption prevented users from deleting repertoire items because
 * the system couldn't find the corresponding score records.
 */

import { isCanonicalScoreId } from '../scoreIdNormalizer'

const REPAIR_MIGRATION_KEY = 'mirubato:canonical-scoreId-repair-v1'

interface MigratableEntry {
  id: string
  scoreId?: string
  pieces?: Array<{
    id?: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}

interface MigratableRepertoireItem {
  scoreId?: string
  score_id?: string
  [key: string]: unknown
}

/**
 * Detects if a scoreId is a corrupted canonical ID
 * Pattern: score_[identifier]-unknown
 * @param scoreId - The scoreId to check
 * @returns The original canonical ID if corrupted, null otherwise
 */
function detectAndExtractCanonicalId(scoreId: string): string | null {
  if (!scoreId || typeof scoreId !== 'string') {
    return null
  }

  // Pattern to detect corrupted canonical IDs
  // Matches: score_abc123-unknown, score_abc-123-unknown, etc.
  const corruptedPattern = /^(score_[a-z0-9]+(?:[-_][a-z0-9]+)*)-unknown$/i
  const match = scoreId.match(corruptedPattern)

  if (match) {
    const originalId = match[1]
    // Verify it would be a valid canonical ID
    if (isCanonicalScoreId(originalId)) {
      return originalId
    }
  }

  return null
}

/**
 * Repairs corrupted canonical scoreIds in localStorage
 * This function is idempotent - safe to run multiple times
 */
export function repairCorruptedCanonicalIds(): void {
  // Check if migration has already run
  if (localStorage.getItem(REPAIR_MIGRATION_KEY)) {
    console.log('[Migration] Canonical scoreId repair already completed')
    return
  }

  console.log('[Migration] Starting repair of corrupted canonical scoreIds...')

  let entriesRepaired = 0
  let piecesRepaired = 0
  let repertoireRepaired = 0
  let totalRepairs = 0

  try {
    // 1. Fix logbook entries
    const entriesKey = 'mirubato:logbook:entries'
    const storedEntries = localStorage.getItem(entriesKey)

    if (storedEntries) {
      try {
        const entries = JSON.parse(storedEntries) as MigratableEntry[]
        let hasChanges = false

        const repairedEntries = entries.map(entry => {
          let entryModified = false
          const repairedEntry = { ...entry }

          // Check main scoreId field
          if (repairedEntry.scoreId) {
            const originalId = detectAndExtractCanonicalId(repairedEntry.scoreId)
            if (originalId) {
              console.log(
                `[Migration] Repairing entry scoreId: "${repairedEntry.scoreId}" -> "${originalId}"`
              )
              repairedEntry.scoreId = originalId
              entryModified = true
              totalRepairs++
            }
          }

          // Check pieces array
          if (repairedEntry.pieces && Array.isArray(repairedEntry.pieces)) {
            repairedEntry.pieces = repairedEntry.pieces.map(piece => {
              if (piece && piece.id) {
                const originalId = detectAndExtractCanonicalId(piece.id as string)
                if (originalId) {
                  console.log(
                    `[Migration] Repairing piece ID: "${piece.id}" -> "${originalId}"`
                  )
                  piece.id = originalId
                  entryModified = true
                  piecesRepaired++
                  totalRepairs++
                }
              }
              return piece
            })
          }

          if (entryModified) {
            entriesRepaired++
            hasChanges = true
          }

          return repairedEntry
        })

        if (hasChanges) {
          localStorage.setItem(entriesKey, JSON.stringify(repairedEntries))
          console.log(`[Migration] Repaired ${entriesRepaired} logbook entries, ${piecesRepaired} pieces`)
        }
      } catch (error) {
        console.error('[Migration] Failed to repair logbook entries:', error)
        // Don't throw - continue with other repairs
      }
    }

    // 2. Fix repertoire items
    const repertoireKey = 'mirubato:repertoire:items'
    const storedRepertoire = localStorage.getItem(repertoireKey)

    if (storedRepertoire) {
      try {
        const items = JSON.parse(storedRepertoire) as MigratableRepertoireItem[]
        let hasChanges = false

        const repairedItems = items.map(item => {
          const repairedItem = { ...item }
          let itemModified = false

          // Check scoreId field
          if (repairedItem.scoreId) {
            const originalId = detectAndExtractCanonicalId(repairedItem.scoreId)
            if (originalId) {
              console.log(
                `[Migration] Repairing repertoire scoreId: "${repairedItem.scoreId}" -> "${originalId}"`
              )
              repairedItem.scoreId = originalId
              itemModified = true
              repertoireRepaired++
              totalRepairs++
            }
          }

          // Also check score_id field (backend format)
          if (repairedItem.score_id) {
            const originalId = detectAndExtractCanonicalId(repairedItem.score_id)
            if (originalId) {
              console.log(
                `[Migration] Repairing repertoire score_id: "${repairedItem.score_id}" -> "${originalId}"`
              )
              repairedItem.score_id = originalId
              itemModified = true
              if (!repairedItem.scoreId) {
                repertoireRepaired++
                totalRepairs++
              }
            }
          }

          if (itemModified) {
            hasChanges = true
          }

          return repairedItem
        })

        if (hasChanges) {
          localStorage.setItem(repertoireKey, JSON.stringify(repairedItems))
          console.log(`[Migration] Repaired ${repertoireRepaired} repertoire items`)
        }
      } catch (error) {
        console.error('[Migration] Failed to repair repertoire items:', error)
        // Don't throw - mark migration as complete anyway
      }
    }

    // 3. Fix repertoire goals if they exist
    const goalsKey = 'mirubato:repertoire:goals'
    const storedGoals = localStorage.getItem(goalsKey)

    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals)
        let goalsRepaired = 0
        let hasChanges = false

        const repairedGoals = goals.map((goal: unknown) => {
          const typedGoal = goal as { scoreId?: string }
          if (typedGoal.scoreId) {
            const originalId = detectAndExtractCanonicalId(typedGoal.scoreId)
            if (originalId) {
              console.log(
                `[Migration] Repairing goal scoreId: "${typedGoal.scoreId}" -> "${originalId}"`
              )
              typedGoal.scoreId = originalId
              goalsRepaired++
              totalRepairs++
              hasChanges = true
            }
          }
          return typedGoal
        })

        if (hasChanges) {
          localStorage.setItem(goalsKey, JSON.stringify(repairedGoals))
          console.log(`[Migration] Repaired ${goalsRepaired} repertoire goals`)
        }
      } catch (error) {
        console.error('[Migration] Failed to repair repertoire goals:', error)
        // Don't throw - not critical
      }
    }

    // Mark migration as complete
    localStorage.setItem(REPAIR_MIGRATION_KEY, new Date().toISOString())

    if (totalRepairs > 0) {
      console.log(
        `[Migration] ✅ Successfully repaired ${totalRepairs} corrupted canonical scoreIds`
      )
      console.log(
        `[Migration] Summary: ${entriesRepaired} entries, ${piecesRepaired} pieces, ${repertoireRepaired} repertoire items`
      )
    } else {
      console.log('[Migration] No corrupted canonical scoreIds found - data is clean')
    }
  } catch (error) {
    console.error('[Migration] Unexpected error during canonical scoreId repair:', error)
    // Still mark as complete to avoid running repeatedly on error
    localStorage.setItem(REPAIR_MIGRATION_KEY, new Date().toISOString())
  }
}

/**
 * Force re-run the migration (useful for testing or manual repair)
 */
export function forceRepairCanonicalIds(): void {
  localStorage.removeItem(REPAIR_MIGRATION_KEY)
  repairCorruptedCanonicalIds()
}