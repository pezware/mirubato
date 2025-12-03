import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu'

const mockItems: DropdownMenuItem[] = [
  { label: 'Edit', onClick: vi.fn() },
  { label: 'Duplicate', onClick: vi.fn() },
  { label: 'Delete', onClick: vi.fn(), variant: 'danger' },
]

describe('DropdownMenu', () => {
  const defaultProps = {
    items: mockItems,
    isOpen: false,
    onToggle: vi.fn(),
    onClose: vi.fn(),
  }

  it('should render trigger button', () => {
    render(<DropdownMenu {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should have accessible aria-label', () => {
    render(<DropdownMenu {...defaultProps} ariaLabel="Entry options" />)
    expect(screen.getByLabelText('Entry options')).toBeInTheDocument()
  })

  it('should call onToggle when button is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(<DropdownMenu {...defaultProps} onToggle={onToggle} />)

    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalled()
  })

  describe('when open', () => {
    it('should show menu items', () => {
      render(<DropdownMenu {...defaultProps} isOpen={true} />)

      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Duplicate')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should call item onClick and close menu', async () => {
      const user = userEvent.setup()
      const editClick = vi.fn()
      const onClose = vi.fn()
      const items: DropdownMenuItem[] = [{ label: 'Edit', onClick: editClick }]

      render(
        <DropdownMenu
          {...defaultProps}
          items={items}
          isOpen={true}
          onClose={onClose}
        />
      )

      await user.click(screen.getByText('Edit'))

      expect(editClick).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    it('should render danger variant with red styling', () => {
      render(<DropdownMenu {...defaultProps} isOpen={true} />)

      const deleteButton = screen.getByText('Delete').closest('button')
      expect(deleteButton).toHaveClass('text-red-600')
    })
  })

  describe('when closed', () => {
    it('should not show menu items', () => {
      render(<DropdownMenu {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      expect(screen.queryByText('Duplicate')).not.toBeInTheDocument()
    })
  })

  describe('with icons', () => {
    it('should render icon with menu item', () => {
      const itemsWithIcon: DropdownMenuItem[] = [
        {
          label: 'Settings',
          onClick: vi.fn(),
          icon: <span data-testid="settings-icon">⚙️</span>,
        },
      ]

      render(
        <DropdownMenu {...defaultProps} items={itemsWithIcon} isOpen={true} />
      )

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
    })
  })

  describe('custom icon', () => {
    it('should render custom trigger icon', () => {
      render(
        <DropdownMenu
          {...defaultProps}
          icon={<span data-testid="custom-icon">☰</span>}
        />
      )

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <DropdownMenu {...defaultProps} className="custom-dropdown" />
    )
    expect(container.firstChild).toHaveClass('custom-dropdown')
  })

  it('should apply custom button className', () => {
    render(<DropdownMenu {...defaultProps} buttonClassName="custom-button" />)
    expect(screen.getByRole('button')).toHaveClass('custom-button')
  })

  it('should apply custom menu className', () => {
    render(
      <DropdownMenu
        {...defaultProps}
        isOpen={true}
        menuClassName="custom-menu"
      />
    )
    expect(document.querySelector('.custom-menu')).toBeInTheDocument()
  })
})
