import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlanReminderCard from '../PlanReminderCard'
import type { PracticePlan, PlanOccurrence } from '@/api/planning'

vi.mock('react-i18next', async () => {
  const actual =
    await vi.importActual<typeof import('@/tests/mocks/i18n')>(
      '@/tests/mocks/i18n'
    )
  return actual.i18nMock
})

const basePlan: PracticePlan = {
  id: 'plan-voice',
  title: 'Vocal Warmup',
  type: 'custom',
  schedule: {
    kind: 'single',
    durationMinutes: 20,
  },
  visibility: 'private',
  status: 'active',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

const baseOccurrence: PlanOccurrence = {
  id: 'occ-1',
  planId: 'plan-voice',
  status: 'scheduled',
  scheduledStart: '2025-01-01T09:00:00.000Z',
  scheduledEnd: '2025-01-01T09:30:00.000Z',
  segments: [],
  targets: {},
  metrics: {},
  reflectionPrompts: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

const buildPlan = (overrides: Partial<PracticePlan> = {}): PracticePlan => ({
  ...basePlan,
  ...overrides,
})

const buildOccurrence = (
  overrides: Partial<PlanOccurrence> = {}
): PlanOccurrence => ({
  ...baseOccurrence,
  ...overrides,
})

describe('PlanReminderCard', () => {
  it('renders Lucide icons that inherit text color for metadata instruments', () => {
    const plan = buildPlan({
      metadata: { instrument: 'voice' },
    })

    render(
      <PlanReminderCard
        plan={plan}
        occurrence={buildOccurrence()}
        status="due"
        fallbackInstrument="piano"
      />
    )

    const icon = screen.getByTestId('instrument-icon')

    expect(icon.getAttribute('class')).toContain('lucide-mic-vocal')
    expect(icon.getAttribute('stroke')).toBe('currentColor')
  })

  it('falls back to the provided instrument when metadata is missing', () => {
    render(
      <PlanReminderCard
        plan={buildPlan({ metadata: undefined })}
        occurrence={buildOccurrence()}
        status="due"
        fallbackInstrument="guitar"
      />
    )

    const icon = screen.getByTestId('instrument-icon')
    expect(icon.getAttribute('class')).toContain('lucide-guitar')
  })

  it('keeps Morandi palette styles on the icon container for contrast', () => {
    render(
      <PlanReminderCard
        plan={buildPlan({ metadata: { instrument: 'piano' } })}
        occurrence={buildOccurrence()}
        status="due"
        fallbackInstrument="piano"
      />
    )

    const iconWrapper = screen.getByTestId('instrument-icon-wrapper')

    expect(iconWrapper.className).toContain('bg-morandi-sage-50')
    expect(iconWrapper.className).toContain('text-morandi-sage-700')
  })
})
