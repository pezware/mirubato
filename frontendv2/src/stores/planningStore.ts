import { create } from 'zustand'
import {
  planningApi,
  type PracticePlan,
  type PlanOccurrence,
} from '../api/planning'

interface PlanningState {
  plansMap: Map<string, PracticePlan>
  occurrencesMap: Map<string, PlanOccurrence>
  isLoading: boolean
  error: string | null
  hasLoaded: boolean
  plans: PracticePlan[]
  occurrences: PlanOccurrence[]
  loadPlanningData: () => Promise<void>
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
