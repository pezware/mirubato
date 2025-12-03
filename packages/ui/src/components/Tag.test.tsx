import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tag from './Tag'

describe('Tag', () => {
  it('should render children', () => {
    render(<Tag>Test Tag</Tag>)
    expect(screen.getByText('Test Tag')).toBeInTheDocument()
  })

  describe('variants', () => {
    it('should render default variant', () => {
      const { container } = render(<Tag variant="default">Default</Tag>)
      expect(container.firstChild).toHaveClass('bg-morandi-stone-100')
    })

    it('should render primary variant', () => {
      const { container } = render(<Tag variant="primary">Primary</Tag>)
      expect(container.firstChild).toHaveClass('bg-morandi-sage-100')
    })

    it('should render success variant', () => {
      const { container } = render(<Tag variant="success">Success</Tag>)
      expect(container.firstChild).toHaveClass('bg-green-100')
    })

    it('should render warning variant', () => {
      const { container } = render(<Tag variant="warning">Warning</Tag>)
      expect(container.firstChild).toHaveClass('bg-amber-100')
    })

    it('should render danger variant', () => {
      const { container } = render(<Tag variant="danger">Danger</Tag>)
      expect(container.firstChild).toHaveClass('bg-red-100')
    })
  })

  describe('sizes', () => {
    it('should render small size', () => {
      const { container } = render(<Tag size="sm">Small</Tag>)
      expect(container.firstChild).toHaveClass('text-xs')
    })

    it('should render medium size (default)', () => {
      const { container } = render(<Tag>Medium</Tag>)
      expect(container.firstChild).toHaveClass('text-sm')
    })

    it('should render large size', () => {
      const { container } = render(<Tag size="lg">Large</Tag>)
      expect(container.firstChild).toHaveClass('text-base')
    })
  })

  describe('icon', () => {
    it('should render with icon', () => {
      render(<Tag icon={<span data-testid="tag-icon">★</span>}>With Icon</Tag>)
      expect(screen.getByTestId('tag-icon')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()

      render(<Tag onClick={onClick}>Clickable</Tag>)

      await user.click(screen.getByText('Clickable'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should have cursor-pointer when clickable', () => {
      const { container } = render(<Tag onClick={() => {}}>Clickable</Tag>)
      expect(container.firstChild).toHaveClass('cursor-pointer')
    })

    it('should render remove button when onRemove provided', () => {
      render(<Tag onRemove={() => {}}>Removable</Tag>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should call onRemove when remove button clicked', async () => {
      const user = userEvent.setup()
      const onRemove = vi.fn()

      render(<Tag onRemove={onRemove}>Removable</Tag>)

      await user.click(screen.getByRole('button'))
      expect(onRemove).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when remove button clicked', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      const onRemove = vi.fn()

      render(
        <Tag onClick={onClick} onRemove={onRemove}>
          Tag
        </Tag>
      )

      await user.click(screen.getByRole('button'))
      expect(onRemove).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(<Tag className="custom-class">Custom</Tag>)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
