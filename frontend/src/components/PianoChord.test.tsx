import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PianoChord from './PianoChord'
import { audioManager } from '../utils/audioManager'

// Mock the audioManager
jest.mock('../utils/audioManager', () => ({
  audioManager: {
    playNote: jest.fn(),
  },
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

// Mock canvas getContext
const mockCanvasContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  ellipse: jest.fn(),
  fillText: jest.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  font: '',
}

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext) as any

describe('PianoChord', () => {
  const mockPlayNote = audioManager.playNote as jest.MockedFunction<
    typeof audioManager.playNote
  >

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders all piano keys', () => {
    render(<PianoChord />)

    // Should render 5 white keys
    const keys = screen.getAllByRole('button')
    expect(keys).toHaveLength(5)

    // Check for specific keys
    expect(
      screen.getByRole('button', { name: /Piano key C4/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Piano key D4/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Piano key E4/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Piano key F4/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Piano key G4/i })
    ).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    const { container } = render(<PianoChord className="custom-class" />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })

  it('renders canvas for musical notation', () => {
    const { container } = render(<PianoChord />)

    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas).toBeInTheDocument()
    expect(canvas.width).toBe(150)
    expect(canvas.height).toBe(80)
  })

  it('displays chord name', () => {
    render(<PianoChord />)

    expect(screen.getByText('C major')).toBeInTheDocument()
  })

  it('plays note when key is clicked', async () => {
    mockPlayNote.mockResolvedValueOnce(undefined)

    render(<PianoChord />)

    const cKey = screen.getByRole('button', { name: /Piano key C4/i })
    fireEvent.click(cKey)

    await waitFor(() => {
      expect(mockPlayNote).toHaveBeenCalledWith('C4', '2n')
      expect(mockPlayNote).toHaveBeenCalledTimes(1)
    })
  })

  it('shows pressed state for clicked key', async () => {
    mockPlayNote.mockResolvedValueOnce(undefined)

    render(<PianoChord />)

    const cKey = screen.getByRole('button', { name: /Piano key C4/i })
    fireEvent.click(cKey)

    // Check for pressed state classes
    expect(cKey).toHaveClass('translate-y-1')
    expect(cKey).toHaveClass('shadow-md')
    expect(cKey).toHaveClass('bg-mirubato-wood-100')

    // Wait for the visual feedback to clear
    await waitFor(
      () => {
        expect(cKey).not.toHaveClass('translate-y-1')
      },
      { timeout: 200 }
    )
  })

  it('can play multiple keys', async () => {
    mockPlayNote.mockResolvedValue(undefined)

    render(<PianoChord />)

    const cKey = screen.getByRole('button', { name: /Piano key C4/i })
    const eKey = screen.getByRole('button', { name: /Piano key E4/i })
    const gKey = screen.getByRole('button', { name: /Piano key G4/i })

    fireEvent.click(cKey)
    fireEvent.click(eKey)
    fireEvent.click(gKey)

    await waitFor(() => {
      expect(mockPlayNote).toHaveBeenCalledWith('C4', '2n')
      expect(mockPlayNote).toHaveBeenCalledWith('E4', '2n')
      expect(mockPlayNote).toHaveBeenCalledWith('G4', '2n')
      expect(mockPlayNote).toHaveBeenCalledTimes(3)
    })
  })

  it('shows success message after first play', async () => {
    mockPlayNote.mockResolvedValueOnce(undefined)

    render(<PianoChord />)

    const cKey = screen.getByRole('button', { name: /Piano key C4/i })
    fireEvent.click(cKey)

    await waitFor(() => {
      expect(
        screen.getByText('Beautiful! Try playing all three notes')
      ).toBeInTheDocument()
    })
  })

  it('handles play error gracefully', async () => {
    const error = new Error('Audio failed')
    mockPlayNote.mockRejectedValueOnce(error)

    render(<PianoChord />)

    const cKey = screen.getByRole('button', { name: /Piano key C4/i })
    fireEvent.click(cKey)

    // Wait a moment for the error to be handled
    await waitFor(() => {
      expect(cKey).toBeInTheDocument()
    })
  })

  it('applies correct styling to first and last keys', () => {
    render(<PianoChord />)

    const keys = screen.getAllByRole('button')

    // First key should have rounded bottom left
    expect(keys[0]).toHaveClass('rounded-bl-md')

    // Last key should have rounded bottom right
    expect(keys[keys.length - 1]).toHaveClass('rounded-br-md')

    // Middle keys should have no left border
    expect(keys[1]).toHaveClass('border-l-0')
    expect(keys[2]).toHaveClass('border-l-0')
    expect(keys[3]).toHaveClass('border-l-0')
    expect(keys[4]).toHaveClass('border-l-0')
  })

  it('initializes canvas drawing on mount', () => {
    const mockGetContext = jest.fn(() => ({
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      ellipse: jest.fn(),
      fillText: jest.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
    }))

    HTMLCanvasElement.prototype.getContext = mockGetContext as any

    render(<PianoChord />)

    expect(mockGetContext).toHaveBeenCalledWith('2d')

    const mockContext = mockGetContext.mock.results[0].value

    // Verify canvas drawing methods were called
    expect(mockContext.clearRect).toHaveBeenCalled()
    expect(mockContext.beginPath).toHaveBeenCalled()
    expect(mockContext.stroke).toHaveBeenCalled()
    expect(mockContext.fill).toHaveBeenCalled()
    expect(mockContext.fillText).toHaveBeenCalledWith('𝄞', 15, 45)
  })

  it('maintains success message across multiple plays', async () => {
    mockPlayNote.mockResolvedValue(undefined)

    render(<PianoChord />)

    // First click
    const cKey = screen.getByRole('button', { name: /Piano key C4/i })
    fireEvent.click(cKey)

    await waitFor(() => {
      expect(
        screen.getByText('Beautiful! Try playing all three notes')
      ).toBeInTheDocument()
    })

    // Second click - message should persist
    const eKey = screen.getByRole('button', { name: /Piano key E4/i })
    fireEvent.click(eKey)

    expect(
      screen.getByText('Beautiful! Try playing all three notes')
    ).toBeInTheDocument()
  })
})
