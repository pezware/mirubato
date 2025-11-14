export type PlanningAnalyticsEvent =
  | 'planning.hero.create'
  | 'planning.plan.create'
  | 'planning.plan.edit'
  | 'planning.plan.checkIn'
  | 'planning.plan.reminder.open'
  | 'planning.plan.reminder.checkIn'

export type PlanningAnalyticsPayload = Record<string, unknown>

const emitPlanningEvent = (
  event: PlanningAnalyticsEvent,
  payload: PlanningAnalyticsPayload = {}
) => {
  if (
    typeof window === 'undefined' ||
    typeof window.dispatchEvent !== 'function'
  ) {
    return
  }

  const detail = { event, payload }
  window.dispatchEvent(new CustomEvent('planning-analytics', { detail }))

  if (import.meta.env?.DEV) {
     
    console.debug('[planning-analytics]', event, payload)
  }
}

export const trackPlanningEvent = (
  event: PlanningAnalyticsEvent,
  payload?: PlanningAnalyticsPayload
) => {
  try {
    emitPlanningEvent(event, payload)
  } catch (error) {
    if (import.meta.env?.DEV) {
       
      console.warn('Failed to emit planning analytics event', event, error)
    }
  }
}
