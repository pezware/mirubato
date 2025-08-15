/**
 * Utility for detecting and cleaning up duplicate logbook entries
 * Handles both local storage and server-side duplicates
 */

import type { LogbookEntry } from '../api/logbook'
import { nanoid } from 'nanoid'

export interface DuplicateEntry {
  id: string
  entry: LogbookEntry
  duplicateOf: string
  confidence: number
  reason: string
}

export interface CleanupResult {
  duplicatesFound: number
  duplicatesRemoved: number
  entriesPreserved: number
  conflicts: Array<{
    ids: string[]
    reason: string
  }>
}

/**
 * Content signature for duplicate detection
 * More sophisticated than the time-window approach
 */
export function generateContentSignature(entry: LogbookEntry): string {
  // Create a normalized signature for comparison
  const pieces = entry.pieces
    .map(
      p =>
        `${p.title?.toLowerCase().trim()}-${p.composer?.toLowerCase().trim()}`
    )
    .sort()
    .join('|')

  const practiceDate = new Date(entry.timestamp)
  const dateKey = practiceDate.toISOString().split('T')[0] // YYYY-MM-DD only

  const typeKey = entry.type?.toLowerCase() || 'practice'
  const instrumentKey = entry.instrument?.toLowerCase() || 'unknown'

  // Round duration to nearest 5 minutes to account for minor timing differences
  const durationKey = Math.round(entry.duration / (5 * 60)) * (5 * 60)

  return `${dateKey}_${durationKey}_${typeKey}_${instrumentKey}_${pieces}`
}

/**
 * Detect duplicate entries using multiple strategies
 */
export function detectDuplicates(entries: LogbookEntry[]): DuplicateEntry[] {
  const duplicates: DuplicateEntry[] = []
  const signatureMap = new Map<string, LogbookEntry>()
  const exactMatchMap = new Map<string, LogbookEntry>()

  for (const entry of entries) {
    // Strategy 1: Exact content signature match
    const signature = generateContentSignature(entry)

    if (signatureMap.has(signature)) {
      const original = signatureMap.get(signature)!
      duplicates.push({
        id: nanoid(),
        entry,
        duplicateOf: original.id,
        confidence: 0.95,
        reason: 'Identical content signature',
      })
      continue
    }

    // Strategy 2: Same ID (should not happen but check anyway)
    const existingEntry = entries.find(e => e.id === entry.id && e !== entry)
    if (existingEntry) {
      duplicates.push({
        id: nanoid(),
        entry,
        duplicateOf: existingEntry.id,
        confidence: 1.0,
        reason: 'Identical ID',
      })
      continue
    }

    // Strategy 3: Near-identical timestamps (within 2 minutes) + same pieces
    const timeKey = Math.floor(
      new Date(entry.timestamp).getTime() / (2 * 60 * 1000)
    )
    const piecesKey = entry.pieces
      .map(p => `${p.title}-${p.composer}`)
      .sort()
      .join('|')
    const timeSignature = `${timeKey}_${piecesKey}`

    if (exactMatchMap.has(timeSignature)) {
      const original = exactMatchMap.get(timeSignature)!
      // Check if durations are similar (within 30 seconds)
      const durationDiff = Math.abs(entry.duration - original.duration)

      if (durationDiff <= 30) {
        duplicates.push({
          id: nanoid(),
          entry,
          duplicateOf: original.id,
          confidence: 0.85,
          reason: 'Near-identical timestamp and pieces',
        })
        continue
      }
    }

    // No duplicates found, add to maps
    signatureMap.set(signature, entry)
    exactMatchMap.set(timeSignature, entry)
  }

  return duplicates
}

/**
 * Determine which entry to keep when merging duplicates
 */
export function chooseBestEntry(
  original: LogbookEntry,
  duplicate: LogbookEntry
): LogbookEntry {
  // Prefer entry with more complete data
  const originalScore = scoreEntryCompleteness(original)
  const duplicateScore = scoreEntryCompleteness(duplicate)

  if (originalScore !== duplicateScore) {
    return originalScore >= duplicateScore ? original : duplicate
  }

  // If completeness is equal, prefer the more recent one
  const originalTime = new Date(
    original.updatedAt || original.createdAt
  ).getTime()
  const duplicateTime = new Date(
    duplicate.updatedAt || duplicate.createdAt
  ).getTime()

  return duplicateTime > originalTime ? duplicate : original
}

/**
 * Score an entry based on data completeness
 */
function scoreEntryCompleteness(entry: LogbookEntry): number {
  let score = 0

  // Basic required fields
  score += entry.pieces.length > 0 ? 2 : 0
  score += entry.duration > 0 ? 2 : 0

  // Optional but valuable fields
  score += entry.notes ? 1 : 0
  score += entry.mood ? 1 : 0
  score += entry.type ? 1 : 0
  score += entry.instrument ? 1 : 0
  score += entry.scoreId ? 1 : 0
  score += entry.scoreTitle ? 1 : 0
  score += entry.scoreComposer ? 1 : 0

  // Piece-level completeness
  for (const piece of entry.pieces) {
    score += piece.title ? 0.5 : 0
    score += piece.composer ? 0.5 : 0
  }

  return score
}

/**
 * Clean up duplicates from an array of entries
 */
export function cleanupDuplicates(entries: LogbookEntry[]): CleanupResult {
  const duplicates = detectDuplicates(entries)
  const result: CleanupResult = {
    duplicatesFound: duplicates.length,
    duplicatesRemoved: 0,
    entriesPreserved: entries.length,
    conflicts: [],
  }

  if (duplicates.length === 0) {
    return result
  }

  // Group duplicates by original entry
  const duplicateGroups = new Map<string, DuplicateEntry[]>()
  for (const dup of duplicates) {
    if (!duplicateGroups.has(dup.duplicateOf)) {
      duplicateGroups.set(dup.duplicateOf, [])
    }
    duplicateGroups.get(dup.duplicateOf)!.push(dup)
  }

  // Process each group
  const entriesToRemove = new Set<string>()

  for (const [originalId, groupDuplicates] of duplicateGroups) {
    const originalEntry = entries.find(e => e.id === originalId)
    if (!originalEntry) {
      // Original entry not found, mark as conflict
      result.conflicts.push({
        ids: groupDuplicates.map(d => d.entry.id),
        reason: `Original entry ${originalId} not found`,
      })
      continue
    }

    // Find the best entry among all duplicates and original
    let bestEntry = originalEntry
    const allEntries = [originalEntry, ...groupDuplicates.map(d => d.entry)]

    for (const entry of allEntries) {
      if (entry !== bestEntry) {
        bestEntry = chooseBestEntry(bestEntry, entry)
      }
    }

    // Mark all others for removal
    for (const entry of allEntries) {
      if (entry !== bestEntry) {
        entriesToRemove.add(entry.id)
      }
    }
  }

  // Update result statistics
  result.duplicatesRemoved = entriesToRemove.size
  result.entriesPreserved = entries.length - result.duplicatesRemoved

  console.log(`[DuplicateCleanup] Found ${result.duplicatesFound} duplicates`)
  console.log(`[DuplicateCleanup] Removing ${result.duplicatesRemoved} entries`)
  console.log(
    `[DuplicateCleanup] Preserving ${result.entriesPreserved} entries`
  )

  if (result.conflicts.length > 0) {
    console.warn(
      `[DuplicateCleanup] ${result.conflicts.length} conflicts need manual resolution`
    )
  }

  return result
}

/**
 * Remove duplicates from entries array (non-destructive)
 */
export function removeDuplicates(entries: LogbookEntry[]): LogbookEntry[] {
  const duplicates = detectDuplicates(entries)
  if (duplicates.length === 0) {
    return entries
  }

  const duplicateIds = new Set(duplicates.map(d => d.entry.id))
  return entries.filter(entry => !duplicateIds.has(entry.id))
}

/**
 * Get a report of potential duplicates for user review
 */
export function getDuplicateReport(entries: LogbookEntry[]): {
  duplicates: DuplicateEntry[]
  summary: {
    totalEntries: number
    duplicatesFound: number
    highConfidence: number
    mediumConfidence: number
    lowConfidence: number
  }
} {
  const duplicates = detectDuplicates(entries)

  return {
    duplicates,
    summary: {
      totalEntries: entries.length,
      duplicatesFound: duplicates.length,
      highConfidence: duplicates.filter(d => d.confidence >= 0.9).length,
      mediumConfidence: duplicates.filter(
        d => d.confidence >= 0.7 && d.confidence < 0.9
      ).length,
      lowConfidence: duplicates.filter(d => d.confidence < 0.7).length,
    },
  }
}

/**
 * Merge entries with user approval for conflicts
 */
export function mergeEntriesWithApproval(
  entries: LogbookEntry[],
  _userApprovals: Map<string, 'keep' | 'remove' | 'merge'>
): LogbookEntry[] {
  // This would be used with a UI component for user decision-making
  // For now, return the entries as-is
  return entries
}
