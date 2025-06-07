/**
 * Tests for curated pieces module
 * Following TDD principles - tests define the expected behavior
 */

// Jest/vitest globals are available in test environment

// Import functions that we will implement
import {
  getCuratedPieces,
  getCuratedPianoHo,
  getCuratedGuitarPieces,
  getPieceById,
  getCuratedPiecesByInstrument,
  getCuratedPiecesByDifficulty,
} from './curatedPieces'

describe('Curated Pieces Module', () => {
  describe('getCuratedPieces', () => {
    it('should return an array of 10 curated pieces', () => {
      const pieces = getCuratedPieces()
      expect(pieces).toHaveLength(10)
      expect(Array.isArray(pieces)).toBe(true)
    })

    it('should return pieces with all required SheetMusic properties', () => {
      const pieces = getCuratedPieces()

      pieces.forEach(piece => {
        expect(piece).toHaveProperty('id')
        expect(piece).toHaveProperty('title')
        expect(piece).toHaveProperty('composer')
        expect(piece).toHaveProperty('instrument')
        expect(piece).toHaveProperty('difficulty')
        expect(piece).toHaveProperty('difficultyLevel')
        expect(piece).toHaveProperty('durationSeconds')
        expect(piece).toHaveProperty('timeSignature')
        expect(piece).toHaveProperty('keySignature')
        expect(piece).toHaveProperty('suggestedTempo')
        expect(piece).toHaveProperty('stylePeriod')
        expect(piece).toHaveProperty('tags')
        expect(piece).toHaveProperty('measures')
        expect(piece).toHaveProperty('metadata')
      })
    })

    it('should include exactly 5 piano pieces', () => {
      const pieces = getCuratedPieces()
      const pianoPieces = pieces.filter(piece => piece.instrument === 'PIANO')
      expect(pianoPieces).toHaveLength(5)
    })

    it('should include exactly 5 guitar pieces', () => {
      const pieces = getCuratedPieces()
      const guitarPieces = pieces.filter(piece => piece.instrument === 'GUITAR')
      expect(guitarPieces).toHaveLength(5)
    })
  })

  describe('Piano Pieces', () => {
    it('should include Bach Minuet in G', () => {
      const pieces = getCuratedPianoHo()
      const bachMinuet = pieces.find(
        piece =>
          piece.composer === 'Johann Sebastian Bach' &&
          piece.title.includes('Minuet in G')
      )
      expect(bachMinuet).toBeDefined()
      expect(bachMinuet?.keySignature).toBe('G major')
      expect(bachMinuet?.stylePeriod).toBe('BAROQUE')
      expect(bachMinuet?.difficultyLevel).toBeLessThanOrEqual(4)
    })

    it('should include Mozart Sonata K.545', () => {
      const pieces = getCuratedPianoHo()
      const mozartSonata = pieces.find(
        piece =>
          piece.composer === 'Wolfgang Amadeus Mozart' &&
          piece.opus?.includes('K.545')
      )
      expect(mozartSonata).toBeDefined()
      expect(mozartSonata?.stylePeriod).toBe('CLASSICAL')
      expect(mozartSonata?.keySignature).toBe('C major')
    })

    it('should include Clementi Sonatina Op.36 No.1', () => {
      const pieces = getCuratedPianoHo()
      const clementiSonatina = pieces.find(
        piece =>
          piece.composer === 'Muzio Clementi' && piece.opus?.includes('Op.36')
      )
      expect(clementiSonatina).toBeDefined()
      expect(clementiSonatina?.stylePeriod).toBe('CLASSICAL')
    })

    it('should include Schumann Melody', () => {
      const pieces = getCuratedPianoHo()
      const schumannMelody = pieces.find(
        piece =>
          piece.composer === 'Robert Schumann' && piece.title.includes('Melody')
      )
      expect(schumannMelody).toBeDefined()
      expect(schumannMelody?.stylePeriod).toBe('ROMANTIC')
      expect(schumannMelody?.opus?.includes('Op.68')).toBe(true)
    })

    it('should include Chopin Prelude Op.28 No.7', () => {
      const pieces = getCuratedPianoHo()
      const chopinPrelude = pieces.find(
        piece =>
          piece.composer === 'Frederic Chopin' && piece.opus?.includes('Op.28')
      )
      expect(chopinPrelude).toBeDefined()
      expect(chopinPrelude?.stylePeriod).toBe('ROMANTIC')
      expect(chopinPrelude?.keySignature).toBe('A major')
    })
  })

  describe('Guitar Pieces', () => {
    it('should include Sor Study Op.60 No.1', () => {
      const pieces = getCuratedGuitarPieces()
      const sorStudy = pieces.find(
        piece =>
          piece.composer === 'Fernando Sor' && piece.opus?.includes('Op.60')
      )
      expect(sorStudy).toBeDefined()
      expect(sorStudy?.keySignature).toBe('C major')
      expect(sorStudy?.stylePeriod).toBe('CLASSICAL')
    })

    it('should include Giuliani Arpeggio Study', () => {
      const pieces = getCuratedGuitarPieces()
      const giulianiStudy = pieces.find(
        piece =>
          piece.composer === 'Mauro Giuliani' &&
          piece.title.includes('Arpeggio')
      )
      expect(giulianiStudy).toBeDefined()
      expect(giulianiStudy?.stylePeriod).toBe('CLASSICAL')
    })

    it('should include Carcassi Etude Op.60 No.1', () => {
      const pieces = getCuratedGuitarPieces()
      const carcassiEtude = pieces.find(
        piece =>
          piece.composer === 'Matteo Carcassi' && piece.opus?.includes('Op.60')
      )
      expect(carcassiEtude).toBeDefined()
      expect(carcassiEtude?.stylePeriod).toBe('CLASSICAL')
    })

    it('should include Tárrega Lágrima', () => {
      const pieces = getCuratedGuitarPieces()
      const tarregaLagrima = pieces.find(
        piece =>
          piece.composer === 'Francisco Tárrega' &&
          piece.title.includes('Lágrima')
      )
      expect(tarregaLagrima).toBeDefined()
      expect(tarregaLagrima?.stylePeriod).toBe('ROMANTIC')
    })

    it('should include Spanish Romance', () => {
      const pieces = getCuratedGuitarPieces()
      const spanishRomance = pieces.find(
        piece =>
          piece.title.includes('Romance') ||
          piece.title.includes('Spanish Romance')
      )
      expect(spanishRomance).toBeDefined()
      expect(spanishRomance?.stylePeriod).toBe('CLASSICAL')
    })
  })

  describe('Utility Functions', () => {
    it('should find piece by ID', () => {
      const pieces = getCuratedPieces()
      const firstPiece = pieces[0]
      const foundPiece = getPieceById(firstPiece.id)
      expect(foundPiece).toEqual(firstPiece)
    })

    it('should return null for non-existent ID', () => {
      const foundPiece = getPieceById('non-existent-id')
      expect(foundPiece).toBeNull()
    })

    it('should filter pieces by instrument', () => {
      const pianoPieces = getCuratedPiecesByInstrument('PIANO')
      const guitarPieces = getCuratedPiecesByInstrument('GUITAR')

      expect(pianoPieces).toHaveLength(5)
      expect(guitarPieces).toHaveLength(5)

      pianoPieces.forEach(piece => {
        expect(piece.instrument).toBe('PIANO')
      })

      guitarPieces.forEach(piece => {
        expect(piece.instrument).toBe('GUITAR')
      })
    })

    it('should filter pieces by difficulty', () => {
      const beginnerPieces = getCuratedPiecesByDifficulty('BEGINNER')
      const intermediatePieces = getCuratedPiecesByDifficulty('INTERMEDIATE')
      const advancedPieces = getCuratedPiecesByDifficulty('ADVANCED')

      beginnerPieces.forEach(piece => {
        expect(piece.difficulty).toBe('BEGINNER')
        expect(piece.difficultyLevel).toBeLessThanOrEqual(3)
      })

      intermediatePieces.forEach(piece => {
        expect(piece.difficulty).toBe('INTERMEDIATE')
        expect(piece.difficultyLevel).toBeGreaterThanOrEqual(4)
        expect(piece.difficultyLevel).toBeLessThanOrEqual(6)
      })

      advancedPieces.forEach(piece => {
        expect(piece.difficulty).toBe('ADVANCED')
        expect(piece.difficultyLevel).toBeGreaterThanOrEqual(7)
      })
    })
  })

  describe('Data Quality', () => {
    it('should have unique IDs for all pieces', () => {
      const pieces = getCuratedPieces()
      const ids = pieces.map(piece => piece.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(pieces.length)
    })

    it('should have non-empty measures for all pieces', () => {
      const pieces = getCuratedPieces()
      pieces.forEach(piece => {
        expect(piece.measures.length).toBeGreaterThan(0)
        expect(piece.measures[0].notes.length).toBeGreaterThan(0)
      })
    })

    it('should have appropriate tags for educational content', () => {
      const pieces = getCuratedPieces()
      pieces.forEach(piece => {
        expect(piece.tags).toContain('curated')
        expect(piece.tags).toContain('educational')
        expect(piece.tags.length).toBeGreaterThan(2)
      })
    })

    it('should have metadata with source and license information', () => {
      const pieces = getCuratedPieces()
      pieces.forEach(piece => {
        expect(piece.metadata).toBeDefined()
        expect(piece.metadata?.source).toBeDefined()
        expect(piece.metadata?.license).toBeDefined()
        expect(piece.metadata?.license).toBe('Public Domain')
      })
    })

    it('should have realistic duration estimates', () => {
      const pieces = getCuratedPieces()
      pieces.forEach(piece => {
        // Should be between 30 seconds and 5 minutes for curated pieces
        expect(piece.durationSeconds).toBeGreaterThan(30)
        expect(piece.durationSeconds).toBeLessThan(300)
      })
    })

    it('should have appropriate tempo markings', () => {
      const pieces = getCuratedPieces()
      pieces.forEach(piece => {
        expect(piece.suggestedTempo).toBeGreaterThan(40)
        expect(piece.suggestedTempo).toBeLessThan(200)
      })
    })
  })
})
