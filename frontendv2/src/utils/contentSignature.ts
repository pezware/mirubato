import type { LogbookEntry, Goal } from '../types'

/**
 * Enhanced content signature generation for deduplication
 * Uses SHA-256 hashing for exact content matching
 */

/**
 * Create a deterministic content signature for a logbook entry
 */
export async function createLogbookEntrySignature(
  entry: LogbookEntry
): Promise<string> {
  // Create a normalized object with sorted keys for consistent hashing
  const normalizedContent = {
    // Use exact timestamp for precise matching
    timestamp: entry.timestamp,
    duration: entry.duration,
    type: entry.type,
    instrument: entry.instrument,

    // Sort pieces array for consistent ordering
    pieces: entry.pieces
      .map(p => ({
        title: p.title.trim(),
        composer: (p.composer || '').trim(),
      }))
      .sort((a, b) => {
        const titleCompare = a.title.localeCompare(b.title)
        if (titleCompare !== 0) return titleCompare
        return a.composer.localeCompare(b.composer)
      }),

    // Sort techniques array
    techniques: [...(entry.techniques || [])].sort(),

    // Include other fields that affect uniqueness
    mood: entry.mood || '',
    notes: (entry.notes || '').trim(),
    scoreId: entry.scoreId || '',

    // Include goal IDs if present
    goalIds: [...(entry.goalIds || [])].sort(),
  }

  // Create SHA-256 hash using Web Crypto API
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(normalizedContent))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a content signature for a goal
 */
export async function createGoalSignature(goal: Goal): Promise<string> {
  const normalizedContent = {
    title: goal.title.trim(),
    description: (goal.description || '').trim(),
    targetDate: goal.targetDate,
    category: goal.category,
    status: goal.status,
    instrument: goal.instrument || '',
    measurementType: goal.measurementType,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue || 0,
  }

  // Create SHA-256 hash using Web Crypto API
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(normalizedContent))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Check if two entries are duplicates based on content and timing
 */
export async function isDuplicateEntry(
  entry1: LogbookEntry,
  entry2: LogbookEntry,
  options: {
    exactTimestamp?: boolean
    timeTolerance?: number // milliseconds
  } = {}
): boolean {
  const { exactTimestamp = false, timeTolerance = 1000 } = options

  // Skip if same ID
  if (entry1.id === entry2.id) return false

  // Generate content signatures
  const sig1 = await createLogbookEntrySignature(entry1)
  const sig2 = await createLogbookEntrySignature(entry2)

  // If content doesn't match, not a duplicate
  if (sig1 !== sig2) return false

  // Check timestamp proximity
  const time1 = new Date(entry1.timestamp).getTime()
  const time2 = new Date(entry2.timestamp).getTime()
  const timeDiff = Math.abs(time1 - time2)

  if (exactTimestamp) {
    return timeDiff === 0
  }

  // Consider as duplicate if within time tolerance
  return timeDiff < timeTolerance
}

/**
 * Find duplicates in a collection of entries
 */
export async function findDuplicateEntries(
  entries: LogbookEntry[],
  options?: Parameters<typeof isDuplicateEntry>[2]
): Map<string, LogbookEntry[]> {
  const duplicateGroups = new Map<string, LogbookEntry[]>()
  const processed = new Set<string>()

  for (let i = 0; i < entries.length; i++) {
    const entry1 = entries[i]
    if (processed.has(entry1.id)) continue

    const duplicates: LogbookEntry[] = [entry1]

    for (let j = i + 1; j < entries.length; j++) {
      const entry2 = entries[j]
      if (processed.has(entry2.id)) continue

      if (await isDuplicateEntry(entry1, entry2, options)) {
        duplicates.push(entry2)
        processed.add(entry2.id)
      }
    }

    if (duplicates.length > 1) {
      // Use the signature as the group key
      const signature = await createLogbookEntrySignature(entry1)
      duplicateGroups.set(signature, duplicates)
    }
  }

  return duplicateGroups
}

/**
 * Remove duplicates from a collection, keeping the most recent
 */
export async function deduplicateEntries(entries: LogbookEntry[]): Promise<{
  unique: LogbookEntry[]
  removed: LogbookEntry[]
}> {
  const duplicateGroups = await findDuplicateEntries(entries)
  const removed: LogbookEntry[] = []
  const keepIds = new Set<string>()

  // For each duplicate group, keep the most recently updated
  duplicateGroups.forEach(group => {
    const sorted = [...group].sort((a, b) => {
      // First try updatedAt
      const updatedA = new Date(a.updatedAt || a.createdAt).getTime()
      const updatedB = new Date(b.updatedAt || b.createdAt).getTime()
      if (updatedA !== updatedB) return updatedB - updatedA

      // Then createdAt
      const createdA = new Date(a.createdAt).getTime()
      const createdB = new Date(b.createdAt).getTime()
      if (createdA !== createdB) return createdB - createdA

      // Finally, ID for stability
      return b.id.localeCompare(a.id)
    })

    // Keep the first (most recent)
    keepIds.add(sorted[0].id)

    // Mark others as removed
    removed.push(...sorted.slice(1))
  })

  // Build unique list
  const unique = entries.filter(
    entry =>
      !Array.from(duplicateGroups.values())
        .flat()
        .some(e => e.id === entry.id) || keepIds.has(entry.id)
  )

  return { unique, removed }
}

/**
 * Create a request signature for idempotency
 */
export async function createRequestSignature(data: unknown): Promise<string> {
  const encoder = new TextEncoder()
  const dataString = encoder.encode(JSON.stringify(data))
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataString)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
