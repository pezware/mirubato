/**
 * @mirubato/utils
 *
 * Shared utilities for Mirubato services.
 * This package provides cross-platform utilities used by frontend,
 * backend workers, and other services.
 */

// Score ID normalization utilities
export {
  normalizePieceTitle,
  normalizeComposer,
  isCanonicalScoreId,
  generateNormalizedScoreId,
  parseScoreId,
  isSameScore,
  levenshteinDistance,
  calculateSimilarity,
  findSimilarPieces,
  isSameScoreWithFuzzy,
  normalizeExistingScoreId,
} from './scoreIdNormalizer'

export type { DuplicateMatch } from './scoreIdNormalizer'
