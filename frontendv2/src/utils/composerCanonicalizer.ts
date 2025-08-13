/**
 * Frontend Composer Name Canonicalizer Utility
 *
 * This utility provides functions to normalize and canonicalize composer names
 * on the frontend, ensuring consistency with the backend canonicalization.
 * It handles common variations, misspellings, and incorrectly formatted names.
 */

import {
  COMPOSER_CANONICAL_NAMES,
  CATALOG_NUMBER_PATTERNS,
  COMPOSER_NAME_PARTICLES,
} from '../shared/resources/composerMappings'

/**
 * Removes catalog numbers from a composer name
 * @param composerName - The composer name that might contain catalog numbers
 * @returns The composer name with catalog numbers removed
 */
export function removeCatalogNumbers(composerName: string): string {
  let cleanedName = composerName

  // Remove all catalog number patterns
  for (const pattern of CATALOG_NUMBER_PATTERNS) {
    cleanedName = cleanedName.replace(pattern, '')
  }

  // Clean up any extra whitespace left behind
  cleanedName = cleanedName.replace(/\s+/g, ' ').trim()

  return cleanedName
}

/**
 * Normalizes a composer name for matching against canonical names
 * @param composerName - The composer name to normalize
 * @returns Normalized composer name (lowercase, trimmed, etc.)
 */
export function normalizeComposerForMatching(composerName: string): string {
  return composerName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/[–—]/g, '-') // Normalize dashes
    .replace(/\./g, '') // Remove periods
    .replace(/,\s*/g, ', ') // Normalize comma spacing
}

/**
 * Gets the canonical name for a composer
 * @param composerName - The composer name (potentially with variations or errors)
 * @returns The canonical composer name, or the cleaned original if no match found
 */
export function getCanonicalComposerName(
  composerName: string | null | undefined
): string {
  if (!composerName || !composerName.trim()) {
    return ''
  }

  // First, remove any catalog numbers
  const cleanedName = removeCatalogNumbers(composerName)

  // If the name is now empty or just whitespace, return empty string
  if (!cleanedName.trim()) {
    return ''
  }

  // Normalize for matching
  const normalizedName = normalizeComposerForMatching(cleanedName)

  // Check if we have a canonical name for this variation
  const canonicalName = COMPOSER_CANONICAL_NAMES[normalizedName]

  if (canonicalName) {
    return canonicalName
  }

  // If no exact match, try partial matches for common last names
  const words = normalizedName.split(' ')
  const lastName = words[words.length - 1]

  // Check if the last name matches any canonical composer
  for (const [variation, canonical] of Object.entries(
    COMPOSER_CANONICAL_NAMES
  )) {
    if (variation === lastName || variation.endsWith(' ' + lastName)) {
      return canonical
    }
  }

  // Return the cleaned name with proper capitalization
  return formatCanonicalComposerName(cleanedName)
}

/**
 * Formats a composer name with proper capitalization
 * This is the frontend version that uses the existing formatComposerName
 * @param name - The composer name to format
 * @returns The formatted composer name
 */
export function formatCanonicalComposerName(name: string): string {
  if (!name || !name.trim()) {
    return ''
  }

  // Build special cases from COMPOSER_NAME_PARTICLES
  const specialCases: Record<string, string> = {}

  // Add initials with proper capitalization
  COMPOSER_NAME_PARTICLES.initials.forEach(initial => {
    specialCases[initial] = initial
      .toUpperCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  })

  // Add particles that should stay lowercase
  COMPOSER_NAME_PARTICLES.lowercase.forEach(particle => {
    specialCases[particle] = particle
  })

  return name
    .split(' ')
    .map((word, index) => {
      const lowerWord = word.toLowerCase()

      // Check for special cases
      if (specialCases[lowerWord]) {
        // Don't lowercase particles at the beginning
        if (
          index === 0 &&
          COMPOSER_NAME_PARTICLES.lowercase.includes(lowerWord)
        ) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        }
        return specialCases[lowerWord]
      }

      // Handle hyphenated names
      if (word.includes('-')) {
        return word
          .split('-')
          .map(
            part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          )
          .join('-')
      }

      // Regular capitalization
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Checks if two composer names refer to the same composer
 * @param name1 - First composer name
 * @param name2 - Second composer name
 * @returns True if they refer to the same composer
 */
export function isSameComposer(name1: string, name2: string): boolean {
  const canonical1 = getCanonicalComposerName(name1)
  const canonical2 = getCanonicalComposerName(name2)

  // If both have canonical names, compare those
  if (canonical1 && canonical2) {
    return canonical1 === canonical2
  }

  // Otherwise, do normalized comparison
  const normalized1 = normalizeComposerForMatching(name1)
  const normalized2 = normalizeComposerForMatching(name2)

  return normalized1 === normalized2
}

/**
 * Extracts catalog info if present in a composer field
 * @param composerField - The composer field that might contain catalog info
 * @returns Object with composer name and catalog info separated
 */
export function extractCatalogInfo(composerField: string): {
  composer: string
  catalogNumber?: string
} {
  let catalogNumber: string | undefined

  // Check each pattern and extract if found
  for (const pattern of CATALOG_NUMBER_PATTERNS) {
    const match = composerField.match(pattern)
    if (match) {
      catalogNumber = match[0]
      break
    }
  }

  const composer = removeCatalogNumbers(composerField)

  return {
    composer: getCanonicalComposerName(composer) || composer,
    catalogNumber,
  }
}

/**
 * Gets a display-friendly composer name
 * This is used for showing composer names in the UI
 * @param composer - The raw composer name
 * @returns The display-friendly canonical name
 */
export function getDisplayComposerName(
  composer: string | null | undefined
): string {
  return getCanonicalComposerName(composer)
}
