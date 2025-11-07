import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import PlanCheckInModal from './PlanCheckInModal'
import { useLogbookStore } from '@/stores/logbookStore'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import type { PracticePlan, PlanOccurrence } from '@/api/planning'
import {
  buildPracticePlan,
  buildPlanOccurrence,
  buildPlanSegment,
  resetIdCounter,
} from '@/tests/builders/planning.builders'

// Mock i18n
vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('@/tests/mocks/i18n')
  return actual.i18nMock
})

// Mock stores and hooks
vi.mock('@/stores/logbookStore')
vi.mock('@/hooks/useUserPreferences')

describe('PlanCheckInModal', () => {
  const mockCreateEntry = vi.fn()
  const mockGetPrimaryInstrument = vi.fn()

  const mockPlan = buildPracticePlan({
    id: 'plan1',
    title: 'Daily Practice Routine',
    schedule: { durationMinutes: 45 },
  })

  const mockOccurrence = buildPlanOccurrence({
    id: 'occ1',
    planId: 'plan1',
    segments: [
      buildPlanSegment({ label: 'Warm-up', durationMinutes: 10, techniques: ['scales'] }),
      buildPlanSegment({ label: 'Technical Work', durationMinutes: 20, techniques: ['arpeggios', 'etudes'] }),
      buildPlanSegment({ label: 'Repertoire', durationMinutes: 15, instructions: 'Focus on dynamics' }),
    ],
    reflectionPrompts: [
      'How did the warm-up feel?',
      'Any tension areas?',
      'What needs more work?',
    ],
  })

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    plan: mockPlan,
    occurrence: mockOccurrence,
    onComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()

    vi.mocked(useLogbookStore).mockReturnValue({
      createEntry: mockCreateEntry,
    } as any)

    vi.mocked(useUserPreferences).mockReturnValue({
      getPrimaryInstrument: mockGetPrimaryInstrument,
    } as any)

    mockGetPrimaryInstrument.mockReturnValue('piano')
    mockCreateEntry.mockResolvedValue({ id: 'log123' })
  })

  describe('Modal rendering', () => {
    it('should render modal with plan details', () => {
      render(<PlanCheckInModal {...mockProps} />)

      expect(screen.getByText('Check in and log practice')).toBeInTheDocument()
      expect(screen.getByText('Daily Practice Routine')).toBeInTheDocument()
    })

    it('should display session segments', () => {
      render(<PlanCheckInModal {...mockProps} />)

      expect(screen.getByText('Warm-up')).toBeInTheDocument()
      expect(screen.getByText('Technical Work')).toBeInTheDocument()
      expect(screen.getByText('Repertoire')).toBeInTheDocument()
    })

    it('should show segment durations', () => {
      render(<PlanCheckInModal {...mockProps} />)

      expect(screen.getByText('10m')).toBeInTheDocument()
      expect(screen.getByText('20m')).toBeInTheDocument()
      expect(screen.getByText('15m')).toBeInTheDocument()
    })

    it('should display segment instructions', () => {
      render(<PlanCheckInModal {...mockProps} />)

      expect(screen.getByText('Focus on dynamics')).toBeInTheDocument()
    })

    it('should show segment techniques', () => {
      render(<PlanCheckInModal {...mockProps} />)

      expect(screen.getByText(/scales/)).toBeInTheDocument()
      expect(screen.getByText(/arpeggios/)).toBeInTheDocument()
      expect(screen.getByText(/etudes/)).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<PlanCheckInModal {...mockProps} isOpen={false} />)

      expect(screen.queryByText('Check in and log practice')).not.toBeInTheDocument()
    })
  })

  describe('Duration handling', () => {
    it('should pre-fill duration from plan', () => {
      render(<PlanCheckInModal {...mockProps} />)

      const durationInput = screen.getByLabelText('Actual duration (minutes)') as HTMLInputElement
      expect(durationInput.value).toBe('45')
    })

    it('should calculate duration from segments if not in plan', () => {
      const planWithoutDuration = {
        ...mockPlan,
        schedule: { ...mockPlan.schedule, durationMinutes: undefined },
      }

      render(
        <PlanCheckInModal
          {...mockProps}
          plan={planWithoutDuration}
        />
      )

      const durationInput = screen.getByLabelText('Actual duration (minutes)') as HTMLInputElement
      // Should sum segment durations: 10 + 20 + 15 = 45
      expect(durationInput.value).toBe('45')
    })

    it('should default to 30 minutes if no duration info', () => {
      const planWithoutDuration = {
        ...mockPlan,
        schedule: { ...mockPlan.schedule, durationMinutes: undefined },
      }

      const occurrenceWithoutSegments = {
        ...mockOccurrence,
        segments: [],
      }

      render(
        <PlanCheckInModal
          {...mockProps}
          plan={planWithoutDuration}
          occurrence={occurrenceWithoutSegments}
        />
      )

      const durationInput = screen.getByLabelText('Actual duration (minutes)') as HTMLInputElement
      expect(durationInput.value).toBe('30')
    })

    it('should allow user to modify duration', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      const durationInput = screen.getByLabelText('Actual duration (minutes)') as HTMLInputElement
      await user.clear(durationInput)
      await user.type(durationInput, '60')

      expect(durationInput.value).toBe('60')
    })

    it('should handle invalid duration values', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      const durationInput = screen.getByLabelText('Actual duration (minutes)') as HTMLInputElement
      await user.clear(durationInput)
      await user.type(durationInput, '-10')

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            duration: 1, // Should default to 1 for invalid values
          })
        )
      })
    })
  })

  describe('Reflection prompts', () => {
    it('should render all reflection prompts', () => {
      render(<PlanCheckInModal {...mockProps} />)

      expect(screen.getByText('Reflection')).toBeInTheDocument()
      expect(screen.getByLabelText('How did the warm-up feel?')).toBeInTheDocument()
      expect(screen.getByLabelText('Any tension areas?')).toBeInTheDocument()
      expect(screen.getByLabelText('What needs more work?')).toBeInTheDocument()
    })

    it('should handle prompt responses', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      const prompt1 = screen.getByLabelText('How did the warm-up feel?') as HTMLTextAreaElement
      const prompt2 = screen.getByLabelText('Any tension areas?') as HTMLTextAreaElement

      await user.type(prompt1, 'Felt good, fingers were responsive')
      await user.type(prompt2, 'Slight tension in left shoulder')

      expect(prompt1.value).toBe('Felt good, fingers were responsive')
      expect(prompt2.value).toBe('Slight tension in left shoulder')
    })

    it('should show message when no prompts configured', () => {
      const occurrenceWithoutPrompts = {
        ...mockOccurrence,
        reflectionPrompts: [],
      }

      render(
        <PlanCheckInModal
          {...mockProps}
          occurrence={occurrenceWithoutPrompts}
        />
      )

      expect(screen.getByText('No prompts configured for this session.')).toBeInTheDocument()
    })
  })

  describe('Notes field', () => {
    it('should render notes input field', () => {
      render(<PlanCheckInModal {...mockProps} />)

      const notesInput = screen.getByLabelText('Notes')
      expect(notesInput).toBeInTheDocument()
      expect(notesInput.getAttribute('placeholder')).toBe('What stood out about this session?')
    })

    it('should handle notes input', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      const notesInput = screen.getByLabelText('Notes')
      await user.type(notesInput, 'Great progress on scales today')

      expect((notesInput as HTMLInputElement).value).toBe('Great progress on scales today')
    })

    it('should use default note if no user notes provided', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      // Don't enter any notes
      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Daily Practice Routine · Logged from practice plan',
          })
        )
      })
    })
  })

  describe('Form submission', () => {
    it('should create logbook entry on submit', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      // Fill in form
      await user.type(screen.getByLabelText('Notes'), 'Practice notes')
      await user.type(
        screen.getByLabelText('How did the warm-up feel?'),
        'Good warm-up'
      )

      // Submit
      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            duration: 45,
            type: 'practice',
            instrument: 'piano',
            techniques: ['scales', 'arpeggios', 'etudes'],
            notes: 'Practice notes',
            metadata: {
              source: 'practice_plan',
              planId: 'plan1',
              planOccurrenceId: 'occ1',
            },
          })
        )
      })
    })

    it('should call onComplete with occurrence data', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      // Fill reflection prompts
      await user.type(
        screen.getByLabelText('How did the warm-up feel?'),
        'Felt great'
      )
      await user.type(
        screen.getByLabelText('Any tension areas?'),
        'No tension'
      )

      // Modify duration
      const durationInput = screen.getByLabelText('Actual duration (minutes)')
      await user.clear(durationInput)
      await user.type(durationInput, '50')

      // Submit
      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockProps.onComplete).toHaveBeenCalledWith({
          occurrenceId: 'occ1',
          logEntryId: 'log123',
          responses: {
            'How did the warm-up feel?': 'Felt great',
            'Any tension areas?': 'No tension',
            'What needs more work?': '',
          },
          metrics: {
            actualDuration: 50,
          },
        })
      })
    })

    it('should handle submission error from createEntry', async () => {
      const user = userEvent.setup()
      mockCreateEntry.mockRejectedValue(new Error('Failed to create entry'))

      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(screen.getByText('Unable to complete check-in')).toBeInTheDocument()
      })

      expect(mockProps.onComplete).not.toHaveBeenCalled()
      expect(mockProps.onClose).not.toHaveBeenCalled()
    })

    it('should handle submission error from onComplete', async () => {
      const user = userEvent.setup()
      mockProps.onComplete.mockRejectedValue(new Error('Failed to update occurrence'))

      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(screen.getByText('Unable to complete check-in')).toBeInTheDocument()
      })
    })

    it('should disable buttons while submitting', async () => {
      const user = userEvent.setup()

      // Make createEntry slow
      mockCreateEntry.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: 'log123' }), 100))
      )

      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      // Buttons should be disabled during submission
      expect(screen.getByText('Check off')).toBeDisabled()
      expect(screen.getByText('Cancel')).toBeDisabled()

      await waitFor(() => {
        expect(mockProps.onComplete).toHaveBeenCalled()
      })
    })

    it('should close modal after successful submission', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockProps.onClose).toHaveBeenCalled()
      })
    })
  })

  describe('Cancel behavior', () => {
    it('should call onClose when cancel clicked', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Cancel'))

      expect(mockProps.onClose).toHaveBeenCalledTimes(1)
      expect(mockCreateEntry).not.toHaveBeenCalled()
      expect(mockProps.onComplete).not.toHaveBeenCalled()
    })

    it('should not allow cancel while submitting', async () => {
      const user = userEvent.setup()

      // Make createEntry slow
      mockCreateEntry.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: 'log123' }), 100))
      )

      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      // Try to cancel during submission
      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Form reset', () => {
    it('should reset form when modal reopens', () => {
      const { rerender } = render(<PlanCheckInModal {...mockProps} />)

      // Enter some data
      const notesInput = screen.getByLabelText('Notes') as HTMLInputElement
      fireEvent.change(notesInput, { target: { value: 'Test notes' } })
      expect(notesInput.value).toBe('Test notes')

      // Close modal
      rerender(<PlanCheckInModal {...mockProps} isOpen={false} />)

      // Reopen modal
      rerender(<PlanCheckInModal {...mockProps} isOpen={true} />)

      // Form should be reset
      const newNotesInput = screen.getByLabelText('Notes') as HTMLInputElement
      expect(newNotesInput.value).toBe('')
    })

    it('should clear error when modal reopens', async () => {
      const user = userEvent.setup()
      mockCreateEntry.mockRejectedValueOnce(new Error('Error'))

      const { rerender } = render(<PlanCheckInModal {...mockProps} />)

      // Trigger error
      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(screen.getByText('Unable to complete check-in')).toBeInTheDocument()
      })

      // Close and reopen
      rerender(<PlanCheckInModal {...mockProps} isOpen={false} />)
      rerender(<PlanCheckInModal {...mockProps} isOpen={true} />)

      // Error should be cleared
      expect(screen.queryByText('Unable to complete check-in')).not.toBeInTheDocument()
    })
  })

  describe('Instrument handling', () => {
    it('should use primary instrument from preferences', async () => {
      const user = userEvent.setup()
      mockGetPrimaryInstrument.mockReturnValue('guitar')

      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            instrument: 'guitar',
          })
        )
      })
    })

    it('should handle invalid instrument gracefully', async () => {
      const user = userEvent.setup()
      mockGetPrimaryInstrument.mockReturnValue('invalid-instrument')

      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            instrument: expect.any(String), // Should still have some instrument
          })
        )
      })
    })

    it('should handle null instrument', async () => {
      const user = userEvent.setup()
      mockGetPrimaryInstrument.mockReturnValue(null)

      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            instrument: expect.any(String), // Should default to something
          })
        )
      })
    })
  })

  describe('Techniques aggregation', () => {
    it('should aggregate techniques from all segments', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            techniques: ['scales', 'arpeggios', 'etudes'], // All unique techniques
          })
        )
      })
    })

    it('should deduplicate techniques', async () => {
      const user = userEvent.setup()

      const occurrenceWithDuplicates = {
        ...mockOccurrence,
        segments: [
          buildPlanSegment({ techniques: ['scales', 'arpeggios'] }),
          buildPlanSegment({ techniques: ['scales', 'etudes'] }),
          buildPlanSegment({ techniques: ['arpeggios', 'scales'] }),
        ],
      }

      render(
        <PlanCheckInModal
          {...mockProps}
          occurrence={occurrenceWithDuplicates}
        />
      )

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            techniques: ['scales', 'arpeggios', 'etudes'], // Deduplicated
          })
        )
      })
    })

    it('should handle segments without techniques', async () => {
      const user = userEvent.setup()

      const occurrenceWithoutTechniques = {
        ...mockOccurrence,
        segments: [
          buildPlanSegment({ techniques: undefined }),
          buildPlanSegment({ techniques: [] }),
          buildPlanSegment({ techniques: ['scales'] }),
        ],
      }

      render(
        <PlanCheckInModal
          {...mockProps}
          occurrence={occurrenceWithoutTechniques}
        />
      )

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            techniques: ['scales'], // Only valid techniques
          })
        )
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty segments', async () => {
      const user = userEvent.setup()

      const occurrenceWithoutSegments = {
        ...mockOccurrence,
        segments: [],
      }

      render(
        <PlanCheckInModal
          {...mockProps}
          occurrence={occurrenceWithoutSegments}
        />
      )

      // Should still render and function
      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            techniques: [],
          })
        )
      })
    })

    it('should handle very long text inputs', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      const longText = 'a'.repeat(1000)
      const notesInput = screen.getByLabelText('Notes')
      await user.type(notesInput, longText)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: longText,
          })
        )
      })
    })

    it('should handle special characters in responses', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      const specialText = 'Test with "quotes" & <special> chars\n and newlines'
      const prompt = screen.getByLabelText('How did the warm-up feel?')
      await user.type(prompt, specialText)

      await user.click(screen.getByText('Check off'))

      await waitFor(() => {
        expect(mockProps.onComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            responses: expect.objectContaining({
              'How did the warm-up feel?': specialText,
            }),
          })
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<PlanCheckInModal {...mockProps} />)

      expect(screen.getByLabelText('Actual duration (minutes)')).toBeInTheDocument()
      expect(screen.getByLabelText('Notes')).toBeInTheDocument()
      expect(screen.getByLabelText('How did the warm-up feel?')).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      render(<PlanCheckInModal {...mockProps} />)

      const checkOffButton = screen.getByRole('button', { name: 'Check off' })
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })

      expect(checkOffButton).toHaveAccessibleName('Check off')
      expect(cancelButton).toHaveAccessibleName('Cancel')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PlanCheckInModal {...mockProps} />)

      // Tab through form
      await user.tab()
      expect(document.activeElement).toHaveAccessibleName()

      await user.tab()
      expect(document.activeElement).toHaveAccessibleName()
    })
  })
})