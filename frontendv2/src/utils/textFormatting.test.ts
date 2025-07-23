import { describe, it, expect } from 'vitest'
import { toTitleCase, formatComposerName } from './textFormatting'

describe('toTitleCase', () => {
  it('should capitalize simple names', () => {
    expect(toTitleCase('bach')).toBe('Bach')
    expect(toTitleCase('mozart')).toBe('Mozart')
    expect(toTitleCase('chopin')).toBe('Chopin')
  })

  it('should handle multi-word names', () => {
    expect(toTitleCase('johann sebastian bach')).toBe('Johann Sebastian Bach')
    expect(toTitleCase('wolfgang amadeus mozart')).toBe(
      'Wolfgang Amadeus Mozart'
    )
    expect(toTitleCase('pyotr ilyich tchaikovsky')).toBe(
      'Pyotr Ilyich Tchaikovsky'
    )
  })

  it('should handle names with particles correctly', () => {
    expect(toTitleCase('ludwig van beethoven')).toBe('Ludwig van Beethoven')
    expect(toTitleCase('claude debussy')).toBe('Claude Debussy')
    expect(toTitleCase('antonio vivaldi')).toBe('Antonio Vivaldi')
    expect(toTitleCase('carl philipp emanuel bach')).toBe(
      'Carl Philipp Emanuel Bach'
    )
  })

  it('should capitalize particles when they start the name', () => {
    expect(toTitleCase('van beethoven')).toBe('Van Beethoven')
    expect(toTitleCase('von weber')).toBe('Von Weber')
    expect(toTitleCase('de falla')).toBe('De Falla')
  })

  it('should handle initials correctly', () => {
    expect(toTitleCase('j.s. bach')).toBe('J.S. Bach')
    expect(toTitleCase('j. s. bach')).toBe('J. S. Bach')
    expect(toTitleCase('c.p.e. bach')).toBe('C.P.E. Bach')
    expect(toTitleCase('w.a. mozart')).toBe('W.A. Mozart')
  })

  it('should handle hyphenated names', () => {
    expect(toTitleCase('saint-saëns')).toBe('Saint-Saëns')
    expect(toTitleCase('rimsky-korsakov')).toBe('Rimsky-Korsakov')
    expect(toTitleCase('villa-lobos')).toBe('Villa-Lobos')
  })

  it('should handle apostrophes in names', () => {
    expect(toTitleCase("o'brien")).toBe("O'Brien")
    expect(toTitleCase("d'angelo")).toBe("D'Angelo")
    expect(toTitleCase("d'indy")).toBe("D'Indy")
  })

  it('should handle all caps input', () => {
    expect(toTitleCase('JOHN WILLIAMS')).toBe('John Williams')
    expect(toTitleCase('PHILIP GLASS')).toBe('Philip Glass')
    expect(toTitleCase('STEVE REICH')).toBe('Steve Reich')
  })

  it('should handle mixed case input', () => {
    expect(toTitleCase('JoHn WiLLiAmS')).toBe('John Williams')
    expect(toTitleCase('LuDwIg VaN bEeThOvEn')).toBe('Ludwig van Beethoven')
  })

  it('should handle empty and null inputs', () => {
    expect(toTitleCase('')).toBe('')
    expect(toTitleCase('   ')).toBe('   ')
  })

  it('should preserve multiple spaces', () => {
    expect(toTitleCase('john  williams')).toBe('John  Williams')
  })

  it('should handle various international particles', () => {
    // Italian
    expect(toTitleCase('giuseppe di stefano')).toBe('Giuseppe di Stefano')
    expect(toTitleCase('lorenzo da ponte')).toBe('Lorenzo da Ponte')
    expect(toTitleCase('francesco della viola')).toBe('Francesco della Viola')

    // French
    expect(toTitleCase('gabriel de machaut')).toBe('Gabriel de Machaut')
    expect(toTitleCase('josquin des prez')).toBe('Josquin des Prez')
    expect(toTitleCase('jean de la rue')).toBe('Jean de la Rue')

    // Spanish/Portuguese
    expect(toTitleCase('manuel de falla')).toBe('Manuel de Falla')
    expect(toTitleCase('heitor villa-lobos')).toBe('Heitor Villa-Lobos')
  })

  it('should handle edge cases', () => {
    expect(toTitleCase('a')).toBe('A')
    expect(toTitleCase('i')).toBe('I')
    expect(toTitleCase('von')).toBe('Von') // First word should be capitalized
    expect(toTitleCase('the beatles')).toBe('The Beatles') // "the" at start should be capitalized
  })
})

describe('formatComposerName', () => {
  it('should be an alias for toTitleCase', () => {
    expect(formatComposerName('johann sebastian bach')).toBe(
      'Johann Sebastian Bach'
    )
    expect(formatComposerName('ludwig van beethoven')).toBe(
      'Ludwig van Beethoven'
    )
    expect(formatComposerName('j.s. bach')).toBe('J.S. Bach')
  })
})
