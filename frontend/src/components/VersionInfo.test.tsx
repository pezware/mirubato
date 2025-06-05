import { render, screen, waitFor } from '@testing-library/react'
import { VersionInfo } from './VersionInfo'

// Mock fetch globally
global.fetch = jest.fn()

describe('VersionInfo', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to reduce noise
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('fetches and displays version info', async () => {
    const mockVersionData = {
      buildTime: '2023-12-20T10:30:00.000Z',
      commitHash: 'abc123def456',
      branch: 'main',
      shortHash: 'abc123',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVersionData,
    } as Response)

    render(<VersionInfo />)

    await waitFor(() => {
      expect(screen.getByText('abc123 (main)')).toBeInTheDocument()
    })

    expect(screen.getByText(/Built:/)).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith('/version.json')
  })

  it('returns null when version data is not loaded', () => {
    // Mock fetch to never resolve
    mockFetch.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    const { container } = render(<VersionInfo />)
    expect(container.firstChild).toBeNull()
  })

  it('handles fetch error gracefully', async () => {
    const error = new Error('Failed to fetch')
    mockFetch.mockRejectedValueOnce(error)

    const { container } = render(<VersionInfo />)

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load version info:',
        error
      )
    })

    expect(container.firstChild).toBeNull()
  })

  it('has correct styling', async () => {
    const mockVersionData = {
      buildTime: '2023-12-20T10:30:00.000Z',
      commitHash: 'abc123def456',
      branch: 'main',
      shortHash: 'abc123',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVersionData,
    } as Response)

    render(<VersionInfo />)

    await waitFor(() => {
      const container = screen.getByText('abc123 (main)').closest('div.fixed')
      expect(container).toHaveClass('fixed', 'bottom-0', 'right-0', 'p-2')

      const innerDiv = screen.getByText('abc123 (main)').parentElement
      expect(innerDiv).toHaveClass('opacity-30', 'hover:opacity-70')
    })
  })

  it('formats build time correctly', async () => {
    const mockVersionData = {
      buildTime: '2023-12-20T10:30:00.000Z',
      commitHash: 'abc123def456',
      branch: 'main',
      shortHash: 'abc123',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVersionData,
    } as Response)

    render(<VersionInfo />)

    await waitFor(() => {
      const dateElement = screen.getByText(/Built:/)
      expect(dateElement).toBeInTheDocument()
      // Check that it contains a formatted date
      expect(dateElement.textContent).toMatch(/Built: .+/)
    })
  })

  it('displays short hash and branch', async () => {
    const mockVersionData = {
      buildTime: '2023-12-20T10:30:00.000Z',
      commitHash: 'abc123def456789',
      branch: 'feature/test-branch',
      shortHash: 'abc123',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVersionData,
    } as Response)

    render(<VersionInfo />)

    await waitFor(() => {
      expect(
        screen.getByText('abc123 (feature/test-branch)')
      ).toBeInTheDocument()
    })
  })

  it('handles fetch with non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => {
        throw new Error('Not found')
      },
    } as unknown as Response)

    const { container } = render(<VersionInfo />)

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled()
    })

    expect(container.firstChild).toBeNull()
  })

  it('only fetches version info once on mount', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        buildTime: '2023-12-20T10:30:00.000Z',
        commitHash: 'abc123',
        branch: 'main',
        shortHash: 'abc123',
      }),
    } as Response)

    const { rerender } = render(<VersionInfo />)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Rerender should not fetch again
    rerender(<VersionInfo />)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
