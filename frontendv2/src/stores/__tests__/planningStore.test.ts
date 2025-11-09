import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  usePlanningStore,
  selectCompletedOccurrences,
  selectDueTodayOccurrences,
  selectUpcomingOccurrences,
  selectNextActionableOccurrence,
} from '../planningStore'
import {
  buildPracticePlan,
  buildPlanOccurrence,
} from '../../tests/builders/planning.builders'

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const resetStore = () => {
  usePlanningStore.setState({
    plansMap: new Map(),
    occurrencesMap: new Map(),
    isLoading: false,
    error: null,
    hasLoaded: false,
    plans: [],
    occurrences: [],
  })
}

describe('planning selectors', () => {
  beforeEach(() => {
    resetStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    resetStore()
  })

  it('includes completed and optimistic pending log occurrences in completed selector', () => {
    const plan = buildPracticePlan({ id: 'plan-completed' })
    const completed = buildPlanOccurrence({
      id: 'occ-complete',
      planId: plan.id,
      status: 'completed',
    })
    const optimistic = buildPlanOccurrence({
      id: 'occ-optimistic',
      planId: plan.id,
      status: 'scheduled',
      metrics: { pendingLog: true },
    })
    const scheduled = buildPlanOccurrence({
      id: 'occ-scheduled',
      planId: plan.id,
      status: 'scheduled',
    })

    const occurrences = [completed, optimistic, scheduled]

    usePlanningStore.setState({
      plansMap: new Map([[plan.id, plan]]),
      occurrencesMap: new Map(occurrences.map(occ => [occ.id, occ])),
      plans: [plan],
      occurrences,
      isLoading: false,
      error: null,
      hasLoaded: true,
    })

    const completedOccurrences = selectCompletedOccurrences(
      usePlanningStore.getState()
    )

    expect(completedOccurrences.map(occ => occ.id)).toEqual([
      'occ-complete',
      'occ-optimistic',
    ])
  })

  it('handles overnight windows and separates due today from upcoming occurrences', () => {
    const now = new Date()
    const startReference = new Date(now)
    startReference.setDate(startReference.getDate() - 1)
    const startDate = toLocalDateString(startReference)
    const endReference = new Date(now)
    endReference.setDate(endReference.getDate() + 7)
    const endDate = toLocalDateString(endReference)

    const plan = buildPracticePlan({
      id: 'plan-overnight',
      schedule: {
        kind: 'recurring',
        rule: 'FREQ=DAILY',
        durationMinutes: 45,
        timeOfDay: '08:00',
        flexibility: 'same-day',
        startDate,
        endDate,
        target: null,
        metadata: {
          recurrence: {
            frequency: 'DAILY',
            interval: 1,
            until: endDate,
          },
        },
      },
    })

    const overnightStart = new Date(now)
    overnightStart.setDate(overnightStart.getDate() - 1)
    overnightStart.setHours(23, 0, 0, 0)
    const overnightEnd = new Date(overnightStart.getTime() + 2 * 60 * 60 * 1000)

    const todaysStart = new Date(now)
    todaysStart.setHours(15, 0, 0, 0)
    const todaysEnd = new Date(todaysStart.getTime() + 45 * 60 * 1000)

    const futureStart = new Date(now)
    futureStart.setDate(futureStart.getDate() + 1)
    futureStart.setHours(9, 0, 0, 0)
    const futureEnd = new Date(futureStart.getTime() + 45 * 60 * 1000)

    const occurrences = [
      buildPlanOccurrence({
        id: 'occ-overnight',
        planId: plan.id,
        status: 'scheduled',
        flexWindow: 'overnight',
        scheduledStart: overnightStart.toISOString(),
        scheduledEnd: overnightEnd.toISOString(),
      }),
      buildPlanOccurrence({
        id: 'occ-today',
        planId: plan.id,
        status: 'scheduled',
        scheduledStart: todaysStart.toISOString(),
        scheduledEnd: todaysEnd.toISOString(),
      }),
      buildPlanOccurrence({
        id: 'occ-future',
        planId: plan.id,
        status: 'scheduled',
        scheduledStart: futureStart.toISOString(),
        scheduledEnd: futureEnd.toISOString(),
      }),
    ]

    usePlanningStore.setState({
      plansMap: new Map([[plan.id, plan]]),
      occurrencesMap: new Map(occurrences.map(occ => [occ.id, occ])),
      plans: [plan],
      occurrences,
      isLoading: false,
      error: null,
      hasLoaded: true,
    })

    const state = usePlanningStore.getState()

    const dueToday = selectDueTodayOccurrences(state)
    const upcoming = selectUpcomingOccurrences(state)
    const nextActionable = selectNextActionableOccurrence(state)

    expect(dueToday.map(occ => occ.id)).toEqual(['occ-overnight', 'occ-today'])
    expect(upcoming.map(occ => occ.id)).toEqual(['occ-future'])
    expect(nextActionable?.id).toBe('occ-today')
  })

  it('filters out occurrences beyond the recurrence window for recurring plans', () => {
    const now = new Date()
    const startDate = toLocalDateString(now)
    const endReference = new Date(now)
    endReference.setDate(endReference.getDate() + 3)
    const endDate = toLocalDateString(endReference)

    const plan = buildPracticePlan({
      id: 'plan-recurring',
      schedule: {
        kind: 'recurring',
        rule: 'FREQ=DAILY',
        durationMinutes: 30,
        timeOfDay: '07:00',
        flexibility: 'same-day',
        startDate,
        endDate,
        target: null,
        metadata: {
          recurrence: {
            frequency: 'DAILY',
            interval: 1,
            until: endDate,
          },
        },
      },
    })

    const insideStart = new Date(now)
    insideStart.setDate(insideStart.getDate() + 2)
    insideStart.setHours(10, 0, 0, 0)
    const insideEnd = new Date(insideStart.getTime() + 30 * 60 * 1000)

    const outsideStart = new Date(now)
    outsideStart.setDate(outsideStart.getDate() + 10)
    outsideStart.setHours(9, 0, 0, 0)
    const outsideEnd = new Date(outsideStart.getTime() + 30 * 60 * 1000)

    const occurrences = [
      buildPlanOccurrence({
        id: 'occ-inside',
        planId: plan.id,
        status: 'scheduled',
        scheduledStart: insideStart.toISOString(),
        scheduledEnd: insideEnd.toISOString(),
      }),
      buildPlanOccurrence({
        id: 'occ-outside',
        planId: plan.id,
        status: 'scheduled',
        scheduledStart: outsideStart.toISOString(),
        scheduledEnd: outsideEnd.toISOString(),
      }),
    ]

    usePlanningStore.setState({
      plansMap: new Map([[plan.id, plan]]),
      occurrencesMap: new Map(occurrences.map(occ => [occ.id, occ])),
      plans: [plan],
      occurrences,
      isLoading: false,
      error: null,
      hasLoaded: true,
    })

    const state = usePlanningStore.getState()
    const upcoming = selectUpcomingOccurrences(state)

    expect(upcoming.map(occ => occ.id)).toEqual(['occ-inside'])
  })
})
