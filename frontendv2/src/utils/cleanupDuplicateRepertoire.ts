import { RepertoireItem } from '@/api/repertoire'
import { isSameScore, normalizeExistingScoreId } from './scoreIdNormalizer'

/**
 * Finds and removes duplicate repertoire entries
 * Keeps the entry with the most practice data
 * @param repertoire - Map of repertoire items
 * @returns Cleaned repertoire map and list of removed duplicates
 */
export function cleanupDuplicateRepertoire(
  repertoire: Map<string, RepertoireItem>
): {
  cleaned: Map<string, RepertoireItem>
  duplicates: Array<{ kept: RepertoireItem; removed: RepertoireItem[] }>
} {
  const cleaned = new Map<string, RepertoireItem>()
  const duplicates: Array<{ kept: RepertoireItem; removed: RepertoireItem[] }> =
    []
  const processed = new Set<string>()

  // Process items

  repertoire.forEach((item, scoreId) => {
    if (processed.has(scoreId)) return

    const normalizedId = normalizeExistingScoreId(scoreId)
    const group: RepertoireItem[] = [item]
    processed.add(scoreId)

    // Find all other items that match this one
    repertoire.forEach((otherItem, otherScoreId) => {
      if (scoreId !== otherScoreId && !processed.has(otherScoreId)) {
        if (isSameScore(scoreId, otherScoreId)) {
          group.push(otherItem)
          processed.add(otherScoreId)
        }
      }
    })

    if (group.length > 1) {
      // Sort by practice data to keep the most used one
      group.sort((a, b) => {
        // Priority: most practice time
        if (a.totalPracticeTime !== b.totalPracticeTime) {
          return (b.totalPracticeTime || 0) - (a.totalPracticeTime || 0)
        }
        // Then by practice count
        if (a.practiceCount !== b.practiceCount) {
          return (b.practiceCount || 0) - (a.practiceCount || 0)
        }
        // Then by most recent practice
        if (a.lastPracticed !== b.lastPracticed) {
          return (b.lastPracticed || 0) - (a.lastPracticed || 0)
        }
        // Finally by creation date
        return b.createdAt - a.createdAt
      })

      const kept = group[0]
      const removed = group.slice(1)

      // Update the kept item with normalized scoreId
      const normalizedKept = {
        ...kept,
        scoreId: normalizedId,
        // Merge practice data from duplicates
        totalPracticeTime: group.reduce(
          (sum, item) => sum + (item.totalPracticeTime || 0),
          0
        ),
        practiceCount: group.reduce(
          (sum, item) => sum + (item.practiceCount || 0),
          0
        ),
        lastPracticed: Math.max(...group.map(item => item.lastPracticed || 0)),
      }

      cleaned.set(normalizedId, normalizedKept)
      duplicates.push({ kept: normalizedKept, removed })
    } else {
      // Single item, just normalize the ID
      const normalizedId = normalizeExistingScoreId(scoreId)
      cleaned.set(normalizedId, { ...item, scoreId: normalizedId })
    }
  })

  return { cleaned, duplicates }
}
