import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Debug from './Debug'
import { EventBus } from '../modules/core/EventBus'
import { StorageModule } from '../modules/infrastructure/StorageModule'
import { SyncModule } from '../modules/infrastructure/SyncModule'
import { PracticeSessionModule } from '../modules/practice/PracticeSessionModule'
import { PerformanceTrackingModule } from '../modules/performance/PerformanceTrackingModule'
import { ProgressAnalyticsModule } from '../modules/analytics/ProgressAnalyticsModule'
import { endpoints } from '../config/endpoints'

// Mock modules
jest.mock('../modules/core/EventBus')
jest.mock('../modules/infrastructure/StorageModule')
jest.mock('../modules/infrastructure/SyncModule')
jest.mock('../modules/practice/PracticeSessionModule')
jest.mock('../modules/performance/PerformanceTrackingModule')
jest.mock('../modules/analytics/ProgressAnalyticsModule')

// Mock config
jest.mock('../config/env', () => ({
  env: {
    MODE: 'test',
  },
}))

jest.mock('../config/version', () => ({
  version: {
    frontend: 'test-version',
    gitCommit: 'test-commit',
    buildTime: '2024-01-01T00:00:00.000Z',
  },
}))

// Mock fetch
global.fetch = jest.fn()

describe('Debug Page', () => {
  const mockEventBus = {
    name: 'EventBus',
    version: '1.0.0',
    getHealth: jest.fn(() => ({ status: 'green', lastCheck: Date.now() })),
  }

  const mockStorageModule = {
    name: 'StorageModule',
    version: '1.0.0',
    getHealth: jest.fn(() => ({ status: 'green', lastCheck: Date.now() })),
  }

  const mockSyncModule = {
    name: 'SyncModule',
    version: '1.0.0',
    getHealth: jest.fn(() => ({
      status: 'yellow',
      lastCheck: Date.now(),
      message: 'Syncing...',
    })),
  }

  const mockPracticeModule = {
    name: 'PracticeSessionModule',
    version: '1.0.0',
    getHealth: jest.fn(() => ({ status: 'green', lastCheck: Date.now() })),
  }

  const mockPerformanceModule = {
    name: 'PerformanceTrackingModule',
    version: '1.0.0',
    getHealth: jest.fn(() => ({
      status: 'red',
      lastCheck: Date.now(),
      message: 'Error occurred',
    })),
  }

  const mockAnalyticsModule = {
    name: 'ProgressAnalyticsModule',
    version: '1.0.0',
    getHealth: jest.fn(() => ({ status: 'green', lastCheck: Date.now() })),
    initialize: jest.fn(),
    getProgressReport: jest.fn(() => ({
      userId: 'debug-user',
      timeRange: {
        start: Date.now() - 7 * 24 * 60 * 60 * 1000,
        end: Date.now(),
      },
      totalPracticeTime: 7200,
      sessionsCompleted: 5,
      averageAccuracy: 0.85,
      improvementRate: 12.5,
      strengthAreas: ['accuracy', 'consistency'],
      weakAreas: [
        {
          type: 'rhythm',
          accuracy: 0.65,
          occurrences: 10,
          suggestions: ['Practice with metronome'],
        },
      ],
      milestones: [
        {
          id: 'accuracy_80',
          type: 'accuracy',
          achieved: true,
          achievedAt: Date.now(),
          criteria: { type: 'accuracy', target: 0.8 },
        },
      ],
    })),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock EventBus.getInstance with required methods
    ;(EventBus.getInstance as jest.Mock).mockReturnValue({
      ...mockEventBus,
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined),
    })

    // Mock module constructors
    ;(StorageModule as jest.Mock).mockImplementation(() => mockStorageModule)
    ;(SyncModule as jest.Mock).mockImplementation(() => mockSyncModule)
    ;(PracticeSessionModule as jest.Mock).mockImplementation(
      () => mockPracticeModule
    )
    ;(PerformanceTrackingModule as jest.Mock).mockImplementation(
      () => mockPerformanceModule
    )
    ;(ProgressAnalyticsModule as jest.Mock).mockImplementation(
      () => mockAnalyticsModule
    )

    // Mock navigator.storage
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: jest.fn(() =>
          Promise.resolve({
            usage: 1024 * 1024 * 50, // 50MB
            quota: 1024 * 1024 * 1024, // 1GB
          })
        ),
      },
      writable: true,
    })

    // Mock fetch responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'healthy',
              timestamp: Date.now(),
              version: '1.0.0',
              environment: 'test',
            }),
        })
      }
      if (url.includes('/debug/cors')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              origin: 'http://localhost:3000',
              allowedOrigins: ['http://localhost:3000'],
              headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': 'true',
              },
            }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    expect(screen.getByText('Loading debug information...')).toBeInTheDocument()
  })

  it('displays module health status after loading', async () => {
    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Module Health Status')).toBeInTheDocument()
    })

    // Check that all modules are displayed
    expect(screen.getByText('EventBus')).toBeInTheDocument()
    expect(screen.getByText('StorageModule')).toBeInTheDocument()
    expect(screen.getByText('SyncModule')).toBeInTheDocument()
    expect(screen.getByText('PracticeSessionModule')).toBeInTheDocument()
    expect(screen.getByText('PerformanceTrackingModule')).toBeInTheDocument()
    expect(screen.getByText('ProgressAnalyticsModule')).toBeInTheDocument()

    // Check health status messages
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('displays backend health information', async () => {
    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Backend Health')).toBeInTheDocument()
    })

    const backendSection = screen.getByText('Backend Health').closest('section')
    expect(backendSection).toHaveTextContent('healthy')
    expect(backendSection).toHaveTextContent('test')
    expect(backendSection).toHaveTextContent('1.0.0')
  })

  it('displays storage information', async () => {
    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Storage Information')).toBeInTheDocument()
    })

    expect(screen.getByText('50 MB')).toBeInTheDocument()
    expect(screen.getByText('1 GB')).toBeInTheDocument()
    expect(screen.getByText('4.88%')).toBeInTheDocument()
  })

  it('displays analytics preview', async () => {
    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Analytics Preview')).toBeInTheDocument()
    })

    expect(screen.getByText('5')).toBeInTheDocument() // sessions
    expect(screen.getByText('120m')).toBeInTheDocument() // practice time
    expect(screen.getByText('85.0%')).toBeInTheDocument() // accuracy
    expect(screen.getByText('+12.5%')).toBeInTheDocument() // improvement

    // Check weak areas
    expect(screen.getByText(/rhythm - 65.0% accuracy/)).toBeInTheDocument()

    // Check milestones
    expect(screen.getByText(/accuracy - Target: 0.8/)).toBeInTheDocument()
  })

  it('displays CORS debug information', async () => {
    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('CORS Debug')).toBeInTheDocument()
    })

    // Check that CORS info is displayed
    const corsSection = screen.getByText('CORS Debug').closest('section')
    expect(corsSection).toHaveTextContent('http://localhost:3000')
  })

  it('handles backend health fetch failure gracefully', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })

    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('Unable to fetch backend health')
      ).toBeInTheDocument()
    })
  })

  it('handles analytics initialization failure gracefully', async () => {
    mockAnalyticsModule.initialize.mockRejectedValue(new Error('Init failed'))

    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('No analytics data available')
      ).toBeInTheDocument()
    })
  })

  it('displays documentation links', async () => {
    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Documentation')).toBeInTheDocument()
    })

    const docsLink = screen.getByText('View Module Documentation')
    expect(docsLink).toHaveAttribute('href', '/docs')

    const graphqlLink = screen.getByText('GraphQL Playground')
    expect(graphqlLink).toHaveAttribute('href', endpoints.graphql)
    expect(graphqlLink).toHaveAttribute('target', '_blank')
  })

  it('displays environment information', async () => {
    render(
      <MemoryRouter>
        <Debug />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Environment Information')).toBeInTheDocument()
    })

    const envSection = screen
      .getByText('Environment Information')
      .closest('section')
    expect(envSection).toHaveTextContent('API URL:')
    expect(envSection).toHaveTextContent(endpoints.graphql)
  })
})
