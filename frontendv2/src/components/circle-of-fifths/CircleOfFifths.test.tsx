import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CircleOfFifths } from './index'

// Mock the audio service
vi.mock('../../services/musicalAudioService', () => ({
  musicalAudioService: {
    initialize: vi.fn(),
    setVolume: vi.fn(),
    playKeyAudio: vi.fn(),
    dispose: vi.fn(),
  },
}))

describe('CircleOfFifths', () => {
  it('renders the main component with all sections', () => {
    render(<CircleOfFifths />)

    // Check for controls section
    expect(screen.getByText('Audio Controls')).toBeInTheDocument()

    // Check for SVG visualization
    expect(screen.getByText('Circle of')).toBeInTheDocument()
    expect(screen.getByText('Fifths')).toBeInTheDocument()

    // Check for key details panel (default is C Major)
    expect(screen.getByText('C Major')).toBeInTheDocument()

    // Check for piano keyboard
    expect(screen.getByText('Piano Keyboard')).toBeInTheDocument()
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

    // Check for playback modes
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
