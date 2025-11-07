import { apiClient } from './client'

export type PracticePlanVisibility = 'private' | 'shared' | 'template'
export type PracticePlanStatus = 'draft' | 'active' | 'completed' | 'archived'
export type PracticePlanType = 'bootcamp' | 'course' | 'custom'

export interface PlanPieceRef {
  scoreId?: string
  title?: string
  composer?: string | null
}

export interface PlanSegment {
  id?: string
  label: string
  durationMinutes?: number
  pieceRefs?: PlanPieceRef[]
  techniques?: string[]
  instructions?: string
  tempoTargets?: Record<string, number | string | null>
  metadata?: Record<string, unknown>
}

export interface PlanTargets {
  [metric: string]: number | string | null | number[] | undefined
}

export interface PlanCheckIn {
  recordedAt?: string
  responses?: Record<string, unknown>
}

export interface PracticePlanSchedule {
  kind: 'single' | 'recurring'
  rule?: string
  durationMinutes?: number
  timeOfDay?: string
  flexibility?: 'fixed' | 'same-day' | 'anytime'
  startDate?: string
  endDate?: string | null
  target?: string
  metadata?: Record<string, unknown>
}

export interface PracticePlan {
  id: string
  user_id?: string
  title: string
  description?: string | null
  type: PracticePlanType
  focusAreas?: string[]
  techniques?: string[]
  pieceRefs?: PlanPieceRef[]
  schedule: PracticePlanSchedule
  visibility: PracticePlanVisibility
  status: PracticePlanStatus
  ownerId?: string
  templateVersion?: number
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  deletedAt?: string | null
}

export type PlanOccurrenceStatus =
  | 'scheduled'
  | 'completed'
  | 'skipped'
  | 'expired'

export interface PlanOccurrence {
  id: string
  planId: string
  user_id?: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  flexWindow?: string | null
  recurrenceKey?: string | null
  segments?: PlanSegment[]
  targets?: PlanTargets
  reflectionPrompts?: string[]
  status: PlanOccurrenceStatus
  logEntryId?: string | null
  checkIn?: PlanCheckIn
  notes?: string | null
  reminderState?: Record<string, unknown>
  metrics?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

const normalizePlan = (plan: PracticePlan): PracticePlan => ({
  ...plan,
  focusAreas: Array.isArray(plan.focusAreas) ? plan.focusAreas : [],
  techniques: Array.isArray(plan.techniques) ? plan.techniques : [],
  pieceRefs: Array.isArray(plan.pieceRefs) ? plan.pieceRefs : [],
  tags: Array.isArray(plan.tags) ? plan.tags : [],
  metadata: plan.metadata && typeof plan.metadata === 'object' ? plan.metadata : {},
})

const normalizeOccurrence = (occurrence: PlanOccurrence): PlanOccurrence => ({
  ...occurrence,
  segments: Array.isArray(occurrence.segments) ? occurrence.segments : [],
  targets: occurrence.targets && typeof occurrence.targets === 'object' ? occurrence.targets : {},
  reflectionPrompts: Array.isArray(occurrence.reflectionPrompts) ? occurrence.reflectionPrompts : [],
  checkIn: occurrence.checkIn ?? undefined,
  reminderState: occurrence.reminderState ?? undefined,
  metrics: occurrence.metrics ?? undefined,
})

const sanitize = <T>(value: T): T => {
  // Handle circular references and undefined values
  const seen = new WeakSet()
  const replacer = (_key: string, val: unknown) => {
    if (val !== null && typeof val === 'object') {
      if (seen.has(val)) {
        return undefined // Remove circular references
      }
      seen.add(val)
    }
    return val
  }

  return JSON.parse(JSON.stringify(value, replacer)) as T
}

export const planningApi = {
  getPlanningData: async () => {
    const response = await apiClient.post<{
      practicePlans?: PracticePlan[]
      planOccurrences?: PlanOccurrence[]
      syncToken?: string
    }>('/api/sync/pull', {
      types: ['practice_plan', 'plan_occurrence'],
      since: null,
    })

    return {
      plans: (response.data.practicePlans ?? []).map(normalizePlan),
      occurrences: (response.data.planOccurrences ?? []).map(
        normalizeOccurrence
      ),
      syncToken: response.data.syncToken,
    }
  },

  createPlan: async (plan: PracticePlan, occurrences: PlanOccurrence[]) => {
    const payloadPlan = sanitize(plan)
    const payloadOccurrences = occurrences.map(sanitize)

    const response = await apiClient.post<{ success: boolean }>(
      '/api/sync/push',
      {
        changes: {
          practicePlans: [payloadPlan],
          planOccurrences: payloadOccurrences,
        },
      }
    )

    if (!response.data.success) {
      throw new Error('Failed to create practice plan')
    }

    return {
      plan: payloadPlan,
      occurrences: payloadOccurrences,
    }
  },

  updatePlan: async (plan: PracticePlan, occurrences: PlanOccurrence[]) => {
    const payloadPlan = sanitize(plan)
    const payloadOccurrences = occurrences.map(sanitize)

    const response = await apiClient.post<{ success: boolean }>(
      '/api/sync/push',
      {
        changes: {
          practicePlans: [payloadPlan],
          planOccurrences: payloadOccurrences,
        },
      }
    )

    if (!response.data.success) {
      throw new Error('Failed to update practice plan')
    }

    return {
      plan: payloadPlan,
      occurrences: payloadOccurrences,
    }
  },

  deletePlan: async (plan: PracticePlan, occurrences: PlanOccurrence[]) => {
    const timestamp = new Date().toISOString()
    const payloadPlan = sanitize({
      ...plan,
      deletedAt: timestamp,
    })

    const payloadOccurrences = occurrences.map(occurrence =>
      sanitize({
        ...occurrence,
        deletedAt: timestamp,
      })
    )

    const response = await apiClient.post<{ success: boolean }>(
      '/api/sync/push',
      {
        changes: {
          practicePlans: [payloadPlan],
          planOccurrences: payloadOccurrences,
        },
      }
    )

    if (!response.data.success) {
      throw new Error('Failed to delete practice plan')
    }
  },

  updateOccurrence: async (occurrence: PlanOccurrence) => {
    const payloadOccurrence = sanitize(occurrence)

    const response = await apiClient.post<{ success: boolean }>(
      '/api/sync/push',
      {
        changes: {
          planOccurrences: [payloadOccurrence],
        },
      }
    )

    if (!response.data.success) {
      throw new Error('Failed to update plan occurrence')
    }

    return payloadOccurrence
  },
}
