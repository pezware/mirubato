import type { LogbookEntry } from '@/api/logbook'

/**
 * Type guards for instrument validation
 * Supports any instrument string (piano, guitar, violin, flute, etc.)
 */

/**
 * Check if a value is a valid instrument (any non-empty string)
 */
export function isValidInstrument(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Get a valid instrument value with fallback
 */
export function getValidInstrument(
  value: unknown,
  fallback: string = 'piano'
): string {
  return isValidInstrument(value)
    ? String(value).trim().toLowerCase()
    : fallback
}

/**
 * Convert generic instrument string to LogbookEntry instrument type
 * Now supports any instrument string
 */
export function toLogbookInstrument(
  value: string | undefined
): LogbookEntry['instrument'] {
  if (!value) return undefined
  return value.trim().toLowerCase()
}

/**
 * Normalize an instrument value to lowercase
 */
export function normalizeInstrument(value: unknown): string | undefined {
  if (!value) return undefined

  const str = String(value).trim().toLowerCase()
  return str.length > 0 ? str : undefined
}

/**
 * Get the default instrument
 */
export function getDefaultInstrument(): string {
  return 'piano'
}

/**
 * Check if an instrument can be stored in the legacy database tables
 * (only piano and guitar have CHECK constraints in some tables)
 */
export function isDatabaseCompatibleInstrument(value: string): boolean {
  const normalized = value.toLowerCase()
  return normalized === 'piano' || normalized === 'guitar'
}
