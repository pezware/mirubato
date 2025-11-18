import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TemplatePublisherModal } from '../TemplatePublisherModal'
import '@/tests/mocks/i18n'

describe('TemplatePublisherModal', () => {
  const mockOnSubmit = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockReset()
    mockOnClose.mockReset()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  it('renders with default values', () => {
    render(
      <TemplatePublisherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultTitle="My Practice Plan"
        defaultDescription="A great practice routine"
      />
    )

    expect(screen.getByLabelText(/Template Title/i)).toHaveValue(
      'My Practice Plan'
    )
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      'A great practice routine'
    )
    expect(screen.getByRole('radio', { name: /Private/i })).toBeChecked()
  })

  it('submits form with correct data', async () => {
    render(
      <TemplatePublisherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultTitle="Test Plan"
      />
    )

    // Change title
    const titleInput = screen.getByLabelText(/Template Title/i)
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    // Add description
    const descriptionInput = screen.getByLabelText(/Description/i)
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    })

    // Change to public
    const publicRadio = screen.getByRole('radio', { name: /Public/i })
    fireEvent.click(publicRadio)

    // Add tags
    const tagsInput = screen.getByLabelText(/Tags/i)
    fireEvent.change(tagsInput, {
      target: { value: 'beginner, scales, warm-up' },
    })

    // Submit
    const submitButton = screen.getByRole('button', {
      name: /Publish Template/i,
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: 'Test description',
        visibility: 'public',
        tags: ['beginner', 'scales', 'warm-up'],
      })
    })

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('validates required title field', async () => {
    render(
      <TemplatePublisherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    // Try to submit without title
    const submitButton = screen.getByRole('button', {
      name: /Publish Template/i,
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Title is required/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('handles cancel button', () => {
    render(
      <TemplatePublisherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultTitle="Test Plan"
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('handles tags with extra whitespace', async () => {
    render(
      <TemplatePublisherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultTitle="Test Plan"
      />
    )

    const tagsInput = screen.getByLabelText(/Tags/i)
    fireEvent.change(tagsInput, {
      target: { value: '  beginner  ,  , scales  ,  ' },
    })

    const submitButton = screen.getByRole('button', {
      name: /Publish Template/i,
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Test Plan',
        description: undefined,
        visibility: 'private',
        tags: ['beginner', 'scales'],
      })
    })
  })

  it('shows error message on submission failure', async () => {
    mockOnSubmit.mockRejectedValueOnce(new Error('Network error'))

    render(
      <TemplatePublisherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultTitle="Test Plan"
      />
    )

    const submitButton = screen.getByRole('button', {
      name: /Publish Template/i,
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('disables form during submission', async () => {
    mockOnSubmit.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(
      <TemplatePublisherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultTitle="Test Plan"
      />
    )

    const submitButton = screen.getByRole('button', {
      name: /Publish Template/i,
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Publishing.../i })
      ).toBeDisabled()
    })

    // Wait for async operation to complete to avoid state update after teardown
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
