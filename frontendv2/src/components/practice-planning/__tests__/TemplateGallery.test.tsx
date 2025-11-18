import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TemplateGallery } from '../TemplateGallery'
import type { PlanTemplate } from '@/api/planning'
import '@/tests/mocks/i18n'

const mockTemplates: PlanTemplate[] = [
  {
    id: 'template_1',
    authorId: 'user_123',
    title: 'Beginner Scales Practice',
    description: 'Daily scales routine for beginners',
    type: 'custom',
    visibility: 'public',
    tags: ['beginner', 'scales', 'warm-up'],
    adoptionCount: 42,
    templateVersion: 1,
    schedule: {
      kind: 'recurring',
      durationMinutes: 30,
      timeOfDay: '09:00',
      flexibility: 'same-day',
    },
    publishedAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'template_2',
    authorId: 'user_456',
    title: 'Advanced Technique Bootcamp',
    description: 'Intensive technique development program',
    type: 'bootcamp',
    visibility: 'public',
    tags: ['advanced', 'technique'],
    adoptionCount: 15,
    templateVersion: 1,
    schedule: {
      kind: 'recurring',
      durationMinutes: 60,
      flexibility: 'fixed',
    },
    publishedAt: '2025-01-02T00:00:00Z',
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'template_3',
    authorId: 'user_123',
    title: 'My Private Template',
    description: 'Personal practice routine',
    type: 'custom',
    visibility: 'private',
    tags: ['personal'],
    adoptionCount: 0,
    templateVersion: 1,
    schedule: {
      kind: 'single',
      durationMinutes: 45,
      flexibility: 'anytime',
    },
    publishedAt: '2025-01-03T00:00:00Z',
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
  },
]

describe('TemplateGallery', () => {
  const mockOnAdopt = vi.fn()

  beforeEach(() => {
    mockOnAdopt.mockReset()
    mockOnAdopt.mockResolvedValue(undefined)
  })

  it('renders list of templates', () => {
    render(
      <TemplateGallery
        templates={mockTemplates}
        onAdopt={mockOnAdopt}
        isLoading={false}
      />
    )

    expect(screen.getByText('Beginner Scales Practice')).toBeInTheDocument()
    expect(screen.getByText('Advanced Technique Bootcamp')).toBeInTheDocument()
    expect(screen.getByText('My Private Template')).toBeInTheDocument()
  })

  it('displays template metadata', () => {
    render(
      <TemplateGallery
        templates={[mockTemplates[0]]}
        onAdopt={mockOnAdopt}
        isLoading={false}
      />
    )

    expect(
      screen.getByText('Daily scales routine for beginners')
    ).toBeInTheDocument()
    expect(screen.getByText(/42/)).toBeInTheDocument() // adoption count
    expect(screen.getAllByText(/beginner/i).length).toBeGreaterThan(0) // tags
    expect(screen.getAllByText(/scales/i).length).toBeGreaterThan(0) // tags (appears in description and tag)
  })

  it('filters templates by visibility', () => {
    render(
      <TemplateGallery
        templates={mockTemplates}
        onAdopt={mockOnAdopt}
        isLoading={false}
      />
    )

    // Initially shows all templates
    expect(screen.getByText('Beginner Scales Practice')).toBeInTheDocument()
    expect(screen.getByText('My Private Template')).toBeInTheDocument()

    // Filter to public only
    const publicFilter = screen.getByRole('radio', { name: /Public/i })
    fireEvent.click(publicFilter)

    expect(screen.getByText('Beginner Scales Practice')).toBeInTheDocument()
    expect(screen.queryByText('My Private Template')).not.toBeInTheDocument()
  })

  it('filters templates by tag', () => {
    render(
      <TemplateGallery
        templates={mockTemplates}
        onAdopt={mockOnAdopt}
        isLoading={false}
      />
    )

    // Type tag filter
    const tagInput = screen.getByPlaceholderText(/filter by tags/i)
    fireEvent.change(tagInput, { target: { value: 'beginner' } })

    expect(screen.getByText('Beginner Scales Practice')).toBeInTheDocument()
    expect(
      screen.queryByText('Advanced Technique Bootcamp')
    ).not.toBeInTheDocument()
  })

  it('calls onAdopt when adopt button is clicked', async () => {
    render(
      <TemplateGallery
        templates={[mockTemplates[0]]}
        onAdopt={mockOnAdopt}
        isLoading={false}
      />
    )

    const adoptButton = screen.getByRole('button', { name: /adopt/i })
    fireEvent.click(adoptButton)

    const confirmButton = await screen.findByRole('button', {
      name: /adopt plan/i,
    })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnAdopt).toHaveBeenCalledWith(
        'template_1',
        expect.objectContaining({
          title: 'Beginner Scales Practice',
          schedule: expect.objectContaining({
            startDate: expect.any(String),
          }),
        })
      )
    })
  })

  it('shows loading state', () => {
    render(
      <TemplateGallery templates={[]} onAdopt={mockOnAdopt} isLoading={true} />
    )

    // Check for loading skeletons by className
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no templates', () => {
    render(
      <TemplateGallery templates={[]} onAdopt={mockOnAdopt} isLoading={false} />
    )

    expect(screen.getByText(/no templates found/i)).toBeInTheDocument()
  })

  it('shows empty state after filtering with no results', () => {
    render(
      <TemplateGallery
        templates={mockTemplates}
        onAdopt={mockOnAdopt}
        isLoading={false}
      />
    )

    const tagInput = screen.getByPlaceholderText(/filter by tags/i)
    fireEvent.change(tagInput, { target: { value: 'nonexistent' } })

    expect(screen.getByText(/no templates match/i)).toBeInTheDocument()
  })

  it('clears filters when clear button is clicked', () => {
    render(
      <TemplateGallery
        templates={mockTemplates}
        onAdopt={mockOnAdopt}
        isLoading={false}
      />
    )

    // Apply filters
    const publicFilter = screen.getByRole('radio', { name: /Public/i })
    fireEvent.click(publicFilter)

    const tagInput = screen.getByPlaceholderText(/filter by tags/i)
    fireEvent.change(tagInput, { target: { value: 'beginner' } })

    // Clear filters
    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    fireEvent.click(clearButton)

    // Should show all templates again
    expect(screen.getByText('Beginner Scales Practice')).toBeInTheDocument()
    expect(screen.getByText('My Private Template')).toBeInTheDocument()
    expect(screen.getByText('Advanced Technique Bootcamp')).toBeInTheDocument()
  })

  it('sorts templates by adoption count by default', () => {
    render(
      <TemplateGallery
        templates={mockTemplates}
        onAdopt={mockOnAdopt}
        isLoading={false}
      />
    )

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map(el => el.textContent)

    // Should be sorted by adoption count descending
    expect(titles[0]).toBe('Beginner Scales Practice') // 42 adoptions
    expect(titles[1]).toBe('Advanced Technique Bootcamp') // 15 adoptions
    expect(titles[2]).toBe('My Private Template') // 0 adoptions
  })
})
