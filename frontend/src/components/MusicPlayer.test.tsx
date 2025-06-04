import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MusicPlayer, PlayableNote } from './MusicPlayer'
import { AudioProvider } from '../contexts/AudioContext'
import { MockAudioManager } from '../utils/mockAudioManager'
import * as Tone from 'tone'

// Mock Tone.js
jest.mock('tone', () => ({
  start: jest.fn().mockResolvedValue(undefined),
  Transport: {
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    cancel: jest.fn(),
    position: 0,
    bpm: {
      value: 60,
    },
  },
  Part: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    dispose: jest.fn(),
    loop: false,
    loopEnd: '0:0:0',
  })),
  Draw: {
    schedule: jest.fn(callback => callback()),
  },
}))

describe('MusicPlayer', () => {
  let mockAudioManager: MockAudioManager
  let consoleError: jest.SpyInstance

  const mockNotes: PlayableNote[] = [
    { note: 'C4', time: 0 },
    { note: 'E4', time: 0.5 },
    { note: 'G4', time: 1 },
    { note: 'C5', time: 1.5 },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockAudioManager = new MockAudioManager()
    // Silence act warnings in these tests as they're expected due to async state updates
    consoleError = jest.spyOn(console, 'error').mockImplementation(msg => {
      if (
        typeof msg === 'string' &&
        msg.includes(
          'Warning: An update to MusicPlayer inside a test was not wrapped in act'
        )
      ) {
        return
      }
      console.warn(msg)
    })
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  const renderWithAudio = (ui: React.ReactElement) => {
    return render(
      <AudioProvider audioManager={mockAudioManager}>{ui}</AudioProvider>
    )
  }

  describe('Rendering', () => {
    it('should render play button initially', () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      const { container } = renderWithAudio(
        <MusicPlayer notes={mockNotes} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should render in compact mode', () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} compact />)

      const button = screen.getByRole('button', { name: /play/i })
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm')
    })

    it('should show tempo control by default', () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      expect(screen.getByText(/tempo:/i)).toBeInTheDocument()
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('should hide tempo control when showTempoControl is false', () => {
      renderWithAudio(
        <MusicPlayer notes={mockNotes} showTempoControl={false} />
      )

      expect(screen.queryByText(/tempo:/i)).not.toBeInTheDocument()
    })

    it('should show measure progress by default', () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      expect(screen.getByText(/measure:/i)).toBeInTheDocument()
      expect(screen.getByText('1/20')).toBeInTheDocument()
    })

    it('should hide measure progress when showMeasureProgress is false', () => {
      renderWithAudio(
        <MusicPlayer notes={mockNotes} showMeasureProgress={false} />
      )

      expect(screen.queryByText(/measure:/i)).not.toBeInTheDocument()
    })
  })

  describe('Playback Controls', () => {
    it('should initialize audio and start playback when play is clicked', async () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      const playButton = screen.getByRole('button', { name: /play/i })
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(mockAudioManager.isInitialized()).toBe(true)
        expect(Tone.start).toHaveBeenCalled()
        expect(Tone.Transport.start).toHaveBeenCalled()
      })

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    })

    it('should show loading state during initialization', async () => {
      // Make initialization take longer
      mockAudioManager.initialize = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      const playButton = screen.getByRole('button', { name: /play/i })
      fireEvent.click(playButton)

      expect(
        screen.getByRole('button', { name: /loading/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /loading/i })
        ).not.toBeInTheDocument()
      })
    })

    it('should pause playback when pause is clicked', async () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      // Start playback
      const playButton = screen.getByRole('button', { name: /play/i })
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /pause/i })
        ).toBeInTheDocument()
      })

      // Pause
      const pauseButton = screen.getByRole('button', { name: /pause/i })
      fireEvent.click(pauseButton)

      expect(Tone.Transport.pause).toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: /resume/i })
      ).toBeInTheDocument()
    })

    it('should resume playback when resume is clicked', async () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      // Start and pause
      const playButton = screen.getByRole('button', { name: /play/i })
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /pause/i })
        ).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /pause/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /resume/i })
        ).toBeInTheDocument()
      })

      // Clear mock to count resume calls separately
      ;(Tone.Transport.start as jest.Mock).mockClear()

      // Resume
      const resumeButton = screen.getByRole('button', { name: /resume/i })
      fireEvent.click(resumeButton)

      await waitFor(() => {
        expect(Tone.Transport.start).toHaveBeenCalledTimes(1)
      })

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    })

    it('should stop playback when stop is clicked', async () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      // Start playback
      const playButton = screen.getByRole('button', { name: /play/i })
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /stop/i })
        ).toBeInTheDocument()
      })

      // Stop
      const stopButton = screen.getByRole('button', { name: /stop/i })
      fireEvent.click(stopButton)

      expect(Tone.Transport.stop).toHaveBeenCalled()
      expect(Tone.Transport.cancel).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /stop/i })
      ).not.toBeInTheDocument()
    })

    it('should hide stop button when showStopButton is false', async () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} showStopButton={false} />)

      const playButton = screen.getByRole('button', { name: /play/i })
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /pause/i })
        ).toBeInTheDocument()
      })

      expect(
        screen.queryByRole('button', { name: /stop/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Tempo Control', () => {
    it('should set initial tempo', () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} initialTempo={120} />)

      expect(screen.getByText('120')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toHaveValue('120')
    })

    it('should update tempo when slider changes', () => {
      const onTempoChange = jest.fn()
      renderWithAudio(
        <MusicPlayer notes={mockNotes} onTempoChange={onTempoChange} />
      )

      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: '90' } })

      expect(screen.getByText('90')).toBeInTheDocument()
      expect(onTempoChange).toHaveBeenCalledWith(90)
    })

    it('should update transport tempo during playback', async () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      // Start playback
      fireEvent.click(screen.getByRole('button', { name: /play/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /pause/i })
        ).toBeInTheDocument()
      })

      // Change tempo
      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: '90' } })

      expect(Tone.Transport.bpm.value).toBe(90)
    })

    it('should respect min and max tempo', () => {
      renderWithAudio(
        <MusicPlayer notes={mockNotes} minTempo={40} maxTempo={140} />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('min', '40')
      expect(slider).toHaveAttribute('max', '140')
    })

    it('should show tempo descriptions', () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} initialTempo={35} />)
      expect(screen.getByText('(Slow practice)')).toBeInTheDocument()

      // Clean up and rerender with new tempo
      render(<div />)
      renderWithAudio(<MusicPlayer notes={mockNotes} initialTempo={50} />)
      expect(screen.getByText('(Medium)')).toBeInTheDocument()

      // Clean up and rerender with new tempo
      render(<div />)
      renderWithAudio(<MusicPlayer notes={mockNotes} initialTempo={80} />)
      expect(screen.getByText('(Target)')).toBeInTheDocument()

      // Clean up and rerender with new tempo
      render(<div />)
      renderWithAudio(<MusicPlayer notes={mockNotes} initialTempo={120} />)
      expect(screen.getByText('(Performance)')).toBeInTheDocument()
    })

    it('should disable tempo slider when paused', async () => {
      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      // Start and pause
      fireEvent.click(screen.getByRole('button', { name: /play/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /pause/i })
        ).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /pause/i }))

      const slider = screen.getByRole('slider')
      expect(slider).toBeDisabled()
      expect(slider).toHaveClass('opacity-50', 'cursor-not-allowed')
    })
  })

  describe('Callbacks', () => {
    it('should call onPlayStateChange when play state changes', async () => {
      const onPlayStateChange = jest.fn()
      renderWithAudio(
        <MusicPlayer notes={mockNotes} onPlayStateChange={onPlayStateChange} />
      )

      // Initial state
      expect(onPlayStateChange).toHaveBeenCalledWith(false, false)

      // Play
      fireEvent.click(screen.getByRole('button', { name: /play/i }))

      await waitFor(() => {
        expect(onPlayStateChange).toHaveBeenCalledWith(true, false)
      })

      // Pause
      fireEvent.click(screen.getByRole('button', { name: /pause/i }))
      expect(onPlayStateChange).toHaveBeenCalledWith(false, true)

      // Resume
      fireEvent.click(screen.getByRole('button', { name: /resume/i }))
      expect(onPlayStateChange).toHaveBeenCalledWith(true, false)

      // Stop
      fireEvent.click(screen.getByRole('button', { name: /stop/i }))
      expect(onPlayStateChange).toHaveBeenCalledWith(false, false)
    })

    it('should call onMeasureChange when measure changes', async () => {
      const onMeasureChange = jest.fn()
      const mockPart = {
        start: jest.fn(),
        stop: jest.fn(),
        dispose: jest.fn(),
        loop: false,
        loopEnd: '0:0:0',
      }

      let partCallback: (
        time: number,
        note: { note: string; originalTime: number }
      ) => void = () => {}
      let drawCallbacks: (() => void)[] = []

      ;(Tone.Part as unknown as jest.Mock).mockImplementation(callback => {
        partCallback = callback
        return mockPart
      })
      ;(Tone.Draw.schedule as jest.Mock).mockImplementation(callback => {
        drawCallbacks.push(callback)
      })

      renderWithAudio(
        <MusicPlayer notes={mockNotes} onMeasureChange={onMeasureChange} />
      )

      // Initial measure
      expect(onMeasureChange).toHaveBeenCalledWith(0)

      // Start playback
      fireEvent.click(screen.getByRole('button', { name: /play/i }))

      await waitFor(() => {
        expect(mockPart.start).toHaveBeenCalled()
      })

      // Simulate note callbacks that update measure
      partCallback(0, { note: 'C4', originalTime: 0 })
      // Execute the scheduled draw callback
      drawCallbacks.forEach(cb => cb())

      await waitFor(() => {
        expect(onMeasureChange).toHaveBeenCalledWith(0)
      })

      // Clear and simulate next measure
      drawCallbacks = []
      partCallback(1, { note: 'G4', originalTime: 1 })
      drawCallbacks.forEach(cb => cb())

      await waitFor(() => {
        expect(onMeasureChange).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle audio initialization failure', async () => {
      mockAudioManager.initialize = jest
        .fn()
        .mockRejectedValue(new Error('Audio failed'))

      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      fireEvent.click(screen.getByRole('button', { name: /play/i }))

      await waitFor(() => {
        // Should revert to play button after error
        expect(
          screen.getByRole('button', { name: /play/i })
        ).toBeInTheDocument()
      })

      expect(
        screen.queryByRole('button', { name: /pause/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Loop Functionality', () => {
    it('should enable loop by default', async () => {
      const mockPart = {
        start: jest.fn(),
        stop: jest.fn(),
        dispose: jest.fn(),
        loop: false,
        loopEnd: '0:0:0',
      }

      ;(Tone.Part as unknown as jest.Mock).mockImplementation(() => mockPart)

      renderWithAudio(<MusicPlayer notes={mockNotes} />)

      fireEvent.click(screen.getByRole('button', { name: /play/i }))

      await waitFor(() => {
        expect(mockPart.loop).toBe(true)
      })
    })

    it('should disable loop when loop prop is false', async () => {
      const mockPart = {
        start: jest.fn(),
        stop: jest.fn(),
        dispose: jest.fn(),
        loop: false,
        loopEnd: '0:0:0',
      }

      ;(Tone.Part as unknown as jest.Mock).mockImplementation(() => mockPart)

      renderWithAudio(<MusicPlayer notes={mockNotes} loop={false} />)

      fireEvent.click(screen.getByRole('button', { name: /play/i }))

      await waitFor(() => {
        expect(mockPart.loop).toBe(false)
      })
    })
  })

  describe('Cleanup', () => {
    it('should clean up on unmount', async () => {
      const mockPart = {
        start: jest.fn(),
        stop: jest.fn(),
        dispose: jest.fn(),
        loop: false,
        loopEnd: '0:0:0',
      }

      ;(Tone.Part as unknown as jest.Mock).mockImplementation(() => mockPart)

      const { unmount } = renderWithAudio(<MusicPlayer notes={mockNotes} />)

      // Start playback
      fireEvent.click(screen.getByRole('button', { name: /play/i }))

      await waitFor(() => {
        expect(mockPart.start).toHaveBeenCalled()
      })

      // Unmount
      unmount()

      expect(mockPart.dispose).toHaveBeenCalled()
      expect(Tone.Transport.stop).toHaveBeenCalled()
      expect(Tone.Transport.cancel).toHaveBeenCalled()
    })
  })
})
