import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from './client'
import { planningApi, type PracticePlan, type PlanOccurrence } from './planning'
import {
  buildPracticePlan,
  buildPlanOccurrence,
  buildPlanWithOccurrences,
  resetIdCounter,
} from '../tests/builders/planning.builders'

// Mock the apiClient
vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

describe('planningApi', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetIdCounter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPlanningData', () => {
    it('should fetch and normalize planning data successfully', async () => {
      const mockPlan = buildPracticePlan({
        id: 'plan1',
        title: 'Test Plan',
        focusAreas: undefined, // Test normalization
        techniques: undefined,
        pieceRefs: undefined,
        tags: undefined,
        metadata: undefined,
      })

      const mockOccurrence = buildPlanOccurrence({
        id: 'occ1',
        planId: 'plan1',
        segments: undefined, // Test normalization
        targets: undefined,
        reflectionPrompts: undefined,
      })

      const mockResponse = {
        data: {
          practicePlans: [mockPlan],
          planOccurrences: [mockOccurrence],
          syncToken: 'token123',
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.getPlanningData()

      // Verify API call
      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/pull', {
        types: ['practice_plan', 'plan_occurrence'],
        since: null,
      })

      // Verify normalization
      expect(result.plans).toHaveLength(1)
      expect(result.plans[0].title).toBe('Test Plan')
      expect(result.plans[0].focusAreas).toEqual([]) // Normalized to empty array
      expect(result.plans[0].techniques).toEqual([])
      expect(result.plans[0].pieceRefs).toEqual([])
      expect(result.plans[0].tags).toEqual([])
      expect(result.plans[0].metadata).toEqual({})

      expect(result.occurrences).toHaveLength(1)
      expect(result.occurrences[0].planId).toBe('plan1')
      expect(result.occurrences[0].segments).toEqual([]) // Normalized to empty array
      expect(result.occurrences[0].targets).toEqual({})
      expect(result.occurrences[0].reflectionPrompts).toEqual([])

      expect(result.syncToken).toBe('token123')
    })

    it('should handle empty responses gracefully', async () => {
      const mockResponse = {
        data: {},
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.getPlanningData()

      expect(result.plans).toEqual([])
      expect(result.occurrences).toEqual([])
      expect(result.syncToken).toBeUndefined()
    })

    it('should handle partial responses', async () => {
      const mockResponse = {
        data: {
          practicePlans: [buildPracticePlan()],
          // No occurrences provided
          syncToken: 'partial-token',
        },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.getPlanningData()

      expect(result.plans).toHaveLength(1)
      expect(result.occurrences).toEqual([])
      expect(result.syncToken).toBe('partial-token')
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      vi.mocked(apiClient.post).mockRejectedValue(networkError)

      await expect(planningApi.getPlanningData()).rejects.toThrow(
        'Network error'
      )
      expect(apiClient.post).toHaveBeenCalledTimes(1)
    })

    it('should handle malformed data gracefully', async () => {
      const mockResponse = {
        data: {
          practicePlans: [
            {
              ...buildPracticePlan(),
              focusAreas: 'invalid', // Should be array
            },
          ],
          planOccurrences: [
            {
              ...buildPlanOccurrence(),
              segments: 'invalid', // Should be array
            },
          ],
        },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.getPlanningData()

      // Should normalize invalid data
      expect(result.plans[0].focusAreas).toEqual([])
      expect(result.occurrences[0].segments).toEqual([])
    })
  })

  describe('createPlan', () => {
    it('should create a plan with occurrences successfully', async () => {
      const plan = buildPracticePlan()
      const occurrences = [buildPlanOccurrence({ planId: plan.id })]

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.createPlan(plan, occurrences)

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/push', {
        changes: {
          practicePlans: [JSON.parse(JSON.stringify(plan))], // Sanitized
          planOccurrences: occurrences.map(o => JSON.parse(JSON.stringify(o))),
        },
      })

      expect(result.plan).toEqual(JSON.parse(JSON.stringify(plan)))
      expect(result.occurrences).toHaveLength(1)
    })

    it('should handle creation failure', async () => {
      const plan = buildPracticePlan()
      const occurrences = [buildPlanOccurrence()]

      const mockResponse = {
        data: { success: false },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await expect(planningApi.createPlan(plan, occurrences)).rejects.toThrow(
        'Failed to create practice plan'
      )
    })

    it('should handle API errors during creation', async () => {
      const plan = buildPracticePlan()
      const occurrences = [buildPlanOccurrence()]

      vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'))

      await expect(planningApi.createPlan(plan, occurrences)).rejects.toThrow(
        'API Error'
      )
    })

    it('should sanitize data before sending', async () => {
      const plan = buildPracticePlan({
        metadata: {
          undefinedField: undefined,
          nullField: null,
          validField: 'value',
          circularRef: null as unknown,
        },
      })

      // Create circular reference
      const circular = { ref: null as unknown }
      circular.ref = circular
      plan.metadata!.circularRef = circular

      const occurrences = [buildPlanOccurrence({ planId: plan.id })]

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.createPlan(plan, occurrences)

      // Should handle circular references and undefined values
      expect(result.plan.metadata).toBeDefined()
      expect(result.plan.metadata!.validField).toBe('value')
      expect(result.plan.metadata!.nullField).toBeNull()
    })

    it('should handle empty occurrences array', async () => {
      const plan = buildPracticePlan()
      const occurrences: PlanOccurrence[] = []

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.createPlan(plan, occurrences)

      expect(result.occurrences).toEqual([])
      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/push', {
        changes: {
          practicePlans: [expect.any(Object)],
          planOccurrences: [],
        },
      })
    })
  })

  describe('updatePlan', () => {
    it('should update a plan with occurrences successfully', async () => {
      const plan = buildPracticePlan({
        title: 'Updated Title',
        updatedAt: new Date().toISOString(),
      })
      const occurrences = [
        buildPlanOccurrence({
          planId: plan.id,
          status: 'scheduled',
        }),
      ]

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.updatePlan(plan, occurrences)

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/push', {
        changes: {
          practicePlans: [expect.objectContaining({ title: 'Updated Title' })],
          planOccurrences: expect.arrayContaining([
            expect.objectContaining({ status: 'scheduled' }),
          ]),
        },
      })

      expect(result.plan.title).toBe('Updated Title')
      expect(result.occurrences).toHaveLength(1)
    })

    it('should handle update failure', async () => {
      const plan = buildPracticePlan()
      const occurrences = [buildPlanOccurrence()]

      const mockResponse = {
        data: { success: false },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await expect(planningApi.updatePlan(plan, occurrences)).rejects.toThrow(
        'Failed to update practice plan'
      )
    })

    it('should handle concurrent update scenario', async () => {
      const plan = buildPracticePlan({
        updatedAt: new Date(Date.now() - 10000).toISOString(), // Older timestamp
      })
      const occurrences = [buildPlanOccurrence()]

      const mockResponse = {
        data: {
          success: false,
          error: 'CONFLICT',
          message: 'Plan has been modified by another user',
        },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await expect(planningApi.updatePlan(plan, occurrences)).rejects.toThrow(
        'Failed to update practice plan'
      )
    })
  })

  describe('deletePlan', () => {
    it('should soft delete a plan and its occurrences', async () => {
      const plan = buildPracticePlan()
      const occurrences = [
        buildPlanOccurrence({ planId: plan.id }),
        buildPlanOccurrence({ planId: plan.id }),
      ]

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await planningApi.deletePlan(plan, occurrences)

      const callArgs = vi.mocked(apiClient.post).mock.calls[0]
      const pushedChanges = callArgs[1].changes

      // Verify soft delete (deletedAt timestamp added)
      expect(pushedChanges.practicePlans[0].deletedAt).toBeDefined()
      expect(pushedChanges.practicePlans[0].id).toBe(plan.id)

      expect(pushedChanges.planOccurrences).toHaveLength(2)
      pushedChanges.planOccurrences.forEach((occ: PlanOccurrence) => {
        expect(occ.deletedAt).toBeDefined()
        expect(occ.planId).toBe(plan.id)
      })
    })

    it('should handle delete failure', async () => {
      const plan = buildPracticePlan()
      const occurrences = [buildPlanOccurrence()]

      const mockResponse = {
        data: { success: false },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await expect(planningApi.deletePlan(plan, occurrences)).rejects.toThrow(
        'Failed to delete practice plan'
      )
    })

    it('should handle empty occurrences during delete', async () => {
      const plan = buildPracticePlan()
      const occurrences: PlanOccurrence[] = []

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await planningApi.deletePlan(plan, occurrences)

      const callArgs = vi.mocked(apiClient.post).mock.calls[0]
      const pushedChanges = callArgs[1].changes

      expect(pushedChanges.practicePlans).toHaveLength(1)
      expect(pushedChanges.planOccurrences).toHaveLength(0)
    })
  })

  describe('updateOccurrence', () => {
    it('should update a single occurrence successfully', async () => {
      const occurrence = buildPlanOccurrence({
        status: 'completed',
        logEntryId: 'log123',
        checkIn: {
          recordedAt: new Date().toISOString(),
          responses: {
            'How did it go?': 'Great!',
          },
        },
        metrics: {
          actualDuration: 35,
        },
      })

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.updateOccurrence(occurrence)

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/push', {
        changes: {
          planOccurrences: [JSON.parse(JSON.stringify(occurrence))],
        },
      })

      expect(result.status).toBe('completed')
      expect(result.logEntryId).toBe('log123')
      expect(result.checkIn).toBeDefined()
      expect(result.metrics).toBeDefined()
    })

    it('should handle occurrence update failure', async () => {
      const occurrence = buildPlanOccurrence()

      const mockResponse = {
        data: { success: false },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await expect(planningApi.updateOccurrence(occurrence)).rejects.toThrow(
        'Failed to update plan occurrence'
      )
    })

    it('should handle status transitions correctly', async () => {
      const scheduledOccurrence = buildPlanOccurrence({ status: 'scheduled' })
      const mockResponse = { data: { success: true } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      // Test each valid status transition
      const statusTransitions: Array<PlanOccurrence['status']> = [
        'completed',
        'skipped',
        'expired',
      ]

      for (const newStatus of statusTransitions) {
        const updated = { ...scheduledOccurrence, status: newStatus }
        const result = await planningApi.updateOccurrence(updated)
        expect(result.status).toBe(newStatus)
      }

      expect(apiClient.post).toHaveBeenCalledTimes(3)
    })
  })

  describe('Edge cases and error scenarios', () => {
    it('should handle very large payload', async () => {
      const { plan, occurrences } = buildPlanWithOccurrences({}, 100) // 100 occurrences

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.createPlan(plan, occurrences)

      expect(result.occurrences).toHaveLength(100)
    })

    it('should handle special characters in text fields', async () => {
      const plan = buildPracticePlan({
        title: 'Plan with "quotes" & special <chars>',
        description: "Description with 'apostrophes' and \n newlines",
      })

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.createPlan(plan, [])

      expect(result.plan.title).toBe('Plan with "quotes" & special <chars>')
      expect(result.plan.description).toContain('apostrophes')
    })

    it('should handle date timezone issues', async () => {
      const occurrence = buildPlanOccurrence({
        scheduledStart: '2025-06-15T18:00:00-05:00', // With timezone
        scheduledEnd: '2025-06-15T19:00:00-05:00',
      })

      const mockResponse = {
        data: { success: true },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await planningApi.updateOccurrence(occurrence)

      expect(result.scheduledStart).toBe('2025-06-15T18:00:00-05:00')
    })

    it('should handle missing required fields gracefully', async () => {
      const invalidPlan = {
        // Missing required fields like id, title, etc.
      } as PracticePlan

      const mockResponse = {
        data: { success: false, error: 'VALIDATION_ERROR' },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await expect(planningApi.createPlan(invalidPlan, [])).rejects.toThrow()
    })
  })
})
