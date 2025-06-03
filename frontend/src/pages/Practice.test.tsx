/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Practice from './Practice'
import { audioManager } from '../utils/audioManager'
import * as Tone from 'tone'

// Mock dependencies
jest.mock('../utils/audioManager')
jest.mock('tone')

// Mock components that have their own tests
jest.mock('../components', () => ({
  MusicPlayer: ({ onMeasureChange, onPlayStateChange }: any) => (
    <div data-testid="music-player">
      <button onClick={() => onMeasureChange(1)}>Change Measure</button>
      <button onClick={() => onPlayStateChange(false, false)}>Stop</button>
    </div>
  ),
  CircularControl: ({ onChange, value, label }: any) => (
    <div data-testid={`circular-control-${label}`}>
      <input
        type="range"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  ),
  UserStatusIndicator: () => <div data-testid="user-status-indicator" />,
  SaveProgressPrompt: () => <div data-testid="save-progress-prompt" />,
  AudioPermissionPrompt: ({ onAllow, isLoading }: any) => (
    <div data-testid="audio-permission-prompt">
      <h2>Enable Audio</h2>
      <button onClick={onAllow} disabled={isLoading}>
        {isLoading ? 'Loading Audio...' : 'Start Practicing'}
      </button>
    </div>
  ),
}))

jest.mock('../components/SheetMusicDisplay', () => ({
  SheetMusicDisplay: ({ currentPlayingMeasure }: any) => (
    <div data-testid="sheet-music-display">
      Current Measure: {currentPlayingMeasure || 'none'}
    </div>
  ),
}))

// Mock sheet music data
jest.mock('../data/sheetMusic', () => ({
  moonlightSonata3rdMovement: {
    id: 'moonlight-3rd',
    title: 'Moonlight Sonata, 3rd Movement',
    composer: 'L. van Beethoven',
    measures: [
      {
        keySignature: 'C# minor',
        tempo: { marking: 'Presto agitato', bpm: 160 },
      },
    ],
  },
  getPlayableNotes: () => [
    { note: 'C4', time: 0 },
    { note: 'D4', time: 0.5 },
    { note: 'E4', time: 1 },
  ],
}))

describe('Practice Page', () => {
  const mockAudioManager = audioManager as jest.Mocked<typeof audioManager>
  const mockTone = Tone as jest.Mocked<typeof Tone>

  beforeEach(() => {
    jest.clearAllMocks()
    mockAudioManager.initialize.mockResolvedValue()
    mockAudioManager.setInstrument.mockReturnValue()
    mockAudioManager.isInitialized.mockReturnValue(true) // Default to initialized

    // Mock Tone.Master.volume - Create a mock object that simulates Tone.Master
    Object.defineProperty(mockTone, 'Master', {
      value: {
        volume: { value: 0 },
      },
      writable: true,
      configurable: true,
    })
  })

  const renderPractice = () => {
    return render(
      <BrowserRouter>
        <Practice />
      </BrowserRouter>
    )
  }

  describe('Component Rendering', () => {
    it('renders the practice page with all main sections', () => {
      renderPractice()

      // Header elements
      expect(screen.getByText('mirubato')).toBeInTheDocument()
      expect(screen.getByText(/Back/)).toBeInTheDocument()

      // Piece info
      expect(
        screen.getByText('Moonlight Sonata, 3rd Movement')
      ).toBeInTheDocument()
      expect(screen.getByText('L. van Beethoven')).toBeInTheDocument()
      expect(screen.getByText(/C# minor/)).toBeInTheDocument()
      expect(screen.getByText(/Presto agitato/)).toBeInTheDocument()

      // Main components
      expect(screen.getByTestId('sheet-music-display')).toBeInTheDocument()
      expect(screen.getByTestId('music-player')).toBeInTheDocument()
      expect(screen.getByTestId('circular-control-Vol')).toBeInTheDocument()
      expect(screen.getByTestId('user-status-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('save-progress-prompt')).toBeInTheDocument()
    })

    it('renders mode selector on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      renderPractice()

      expect(screen.getByText('Practice')).toBeInTheDocument()
      expect(screen.getByText('Sight Read')).toBeInTheDocument()
      expect(screen.getByText('Debug')).toBeInTheDocument()
    })

    it('hides mode selector on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })

      renderPractice()

      expect(screen.queryByText('Practice')).not.toBeInTheDocument()
      expect(screen.queryByText('Sight Read')).not.toBeInTheDocument()
    })

    it('shows mobile menu button on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })

      renderPractice()

      const menuButton = screen.getByRole('button', { name: '' })
      expect(menuButton.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Audio Initialization', () => {
    it('shows audio permission prompt when not initialized', () => {
      mockAudioManager.isInitialized.mockReturnValue(false)
      renderPractice()

      expect(screen.getByText('Enable Audio')).toBeInTheDocument()
      expect(screen.getByText('Start Practicing')).toBeInTheDocument()
    })

    it('does not show audio permission prompt when already initialized', () => {
      mockAudioManager.isInitialized.mockReturnValue(true)
      renderPractice()

      expect(screen.queryByText('Enable Audio')).not.toBeInTheDocument()
    })

    it('initializes audio when permission is granted', async () => {
      mockAudioManager.isInitialized.mockReturnValue(false)
      renderPractice()

      const startButton = screen.getByText('Start Practicing')
      await userEvent.click(startButton)

      await waitFor(() => {
        expect(mockAudioManager.setInstrument).toHaveBeenCalledWith('piano')
        expect(mockAudioManager.initialize).toHaveBeenCalled()
      })
    })

    it('handles audio initialization errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      mockAudioManager.isInitialized.mockReturnValue(false)
      mockAudioManager.initialize.mockRejectedValue(
        new Error('Audio init failed')
      )

      renderPractice()

      const startButton = screen.getByText('Start Practicing')
      await userEvent.click(startButton)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to initialize audio:',
          expect.any(Error)
        )
      })

      // Should still allow user to proceed
      expect(screen.queryByText('Enable Audio')).not.toBeInTheDocument()

      consoleError.mockRestore()
    })
  })

  describe('Mode Selection', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })
    })

    it('changes mode when mode buttons are clicked', () => {
      renderPractice()

      const practiceButton = screen.getByText('Practice')
      const sightReadButton = screen.getByText('Sight Read')
      const debugButton = screen.getByText('Debug')

      // Initially practice mode is selected
      expect(practiceButton.className).toContain('bg-white')
      expect(sightReadButton.className).not.toContain('bg-white')

      // Click sight read
      fireEvent.click(sightReadButton)
      expect(sightReadButton.className).toContain('bg-white')
      expect(practiceButton.className).not.toContain('bg-white')

      // Click debug
      fireEvent.click(debugButton)
      expect(debugButton.className).toContain('bg-white')
      expect(sightReadButton.className).not.toContain('bg-white')
    })

    it('shows debug controls in debug mode', () => {
      renderPractice()

      // Switch to debug mode
      fireEvent.click(screen.getByText('Debug'))

      // Check for debug controls
      expect(
        screen.getByText('Show all controls at full opacity')
      ).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('shows ghost controls in practice mode', () => {
      renderPractice()

      // Ensure we're in practice mode
      fireEvent.click(screen.getByText('Practice'))

      // Check for ghost control buttons
      expect(screen.getByText('Loop A-B')).toBeInTheDocument()
      expect(screen.getByText('Metronome')).toBeInTheDocument()
      expect(screen.getByText('Note Hints')).toBeInTheDocument()
    })
  })

  describe('Volume Control', () => {
    it('updates volume when control is changed', () => {
      renderPractice()

      const volumeInput = screen.getByLabelText('Vol')

      // Initial volume is 75
      expect(volumeInput).toHaveValue('75')

      // Change volume to 50
      fireEvent.change(volumeInput, { target: { value: '50' } })

      // Check that Tone.Master.volume was updated
      // 50% = (50/100) * 60 - 60 = -30 dB
      expect(mockTone.Master.volume.value).toBe(-30)
    })

    it('converts volume percentage to dB correctly', () => {
      renderPractice()

      const volumeInput = screen.getByLabelText('Vol')

      // Test various volume levels
      const testCases = [
        { percent: 0, expectedDb: -60 },
        { percent: 50, expectedDb: -30 },
        { percent: 100, expectedDb: 0 },
      ]

      testCases.forEach(({ percent, expectedDb }) => {
        fireEvent.change(volumeInput, { target: { value: String(percent) } })
        expect(mockTone.Master.volume.value).toBe(expectedDb)
      })
    })
  })

  describe('Sheet Music Display Integration', () => {
    it('updates current playing measure from MusicPlayer', () => {
      renderPractice()

      // Initially no measure is playing
      expect(screen.getByText('Current Measure: none')).toBeInTheDocument()

      // Click the change measure button in mock MusicPlayer
      fireEvent.click(screen.getByText('Change Measure'))

      // Should update to measure 1
      expect(screen.getByText('Current Measure: 1')).toBeInTheDocument()
    })

    it('clears current playing measure when stopped', () => {
      renderPractice()

      // Set a playing measure
      fireEvent.click(screen.getByText('Change Measure'))
      expect(screen.getByText('Current Measure: 1')).toBeInTheDocument()

      // Stop playback
      fireEvent.click(screen.getByText('Stop'))

      // Should clear the current measure
      expect(screen.getByText('Current Measure: none')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('adapts layout for tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      renderPractice()

      // Mode selector should be visible on tablet
      expect(screen.getByText('Practice')).toBeInTheDocument()

      // Music player should be present in tablet layout
      expect(screen.getByTestId('music-player')).toBeInTheDocument()
    })

    it('handles window resize events', () => {
      const { rerender } = renderPractice()

      // Change window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })

      // Trigger resize event
      fireEvent(window, new Event('resize'))

      // Force re-render to check updated state
      rerender(
        <BrowserRouter>
          <Practice />
        </BrowserRouter>
      )

      // Mobile menu button should appear
      const buttons = screen.getAllByRole('button')
      const menuButton = buttons.find(btn => btn.querySelector('svg'))
      expect(menuButton).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('provides a back link to home', () => {
      // Ensure desktop view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      renderPractice()

      const backLink = screen.getByRole('link', { name: /Back/i })
      expect(backLink).toHaveAttribute('href', '/')
    })

    it('shows close button (×) on mobile instead of Back', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })

      renderPractice()

      expect(screen.getByText('×')).toBeInTheDocument()
      expect(screen.queryByText(/Back/)).not.toBeInTheDocument()
    })
  })

  describe('Debug Mode Features', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })
    })

    it('toggles ghost control visibility in debug mode', () => {
      renderPractice()

      // Switch to debug mode
      fireEvent.click(screen.getByText('Debug'))

      const checkbox = screen.getByRole('checkbox')

      // Initially unchecked (ghost controls visible at 5%)
      expect(checkbox).not.toBeChecked()

      // Toggle to show controls at full opacity
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })
  })

  describe('Component Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListener = jest.spyOn(window, 'removeEventListener')

      const { unmount } = renderPractice()

      unmount()

      expect(removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      )
    })
  })
})
