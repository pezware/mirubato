import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResizableSplitView } from './ResizableSplitView'

describe('ResizableSplitView', () => {
  beforeEach(() => {
    // Mock window.innerWidth for desktop mode
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })

    // Mock localStorage
    const store: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      key => store[key] || null
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      store[key] = value
    })
  })

  const defaultChildren: [React.ReactNode, React.ReactNode] = [
    <div key="left">Left Panel</div>,
    <div key="right">Right Panel</div>,
  ]

  it('should render both panels', () => {
    render(<ResizableSplitView>{defaultChildren}</ResizableSplitView>)

    expect(screen.getByText('Left Panel')).toBeInTheDocument()
    expect(screen.getByText('Right Panel')).toBeInTheDocument()
  })

  it('should have flex layout', () => {
    const { container } = render(
      <ResizableSplitView>{defaultChildren}</ResizableSplitView>
    )
    expect(container.firstChild).toHaveClass('flex')
  })

  describe('splitter', () => {
    it('should render splitter between panels', () => {
      const { container } = render(
        <ResizableSplitView>{defaultChildren}</ResizableSplitView>
      )

      // Splitter has cursor-col-resize
      const splitter = container.querySelector('.cursor-col-resize')
      expect(splitter).toBeInTheDocument()
    })

    it('should have visual indicator', () => {
      const { container } = render(
        <ResizableSplitView>{defaultChildren}</ResizableSplitView>
      )

      // Visual indicator is a rounded div inside splitter
      const indicator = container.querySelector('.rounded-full')
      expect(indicator).toBeInTheDocument()
    })
  })

  describe('default ratio', () => {
    it('should use default ratio of 0.66', () => {
      const { container } = render(
        <ResizableSplitView>{defaultChildren}</ResizableSplitView>
      )

      const leftPanel = container.querySelector('.overflow-y-auto')
      // Default ratio should result in ~66% width
      expect(leftPanel).toHaveStyle({ width: '66%' })
    })

    it('should use custom default ratio', () => {
      const { container } = render(
        <ResizableSplitView defaultRatio={0.5}>
          {defaultChildren}
        </ResizableSplitView>
      )

      const leftPanel = container.querySelector('.overflow-y-auto')
      expect(leftPanel).toHaveStyle({ width: '50%' })
    })
  })

  describe('min/max sizes', () => {
    it('should apply min sizes', () => {
      const { container } = render(
        <ResizableSplitView minSizes={[300, 200]}>
          {defaultChildren}
        </ResizableSplitView>
      )

      const leftPanel = container.querySelector('.overflow-y-auto')
      expect(leftPanel).toHaveStyle({ minWidth: '300px' })
    })

    it('should apply max sizes', () => {
      const { container } = render(
        <ResizableSplitView maxSizes={[800, 400]}>
          {defaultChildren}
        </ResizableSplitView>
      )

      const leftPanel = container.querySelector('.overflow-y-auto')
      expect(leftPanel).toHaveStyle({ maxWidth: '800px' })
    })
  })

  describe('disabled state', () => {
    it('should only render first panel when disabled', () => {
      render(
        <ResizableSplitView disabled>{defaultChildren}</ResizableSplitView>
      )

      expect(screen.getByText('Left Panel')).toBeInTheDocument()
      // Right panel is not rendered in disabled mode
      expect(screen.queryByText('Right Panel')).not.toBeInTheDocument()
    })

    it('should not render splitter when disabled', () => {
      const { container } = render(
        <ResizableSplitView disabled>{defaultChildren}</ResizableSplitView>
      )

      const splitter = container.querySelector('.cursor-col-resize')
      expect(splitter).not.toBeInTheDocument()
    })
  })

  describe('mobile mode', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Mobile width
      })
    })

    it('should only render first panel on mobile', () => {
      render(<ResizableSplitView>{defaultChildren}</ResizableSplitView>)

      expect(screen.getByText('Left Panel')).toBeInTheDocument()
      expect(screen.queryByText('Right Panel')).not.toBeInTheDocument()
    })
  })

  describe('double-click reset', () => {
    it('should reset to default ratio on double-click', () => {
      const onRatioChange = vi.fn()
      const { container } = render(
        <ResizableSplitView defaultRatio={0.5} onRatioChange={onRatioChange}>
          {defaultChildren}
        </ResizableSplitView>
      )

      const splitter = container.querySelector('.cursor-col-resize')
      fireEvent.doubleClick(splitter!)

      expect(onRatioChange).toHaveBeenCalledWith(0.5)
    })
  })

  describe('localStorage persistence', () => {
    it('should save ratio to localStorage', () => {
      const { container } = render(
        <ResizableSplitView storageKey="test-split">
          {defaultChildren}
        </ResizableSplitView>
      )

      const splitter = container.querySelector('.cursor-col-resize')
      fireEvent.doubleClick(splitter!)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'splitView-test-split',
        expect.any(String)
      )
    })

    it('should load ratio from localStorage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('0.4')

      render(
        <ResizableSplitView storageKey="test-split" defaultRatio={0.5}>
          {defaultChildren}
        </ResizableSplitView>
      )

      expect(localStorage.getItem).toHaveBeenCalledWith('splitView-test-split')
    })
  })

  describe('callbacks', () => {
    it('should call onRatioChange when ratio changes', () => {
      const onRatioChange = vi.fn()
      const { container } = render(
        <ResizableSplitView onRatioChange={onRatioChange}>
          {defaultChildren}
        </ResizableSplitView>
      )

      const splitter = container.querySelector('.cursor-col-resize')
      fireEvent.doubleClick(splitter!)

      expect(onRatioChange).toHaveBeenCalled()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <ResizableSplitView className="custom-split">
        {defaultChildren}
      </ResizableSplitView>
    )
    expect(container.firstChild).toHaveClass('custom-split')
  })
})
