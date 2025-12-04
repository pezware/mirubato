/**
 * Score ID Normalization Utilities
 *
 * Re-exported from @mirubato/utils for backward compatibility.
 * The canonical implementation is in packages/utils/src/scoreIdNormalizer.ts
 */

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
} from '@mirubato/utils'

export type { DuplicateMatch } from '@mirubato/utils'
