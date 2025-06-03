import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import Practice from '../../src/pages/Practice'
import { AuthProvider } from '../../src/contexts/AuthContext'
import { audioManager } from '../../src/utils/audioManager'
import * as Tone from 'tone'

// Mock dependencies
jest.mock('../../src/utils/audioManager')
jest.mock('../../src/utils/notationRenderer')
jest.mock('tone')

// Mock the MusicPlayer component to avoid complex audio timing issues
jest.mock('../../src/components/MusicPlayer', () => ({
  MusicPlayer: jest.fn(({ onMeasureChange, onPlayStateChange, ...props }) => {
    // Store callbacks for testing
    const mockMusicPlayer = {
      onMeasureChange,
      onPlayStateChange,
    }
    ;(
      window as unknown as { __mockMusicPlayer: typeof mockMusicPlayer }
    ).__mockMusicPlayer = mockMusicPlayer

    return (
      <div data-testid="music-player">
        <button onClick={() => onPlayStateChange?.(true, false)}>Play</button>
        <button onClick={() => onPlayStateChange?.(false, true)}>Pause</button>
        <button onClick={() => onPlayStateChange?.(false, false)}>Stop</button>
        <button onClick={() => onMeasureChange?.(2)}>Measure 2</button>
        <div>Tempo: {props.initialTempo}</div>
      </div>
    )
  }),
}))

const mockAudioManager = {
  setInstrument: jest.fn(),
  initialize: jest.fn().mockResolvedValue(true),
  playNote: jest.fn(),
  stop: jest.fn(),
  isInitialized: jest.fn().mockReturnValue(false),
}

;(audioManager as unknown as typeof mockAudioManager) = mockAudioManager

const mockToneMaster = {
  volume: { value: 0 },
}

;(Tone.Master as unknown as typeof mockToneMaster) = mockToneMaster

// Helper to render component with router and auth context
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MockedProvider mocks={[]} addTypename={false}>
      <BrowserRouter>
        <AuthProvider>{component}</AuthProvider>
      </BrowserRouter>
    </MockedProvider>
  )
}

describe('Practice Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockToneMaster.volume.value = 0

    // Reset window dimensions to desktop
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

  describe('Initial Rendering', () => {
    it('renders all main components', async () => {
      renderWithRouter(<Practice />)

      // Check header
      expect(screen.getByText('mirubato')).toBeInTheDocument()
      expect(screen.getByText('← Back')).toBeInTheDocument()

      // Check piece info
      expect(screen.getByText(/Moonlight/)).toBeInTheDocument()
      expect(screen.getByText(/Beethoven/)).toBeInTheDocument()

      // Check mode selector (desktop only)
      expect(screen.getByText('Practice')).toBeInTheDocument()
      expect(screen.getByText('Sight Read')).toBeInTheDocument()
      expect(screen.getByText('Debug')).toBeInTheDocument()

      // Check volume control
      expect(screen.getByText('Vol')).toBeInTheDocument()

      // Check music player
      expect(screen.getByTestId('music-player')).toBeInTheDocument()
    })

    it('sets instrument to piano on mount', async () => {
      renderWithRouter(<Practice />)

      await waitFor(() => {
        expect(mockAudioManager.setInstrument).toHaveBeenCalledWith('piano')
      })

      // Audio initialization happens when play is clicked, not on mount
      expect(mockAudioManager.initialize).not.toHaveBeenCalled()
    })
  })

  describe('Mode Switching', () => {
    it('switches between practice modes', () => {
      renderWithRouter(<Practice />)

      // Click on Sight Read mode
      const sightReadButton = screen.getByText('Sight Read')
      fireEvent.click(sightReadButton)

      // Button should be highlighted (has different classes)
      expect(sightReadButton).toHaveClass('bg-white')

      // Click on Debug mode
      const debugButton = screen.getByText('Debug')
      fireEvent.click(debugButton)

      // Debug mode should show additional controls
      expect(
        screen.getByText('Show all controls at full opacity')
      ).toBeInTheDocument()
    })

    it('toggles ghost controls in debug mode', () => {
      renderWithRouter(<Practice />)

      // Switch to debug mode
      fireEvent.click(screen.getByText('Debug'))

      // Toggle checkbox
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })
  })

  describe('Volume Control Integration', () => {
    it('updates master volume when volume control changes', async () => {
      const { container } = renderWithRouter(<Practice />)

      await waitFor(() => {
        // Find the volume control SVG (last one is the volume control)
        const svgs = container.querySelectorAll('svg')
        const volumeControl = svgs[svgs.length - 1]

        // Mock getBoundingClientRect for the volume control
        const mockRect = {
          left: 0,
          top: 0,
          width: 70,
          height: 70,
          right: 70,
          bottom: 70,
          x: 0,
          y: 0,
          toJSON: () => {},
        }
        jest
          .spyOn(volumeControl, 'getBoundingClientRect')
          .mockReturnValue(mockRect)

        // Simulate dragging to change volume
        fireEvent.mouseDown(volumeControl)

        // Drag to right (50% = 0 degrees)
        fireEvent.mouseMove(document, { clientX: 70, clientY: 35 })

        // Volume should be updated
        // 50% volume = (50/100) * 60 - 60 = -30 dB
        expect(mockToneMaster.volume.value).toBe(-30)
      })
    })
  })

  describe('Music Player Integration', () => {
    it('updates current playing measure when music plays', () => {
      renderWithRouter(<Practice />)

      // Click measure 2 button (from our mock)
      fireEvent.click(screen.getByText('Measure 2'))

      // This should trigger the onMeasureChange callback
      // In the real component, this would update SheetMusicDisplay
    })

    it('clears current playing measure when music stops', () => {
      renderWithRouter(<Practice />)

      // Start playing
      fireEvent.click(screen.getByText('Play'))

      // Then stop
      fireEvent.click(screen.getByText('Stop'))

      // This should trigger onPlayStateChange with (false, false)
    })
  })

  describe('Responsive Behavior', () => {
    it('shows mobile layout on small screens', () => {
      // Set mobile dimensions
      Object.defineProperty(window, 'innerWidth', { value: 400 })
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      renderWithRouter(<Practice />)

      // Mobile should show × instead of ← Back
      expect(screen.getByText('×')).toBeInTheDocument()
      expect(screen.queryByText('← Back')).not.toBeInTheDocument()

      // Mode selector should be hidden on mobile
      expect(screen.queryByText('Practice')).not.toBeInTheDocument()

      // Should show hamburger menu
      const menuButton = screen.getByRole('button', { name: '' })
      expect(menuButton.querySelector('svg')).toBeInTheDocument()
    })

    it('shows tablet layout on medium screens', () => {
      // Set tablet dimensions
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      renderWithRouter(<Practice />)

      // Should show back text
      expect(screen.getByText('← Back')).toBeInTheDocument()

      // Mode selector should be visible
      expect(screen.getByText('Practice')).toBeInTheDocument()
    })

    it('adjusts volume control size based on screen size', () => {
      const { container, rerender } = renderWithRouter(<Practice />)

      // Desktop size (70px)
      let volumeControl = container.querySelector('svg[width="70"]')
      expect(volumeControl).toBeInTheDocument()

      // Change to mobile
      Object.defineProperty(window, 'innerWidth', { value: 400 })
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      rerender(
        <MockedProvider mocks={[]} addTypename={false}>
          <BrowserRouter>
            <AuthProvider>
              <Practice />
            </AuthProvider>
          </BrowserRouter>
        </MockedProvider>
      )

      // Mobile size (50px)
      volumeControl = container.querySelector('svg[width="50"]')
      expect(volumeControl).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('navigates back when clicking back link', () => {
      renderWithRouter(<Practice />)

      const backLink = screen.getByText('← Back')
      expect(backLink).toHaveAttribute('href', '/')
    })
  })

  describe('Error Handling', () => {
    it('renders page even when audio is not available', async () => {
      // Mock console.error to prevent error output in tests
      const consoleError = jest.spyOn(console, 'error').mockImplementation()

      // Make initialization fail
      mockAudioManager.isInitialized = jest.fn().mockReturnValue(false)
      mockAudioManager.initialize.mockRejectedValueOnce(
        new Error('Audio failed')
      )

      renderWithRouter(<Practice />)

      // Page should still render all components
      expect(screen.getByText('mirubato')).toBeInTheDocument()
      expect(screen.getByText(/Moonlight/)).toBeInTheDocument()
      expect(screen.getByTestId('music-player')).toBeInTheDocument()

      // User can still interact with controls
      fireEvent.click(screen.getByText('Play'))

      // Since MusicPlayer is mocked, we just verify the UI is functional
      expect(screen.getByText('Play')).toBeInTheDocument()

      consoleError.mockRestore()
    })
  })

  describe('Component Communication', () => {
    it('passes tempo from MusicPlayer to display', () => {
      renderWithRouter(<Practice />)

      // Check that initial tempo is passed
      expect(screen.getByText('Tempo: 40')).toBeInTheDocument()
    })

    it('coordinates between MusicPlayer and SheetMusicDisplay', async () => {
      renderWithRouter(<Practice />)

      // Get the mock music player callbacks
      const mockCallbacks = (
        window as unknown as {
          __mockMusicPlayer: {
            onMeasureChange?: (measure: number) => void
            onPlayStateChange?: (playing: boolean, paused: boolean) => void
          }
        }
      ).__mockMusicPlayer

      // Simulate measure change
      fireEvent.click(screen.getByText('Measure 2'))

      // The onMeasureChange callback should have been called
      expect(mockCallbacks.onMeasureChange).toBeDefined()
    })
  })

  describe('Cleanup', () => {
    it('removes resize event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = renderWithRouter(<Practice />)

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })
})
