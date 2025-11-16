import { apiClient } from './client'

export type PracticePlanVisibility = 'private' | 'shared' | 'template'
export type PracticePlanStatus = 'draft' | 'active' | 'completed' | 'archived'
export type PracticePlanType = 'bootcamp' | 'course' | 'custom'
export type TemplateVisibility = 'public' | 'private'

export interface PlanPieceRef {
  scoreId?: string
  title?: string
  composer?: string | null
}

export interface TemplateSegmentPreview {
  id?: string
  label?: string
  durationMinutes?: number
  pieceRefs?: PlanPieceRef[]
  techniques?: string[]
  instructions?: string
  tempoTargets?: Record<string, number | string | null>
  metadata?: Record<string, unknown>
}

export interface TemplateWorkloadMetadata {
  sessionMinutes?: number
  segmentsCount?: number
  totalSegmentMinutes?: number
}

export interface TemplatePreviewMetadata {
  segments?: TemplateSegmentPreview[]
  workload?: TemplateWorkloadMetadata
  pieces?: PlanPieceRef[]
  focusAreas?: string[]
  techniques?: string[]
}

export interface PlanTemplateMetadata extends Record<string, unknown> {
  preview?: TemplatePreviewMetadata
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
  sourceTemplateId?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  deletedAt?: string | null
}

export interface TemplateAdoptionCustomization {
  title?: string
  tags?: string[]
  focusAreas?: string[]
  schedule?: Partial<PracticePlanSchedule>
}

export interface PlanTemplate {
  id: string
  authorId: string
  sourcePlanId?: string
  title: string
  description?: string | null
  type: PracticePlanType
  focusAreas?: string[]
  techniques?: string[]
  pieceRefs?: PlanPieceRef[]
  schedule: PracticePlanSchedule
  tags?: string[]
  templateVersion: number
  visibility: TemplateVisibility
  adoptionCount?: number
  metadata?: PlanTemplateMetadata
  publishedAt: string
  createdAt: string
  updatedAt: string
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
  sourceTemplateId: plan.sourceTemplateId ?? null,
  schedule: {
    ...plan.schedule,
    metadata:
      plan.schedule?.metadata && typeof plan.schedule.metadata === 'object'
        ? plan.schedule.metadata
        : {},
  },
  metadata:
    plan.metadata && typeof plan.metadata === 'object' ? plan.metadata : {},
})

const normalizeOccurrence = (occurrence: PlanOccurrence): PlanOccurrence => ({
  ...occurrence,
  flexWindow:
    typeof occurrence.flexWindow === 'string'
      ? occurrence.flexWindow
      : (occurrence.flexWindow ?? null),
  recurrenceKey:
    typeof occurrence.recurrenceKey === 'string'
      ? occurrence.recurrenceKey
      : (occurrence.recurrenceKey ?? undefined),
  segments: Array.isArray(occurrence.segments) ? occurrence.segments : [],
  targets:
    occurrence.targets && typeof occurrence.targets === 'object'
      ? occurrence.targets
      : {},
  reflectionPrompts: Array.isArray(occurrence.reflectionPrompts)
    ? occurrence.reflectionPrompts
    : [],
  checkIn: occurrence.checkIn ?? undefined,
  reminderState: occurrence.reminderState ?? undefined,
  metrics: occurrence.metrics ?? undefined,
})

const normalizeTemplate = (template: PlanTemplate): PlanTemplate => ({
  ...template,
  focusAreas: Array.isArray(template.focusAreas) ? template.focusAreas : [],
  techniques: Array.isArray(template.techniques) ? template.techniques : [],
  pieceRefs: Array.isArray(template.pieceRefs) ? template.pieceRefs : [],
  tags: Array.isArray(template.tags) ? template.tags : [],
  schedule: {
    ...template.schedule,
    metadata:
      template.schedule?.metadata &&
      typeof template.schedule.metadata === 'object'
        ? template.schedule.metadata
        : {},
  },
  metadata:
    template.metadata && typeof template.metadata === 'object'
      ? (template.metadata as PlanTemplateMetadata)
      : {},
  adoptionCount: template.adoptionCount ?? 0,
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

  // Template API methods
  getTemplates: async (filters?: {
    visibility?: TemplateVisibility
    type?: PracticePlanType
    tags?: string[]
  }) => {
    const response = await apiClient.post<{
      planTemplates?: PlanTemplate[]
      syncToken?: string
    }>('/api/sync/pull', {
      types: ['plan_template'],
      since: null,
      filters,
    })

    return {
      templates: (response.data.planTemplates ?? []).map(normalizeTemplate),
      syncToken: response.data.syncToken,
    }
  },

  publishTemplate: async (template: PlanTemplate) => {
    const payloadTemplate = sanitize(template)

    const response = await apiClient.post<{ success: boolean }>(
      '/api/sync/push',
      {
        changes: {
          planTemplates: [payloadTemplate],
        },
      }
    )

    if (!response.data.success) {
      throw new Error('Failed to publish plan template')
    }

    return payloadTemplate
  },

  adoptTemplate: async (
    templateId: string,
    customization?: TemplateAdoptionCustomization
  ) => {
    const response = await apiClient.post<{
      plan: PracticePlan
      occurrences: PlanOccurrence[]
    }>('/api/templates/adopt', {
      templateId,
      customization,
    })

    return {
      plan: normalizePlan(response.data.plan),
      occurrences: response.data.occurrences.map(normalizeOccurrence),
    }
  },
}
