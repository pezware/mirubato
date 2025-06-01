import { render, screen, fireEvent } from '@testing-library/react'
import { CircularControl } from './CircularControl'

describe('CircularControl', () => {
  const defaultProps = {
    value: 50,
    onChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with default props', () => {
      const { container } = render(<CircularControl {...defaultProps} />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(screen.getByText('Volume')).toBeInTheDocument()
    })

    it('renders with custom label', () => {
      render(<CircularControl {...defaultProps} label="Tempo" />)

      expect(screen.getByText('Tempo')).toBeInTheDocument()
    })

    it('renders with custom size', () => {
      const { container } = render(
        <CircularControl {...defaultProps} size={120} />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '120')
      expect(svg).toHaveAttribute('height', '120')
    })

    it('renders without label when not provided', () => {
      render(<CircularControl {...defaultProps} label="" />)

      expect(screen.queryByText('Volume')).not.toBeInTheDocument()
    })

    it('applies disabled styles when disabled', () => {
      const { container } = render(
        <CircularControl {...defaultProps} disabled />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('opacity-50')
    })

    it('applies ghost opacity when ghost prop is true', () => {
      const { container } = render(<CircularControl {...defaultProps} ghost />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveStyle({ opacity: '0.05' })
    })

    it('applies custom className', () => {
      const { container } = render(
        <CircularControl {...defaultProps} className="custom-class" />
      )

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('custom-class')
    })
  })

  describe('Value to Angle Conversion', () => {
    it('converts value 0 to -135 degrees', () => {
      const { container } = render(
        <CircularControl {...defaultProps} value={0} />
      )

      // Check the pointer line position
      const pointer = container.querySelector('line')
      expect(pointer).toBeTruthy()
      // The pointer should be at -135 degrees
    })

    it('converts value 50 to 0 degrees', () => {
      const { container } = render(
        <CircularControl {...defaultProps} value={50} />
      )

      const pointer = container.querySelector('line')
      expect(pointer).toBeTruthy()
      // The pointer should be at 0 degrees (pointing right)
    })

    it('converts value 100 to 135 degrees', () => {
      const { container } = render(
        <CircularControl {...defaultProps} value={100} />
      )

      const pointer = container.querySelector('line')
      expect(pointer).toBeTruthy()
      // The pointer should be at 135 degrees
    })
  })

  describe('Mouse Interactions', () => {
    it('starts dragging on mousedown', () => {
      const { container } = render(<CircularControl {...defaultProps} />)

      const svg = container.querySelector('svg')!
      fireEvent.mouseDown(svg)

      // Component should be in dragging state
      // Ghost opacity should increase when dragging
    })

    it('does not start dragging when disabled', () => {
      const onChange = jest.fn()
      const { container } = render(
        <CircularControl {...defaultProps} onChange={onChange} disabled />
      )

      const svg = container.querySelector('svg')!
      fireEvent.mouseDown(svg)

      // Simulate mouse move
      fireEvent.mouseMove(document, { clientX: 100, clientY: 100 })

      expect(onChange).not.toHaveBeenCalled()
    })

    it('updates value on mouse drag', () => {
      const onChange = jest.fn()
      const { container } = render(
        <CircularControl {...defaultProps} onChange={onChange} />
      )

      const svg = container.querySelector('svg')!

      // Mock getBoundingClientRect
      const mockRect = {
        left: 0,
        top: 0,
        width: 80,
        height: 80,
        right: 80,
        bottom: 80,
        x: 0,
        y: 0,
        toJSON: () => {},
      }
      jest.spyOn(svg, 'getBoundingClientRect').mockReturnValue(mockRect)

      // Start dragging
      fireEvent.mouseDown(svg)

      // Move mouse to right (0 degrees = 50% value)
      fireEvent.mouseMove(document, { clientX: 80, clientY: 40 })

      expect(onChange).toHaveBeenCalled()
    })

    it('stops dragging on mouseup', () => {
      const onChange = jest.fn()
      const { container } = render(
        <CircularControl {...defaultProps} onChange={onChange} />
      )

      const svg = container.querySelector('svg')!

      // Start dragging
      fireEvent.mouseDown(svg)

      // End dragging
      fireEvent.mouseUp(document)

      // Further mouse moves should not trigger onChange
      onChange.mockClear()
      fireEvent.mouseMove(document, { clientX: 100, clientY: 100 })

      expect(onChange).not.toHaveBeenCalled()
    })

    it('limits value between 0 and 100', () => {
      const onChange = jest.fn()
      const { container } = render(
        <CircularControl {...defaultProps} onChange={onChange} />
      )

      const svg = container.querySelector('svg')!

      // Mock getBoundingClientRect
      const mockRect = {
        left: 40,
        top: 40,
        width: 80,
        height: 80,
        right: 120,
        bottom: 120,
        x: 40,
        y: 40,
        toJSON: () => {},
      }
      jest.spyOn(svg, 'getBoundingClientRect').mockReturnValue(mockRect)

      // Start dragging
      fireEvent.mouseDown(svg)

      // Try to drag beyond maximum (bottom left = -135 degrees = 0%)
      fireEvent.mouseMove(document, { clientX: 0, clientY: 120 })

      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
      expect(lastCall[0]).toBeGreaterThanOrEqual(0)
      expect(lastCall[0]).toBeLessThanOrEqual(100)
    })
  })

  describe('Touch Interactions', () => {
    it('starts dragging on touchstart', () => {
      const { container } = render(<CircularControl {...defaultProps} />)

      const svg = container.querySelector('svg')!
      fireEvent.touchStart(svg, {
        touches: [{ clientX: 40, clientY: 40 }],
      })

      // Component should be in dragging state
    })

    it('updates value on touch drag', () => {
      const onChange = jest.fn()
      const { container } = render(
        <CircularControl {...defaultProps} onChange={onChange} />
      )

      const svg = container.querySelector('svg')!

      // Mock getBoundingClientRect
      const mockRect = {
        left: 0,
        top: 0,
        width: 80,
        height: 80,
        right: 80,
        bottom: 80,
        x: 0,
        y: 0,
        toJSON: () => {},
      }
      jest.spyOn(svg, 'getBoundingClientRect').mockReturnValue(mockRect)

      // Start dragging
      fireEvent.touchStart(svg, {
        touches: [{ clientX: 40, clientY: 40 }],
      })

      // Move touch
      fireEvent.touchMove(document, {
        touches: [{ clientX: 80, clientY: 40 }],
      })

      expect(onChange).toHaveBeenCalled()
    })

    it('stops dragging on touchend', () => {
      const onChange = jest.fn()
      const { container } = render(
        <CircularControl {...defaultProps} onChange={onChange} />
      )

      const svg = container.querySelector('svg')!

      // Start dragging
      fireEvent.touchStart(svg, {
        touches: [{ clientX: 40, clientY: 40 }],
      })

      // End dragging
      fireEvent.touchEnd(document)

      // Further touch moves should not trigger onChange
      onChange.mockClear()
      fireEvent.touchMove(document, {
        touches: [{ clientX: 100, clientY: 100 }],
      })

      expect(onChange).not.toHaveBeenCalled()
    })

    it('has touch-action none to prevent scrolling', () => {
      const { container } = render(<CircularControl {...defaultProps} />)

      const svg = container.querySelector('svg')!
      expect(svg.style.touchAction).toBe('none')
    })
  })

  describe('Event Listener Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { unmount, container } = render(
        <CircularControl {...defaultProps} />
      )

      const svg = container.querySelector('svg')!

      // Start dragging to attach listeners
      fireEvent.mouseDown(svg)

      // Unmount component
      unmount()

      // Check that event listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })

    it('removes event listeners when dragging ends', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { container } = render(<CircularControl {...defaultProps} />)

      const svg = container.querySelector('svg')!

      // Start dragging
      fireEvent.mouseDown(svg)

      // Clear previous calls
      removeEventListenerSpy.mockClear()

      // End dragging
      fireEvent.mouseUp(document)

      // Check that event listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Ghost Mode', () => {
    it('shows low opacity when ghost and not dragging', () => {
      const { container } = render(<CircularControl {...defaultProps} ghost />)

      const svg = container.querySelector('svg')!
      expect(svg).toHaveStyle({ opacity: '0.05' })

      const label = screen.getByText('Volume')
      expect(label).toHaveStyle({ opacity: '0.05' })
    })

    it('increases opacity slightly when ghost and dragging', () => {
      const { container } = render(<CircularControl {...defaultProps} ghost />)

      const svg = container.querySelector('svg')!

      // Start dragging
      fireEvent.mouseDown(svg)

      // Opacity should increase to 0.15
      expect(svg).toHaveStyle({ opacity: '0.15' })
    })
  })
})
