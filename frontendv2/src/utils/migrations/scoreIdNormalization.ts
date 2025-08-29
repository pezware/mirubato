/**
 * Migration utility to normalize all score IDs in localStorage
 * This ensures consistent score ID format across logbook entries and repertoire
 * Handles both legacy dash format and new double-pipe format
 */

import {
  generateNormalizedScoreId,
  normalizeExistingScoreId,
} from '../scoreIdNormalizer'
import { normalizeRepertoireIds } from './normalizeRepertoireIds'

const MIGRATION_KEY = 'mirubato:score-id-normalization-v1'
const REPERTOIRE_NORMALIZATION_KEY = 'mirubato:repertoire-normalization-v1'

interface MigratableLogbookEntry {
  id: string
  scoreId?: string
  scoreTitle?: string
  scoreComposer?: string
  pieces?: Array<{
    id?: string
    title: string
    composer?: string | null
    [key: string]: unknown
  }>
  [key: string]: unknown
}

/**
 * Runs the score ID normalization migration for all localStorage data
 * This function is idempotent - it can be safely called multiple times
 */
export function runScoreIdNormalization(): void {
  // Check if migration already ran
  if (localStorage.getItem(MIGRATION_KEY)) {
    console.log('[Migration] Score ID normalization already completed')
    return
  }

  console.log('[Migration] Starting score ID normalization...')

  try {
    let entriesNormalized = 0
    let piecesNormalized = 0
    let scoreIdsNormalized = 0

    // 1. Normalize logbook entries
    const entriesKey = 'mirubato:logbook:entries'
    const storedEntries = localStorage.getItem(entriesKey)

    if (storedEntries) {
      try {
        const entries = JSON.parse(storedEntries) as MigratableLogbookEntry[]

        const normalizedEntries = entries.map(entry => {
          let wasNormalized = false
          const normalizedEntry = { ...entry }

          // Normalize pieces array
          if (normalizedEntry.pieces && Array.isArray(normalizedEntry.pieces)) {
            normalizedEntry.pieces = normalizedEntry.pieces.map(piece => {
              if (piece.title) {
                const oldId = piece.id
                const newId = generateNormalizedScoreId(
                  piece.title,
                  piece.composer
                )

                if (oldId !== newId) {
                  piecesNormalized++
                  wasNormalized = true
                }

                return {
                  ...piece,
                  id: newId,
                }
              }
              return piece
            })
          }

          // Normalize scoreId field if present
          if (
            normalizedEntry.scoreId &&
            typeof normalizedEntry.scoreId === 'string'
          ) {
            const oldScoreId = normalizedEntry.scoreId
            const normalizedScoreId = normalizeExistingScoreId(oldScoreId)

            if (oldScoreId !== normalizedScoreId) {
              normalizedEntry.scoreId = normalizedScoreId
              scoreIdsNormalized++
              wasNormalized = true
            }
          }

          // Handle legacy scoreTitle/scoreComposer fields
          if (
            normalizedEntry.scoreTitle &&
            !normalizedEntry.scoreId &&
            typeof normalizedEntry.scoreTitle === 'string'
          ) {
            normalizedEntry.scoreId = generateNormalizedScoreId(
              normalizedEntry.scoreTitle,
              normalizedEntry.scoreComposer || undefined
            )
            scoreIdsNormalized++
            wasNormalized = true
          }

          if (wasNormalized) {
            entriesNormalized++
          }

          return normalizedEntry
        })

        localStorage.setItem(entriesKey, JSON.stringify(normalizedEntries))
        console.log(
          `[Migration] Normalized ${entriesNormalized} logbook entries, ${piecesNormalized} pieces, ${scoreIdsNormalized} score IDs`
        )
      } catch (error) {
        console.error('[Migration] Failed to normalize logbook entries:', error)
        throw error // Re-throw to prevent marking migration as complete
      }
    }

    // 2. Handle repertoire normalization with a flag
    if (!localStorage.getItem(REPERTOIRE_NORMALIZATION_KEY)) {
      console.log('[Migration] Running repertoire normalization...')
      normalizeRepertoireIds()
      localStorage.setItem(
        REPERTOIRE_NORMALIZATION_KEY,
        new Date().toISOString()
      )
    } else {
      console.log('[Migration] Repertoire normalization already completed')
    }

    // 3. Normalize any other score-related data
    // Check for any custom keys that might contain score data
    // Use a method that works with both real localStorage and test mocks
    const allKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        allKeys.push(key)
      }
    }
    const scoreRelatedKeys = allKeys.filter(
      key =>
        key.includes('score') ||
        key.includes('piece') ||
        key.includes('repertoire')
    )

    for (const key of scoreRelatedKeys) {
      // Skip already processed keys
      if (
        key === entriesKey ||
        key === 'mirubato:repertoire:items' ||
        key.includes('normalization')
      ) {
        continue
      }

      try {
        const value = localStorage.getItem(key)
        if (value && (value.startsWith('{') || value.startsWith('['))) {
          const data = JSON.parse(value)

          // Recursively normalize any scoreId fields
          const normalizedData = normalizeScoreIdsInObject(data)

          if (JSON.stringify(data) !== JSON.stringify(normalizedData)) {
            localStorage.setItem(key, JSON.stringify(normalizedData))
            console.log(`[Migration] Normalized score IDs in ${key}`)
          }
        }
      } catch {
        // Skip non-JSON values
      }
    }

    // Mark migration as complete
    localStorage.setItem(MIGRATION_KEY, new Date().toISOString())
    console.log('[Migration] Score ID normalization completed successfully')
  } catch (error) {
    console.error(
      '[Migration] Critical error during score ID normalization:',
      error
    )
    // Don't mark as complete if there was a critical error
  }
}

type NormalizableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | NormalizableObject
  | NormalizableArray

interface NormalizableObject {
  [key: string]: NormalizableValue
}

type NormalizableArray = Array<NormalizableValue>

/**
 * Recursively normalize score IDs in any object structure
 */
function normalizeScoreIdsInObject(obj: NormalizableValue): NormalizableValue {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => normalizeScoreIdsInObject(item))
  }

  if (typeof obj === 'object') {
    const normalized: NormalizableObject = {}

    for (const [key, value] of Object.entries(obj)) {
      // Normalize scoreId fields
      if (key === 'scoreId' && typeof value === 'string') {
        normalized[key] = normalizeExistingScoreId(value)
      }
      // Handle pieces arrays
      else if (key === 'pieces' && Array.isArray(value)) {
        normalized[key] = value.map((piece: NormalizableValue) => {
          if (
            piece &&
            typeof piece === 'object' &&
            !Array.isArray(piece) &&
            'title' in piece &&
            typeof piece.title === 'string'
          ) {
            const pieceObj = piece as NormalizableObject
            const composer =
              'composer' in pieceObj && typeof pieceObj.composer === 'string'
                ? pieceObj.composer
                : undefined
            return {
              ...pieceObj,
              id: generateNormalizedScoreId(piece.title as string, composer),
            }
          }
          return piece
        })
      }
      // Recursively process nested objects
      else {
        normalized[key] = normalizeScoreIdsInObject(value)
      }
    }

    return normalized
  }

  return obj
}

/**
 * Checks if the score ID normalization has been completed
 */
export function isScoreIdNormalizationComplete(): boolean {
  return localStorage.getItem(MIGRATION_KEY) !== null
}

/**
 * Checks if the repertoire normalization has been completed
 */
export function isRepertoireNormalizationComplete(): boolean {
  return localStorage.getItem(REPERTOIRE_NORMALIZATION_KEY) !== null
}

/**
 * Resets the migration status (useful for testing)
 */
export function resetScoreIdNormalization(): void {
  localStorage.removeItem(MIGRATION_KEY)
  localStorage.removeItem(REPERTOIRE_NORMALIZATION_KEY)
  console.log('[Migration] Reset score ID normalization status')
}
