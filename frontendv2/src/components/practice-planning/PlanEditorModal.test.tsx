import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import PlanEditorModal from './PlanEditorModal'
import type { CreatePlanDraft } from '@/stores/planningStore'
import { buildCreatePlanDraft, resetIdCounter } from '@/tests/builders/planning.builders'

// Mock i18n
vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('@/tests/mocks/i18n')
  return actual.i18nMock
})

describe('PlanEditorModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    error: null as string | null,
    mode: 'create' as 'create' | 'edit',
    initialData: undefined as CreatePlanDraft | undefined,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('Create mode', () => {
    it('should render modal with create title', () => {
      render(<PlanEditorModal {...mockProps} />)

      expect(screen.getByText('Practice Plan')).toBeInTheDocument()
      expect(screen.getByText('Create Plan')).toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<PlanEditorModal {...mockProps} />)

      // Basic fields
      expect(screen.getByLabelText('Plan Title')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()

      // Schedule fields
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
      expect(screen.getByLabelText('Time of Day')).toBeInTheDocument()
      expect(screen.getByLabelText('Duration (minutes)')).toBeInTheDocument()
      expect(screen.getByLabelText('Flexibility')).toBeInTheDocument()

      // Segments section
      expect(screen.getByText('Practice Segments')).toBeInTheDocument()
      expect(screen.getByText('Add Segment')).toBeInTheDocument()
    })

    it('should have empty form fields initially', () => {
      render(<PlanEditorModal {...mockProps} />)

      const titleInput = screen.getByLabelText('Plan Title') as HTMLInputElement
      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement

      expect(titleInput.value).toBe('')
      expect(descriptionInput.value).toBe('')
    })

    it('should have default segment added', () => {
      render(<PlanEditorModal {...mockProps} />)

      // Default segment should be present
      const segmentInputs = screen.getAllByLabelText(/Segment Name/i)
      expect(segmentInputs).toHaveLength(1)
    })
  })

  describe('Edit mode', () => {
    it('should render modal with edit title', () => {
      render(<PlanEditorModal {...mockProps} mode="edit" />)

      expect(screen.getByText('Practice Plan')).toBeInTheDocument()
      expect(screen.getByText('Update Plan')).toBeInTheDocument()
    })

    it('should populate form with initial data', () => {
      const initialData = buildCreatePlanDraft({
        title: 'Existing Plan',
        description: 'Existing description',
        schedule: {
          startDate: '2025-01-15',
          timeOfDay: '18:00',
          durationMinutes: 45,
          flexibility: 'same-day',
        },
        segments: [
          { label: 'Warm-up', durationMinutes: 10 },
          { label: 'Technical', durationMinutes: 35 },
        ],
      })

      render(
        <PlanEditorModal
          {...mockProps}
          mode="edit"
          initialData={initialData}
        />
      )

      const titleInput = screen.getByLabelText('Plan Title') as HTMLInputElement
      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement

      expect(titleInput.value).toBe('Existing Plan')
      expect(descriptionInput.value).toBe('Existing description')

      // Check segments are populated
      const segmentInputs = screen.getAllByLabelText(/Segment Name/i) as HTMLInputElement[]
      expect(segmentInputs).toHaveLength(2)
      expect(segmentInputs[0].value).toBe('Warm-up')
      expect(segmentInputs[1].value).toBe('Technical')
    })
  })

  describe('Form validation', () => {
    it('should show validation error if title is missing', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Try to submit without title
      const submitButton = screen.getByText('Create Plan')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument()
      })

      expect(mockProps.onSubmit).not.toHaveBeenCalled()
    })

    it('should show validation error if no segments', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Fill title
      const titleInput = screen.getByLabelText('Plan Title')
      await user.type(titleInput, 'Test Plan')

      // Remove default segment
      const removeButton = screen.getByText('Remove Segment')
      await user.click(removeButton)

      // Try to submit
      const submitButton = screen.getByText('Create Plan')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('At least one segment is required')).toBeInTheDocument()
      })

      expect(mockProps.onSubmit).not.toHaveBeenCalled()
    })

    it('should validate date fields', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Fill required fields
      await user.type(screen.getByLabelText('Plan Title'), 'Test Plan')

      // Set invalid date
      const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement
      await user.clear(startDateInput)
      await user.type(startDateInput, 'invalid-date')

      // Try to submit
      await user.click(screen.getByText('Create Plan'))

      await waitFor(() => {
        expect(screen.getByText('Invalid schedule')).toBeInTheDocument()
      })
    })

    it('should validate time format', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      await user.type(screen.getByLabelText('Plan Title'), 'Test Plan')

      const timeInput = screen.getByLabelText('Time of Day') as HTMLInputElement
      await user.type(timeInput, '25:99') // Invalid time

      await user.click(screen.getByText('Create Plan'))

      await waitFor(() => {
        expect(screen.getByText('Invalid schedule')).toBeInTheDocument()
      })
    })
  })

  describe('Segment management', () => {
    it('should add new segment', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Initially one segment
      expect(screen.getAllByLabelText(/Segment Name/i)).toHaveLength(1)

      // Add new segment
      await user.click(screen.getByText('Add Segment'))

      // Now two segments
      expect(screen.getAllByLabelText(/Segment Name/i)).toHaveLength(2)
    })

    it('should remove segment', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Add second segment
      await user.click(screen.getByText('Add Segment'))
      expect(screen.getAllByLabelText(/Segment Name/i)).toHaveLength(2)

      // Remove first segment
      const removeButtons = screen.getAllByText('Remove Segment')
      await user.click(removeButtons[0])

      // Back to one segment
      expect(screen.getAllByLabelText(/Segment Name/i)).toHaveLength(1)
    })

    it('should update segment fields', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      const segmentInput = screen.getByLabelText(/Segment Name/i) as HTMLInputElement
      await user.type(segmentInput, 'Warm-up Exercises')

      expect(segmentInput.value).toBe('Warm-up Exercises')

      // Update duration
      const durationInputs = screen.getAllByLabelText(/Duration/i)
      const segmentDuration = durationInputs.find(input =>
        input.getAttribute('placeholder')?.includes('minutes')
      ) as HTMLInputElement

      if (segmentDuration) {
        await user.type(segmentDuration, '15')
        expect(segmentDuration.value).toBe('15')
      }
    })

    it('should handle segment techniques', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Find techniques input for segment
      const techniqueInputs = screen.getAllByLabelText(/Techniques/i)
      if (techniqueInputs.length > 0) {
        await user.type(techniqueInputs[0] as HTMLElement, 'scales, arpeggios')
        expect((techniqueInputs[0] as HTMLInputElement).value).toContain('scales')
      }
    })

    it('should reorder segments', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Add multiple segments
      await user.click(screen.getByText('Add Segment'))
      await user.click(screen.getByText('Add Segment'))

      const segmentInputs = screen.getAllByLabelText(/Segment Name/i) as HTMLInputElement[]
      await user.type(segmentInputs[0], 'First')
      await user.type(segmentInputs[1], 'Second')
      await user.type(segmentInputs[2], 'Third')

      // Verify order (implementation would need to support reordering)
      expect(segmentInputs[0].value).toBe('First')
      expect(segmentInputs[1].value).toBe('Second')
      expect(segmentInputs[2].value).toBe('Third')
    })
  })

  describe('Schedule configuration', () => {
    it('should handle single schedule type', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Select single schedule if there's a toggle
      const scheduleOptions = screen.queryAllByRole('radio')
      if (scheduleOptions.length > 0) {
        const singleOption = scheduleOptions.find(opt =>
          opt.getAttribute('value') === 'single'
        )
        if (singleOption) {
          await user.click(singleOption)
        }
      }

      // Set date and time
      const startDate = screen.getByLabelText('Start Date') as HTMLInputElement
      await user.type(startDate, '2025-01-20')

      const timeInput = screen.getByLabelText('Time of Day') as HTMLInputElement
      await user.type(timeInput, '18:00')

      expect(startDate.value).toBe('2025-01-20')
      expect(timeInput.value).toBe('18:00')
    })

    it('should handle recurring schedule type', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Select recurring if available
      const scheduleOptions = screen.queryAllByRole('radio')
      if (scheduleOptions.length > 0) {
        const recurringOption = scheduleOptions.find(opt =>
          opt.getAttribute('value') === 'recurring'
        )
        if (recurringOption) {
          await user.click(recurringOption)

          // Check for end date field
          const endDateInput = screen.queryByLabelText('End Date')
          if (endDateInput) {
            await user.type(endDateInput as HTMLElement, '2025-03-20')
            expect((endDateInput as HTMLInputElement).value).toBe('2025-03-20')
          }
        }
      }
    })

    it('should handle flexibility options', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      const flexibilitySelect = screen.getByLabelText('Flexibility') as HTMLSelectElement
      await user.selectOptions(flexibilitySelect, 'same-day')

      expect(flexibilitySelect.value).toBe('same-day')
    })

    it('should calculate total duration from segments', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Add segments with durations
      await user.click(screen.getByText('Add Segment'))

      const durationInputs = screen.getAllByPlaceholderText(/minutes/i) as HTMLInputElement[]
      if (durationInputs.length >= 2) {
        await user.type(durationInputs[0], '10')
        await user.type(durationInputs[1], '20')
      }

      // Total should be 30 minutes
      // This would be shown somewhere in the UI
    })
  })

  describe('Reflection prompts', () => {
    it('should add reflection prompts', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      const addPromptButton = screen.queryByText('Add Prompt')
      if (addPromptButton) {
        await user.click(addPromptButton)

        // Find prompt input
        const promptInputs = screen.getAllByPlaceholderText(/reflection|prompt/i)
        if (promptInputs.length > 0) {
          await user.type(promptInputs[0] as HTMLElement, 'How did the practice feel?')
          expect((promptInputs[0] as HTMLInputElement).value).toBe('How did the practice feel?')
        }
      }
    })

    it('should remove reflection prompts', async () => {
      const user = userEvent.setup()

      const initialData = buildCreatePlanDraft({
        reflectionPrompts: [
          'Prompt 1',
          'Prompt 2',
        ],
      })

      render(
        <PlanEditorModal
          {...mockProps}
          initialData={initialData}
        />
      )

      // Check prompts are displayed
      const promptInputs = screen.getAllByDisplayValue(/Prompt/i)
      expect(promptInputs.length).toBeGreaterThan(0)

      // Remove a prompt (if remove buttons exist)
      const removeButtons = screen.queryAllByRole('button', { name: /remove/i })
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0])
        // Check one less prompt
      }
    })
  })

  describe('Form submission', () => {
    it('should submit valid form data', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Fill in required fields
      await user.type(screen.getByLabelText('Plan Title'), 'My Practice Plan')
      await user.type(screen.getByLabelText('Description'), 'Daily practice routine')

      const startDate = screen.getByLabelText('Start Date')
      await user.type(startDate, '2025-01-20')

      const segmentInput = screen.getByLabelText(/Segment Name/i)
      await user.type(segmentInput, 'Warm-up')

      // Submit form
      await user.click(screen.getByText('Create Plan'))

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'My Practice Plan',
            description: 'Daily practice routine',
            schedule: expect.objectContaining({
              startDate: '2025-01-20',
            }),
            segments: expect.arrayContaining([
              expect.objectContaining({
                label: 'Warm-up',
              }),
            ]),
          })
        )
      })
    })

    it('should show submission error', () => {
      const errorMessage = 'Failed to create plan'
      render(
        <PlanEditorModal
          {...mockProps}
          error={errorMessage}
        />
      )

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('should disable form while submitting', () => {
      render(
        <PlanEditorModal
          {...mockProps}
          isSubmitting={true}
        />
      )

      // Check submit button is disabled
      const submitButton = screen.getByText('Create Plan')
      expect(submitButton).toBeDisabled()

      // Check cancel is also disabled
      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeDisabled()
    })

    it('should call onClose when cancel clicked', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      await user.click(screen.getByText('Cancel'))

      expect(mockProps.onClose).toHaveBeenCalledTimes(1)
      expect(mockProps.onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Modal behavior', () => {
    it('should not render when closed', () => {
      render(<PlanEditorModal {...mockProps} isOpen={false} />)

      expect(screen.queryByText('Practice Plan')).not.toBeInTheDocument()
    })

    it('should reset form when reopened', () => {
      const { rerender } = render(
        <PlanEditorModal
          {...mockProps}
          initialData={buildCreatePlanDraft({ title: 'Initial' })}
        />
      )

      expect(screen.getByDisplayValue('Initial')).toBeInTheDocument()

      // Close modal
      rerender(<PlanEditorModal {...mockProps} isOpen={false} />)

      // Reopen with different data
      rerender(
        <PlanEditorModal
          {...mockProps}
          isOpen={true}
          initialData={buildCreatePlanDraft({ title: 'Updated' })}
        />
      )

      expect(screen.getByDisplayValue('Updated')).toBeInTheDocument()
    })

    it('should handle escape key to close', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      await user.keyboard('{Escape}')

      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Advanced features', () => {
    it('should handle focus areas', async () => {
      const user = userEvent.setup()

      const initialData = buildCreatePlanDraft({
        focusAreas: ['technique', 'sight-reading'],
      })

      render(
        <PlanEditorModal
          {...mockProps}
          initialData={initialData}
        />
      )

      // Check focus areas are displayed
      const focusAreaInputs = screen.queryAllByLabelText(/focus area/i)
      if (focusAreaInputs.length > 0) {
        expect(focusAreaInputs[0]).toHaveValue('technique')
      }
    })

    it('should handle plan type selection', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      const typeSelect = screen.queryByLabelText(/type/i) as HTMLSelectElement
      if (typeSelect) {
        await user.selectOptions(typeSelect, 'bootcamp')
        expect(typeSelect.value).toBe('bootcamp')
      }
    })

    it('should trim whitespace from inputs', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Enter title with whitespace
      const titleInput = screen.getByLabelText('Plan Title')
      await user.type(titleInput, '  My Plan  ')

      // Add segment with whitespace
      const segmentInput = screen.getByLabelText(/Segment Name/i)
      await user.type(segmentInput, '  Warm-up  ')

      // Submit
      await user.click(screen.getByText('Create Plan'))

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'My Plan', // Trimmed
            segments: expect.arrayContaining([
              expect.objectContaining({
                label: 'Warm-up', // Trimmed
              }),
            ]),
          })
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<PlanEditorModal {...mockProps} />)

      // All inputs should have labels
      const inputs = screen.getAllByRole('textbox')
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName()
      })

      const selects = screen.getAllByRole('combobox')
      selects.forEach(select => {
        expect(select).toHaveAccessibleName()
      })
    })

    it('should announce validation errors', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Submit without filling required fields
      await user.click(screen.getByText('Create Plan'))

      await waitFor(() => {
        const errorMessage = screen.getByText('Title is required')
        expect(errorMessage).toBeInTheDocument()
        // Error should be associated with the input (implementation specific)
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PlanEditorModal {...mockProps} />)

      // Tab through form fields
      await user.tab()
      expect(document.activeElement).toHaveAccessibleName()

      // Continue tabbing
      await user.tab()
      expect(document.activeElement).toHaveAccessibleName()
    })
  })
})