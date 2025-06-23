import type { LogbookEntry } from '../api/logbook'

// Type definitions for legacy entries
interface LegacyLogbookEntry {
  id: string
  userId?: string // Original frontend stores userId, not user object
  timestamp: number | string // Could be unix timestamp or ISO string
  duration: number
  type:
    | 'practice'
    | 'performance'
    | 'lesson'
    | 'rehearsal'
    | 'PRACTICE'
    | 'PERFORMANCE'
    | 'LESSON'
    | 'REHEARSAL'
  instrument: 'PIANO' | 'GUITAR' | 'piano' | 'guitar'
  pieces: Array<{
    id?: string
    title: string
    composer?: string
    measures?: string
    tempo?: number
  }>
  techniques: string[]
  goals?: string[] // Original uses 'goals' not 'goalIds'
  goalIds?: string[] // GraphQL version uses 'goalIds'
  notes?: string
  mood?:
    | 'frustrated'
    | 'neutral'
    | 'satisfied'
    | 'excited'
    | 'FRUSTRATED'
    | 'NEUTRAL'
    | 'SATISFIED'
    | 'EXCITED'
  tags: string[]
  sessionId?: string
  metadata?:
    | Record<string, unknown>
    | {
        source: string
        accuracy?: number
        notesPlayed?: number
        mistakeCount?: number
      }
  // These might or might not exist
  createdAt?: string
  updatedAt?: string
  user?: { id: string } // GraphQL might include full user object
}

/**
 * Transform a legacy logbook entry to the frontendv2 format
 */
export function transformLegacyEntry(legacy: LegacyLogbookEntry): LogbookEntry {
  // Handle timestamp conversion
  let timestamp: string
  if (typeof legacy.timestamp === 'number') {
    // Unix timestamp - convert to ISO string
    timestamp = new Date(legacy.timestamp).toISOString()
  } else if (typeof legacy.timestamp === 'string') {
    // Already a string, ensure it's valid ISO format
    timestamp = new Date(legacy.timestamp).toISOString()
  } else {
    // Fallback to current time
    timestamp = new Date().toISOString()
  }

  // Handle type conversion (lowercase to uppercase)
  const type = legacy.type.toUpperCase() as LogbookEntry['type']

  // Handle instrument conversion
  const instrument =
    legacy.instrument.toUpperCase() as LogbookEntry['instrument']

  // Handle mood conversion
  const mood = legacy.mood
    ? (legacy.mood.toUpperCase() as LogbookEntry['mood'])
    : undefined

  // Handle pieces - ensure they have the right structure
  const pieces = (legacy.pieces || []).map(piece => ({
    id: piece.id,
    title: piece.title || 'Untitled',
    composer: piece.composer,
    measures: piece.measures,
    tempo: piece.tempo,
  }))

  // Handle metadata transformation
  let metadata: LogbookEntry['metadata'] | undefined
  if (legacy.metadata) {
    if ('source' in legacy.metadata) {
      // Already in the right format
      metadata = legacy.metadata as LogbookEntry['metadata']
    } else {
      // Generic metadata - wrap it
      metadata = {
        source: 'legacy',
        ...(legacy.metadata as any),
      }
    }
  }

  // Merge goals and goalIds (original frontend uses 'goals', GraphQL uses 'goalIds')
  const goalIds = legacy.goalIds || legacy.goals || []

  // Build the transformed entry
  const transformed: LogbookEntry = {
    id: legacy.id,
    timestamp,
    duration: legacy.duration || 0,
    type,
    instrument,
    pieces,
    techniques: legacy.techniques || [],
    goalIds,
    notes: legacy.notes,
    mood,
    tags: legacy.tags || [],
    metadata,
    // Use existing timestamps or generate new ones
    createdAt: legacy.createdAt || timestamp,
    updatedAt: legacy.updatedAt || timestamp,
  }

  return transformed
}

/**
 * Transform an array of legacy entries
 */
export function transformLegacyEntries(entries: unknown[]): LogbookEntry[] {
  const transformed: LogbookEntry[] = []

  for (const entry of entries) {
    try {
      // Skip invalid entries
      if (!entry || typeof entry !== 'object') continue

      const legacyEntry = entry as LegacyLogbookEntry

      // Skip entries without required fields
      if (!legacyEntry.id || !legacyEntry.duration) continue

      transformed.push(transformLegacyEntry(legacyEntry))
    } catch (error) {
      console.warn('Failed to transform entry:', entry, error)
    }
  }

  return transformed
}

/**
 * Validate if an entry is already in the new format
 */
export function isNewFormatEntry(entry: any): entry is LogbookEntry {
  return (
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    typeof entry.timestamp === 'string' &&
    typeof entry.duration === 'number' &&
    ['PRACTICE', 'PERFORMANCE', 'LESSON', 'REHEARSAL'].includes(entry.type) &&
    ['PIANO', 'GUITAR'].includes(entry.instrument) &&
    Array.isArray(entry.pieces) &&
    typeof entry.createdAt === 'string' &&
    typeof entry.updatedAt === 'string'
  )
}
