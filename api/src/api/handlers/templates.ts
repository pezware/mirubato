import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import { authMiddleware, validateBody, type Variables } from '../middleware'
import { DatabaseHelpers, calculateChecksum } from '../../utils/database'
import type { Env } from '../../index'
import { PlanTemplateSchema } from '../../schemas/entities'
import { z } from 'zod'

export const templatesHandler = new Hono<{
  Bindings: Env
  Variables: Variables
}>()

// Schema for adoption request
const AdoptTemplateSchema = z.object({
  templateId: z.string(),
  customization: z
    .object({
      title: z.string().optional(),
      schedule: z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          timeOfDay: z.string().optional(),
          durationMinutes: z.number().int().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
})

// POST /api/templates/adopt - Adopt a template as a new practice plan
templatesHandler.post(
  '/adopt',
  authMiddleware,
  validateBody(AdoptTemplateSchema),
  async c => {
    const userId = c.get('userId')
    const deviceId = c.req.header('X-Device-ID')
    const { templateId, customization } = c.get('validatedBody') as z.infer<
      typeof AdoptTemplateSchema
    >

    try {
      const db = new DatabaseHelpers(c.env.DB)

      // 1. Fetch the template from database
      // Templates can be from any user (public templates), so we query without user restriction
      const templateRecord = await c.env.DB.prepare(
        'SELECT * FROM sync_data WHERE entity_type = ? AND entity_id = ? AND deleted_at IS NULL'
      )
        .bind('plan_template', templateId)
        .first<{ data: string }>()

      if (!templateRecord) {
        return c.json({ error: 'Template not found' }, 404)
      }

      // Parse the JSON data
      const templateData = JSON.parse(templateRecord.data)

      // Validate the template data
      const template = PlanTemplateSchema.parse(templateData)

      // 2. Create a new practice plan based on template
      const now = new Date().toISOString()
      const planId = `plan_${nanoid()}`

      // Apply customizations
      const customTitle = customization?.title || `${template.title} (Copy)`
      const customSchedule = {
        ...template.schedule,
        ...(customization?.schedule || {}),
      }

      const newPlan = {
        id: planId,
        user_id: userId,
        title: customTitle,
        description: template.description,
        type: template.type,
        focusAreas: template.focusAreas || [],
        techniques: template.techniques || [],
        pieceRefs: template.pieceRefs || [],
        schedule: customSchedule,
        visibility: 'private' as const,
        status: 'active' as const,
        ownerId: userId,
        templateVersion: template.templateVersion,
        // Ensure downstream clients know which template spawned this plan
        sourceTemplateId: templateId,
        tags: template.tags || [],
        metadata: {
          ...template.metadata,
          adoptedFrom: templateId,
          adoptedAt: now,
        },
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        deletedAt: null,
      }

      // 3. Generate a single occurrence (MVP - simplified)
      const occurrenceId = `plan_occ_${nanoid()}`

      // Determine scheduled times
      const scheduleStartDate =
        customization?.schedule?.startDate || template.schedule.startDate || now

      const startDateTime = new Date(scheduleStartDate)

      // Apply time of day if provided
      if (customization?.schedule?.timeOfDay || template.schedule.timeOfDay) {
        const timeOfDay =
          customization?.schedule?.timeOfDay || template.schedule.timeOfDay
        const [hours, minutes] = (timeOfDay || '09:00').split(':').map(Number)
        startDateTime.setHours(hours, minutes, 0, 0)
      }

      const scheduledStart = startDateTime.toISOString()
      const durationMinutes =
        customization?.schedule?.durationMinutes ||
        template.schedule.durationMinutes ||
        60

      const endDateTime = new Date(startDateTime)
      endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes)
      const scheduledEnd = endDateTime.toISOString()

      const newOccurrence = {
        id: occurrenceId,
        planId: planId,
        user_id: userId,
        scheduledStart,
        scheduledEnd,
        flexWindow:
          template.schedule.flexibility === 'fixed' ? null : 'same-day',
        recurrenceKey:
          template.schedule.kind === 'recurring'
            ? template.schedule.rule || null
            : null,
        segments: [],
        targets: {},
        reflectionPrompts: [],
        status: 'scheduled' as const,
        logEntryId: null,
        checkIn: undefined,
        notes: null,
        reminderState: undefined,
        metrics: {},
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }

      // 4. Save plan and occurrence via sync infrastructure
      const planChecksum = await calculateChecksum(newPlan)
      const occurrenceChecksum = await calculateChecksum(newOccurrence)

      await db.upsertSyncData({
        userId,
        entityType: 'practice_plan',
        entityId: planId,
        data: newPlan,
        checksum: planChecksum,
        deviceId,
      })

      await db.upsertSyncData({
        userId,
        entityType: 'plan_occurrence',
        entityId: occurrenceId,
        data: newOccurrence,
        checksum: occurrenceChecksum,
        deviceId,
      })

      // 5. Increment adoption count on template (fire and forget)
      try {
        const updatedTemplate = {
          ...template,
          adoptionCount: (template.adoptionCount || 0) + 1,
          updatedAt: now,
        }
        const templateChecksum = await calculateChecksum(updatedTemplate)
        await db.upsertSyncData({
          userId: template.authorId, // Update in author's namespace
          entityType: 'plan_template',
          entityId: templateId,
          data: updatedTemplate,
          checksum: templateChecksum,
          deviceId,
        })
      } catch (err) {
        console.warn('Failed to increment adoption count:', err)
        // Don't fail the request if this fails
      }

      // 6. Return the new plan and occurrences
      return c.json({
        success: true,
        plan: newPlan,
        occurrences: [newOccurrence],
      })
    } catch (error) {
      console.error('Template adoption error:', error)
      return c.json(
        {
          error: 'Failed to adopt template',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
)
