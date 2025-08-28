/**
 * Score ID Normalization Utilities
 *
 * This module provides consistent score ID generation and normalization
 * across the backend services. It must remain 100% consistent with the
 * frontend implementation to prevent data inconsistencies.
 *
 * IMPORTANT: This is an exact copy of frontendv2/src/utils/scoreIdNormalizer.ts
 * Any changes must be synchronized between both files.
 */

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
 * Delimiter used to separate title and composer in score IDs.
 * Using double pipe to avoid conflicts with dashes in piece titles.
 */
const SCORE_ID_DELIMITER = '||'

/**
 * Default delimiter for backward compatibility
 */
const DEFAULT_DELIMITER = '-'

/**
 * Generates a normalized score ID from piece title and composer
 * Smart delimiter selection:
 * - Uses '-' by default for backward compatibility
 * - Uses '||' only when title or composer contains a dash
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

    // Smart delimiter selection: only use || if there's a dash in title or composer
    // This maintains backward compatibility for existing data
    const needsSpecialDelimiter =
      normalizedTitle.includes('-') || normalizedComposer.includes('-')

    const delimiter = needsSpecialDelimiter
      ? SCORE_ID_DELIMITER
      : DEFAULT_DELIMITER

    return `${normalizedTitle}${delimiter}${normalizedComposer}`
  }

  return normalizedTitle
}

/**
 * Parses a score ID into title and composer components.
 * Handles both new format (||) and legacy format (-) for backward compatibility.
 * @param scoreId - The score ID to parse
 * @returns Object with title and composer
 */
export function parseScoreId(scoreId: string): {
  title: string
  composer: string
} {
  const normalized = scoreId.toLowerCase().trim()

  // Try new format first
  if (normalized.includes(SCORE_ID_DELIMITER)) {
    const parts = normalized.split(SCORE_ID_DELIMITER)
    return {
      title: parts[0].trim(),
      composer: parts.slice(1).join(SCORE_ID_DELIMITER).trim(),
    }
  }

  // Fall back to default format
  if (normalized.includes(DEFAULT_DELIMITER)) {
    const parts = normalized.split(DEFAULT_DELIMITER)
    if (parts.length >= 2) {
      // For default format, assume first part is title and rest is composer
      // This handles cases like "title-composer-with-dash"
      return {
        title: parts[0].trim(),
        composer: parts.slice(1).join(DEFAULT_DELIMITER).trim(),
      }
    }
  }

  // No delimiter found, assume it's just a title
  return {
    title: normalized,
    composer: '',
  }
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

  // Parse both IDs using the robust parser
  const piece1 = parseScoreId(scoreId1)
  const piece2 = parseScoreId(scoreId2)

  // Check if they're the same piece (exact match)
  if (piece1.title === piece2.title && piece1.composer === piece2.composer) {
    return true
  }

  // Check if they might be the same piece with reversed order (legacy support)
  if (piece1.title === piece2.composer && piece1.composer === piece2.title) {
    return true
  }

  return false
}

/**
 * Calculates Levenshtein distance between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Number of character edits needed to transform str1 into str2
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  // Initialize the matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  // Fill the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Calculates similarity score between two strings (0-1, where 1 is identical)
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0
  if (str1.length === 0 || str2.length === 0) return 0.0

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)

  return (maxLength - distance) / maxLength
}

/**
 * Interface for duplicate detection results
 */
export interface DuplicateMatch {
  scoreId: string
  title: string
  composer: string
  similarity: number
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Finds similar pieces based on title and composer
 * @param title - Title to search for
 * @param composer - Composer to search for
 * @param existingPieces - Array of existing pieces to check against
 * @param threshold - Minimum similarity threshold (default: 0.7)
 * @returns Array of similar pieces with similarity scores
 */
export function findSimilarPieces(
  title: string,
  composer: string | undefined | null,
  existingPieces: Array<{ scoreId: string; title: string; composer?: string }>,
  threshold: number = 0.7
): DuplicateMatch[] {
  const normalizedTitle = normalizePieceTitle(title)
  const normalizedComposer = composer ? normalizeComposer(composer) : ''

  const matches: DuplicateMatch[] = []

  existingPieces.forEach(piece => {
    const pieceNormalizedTitle = normalizePieceTitle(piece.title)
    const pieceNormalizedComposer = piece.composer
      ? normalizeComposer(piece.composer)
      : ''

    // Calculate title similarity
    const titleSimilarity = calculateSimilarity(
      normalizedTitle,
      pieceNormalizedTitle
    )

    // Calculate composer similarity (give high score if both are empty)
    let composerSimilarity = 1.0
    if (normalizedComposer || pieceNormalizedComposer) {
      if (!normalizedComposer || !pieceNormalizedComposer) {
        composerSimilarity = 0.3 // Penalize missing composer
      } else {
        composerSimilarity = calculateSimilarity(
          normalizedComposer,
          pieceNormalizedComposer
        )
      }
    }

    // Weighted average (title is more important than composer)
    const overallSimilarity = titleSimilarity * 0.7 + composerSimilarity * 0.3

    if (overallSimilarity >= threshold) {
      let confidence: 'high' | 'medium' | 'low' = 'low'

      // Determine confidence level
      if (overallSimilarity >= 0.95) {
        confidence = 'high'
      } else if (overallSimilarity >= 0.85) {
        confidence = 'medium'
      }

      matches.push({
        scoreId: piece.scoreId,
        title: piece.title,
        composer: piece.composer || '',
        similarity: overallSimilarity,
        confidence,
      })
    }
  })

  // Sort by similarity (highest first)
  return matches.sort((a, b) => b.similarity - a.similarity)
}

/**
 * Enhanced version of isSameScore that includes fuzzy matching
 * @param scoreId1 - First score ID
 * @param scoreId2 - Second score ID
 * @param threshold - Similarity threshold for fuzzy matching (default: 0.9)
 * @returns True if they refer to the same piece (exact or fuzzy match)
 */
export function isSameScoreWithFuzzy(
  scoreId1: string,
  scoreId2: string,
  threshold: number = 0.9
): boolean {
  // First try exact matching
  if (isSameScore(scoreId1, scoreId2)) {
    return true
  }

  // Try fuzzy matching by parsing the score IDs
  const piece1 = parseScoreId(scoreId1)
  const piece2 = parseScoreId(scoreId2)

  const titleSimilarity = calculateSimilarity(piece1.title, piece2.title)
  const composerSimilarity = calculateSimilarity(
    piece1.composer,
    piece2.composer
  )

  // Weighted average
  const overallSimilarity = titleSimilarity * 0.7 + composerSimilarity * 0.3

  return overallSimilarity >= threshold
}

/**
 * Normalizes an existing score ID to ensure consistent format
 * This helps fix legacy IDs and ensures new format is used
 * @param scoreId - The score ID to normalize
 * @returns Normalized score ID in new format
 */
export function normalizeExistingScoreId(scoreId: string): string {
  const parsed = parseScoreId(scoreId)

  if (parsed.composer) {
    // Reconstruct using smart delimiter selection
    const needsSpecialDelimiter =
      parsed.title.includes('-') || parsed.composer.includes('-')
    const delimiter = needsSpecialDelimiter
      ? SCORE_ID_DELIMITER
      : DEFAULT_DELIMITER

    return `${parsed.title}${delimiter}${parsed.composer}`
  }

  return parsed.title
}
