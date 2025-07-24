import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DataTableView from '../DataTableView'
import type { EnhancedAnalyticsData } from '@/types/reporting'
import type { LogbookEntry } from '@/api/logbook'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Mock stores
vi.mock('@/stores/reportingStore', () => ({
  useReportingStore: () => ({
    filters: [],
    groupBy: [],
    sortOptions: { field: 'timestamp', direction: 'desc' },
    setFilters: vi.fn(),
    setGroupBy: vi.fn(),
    setSortOptions: vi.fn(),
  }),
}))

vi.mock('@/stores/logbookStore', () => ({
  useLogbookStore: () => ({
    deleteEntry: vi.fn(),
  }),
}))

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock the download behavior
let blobContent: string = ''
const mockClick = vi.fn()

// Override createElement for anchor elements
const originalCreateElement = document.createElement.bind(document)
document.createElement = vi.fn((tagName: string) => {
  const element = originalCreateElement(tagName)
  if (tagName === 'a') {
    element.click = mockClick
  }
  return element
})

describe('DataTableView CSV Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    blobContent = ''
  })

  const mockEntries: LogbookEntry[] = [
    {
      id: '1',
      timestamp: '2025-01-20T10:00:00Z',
      duration: 30 * 60, // duration is in seconds
      type: 'practice' as const,
      instrument: 'piano' as const,
      pieces: [{ title: 'Sonata No. 1', composer: 'Mozart' }],
      techniques: [],
      goalIds: [],
      notes: 'Simple note without special characters',
      tags: [],
    },
    {
      id: '2',
      timestamp: '2025-01-21T10:00:00Z',
      duration: 45 * 60,
      type: 'practice' as const,
      instrument: 'guitar' as const,
      pieces: [{ title: 'Etude', composer: 'Villa-Lobos' }],
      techniques: [],
      goalIds: [],
      notes: 'Note with, comma and "quotes"',
      tags: [],
    },
    {
      id: '3',
      timestamp: '2025-01-22T10:00:00Z',
      duration: 60 * 60,
      type: 'practice' as const,
      instrument: 'piano' as const,
      pieces: [{ title: 'Concerto', composer: 'Bach' }],
      techniques: [],
      goalIds: [],
      notes: 'Multi-line note\nwith line break\nand multiple lines',
      tags: [],
    },
    {
      id: '4',
      timestamp: '2025-01-23T10:00:00Z',
      duration: 25 * 60,
      type: 'practice' as const,
      instrument: 'guitar' as const,
      pieces: [{ title: 'Study', composer: 'Sor' }],
      techniques: [],
      goalIds: [],
      notes: 'Note with\r\nWindows-style\r\nline breaks',
      tags: [],
    },
  ]

  const mockAnalytics: EnhancedAnalyticsData = {
    todayTotal: 120,
    todayCount: 2,
    weekTotal: 600,
    weekCount: 10,
    currentStreak: 5,
    practiceByDay: new Map(),
    uniqueComposers: 4,
    uniquePieces: 4,
    pieceStats: new Map(),
    filteredEntries: mockEntries,
    summaryStats: {
      averageDuration: 40,
      practiceFrequency: 0.8,
      consistencyScore: 0.9,
    },
  }

  it('should render the data table with entries', () => {
    render(<DataTableView analytics={mockAnalytics} />)

    // Check if export button is rendered
    expect(screen.getByTestId('export-csv-button')).toBeInTheDocument()
  })

  it('should export CSV with proper formatting for multi-line notes', async () => {
    // Override Blob constructor to capture content
    const originalBlob = global.Blob
    global.Blob = vi
      .fn()
      .mockImplementation((content: BlobPart[], options?: BlobPropertyBag) => {
        if (content[0] && typeof content[0] === 'string') {
          blobContent = content[0]
        }
        return new originalBlob(content, options)
      })

    render(<DataTableView analytics={mockAnalytics} />)

    // Find and click the export button
    const exportButton = screen.getByTestId('export-csv-button')
    fireEvent.click(exportButton)

    // Verify Blob was created with correct type
    expect(global.Blob).toHaveBeenCalledWith(expect.any(Array), {
      type: 'text/csv;charset=utf-8;',
    })

    // Verify the CSV content
    // Split into lines using Windows-style line endings
    const lines = blobContent.split('\r\n')

    // Check header
    expect(lines[0]).toBe('Date,Duration,Piece,Composer,Instrument,Notes')

    // Check that entries are formatted correctly
    // Line with simple note (no quotes needed)
    expect(lines[1]).toContain('Simple note without special characters')
    expect(lines[1]).not.toContain('"Simple note')

    // Line with comma and quotes (should be quoted and quotes escaped)
    expect(lines[2]).toContain('"Note with, comma and ""quotes"""')

    // Lines with newlines should be quoted and preserve the newlines
    // Find the line that starts with the date for the multi-line entry
    const multiLineEntryIndex = lines.findIndex(line =>
      line.includes('1/22/2025')
    )
    expect(multiLineEntryIndex).toBeGreaterThan(0)

    // The multi-line notes should be properly quoted and preserve newlines
    // Check in the full content since the newlines will cause the row to span multiple array elements
    expect(blobContent).toContain(
      '"Multi-line note\nwith line break\nand multiple lines"'
    )

    // Check Windows-style line breaks are also handled
    const windowsLineEntryIndex = lines.findIndex(line =>
      line.includes('1/23/2025')
    )
    expect(windowsLineEntryIndex).toBeGreaterThan(0)

    // The CSV content will span multiple lines because of the embedded newlines
    // We need to check that the content is properly quoted
    expect(blobContent).toContain('"Note with\r\nWindows-style\r\nline breaks"')

    // Restore original Blob
    global.Blob = originalBlob
  })

  it('should handle empty notes gracefully', () => {
    const analyticsWithEmptyNotes = {
      ...mockAnalytics,
      filteredEntries: [
        {
          ...mockEntries[0],
          notes: '',
        },
      ],
    }

    render(<DataTableView analytics={analyticsWithEmptyNotes} />)

    const exportButton = screen.getByTestId('export-csv-button')
    fireEvent.click(exportButton)

    expect(global.URL.createObjectURL).toHaveBeenCalled()
  })
})
