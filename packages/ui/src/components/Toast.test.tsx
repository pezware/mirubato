import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast, ToastContainer, ToastProps } from './Toast'

describe('Toast', () => {
  const defaultProps: ToastProps = {
    id: 'toast-1',
    message: 'Test message',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render message', () => {
    render(<Toast {...defaultProps} />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('should render title when provided', () => {
    render(<Toast {...defaultProps} title="Test Title" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  describe('types', () => {
    it('should render success type', () => {
      const { container } = render(<Toast {...defaultProps} type="success" />)
      expect(container.querySelector('.bg-green-50')).toBeInTheDocument()
    })

    it('should render error type', () => {
      const { container } = render(<Toast {...defaultProps} type="error" />)
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument()
    })

    it('should render warning type', () => {
      const { container } = render(<Toast {...defaultProps} type="warning" />)
      expect(container.querySelector('.bg-amber-50')).toBeInTheDocument()
    })

    it('should render info type (default)', () => {
      const { container } = render(<Toast {...defaultProps} />)
      expect(container.querySelector('.bg-blue-50')).toBeInTheDocument()
    })
  })

  describe('auto-dismiss', () => {
    it('should auto-dismiss after default duration', () => {
      const onClose = vi.fn()
      render(<Toast {...defaultProps} onClose={onClose} />)

      expect(onClose).not.toHaveBeenCalled()

      vi.advanceTimersByTime(5000)

      expect(onClose).toHaveBeenCalledWith('toast-1')
    })

    it('should auto-dismiss after custom duration', () => {
      const onClose = vi.fn()
      render(<Toast {...defaultProps} onClose={onClose} duration={3000} />)

      vi.advanceTimersByTime(2999)
      expect(onClose).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(onClose).toHaveBeenCalledWith('toast-1')
    })

    it('should not auto-dismiss when duration is 0', () => {
      const onClose = vi.fn()
      render(<Toast {...defaultProps} onClose={onClose} duration={0} />)

      vi.advanceTimersByTime(10000)
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('close button', () => {
    it('should call onClose when close button is clicked', async () => {
      vi.useRealTimers() // Need real timers for user interaction
      const user = userEvent.setup()
      const onClose = vi.fn()

      render(<Toast {...defaultProps} onClose={onClose} duration={0} />)

      await user.click(screen.getByRole('button'))
      expect(onClose).toHaveBeenCalledWith('toast-1')
    })

    it('should have accessible close button', () => {
      render(<Toast {...defaultProps} />)
      expect(screen.getByText('Close')).toBeInTheDocument()
    })
  })

  it('should have rounded corners', () => {
    const { container } = render(<Toast {...defaultProps} />)
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument()
  })
})

describe('ToastContainer', () => {
  const mockToasts: ToastProps[] = [
    { id: 'toast-1', message: 'First message', onClose: vi.fn() },
    { id: 'toast-2', message: 'Second message', onClose: vi.fn() },
  ]

  it('should render multiple toasts', () => {
    render(<ToastContainer toasts={mockToasts} onClose={vi.fn()} />)

    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
  })

  it('should have aria-live for accessibility', () => {
    const { container } = render(
      <ToastContainer toasts={mockToasts} onClose={vi.fn()} />
    )
    expect(
      container.querySelector('[aria-live="assertive"]')
    ).toBeInTheDocument()
  })

  it('should have fixed positioning', () => {
    const { container } = render(
      <ToastContainer toasts={mockToasts} onClose={vi.fn()} />
    )
    expect(container.firstChild).toHaveClass('fixed', 'inset-0')
  })

  it('should have high z-index', () => {
    const { container } = render(
      <ToastContainer toasts={mockToasts} onClose={vi.fn()} />
    )
    expect(container.firstChild).toHaveClass('z-50')
  })

  it('should render empty when no toasts', () => {
    const { container } = render(
      <ToastContainer toasts={[]} onClose={vi.fn()} />
    )
    const toastItems = container.querySelectorAll('.rounded-lg.border')
    expect(toastItems).toHaveLength(0)
  })
})
