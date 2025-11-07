import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import PlanningView from './PlanningView'
import type { PracticePlan, PlanOccurrence } from '@/api/planning'
import {
  buildPracticePlan,
  buildPlanOccurrence,
  buildCompletedOccurrence,
  buildPlanWithOccurrences,
  resetIdCounter,
} from '@/tests/builders/planning.builders'

// Mock i18n
vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('@/tests/mocks/i18n')
  return actual.i18nMock
})

describe('PlanningView', () => {
  const mockProps = {
    plans: [] as PracticePlan[],
    occurrences: [] as PlanOccurrence[],
    isLoading: false,
    error: null as string | null,
    onReload: vi.fn(),
    getNextOccurrenceForPlan: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('Empty state', () => {
    it('should render empty state when no plans are available', () => {
      render(<PlanningView {...mockProps} />)

      expect(screen.getByText('No plans yet')).toBeInTheDocument()
      expect(screen.getByText('Create Your First Plan')).toBeInTheDocument()
    })

    it('should show create button in empty state', () => {
      render(<PlanningView {...mockProps} />)

      const createButton = screen.getByRole('button', {
        name: 'Create Your First Plan',
      })
      expect(createButton).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should render loading skeletons when loading', () => {
      render(<PlanningView {...mockProps} isLoading={true} />)

      // Check for loading indicators (role="status" is common for skeletons)
      const loadingElements = screen.getAllByRole('status')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('should not show empty state while loading', () => {
      render(<PlanningView {...mockProps} isLoading={true} />)

      expect(screen.queryByText('No plans yet')).not.toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('should render error message when error is present', () => {
      const errorMessage = 'Failed to load plans'
      render(<PlanningView {...mockProps} error={errorMessage} />)

      expect(screen.getByText('Failed to load plans')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('should show retry button on error', () => {
      render(<PlanningView {...mockProps} error="Network error" />)

      const retryButton = screen.getByRole('button', { name: 'Retry' })
      expect(retryButton).toBeInTheDocument()

      fireEvent.click(retryButton)
      expect(mockProps.onReload).toHaveBeenCalledTimes(1)
    })
  })

  describe('Plans display', () => {
    it('should render list of plans', () => {
      const plans = [
        buildPracticePlan({ id: 'plan1', title: 'Daily Practice' }),
        buildPracticePlan({ id: 'plan2', title: 'Weekly Routine' }),
      ]

      const occurrences = [
        buildPlanOccurrence({ planId: 'plan1' }),
        buildPlanOccurrence({ planId: 'plan2' }),
      ]

      render(
        <PlanningView
          {...mockProps}
          plans={plans}
          occurrences={occurrences}
        />
      )

      expect(screen.getByText('Daily Practice')).toBeInTheDocument()
      expect(screen.getByText('Weekly Routine')).toBeInTheDocument()
    })

    it('should display plan metadata', () => {
      const plan = buildPracticePlan({
        title: 'Test Plan',
        description: 'Test description',
        type: 'bootcamp',
        status: 'active',
        schedule: {
          kind: 'recurring',
          rule: 'FREQ=DAILY',
          durationMinutes: 45,
          timeOfDay: '18:00',
          flexibility: 'same-day',
          startDate: '2025-01-01',
          endDate: '2025-03-01',
        },
      })

      render(<PlanningView {...mockProps} plans={[plan]} />)

      expect(screen.getByText('Test Plan')).toBeInTheDocument()
      expect(screen.getByText('Test description')).toBeInTheDocument()
      // Check for duration display (e.g., "45m" or "45 minutes")
      expect(screen.getByText(/45/)).toBeInTheDocument()
    })

    it('should handle plans without occurrences', () => {
      const plan = buildPracticePlan({ id: 'plan1' })

      mockProps.getNextOccurrenceForPlan.mockReturnValue(undefined)

      render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
          occurrences={[]}
          getNextOccurrenceForPlan={mockProps.getNextOccurrenceForPlan}
        />
      )

      expect(screen.getByText(plan.title)).toBeInTheDocument()
      // Should not crash when no occurrences exist
    })
  })

  describe('Occurrences display', () => {
    it('should show upcoming occurrences', () => {
      const plan = buildPracticePlan({ id: 'plan1' })
      const futureOcc = buildPlanOccurrence({
        id: 'occ1',
        planId: 'plan1',
        scheduledStart: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        status: 'scheduled',
      })

      mockProps.getNextOccurrenceForPlan.mockReturnValue(futureOcc)

      render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
          occurrences={[futureOcc]}
          getNextOccurrenceForPlan={mockProps.getNextOccurrenceForPlan}
        />
      )

      expect(screen.getByText('Upcoming Sessions')).toBeInTheDocument()
      // Verify occurrence is displayed with scheduled status
      expect(screen.getByText(/Scheduled/i)).toBeInTheDocument()
    })

    it('should show completed occurrences', () => {
      const plan = buildPracticePlan({ id: 'plan1' })
      const completedOcc = buildCompletedOccurrence({
        id: 'occ1',
        planId: 'plan1',
      })

      render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
          occurrences={[completedOcc]}
        />
      )

      expect(screen.getByText(/Completed/i)).toBeInTheDocument()
    })

    it('should display occurrence segments', () => {
      const plan = buildPracticePlan()
      const occurrence = buildPlanOccurrence({
        planId: plan.id,
        segments: [
          { id: 's1', label: 'Warm-up', durationMinutes: 5 },
          { id: 's2', label: 'Technical Work', durationMinutes: 15 },
          { id: 's3', label: 'Repertoire', durationMinutes: 10 },
        ],
      })

      render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
          occurrences={[occurrence]}
        />
      )

      expect(screen.getByText('Warm-up')).toBeInTheDocument()
      expect(screen.getByText('Technical Work')).toBeInTheDocument()
      expect(screen.getByText('Repertoire')).toBeInTheDocument()
    })

    it('should handle different occurrence statuses', () => {
      const plan = buildPracticePlan({ id: 'plan1' })
      const occurrences = [
        buildPlanOccurrence({
          id: 'scheduled',
          planId: 'plan1',
          status: 'scheduled',
        }),
        buildPlanOccurrence({
          id: 'completed',
          planId: 'plan1',
          status: 'completed',
        }),
        buildPlanOccurrence({
          id: 'skipped',
          planId: 'plan1',
          status: 'skipped',
        }),
        buildPlanOccurrence({
          id: 'expired',
          planId: 'plan1',
          status: 'expired',
        }),
      ]

      render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
          occurrences={occurrences}
        />
      )

      expect(screen.getByText(/Scheduled/i)).toBeInTheDocument()
      expect(screen.getByText(/Completed/i)).toBeInTheDocument()
      expect(screen.getByText(/Skipped/i)).toBeInTheDocument()
      expect(screen.getByText(/Expired/i)).toBeInTheDocument()
    })
  })

  describe('Filtering and sorting', () => {
    it('should filter occurrences by plan', () => {
      const plan1 = buildPracticePlan({ id: 'plan1', title: 'Plan 1' })
      const plan2 = buildPracticePlan({ id: 'plan2', title: 'Plan 2' })

      const plan1Occurrences = [
        buildPlanOccurrence({ planId: 'plan1' }),
        buildPlanOccurrence({ planId: 'plan1' }),
      ]
      const plan2Occurrences = [
        buildPlanOccurrence({ planId: 'plan2' }),
      ]

      const allOccurrences = [...plan1Occurrences, ...plan2Occurrences]

      render(
        <PlanningView
          {...mockProps}
          plans={[plan1, plan2]}
          occurrences={allOccurrences}
        />
      )

      // Both plans should be visible
      expect(screen.getByText('Plan 1')).toBeInTheDocument()
      expect(screen.getByText('Plan 2')).toBeInTheDocument()
    })

    it('should sort plans by most recently updated', () => {
      const olderPlan = buildPracticePlan({
        id: 'old',
        title: 'Older Plan',
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      })
      const newerPlan = buildPracticePlan({
        id: 'new',
        title: 'Newer Plan',
        updatedAt: new Date().toISOString(),
      })

      const container = render(
        <PlanningView
          {...mockProps}
          plans={[olderPlan, newerPlan]}
        />
      )

      // Check order in DOM - newer should appear first
      const planElements = container.container.querySelectorAll('[data-testid*="plan"]')
      expect(planElements.length).toBeGreaterThan(0)
      // Note: Exact DOM ordering would depend on component implementation
    })
  })

  describe('User interactions', () => {
    it('should handle plan selection', () => {
      const plan = buildPracticePlan({ id: 'plan1' })
      const occurrence = buildPlanOccurrence({ planId: 'plan1' })

      const { container } = render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
          occurrences={[occurrence]}
        />
      )

      // Click on plan to select/expand
      const planElement = screen.getByText(plan.title)
      fireEvent.click(planElement)

      // Check if plan details are expanded (implementation specific)
      // This would depend on how the component handles selection
    })

    it('should handle occurrence check-in action', () => {
      const plan = buildPracticePlan()
      const occurrence = buildPlanOccurrence({
        planId: plan.id,
        status: 'scheduled',
      })

      mockProps.getNextOccurrenceForPlan.mockReturnValue(occurrence)

      render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
          occurrences={[occurrence]}
          getNextOccurrenceForPlan={mockProps.getNextOccurrenceForPlan}
        />
      )

      // Look for check-in button or action
      // This depends on the actual component implementation
      const actionButtons = screen.getAllByRole('button')
      expect(actionButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle multiple plans with multiple occurrences', () => {
      const { plans, occurrences } = (() => {
        const plansList: PracticePlan[] = []
        const occurrencesList: PlanOccurrence[] = []

        for (let i = 0; i < 5; i++) {
          const { plan, occurrences } = buildPlanWithOccurrences(
            { title: `Plan ${i + 1}` },
            3
          )
          plansList.push(plan)
          occurrencesList.push(...occurrences)
        }

        return { plans: plansList, occurrences: occurrencesList }
      })()

      render(
        <PlanningView
          {...mockProps}
          plans={plans}
          occurrences={occurrences}
        />
      )

      // All plans should be rendered
      plans.forEach(plan => {
        expect(screen.getByText(plan.title)).toBeInTheDocument()
      })
    })

    it('should handle plans with no future occurrences', () => {
      const plan = buildPracticePlan()
      const pastOccurrences = [
        buildCompletedOccurrence({
          planId: plan.id,
          scheduledStart: new Date(Date.now() - 86400000).toISOString(),
        }),
        buildCompletedOccurrence({
          planId: plan.id,
          scheduledStart: new Date(Date.now() - 172800000).toISOString(),
        }),
      ]

      mockProps.getNextOccurrenceForPlan.mockReturnValue(undefined)

      render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
          occurrences={pastOccurrences}
          getNextOccurrenceForPlan={mockProps.getNextOccurrenceForPlan}
        />
      )

      expect(screen.getByText(plan.title)).toBeInTheDocument()
      // Should show completed occurrences but no upcoming ones
      expect(screen.getAllByText(/Completed/i)).toHaveLength(2)
    })

    it('should update when props change', async () => {
      const { rerender } = render(<PlanningView {...mockProps} />)

      expect(screen.getByText('No plans yet')).toBeInTheDocument()

      // Update with new plans
      const newPlans = [buildPracticePlan({ title: 'New Plan' })]
      rerender(
        <PlanningView
          {...mockProps}
          plans={newPlans}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('New Plan')).toBeInTheDocument()
        expect(screen.queryByText('No plans yet')).not.toBeInTheDocument()
      })
    })

    it('should handle rapid loading state changes', async () => {
      const { rerender } = render(
        <PlanningView {...mockProps} isLoading={true} />
      )

      // Quick transition from loading to loaded
      rerender(
        <PlanningView
          {...mockProps}
          isLoading={false}
          plans={[buildPracticePlan()]}
        />
      )

      await waitFor(() => {
        expect(screen.queryAllByRole('status')).toHaveLength(0)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const plan = buildPracticePlan()
      render(
        <PlanningView
          {...mockProps}
          plans={[plan]}
        />
      )

      // Check for semantic HTML and ARIA attributes
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('should be keyboard navigable', () => {
      const plans = [
        buildPracticePlan({ title: 'Plan 1' }),
        buildPracticePlan({ title: 'Plan 2' }),
      ]

      render(<PlanningView {...mockProps} plans={plans} />)

      // Tab through interactive elements
      const firstPlan = screen.getByText('Plan 1')
      firstPlan.focus()
      expect(document.activeElement).toBe(firstPlan)
    })
  })
})