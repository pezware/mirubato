import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { PracticePlan, PlanOccurrence } from '@/api/planning'
import '@/tests/mocks/i18n'

const createEntryMock = vi.fn()
const getOccurrencePrefillDataMock = vi.fn()
const getPrimaryInstrumentMock = vi.fn()
const onCompleteMock = vi.fn()

vi.mock('@/stores/logbookStore', () => ({
  useLogbookStore: (
    selector: (state: { createEntry: typeof createEntryMock }) => unknown
  ) => selector({ createEntry: createEntryMock }),
}))

vi.mock('@/stores/planningStore', () => ({
  usePlanningStore: (
    selector: (state: {
      getOccurrencePrefillData: typeof getOccurrencePrefillDataMock
    }) => unknown
  ) => selector({ getOccurrencePrefillData: getOccurrencePrefillDataMock }),
}))

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    getPrimaryInstrument: getPrimaryInstrumentMock,
  }),
}))

import { PlanCheckInModal } from '../PlanCheckInModal'

describe('PlanCheckInModal', () => {
  beforeEach(() => {
    createEntryMock.mockReset()
    getOccurrencePrefillDataMock.mockReset()
    getPrimaryInstrumentMock.mockReset()
    onCompleteMock.mockReset()

    createEntryMock.mockResolvedValue({
      id: 'entry-123',
      timestamp: new Date().toISOString(),
      duration: 30,
      type: 'practice',
      instrument: 'piano',
      pieces: [],
      techniques: [],
      goalIds: [],
      notes: 'Daily Warmup · Logged from practice plan',
      mood: null,
      tags: [],
      metadata: { source: 'practice_plan' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    getPrimaryInstrumentMock.mockReturnValue('piano')
    onCompleteMock.mockResolvedValue(undefined)

    getOccurrencePrefillDataMock.mockReturnValue({
      planId: 'plan-123',
      occurrenceId: 'occ-123',
      planTitle: 'Daily Warmup',
      scheduledStart: null,
      scheduledEnd: null,
      durationMinutes: 25,
      segments: [],
      reflectionPrompts: ['How did it go?'],
      focusAreas: [],
      techniques: [],
      pieces: [],
      metadata: {
        source: 'practice_plan',
        planId: 'plan-123',
        planOccurrenceId: 'occ-123',
      },
    })
  })

  it('includes reflection responses in the log entry metadata payload', async () => {
    const plan: PracticePlan = {
      id: 'plan-123',
      title: 'Daily Warmup',
      visibility: 'private',
      schedule: {
        type: 'recurring',
        frequency: 'daily',
        durationMinutes: 30,
      },
      segments: [],
      focusAreas: [],
      techniques: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      occurrences: [],
    }

    const occurrence: PlanOccurrence = {
      id: 'occ-123',
      planId: 'plan-123',
      scheduledStart: null,
      scheduledEnd: null,
      segments: [],
      targets: {},
      reflectionPrompts: ['How did it go?'],
      status: 'scheduled',
      metrics: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    render(
      <PlanCheckInModal
        isOpen
        onClose={() => {}}
        plan={plan}
        occurrence={occurrence}
        onComplete={onCompleteMock}
      />
    )

    fireEvent.change(await screen.findByLabelText('How did it go?'), {
      target: { value: 'Felt great' },
    })

    fireEvent.click(screen.getByRole('button', { name: /check off/i }))

    await waitFor(() => {
      expect(createEntryMock).toHaveBeenCalledTimes(1)
      expect(onCompleteMock).toHaveBeenCalledTimes(1)
    })

    const entryPayload = createEntryMock.mock.calls[0][0]
    const metadata = entryPayload?.metadata
    expect(metadata?.reflectionResponses).toEqual([
      { prompt: 'How did it go?', response: 'Felt great' },
    ])

    expect(entryPayload?.notes).toContain('Reflection')
    expect(entryPayload?.notes).toContain('How did it go?: Felt great')

    expect(onCompleteMock).toHaveBeenCalledWith({
      occurrenceId: 'occ-123',
      logEntryId: 'entry-123',
      responses: { 'How did it go?': 'Felt great' },
      metrics: { actualDuration: 30 },
    })
  })
})
beforeAll(() => {
  class MutationObserverMock {
    observe = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
  }

  global.MutationObserver =
    MutationObserverMock as unknown as typeof MutationObserver
})
