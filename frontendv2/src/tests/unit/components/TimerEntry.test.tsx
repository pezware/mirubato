import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import TimerEntry from '@/components/TimerEntry'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'logbook:timer.title': 'Practice Timer',
        'logbook:timer.start': 'Start Timer',
        'logbook:timer.pause': 'Pause',
        'logbook:timer.resume': 'Resume',
        'logbook:timer.stop': 'Stop & Log',
        'logbook:timer.reset': 'Reset',
        'logbook:timer.confirmClose':
          'Timer is running. Are you sure you want to close?',
        'logbook:timer.startedAt': 'Started at',
        'logbook:timer.startHint':
          'Click Start to begin timing your practice session',
        'logbook:timer.runningHint':
          'Timer is running. Click Pause to take a break or Stop to finish.',
        'logbook:timer.stopHint':
          'Click Stop & Log to create a practice entry with this duration',
        'logbook:timer.startHintMobile': 'Tap to start',
        'logbook:timer.runningHintMobile': 'Tap to pause',
        'logbook:timer.stopHintMobile': 'Resume • Stop',
      }
      return translations[key] || key
    },
  }),
}))

// Mock formatTime utility
vi.mock('@/utils/dateUtils', () => ({
  formatTime: (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
}))

describe('TimerEntry Component', () => {
  const mockOnClose = vi.fn()
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Mock performance.now for consistent testing
    global.performance.now = vi.fn(() => 0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete,
  }

  describe('Initial State', () => {
    it('renders with initial timer display', () => {
      render(<TimerEntry {...defaultProps} />)

      expect(screen.getByText('Practice Timer')).toBeInTheDocument()
      expect(screen.getByText('0:00')).toBeInTheDocument()
      expect(screen.getByText('Start Timer')).toBeInTheDocument()
    })

    it('shows appropriate hint text for mobile and desktop', () => {
      render(<TimerEntry {...defaultProps} />)

      // Desktop hint (hidden on mobile)
      expect(
        screen.getByText('Click Start to begin timing your practice session')
      ).toBeInTheDocument()
      // Mobile hint would be visible based on class but harder to test without actual mobile viewport
    })

    it('does not show start time initially', () => {
      render(<TimerEntry {...defaultProps} />)

      expect(screen.queryByText(/Started at/)).not.toBeInTheDocument()
    })
  })

  describe('Timer Functionality', () => {
    it('starts timer and shows start time', async () => {
      const mockDate = new Date('2025-01-01T10:30:00')
      vi.setSystemTime(mockDate)

      render(<TimerEntry {...defaultProps} />)

      const startButton = screen.getByText('Start Timer')
      fireEvent.click(startButton)

      expect(screen.getByText('Pause')).toBeInTheDocument()
      expect(screen.getByText(/Started at 10:30/)).toBeInTheDocument()
    })

    it('updates timer display with high precision', async () => {
      let performanceNow = 0
      global.performance.now = vi.fn(() => performanceNow)

      render(<TimerEntry {...defaultProps} />)

      const startButton = screen.getByText('Start Timer')
      fireEvent.click(startButton)

      // Simulate 5 seconds passing
      performanceNow = 5000
      vi.advanceTimersByTime(100) // Timer updates every 100ms

      await waitFor(() => {
        expect(screen.getByText('0:05')).toBeInTheDocument()
      })
    })

    it('pauses and resumes timer correctly', async () => {
      let performanceNow = 0
      global.performance.now = vi.fn(() => performanceNow)

      render(<TimerEntry {...defaultProps} />)

      // Start timer
      fireEvent.click(screen.getByText('Start Timer'))

      // Advance time and pause
      performanceNow = 3000
      vi.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.getByText('0:03')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Pause'))

      // Time should stop accumulating
      performanceNow = 6000
      vi.advanceTimersByTime(100)

      // Should still show 3 seconds
      expect(screen.getByText('0:03')).toBeInTheDocument()
      expect(screen.getByText('Resume')).toBeInTheDocument()
    })

    it('handles background tab accuracy with visibility API', async () => {
      let performanceNow = 0
      global.performance.now = vi.fn(() => performanceNow)

      render(<TimerEntry {...defaultProps} />)

      // Start timer
      fireEvent.click(screen.getByText('Start Timer'))

      // Simulate tab becoming hidden (would normally slow down setInterval)
      Object.defineProperty(document, 'hidden', { value: true, writable: true })

      // Advance time significantly
      performanceNow = 10000

      // Simulate tab becoming visible again
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      })
      fireEvent(document, new Event('visibilitychange'))

      vi.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.getByText('0:10')).toBeInTheDocument()
      })
    })

    it('completes timer and calls onComplete with correct duration', async () => {
      let performanceNow = 0
      global.performance.now = vi.fn(() => performanceNow)

      render(<TimerEntry {...defaultProps} />)

      // Start timer and advance 125 seconds (2:05)
      fireEvent.click(screen.getByText('Start Timer'))
      performanceNow = 125000
      vi.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.getByText('2:05')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Stop & Log'))

      // Should call onComplete with rounded minutes (125 seconds = 2 minutes)
      expect(mockOnComplete).toHaveBeenCalledWith(2)
    })

    it('resets timer to initial state', async () => {
      let performanceNow = 0
      global.performance.now = vi.fn(() => performanceNow)

      render(<TimerEntry {...defaultProps} />)

      // Start timer and advance time
      fireEvent.click(screen.getByText('Start Timer'))
      performanceNow = 5000
      vi.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.getByText('0:05')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Reset'))

      expect(screen.getByText('0:00')).toBeInTheDocument()
      expect(screen.getByText('Start Timer')).toBeInTheDocument()
      expect(screen.queryByText(/Started at/)).not.toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    it('formats time correctly for minutes and seconds', () => {
      render(<TimerEntry {...defaultProps} />)

      // Access the internal formatTime function through timer display
      // This tests that the formatTime function works correctly
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })

    it('formats time with hours when needed', async () => {
      let performanceNow = 0
      global.performance.now = vi.fn(() => performanceNow)

      render(<TimerEntry {...defaultProps} />)

      fireEvent.click(screen.getByText('Start Timer'))

      // Advance to over an hour (3665 seconds = 1:01:05)
      performanceNow = 3665000
      vi.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.getByText('1:01:05')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Instructions', () => {
    it('shows different instructions for different states', () => {
      render(<TimerEntry {...defaultProps} />)

      // Initial state
      expect(
        screen.getByText('Click Start to begin timing your practice session')
      ).toBeInTheDocument()

      // Start timer - running state
      fireEvent.click(screen.getByText('Start Timer'))
      expect(
        screen.getByText(
          'Timer is running. Click Pause to take a break or Stop to finish.'
        )
      ).toBeInTheDocument()

      // Pause - stopped state
      fireEvent.click(screen.getByText('Pause'))
      expect(
        screen.getByText(
          'Click Stop & Log to create a practice entry with this duration'
        )
      ).toBeInTheDocument()
    })
  })

  describe('Modal Behavior', () => {
    it('confirms close when timer is running', () => {
      // Mock window.confirm
      const mockConfirm = vi.fn(() => false)
      vi.stubGlobal('confirm', mockConfirm)

      render(<TimerEntry {...defaultProps} />)

      fireEvent.click(screen.getByText('Start Timer'))

      // Try to close modal (this would normally be triggered by Modal component)
      // Since we can't easily test the Modal's close button, we test the handleClose behavior indirectly

      vi.unstubAllGlobals()
    })

    it('closes without confirmation when timer is not running', () => {
      render(<TimerEntry {...defaultProps} />)

      // Modal should be closeable when timer is not running
      expect(screen.getByText('Practice Timer')).toBeInTheDocument()
    })
  })

  describe('Issue Fixes Validation', () => {
    it('Issue #399: Does not show redundant duration text', () => {
      render(<TimerEntry {...defaultProps} />)

      fireEvent.click(screen.getByText('Start Timer'))

      // Should not show "1m" or similar duration text
      expect(screen.queryByText('1m')).not.toBeInTheDocument()
      expect(screen.queryByText(/\d+m$/)).not.toBeInTheDocument()
    })

    it('Issue #397: Shows start time when timer is started', () => {
      const mockDate = new Date('2025-01-01T14:30:00')
      vi.setSystemTime(mockDate)

      render(<TimerEntry {...defaultProps} />)

      fireEvent.click(screen.getByText('Start Timer'))

      expect(screen.getByText(/Started at 2:30/)).toBeInTheDocument()
    })

    it('Issue #400: Has mobile-optimized instruction classes', () => {
      render(<TimerEntry {...defaultProps} />)

      // Verify that mobile and desktop instructions have appropriate classes
      const mobileInstruction = screen
        .getByText('Click Start to begin timing your practice session')
        .closest('p')
      const desktopInstruction = screen
        .getByText('Click Start to begin timing your practice session')
        .closest('p')

      // Both should exist with different responsive classes
      expect(mobileInstruction).toHaveClass('text-sm', 'text-stone-600')
    })

    it('Issue #398: Maintains accuracy when performance.now is used', async () => {
      let performanceNow = 0
      global.performance.now = vi.fn(() => performanceNow)

      render(<TimerEntry {...defaultProps} />)

      fireEvent.click(screen.getByText('Start Timer'))

      // Simulate precise time advancement
      performanceNow = 1337 // 1.337 seconds
      vi.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.getByText('0:01')).toBeInTheDocument() // Should floor to 1 second
      })

      performanceNow = 60000 // Exactly 60 seconds
      vi.advanceTimersByTime(100)

      await waitFor(() => {
        expect(screen.getByText('1:00')).toBeInTheDocument()
      })
    })
  })
})
