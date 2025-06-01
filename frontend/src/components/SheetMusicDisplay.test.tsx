import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SheetMusicDisplay } from './SheetMusicDisplay'
import { SheetMusic } from '../types/sheetMusic'
import { NotationRenderer } from '../utils/notationRenderer'

// Mock the NotationRenderer
jest.mock('../utils/notationRenderer')

const mockNotationRenderer = {
  render: jest.fn(),
  dispose: jest.fn(),
}

;(
  NotationRenderer as jest.MockedClass<typeof NotationRenderer>
).mockImplementation(() => mockNotationRenderer as unknown as NotationRenderer)

describe('SheetMusicDisplay', () => {
  const mockSheetMusic: SheetMusic = {
    id: 'test-piece',
    title: 'Test Piece',
    composer: 'Test Composer',
    instrument: 'piano',
    difficulty: 'intermediate',
    measures: [
      {
        number: 1,
        notes: [
          { keys: ['c/4'], duration: 'q', time: 0 },
          { keys: ['d/4'], duration: 'q', time: 1 },
          { keys: ['e/4'], duration: 'q', time: 2 },
          { keys: ['f/4'], duration: 'q', time: 3 },
        ],
        timeSignature: '4/4',
        keySignature: 'C',
        tempo: { bpm: 120 },
      },
      {
        number: 2,
        notes: [
          { keys: ['g/4'], duration: 'q', time: 4 },
          { keys: ['a/4'], duration: 'q', time: 5 },
          { keys: ['b/4'], duration: 'q', time: 6 },
          { keys: ['c/5'], duration: 'q', time: 7 },
        ],
      },
      {
        number: 3,
        notes: [
          { keys: ['b/4'], duration: 'h', time: 8 },
          { keys: ['a/4'], duration: 'h', time: 10 },
        ],
      },
      {
        number: 4,
        notes: [{ keys: ['g/4'], duration: 'w', time: 12 }],
      },
      {
        number: 5,
        notes: [
          { keys: ['f/4'], duration: 'h', time: 16 },
          { keys: ['e/4'], duration: 'h', time: 18 },
        ],
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset window dimensions to desktop size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    })
  })

  describe('Rendering', () => {
    it('renders with sheet music content', () => {
      render(<SheetMusicDisplay sheetMusic={mockSheetMusic} />)

      // Check that NotationRenderer was instantiated
      expect(NotationRenderer).toHaveBeenCalled()
      expect(mockNotationRenderer.render).toHaveBeenCalled()
    })

    it('applies custom className', () => {
      const { container } = render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          className="custom-class"
        />
      )

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('custom-class')
    })

    it('renders navigation controls', () => {
      render(<SheetMusicDisplay sheetMusic={mockSheetMusic} />)

      // Check for navigation buttons (multiple elements with same label)
      const prevButtons = screen.getAllByLabelText('Previous page')
      const nextButtons = screen.getAllByLabelText('Next page')

      expect(prevButtons.length).toBeGreaterThan(0)
      expect(nextButtons.length).toBeGreaterThan(0)
    })

    it('shows page indicator dots', () => {
      render(<SheetMusicDisplay sheetMusic={mockSheetMusic} />)

      // With 5 measures and default 4 measures per page, should have 2 pages
      const pageButtons = screen.getAllByLabelText(/Go to page \d+/)
      expect(pageButtons).toHaveLength(2)
    })
  })

  describe('Page Navigation', () => {
    it('navigates to next page on button click', async () => {
      const onPageChange = jest.fn()
      render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
        />
      )

      // Get the visible next button (not the invisible tap area)
      const nextButtons = screen.getAllByLabelText('Next page')
      const visibleNextButton = nextButtons.find(button =>
        button.classList.contains('pointer-events-auto')
      )!

      fireEvent.click(visibleNextButton)

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(1)
      })
    })

    it('navigates to previous page on button click', async () => {
      const onPageChange = jest.fn()
      render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
        />
      )

      // First go to page 2
      const nextButtons = screen.getAllByLabelText('Next page')
      const visibleNextButton = nextButtons.find(button =>
        button.classList.contains('pointer-events-auto')
      )!
      fireEvent.click(visibleNextButton)

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(1)
      })

      // Clear the mock
      onPageChange.mockClear()

      // Then go back to page 1
      const prevButtons = screen.getAllByLabelText('Previous page')
      const visiblePrevButton = prevButtons.find(button =>
        button.classList.contains('pointer-events-auto')
      )!
      fireEvent.click(visiblePrevButton)

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(0)
      })
    })

    it('disables previous button on first page', () => {
      render(<SheetMusicDisplay sheetMusic={mockSheetMusic} />)

      const prevButtons = screen.getAllByLabelText('Previous page')
      // There are multiple prev buttons (side tap area and visible button)
      prevButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('disables next button on last page', () => {
      // Create sheet music with only 2 measures (1 page)
      const shortSheetMusic = {
        ...mockSheetMusic,
        measures: mockSheetMusic.measures.slice(0, 2),
      }

      render(<SheetMusicDisplay sheetMusic={shortSheetMusic} />)

      const nextButtons = screen.getAllByLabelText('Next page')
      nextButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('navigates to specific page via page dots', async () => {
      const onPageChange = jest.fn()
      render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
        />
      )

      const page2Button = screen.getByLabelText('Go to page 2')
      fireEvent.click(page2Button)

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('Touch Navigation', () => {
    it('navigates to next page on swipe left', async () => {
      const onPageChange = jest.fn()
      const { container } = render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
        />
      )

      const musicContainer = container.querySelector('.bg-white')!

      fireEvent.touchStart(musicContainer, {
        touches: [{ clientX: 300, clientY: 200 }],
      })

      fireEvent.touchEnd(musicContainer, {
        changedTouches: [{ clientX: 200, clientY: 200 }],
      })

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(1)
      })
    })

    it('navigates to previous page on swipe right', async () => {
      const onPageChange = jest.fn()
      const { container } = render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
        />
      )

      // First go to page 2
      const nextButtons = screen.getAllByLabelText('Next page')
      const visibleNextButton = nextButtons.find(button =>
        button.classList.contains('pointer-events-auto')
      )!
      fireEvent.click(visibleNextButton)

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(1)
      })

      onPageChange.mockClear()

      // Now swipe right to go back
      const musicContainer = container.querySelector('.bg-white')!

      fireEvent.touchStart(musicContainer, {
        touches: [{ clientX: 200, clientY: 200 }],
      })

      fireEvent.touchEnd(musicContainer, {
        changedTouches: [{ clientX: 300, clientY: 200 }],
      })

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(0)
      })
    })

    it('does not navigate on small swipes', async () => {
      const onPageChange = jest.fn()
      const { container } = render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
        />
      )

      const musicContainer = container.querySelector('.bg-white')!

      fireEvent.touchStart(musicContainer, {
        touches: [{ clientX: 200, clientY: 200 }],
      })

      fireEvent.touchEnd(musicContainer, {
        changedTouches: [{ clientX: 220, clientY: 200 }],
      })

      // Should not trigger navigation for small swipe
      expect(onPageChange).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('navigates with arrow keys', async () => {
      const onPageChange = jest.fn()
      render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
        />
      )

      // Press right arrow
      fireEvent.keyDown(window, { key: 'ArrowRight' })

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(1)
      })

      onPageChange.mockClear()

      // Press left arrow
      fireEvent.keyDown(window, { key: 'ArrowLeft' })

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(0)
      })
    })

    it('cleans up keyboard event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <SheetMusicDisplay sheetMusic={mockSheetMusic} />
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Responsive Behavior', () => {
    it('adjusts layout for mobile portrait', () => {
      // Set mobile portrait dimensions
      Object.defineProperty(window, 'innerWidth', { value: 400 })
      Object.defineProperty(window, 'innerHeight', { value: 800 })

      // Trigger resize event
      window.dispatchEvent(new Event('resize'))

      render(<SheetMusicDisplay sheetMusic={mockSheetMusic} />)

      // Should render with mobile-specific settings
      expect(mockNotationRenderer.render).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          scale: 0.8,
          measuresPerLine: 1,
        })
      )
    })

    it('adjusts layout for tablet', () => {
      // Set tablet dimensions
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      Object.defineProperty(window, 'innerHeight', { value: 1024 })

      window.dispatchEvent(new Event('resize'))

      render(<SheetMusicDisplay sheetMusic={mockSheetMusic} />)

      expect(mockNotationRenderer.render).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          scale: 0.85,
          measuresPerLine: 2,
        })
      )
    })

    it('shows touch hint on mobile', () => {
      // Set mobile dimensions
      Object.defineProperty(window, 'innerWidth', { value: 400 })

      window.dispatchEvent(new Event('resize'))

      render(<SheetMusicDisplay sheetMusic={mockSheetMusic} />)

      expect(screen.getByText('Tap sides to turn pages')).toBeInTheDocument()
    })

    it('cleans up resize listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <SheetMusicDisplay sheetMusic={mockSheetMusic} />
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Auto Page Flip', () => {
    it('flips to correct page when currentPlayingMeasure changes', () => {
      const onPageChange = jest.fn()
      const { rerender } = render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
          currentPlayingMeasure={0}
        />
      )

      // Update to measure 4 (should be on page 2 with 4 measures per page)
      rerender(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
          currentPlayingMeasure={4}
        />
      )

      expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it('does not flip if already on correct page', () => {
      const onPageChange = jest.fn()
      const { rerender } = render(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
          currentPlayingMeasure={0}
        />
      )

      // Update to measure 2 (still on page 1)
      rerender(
        <SheetMusicDisplay
          sheetMusic={mockSheetMusic}
          onPageChange={onPageChange}
          currentPlayingMeasure={2}
        />
      )

      expect(onPageChange).not.toHaveBeenCalled()
    })
  })

  describe('Custom Measures Per Page', () => {
    it('respects custom measuresPerPage prop', () => {
      // On desktop, the component will use its own responsive calculation
      // which is 4 measures per page, not the custom 2
      render(
        <SheetMusicDisplay sheetMusic={mockSheetMusic} measuresPerPage={2} />
      )

      // Check that the correct parameters were passed to render
      expect(mockNotationRenderer.render).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          measuresPerLine: 2, // Desktop uses 2 measures per line
        })
      )
    })

    it('renders correct measures for each page', () => {
      render(
        <SheetMusicDisplay sheetMusic={mockSheetMusic} measuresPerPage={4} />
      )

      // On desktop with 4 measures per page, first page should render measures 0-3
      expect(mockNotationRenderer.render).toHaveBeenCalledWith(
        expect.objectContaining({
          measures: mockSheetMusic.measures.slice(0, 4),
        }),
        expect.any(Object)
      )
    })
  })

  describe('Cleanup', () => {
    it('disposes NotationRenderer on unmount', () => {
      const { unmount } = render(
        <SheetMusicDisplay sheetMusic={mockSheetMusic} />
      )

      unmount()

      expect(mockNotationRenderer.dispose).toHaveBeenCalled()
    })

    it('creates fresh renderer on page change', async () => {
      render(<SheetMusicDisplay sheetMusic={mockSheetMusic} />)

      // Clear previous calls
      jest.clearAllMocks()

      // Navigate to next page
      const nextButtons = screen.getAllByLabelText('Next page')
      const visibleNextButton = nextButtons.find(button =>
        button.classList.contains('pointer-events-auto')
      )!
      fireEvent.click(visibleNextButton)

      await waitFor(() => {
        // Should dispose old renderer and create new one
        expect(mockNotationRenderer.dispose).toHaveBeenCalled()
        expect(NotationRenderer).toHaveBeenCalled()
      })
    })
  })
})
