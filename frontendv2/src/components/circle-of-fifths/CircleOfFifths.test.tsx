import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CircleOfFifths } from './index'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'toolbox:circleOfFifths.controls.audio': 'Audio',
        'toolbox:circleOfFifths.controls.on': 'On',
        'toolbox:circleOfFifths.controls.off': 'Off',
        'toolbox:circleOfFifths.controls.enableAudio': 'Enable audio',
        'toolbox:circleOfFifths.controls.disableAudio': 'Disable audio',
        'toolbox:circleOfFifths.controls.volume': 'Volume',
        'toolbox:circleOfFifths.controls.play': 'Play',
        'toolbox:circleOfFifths.controls.stop': 'Stop',
        'toolbox:circleOfFifths.controls.playbackMode': 'Playback Mode',
        'toolbox:circleOfFifths.controls.tempo': 'Tempo',
        'toolbox:circleOfFifths.keyDetails.noSharpsOrFlats':
          'No sharps or flats',
        'toolbox:circleOfFifths.keyDetails.sharp': 'sharp',
        'toolbox:circleOfFifths.keyDetails.flat': 'flat',
        'toolbox:circleOfFifths.keyDetails.keySignature': '{{count}} {{type}}',
        'toolbox:circleOfFifths.keyDetails.keyRelationships':
          'Key Relationships',
        'toolbox:circleOfFifths.keyDetails.relativeMinor': 'Relative Minor',
        'toolbox:circleOfFifths.keyDetails.dominant': 'Dominant (V)',
        'toolbox:circleOfFifths.keyDetails.subdominant': 'Subdominant (IV)',
        'toolbox:circleOfFifths.keyDetails.enharmonic': 'Enharmonic',
        'toolbox:circleOfFifths.keyDetails.scaleNotes': 'Scale Notes',
        'toolbox:circleOfFifths.keyDetails.primaryChords':
          'Primary Chords (I, IV, V)',
        'toolbox:circleOfFifths.keyDetails.commonProgressions':
          'Common Progressions',
        'toolbox:circleOfFifths.keyDetails.characteristics': 'Characteristics',
        'toolbox:circleOfFifths.keyDetails.famousWorks': 'Famous Works',
      }

      let result = translations[key] || key.split('.').pop() || key

      // Handle template replacements
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v))
        })
      }

      return result
    },
  }),
}))

// Mock the audio service
vi.mock('../../services/musicalAudioService', () => ({
  musicalAudioService: {
    initialize: vi.fn(),
    setVolume: vi.fn(),
    playKeyAudio: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  },
}))

describe('CircleOfFifths', () => {
  it('renders the main component with all sections', () => {
    render(<CircleOfFifths />)

    // Check for audio controls - they appear as combined text
    expect(screen.getByText('Audio Off')).toBeInTheDocument()

    // Check for key details panel (default is C Major)
    expect(screen.getByText('C Major')).toBeInTheDocument()

    // Check for piano keyboard legend
    expect(screen.getByText('Root Note')).toBeInTheDocument()
  })

  it('toggles audio on and off', () => {
    render(<CircleOfFifths />)

    // Initially audio should be off
    expect(screen.getByText('Audio Off')).toBeInTheDocument()

    // Click to enable audio
    const audioToggle = screen.getByRole('button', { name: /enable audio/i })
    fireEvent.click(audioToggle)

    expect(screen.getByText('Audio On')).toBeInTheDocument()
  })

  it('shows volume control when audio is enabled', () => {
    render(<CircleOfFifths />)

    // Enable audio
    const audioToggle = screen.getByRole('button', { name: /enable audio/i })
    fireEvent.click(audioToggle)

    // Check for volume control
    expect(screen.getByLabelText(/volume/i)).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows playback mode options when audio is enabled', () => {
    render(<CircleOfFifths />)

    // Enable audio
    const audioToggle = screen.getByRole('button', { name: /enable audio/i })
    fireEvent.click(audioToggle)

    // Check for playback modes - includes colon in the text
    expect(screen.getByText('Playback Mode:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'chord' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'scale' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'arpeggio' })).toBeInTheDocument()
  })

  it('shows tempo control for scale and arpeggio modes', () => {
    render(<CircleOfFifths />)

    // Enable audio
    const audioToggle = screen.getByRole('button', { name: /enable audio/i })
    fireEvent.click(audioToggle)

    // Initially in chord mode, no tempo control
    expect(screen.queryByLabelText(/tempo/i)).not.toBeInTheDocument()

    // Switch to scale mode
    const scaleButton = screen.getByRole('button', { name: 'scale' })
    fireEvent.click(scaleButton)

    // Now tempo control should be visible
    expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument()
    expect(screen.getByText('120 BPM')).toBeInTheDocument()
  })

  it('updates selected key when clicking on the circle', () => {
    render(<CircleOfFifths />)

    // Initially should show C Major
    expect(screen.getByText('C Major')).toBeInTheDocument()
    expect(screen.getByText('No sharps or flats')).toBeInTheDocument()

    // Find the G text element and click its parent path
    const gText = screen.getAllByText('G')[0]
    const gPath = gText.parentElement?.querySelector('path')

    if (gPath) {
      fireEvent.click(gPath)
    }

    // Check that G Major is now displayed in the details panel
    expect(screen.getByText('G Major')).toBeInTheDocument()
    expect(screen.getByText('1 sharp')).toBeInTheDocument()
  })
})
