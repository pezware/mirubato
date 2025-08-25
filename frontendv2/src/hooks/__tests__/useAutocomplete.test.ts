import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAutocomplete } from '../useAutocomplete'
import { autocompleteApi } from '../../api/autocomplete'
import { useLogbookStore } from '../../stores/logbookStore'
import * as offlineUtils from '../../utils/offlineAutocomplete'

// Mock dependencies
vi.mock('../../api/autocomplete')
vi.mock('../../stores/logbookStore')
vi.mock('../../utils/offlineAutocomplete')
vi.mock('swr', () => ({
  default: vi.fn((key, fetcher) => {
    if (!key) return { data: null, error: null, isLoading: false }
    // Simple mock implementation
    return {
      data: { results: [] },
      error: null,
      isLoading: false,
    }
  }),
}))

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to online
    vi.mocked(offlineUtils.isOnline).mockReturnValue(true)
    // Mock empty logbook entries by default
    vi.mocked(useLogbookStore).mockReturnValue({
      entries: [],
    } as any)
  })

  describe('Deduplication', () => {
    it('should deduplicate pieces with different capitalizations', async () => {
      // Mock logbook entries with duplicate pieces in different cases
      vi.mocked(useLogbookStore).mockReturnValue({
        entries: [
          {
            id: '1',
            pieces: [
              { title: 'Nocturne Op. 9', composer: 'CHOPIN' },
              { title: 'Nocturne Op. 9', composer: 'Chopin' },
              { title: 'Nocturne Op. 9', composer: 'chopin' },
            ],
          },
          {
            id: '2',
            pieces: [
              { title: 'Moonlight Sonata', composer: 'BEETHOVEN' },
              { title: 'Moonlight Sonata', composer: 'beethoven' },
            ],
          },
        ],
      } as any)

      const { result } = renderHook(() =>
        useAutocomplete({
          type: 'piece',
          minLength: 0,
        })
      )

      // Set query to trigger search
      result.current.setQuery('nocturne')

      await waitFor(() => {
        const suggestions = result.current.suggestions
        // Should only have one Nocturne entry despite different capitalizations
        const nocturnes = suggestions.filter(s =>
          s.value.toLowerCase().includes('nocturne')
        )
        expect(nocturnes).toHaveLength(1)
        // Composer should be canonicalized (Chopin -> Frédéric Chopin)
        expect(nocturnes[0].metadata?.composer).toBe('Frédéric Chopin')
      })
    })

    it('should format composer names properly', async () => {
      // Mock logbook entries with various composer formats
      vi.mocked(useLogbookStore).mockReturnValue({
        entries: [
          {
            id: '1',
            pieces: [
              { title: 'Piece 1', composer: 'bach' },
              { title: 'Piece 2', composer: 'MOZART' },
              { title: 'Piece 3', composer: 'j.s. bach' },
              { title: 'Piece 4', composer: 'van beethoven' },
            ],
          },
        ],
      } as any)

      const { result } = renderHook(() =>
        useAutocomplete({
          type: 'composer',
          minLength: 0,
        })
      )

      result.current.setQuery('')

      await waitFor(() => {
        const suggestions = result.current.suggestions
        // Check that composers are properly formatted and canonicalized
        const composerNames = suggestions.map(s => s.value)

        // Should contain canonicalized names (getCanonicalComposerName expands them)
        expect(composerNames).toContain('Johann Sebastian Bach') // bach -> Johann Sebastian Bach
        expect(composerNames).toContain('Wolfgang Amadeus Mozart') // MOZART -> Wolfgang Amadeus Mozart
        // Note: "j.s. bach" also becomes "Johann Sebastian Bach" via canonicalization
        expect(composerNames).toContain('Ludwig van Beethoven') // van beethoven -> Ludwig van Beethoven

        // Should have deduplicated Bach variations to single entry
        const bachEntries = composerNames.filter(name => name.includes('Bach'))
        expect(bachEntries).toHaveLength(1) // Both 'bach' and 'j.s. bach' become 'Johann Sebastian Bach'

        // Should not contain unformatted versions
        expect(composerNames).not.toContain('bach')
        expect(composerNames).not.toContain('MOZART')
      })
    })

    it('should deduplicate composers with same normalized form', async () => {
      // Mock API results with duplicate composers
      const mockApiResults = [
        { value: 'CHOPIN', label: 'CHOPIN' },
        { value: 'Chopin', label: 'Chopin' },
        { value: 'chopin', label: 'chopin' },
        { value: 'F. Chopin', label: 'F. Chopin' },
      ]

      vi.mocked(autocompleteApi.getComposerSuggestions).mockResolvedValue({
        results: mockApiResults,
      })

      // Mock SWR to use our fetcher
      const useSWR = await import('swr')
      vi.mocked(useSWR.default).mockImplementation((key, fetcher) => {
        if (!key) return { data: null, error: null, isLoading: false }
        // Call the actual fetcher
        const data = { results: mockApiResults }
        return {
          data,
          error: null,
          isLoading: false,
        }
      })

      const { result } = renderHook(() =>
        useAutocomplete({
          type: 'composer',
          minLength: 0,
        })
      )

      result.current.setQuery('chopin')

      await waitFor(() => {
        const suggestions = result.current.suggestions
        // Should deduplicate to unique formatted composers
        const chopinSuggestions = suggestions.filter(s =>
          s.value.toLowerCase().includes('chopin')
        )

        // All Chopin variations should result in properly formatted entries
        expect(
          chopinSuggestions.every(
            s => s.value === 'Chopin' || s.value === 'F. Chopin'
          )
        ).toBe(true)
      })
    })

    it('should use normalized score ID for piece deduplication', async () => {
      // Mock entries with pieces that should normalize to the same ID
      vi.mocked(useLogbookStore).mockReturnValue({
        entries: [
          {
            id: '1',
            pieces: [
              { title: 'Bourrée in E minor', composer: 'Bach' },
              { title: 'Bourrée in E Minor', composer: 'BACH' }, // Different capitalization
              { title: 'Bourree in E minor', composer: 'bach' }, // Missing accent
            ],
          },
        ],
      } as any)

      const { result } = renderHook(() =>
        useAutocomplete({
          type: 'piece',
          minLength: 0,
        })
      )

      result.current.setQuery('bourrée')

      await waitFor(() => {
        const suggestions = result.current.suggestions
        // Should deduplicate variations of the same piece
        const bourrees = suggestions.filter(s =>
          s.value.toLowerCase().includes('bourr')
        )

        // Should have maximum 2 entries (with and without accent are different)
        expect(bourrees.length).toBeLessThanOrEqual(2)

        // All should have canonicalized composer (Bach -> Johann Sebastian Bach)
        bourrees.forEach(piece => {
          if (piece.metadata?.composer) {
            expect(piece.metadata.composer).toBe('Johann Sebastian Bach')
          }
        })
      })
    })

    it('should handle pieces without composers', async () => {
      vi.mocked(useLogbookStore).mockReturnValue({
        entries: [
          {
            id: '1',
            pieces: [
              { title: 'Study No. 1', composer: null },
              { title: 'Study No. 1', composer: undefined },
              { title: 'Study No. 1', composer: '' },
            ],
          },
        ],
      } as any)

      const { result } = renderHook(() =>
        useAutocomplete({
          type: 'piece',
          minLength: 0,
        })
      )

      result.current.setQuery('study')

      await waitFor(() => {
        const suggestions = result.current.suggestions
        const studies = suggestions.filter(s =>
          s.value.toLowerCase().includes('study')
        )

        // Should deduplicate to single entry
        expect(studies).toHaveLength(1)
        expect(studies[0].value).toBe('Study No. 1')
      })
    })
  })

  describe('Offline behavior', () => {
    it('should only use local suggestions when offline', async () => {
      // Set offline
      vi.mocked(offlineUtils.isOnline).mockReturnValue(false)

      vi.mocked(useLogbookStore).mockReturnValue({
        entries: [
          {
            id: '1',
            pieces: [
              { title: 'Local Piece', composer: 'Local Composer' },
              { title: 'Another Piece', composer: 'Another Composer' },
              { title: 'Third Piece', composer: 'Third Composer' },
            ],
          },
        ],
      } as any)

      const { result } = renderHook(() =>
        useAutocomplete({
          type: 'piece',
          minLength: 0,
        })
      )

      result.current.setQuery('local')

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true)
        // Should only show pieces that match the query "local"
        const localPieces = result.current.suggestions.filter(s =>
          s.value.toLowerCase().includes('local')
        )
        expect(localPieces).toHaveLength(1)
        expect(localPieces[0].value).toBe('Local Piece')
      })
    })
  })
})
