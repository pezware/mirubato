import { create } from 'zustand'
import { nanoid } from 'nanoid'
import {
  planningApi,
  type PracticePlan,
  type PlanOccurrence,
} from '../api/planning'

export interface PlanSegmentDraft {
  label: string
  durationMinutes?: number
  instructions?: string
  techniques?: string[]
}

export interface CreatePlanDraft {
  title: string
  description?: string
  schedule: {
    kind?: 'single' | 'recurring'
    startDate: string
    timeOfDay?: string
    durationMinutes?: number
    flexibility: 'fixed' | 'same-day' | 'anytime'
    endDate?: string | null
  }
  segments: PlanSegmentDraft[]
  reflectionPrompts?: string[]
  focusAreas?: string[]
  techniques?: string[]
  type?: PracticePlan['type']
}

interface PlanningState {
  plansMap: Map<string, PracticePlan>
  occurrencesMap: Map<string, PlanOccurrence>
  isLoading: boolean
  error: string | null
  hasLoaded: boolean
  plans: PracticePlan[]
  occurrences: PlanOccurrence[]
  loadPlanningData: () => Promise<void>
  createPlan: (draft: CreatePlanDraft) => Promise<{
    plan: PracticePlan
    occurrence: PlanOccurrence
  }>
  getOccurrencesForPlan: (planId: string) => PlanOccurrence[]
  getNextOccurrenceForPlan: (planId: string) => PlanOccurrence | undefined
}

const PLANS_STORAGE_KEY = 'mirubato:planning:plans'
const OCCURRENCES_STORAGE_KEY = 'mirubato:planning:occurrences'

const readFromStorage = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn(`[Planning] Failed to read ${key} from storage`, error)
    return []
  }
}

const writeToStorage = (key: string, value: unknown[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`[Planning] Failed to persist ${key}`, error)
  }
}

const toSortedPlans = (plansMap: Map<string, PracticePlan>): PracticePlan[] => {
  return Array.from(plansMap.values()).sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

const toSortedOccurrences = (
  occurrencesMap: Map<string, PlanOccurrence>
): PlanOccurrence[] => {
  return Array.from(occurrencesMap.values()).sort((a, b) => {
    const aTime = a.scheduledStart
      ? new Date(a.scheduledStart).getTime()
      : Number.MAX_SAFE_INTEGER
    const bTime = b.scheduledStart
      ? new Date(b.scheduledStart).getTime()
      : Number.MAX_SAFE_INTEGER
    return aTime - bTime
  })
}

const combineDateAndTime = (date: string, time?: string): string | null => {
  if (!date) return null
  const safeTime = time && time.trim() ? time.trim() : '00:00'
  const normalizedTime = safeTime.length === 5 ? `${safeTime}:00` : safeTime
  const iso = new Date(`${date}T${normalizedTime}`)
  if (Number.isNaN(iso.getTime())) {
    return null
  }
  return iso.toISOString()
}

const addMinutes = (iso: string, minutes?: number): string | undefined => {
  if (!iso || !minutes || Number.isNaN(minutes)) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

const sanitizeForStorage = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  plansMap: new Map(),
  occurrencesMap: new Map(),
  isLoading: false,
  error: null,
  hasLoaded: false,
  plans: [],
  occurrences: [],

  loadPlanningData: async () => {
    const { hasLoaded, plansMap, occurrencesMap } = get()
    // Bootstrap from storage on first load
    if (!hasLoaded && plansMap.size === 0 && occurrencesMap.size === 0) {
      const cachedPlans = readFromStorage<PracticePlan>(PLANS_STORAGE_KEY)
      const cachedOccurrences = readFromStorage<PlanOccurrence>(
        OCCURRENCES_STORAGE_KEY
      )

      if (cachedPlans.length > 0 || cachedOccurrences.length > 0) {
        const cachedPlansMap = new Map(cachedPlans.map(plan => [plan.id, plan]))
        const cachedOccurrencesMap = new Map(
          cachedOccurrences.map(occurrence => [occurrence.id, occurrence])
        )

        set({
          plansMap: cachedPlansMap,
          occurrencesMap: cachedOccurrencesMap,
          plans: toSortedPlans(cachedPlansMap),
          occurrences: toSortedOccurrences(cachedOccurrencesMap),
          hasLoaded: true,
        })
      }
    }

    set({ isLoading: true, error: null })

    try {
      const { plans, occurrences } = await planningApi.getPlanningData()

      const plansMap = new Map(plans.map(plan => [plan.id, plan]))
      const occurrencesMap = new Map(
        occurrences.map(occurrence => [occurrence.id, occurrence])
      )

      writeToStorage(PLANS_STORAGE_KEY, plans)
      writeToStorage(OCCURRENCES_STORAGE_KEY, occurrences)

      set({
        plansMap,
        occurrencesMap,
        plans: toSortedPlans(plansMap),
        occurrences: toSortedOccurrences(occurrencesMap),
        isLoading: false,
        hasLoaded: true,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load practice plans'
      set({
        error: message,
        isLoading: false,
        hasLoaded: true,
      })
    }
  },

  createPlan: async draft => {
    const { plansMap, occurrencesMap } = get()

    const nowIso = new Date().toISOString()
    const planId = `plan_${nanoid()}`
    const occurrenceId = `plan_occ_${nanoid()}`

    const scheduledStart = combineDateAndTime(
      draft.schedule.startDate,
      draft.schedule.timeOfDay
    )

    if (!scheduledStart) {
      throw new Error('Invalid schedule')
    }

    const durationMinutes = draft.schedule.durationMinutes
    const scheduledEnd = addMinutes(scheduledStart, durationMinutes)

    const cleanSegments = draft.segments
      .map(segment => ({
        label: segment.label.trim(),
        durationMinutes:
          segment.durationMinutes && segment.durationMinutes > 0
            ? Math.round(segment.durationMinutes)
            : undefined,
        instructions: segment.instructions?.trim() || undefined,
        techniques: segment.techniques
          ?.map(tech => tech.trim())
          .filter(Boolean),
      }))
      .filter(segment => segment.label.length > 0)
      .map((segment, index) => ({
        id: `${occurrenceId}_segment_${index + 1}`,
        ...segment,
      }))

    if (cleanSegments.length === 0) {
      throw new Error('At least one segment is required')
    }

    const reflectionPrompts = draft.reflectionPrompts
      ?.map(prompt => prompt.trim())
      .filter(Boolean)
      .slice(0, 10)

    const focusAreas = draft.focusAreas
      ?.map(area => area.trim())
      .filter(Boolean)

    const planTechniques = draft.techniques
      ?.map(tech => tech.trim())
      .filter(Boolean)

    const scheduleKind = draft.schedule.kind ?? 'single'

    const plan: PracticePlan = {
      id: planId,
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      type: draft.type ?? 'custom',
      focusAreas: focusAreas && focusAreas.length > 0 ? focusAreas : [],
      techniques:
        planTechniques && planTechniques.length > 0 ? planTechniques : [],
      pieceRefs: [],
      schedule: {
        kind: scheduleKind,
        durationMinutes:
          durationMinutes && durationMinutes > 0
            ? Math.round(durationMinutes)
            : undefined,
        timeOfDay: draft.schedule.timeOfDay,
        flexibility: draft.schedule.flexibility,
        startDate: draft.schedule.startDate,
        endDate: draft.schedule.endDate ?? null,
        target: scheduleKind === 'single' ? scheduledStart : undefined,
        metadata: {
          segmentsCount: cleanSegments.length,
        },
      },
      visibility: 'private',
      status: 'active',
      ownerId: undefined,
      templateVersion: undefined,
      tags: [],
      metadata: {},
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
    }

    const occurrence: PlanOccurrence = {
      id: occurrenceId,
      planId,
      scheduledStart,
      scheduledEnd,
      flexWindow: draft.schedule.flexibility,
      recurrenceKey: scheduleKind === 'recurring' ? scheduledStart : undefined,
      segments: cleanSegments,
      targets: {},
      reflectionPrompts,
      status: 'scheduled',
      logEntryId: null,
      checkIn: undefined,
      notes: null,
      reminderState: undefined,
      metrics: {},
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const sanitizedPlan = sanitizeForStorage(plan)
    const sanitizedOccurrences = [sanitizeForStorage(occurrence)]

    try {
      await planningApi.createPlan(sanitizedPlan, sanitizedOccurrences)

      const nextPlansMap = new Map(plansMap)
      const nextOccurrencesMap = new Map(occurrencesMap)

      nextPlansMap.set(sanitizedPlan.id, sanitizedPlan)
      sanitizedOccurrences.forEach(occ => {
        nextOccurrencesMap.set(occ.id, occ)
      })

      const nextPlansList = toSortedPlans(nextPlansMap)
      const nextOccurrencesList = toSortedOccurrences(nextOccurrencesMap)

      writeToStorage(PLANS_STORAGE_KEY, nextPlansList)
      writeToStorage(OCCURRENCES_STORAGE_KEY, nextOccurrencesList)

      set({
        plansMap: nextPlansMap,
        occurrencesMap: nextOccurrencesMap,
        plans: nextPlansList,
        occurrences: nextOccurrencesList,
        hasLoaded: true,
        error: null,
      })

      return {
        plan: sanitizedPlan,
        occurrence: sanitizedOccurrences[0],
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create practice plan'
      console.error('[Planning] Failed to create plan:', error)
      throw error instanceof Error ? error : new Error(message)
    }
  },

  getOccurrencesForPlan: (planId: string) => {
    const { occurrencesMap } = get()
    return toSortedOccurrences(occurrencesMap).filter(
      occurrence => occurrence.planId === planId
    )
  },

  getNextOccurrenceForPlan: (planId: string) => {
    const { occurrencesMap } = get()
    const now = Date.now()

    return toSortedOccurrences(occurrencesMap).find(occurrence => {
      if (occurrence.planId !== planId) {
        return false
      }
      if (!occurrence.scheduledStart) {
        return true
      }
      return new Date(occurrence.scheduledStart).getTime() >= now
    })
  },
}))
