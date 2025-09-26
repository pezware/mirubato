/**
 * Score ID Normalization Utilities for Scores Service
 *
 * This module provides consistent score ID generation alongside the existing slug system.
 * The Scores service maintains both slug (for URLs) and normalized_id (for cross-service consistency).
 *
 * IMPORTANT: This must remain synchronized with api/src/utils/scoreIdNormalizer.ts
 * and frontendv2/src/utils/scoreIdNormalizer.ts
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
 * Regex used to detect canonical Scorebook IDs that should not be rewritten.
 */
const CANONICAL_SCORE_ID_PATTERN = /^score_[a-z0-9]+(?:[-_][a-z0-9]+)*$/i

/**
 * Determines whether a score ID is a canonical Scorebook ID.
 */
export function isCanonicalScoreId(scoreId: string): boolean {
  return CANONICAL_SCORE_ID_PATTERN.test(scoreId.trim())
}

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
 * Normalizes an existing score ID to ensure consistent format
 * This helps fix legacy IDs and ensures new format is used
 * @param scoreId - The score ID to normalize
 * @returns Normalized score ID in new format
 */
export function normalizeExistingScoreId(scoreId: string): string {
  const trimmed = scoreId.trim()

  if (!trimmed) {
    return trimmed
  }

  if (isCanonicalScoreId(trimmed)) {
    return trimmed
  }

  const parsed = parseScoreId(trimmed)

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
