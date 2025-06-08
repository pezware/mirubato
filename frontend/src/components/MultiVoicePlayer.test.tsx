// React is used implicitly in JSX
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultiVoicePlayer } from './MultiVoicePlayer'
import { Score } from '../modules/sheetMusic/multiVoiceTypes'
import { createMultiVoiceAudioManager } from '../utils/multiVoiceAudioManager'
import { Clef, NoteDuration, TimeSignature } from '../modules/sheetMusic/types'

// Mock the audio manager
jest.mock('../utils/multiVoiceAudioManager', () => ({
  createMultiVoiceAudioManager: jest.fn(),
}))

describe('MultiVoicePlayer', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAudioManager: any
  let testScore: Score

  beforeEach(() => {
    // Create mock audio manager
    mockAudioManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      playScore: jest.fn().mockResolvedValue(undefined),
      playVoice: jest.fn().mockResolvedValue(undefined),
      stopPlayback: jest.fn(),
      isPlaying: jest.fn().mockReturnValue(false),
      muteVoice: jest.fn(),
      unmuteVoice: jest.fn(),
      isVoiceMuted: jest.fn().mockReturnValue(false),
      soloVoice: jest.fn(),
      clearSolo: jest.fn(),
      getSoloedVoice: jest.fn().mockReturnValue(null),
      setVoiceVolume: jest.fn(),
      getVoiceVolume: jest.fn().mockReturnValue(1),
      setPlaybackSpeed: jest.fn(),
      getPlaybackSpeed: jest.fn().mockReturnValue(1),
      dispose: jest.fn(),
    }
    ;(createMultiVoiceAudioManager as jest.Mock).mockReturnValue(
      mockAudioManager
    )

    // Create test score
    testScore = {
      title: 'Test Score',
      composer: 'Test Composer',
      parts: [
        {
          id: 'piano',
          name: 'Piano',
          instrument: 'piano',
          staves: ['treble', 'bass'],
        },
      ],
      measures: [
        {
          number: 1,
          staves: [
            {
              id: 'treble',
              clef: Clef.TREBLE,
              voices: [
                {
                  id: 'rightHand',
                  name: 'Right Hand',
                  notes: [
                    {
                      keys: ['c/4'],
                      duration: NoteDuration.QUARTER,
                      time: 0,
                      voiceId: 'rightHand',
                    },
                  ],
                },
              ],
            },
            {
              id: 'bass',
              clef: Clef.BASS,
              voices: [
                {
                  id: 'leftHand',
                  name: 'Left Hand',
                  notes: [
                    {
                      keys: ['c/3'],
                      duration: NoteDuration.HALF,
                      time: 0,
                      voiceId: 'leftHand',
                    },
                  ],
                },
              ],
            },
          ],
          timeSignature: TimeSignature.FOUR_FOUR,
          tempo: 120,
        },
      ],
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        source: 'test',
        tags: [],
      },
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render player controls', () => {
      render(<MultiVoicePlayer score={testScore} />)

      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    })

    it('should display score title', () => {
      render(<MultiVoicePlayer score={testScore} />)
      expect(screen.getByText('Test Score')).toBeInTheDocument()
    })

    it('should display voice controls for each voice', () => {
      render(<MultiVoicePlayer score={testScore} />)

      expect(screen.getByText('Right Hand')).toBeInTheDocument()
      expect(screen.getByText('Left Hand')).toBeInTheDocument()
    })
  })

  describe('Playback Controls', () => {
    it('should initialize audio on mount', async () => {
      render(<MultiVoicePlayer score={testScore} />)

      await waitFor(() => {
        expect(mockAudioManager.initialize).toHaveBeenCalled()
      })
    })

    it('should play score when play button is clicked', async () => {
      const user = userEvent.setup()
      render(<MultiVoicePlayer score={testScore} />)

      const playButton = screen.getByRole('button', { name: /play/i })
      await user.click(playButton)

      expect(mockAudioManager.playScore).toHaveBeenCalledWith(testScore, 1)
    })

    it('should stop playback when stop button is clicked', async () => {
      const user = userEvent.setup()
      mockAudioManager.isPlaying.mockReturnValue(true)

      render(<MultiVoicePlayer score={testScore} />)

      const stopButton = screen.getByRole('button', { name: /stop/i })
      await user.click(stopButton)

      expect(mockAudioManager.stopPlayback).toHaveBeenCalled()
    })

    it('should toggle play/pause button based on playback state', async () => {
      const _user = userEvent.setup()
      const { rerender } = render(<MultiVoicePlayer score={testScore} />)

      // Initially shows play
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()

      // Click play
      await _user.click(screen.getByRole('button', { name: /play/i }))

      // Mock playing state
      mockAudioManager.isPlaying.mockReturnValue(true)
      rerender(<MultiVoicePlayer score={testScore} />)

      // Should show pause
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    })
  })

  describe('Voice Controls', () => {
    it('should mute voice when mute button is clicked', async () => {
      const user = userEvent.setup()
      render(<MultiVoicePlayer score={testScore} />)

      const muteButton = screen.getAllByRole('button', { name: /mute/i })[0]
      await user.click(muteButton)

      expect(mockAudioManager.muteVoice).toHaveBeenCalledWith('rightHand')
    })

    it('should unmute voice when unmute button is clicked', async () => {
      const user = userEvent.setup()
      mockAudioManager.isVoiceMuted.mockReturnValue(true)

      render(<MultiVoicePlayer score={testScore} />)

      const unmuteButton = screen.getAllByRole('button', { name: /unmute/i })[0]
      await user.click(unmuteButton)

      expect(mockAudioManager.unmuteVoice).toHaveBeenCalledWith('rightHand')
    })

    it('should solo voice when solo button is clicked', async () => {
      const user = userEvent.setup()
      render(<MultiVoicePlayer score={testScore} />)

      const soloButton = screen.getAllByRole('button', { name: /solo/i })[0]
      await user.click(soloButton)

      expect(mockAudioManager.soloVoice).toHaveBeenCalledWith('rightHand')
    })

    it('should clear solo when active solo button is clicked', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<MultiVoicePlayer score={testScore} />)

      // First click to solo
      const soloButton = screen.getAllByRole('button', { name: /solo/i })[0]
      await user.click(soloButton)
      expect(mockAudioManager.soloVoice).toHaveBeenCalledWith('rightHand')

      // Mock that rightHand is now soloed
      mockAudioManager.getSoloedVoice.mockReturnValue('rightHand')
      rerender(<MultiVoicePlayer score={testScore} />)

      // Click again to clear solo
      await user.click(soloButton)
      expect(mockAudioManager.clearSolo).toHaveBeenCalled()
    })

    it('should adjust voice volume with slider', async () => {
      render(<MultiVoicePlayer score={testScore} />)

      const volumeSlider = screen.getAllByRole('slider', { name: /volume/i })[0]
      fireEvent.change(volumeSlider, { target: { value: '0.7' } })

      expect(mockAudioManager.setVoiceVolume).toHaveBeenCalledWith(
        'rightHand',
        0.7
      )
    })
  })

  describe('Playback Speed Control', () => {
    it('should display speed control slider', () => {
      render(<MultiVoicePlayer score={testScore} />)
      expect(screen.getByRole('slider', { name: /speed/i })).toBeInTheDocument()
    })

    it('should adjust playback speed', async () => {
      render(<MultiVoicePlayer score={testScore} />)

      const speedSlider = screen.getByRole('slider', { name: /speed/i })
      fireEvent.change(speedSlider, { target: { value: '1.5' } })

      expect(mockAudioManager.setPlaybackSpeed).toHaveBeenCalledWith(1.5)
    })

    it('should display current speed value', () => {
      render(<MultiVoicePlayer score={testScore} />)
      expect(screen.getByText('1.0x')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MultiVoicePlayer score={testScore} />)

      expect(
        screen.getByRole('region', { name: /multi-voice player/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('group', { name: /playback controls/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('group', { name: /voice controls/i })
      ).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MultiVoicePlayer score={testScore} />)

      // Tab to play button
      await user.tab()
      expect(screen.getByRole('button', { name: /play/i })).toHaveFocus()

      // Space to play
      await user.keyboard(' ')
      expect(mockAudioManager.playScore).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should show error message if audio initialization fails', async () => {
      mockAudioManager.initialize.mockRejectedValue(new Error('Audio failed'))

      render(<MultiVoicePlayer score={testScore} />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Failed to initialize audio'
        )
      })
    })

    it('should disable controls if no score provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<MultiVoicePlayer score={null as any} />)

      expect(screen.getByRole('button', { name: /play/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled()
    })
  })

  describe('Cleanup', () => {
    it('should dispose audio manager on unmount', async () => {
      const { unmount } = render(<MultiVoicePlayer score={testScore} />)

      await waitFor(() => {
        expect(mockAudioManager.initialize).toHaveBeenCalled()
      })

      unmount()

      expect(mockAudioManager.dispose).toHaveBeenCalled()
    })
  })
})
