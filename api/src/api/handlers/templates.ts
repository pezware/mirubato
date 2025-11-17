import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { nanoid } from 'nanoid'
import { authMiddleware, validateBody, type Variables } from '../middleware'
import { DatabaseHelpers, calculateChecksum } from '../../utils/database'
import type { Env } from '../../index'
import {
  PlanOccurrenceSchema,
  PlanSegmentSchema,
  PlanTemplateSchema,
  PlanPieceRefSchema,
} from '../../schemas/entities'
import { z } from 'zod'

type PlanSegment = z.infer<typeof PlanSegmentSchema>

const SOURCE_PLAN_OCCURRENCE_LOOKBACK = 5

type SegmentCandidate = {
  label?: unknown
  durationMinutes?: unknown
  pieceRefs?: unknown
  techniques?: unknown
  instructions?: unknown
  tempoTargets?: unknown
  metadata?: unknown
}

type PieceRefCandidate = z.infer<typeof PlanPieceRefSchema>

const normalizeTempoTargets = (
  value: unknown
): Record<string, number | string | null> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const normalized: Record<string, number | string | null> = {}
  for (const [key, rawValue] of Object.entries(value)) {
    if (!key) continue
    if (
      typeof rawValue === 'number' ||
      typeof rawValue === 'string' ||
      rawValue === null
    ) {
      normalized[key] = rawValue
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

const normalizePieceRefs = (
  value: unknown
): PieceRefCandidate[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const refs = value
    .map(ref => {
      if (!ref || typeof ref !== 'object') {
        return null
      }

      const candidate = ref as PieceRefCandidate
      const normalized: PieceRefCandidate = {}

      if (typeof candidate.scoreId === 'string') {
        normalized.scoreId = candidate.scoreId
      }
      if (typeof candidate.title === 'string') {
        normalized.title = candidate.title
      }
      if (
        typeof candidate.composer === 'string' ||
        candidate.composer === null
      ) {
        normalized.composer = candidate.composer
      }

      return Object.keys(normalized).length > 0 ? normalized : null
    })
    .filter((ref): ref is PieceRefCandidate => Boolean(ref))

  return refs.length > 0 ? refs : undefined
}

const normalizeSegment = (
  candidate: unknown,
  index: number
): PlanSegment | null => {
  if (!candidate || typeof candidate !== 'object') {
    return null
  }

  const segment = candidate as SegmentCandidate
  const labelCandidate =
    typeof segment.label === 'string' && segment.label.trim().length > 0
      ? segment.label.trim()
      : undefined

  const normalized: PlanSegment = {
    label: labelCandidate ?? `Segment ${index + 1}`,
  }

  if (
    typeof segment.durationMinutes === 'number' &&
    Number.isFinite(segment.durationMinutes) &&
    segment.durationMinutes > 0
  ) {
    normalized.durationMinutes = segment.durationMinutes
  }

  const pieceRefs = normalizePieceRefs(segment.pieceRefs)
  if (pieceRefs) {
    normalized.pieceRefs = pieceRefs
  }

  if (Array.isArray(segment.techniques)) {
    const techniques = segment.techniques
      .filter((tech): tech is string => typeof tech === 'string')
      .map(tech => tech.trim())
      .filter(Boolean)

    if (techniques.length > 0) {
      normalized.techniques = techniques
    }
  }

  if (typeof segment.instructions === 'string') {
    const trimmed = segment.instructions.trim()
    if (trimmed.length > 0) {
      normalized.instructions = trimmed
    }
  }

  const tempoTargets = normalizeTempoTargets(segment.tempoTargets)
  if (tempoTargets) {
    normalized.tempoTargets = tempoTargets
  }

  if (
    segment.metadata &&
    typeof segment.metadata === 'object' &&
    !Array.isArray(segment.metadata)
  ) {
    normalized.metadata = segment.metadata as Record<string, unknown>
  }

  return normalized
}

const normalizeSegments = (segments: unknown): PlanSegment[] => {
  if (!Array.isArray(segments)) {
    return []
  }

  return segments
    .map((segment, index) => normalizeSegment(segment, index))
    .filter((segment): segment is PlanSegment => Boolean(segment))
}

const extractPreviewSegments = (
  metadata: Record<string, unknown> | undefined
): PlanSegment[] => {
  if (!metadata || typeof metadata !== 'object') {
    return []
  }

  const withPreview = metadata as {
    preview?: { segments?: unknown }
  }

  return normalizeSegments(withPreview.preview?.segments)
}

const fetchSourcePlanSegments = async (
  db: D1Database,
  template: z.infer<typeof PlanTemplateSchema>
): Promise<PlanSegment[] | null> => {
  if (!template.sourcePlanId) {
    return null
  }

  try {
    const result = await db
      .prepare(
        `
        SELECT data
        FROM sync_data
        WHERE entity_type = ?
          AND json_extract(data, '$.planId') = ?
          AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT ?
      `
      )
      .bind(
        'plan_occurrence',
        template.sourcePlanId,
        SOURCE_PLAN_OCCURRENCE_LOOKBACK
      )
      .all<{ data: string }>()

    const rows = result?.results ?? []
    for (const row of rows) {
      try {
        const occurrence = PlanOccurrenceSchema.parse(JSON.parse(row.data))
        const segments = normalizeSegments(occurrence.segments)
        if (segments.length > 0) {
          return segments
        }
      } catch (err) {
        console.warn(
          'Failed to parse source plan occurrence for template adoption:',
          err
        )
      }
    }
  } catch (err) {
    console.warn(
      'Failed to fetch source plan occurrences for template adoption:',
      err
    )
  }

  return null
}

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
      focusAreas: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
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

      const mergedFocusAreas = Array.from(
        new Set([
          ...(template.focusAreas || []),
          ...(customization?.focusAreas || []),
        ])
      )
      const mergedTags = Array.from(
        new Set([...(template.tags || []), ...(customization?.tags || [])])
      )

      const newPlan = {
        id: planId,
        user_id: userId,
        title: customTitle,
        description: template.description,
        type: template.type,
        focusAreas: mergedFocusAreas,
        techniques: template.techniques || [],
        pieceRefs: template.pieceRefs || [],
        schedule: customSchedule,
        visibility: 'private' as const,
        status: 'active' as const,
        ownerId: userId,
        templateVersion: template.templateVersion,
        // Ensure downstream clients know which template spawned this plan
        sourceTemplateId: templateId,
        tags: mergedTags,
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

      const sourceSegments =
        (await fetchSourcePlanSegments(c.env.DB, template)) ||
        extractPreviewSegments(
          template.metadata as Record<string, unknown> | undefined
        )

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
        segments: sourceSegments,
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
