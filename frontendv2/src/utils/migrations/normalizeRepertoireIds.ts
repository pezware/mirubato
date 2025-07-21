import { generateNormalizedScoreId } from '../scoreIdNormalizer'

/**
 * Migration to normalize existing repertoire scoreIds in localStorage
 * This ensures that "Bourrée in E minor" and "Bourrée in E Minor" are treated as the same piece
 */
export function normalizeRepertoireIds(): void {
  const REPERTOIRE_KEY = 'mirubato:repertoire:items'

  try {
    const stored = localStorage.getItem(REPERTOIRE_KEY)
    if (!stored) return

    const items = JSON.parse(stored)
    if (!Array.isArray(items)) return

    // Create a map to track normalized IDs and merge duplicates
    const normalizedMap = new Map()

    items.forEach(item => {
      // Skip if this isn't a logbook piece (doesn't have hyphen in scoreId)
      if (!item.scoreId || !item.scoreId.includes('-')) {
        normalizedMap.set(item.scoreId, item)
        return
      }

      // Try to extract title and composer from the scoreId
      const lastHyphenIndex = item.scoreId.lastIndexOf('-')
      if (lastHyphenIndex === -1) {
        normalizedMap.set(item.scoreId, item)
        return
      }

      const title = item.scoreId.substring(0, lastHyphenIndex)
      const composer = item.scoreId.substring(lastHyphenIndex + 1)

      // Generate normalized scoreId
      const normalizedId = generateNormalizedScoreId(title, composer)

      // Check if we already have an item with this normalized ID
      const existing = normalizedMap.get(normalizedId)
      if (existing) {
        // Merge the items - keep the one with more data
        const merged = {
          ...existing,
          // Keep the higher practice count
          practiceCount: Math.max(
            existing.practiceCount || 0,
            item.practiceCount || 0
          ),
          // Keep the higher total practice time
          totalPracticeTime: Math.max(
            existing.totalPracticeTime || 0,
            item.totalPracticeTime || 0
          ),
          // Keep the most recent last practiced date
          lastPracticed: Math.max(
            existing.lastPracticed || 0,
            item.lastPracticed || 0
          ),
          // Keep the earliest created date
          createdAt: Math.min(
            existing.createdAt || Date.now(),
            item.createdAt || Date.now()
          ),
          // Keep the most recent updated date
          updatedAt: Math.max(
            existing.updatedAt || Date.now(),
            item.updatedAt || Date.now()
          ),
          // Keep personal notes if one doesn't have them
          personalNotes: existing.personalNotes || item.personalNotes,
          // Merge reference links
          referenceLinks: [
            ...new Set([
              ...(existing.referenceLinks || []),
              ...(item.referenceLinks || []),
            ]),
          ],
        }
        normalizedMap.set(normalizedId, merged)
      } else {
        // Update the scoreId to normalized version
        item.scoreId = normalizedId
        normalizedMap.set(normalizedId, item)
      }
    })

    // Convert back to array and save
    const normalizedItems = Array.from(normalizedMap.values())
    localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(normalizedItems))

    console.log(
      `Normalized ${items.length} repertoire items to ${normalizedItems.length} unique items`
    )
  } catch (error) {
    console.error('Error normalizing repertoire IDs:', error)
  }
}
