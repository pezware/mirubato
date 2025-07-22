/**
 * Normalizes a piece title for consistent score ID generation
 * @param title - The piece title to normalize
 * @returns Normalized title in lowercase with consistent formatting
 */
export function normalizePieceTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/[–—]/g, '-') // Normalize dashes
}

/**
 * Normalizes a composer name for consistent score ID generation
 * @param composer - The composer name to normalize
 * @returns Normalized composer name in lowercase with consistent formatting
 */
export function normalizeComposer(composer: string): string {
  return composer
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/\./g, '') // Remove periods (e.g., "J.S. Bach" -> "js bach")
}

/**
 * Generates a normalized score ID from piece title and composer
 * @param title - The piece title
 * @param composer - The composer name (optional)
 * @returns Normalized score ID
 */
export function generateNormalizedScoreId(
  title: string,
  composer?: string | null
): string {
  const normalizedTitle = normalizePieceTitle(title)

  if (composer) {
    const normalizedComposer = normalizeComposer(composer)
    return `${normalizedTitle}-${normalizedComposer}`
  }

  return normalizedTitle
}

/**
 * Checks if two score IDs refer to the same piece
 * @param scoreId1 - First score ID
 * @param scoreId2 - Second score ID
 * @returns True if they refer to the same piece
 */
export function isSameScore(scoreId1: string, scoreId2: string): boolean {
  // Normalize both score IDs and compare
  const normalized1 = scoreId1.toLowerCase().trim()
  const normalized2 = scoreId2.toLowerCase().trim()

  // Direct match
  if (normalized1 === normalized2) {
    return true
  }

  // Check if they might be the same piece with reversed order
  const parts1 = normalized1.split(' - ')
  const parts2 = normalized2.split(' - ')

  if (parts1.length === 2 && parts2.length === 2) {
    // Check if it's the same piece with reversed composer/title order
    return parts1[0] === parts2[1] && parts1[1] === parts2[0]
  }

  return false
}

/**
 * Normalizes an existing score ID to ensure consistent format
 * This helps fix legacy IDs that might have "composer - title" format
 * @param scoreId - The score ID to normalize
 * @returns Normalized score ID in "title - composer" format
 */
export function normalizeExistingScoreId(scoreId: string): string {
  const parts = scoreId.split(' - ')

  // If it's already a compound ID, ensure it's in the right order
  if (parts.length === 2) {
    const [part1, part2] = parts

    // Simple heuristic: composers often have fewer words than titles
    // and are often single names or "Firstname Lastname"
    const words1 = part1.trim().split(' ').length
    const words2 = part2.trim().split(' ').length

    // If part1 looks like a composer name (1-2 words) and part2 is longer, flip them
    if (words1 <= 2 && words2 > words1) {
      return `${part2.trim()} - ${part1.trim()}`.toLowerCase()
    }
  }

  return scoreId.toLowerCase().trim()
}
