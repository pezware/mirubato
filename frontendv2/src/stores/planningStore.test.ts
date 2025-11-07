import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { usePlanningStore, type CreatePlanDraft } from './planningStore'
import { planningApi } from '../api/planning'
import {
  buildPracticePlan,
  buildPlanOccurrence,
  buildCreatePlanDraft,
  buildPlanWithOccurrences,
  resetIdCounter,
} from '../tests/builders/planning.builders'

// Mock the planningApi
vi.mock('../api/planning', () => ({
  planningApi: {
    getPlanningData: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    updateOccurrence: vi.fn(),
  },
}))

// Mock nanoid to return predictable IDs for testing
// Note: Used by planningStore internally for ID generation
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id-123'),
}))

describe('usePlanningStore', () => {
  let localStorageData: Record<string, string> = {}
  const PLANS_KEY = 'mirubato:planning:plans'
  const OCCURRENCES_KEY = 'mirubato:planning:occurrences'

  beforeEach(() => {
    // Reset the store to initial state
    usePlanningStore.setState({
      plansMap: new Map(),
      occurrencesMap: new Map(),
      isLoading: false,
      error: null,
      hasLoaded: false,
      plans: [],
      occurrences: [],
    })

    // Clear localStorage data
    localStorageData = {}

    // Setup localStorage mock
    const localStorageMock = global.localStorage as unknown as {
      getItem: ReturnType<typeof vi.fn>
      setItem: ReturnType<typeof vi.fn>
      removeItem: ReturnType<typeof vi.fn>
      clear: ReturnType<typeof vi.fn>
    }

    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
    localStorageMock.removeItem.mockReset()
    localStorageMock.clear.mockReset()

    localStorageMock.getItem.mockImplementation(
      (key: string) => localStorageData[key] || null
    )
    localStorageMock.setItem.mockImplementation(
      (key: string, value: string) => {
        localStorageData[key] = value
      }
    )
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete localStorageData[key]
    })
    localStorageMock.clear.mockImplementation(() => {
      localStorageData = {}
    })

    // Clear all mocks
    vi.clearAllMocks()
    resetIdCounter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = usePlanningStore.getState()
      expect(state.plansMap.size).toBe(0)
      expect(state.occurrencesMap.size).toBe(0)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.hasLoaded).toBe(false)
      expect(state.plans).toEqual([])
      expect(state.occurrences).toEqual([])
    })
  })

  describe('loadPlanningData', () => {
    it('should load data from localStorage on first load', async () => {
      const mockPlan = buildPracticePlan({ id: 'plan1' })
      const mockOccurrence = buildPlanOccurrence({
        id: 'occ1',
        planId: 'plan1',
      })

      localStorageData[PLANS_KEY] = JSON.stringify([mockPlan])
      localStorageData[OCCURRENCES_KEY] = JSON.stringify([mockOccurrence])

      // Mock API to return the same data from localStorage
      vi.mocked(planningApi.getPlanningData).mockResolvedValue({
        plans: [mockPlan],
        occurrences: [mockOccurrence],
        syncToken: undefined,
      })

      await act(async () => {
        await usePlanningStore.getState().loadPlanningData()
      })

      const state = usePlanningStore.getState()
      expect(state.plansMap.size).toBe(1)
      expect(state.plansMap.get('plan1')).toEqual(mockPlan)
      expect(state.occurrencesMap.size).toBe(1)
      expect(state.occurrencesMap.get('occ1')).toEqual(mockOccurrence)
      expect(state.hasLoaded).toBe(true)
    })

    it('should fetch data from API and update store', async () => {
      const mockData = buildPlanWithOccurrences()

      vi.mocked(planningApi.getPlanningData).mockResolvedValue({
        plans: [mockData.plan],
        occurrences: mockData.occurrences,
        syncToken: 'sync-token-123',
      })

      await act(async () => {
        await usePlanningStore.getState().loadPlanningData()
      })

      const state = usePlanningStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.hasLoaded).toBe(true)
      expect(state.plans).toHaveLength(1)
      expect(state.plans[0].title).toBe(mockData.plan.title)
      expect(state.occurrences).toHaveLength(mockData.occurrences.length)

      // Check localStorage was updated
      const storedPlans = JSON.parse(localStorageData[PLANS_KEY] || '[]')
      expect(storedPlans).toHaveLength(1)
    })

    it('should handle API errors gracefully', async () => {
      const error = new Error('Failed to fetch')
      vi.mocked(planningApi.getPlanningData).mockRejectedValue(error)

      await act(async () => {
        await usePlanningStore.getState().loadPlanningData()
      })

      const state = usePlanningStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Failed to fetch')
      expect(state.hasLoaded).toBe(true)
    })

    it('should not reload if already loaded', async () => {
      // Set hasLoaded to true
      usePlanningStore.setState({ hasLoaded: true })

      const apiSpy = vi.mocked(planningApi.getPlanningData)

      await act(async () => {
        await usePlanningStore.getState().loadPlanningData()
      })

      // API should still be called (for refresh)
      expect(apiSpy).toHaveBeenCalled()
    })

    it('should handle localStorage parse errors', async () => {
      localStorageData[PLANS_KEY] = 'invalid json'

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      vi.mocked(planningApi.getPlanningData).mockResolvedValue({
        plans: [],
        occurrences: [],
      })

      await act(async () => {
        await usePlanningStore.getState().loadPlanningData()
      })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Planning] Failed to read'),
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('createPlan', () => {
    it('should create a new plan with single occurrence', async () => {
      const draft = buildCreatePlanDraft({
        title: 'New Practice Plan',
        schedule: {
          kind: 'single',
          startDate: '2025-01-15',
          timeOfDay: '18:00',
          durationMinutes: 30,
          flexibility: 'same-day',
        },
        segments: [
          { label: 'Warm-up', durationMinutes: 10 },
          { label: 'Main', durationMinutes: 20 },
        ],
        reflectionPrompts: ['How did it go?'],
      })

      vi.mocked(planningApi.createPlan).mockImplementation(
        async (plan, occurrences) => ({
          plan,
          occurrences,
        })
      )

      const result = await act(async () => {
        return await usePlanningStore.getState().createPlan(draft)
      })

      expect(result.plan.id).toBe('plan_test-id-123')
      expect(result.plan.title).toBe('New Practice Plan')
      expect(result.plan.schedule.kind).toBe('single')
      expect(result.plan.schedule.durationMinutes).toBe(30)

      expect(result.occurrence.id).toBe('plan_occ_test-id-123')
      expect(result.occurrence.planId).toBe('plan_test-id-123')
      expect(result.occurrence.segments).toHaveLength(2)
      expect(result.occurrence.reflectionPrompts).toEqual(['How did it go?'])
      expect(result.occurrence.status).toBe('scheduled')

      // Check store was updated
      const state = usePlanningStore.getState()
      expect(state.plansMap.has('plan_test-id-123')).toBe(true)
      expect(state.occurrencesMap.has('plan_occ_test-id-123')).toBe(true)
    })

    it('should handle segment validation and cleanup', async () => {
      const draft = buildCreatePlanDraft({
        segments: [
          {
            label: '  Warm-up  ',
            durationMinutes: 10,
            techniques: ['  scales  ', ''],
          },
          { label: '', durationMinutes: 5 }, // Should be filtered out
          { label: 'Main', durationMinutes: 0 }, // Duration should be undefined
        ],
      })

      vi.mocked(planningApi.createPlan).mockImplementation(
        async (plan, occurrences) => ({
          plan,
          occurrences,
        })
      )

      const result = await act(async () => {
        return await usePlanningStore.getState().createPlan(draft)
      })

      // Check segments were cleaned properly
      expect(result.occurrence.segments).toHaveLength(2)
      expect(result.occurrence.segments![0].label).toBe('Warm-up')
      expect(result.occurrence.segments![0].techniques).toEqual(['scales'])
      expect(result.occurrence.segments![1].label).toBe('Main')
      expect(result.occurrence.segments![1].durationMinutes).toBeUndefined()
    })

    it('should calculate total duration from segments if not provided', async () => {
      const draft = buildCreatePlanDraft({
        schedule: {
          startDate: '2025-01-15',
          flexibility: 'same-day',
          // No durationMinutes provided
        },
        segments: [
          { label: 'Segment 1', durationMinutes: 15 },
          { label: 'Segment 2', durationMinutes: 25 },
        ],
      })

      vi.mocked(planningApi.createPlan).mockImplementation(
        async (plan, occurrences) => ({
          plan,
          occurrences,
        })
      )

      const result = await act(async () => {
        return await usePlanningStore.getState().createPlan(draft)
      })

      // Should calculate total from segments
      expect(result.plan.schedule.durationMinutes).toBe(40)
    })

    it('should throw error for invalid schedule', async () => {
      const draft = buildCreatePlanDraft({
        schedule: {
          startDate: 'invalid-date',
          timeOfDay: 'invalid-time',
          flexibility: 'same-day',
        },
      })

      await expect(
        act(async () => {
          await usePlanningStore.getState().createPlan(draft)
        })
      ).rejects.toThrow('Invalid schedule')
    })

    it('should throw error if no segments provided', async () => {
      const draft = buildCreatePlanDraft({
        segments: [], // Empty segments
      })

      await expect(
        act(async () => {
          await usePlanningStore.getState().createPlan(draft)
        })
      ).rejects.toThrow('At least one segment is required')
    })

    it('should handle API failure during creation', async () => {
      const draft = buildCreatePlanDraft()

      vi.mocked(planningApi.createPlan).mockRejectedValue(
        new Error('API Error')
      )

      await expect(
        act(async () => {
          await usePlanningStore.getState().createPlan(draft)
        })
      ).rejects.toThrow('API Error')

      // Store should not be updated
      const state = usePlanningStore.getState()
      expect(state.plansMap.size).toBe(0)
    })

    it('should limit reflection prompts to 10', async () => {
      const manyPrompts = Array.from(
        { length: 20 },
        (_, i) => `Prompt ${i + 1}`
      )
      const draft = buildCreatePlanDraft({
        reflectionPrompts: manyPrompts,
      })

      vi.mocked(planningApi.createPlan).mockImplementation(
        async (plan, occurrences) => ({
          plan,
          occurrences,
        })
      )

      const result = await act(async () => {
        return await usePlanningStore.getState().createPlan(draft)
      })

      expect(result.occurrence.reflectionPrompts).toHaveLength(10)
    })
  })

  describe('updatePlan', () => {
    it('should update existing plan and occurrence', async () => {
      const existingPlan = buildPracticePlan({ id: 'plan1' })
      const existingOccurrence = buildPlanOccurrence({
        id: 'occ1',
        planId: 'plan1',
      })

      // Pre-populate store
      const plansMap = new Map([[existingPlan.id, existingPlan]])
      const occurrencesMap = new Map([
        [existingOccurrence.id, existingOccurrence],
      ])
      usePlanningStore.setState({
        plansMap,
        occurrencesMap,
        plans: [existingPlan],
        occurrences: [existingOccurrence],
      })

      const draft: CreatePlanDraft = {
        ...buildCreatePlanDraft(),
        planId: 'plan1',
        occurrenceId: 'occ1',
        title: 'Updated Plan Title',
      }

      vi.mocked(planningApi.updatePlan).mockImplementation(
        async (plan, occurrences) => ({
          plan,
          occurrences,
        })
      )

      const result = await act(async () => {
        return await usePlanningStore.getState().updatePlan(draft)
      })

      expect(result.plan.title).toBe('Updated Plan Title')
      expect(result.plan.id).toBe('plan1')

      // Check store was updated
      const state = usePlanningStore.getState()
      expect(state.plansMap.get('plan1')?.title).toBe('Updated Plan Title')
    })

    it('should throw error if plan not found', async () => {
      const draft: CreatePlanDraft = {
        ...buildCreatePlanDraft(),
        planId: 'non-existent',
        occurrenceId: 'also-non-existent',
      }

      await expect(
        act(async () => {
          await usePlanningStore.getState().updatePlan(draft)
        })
      ).rejects.toThrow('Plan not found')
    })

    it('should throw error if identifiers missing', async () => {
      const draft = buildCreatePlanDraft()
      // No planId or occurrenceId

      await expect(
        act(async () => {
          await usePlanningStore.getState().updatePlan(draft)
        })
      ).rejects.toThrow('Missing plan identifiers')
    })
  })

  describe('deletePlan', () => {
    it('should delete plan and related occurrences', async () => {
      const { plan, occurrences } = buildPlanWithOccurrences()

      // Pre-populate store
      const plansMap = new Map([[plan.id, plan]])
      const occurrencesMap = new Map(occurrences.map(o => [o.id, o]))
      usePlanningStore.setState({
        plansMap,
        occurrencesMap,
        plans: [plan],
        occurrences,
      })

      vi.mocked(planningApi.deletePlan).mockResolvedValue(undefined)

      await act(async () => {
        await usePlanningStore.getState().deletePlan(plan.id)
      })

      const state = usePlanningStore.getState()
      expect(state.plansMap.has(plan.id)).toBe(false)
      occurrences.forEach(occ => {
        expect(state.occurrencesMap.has(occ.id)).toBe(false)
      })

      // Check API was called with plan and occurrences
      expect(planningApi.deletePlan).toHaveBeenCalledWith(plan, occurrences)
    })

    it('should handle deletion of non-existent plan gracefully', async () => {
      await act(async () => {
        await usePlanningStore.getState().deletePlan('non-existent')
      })

      // Should not throw, just return early
      expect(planningApi.deletePlan).not.toHaveBeenCalled()
    })

    it('should handle API failure during deletion', async () => {
      const plan = buildPracticePlan({ id: 'plan1' })
      const plansMap = new Map([[plan.id, plan]])
      usePlanningStore.setState({ plansMap, plans: [plan] })

      vi.mocked(planningApi.deletePlan).mockRejectedValue(
        new Error('Delete failed')
      )

      await expect(
        act(async () => {
          await usePlanningStore.getState().deletePlan('plan1')
        })
      ).rejects.toThrow('Delete failed')

      // Plan should still be in store after failed deletion
      const state = usePlanningStore.getState()
      expect(state.plansMap.has('plan1')).toBe(true)
    })
  })

  describe('completeOccurrence', () => {
    it('should complete occurrence and update status', async () => {
      const plan = buildPracticePlan({ id: 'plan1' })
      const occurrence = buildPlanOccurrence({
        id: 'occ1',
        planId: 'plan1',
        status: 'scheduled',
      })

      const plansMap = new Map([[plan.id, plan]])
      const occurrencesMap = new Map([[occurrence.id, occurrence]])
      usePlanningStore.setState({ plansMap, occurrencesMap })

      vi.mocked(planningApi.updateOccurrence).mockImplementation(
        async occ => occ
      )

      const input = {
        logEntryId: 'log123',
        responses: { 'How was it?': 'Great!' },
        metrics: { actualDuration: 35 },
      }

      await act(async () => {
        await usePlanningStore.getState().completeOccurrence('occ1', input)
      })

      const state = usePlanningStore.getState()
      const updatedOccurrence = state.occurrencesMap.get('occ1')

      expect(updatedOccurrence?.status).toBe('completed')
      expect(updatedOccurrence?.logEntryId).toBe('log123')
      expect(updatedOccurrence?.checkIn).toBeDefined()
      expect(updatedOccurrence?.checkIn?.responses).toEqual(input.responses)
      expect(updatedOccurrence?.metrics?.actualDuration).toBe(35)
    })

    it('should throw error if occurrence not found', async () => {
      await expect(
        act(async () => {
          await usePlanningStore.getState().completeOccurrence('non-existent', {
            logEntryId: 'log123',
            responses: {},
          })
        })
      ).rejects.toThrow('Occurrence not found')
    })

    it('should update plan timestamp when occurrence completed', async () => {
      // Create plan with an older timestamp
      const oldTimestamp = new Date(Date.now() - 60000).toISOString() // 1 minute ago
      const plan = buildPracticePlan({
        id: 'plan1',
        updatedAt: oldTimestamp,
      })
      const occurrence = buildPlanOccurrence({
        id: 'occ1',
        planId: 'plan1',
      })

      const plansMap = new Map([[plan.id, plan]])
      const occurrencesMap = new Map([[occurrence.id, occurrence]])
      usePlanningStore.setState({ plansMap, occurrencesMap })

      vi.mocked(planningApi.updateOccurrence).mockImplementation(
        async occ => occ
      )

      await act(async () => {
        await usePlanningStore.getState().completeOccurrence('occ1', {
          logEntryId: 'log123',
          responses: {},
        })
      })

      const state = usePlanningStore.getState()
      const updatedPlan = state.plansMap.get('plan1')

      // Plan's updatedAt should be updated
      expect(new Date(updatedPlan!.updatedAt).getTime()).toBeGreaterThan(
        new Date(oldTimestamp).getTime()
      )
    })
  })

  describe('getOccurrencesForPlan', () => {
    it('should return sorted occurrences for a specific plan', () => {
      const plan1Occ1 = buildPlanOccurrence({
        id: 'occ1',
        planId: 'plan1',
        scheduledStart: '2025-01-15T10:00:00Z',
      })
      const plan1Occ2 = buildPlanOccurrence({
        id: 'occ2',
        planId: 'plan1',
        scheduledStart: '2025-01-20T10:00:00Z',
      })
      const plan2Occ = buildPlanOccurrence({
        id: 'occ3',
        planId: 'plan2',
      })

      const occurrencesMap = new Map([
        [plan1Occ2.id, plan1Occ2], // Add out of order
        [plan1Occ1.id, plan1Occ1],
        [plan2Occ.id, plan2Occ],
      ])

      usePlanningStore.setState({ occurrencesMap })

      const result = usePlanningStore.getState().getOccurrencesForPlan('plan1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('occ1') // Earlier date first
      expect(result[1].id).toBe('occ2')
    })

    it('should return empty array if no occurrences for plan', () => {
      const result = usePlanningStore
        .getState()
        .getOccurrencesForPlan('no-plan')
      expect(result).toEqual([])
    })
  })

  describe('getNextOccurrenceForPlan', () => {
    it('should return next scheduled occurrence', () => {
      const now = Date.now()
      const pastOcc = buildPlanOccurrence({
        id: 'past',
        planId: 'plan1',
        scheduledStart: new Date(now - 86400000).toISOString(), // Yesterday
      })
      const futureOcc1 = buildPlanOccurrence({
        id: 'future1',
        planId: 'plan1',
        scheduledStart: new Date(now + 86400000).toISOString(), // Tomorrow
      })
      const futureOcc2 = buildPlanOccurrence({
        id: 'future2',
        planId: 'plan1',
        scheduledStart: new Date(now + 172800000).toISOString(), // Day after
      })

      const occurrencesMap = new Map([
        [pastOcc.id, pastOcc],
        [futureOcc2.id, futureOcc2],
        [futureOcc1.id, futureOcc1],
      ])

      usePlanningStore.setState({ occurrencesMap })

      const result = usePlanningStore
        .getState()
        .getNextOccurrenceForPlan('plan1')

      expect(result?.id).toBe('future1') // Next upcoming occurrence
    })

    it('should return undefined if no future occurrences', () => {
      const pastOcc = buildPlanOccurrence({
        planId: 'plan1',
        scheduledStart: new Date(Date.now() - 86400000).toISOString(),
      })

      const occurrencesMap = new Map([[pastOcc.id, pastOcc]])
      usePlanningStore.setState({ occurrencesMap })

      const result = usePlanningStore
        .getState()
        .getNextOccurrenceForPlan('plan1')

      expect(result).toBeUndefined()
    })

    it('should handle occurrences without scheduledStart', () => {
      const occWithoutStart = buildPlanOccurrence({
        id: 'no-start',
        planId: 'plan1',
        scheduledStart: null,
      })

      const occurrencesMap = new Map([[occWithoutStart.id, occWithoutStart]])
      usePlanningStore.setState({ occurrencesMap })

      const result = usePlanningStore
        .getState()
        .getNextOccurrenceForPlan('plan1')

      expect(result?.id).toBe('no-start') // Should return it as "next"
    })
  })

  describe('localStorage persistence', () => {
    it('should persist plans and occurrences to localStorage', async () => {
      const mockData = buildPlanWithOccurrences()

      vi.mocked(planningApi.getPlanningData).mockResolvedValue({
        plans: [mockData.plan],
        occurrences: mockData.occurrences,
      })

      await act(async () => {
        await usePlanningStore.getState().loadPlanningData()
      })

      const storedPlans = JSON.parse(localStorageData[PLANS_KEY])
      const storedOccurrences = JSON.parse(localStorageData[OCCURRENCES_KEY])

      expect(storedPlans).toHaveLength(1)
      expect(storedPlans[0].id).toBe(mockData.plan.id)
      expect(storedOccurrences).toHaveLength(mockData.occurrences.length)
    })

    it('should handle localStorage quota exceeded', async () => {
      const localStorageMock = global.localStorage as unknown as {
        setItem: ReturnType<typeof vi.fn>
      }

      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const draft = buildCreatePlanDraft()
      vi.mocked(planningApi.createPlan).mockImplementation(
        async (plan, occurrences) => ({
          plan,
          occurrences,
        })
      )

      await act(async () => {
        await usePlanningStore.getState().createPlan(draft)
      })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Planning] Failed to persist'),
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Sorting and ordering', () => {
    it('should sort plans by updatedAt (newest first)', async () => {
      const oldPlan = buildPracticePlan({
        id: 'old',
        updatedAt: '2025-01-01T00:00:00Z',
      })
      const newPlan = buildPracticePlan({
        id: 'new',
        updatedAt: '2025-01-15T00:00:00Z',
      })
      const middlePlan = buildPracticePlan({
        id: 'middle',
        updatedAt: '2025-01-08T00:00:00Z',
      })

      vi.mocked(planningApi.getPlanningData).mockResolvedValue({
        plans: [oldPlan, newPlan, middlePlan], // Out of order
        occurrences: [],
      })

      await act(async () => {
        await usePlanningStore.getState().loadPlanningData()
      })

      const state = usePlanningStore.getState()
      expect(state.plans[0].id).toBe('new')
      expect(state.plans[1].id).toBe('middle')
      expect(state.plans[2].id).toBe('old')
    })

    it('should sort occurrences by scheduledStart (earliest first)', async () => {
      const laterOcc = buildPlanOccurrence({
        id: 'later',
        scheduledStart: '2025-01-20T00:00:00Z',
      })
      const earlierOcc = buildPlanOccurrence({
        id: 'earlier',
        scheduledStart: '2025-01-10T00:00:00Z',
      })
      const noStartOcc = buildPlanOccurrence({
        id: 'no-start',
        scheduledStart: null,
      })

      vi.mocked(planningApi.getPlanningData).mockResolvedValue({
        plans: [],
        occurrences: [laterOcc, earlierOcc, noStartOcc], // Out of order
      })

      await act(async () => {
        await usePlanningStore.getState().loadPlanningData()
      })

      const state = usePlanningStore.getState()
      expect(state.occurrences[0].id).toBe('earlier')
      expect(state.occurrences[1].id).toBe('later')
      expect(state.occurrences[2].id).toBe('no-start') // No start goes to end
    })
  })
})
