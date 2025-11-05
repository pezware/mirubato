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
}

const normalizePlan = (plan: PracticePlan): PracticePlan => ({
  ...plan,
  focusAreas: plan.focusAreas ?? [],
  techniques: plan.techniques ?? [],
  pieceRefs: plan.pieceRefs ?? [],
  tags: plan.tags ?? [],
  metadata: plan.metadata ?? {},
})

const normalizeOccurrence = (occurrence: PlanOccurrence): PlanOccurrence => ({
  ...occurrence,
  segments: occurrence.segments ?? [],
  targets: occurrence.targets ?? {},
  reflectionPrompts: occurrence.reflectionPrompts ?? [],
  checkIn: occurrence.checkIn ?? undefined,
  reminderState: occurrence.reminderState ?? undefined,
  metrics: occurrence.metrics ?? undefined,
})

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
}
