/**
 * Migration utility to detect and clean up duplicate pieces in localStorage
 * This helps users who already have duplicate pieces in their data
 */

import {
  findSimilarPieces,
  generateNormalizedScoreId,
} from './scoreIdNormalizer'

interface MigrationResult {
  duplicatesFound: number
  duplicatesResolved: number
  errors: string[]
}

interface LocalStoragePiece {
  title: string
  composer?: string
  scoreId?: string
}

/**
 * Detects duplicate pieces in localStorage and provides resolution options
 * @returns Migration result with statistics
 */
export function detectLocalStorageDuplicates(): MigrationResult {
  const result: MigrationResult = {
    duplicatesFound: 0,
    duplicatesResolved: 0,
    errors: [],
  }

  try {
    // Get repertoire pieces
    const repertoireData = localStorage.getItem('mirubato:repertoire:items')
    const repertoirePieces = repertoireData ? JSON.parse(repertoireData) : []

    // Get logbook entries
    const logbookData = localStorage.getItem('mirubato:logbook:entries')
    const logbookEntries = logbookData ? JSON.parse(logbookData) : []

    // Extract all unique pieces from logbook entries
    const logbookPieces: LocalStoragePiece[] = []
    logbookEntries.forEach((entry: { pieces?: LocalStoragePiece[] }) => {
      if (entry.pieces) {
        entry.pieces.forEach((piece: LocalStoragePiece) => {
          const normalizedId = generateNormalizedScoreId(
            piece.title,
            piece.composer
          )
          const existing = logbookPieces.find(
            p => generateNormalizedScoreId(p.title, p.composer) === normalizedId
          )
          if (!existing) {
            logbookPieces.push({
              title: piece.title,
              composer: piece.composer,
              scoreId: normalizedId,
            })
          }
        })
      }
    })

    // Check for duplicates in repertoire
    const repertoireDuplicates = new Map<
      string,
      {
        scoreId: string
        title: string
        composer: string
        similarity: number
        confidence: 'high' | 'medium' | 'low'
      }[]
    >()

    repertoirePieces.forEach(
      (item: {
        scoreId: string
        scoreTitle?: string
        title?: string
        scoreComposer?: string
        composer?: string
      }) => {
        // Find similar pieces
        const allOtherPieces = [...repertoirePieces, ...logbookPieces]
          .filter(p => p !== item)
          .map(p => ({
            scoreId:
              p.scoreId || generateNormalizedScoreId(p.title, p.composer),
            title: p.title,
            composer: p.composer || '',
          }))

        const similar = findSimilarPieces(
          item.scoreTitle || item.title || 'Unknown',
          item.scoreComposer || item.composer,
          allOtherPieces,
          0.85 // High threshold for automatic detection
        )

        if (similar.length > 0) {
          const key = item.scoreId || ''
          if (!repertoireDuplicates.has(key)) {
            repertoireDuplicates.set(key, [])
          }
          repertoireDuplicates.get(key)!.push(...similar)
          result.duplicatesFound += similar.length
        }
      }
    )

    // Log findings for debugging
    if (result.duplicatesFound > 0) {
      console.log(`🔍 Found ${result.duplicatesFound} potential duplicates:`)
      repertoireDuplicates.forEach((duplicates, key) => {
        console.log(`  - ${key}: ${duplicates.length} similar pieces`)
        duplicates.forEach(dup => {
          console.log(
            `    → ${dup.title} by ${dup.composer} (${Math.round(dup.similarity * 100)}% match)`
          )
        })
      })
    }
  } catch (error) {
    result.errors.push(`Failed to analyze localStorage: ${error}`)
  }

  return result
}

/**
 * Provides user-friendly duplicate detection report
 * @returns Human-readable report of duplicate detection
 */
export function getDuplicateReport(): {
  hasDuplicates: boolean
  summary: string
  details: Array<{
    original: string
    duplicates: Array<{
      title: string
      composer: string
      similarity: number
    }>
  }>
} {
  const result = detectLocalStorageDuplicates()

  return {
    hasDuplicates: result.duplicatesFound > 0,
    summary:
      result.duplicatesFound > 0
        ? `Found ${result.duplicatesFound} potential duplicate pieces in your data.`
        : 'No duplicate pieces detected.',
    details: [], // Could be expanded to provide detailed breakdown
  }
}

/**
 * Run duplicate detection on app startup for anonymous users
 * This is a passive check that doesn't modify data
 */
export function initializeDuplicateDetection(): void {
  // Only run for anonymous users
  const hasAuthToken = localStorage.getItem('auth-token')
  if (hasAuthToken) return

  try {
    const report = getDuplicateReport()
    if (report.hasDuplicates) {
      console.log(
        `ℹ️ Mirubato detected potential duplicate pieces in your data. Use the piece management tools to clean them up.`
      )
    }
  } catch (error) {
    console.warn('Failed to run duplicate detection:', error)
  }
}
