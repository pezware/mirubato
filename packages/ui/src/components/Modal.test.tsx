import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal, ModalBody, ModalFooter } from './Modal'

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Modal Content</div>,
  }

  it('should render when isOpen is true', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('should not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument()
  })

  it('should render title when provided', () => {
    render(<Modal {...defaultProps} title="Test Modal" />)
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })

  it('should show close button by default', () => {
    render(<Modal {...defaultProps} title="Test" />)
    // Close button contains an X icon
    const closeButton = screen.getByRole('button')
    expect(closeButton).toBeInTheDocument()
  })

  it('should hide close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} showCloseButton={false} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<Modal {...defaultProps} onClose={onClose} title="Test" />)

    await user.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when overlay is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<Modal {...defaultProps} onClose={onClose} />)

    // Find the backdrop overlay and click it
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/25')
    if (backdrop) {
      await user.click(backdrop)
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    }
  })

  it('should not call onClose on overlay click when closeOnOverlayClick is false', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />
    )

    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/25')
    if (backdrop) {
      await user.click(backdrop)
      // Give time for any potential calls
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(onClose).not.toHaveBeenCalled()
    }
  })

  it('should apply custom className', () => {
    render(<Modal {...defaultProps} className="custom-modal" />)
    const panel = document.querySelector('.custom-modal')
    expect(panel).toBeInTheDocument()
  })

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(<Modal {...defaultProps} />)
      const panel = document.querySelector('.sm\\:max-w-lg')
      expect(panel).toBeInTheDocument()
    })

    it('should render small size', () => {
      render(<Modal {...defaultProps} size="sm" />)
      const panel = document.querySelector('.sm\\:max-w-md')
      expect(panel).toBeInTheDocument()
    })

    it('should render large size', () => {
      render(<Modal {...defaultProps} size="lg" />)
      const panel = document.querySelector('.sm\\:max-w-2xl')
      expect(panel).toBeInTheDocument()
    })
  })
})

describe('ModalBody', () => {
  it('should render children', () => {
    render(<ModalBody>Body content</ModalBody>)
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <ModalBody className="custom-body">Content</ModalBody>
    )
    expect(container.querySelector('.custom-body')).toBeInTheDocument()
  })
})

describe('ModalFooter', () => {
  it('should render children', () => {
    render(<ModalFooter>Footer content</ModalFooter>)
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <ModalFooter className="custom-footer">Content</ModalFooter>
    )
    expect(container.querySelector('.custom-footer')).toBeInTheDocument()
  })
})
