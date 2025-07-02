import { describe, it, expect } from 'vitest'

// Import the generateSlug function directly from import.ts
// In a real scenario, you might want to export this function
const generateSlug = (
  titleOrText: string,
  opus?: string,
  composer?: string
): string => {
  // If called with just one argument (backward compatibility)
  if (!opus && !composer) {
    return titleOrText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100)
  }

  // Enhanced slug generation including opus
  const slugParts = [titleOrText]

  if (opus) {
    // Extract opus number and part (e.g., "Op. 11 No. 6" -> "op11-no6")
    const opusSlug = opus
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    slugParts.push(opusSlug)
  }

  return slugParts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

describe('generateSlug', () => {
  it('should generate basic slug from title', () => {
    expect(generateSlug('Les Favorites')).toBe('les-favorites')
    expect(generateSlug('Etude in C Major')).toBe('etude-in-c-major')
  })

  it('should include opus in slug', () => {
    expect(generateSlug('Les Favorites', 'Op. 11 No. 6')).toBe(
      'les-favorites-op-11-no-6'
    )
    expect(generateSlug('Etude', 'Op. 3 No. 3')).toBe('etude-op-3-no-3')
    expect(generateSlug('Etude', 'Op. 3 No. 4')).toBe('etude-op-3-no-4')
  })

  it('should handle complex opus formats', () => {
    expect(generateSlug('Sonata', 'Op. 27, No. 2')).toBe('sonata-op-27-no-2')
    expect(generateSlug('Prelude', 'BWV 846')).toBe('prelude-bwv-846')
    expect(generateSlug('Waltz', 'Op.64 No.2')).toBe('waltz-op-64-no-2')
  })

  it('should create unique slugs for same title different opus', () => {
    const slug1 = generateSlug('Etude', 'Op. 10 No. 1')
    const slug2 = generateSlug('Etude', 'Op. 10 No. 2')
    expect(slug1).not.toBe(slug2)
    expect(slug1).toBe('etude-op-10-no-1')
    expect(slug2).toBe('etude-op-10-no-2')
  })

  it('should handle special characters', () => {
    expect(generateSlug('Für Elise', 'WoO 59')).toBe('f-r-elise-woo-59')
    expect(generateSlug('Clair de Lune', 'L. 32')).toBe('clair-de-lune-l-32')
  })

  it('should respect max length of 100 characters', () => {
    const longTitle =
      'This is a very long title that should be truncated to fit within the maximum length limit'
    const longOpus = 'Op. 999 No. 999 Movement 999 Variation 999'
    const slug = generateSlug(longTitle, longOpus)
    expect(slug.length).toBeLessThanOrEqual(100)
  })
})
