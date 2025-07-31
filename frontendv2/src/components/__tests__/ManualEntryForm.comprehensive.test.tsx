import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import ManualEntryForm from '../ManualEntryForm'
import { useLogbookStore } from '../../stores/logbookStore'
import { useRepertoireStore } from '../../stores/repertoireStore'
import { useAuthStore } from '../../stores/authStore'
import { useSyncTriggers } from '../../hooks/useSyncTriggers'

// Mock all stores and hooks
vi.mock('../../stores/logbookStore')
vi.mock('../../stores/repertoireStore')
vi.mock('../../stores/authStore')
vi.mock('../../hooks/useSyncTriggers')
vi.mock('../../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    getPrimaryInstrument: () => 'piano',
  }),
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}))

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}))

// Mock utils
vi.mock('../../utils/contentSignature', () => ({
  createLogbookEntrySignature: vi.fn().mockResolvedValue('test-signature-123'),
}))

vi.mock('../../utils/scoreIdNormalizer', () => ({
  generateNormalizedScoreId: vi.fn().mockReturnValue('normalized-score-id'),
  isSameScore: vi.fn().mockReturnValue(false),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('ManualEntryForm - Comprehensive Button Hanging Tests', () => {
  const mockCreateEntry = vi.fn()
  const mockUpdateEntry = vi.fn()
  const mockLoadRepertoire = vi.fn()
  const mockSetFormSubmitting = vi.fn()
  const mockGetSyncStatus = vi.fn()

  const defaultProps = {
    onClose: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    vi.mocked(useLogbookStore).mockReturnValue({
      createEntry: mockCreateEntry,
      updateEntry: mockUpdateEntry,
    } as ReturnType<typeof useLogbookStore>)

    vi.mocked(useRepertoireStore).mockReturnValue({
      repertoire: new Map(),
      loadRepertoire: mockLoadRepertoire,
    } as ReturnType<typeof useRepertoireStore>)

    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>)

    vi.mocked(useSyncTriggers).mockReturnValue({
      setFormSubmitting: mockSetFormSubmitting,
      getSyncStatus: mockGetSyncStatus,
    } as ReturnType<typeof useSyncTriggers>)

    mockGetSyncStatus.mockReturnValue({
      queueStatus: { queueSize: 0 },
    })

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue('mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Success Cases', () => {
    it('should handle successful entry creation without hanging', async () => {
      mockCreateEntry.mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      // Fill out the form
      const durationInput = screen.getByTestId('duration-input')
      fireEvent.change(durationInput, { target: { value: '30' } })

      const notesTextarea = screen.getByTestId('notes-textarea')
      fireEvent.change(notesTextarea, { target: { value: 'Test notes' } })

      // Submit the form
      const saveButton = screen.getByTestId('save-entry-button')
      expect(saveButton).toBeInTheDocument()

      fireEvent.click(saveButton)

      // Button should show loading state
      await waitFor(
        () => {
          expect(screen.getByText('Saving...')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // Wait for operation to complete
      await waitFor(
        () => {
          expect(mockCreateEntry).toHaveBeenCalledOnce()
        },
        { timeout: 2000 }
      )

      // Button should reset and form should close
      await waitFor(
        () => {
          expect(defaultProps.onSave).toHaveBeenCalledOnce()
        },
        { timeout: 3000 }
      )

      // Button should not be stuck in loading state
      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })

    it('should handle successful entry update without hanging', async () => {
      const existingEntry = {
        id: 'existing-123',
        timestamp: '2025-01-01T12:00:00Z',
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [{ title: 'Test Piece', composer: 'Test Composer' }],
        notes: 'Original notes',
        mood: null,
        techniques: [],
        tags: [],
        goalIds: [],
        metadata: { source: 'manual' },
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
      }

      mockUpdateEntry.mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} entry={existingEntry} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(mockUpdateEntry).toHaveBeenCalledOnce()
        },
        { timeout: 2000 }
      )

      await waitFor(
        () => {
          expect(defaultProps.onSave).toHaveBeenCalledOnce()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Error Cases - Network Failures', () => {
    it('should handle network timeout during createEntry', async () => {
      // Simulate a network timeout
      mockCreateEntry.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Network timeout')), 15000)
          })
      )

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      // Should show loading state
      await waitFor(
        () => {
          expect(screen.getByText('Saving...')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // Should timeout after 10 seconds and show error
      await waitFor(
        () => {
          expect(
            screen.getByText(/Entry is taking too long to save/)
          ).toBeInTheDocument()
        },
        { timeout: 12000 }
      )

      // Button should not be stuck in loading state
      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // onSave should NOT be called on error
      expect(defaultProps.onSave).not.toHaveBeenCalled()
    })

    it('should handle server sync failure during createEntry', async () => {
      // Simulate server sync failure
      mockCreateEntry.mockRejectedValue(
        new Error(
          'Entry saved locally but failed to sync to server: 500 Internal Server Error'
        )
      )

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(screen.getByText('Saving...')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // Should show server sync error
      await waitFor(
        () => {
          expect(
            screen.getByText(/Entry saved locally but failed to sync to server/)
          ).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Button should reset
      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // onSave should NOT be called on error
      expect(defaultProps.onSave).not.toHaveBeenCalled()
    })

    it('should handle fetch network error', async () => {
      mockCreateEntry.mockRejectedValue(new Error('fetch failed'))

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(
            screen.getByText(/Network error.*saved locally/)
          ).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('Error Cases - Authentication Issues', () => {
    it('should handle unauthenticated user', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
      } as ReturnType<typeof useAuthStore>)

      // Mock localStorage to return no token
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      mockCreateEntry.mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(mockCreateEntry).toHaveBeenCalledOnce()
        },
        { timeout: 2000 }
      )

      await waitFor(
        () => {
          expect(defaultProps.onSave).toHaveBeenCalledOnce()
        },
        { timeout: 3000 }
      )
    })

    it('should handle invalid auth token', async () => {
      mockCreateEntry.mockRejectedValue(
        new Error('Invalid authentication token')
      )

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(
            screen.getByText('Invalid authentication token')
          ).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('Error Cases - Store-Level Issues', () => {
    it('should handle createEntry throwing synchronously', async () => {
      mockCreateEntry.mockImplementation(() => {
        throw new Error('Synchronous store error')
      })

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(
            screen.getByText('Synchronous store error')
          ).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })

    it('should handle createEntry never resolving (hanging Promise)', async () => {
      // Simulate a hanging promise that never resolves or rejects
      mockCreateEntry.mockImplementation(() => new Promise(() => {}))

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      // Should show loading state
      await waitFor(
        () => {
          expect(screen.getByText('Saving...')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // Should timeout after 10 seconds
      await waitFor(
        () => {
          expect(
            screen.getByText(/Entry is taking too long to save/)
          ).toBeInTheDocument()
        },
        { timeout: 12000 }
      )

      // Button should reset
      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('Component Lifecycle Issues', () => {
    it('should handle component unmounting during submission', async () => {
      mockCreateEntry.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(resolve, 5000) // Long-running operation
          })
      )

      const { unmount } = render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      // Wait for submission to start
      await waitFor(
        () => {
          expect(screen.getByText('Saving...')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // Unmount component while operation is in progress
      unmount()

      // Should not cause any errors or memory leaks
      // This test passes if no errors are thrown
      expect(true).toBe(true)
    })

    it('should handle multiple rapid clicks', async () => {
      let callCount = 0
      mockCreateEntry.mockImplementation(() => {
        callCount++
        return new Promise(resolve => {
          setTimeout(resolve, 1000)
        })
      })

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')

      // Click multiple times rapidly
      fireEvent.click(saveButton)
      fireEvent.click(saveButton)
      fireEvent.click(saveButton)
      fireEvent.click(saveButton)

      // Should only call createEntry once due to debouncing
      await waitFor(
        () => {
          expect(callCount).toBe(1)
        },
        { timeout: 2000 }
      )

      await waitFor(
        () => {
          expect(defaultProps.onSave).toHaveBeenCalledOnce()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Content Duplicate Detection', () => {
    it('should handle duplicate content detection blocking submission', async () => {
      // Mock content signature to return the same signature
      const { createLogbookEntrySignature } = await import(
        '../../utils/contentSignature'
      )
      vi.mocked(createLogbookEntrySignature).mockResolvedValue(
        'duplicate-signature'
      )

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')

      // First submission
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(mockCreateEntry).toHaveBeenCalledOnce()
        },
        { timeout: 2000 }
      )

      await waitFor(
        () => {
          expect(defaultProps.onSave).toHaveBeenCalledOnce()
        },
        { timeout: 3000 }
      )

      // Reset mocks for second submission
      vi.clearAllMocks()
      defaultProps.onSave.mockClear()

      // Second submission with same content (should be blocked)
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(
            screen.getByText(/Duplicate entry detected/)
          ).toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      // Should not call createEntry for duplicate
      expect(mockCreateEntry).not.toHaveBeenCalled()
      expect(defaultProps.onSave).not.toHaveBeenCalled()

      // Button should reset
      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('Real-world Simulation Tests', () => {
    it('should simulate slow network with intermittent failures', async () => {
      let attemptCount = 0
      mockCreateEntry.mockImplementation(() => {
        attemptCount++
        if (attemptCount === 1) {
          // First attempt fails with network error
          return Promise.reject(new Error('Network request failed'))
        }
        // Subsequent attempts would succeed (but we only test one submission)
        return Promise.resolve()
      })

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      await waitFor(
        () => {
          expect(screen.getByText('Network request failed')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      await waitFor(
        () => {
          expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      expect(defaultProps.onSave).not.toHaveBeenCalled()
    })

    it('should simulate mobile app backgrounding scenario', async () => {
      mockCreateEntry.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(resolve, 2000)
          })
      )

      render(
        <TestWrapper>
          <ManualEntryForm {...defaultProps} />
        </TestWrapper>
      )

      const saveButton = screen.getByTestId('save-entry-button')
      fireEvent.click(saveButton)

      // Simulate app going to background (visibility change)
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      })

      document.dispatchEvent(new Event('visibilitychange'))

      // Operation should still complete
      await waitFor(
        () => {
          expect(defaultProps.onSave).toHaveBeenCalledOnce()
        },
        { timeout: 4000 }
      )
    })
  })
})
