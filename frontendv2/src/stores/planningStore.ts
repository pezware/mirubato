import { create } from 'zustand'
import { nanoid } from 'nanoid'
import {
  planningApi,
  type PracticePlan,
  type PlanOccurrence,
  type PlanSegment,
  type PlanTargets,
} from '../api/planning'
import type { SyncEvent, WebSocketSync } from '../services/webSocketSync'

export const RECURRENCE_WEEKDAYS = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
] as const
export type RecurrenceWeekday = (typeof RECURRENCE_WEEKDAYS)[number]
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

const ICS_UNTIL_REGEX = /^\d{8}T\d{6}Z$/i
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const MS_IN_HOUR = 60 * 60 * 1000

const RECURRENCE_CODE_TO_DAY: Record<RecurrenceWeekday, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 0,
}

const RECURRENCE_DAY_TO_CODE: Record<number, RecurrenceWeekday> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
}

export interface NormalizedRecurrence {
  frequency: RecurrenceFrequency
  interval: number
  weekdays?: RecurrenceWeekday[]
  count?: number
  until?: string | null
}

const normalizeUntilValue = (value?: string | null): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (DATE_ONLY_REGEX.test(trimmed)) {
    return trimmed
  }

  if (ICS_UNTIL_REGEX.test(trimmed)) {
    const year = trimmed.slice(0, 4)
    const month = trimmed.slice(4, 6)
    const day = trimmed.slice(6, 8)
    return `${year}-${month}-${day}`
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

const normalizeWeekdays = (
  weekdays?: RecurrenceWeekday[]
): RecurrenceWeekday[] => {
  if (!weekdays) {
    return []
  }

  const seen = new Set<RecurrenceWeekday>()
  const normalized: RecurrenceWeekday[] = []

  weekdays.forEach(day => {
    const upper = day.toUpperCase() as RecurrenceWeekday
    if (RECURRENCE_WEEKDAYS.includes(upper) && !seen.has(upper)) {
      seen.add(upper)
      normalized.push(upper)
    }
  })

  return normalized.sort(
    (a, b) => RECURRENCE_CODE_TO_DAY[a] - RECURRENCE_CODE_TO_DAY[b]
  )
}

const normalizeRecurrenceDetails = (
  details?: {
    frequency?: RecurrenceFrequency | string
    interval?: number | string
    weekdays?: RecurrenceWeekday[] | string[]
    count?: number | string
    until?: string | null
  } | null
): NormalizedRecurrence | null => {
  if (!details) {
    return null
  }

  const frequency =
    typeof details.frequency === 'string'
      ? (details.frequency.toUpperCase() as RecurrenceFrequency)
      : undefined

  if (
    frequency !== 'DAILY' &&
    frequency !== 'WEEKLY' &&
    frequency !== 'MONTHLY'
  ) {
    return null
  }

  const intervalNumber = Number(details.interval)
  const interval =
    Number.isFinite(intervalNumber) && intervalNumber > 0
      ? Math.round(intervalNumber)
      : 1

  const normalizedWeekdays = Array.isArray(details.weekdays)
    ? normalizeWeekdays(
        details.weekdays.map(day => day.toUpperCase() as RecurrenceWeekday)
      )
    : undefined

  const countNumber = Number(details.count)
  const count =
    Number.isFinite(countNumber) && countNumber > 0
      ? Math.round(countNumber)
      : undefined

  const until = normalizeUntilValue(details.until ?? undefined)

  return {
    frequency,
    interval,
    weekdays: normalizedWeekdays,
    count,
    until,
  }
}

export const normalizeRecurrenceMetadata = (
  metadata?: unknown
): NormalizedRecurrence | null => {
  if (!metadata || typeof metadata !== 'object') {
    return null
  }

  const record = metadata as Record<string, unknown>

  return normalizeRecurrenceDetails({
    frequency: record.frequency as RecurrenceFrequency | string,
    interval: record.interval as number | string | undefined,
    weekdays: Array.isArray(record.weekdays)
      ? (record.weekdays as string[])
      : undefined,
    count: record.count as number | string | undefined,
    until: typeof record.until === 'string' ? record.until : undefined,
  })
}

const recurrenceToMetadata = (
  recurrence: NormalizedRecurrence
): Record<string, unknown> => {
  const recurrenceMetadata: Record<string, unknown> = {
    frequency: recurrence.frequency,
    interval: recurrence.interval,
  }

  if (recurrence.weekdays?.length) {
    recurrenceMetadata.weekdays = recurrence.weekdays
  }

  if (typeof recurrence.count === 'number') {
    recurrenceMetadata.count = recurrence.count
  }

  if (recurrence.until) {
    recurrenceMetadata.until = recurrence.until
  }

  return recurrenceMetadata
}

export const buildRecurrenceRuleString = (config: NormalizedRecurrence) => {
  const interval =
    Number.isFinite(config.interval) && config.interval > 0
      ? Math.round(config.interval)
      : 1

  const parts: string[] = [`FREQ=${config.frequency}`, `INTERVAL=${interval}`]

  if (config.frequency === 'WEEKLY') {
    const weekdays = normalizeWeekdays(config.weekdays)
    if (weekdays.length > 0) {
      parts.push(`BYDAY=${weekdays.join(',')}`)
    }
  }

  if (config.count && config.count > 0) {
    parts.push(`COUNT=${Math.round(config.count)}`)
  }

  if (config.until) {
    const trimmed = config.until.trim()
    if (trimmed) {
      if (ICS_UNTIL_REGEX.test(trimmed)) {
        parts.push(`UNTIL=${trimmed}`)
      } else if (DATE_ONLY_REGEX.test(trimmed)) {
        parts.push(`UNTIL=${trimmed.replace(/-/g, '')}T235959Z`)
      } else {
        const parsed = new Date(trimmed)
        if (!Number.isNaN(parsed.getTime())) {
          const formatted = parsed
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}Z$/, 'Z')
          parts.push(`UNTIL=${formatted}`)
        }
      }
    }
  }

  return parts.join(';')
}

export const parseRecurrenceRule = (
  rule?: string | null
): NormalizedRecurrence | null => {
  if (!rule || typeof rule !== 'string') {
    return null
  }

  const segments = rule
    .split(';')
    .map(segment => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  let frequency: RecurrenceFrequency | null = null
  let interval = 1
  let weekdays: RecurrenceWeekday[] | undefined
  let count: number | undefined
  let until: string | null | undefined

  segments.forEach(segment => {
    const [rawKey, rawValue] = segment.split('=')
    if (!rawKey || typeof rawValue === 'undefined') {
      return
    }

    const key = rawKey.trim().toUpperCase()
    const value = rawValue.trim()

    if (key === 'FREQ') {
      const upperValue = value.toUpperCase()
      if (
        upperValue === 'DAILY' ||
        upperValue === 'WEEKLY' ||
        upperValue === 'MONTHLY'
      ) {
        frequency = upperValue as RecurrenceFrequency
      }
    } else if (key === 'INTERVAL') {
      const parsed = Number.parseInt(value, 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        interval = parsed
      }
    } else if (key === 'BYDAY') {
      const parsedWeekdays = value
        .split(',')
        .map(part => part.trim().toUpperCase() as RecurrenceWeekday)
      const normalized = normalizeWeekdays(parsedWeekdays)
      if (normalized.length > 0) {
        weekdays = normalized
      }
    } else if (key === 'COUNT') {
      const parsed = Number.parseInt(value, 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        count = parsed
      }
    } else if (key === 'UNTIL') {
      until = normalizeUntilValue(value) ?? null
    }
  })

  if (!frequency) {
    return null
  }

  return {
    frequency,
    interval,
    weekdays,
    count,
    until: until ?? null,
  }
}

interface RecurrenceGenerationConfig {
  start: Date
  frequency: RecurrenceFrequency
  interval: number
  weekdays?: RecurrenceWeekday[]
  count?: number
  until?: Date | null
}

export const buildRecurrenceKey = (rule: string, scheduledStart: string) =>
  `RRULE:${rule}|DTSTART:${scheduledStart}`

export const generateRecurrenceDates = (
  definition: RecurrenceGenerationConfig,
  options?: { maxOccurrences?: number; horizonDays?: number }
): Date[] => {
  const maxOccurrences = Math.max(1, options?.maxOccurrences ?? 12)
  const horizonDays = Math.max(1, options?.horizonDays ?? 90)
  const interval = Math.max(1, Math.floor(definition.interval) || 1)
  const startTime = definition.start.getTime()
  const targetCount =
    definition.count && definition.count > 0
      ? Math.floor(definition.count)
      : Number.POSITIVE_INFINITY

  const horizonLimit = new Date(definition.start)
  horizonLimit.setDate(horizonLimit.getDate() + horizonDays)
  const untilTime = definition.until
    ? definition.until.getTime()
    : Number.POSITIVE_INFINITY
  const cutoffTime = Math.min(untilTime, horizonLimit.getTime())

  const results: Date[] = []

  const pushOccurrence = (candidate: Date) => {
    if (candidate.getTime() < startTime) {
      return
    }
    if (candidate.getTime() > cutoffTime) {
      return
    }
    if (
      results.length > 0 &&
      results[results.length - 1].getTime() === candidate.getTime()
    ) {
      return
    }
    results.push(new Date(candidate))
  }

  if (definition.frequency === 'DAILY') {
    let occurrence = new Date(definition.start)
    let guard = 0
    while (
      occurrence.getTime() <= cutoffTime &&
      results.length < maxOccurrences &&
      results.length < targetCount &&
      guard < 1000
    ) {
      pushOccurrence(occurrence)
      occurrence = new Date(occurrence)
      occurrence.setDate(occurrence.getDate() + interval)
      guard += 1
    }
    return results
  }

  if (definition.frequency === 'WEEKLY') {
    const weekdays =
      definition.weekdays && definition.weekdays.length > 0
        ? normalizeWeekdays(definition.weekdays)
        : [RECURRENCE_DAY_TO_CODE[definition.start.getDay()]]

    let cycle = 0
    while (
      results.length < maxOccurrences &&
      results.length < targetCount &&
      cycle < 520
    ) {
      const base = new Date(definition.start)
      base.setDate(base.getDate() + cycle * interval * 7)

      for (const code of weekdays) {
        const candidate = new Date(base)
        const diff = RECURRENCE_CODE_TO_DAY[code] - candidate.getDay()
        candidate.setDate(candidate.getDate() + diff)

        pushOccurrence(candidate)

        if (results.length >= maxOccurrences || results.length >= targetCount) {
          break
        }
      }

      if (base.getTime() > cutoffTime) {
        break
      }

      cycle += 1
    }

    return results.slice(0, maxOccurrences)
  }

  // Monthly recurrence
  const desiredDay = definition.start.getDate()
  let cycle = 0
  while (
    results.length < maxOccurrences &&
    results.length < targetCount &&
    cycle < 240
  ) {
    const candidate = new Date(definition.start)
    candidate.setHours(
      definition.start.getHours(),
      definition.start.getMinutes(),
      definition.start.getSeconds(),
      definition.start.getMilliseconds()
    )
    candidate.setDate(1)
    candidate.setMonth(candidate.getMonth() + cycle * interval)

    const monthLength = new Date(
      candidate.getFullYear(),
      candidate.getMonth() + 1,
      0
    ).getDate()
    candidate.setDate(Math.min(desiredDay, monthLength))

    if (candidate.getTime() > cutoffTime) {
      break
    }

    pushOccurrence(candidate)
    cycle += 1
  }

  return results.slice(0, maxOccurrences)
}

export interface PlanSegmentDraft {
  id?: string
  label: string
  durationMinutes?: number
  instructions?: string
  techniques?: string[]
}

export interface CreatePlanDraft {
  planId?: string
  occurrenceId?: string
  title: string
  description?: string
  schedule: {
    kind?: 'single' | 'recurring'
    startDate: string
    timeOfDay?: string
    durationMinutes?: number
    flexibility: 'fixed' | 'same-day' | 'anytime'
    endDate?: string | null
    rule?: string
    recurrence?: {
      frequency: RecurrenceFrequency
      interval: number
      weekdays?: RecurrenceWeekday[]
      count?: number
      until?: string | null
    }
  }
  segments: PlanSegmentDraft[]
  reflectionPrompts?: string[]
  focusAreas?: string[]
  techniques?: string[]
  type?: PracticePlan['type']
}

export interface PlanOccurrencePrefillData {
  planId: string
  occurrenceId: string
  planTitle?: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  durationMinutes?: number
  segments: Array<{
    id?: string
    label: string
    durationMinutes?: number
    pieceRefs?: PlanSegment['pieceRefs']
    techniques?: string[]
    instructions?: string
    tempoTargets?: Record<string, number | string | null>
    metadata?: Record<string, unknown>
  }>
  reflectionPrompts: string[]
  focusAreas: string[]
  techniques: string[]
  targets?: PlanTargets
  pieces: Array<{
    title: string
    composer?: string | null
    scoreId?: string
  }>
  metadata: Record<string, unknown>
}

interface PlanningState {
  plansMap: Map<string, PracticePlan>
  occurrencesMap: Map<string, PlanOccurrence>
  isLoading: boolean
  error: string | null
  hasLoaded: boolean
  plans: PracticePlan[]
  occurrences: PlanOccurrence[]
  _wsHandlers?: {
    planCreated?: (event: SyncEvent) => void
    planUpdated?: (event: SyncEvent) => void
    occurrenceCompleted?: (event: SyncEvent) => void
  }
  loadPlanningData: () => Promise<void>
  createPlan: (draft: CreatePlanDraft) => Promise<{
    plan: PracticePlan
    occurrence: PlanOccurrence
  }>
  getOccurrencesForPlan: (planId: string) => PlanOccurrence[]
  getNextOccurrenceForPlan: (planId: string) => PlanOccurrence | undefined
  updatePlan: (draft: CreatePlanDraft) => Promise<{
    plan: PracticePlan
    occurrence: PlanOccurrence
  }>
  deletePlan: (planId: string) => Promise<void>
  getOccurrencePrefillData: (
    occurrenceId: string
  ) => PlanOccurrencePrefillData | null
  markOccurrencePendingLog: (
    occurrenceId: string,
    options?: { pending?: boolean; logEntryId?: string | null }
  ) => void
  completeOccurrence: (
    occurrenceId: string,
    input: {
      logEntryId: string
      responses: Record<string, string>
      metrics?: Record<string, unknown>
    }
  ) => Promise<void>
  attachRealtimeHandlers: (webSocketSync: WebSocketSync) => void
  detachRealtimeHandlers: (webSocketSync: WebSocketSync) => void
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

const sumSegmentDurations = (segments?: PlanSegment[]): number => {
  if (!Array.isArray(segments)) {
    return 0
  }

  return segments.reduce((total, segment) => {
    const minutes = Number(segment?.durationMinutes)
    if (Number.isFinite(minutes) && minutes > 0) {
      return total + minutes
    }
    return total
  }, 0)
}

const collectPiecesFromSegments = (
  segments?: PlanSegment[]
): Array<{ title: string; composer?: string | null; scoreId?: string }> => {
  if (!Array.isArray(segments)) {
    return []
  }

  const pieces: Array<{
    title: string
    composer?: string | null
    scoreId?: string
  }> = []
  const seen = new Set<string>()

  segments.forEach(segment => {
    segment?.pieceRefs?.forEach(ref => {
      if (!ref) {
        return
      }

      const title = ref.title?.trim()
      if (!title) {
        return
      }

      const composer = ref.composer ?? null
      const key = ref.scoreId
        ? ref.scoreId
        : `${title.toLowerCase()}|${(composer ?? '').toLowerCase()}`

      if (seen.has(key)) {
        return
      }

      seen.add(key)
      pieces.push({
        title,
        composer,
        scoreId: ref.scoreId ?? undefined,
      })
    })
  })

  return pieces
}

const parseIsoDate = (value?: string | null): Date | null => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

const parseLocalDateBoundary = (
  value?: string | null,
  boundary: 'start' | 'end' = 'start'
): Date | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (DATE_ONLY_REGEX.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(part => Number(part))
    if ([year, month, day].some(part => Number.isNaN(part))) {
      return null
    }

    const date = new Date(year, month - 1, day)
    if (boundary === 'end') {
      date.setHours(23, 59, 59, 999)
    } else {
      date.setHours(0, 0, 0, 0)
    }
    return date
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

const getLocalDayBounds = (reference: Date) => {
  const startOfDay = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    0,
    0,
    0,
    0
  )

  const endOfDay = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    23,
    59,
    59,
    999
  )

  return { startOfDay, endOfDay }
}

const getLocalDayKey = (reference: Date) =>
  `${reference.getFullYear()}-${reference.getMonth()}-${reference.getDate()}`

const getCurrentMinuteKey = (reference: Date) =>
  `${reference.getFullYear()}-${reference.getMonth()}-${reference.getDate()}-${reference.getHours()}-${reference.getMinutes()}`

interface OccurrenceWindow {
  start: Date
  end: Date
}

const getOccurrenceWindow = (
  occurrence: PlanOccurrence
): OccurrenceWindow | null => {
  const start = parseIsoDate(occurrence.scheduledStart ?? undefined)
  if (!start) {
    return null
  }

  let end = parseIsoDate(occurrence.scheduledEnd ?? undefined)

  if (!end || end.getTime() < start.getTime()) {
    if (occurrence.flexWindow === 'overnight') {
      end = new Date(start.getTime() + 12 * MS_IN_HOUR)
    } else if (occurrence.flexWindow === 'anytime') {
      end = new Date(start)
      end.setHours(23, 59, 59, 999)
    } else {
      end = new Date(start)
    }
  }

  return { start, end }
}

const getPlanRecurrenceBounds = (
  plan?: PracticePlan
): { start?: Date | null; end?: Date | null } => {
  if (!plan) {
    return { start: null, end: null }
  }

  const start = parseLocalDateBoundary(plan.schedule.startDate, 'start')

  const metadata =
    plan.schedule.metadata && typeof plan.schedule.metadata === 'object'
      ? (plan.schedule.metadata as { recurrence?: unknown })
      : null

  const metadataRecurrence = normalizeRecurrenceMetadata(metadata?.recurrence)

  const recurrenceFromRule = metadataRecurrence
    ? null
    : parseRecurrenceRule(plan.schedule.rule)

  const endCandidate =
    parseLocalDateBoundary(plan.schedule.endDate, 'end') ||
    (metadataRecurrence?.until
      ? parseLocalDateBoundary(metadataRecurrence.until, 'end')
      : null) ||
    (recurrenceFromRule?.until
      ? parseLocalDateBoundary(recurrenceFromRule.until, 'end')
      : null)

  return { start, end: endCandidate }
}

const isOccurrenceCompleted = (occurrence: PlanOccurrence): boolean => {
  if (occurrence.status === 'completed') {
    return true
  }

  const metrics = occurrence.metrics
  if (metrics && typeof metrics === 'object' && 'pendingLog' in metrics) {
    return Boolean((metrics as Record<string, unknown>).pendingLog ?? undefined)
  }

  return false
}

const isOccurrenceActionable = (occurrence: PlanOccurrence): boolean => {
  return occurrence.status === 'scheduled'
}

const isWithinRecurrenceWindow = (
  occurrence: PlanOccurrence,
  plan: PracticePlan | undefined,
  occurrenceWindow: OccurrenceWindow | null
) => {
  if (!plan) {
    return true
  }

  const bounds = getPlanRecurrenceBounds(plan)
  const occurrenceStart =
    occurrenceWindow?.start ||
    parseIsoDate(occurrence.scheduledStart ?? undefined)

  if (bounds.start && occurrenceStart) {
    if (occurrenceStart.getTime() < bounds.start.getTime()) {
      return false
    }
  }

  if (bounds.end && occurrenceStart) {
    if (occurrenceStart.getTime() > bounds.end.getTime()) {
      return false
    }
  }

  return true
}

const aggregateTechniques = (
  planTechniques: string[] | undefined,
  segments?: PlanSegment[]
): string[] => {
  const aggregated = new Set<string>()

  planTechniques?.forEach(technique => {
    const trimmed = technique.trim()
    if (trimmed) {
      aggregated.add(trimmed)
    }
  })

  segments?.forEach(segment => {
    segment?.techniques?.forEach(technique => {
      const trimmed = technique.trim()
      if (trimmed) {
        aggregated.add(trimmed)
      }
    })
  })

  return Array.from(aggregated)
}

const sanitizeMetadataRecord = (
  metadata: Record<string, unknown>
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  )
}

const serializeSegmentsForMetadata = (
  segments?: PlanSegment[]
): PlanOccurrencePrefillData['segments'] => {
  if (!Array.isArray(segments)) {
    return []
  }

  return segments
    .map(segment => {
      if (!segment) {
        return null
      }

      const normalized: Record<string, unknown> = {
        label: segment.label,
      }

      if (segment.id) {
        normalized.id = segment.id
      }

      if (
        typeof segment.durationMinutes === 'number' &&
        !Number.isNaN(segment.durationMinutes)
      ) {
        normalized.durationMinutes = segment.durationMinutes
      }

      if (Array.isArray(segment.pieceRefs) && segment.pieceRefs.length > 0) {
        normalized.pieceRefs = segment.pieceRefs.map(piece => ({
          scoreId: piece?.scoreId,
          title: piece?.title,
          composer: piece?.composer ?? null,
        }))
      }

      if (Array.isArray(segment.techniques) && segment.techniques.length > 0) {
        normalized.techniques = segment.techniques
      }

      if (segment.instructions) {
        normalized.instructions = segment.instructions
      }

      if (
        segment.tempoTargets &&
        typeof segment.tempoTargets === 'object' &&
        Object.keys(segment.tempoTargets).length > 0
      ) {
        normalized.tempoTargets = segment.tempoTargets
      }

      if (
        segment.metadata &&
        typeof segment.metadata === 'object' &&
        Object.keys(segment.metadata).length > 0
      ) {
        normalized.metadata = segment.metadata
      }

      return sanitizeMetadataRecord(normalized)
    })
    .filter(
      (segment): segment is PlanOccurrencePrefillData['segments'][number] =>
        Boolean(segment)
    )
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  plansMap: new Map(),
  occurrencesMap: new Map(),
  isLoading: false,
  error: null,
  hasLoaded: false,
  plans: [],
  occurrences: [],
  _wsHandlers: undefined,

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

    // Check if user is authenticated before calling API
    const token = localStorage.getItem('auth-token')
    if (!token) {
      // Not authenticated - only use localStorage data
      console.log('[Planning] Not authenticated, using local data only')
      set({ hasLoaded: true, isLoading: false })
      return
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

    const scheduledStart = combineDateAndTime(
      draft.schedule.startDate,
      draft.schedule.timeOfDay
    )

    if (!scheduledStart) {
      throw new Error('Invalid schedule')
    }

    const durationMinutes = draft.schedule.durationMinutes

    const cleanSegments: PlanSegment[] = []
    draft.segments.forEach((segment, index) => {
      const label = segment.label.trim()
      if (!label) {
        return
      }

      const techniques = segment.techniques
        ?.map(tech => tech.trim())
        .filter(Boolean)

      cleanSegments.push({
        id: segment.id ?? `${planId}_segment_${index + 1}`,
        label,
        durationMinutes:
          segment.durationMinutes && segment.durationMinutes > 0
            ? Math.round(segment.durationMinutes)
            : undefined,
        instructions: segment.instructions?.trim() || undefined,
        techniques: techniques && techniques.length > 0 ? techniques : [],
      })
    })

    if (cleanSegments.length === 0) {
      throw new Error('At least one segment is required')
    }

    const resolvedDuration =
      durationMinutes && durationMinutes > 0
        ? Math.round(durationMinutes)
        : cleanSegments.reduce(
            (sum, segment) => sum + (segment.durationMinutes ?? 0),
            0
          ) || undefined

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
    const recurrenceInput =
      scheduleKind === 'recurring' ? draft.schedule.recurrence : undefined

    let normalizedRecurrence: NormalizedRecurrence | null = null
    if (scheduleKind === 'recurring') {
      normalizedRecurrence =
        normalizeRecurrenceDetails(recurrenceInput) ||
        parseRecurrenceRule(draft.schedule.rule)

      if (!normalizedRecurrence) {
        throw new Error('Recurring plans require a recurrence rule')
      }
    }

    const recurrenceRuleString =
      scheduleKind === 'recurring' && normalizedRecurrence
        ? buildRecurrenceRuleString(normalizedRecurrence)
        : undefined

    const scheduleMetadata: Record<string, unknown> = {
      segmentsCount: cleanSegments.length,
    }

    if (scheduleKind === 'recurring' && normalizedRecurrence) {
      scheduleMetadata.recurrence = recurrenceToMetadata(normalizedRecurrence)
    } else {
      delete scheduleMetadata.recurrence
    }

    const scheduleEndDate =
      scheduleKind === 'recurring'
        ? (normalizeUntilValue(draft.schedule.endDate) ??
          normalizedRecurrence?.until ??
          null)
        : null

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
        durationMinutes: resolvedDuration ?? undefined,
        timeOfDay: draft.schedule.timeOfDay,
        flexibility: draft.schedule.flexibility,
        startDate: draft.schedule.startDate,
        endDate: scheduleEndDate,
        target: scheduleKind === 'single' ? scheduledStart : undefined,
        rule: recurrenceRuleString,
        metadata: scheduleMetadata,
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

    const occurrencesToPersist: PlanOccurrence[] = []

    const createOccurrenceSegments = (baseId: string) =>
      cleanSegments.map((segment, index) => ({
        ...segment,
        id: `${baseId}_segment_${index + 1}`,
      }))

    if (scheduleKind === 'single') {
      const occurrenceId = `plan_occ_${nanoid()}`
      const scheduledEnd = addMinutes(scheduledStart, resolvedDuration)

      occurrencesToPersist.push({
        id: occurrenceId,
        planId,
        scheduledStart,
        scheduledEnd,
        flexWindow: draft.schedule.flexibility,
        recurrenceKey: undefined,
        segments: createOccurrenceSegments(occurrenceId),
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
      })
    } else if (normalizedRecurrence && recurrenceRuleString) {
      const untilDateIso =
        scheduleEndDate && scheduleEndDate.trim()
          ? combineDateAndTime(scheduleEndDate, '23:59:59')
          : null
      const untilDate = untilDateIso ? new Date(untilDateIso) : null

      const recurrenceDates = generateRecurrenceDates(
        {
          start: new Date(scheduledStart),
          frequency: normalizedRecurrence.frequency,
          interval: normalizedRecurrence.interval,
          weekdays: normalizedRecurrence.weekdays,
          count: normalizedRecurrence.count,
          until: untilDate,
        },
        {
          maxOccurrences:
            normalizedRecurrence.count && normalizedRecurrence.count > 0
              ? normalizedRecurrence.count
              : 12,
          horizonDays: 90,
        }
      )

      const occurrenceDates =
        recurrenceDates.length > 0
          ? recurrenceDates
          : [new Date(scheduledStart)]

      const recurrenceKey = buildRecurrenceKey(
        recurrenceRuleString,
        scheduledStart
      )

      occurrenceDates.forEach((date, occurrenceIndex) => {
        const occurrenceId = `plan_occ_${nanoid()}_${occurrenceIndex + 1}`
        const occurrenceStart = date.toISOString()
        const occurrenceEnd = addMinutes(occurrenceStart, resolvedDuration)

        occurrencesToPersist.push({
          id: occurrenceId,
          planId,
          scheduledStart: occurrenceStart,
          scheduledEnd: occurrenceEnd,
          flexWindow: draft.schedule.flexibility,
          recurrenceKey,
          segments: createOccurrenceSegments(occurrenceId),
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
        })
      })
    }

    const sanitizedPlan = sanitizeForStorage(plan)
    const sanitizedOccurrences = occurrencesToPersist.map(occ =>
      sanitizeForStorage(occ)
    )

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

  updatePlan: async draft => {
    if (!draft.planId || !draft.occurrenceId) {
      throw new Error('Missing plan identifiers')
    }

    const { plansMap, occurrencesMap } = get()
    const existingPlan = plansMap.get(draft.planId)
    const existingOccurrence = occurrencesMap.get(draft.occurrenceId)

    if (!existingPlan || !existingOccurrence) {
      throw new Error('Plan not found')
    }

    const nowIso = new Date().toISOString()

    const scheduledStart = combineDateAndTime(
      draft.schedule.startDate,
      draft.schedule.timeOfDay
    )

    if (!scheduledStart) {
      throw new Error('Invalid schedule')
    }

    const durationMinutes = draft.schedule.durationMinutes
    const scheduledEnd = addMinutes(scheduledStart, durationMinutes)

    const cleanSegments: PlanSegment[] = []
    draft.segments.forEach((segment, index) => {
      const label = segment.label.trim()
      if (!label) {
        return
      }

      const techniques = segment.techniques
        ?.map(tech => tech.trim())
        .filter(Boolean)

      cleanSegments.push({
        id: segment.id ?? `${draft.occurrenceId}_segment_${index + 1}`,
        label,
        durationMinutes:
          segment.durationMinutes && segment.durationMinutes > 0
            ? Math.round(segment.durationMinutes)
            : undefined,
        instructions: segment.instructions?.trim() || undefined,
        techniques: techniques && techniques.length > 0 ? techniques : [],
      })
    })

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

    const scheduleKind = draft.schedule.kind ?? existingPlan.schedule.kind

    const preparedSegments = cleanSegments.map((segment, index) => ({
      ...segment,
      id: segment.id ?? `${draft.occurrenceId}_segment_${index + 1}`,
    }))

    const segmentDurationTotal = preparedSegments.reduce(
      (sum, segment) => sum + (segment.durationMinutes ?? 0),
      0
    )

    const resolvedDuration =
      durationMinutes && durationMinutes > 0
        ? Math.round(durationMinutes)
        : (existingPlan.schedule.durationMinutes ??
          (segmentDurationTotal > 0 ? segmentDurationTotal : undefined))

    const recurrenceInput =
      scheduleKind === 'recurring' ? draft.schedule.recurrence : undefined

    const existingRecurrenceMetadata = normalizeRecurrenceMetadata(
      (existingPlan.schedule.metadata as { recurrence?: unknown })?.recurrence
    )

    let normalizedRecurrence: NormalizedRecurrence | null = null
    if (scheduleKind === 'recurring') {
      normalizedRecurrence =
        normalizeRecurrenceDetails(recurrenceInput) ||
        parseRecurrenceRule(draft.schedule.rule) ||
        existingRecurrenceMetadata ||
        parseRecurrenceRule(existingPlan.schedule.rule)

      if (!normalizedRecurrence) {
        throw new Error('Recurring plans require a recurrence rule')
      }
    }

    const recurrenceRuleString =
      scheduleKind === 'recurring' && normalizedRecurrence
        ? buildRecurrenceRuleString(normalizedRecurrence)
        : undefined

    const existingScheduleMetadata =
      existingPlan.schedule.metadata &&
      typeof existingPlan.schedule.metadata === 'object'
        ? { ...existingPlan.schedule.metadata }
        : {}

    const scheduleMetadata: Record<string, unknown> = {
      ...existingScheduleMetadata,
      segmentsCount: preparedSegments.length,
    }

    if (scheduleKind !== 'recurring') {
      delete scheduleMetadata.recurrence
    } else if (normalizedRecurrence) {
      scheduleMetadata.recurrence = recurrenceToMetadata(normalizedRecurrence)
    }

    const scheduleEndDate =
      scheduleKind === 'recurring'
        ? (normalizeUntilValue(draft.schedule.endDate) ??
          normalizedRecurrence?.until ??
          normalizeUntilValue(existingPlan.schedule.endDate) ??
          null)
        : null

    const updatedPlan: PracticePlan = {
      ...existingPlan,
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      type: draft.type ?? existingPlan.type,
      focusAreas:
        focusAreas && focusAreas.length > 0
          ? focusAreas
          : existingPlan.focusAreas,
      techniques:
        planTechniques && planTechniques.length > 0
          ? planTechniques
          : existingPlan.techniques,
      schedule: {
        ...existingPlan.schedule,
        kind: scheduleKind,
        durationMinutes: resolvedDuration ?? undefined,
        timeOfDay: draft.schedule.timeOfDay,
        flexibility: draft.schedule.flexibility,
        startDate: draft.schedule.startDate,
        endDate: scheduleEndDate,
        target:
          scheduleKind === 'single'
            ? scheduledStart
            : existingPlan.schedule.target,
        rule: recurrenceRuleString,
        metadata: {
          ...scheduleMetadata,
        },
      },
      updatedAt: nowIso,
    }

    let recurrenceKey: string | undefined
    if (scheduleKind === 'recurring' && recurrenceRuleString) {
      recurrenceKey = buildRecurrenceKey(recurrenceRuleString, scheduledStart)
    }

    const updatedOccurrence: PlanOccurrence = {
      ...existingOccurrence,
      scheduledStart,
      scheduledEnd,
      flexWindow: draft.schedule.flexibility,
      recurrenceKey,
      segments: preparedSegments,
      reflectionPrompts,
      updatedAt: nowIso,
    }

    const sanitizedPlan = sanitizeForStorage(updatedPlan)
    const sanitizedOccurrence = sanitizeForStorage(updatedOccurrence)

    try {
      await planningApi.updatePlan(sanitizedPlan, [sanitizedOccurrence])

      const nextPlansMap = new Map(plansMap)
      const nextOccurrencesMap = new Map(occurrencesMap)

      nextPlansMap.set(sanitizedPlan.id, sanitizedPlan)
      nextOccurrencesMap.set(sanitizedOccurrence.id, sanitizedOccurrence)

      const nextPlansList = toSortedPlans(nextPlansMap)
      const nextOccurrencesList = toSortedOccurrences(nextOccurrencesMap)

      writeToStorage(PLANS_STORAGE_KEY, nextPlansList)
      writeToStorage(OCCURRENCES_STORAGE_KEY, nextOccurrencesList)

      set({
        plansMap: nextPlansMap,
        occurrencesMap: nextOccurrencesMap,
        plans: nextPlansList,
        occurrences: nextOccurrencesList,
        error: null,
      })

      return {
        plan: sanitizedPlan,
        occurrence: sanitizedOccurrence,
      }
    } catch (error) {
      console.error('[Planning] Failed to update plan:', error)
      throw error instanceof Error ? error : new Error('Failed to update plan')
    }
  },

  deletePlan: async planId => {
    const { plansMap, occurrencesMap } = get()
    const existingPlan = plansMap.get(planId)
    if (!existingPlan) {
      return
    }

    const relatedOccurrences = Array.from(occurrencesMap.values()).filter(
      occurrence => occurrence.planId === planId
    )

    try {
      await planningApi.deletePlan(existingPlan, relatedOccurrences)

      const nextPlansMap = new Map(plansMap)
      nextPlansMap.delete(planId)

      const nextOccurrencesMap = new Map(occurrencesMap)
      relatedOccurrences.forEach(occurrence => {
        nextOccurrencesMap.delete(occurrence.id)
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
      })
    } catch (error) {
      console.error('[Planning] Failed to delete plan:', error)
      throw error instanceof Error ? error : new Error('Failed to delete plan')
    }
  },

  getOccurrencePrefillData: occurrenceId => {
    const { occurrencesMap, plansMap } = get()
    const occurrence = occurrencesMap.get(occurrenceId)
    if (!occurrence) {
      return null
    }

    const plan = plansMap.get(occurrence.planId)

    const segments = serializeSegmentsForMetadata(occurrence.segments)
    const reflectionPrompts = Array.isArray(occurrence.reflectionPrompts)
      ? occurrence.reflectionPrompts.filter(
          (prompt): prompt is string =>
            typeof prompt === 'string' && prompt.trim().length > 0
        )
      : []
    const focusAreas = Array.isArray(plan?.focusAreas)
      ? (plan?.focusAreas ?? []).filter(area => area.trim().length > 0)
      : []
    const techniques = aggregateTechniques(
      plan?.techniques,
      occurrence.segments
    )

    const durationMinutes =
      plan?.schedule.durationMinutes && plan.schedule.durationMinutes > 0
        ? plan.schedule.durationMinutes
        : (() => {
            const total = sumSegmentDurations(occurrence.segments)
            return total > 0 ? total : undefined
          })()

    const pieces = collectPiecesFromSegments(occurrence.segments)

    const metadata = sanitizeMetadataRecord({
      source: 'practice_plan',
      planId: occurrence.planId,
      planOccurrenceId: occurrence.id,
      planTitle: plan?.title,
      scheduledStart: occurrence.scheduledStart ?? null,
      scheduledEnd: occurrence.scheduledEnd ?? null,
      segments,
      reflectionPrompts,
      focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
      planTechniques: techniques.length > 0 ? techniques : undefined,
      targets:
        occurrence.targets && Object.keys(occurrence.targets).length > 0
          ? occurrence.targets
          : undefined,
      occurrenceNotes: occurrence.notes ?? undefined,
    })

    return {
      planId: occurrence.planId,
      occurrenceId: occurrence.id,
      planTitle: plan?.title,
      scheduledStart: occurrence.scheduledStart ?? null,
      scheduledEnd: occurrence.scheduledEnd ?? null,
      durationMinutes,
      segments,
      reflectionPrompts,
      focusAreas,
      techniques,
      targets:
        occurrence.targets && Object.keys(occurrence.targets).length > 0
          ? occurrence.targets
          : undefined,
      pieces,
      metadata,
    }
  },

  markOccurrencePendingLog: (occurrenceId, options = {}) => {
    const { occurrencesMap } = get()
    const occurrence = occurrencesMap.get(occurrenceId)
    if (!occurrence) {
      return
    }

    const { pending = true, logEntryId } = options
    const metrics = { ...(occurrence.metrics ?? {}) }

    if (pending) {
      metrics.pendingLog = true
      if (logEntryId) {
        metrics.pendingLogEntryId = logEntryId
      }
      metrics.pendingLogUpdatedAt = new Date().toISOString()
    } else {
      delete metrics.pendingLog
      delete metrics.pendingLogEntryId
      delete metrics.pendingLogUpdatedAt
    }

    const sanitizedMetrics =
      Object.keys(metrics).length > 0 ? metrics : undefined

    const updatedOccurrence: PlanOccurrence = {
      ...occurrence,
      metrics: sanitizedMetrics,
      updatedAt: new Date().toISOString(),
    }

    const nextOccurrencesMap = new Map(occurrencesMap)
    nextOccurrencesMap.set(occurrenceId, updatedOccurrence)

    set({
      occurrencesMap: nextOccurrencesMap,
      occurrences: toSortedOccurrences(nextOccurrencesMap),
    })
  },

  completeOccurrence: async (occurrenceId, input) => {
    const { occurrencesMap, plansMap } = get()
    const occurrence = occurrencesMap.get(occurrenceId)
    if (!occurrence) {
      throw new Error('Occurrence not found')
    }

    const plan = plansMap.get(occurrence.planId)
    const nowIso = new Date().toISOString()

    const updatedOccurrence: PlanOccurrence = {
      ...occurrence,
      status: 'completed',
      logEntryId: input.logEntryId,
      checkIn: {
        recordedAt: nowIso,
        responses: input.responses,
      },
      metrics: {
        ...occurrence.metrics,
        ...input.metrics,
      },
      updatedAt: nowIso,
    }

    const sanitizedOccurrence = sanitizeForStorage(updatedOccurrence)

    try {
      await planningApi.updateOccurrence(sanitizedOccurrence)

      const nextOccurrencesMap = new Map(occurrencesMap)
      nextOccurrencesMap.set(occurrenceId, sanitizedOccurrence)

      const nextPlansMap = new Map(plansMap)
      if (plan) {
        nextPlansMap.set(occurrence.planId, {
          ...plan,
          updatedAt: nowIso,
        })
      }

      const nextPlansList = toSortedPlans(nextPlansMap)
      const nextOccurrencesList = toSortedOccurrences(nextOccurrencesMap)

      writeToStorage(PLANS_STORAGE_KEY, nextPlansList)
      writeToStorage(OCCURRENCES_STORAGE_KEY, nextOccurrencesList)

      set({
        plansMap: nextPlansMap,
        occurrencesMap: nextOccurrencesMap,
        plans: nextPlansList,
        occurrences: nextOccurrencesList,
      })
    } catch (error) {
      console.error('[Planning] Failed to complete occurrence:', error)
      throw error instanceof Error
        ? error
        : new Error('Failed to update occurrence')
    }
  },

  attachRealtimeHandlers: webSocketSync => {
    const state = get()
    if (state._wsHandlers) {
      return
    }

    const upsertPlanFromSync = (
      planData: unknown,
      occurrenceData?: unknown[]
    ) => {
      if (!planData || typeof planData !== 'object') {
        return
      }

      const sanitizedPlan = sanitizeForStorage(planData as PracticePlan)
      const sanitizedOccurrences = Array.isArray(occurrenceData)
        ? (occurrenceData
            .map(raw =>
              raw && typeof raw === 'object'
                ? sanitizeForStorage(raw as PlanOccurrence)
                : null
            )
            .filter(Boolean) as PlanOccurrence[])
        : []

      set(current => {
        const plansMap = new Map(current.plansMap)
        plansMap.set(sanitizedPlan.id, sanitizedPlan)

        const occurrencesMap = new Map(current.occurrencesMap)
        sanitizedOccurrences.forEach(occurrence => {
          occurrencesMap.set(occurrence.id, occurrence)
        })

        const plans = toSortedPlans(plansMap)
        const occurrences = toSortedOccurrences(occurrencesMap)

        writeToStorage(PLANS_STORAGE_KEY, plans)
        writeToStorage(OCCURRENCES_STORAGE_KEY, occurrences)

        return { plansMap, occurrencesMap, plans, occurrences }
      })
    }

    const completeOccurrenceFromSync = (occurrenceData: unknown) => {
      if (!occurrenceData || typeof occurrenceData !== 'object') {
        return
      }

      const sanitizedOccurrence = sanitizeForStorage(
        occurrenceData as PlanOccurrence
      )

      set(current => {
        const occurrencesMap = new Map(current.occurrencesMap)
        occurrencesMap.set(sanitizedOccurrence.id, sanitizedOccurrence)

        const plansMap = new Map(current.plansMap)
        const relatedPlan = plansMap.get(sanitizedOccurrence.planId)
        if (relatedPlan) {
          plansMap.set(sanitizedOccurrence.planId, {
            ...relatedPlan,
            updatedAt: sanitizedOccurrence.updatedAt || relatedPlan.updatedAt,
          })
        }

        const plans = toSortedPlans(plansMap)
        const occurrences = toSortedOccurrences(occurrencesMap)

        writeToStorage(PLANS_STORAGE_KEY, plans)
        writeToStorage(OCCURRENCES_STORAGE_KEY, occurrences)

        return { plansMap, occurrencesMap, plans, occurrences }
      })
    }

    const handlers = {
      planCreated: (event: SyncEvent) => {
        if (event.plan) {
          upsertPlanFromSync(event.plan, event.occurrences)
        }
      },
      planUpdated: (event: SyncEvent) => {
        if (event.plan) {
          upsertPlanFromSync(event.plan, event.occurrences)
        }
      },
      occurrenceCompleted: (event: SyncEvent) => {
        if (event.occurrence) {
          completeOccurrenceFromSync(event.occurrence)
        }
      },
    }

    webSocketSync.on('PLAN_CREATED', handlers.planCreated)
    webSocketSync.on('PLAN_UPDATED', handlers.planUpdated)
    webSocketSync.on('PLAN_OCCURRENCE_COMPLETED', handlers.occurrenceCompleted)

    set({ _wsHandlers: handlers })
  },

  detachRealtimeHandlers: webSocketSync => {
    const handlers = get()._wsHandlers
    if (!handlers) {
      return
    }

    if (handlers.planCreated) {
      webSocketSync.off('PLAN_CREATED', handlers.planCreated)
    }
    if (handlers.planUpdated) {
      webSocketSync.off('PLAN_UPDATED', handlers.planUpdated)
    }
    if (handlers.occurrenceCompleted) {
      webSocketSync.off(
        'PLAN_OCCURRENCE_COMPLETED',
        handlers.occurrenceCompleted
      )
    }

    set({ _wsHandlers: undefined })
  },
}))

const computeCompletedOccurrences = (occurrences: PlanOccurrence[]) =>
  occurrences.filter(isOccurrenceCompleted)

let completedOccurrencesCache: {
  occurrencesRef: PlanOccurrence[] | null
  result: PlanOccurrence[]
} = {
  occurrencesRef: null,
  result: [],
}

export const selectCompletedOccurrences = (
  state: PlanningState
): PlanOccurrence[] => {
  if (completedOccurrencesCache.occurrencesRef === state.occurrences) {
    return completedOccurrencesCache.result
  }

  const result = computeCompletedOccurrences(state.occurrences)
  completedOccurrencesCache = {
    occurrencesRef: state.occurrences,
    result,
  }

  return result
}

const computeDueTodayOccurrences = (
  occurrences: PlanOccurrence[],
  plansMap: Map<string, PracticePlan>,
  todayKey: string
) => {
  const referenceDateParts = todayKey.split('-').map(part => Number(part))
  const [year, month, day] = referenceDateParts
  const referenceDate =
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(year, month, day)
      : new Date()
  const { startOfDay, endOfDay } = getLocalDayBounds(referenceDate)

  return occurrences.filter(occurrence => {
    if (!isOccurrenceActionable(occurrence)) {
      return false
    }

    if (isOccurrenceCompleted(occurrence)) {
      return false
    }

    const occurrenceWindow = getOccurrenceWindow(occurrence)
    if (
      !isWithinRecurrenceWindow(
        occurrence,
        plansMap.get(occurrence.planId),
        occurrenceWindow
      )
    ) {
      return false
    }

    if (!occurrenceWindow) {
      return true
    }

    return (
      occurrenceWindow.start.getTime() <= endOfDay.getTime() &&
      occurrenceWindow.end.getTime() >= startOfDay.getTime()
    )
  })
}

let dueTodayCache: {
  occurrencesRef: PlanOccurrence[] | null
  plansMapRef: Map<string, PracticePlan> | null
  dayKey: string | null
  result: PlanOccurrence[]
} = {
  occurrencesRef: null,
  plansMapRef: null,
  dayKey: null,
  result: [],
}

export const selectDueTodayOccurrences = (
  state: PlanningState
): PlanOccurrence[] => {
  const todayKey = getLocalDayKey(new Date())

  if (
    dueTodayCache.occurrencesRef === state.occurrences &&
    dueTodayCache.plansMapRef === state.plansMap &&
    dueTodayCache.dayKey === todayKey
  ) {
    return dueTodayCache.result
  }

  const result = computeDueTodayOccurrences(
    state.occurrences,
    state.plansMap,
    todayKey
  )

  dueTodayCache = {
    occurrencesRef: state.occurrences,
    plansMapRef: state.plansMap,
    dayKey: todayKey,
    result,
  }

  return result
}

const computeUpcomingOccurrences = (
  occurrences: PlanOccurrence[],
  plansMap: Map<string, PracticePlan>,
  todayKey: string
) => {
  const referenceDateParts = todayKey.split('-').map(part => Number(part))
  const [year, month, day] = referenceDateParts
  const referenceDate =
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(year, month, day)
      : new Date()
  const { endOfDay } = getLocalDayBounds(referenceDate)

  return occurrences.filter(occurrence => {
    if (!isOccurrenceActionable(occurrence)) {
      return false
    }

    if (isOccurrenceCompleted(occurrence)) {
      return false
    }

    const occurrenceWindow = getOccurrenceWindow(occurrence)
    if (
      !isWithinRecurrenceWindow(
        occurrence,
        plansMap.get(occurrence.planId),
        occurrenceWindow
      )
    ) {
      return false
    }

    if (!occurrenceWindow) {
      return false
    }

    return occurrenceWindow.start.getTime() > endOfDay.getTime()
  })
}

let upcomingCache: {
  occurrencesRef: PlanOccurrence[] | null
  plansMapRef: Map<string, PracticePlan> | null
  dayKey: string | null
  result: PlanOccurrence[]
} = {
  occurrencesRef: null,
  plansMapRef: null,
  dayKey: null,
  result: [],
}

export const selectUpcomingOccurrences = (
  state: PlanningState
): PlanOccurrence[] => {
  const todayKey = getLocalDayKey(new Date())

  if (
    upcomingCache.occurrencesRef === state.occurrences &&
    upcomingCache.plansMapRef === state.plansMap &&
    upcomingCache.dayKey === todayKey
  ) {
    return upcomingCache.result
  }

  const result = computeUpcomingOccurrences(
    state.occurrences,
    state.plansMap,
    todayKey
  )

  upcomingCache = {
    occurrencesRef: state.occurrences,
    plansMapRef: state.plansMap,
    dayKey: todayKey,
    result,
  }

  return result
}

let nextActionableCache: {
  occurrencesRef: PlanOccurrence[] | null
  plansMapRef: Map<string, PracticePlan> | null
  minuteKey: string | null
  result: PlanOccurrence | undefined
} = {
  occurrencesRef: null,
  plansMapRef: null,
  minuteKey: null,
  result: undefined,
}

export const selectNextActionableOccurrence = (
  state: PlanningState
): PlanOccurrence | undefined => {
  const minuteKey = getCurrentMinuteKey(new Date())

  if (
    nextActionableCache.occurrencesRef === state.occurrences &&
    nextActionableCache.plansMapRef === state.plansMap &&
    nextActionableCache.minuteKey === minuteKey
  ) {
    return nextActionableCache.result
  }

  const dueToday = selectDueTodayOccurrences(state)
  const upcoming = selectUpcomingOccurrences(state)
  const now = Date.now()

  const nextDue = dueToday.find(occurrence => {
    const window = getOccurrenceWindow(occurrence)
    if (!window) {
      return true
    }

    return window.end.getTime() >= now
  })

  const result = nextDue ?? upcoming[0]

  nextActionableCache = {
    occurrencesRef: state.occurrences,
    plansMapRef: state.plansMap,
    minuteKey,
    result,
  }

  return result
}

export const useCompletedOccurrences = () =>
  usePlanningStore(selectCompletedOccurrences)

export const useDueTodayOccurrences = () =>
  usePlanningStore(selectDueTodayOccurrences)

export const useUpcomingOccurrences = () =>
  usePlanningStore(selectUpcomingOccurrences)

export const useNextActionableOccurrence = () =>
  usePlanningStore(selectNextActionableOccurrence)
