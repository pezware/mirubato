import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UndoCheckInBanner } from '../UndoCheckInBanner'
import type { PlanOccurrence, PracticePlan } from '@/api/planning'

// Mock IntersectionObserver and ResizeObserver for Headless UI Modal
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'reports:planningUncheckIn.recentlyCompleted': 'Session completed',
        'reports:planningUncheckIn.timeRemaining': `Undo available for ${typeof defaultValue === 'object' ? defaultValue.time : '{{time}}'}`,
        'reports:planningUncheckIn.undoButton': 'Undo',
        'reports:planningUncheckIn.confirmTitle': 'Undo Check-In?',
        'reports:planningUncheckIn.confirmMessage': `This will unlink your practice session from "${typeof defaultValue === 'object' ? defaultValue.planTitle : '{{planTitle}}'}".`,
        'reports:planningUncheckIn.confirmNote':
          'Note: Your practice time will remain.',
        'reports:planningUncheckIn.confirmButton': 'Undo Check-In',
        'reports:planningUncheckIn.genericError': 'Unable to undo check-in',
        'common:close': 'Close',
        'common:cancel': 'Cancel',
      }
      return (
        translations[key] ??
        (typeof defaultValue === 'string' ? defaultValue : key)
      )
    },
  }),
}))

// Mock analytics
vi.mock('@/lib/analytics/planning', () => ({
  trackPlanningEvent: vi.fn(),
}))

// Mock planning store
const mockUncheckInOccurrence = vi.fn()
vi.mock('@/stores/planningStore', () => ({
  usePlanningStore: (selector: (state: unknown) => unknown) =>
    selector({
      uncheckInOccurrence: mockUncheckInOccurrence,
    }),
}))

describe('UndoCheckInBanner', () => {
  const mockPlan: PracticePlan = {
    id: 'plan_123',
    title: 'Piano Practice',
    type: 'personal',
    status: 'active',
    schedule: {
      startDate: '2025-11-16',
      timeOfDay: '09:00',
      durationMinutes: 30,
      flexibility: 'sameDay',
    },
    segments: [],
    targets: {
      weeklySessions: 5,
      weeklyMinutes: 150,
    },
    tags: [],
    createdAt: '2025-11-16T08:00:00Z',
    updatedAt: '2025-11-16T08:00:00Z',
  }

  const createRecentOccurrence = (minutesAgo: number): PlanOccurrence => {
    const checkInTime = new Date(
      Date.now() - minutesAgo * 60 * 1000
    ).toISOString()
    return {
      id: 'occ_456',
      planId: 'plan_123',
      scheduledStart: '2025-11-16T09:00:00Z',
      scheduledEnd: '2025-11-16T09:30:00Z',
      status: 'completed',
      segments: [],
      logEntryId: 'entry_789',
      checkIn: {
        recordedAt: checkInTime,
        responses: { 'How was it?': 'Good' },
      },
      createdAt: '2025-11-16T08:00:00Z',
      updatedAt: checkInTime,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders when occurrence is recently completed', () => {
    const mockOccurrence = createRecentOccurrence(5)
    render(<UndoCheckInBanner occurrence={mockOccurrence} plan={mockPlan} />)
    expect(screen.getByText('Session completed')).toBeInTheDocument()
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  it('does not render when occurrence is not completed', () => {
    const scheduledOccurrence = {
      ...createRecentOccurrence(5),
      status: 'scheduled' as const,
    }
    const { container } = render(
      <UndoCheckInBanner occurrence={scheduledOccurrence} plan={mockPlan} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('does not render when check-in is older than 15 minutes', () => {
    const oldOccurrence = createRecentOccurrence(20)
    const { container } = render(
      <UndoCheckInBanner occurrence={oldOccurrence} plan={mockPlan} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('displays remaining time countdown', () => {
    const mockOccurrence = createRecentOccurrence(5)
    render(<UndoCheckInBanner occurrence={mockOccurrence} plan={mockPlan} />)
    expect(screen.getByText(/Undo available for/)).toBeInTheDocument()
  })

  it('opens confirmation modal when undo button is clicked', async () => {
    const mockOccurrence = createRecentOccurrence(5)
    const user = userEvent.setup()
    render(<UndoCheckInBanner occurrence={mockOccurrence} plan={mockPlan} />)

    await user.click(screen.getByText('Undo'))

    await waitFor(() => {
      expect(screen.getByText('Undo Check-In?')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/This will unlink your practice session/)
    ).toBeInTheDocument()
  })

  it('calls uncheckInOccurrence when confirmed', async () => {
    mockUncheckInOccurrence.mockResolvedValue({ success: true })
    const mockOccurrence = createRecentOccurrence(5)
    const user = userEvent.setup()
    const onUndoComplete = vi.fn()

    render(
      <UndoCheckInBanner
        occurrence={mockOccurrence}
        plan={mockPlan}
        onUndoComplete={onUndoComplete}
      />
    )

    await user.click(screen.getByText('Undo'))
    await waitFor(() => {
      expect(screen.getByText('Undo Check-In?')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Undo Check-In' }))

    await waitFor(() => {
      expect(mockUncheckInOccurrence).toHaveBeenCalledWith('occ_456', {
        reason: 'user_initiated',
      })
    })
    expect(onUndoComplete).toHaveBeenCalled()
  })

  it('displays error when undo fails', async () => {
    mockUncheckInOccurrence.mockResolvedValue({
      success: false,
      error: 'Undo window has expired',
    })
    const mockOccurrence = createRecentOccurrence(5)
    const user = userEvent.setup()

    render(<UndoCheckInBanner occurrence={mockOccurrence} plan={mockPlan} />)

    await user.click(screen.getByText('Undo'))
    await waitFor(() => {
      expect(screen.getByText('Undo Check-In?')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Undo Check-In' }))

    await waitFor(() => {
      expect(screen.getByText('Undo window has expired')).toBeInTheDocument()
    })
  })

  it('can be dismissed by clicking close button', async () => {
    const mockOccurrence = createRecentOccurrence(5)
    const user = userEvent.setup()
    render(<UndoCheckInBanner occurrence={mockOccurrence} plan={mockPlan} />)

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Session completed')).not.toBeInTheDocument()
    })
  })

  it('cancels undo when cancel button is clicked in modal', async () => {
    const mockOccurrence = createRecentOccurrence(5)
    const user = userEvent.setup()
    render(<UndoCheckInBanner occurrence={mockOccurrence} plan={mockPlan} />)

    await user.click(screen.getByText('Undo'))
    await waitFor(() => {
      expect(screen.getByText('Undo Check-In?')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Cancel'))

    await waitFor(() => {
      expect(screen.queryByText('Undo Check-In?')).not.toBeInTheDocument()
    })
    // Banner should still be visible
    expect(screen.getByText('Session completed')).toBeInTheDocument()
  })

  it('hides automatically when time expires', () => {
    vi.useFakeTimers()
    const mockOccurrence = createRecentOccurrence(5)
    render(<UndoCheckInBanner occurrence={mockOccurrence} plan={mockPlan} />)
    expect(screen.getByText('Session completed')).toBeInTheDocument()

    // Advance time past the undo window
    act(() => {
      vi.advanceTimersByTime(11 * 60 * 1000) // 11 more minutes = 16 total
    })

    expect(screen.queryByText('Session completed')).not.toBeInTheDocument()
  })
})
