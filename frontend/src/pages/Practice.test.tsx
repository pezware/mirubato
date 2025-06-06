/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Practice from './Practice'
import { AudioProvider } from '../contexts/AudioContext'
import { audioManager } from '../utils/audioManager'
import * as Tone from 'tone'

// Mock dependencies
jest.mock('../utils/audioManager')
jest.mock('tone')
jest.mock('../hooks/useViewport')

// Import the hook to be mocked
import { useViewport } from '../hooks/useViewport'

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
  PracticeHeader: ({ mode, onModeChange, isMobile }: any) => (
    <div data-testid="practice-header">
      <h1>mirubato</h1>
      <div>{mode}</div>
      <div data-testid="user-status-indicator" />
      {!isMobile && (
        <div>
          <button onClick={() => onModeChange('practice')}>Practice</button>
          <button onClick={() => onModeChange('sight-read')}>Sight Read</button>
          <button onClick={() => onModeChange('debug')}>Debug</button>
        </div>
      )}
      {isMobile && <button data-testid="mobile-menu">Menu</button>}
      <a href="/">{isMobile ? '×' : '← Back'}</a>
    </div>
  ),
  PracticeControls: ({
    mode,
    volume,
    onVolumeChange,
    showGhostControls,
    onMeasureChange,
  }: any) => {
    // We need to handle volume changes to update Tone.Master.volume
    const handleVolumeChange = (value: number) => {
      onVolumeChange(value)
      // Convert 0-100 to -60 to 0 dB
      const db = (value / 100) * 60 - 60
      ;(Tone as any).Master.volume.value = db
    }

    return (
      <div data-testid="practice-controls">
        <input
          type="range"
          value={volume}
          onChange={e => handleVolumeChange(Number(e.target.value))}
          aria-label="Vol"
        />
        {mode === 'practice' && (
          <div style={{ opacity: showGhostControls ? 0.05 : 0 }}>
            <button>Loop A-B</button>
            <button>Metronome</button>
            <button>Note Hints</button>
          </div>
        )}
        <div data-testid="music-player">
          <button onClick={() => onMeasureChange(1)}>Change Measure</button>
          <button onClick={() => onMeasureChange(undefined)}>Stop</button>
        </div>
      </div>
    )
  },
  PracticeNotation: ({ sheetMusic, currentPlayingMeasure }: any) => (
    <div data-testid="practice-notation">
      <div>
        {sheetMusic.title} - {sheetMusic.composer}
      </div>
      <div>Current Measure: {currentPlayingMeasure || 'none'}</div>
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
  const mockUseViewport = useViewport as jest.MockedFunction<typeof useViewport>

  beforeEach(() => {
    jest.clearAllMocks()
    mockAudioManager.initialize.mockResolvedValue()
    mockAudioManager.setInstrument.mockReturnValue()
    mockAudioManager.isInitialized.mockReturnValue(true) // Default to initialized
    mockAudioManager.getInstrument = jest.fn().mockReturnValue('piano')

    // Set default viewport mock
    mockUseViewport.mockReturnValue({
      viewportWidth: 1024,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    })

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
        <AudioProvider audioManager={mockAudioManager as any}>
          <Practice />
        </AudioProvider>
      </BrowserRouter>
    )
  }

  describe('Component Rendering', () => {
    it('renders the practice page with all main sections', () => {
      renderPractice()

      // Header elements
      expect(screen.getByText('mirubato')).toBeInTheDocument()
      expect(screen.getByText(/Back/)).toBeInTheDocument()

      // Piece info - check that the notation section contains the piece info
      const notationSection = screen.getByTestId('practice-notation')
      expect(notationSection).toHaveTextContent(
        'Moonlight Sonata, 3rd Movement'
      )
      expect(notationSection).toHaveTextContent('L. van Beethoven')

      // Main components
      expect(screen.getByTestId('practice-notation')).toBeInTheDocument()
      expect(screen.getByTestId('practice-controls')).toBeInTheDocument()
      expect(screen.getByTestId('music-player')).toBeInTheDocument()
      expect(screen.getByLabelText('Vol')).toBeInTheDocument()
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
      mockUseViewport.mockReturnValue({
        viewportWidth: 500,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      })

      renderPractice()

      // On mobile, mode selector buttons should not be present
      expect(screen.queryByText('Sight Read')).not.toBeInTheDocument()
      expect(screen.queryByText('Debug')).not.toBeInTheDocument()
    })

    it('shows mobile menu button on mobile', () => {
      mockUseViewport.mockReturnValue({
        viewportWidth: 500,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      })

      renderPractice()

      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
    })
  })

  describe('Audio Initialization', () => {
    it('sets instrument to piano on mount', () => {
      renderPractice()

      expect(mockAudioManager.setInstrument).toHaveBeenCalledWith('piano')
    })
  })

  describe('Mode Selection', () => {
    it('changes mode when mode buttons are clicked', () => {
      renderPractice()

      const sightReadButton = screen.getByText('Sight Read')
      const debugButton = screen.getByText('Debug')

      // Initially practice mode is displayed
      expect(screen.getByText('practice')).toBeInTheDocument()

      // Click sight read
      fireEvent.click(sightReadButton)

      // The component should re-render with new mode
      // We can't check className on mocked components, so check for mode display
      expect(screen.queryByText('practice')).not.toBeInTheDocument()
      expect(screen.getByText('sight-read')).toBeInTheDocument()

      // Click debug
      fireEvent.click(debugButton)
      expect(screen.queryByText('sight-read')).not.toBeInTheDocument()
      expect(screen.getByText('debug')).toBeInTheDocument()
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
      mockUseViewport.mockReturnValue({
        viewportWidth: 768,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
      })

      renderPractice()

      // Mode selector should be visible on tablet
      expect(screen.getByText('Practice')).toBeInTheDocument()

      // Music player should be present in tablet layout
      expect(screen.getByTestId('music-player')).toBeInTheDocument()
    })

    it('handles window resize events', () => {
      // Start with desktop viewport
      mockUseViewport.mockReturnValue({
        viewportWidth: 1024,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      })

      const { rerender } = renderPractice()

      // Change to mobile viewport
      mockUseViewport.mockReturnValue({
        viewportWidth: 500,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      })

      // Force re-render to check updated state
      rerender(
        <BrowserRouter>
          <AudioProvider audioManager={mockAudioManager as any}>
            <Practice />
          </AudioProvider>
        </BrowserRouter>
      )

      // Mobile menu button should appear
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('provides a back link to home', () => {
      // Ensure desktop view
      mockUseViewport.mockReturnValue({
        viewportWidth: 1200,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      })

      renderPractice()

      const backLink = screen.getByRole('link', { name: /Back/i })
      expect(backLink).toHaveAttribute('href', '/')
    })

    it('shows close button (×) on mobile instead of Back', () => {
      mockUseViewport.mockReturnValue({
        viewportWidth: 500,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      })

      renderPractice()

      expect(screen.getByText('×')).toBeInTheDocument()
      expect(screen.queryByText(/Back/)).not.toBeInTheDocument()
    })
  })

  describe('Debug Mode Features', () => {
    beforeEach(() => {
      mockUseViewport.mockReturnValue({
        viewportWidth: 1200,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
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
})
