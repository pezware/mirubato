import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeriodPresets } from '../PeriodPresets'
import { LogbookEntry } from '../../../../api/logbook'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('PeriodPresets', () => {
  const mockOnDataChange = vi.fn()

  const createEntry = (
    pieces: Array<{ title: string; composer?: string | null }>,
    timestamp: Date = new Date()
  ): LogbookEntry => ({
    id: Math.random().toString(),
    timestamp: timestamp.toISOString(),
    duration: 300,
    pieces,
    notes: '',
    instrument: 'piano',
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
    userId: 'test-user',
    syncStatus: 'synced',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Piece Deduplication', () => {
    it('should deduplicate pieces with different capitalizations', () => {
      const entries: LogbookEntry[] = [
        createEntry([
          { title: 'Nocturne Op. 9', composer: 'CHOPIN' },
          { title: 'Nocturne Op. 9', composer: 'Chopin' },
        ]),
        createEntry([{ title: 'nocturne op. 9', composer: 'chopin' }]),
      ]

      render(
        <PeriodPresets entries={entries} onDataChange={mockOnDataChange} />
      )

      // Click to show piece selector
      const selectButton = screen.getByText('reports:presets.selectPieces')
      fireEvent.click(selectButton)

      // Get all checkbox labels
      const checkboxes = screen.getAllByRole('checkbox')

      // Should only have one Nocturne entry despite different capitalizations
      const nocturneCheckboxes = checkboxes.filter(checkbox => {
        const label = checkbox.closest('label')
        return label?.textContent?.toLowerCase().includes('nocturne')
      })

      expect(nocturneCheckboxes).toHaveLength(1)
    })

    it('should format composer names properly in display', () => {
      const entries: LogbookEntry[] = [
        createEntry([
          { title: 'Piece 1', composer: 'bach' },
          { title: 'Piece 2', composer: 'MOZART' },
          { title: 'Piece 3', composer: 'j.s. bach' },
        ]),
      ]

      render(
        <PeriodPresets entries={entries} onDataChange={mockOnDataChange} />
      )

      // Click to show piece selector
      const selectButton = screen.getByText('reports:presets.selectPieces')
      fireEvent.click(selectButton)

      // Check that composers are properly formatted
      const pieceLabels = screen.getAllByRole('checkbox').map(checkbox => {
        const label = checkbox.closest('label')
        return label?.textContent || ''
      })

      // Should have properly formatted Bach (deduplicated)
      const bachPieces = pieceLabels.filter(label => label.includes('Bach'))
      expect(bachPieces.length).toBeGreaterThan(0)
      expect(bachPieces[0]).toMatch(/Bach/) // Properly capitalized

      // Should have properly formatted Mozart
      const mozartPieces = pieceLabels.filter(label => label.includes('Mozart'))
      expect(mozartPieces.length).toBeGreaterThan(0)
      expect(mozartPieces[0]).toMatch(/Mozart/) // Properly capitalized, not MOZART
    })

    it('should deduplicate pieces with and without composers', () => {
      const entries: LogbookEntry[] = [
        createEntry([
          { title: 'Study No. 1', composer: null },
          { title: 'Study No. 1', composer: undefined },
        ]),
        createEntry([{ title: 'Study No. 1', composer: '' }]),
      ]

      render(
        <PeriodPresets entries={entries} onDataChange={mockOnDataChange} />
      )

      // Click to show piece selector
      const selectButton = screen.getByText('reports:presets.selectPieces')
      fireEvent.click(selectButton)

      // Should only have one Study No. 1 entry
      const checkboxes = screen.getAllByRole('checkbox')
      const studyCheckboxes = checkboxes.filter(checkbox => {
        const label = checkbox.closest('label')
        return label?.textContent?.includes('Study No. 1')
      })

      expect(studyCheckboxes).toHaveLength(1)
    })

    it('should filter entries correctly when pieces are selected', async () => {
      const entries: LogbookEntry[] = [
        createEntry([{ title: 'Nocturne', composer: 'Chopin' }]),
        createEntry([
          { title: 'NOCTURNE', composer: 'CHOPIN' }, // Same piece, different case
        ]),
        createEntry([{ title: 'Sonata', composer: 'Mozart' }]),
      ]

      render(
        <PeriodPresets entries={entries} onDataChange={mockOnDataChange} />
      )

      // Click to show piece selector
      const selectButton = screen.getByText('reports:presets.selectPieces')
      fireEvent.click(selectButton)

      // Select the Chopin piece
      const checkboxes = screen.getAllByRole('checkbox')
      const chopinCheckbox = checkboxes.find(checkbox => {
        const label = checkbox.closest('label')
        return label?.textContent?.includes('Chopin')
      })

      if (chopinCheckbox) {
        fireEvent.click(chopinCheckbox)
      }

      // Wait for the effect to run
      await waitFor(() => {
        // Should have called onDataChange with filtered data
        expect(mockOnDataChange).toHaveBeenCalled()

        const lastCall =
          mockOnDataChange.mock.calls[mockOnDataChange.mock.calls.length - 1]
        const filteredData = lastCall[0]

        // Should include both entries with Nocturne (different cases)
        expect(filteredData).toHaveLength(2)
      })
    })

    it('should handle pieces with special characters consistently', () => {
      const entries: LogbookEntry[] = [
        createEntry([
          { title: 'Bourrée in E minor', composer: 'Bach' },
          { title: 'Bourree in E minor', composer: 'Bach' }, // Without accent
          { title: 'Bourrée in E Minor', composer: 'BACH' }, // Different capitalization
        ]),
      ]

      render(
        <PeriodPresets entries={entries} onDataChange={mockOnDataChange} />
      )

      // Click to show piece selector
      const selectButton = screen.getByText('reports:presets.selectPieces')
      fireEvent.click(selectButton)

      // Get all pieces
      const checkboxes = screen.getAllByRole('checkbox')
      const bourreeCheckboxes = checkboxes.filter(checkbox => {
        const label = checkbox.closest('label')
        return label?.textContent?.toLowerCase().includes('bourr')
      })

      // Should have at most 2 entries (with and without accent are different after normalization)
      expect(bourreeCheckboxes.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Display Formatting', () => {
    it('should show properly formatted composer names for known composers', () => {
      const entries: LogbookEntry[] = [
        createEntry([
          { title: 'Suite', composer: 'bach' },
          { title: 'Requiem', composer: 'MOZART' },
          { title: 'Symphony', composer: 'beethoven' },
        ]),
      ]

      render(
        <PeriodPresets entries={entries} onDataChange={mockOnDataChange} />
      )

      // Click to show piece selector
      const selectButton = screen.getByText('reports:presets.selectPieces')
      fireEvent.click(selectButton)

      const pieceLabels = screen.getAllByRole('checkbox').map(checkbox => {
        const label = checkbox.closest('label')
        return label?.textContent || ''
      })

      // Check for proper formatting
      expect(pieceLabels.some(label => label.includes('Bach'))).toBe(true)
      expect(pieceLabels.some(label => label.includes('Mozart'))).toBe(true)
      expect(pieceLabels.some(label => label.includes('Beethoven'))).toBe(true)

      // Should not have unformatted versions
      expect(
        pieceLabels.some(
          label => label.includes('bach') && !label.includes('Bach')
        )
      ).toBe(false)
      expect(pieceLabels.some(label => label.includes('MOZART'))).toBe(false)
    })

    it('should handle "Unknown" composer consistently', () => {
      const entries: LogbookEntry[] = [
        createEntry([
          { title: 'Study 1', composer: null },
          { title: 'Study 2', composer: undefined },
          { title: 'Study 3', composer: '' },
        ]),
      ]

      render(
        <PeriodPresets entries={entries} onDataChange={mockOnDataChange} />
      )

      // Click to show piece selector
      const selectButton = screen.getByText('reports:presets.selectPieces')
      fireEvent.click(selectButton)

      const pieceLabels = screen.getAllByRole('checkbox').map(checkbox => {
        const label = checkbox.closest('label')
        return label?.textContent || ''
      })

      // All should show "Unknown" for missing composer
      pieceLabels.forEach(label => {
        if (label.includes('Study')) {
          expect(label).toContain('Unknown')
        }
      })
    })
  })
})
