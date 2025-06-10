import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PianoKey from './PianoKey'
// Mock the multiVoiceAudioManager
const mockPlayNote = jest.fn()
const mockDispose = jest.fn()
jest.mock('../utils/multiVoiceAudioManager', () => ({
  createMultiVoiceAudioManager: () => ({
    playNote: mockPlayNote,
    initialize: jest.fn(),
    dispose: mockDispose,
  }),
}))

// Mock the logger
jest.mock('../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

describe('PianoKey', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders piano key with correct attributes', () => {
    render(<PianoKey note="C4" />)

    const button = screen.getByRole('button', { name: /Piano key for C4/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-white')
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(<PianoKey note="C4" className="custom-class" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('plays note when clicked', async () => {
    mockPlayNote.mockResolvedValueOnce(undefined)

    render(<PianoKey note="C4" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockPlayNote).toHaveBeenCalledWith('C4')
      expect(mockPlayNote).toHaveBeenCalledTimes(1)
    })
  })

  it('shows pressed state when clicked', async () => {
    mockPlayNote.mockResolvedValueOnce(undefined)

    render(<PianoKey note="C4" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Check for pressed state classes
    expect(button).toHaveClass('translate-y-1')
    expect(button).toHaveClass('shadow-md')
    expect(button).toHaveClass('bg-mirubato-wood-100')

    // Wait for the visual feedback to clear
    await waitFor(
      () => {
        expect(button).not.toHaveClass('translate-y-1')
      },
      { timeout: 200 }
    )
  })

  it('shows initialization message on first click', async () => {
    mockPlayNote.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<PianoKey note="C4" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(screen.getByText('Initializing audio...')).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.queryByText('Initializing audio...')
      ).not.toBeInTheDocument()
    })
  })

  it('shows success message after first play', async () => {
    mockPlayNote.mockResolvedValueOnce(undefined)

    render(<PianoKey note="C4" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.getByText('Beautiful! You just played a C major chord')
      ).toBeInTheDocument()
    })
  })

  it('handles play error gracefully', async () => {
    const error = new Error('Audio failed')
    mockPlayNote.mockRejectedValueOnce(error)

    render(<PianoKey note="C4" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Should clear initialization state on error
    await waitFor(() => {
      expect(
        screen.queryByText('Initializing audio...')
      ).not.toBeInTheDocument()
    })
  })

  it('adds ring styling after first play', async () => {
    mockPlayNote.mockResolvedValueOnce(undefined)

    render(<PianoKey note="C4" />)

    const button = screen.getByRole('button')

    // Initially no ring
    expect(button).not.toHaveClass('ring-2')

    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toHaveClass('ring-2')
      expect(button).toHaveClass('ring-mirubato-leaf-400/30')
    })
  })

  it('maintains hasPlayed state across multiple clicks', async () => {
    mockPlayNote.mockResolvedValue(undefined)

    render(<PianoKey note="C4" />)

    const button = screen.getByRole('button')

    // First click
    fireEvent.click(button)
    await waitFor(() => {
      expect(
        screen.getByText('Beautiful! You just played a C major chord')
      ).toBeInTheDocument()
    })

    // Second click - message should still be there
    fireEvent.click(button)
    expect(
      screen.getByText('Beautiful! You just played a C major chord')
    ).toBeInTheDocument()

    // Should not show initialization message on second click
    expect(screen.queryByText('Initializing audio...')).not.toBeInTheDocument()
  })
})
