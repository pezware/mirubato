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

  return normalized1 === normalized2
}
