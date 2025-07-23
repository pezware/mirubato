/**
 * Text formatting utilities
 */

// Words that should remain lowercase unless they're the first word
const LOWERCASE_WORDS = new Set([
  'van',
  'von',
  'de',
  'da',
  'di',
  'del',
  'della',
  'des',
  'der',
  'du',
  'la',
  'le',
  'et',
  'auf',
  'aus',
  'zu',
  'zur',
  'am',
  'im',
  'in',
  'an',
  'the',
  'of',
  'and',
  'op',
  'ten',
  'ter',
  'den',
  'van der',
  'van den',
  'van de',
])

/**
 * Convert a string to title case with special handling for names
 * Examples:
 * - "johann sebastian bach" → "Johann Sebastian Bach"
 * - "ludwig van beethoven" → "Ludwig van Beethoven"
 * - "j.s. bach" → "J.S. Bach"
 * - "o'brien" → "O'Brien"
 * - "MOZART" → "Mozart"
 */
export function toTitleCase(str: string): string {
  if (!str) return str

  // Handle all caps input by converting to lowercase first
  if (str === str.toUpperCase() && str.length > 2) {
    str = str.toLowerCase()
  }

  // Split by spaces while preserving them
  const words = str.split(/(\s+)/)

  return words
    .map((word, index) => {
      // Skip whitespace
      if (/^\s+$/.test(word)) return word

      // Check if this is a compound lowercase word (e.g., "van der")
      const remainingWords = words.slice(index).filter(w => !/^\s+$/.test(w))
      const compound2 = remainingWords.slice(0, 2).join(' ').toLowerCase()
      const compound3 = remainingWords.slice(0, 3).join(' ').toLowerCase()

      if (LOWERCASE_WORDS.has(compound3) && index > 0) {
        // Skip the next 2 non-whitespace words as they're part of this compound
        return compound3
      }
      if (LOWERCASE_WORDS.has(compound2) && index > 0) {
        // Skip the next non-whitespace word as it's part of this compound
        return compound2
      }

      // Handle initials (e.g., "j.s." → "J.S.")
      if (/^[a-z]\.$/.test(word.toLowerCase())) {
        return word.toUpperCase()
      }

      // Handle multiple initials together (e.g., "j.s." → "J.S.")
      if (/^[a-z]\.[a-z]\./.test(word.toLowerCase())) {
        return word
          .split('.')
          .map(part => (part ? part[0].toUpperCase() + part.slice(1) : ''))
          .join('.')
      }

      // Handle hyphenated names (e.g., "saint-saens" → "Saint-Saëns")
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part, i) =>
            i === 0 || !LOWERCASE_WORDS.has(part.toLowerCase())
              ? capitalizeWord(part)
              : part.toLowerCase()
          )
          .join('-')
      }

      // Handle apostrophes (e.g., "o'brien" → "O'Brien", "d'angelo" → "D'Angelo")
      if (word.includes("'")) {
        const parts = word.split("'")
        return parts
          .map((part, i) => {
            if (i === 0) {
              // First part - check if it's a single letter (D', L', etc.)
              return part.length === 1
                ? part.toUpperCase()
                : capitalizeWord(part)
            } else {
              return capitalizeWord(part)
            }
          })
          .join("'")
      }

      // Check if the word should remain lowercase (but not if it's the first word)
      if (index > 0 && LOWERCASE_WORDS.has(word.toLowerCase())) {
        return word.toLowerCase()
      }

      // Regular word capitalization
      return capitalizeWord(word)
    })
    .join('')
}

/**
 * Capitalize a single word
 */
function capitalizeWord(word: string): string {
  if (!word) return word

  // Preserve acronyms (all caps words longer than 1 character)
  if (word.length > 1 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
    return word
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

// Alias for backward compatibility
export const formatComposerName = toTitleCase
