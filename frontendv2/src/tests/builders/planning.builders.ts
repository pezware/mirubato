import type {
  PracticePlan,
  PlanOccurrence,
  PlanSegment,
  PlanPieceRef,
  PracticePlanSchedule,
  PlanCheckIn,
  PlanTargets,
} from '@/api/planning'
import type { CreatePlanDraft } from '@/stores/planningStore'

/**
 * Test data builders for Practice Planning feature
 * Use these builders to create valid test data with sensible defaults
 */

let idCounter = 1

// Helper to generate unique IDs for tests
const generateId = (prefix: string) => {
  return `${prefix}_test_${idCounter++}`
}

// Helper to get ISO date string
const getISODate = (daysFromNow = 0): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString()
}

/**
 * Build a PlanPieceRef with defaults
 */
export const buildPlanPieceRef = (
  overrides?: Partial<PlanPieceRef>
): PlanPieceRef => ({
  scoreId: generateId('score'),
  title: 'Test Piece',
  composer: 'Test Composer',
  ...overrides,
})

/**
 * Build a PlanSegment with defaults
 */
export const buildPlanSegment = (
  overrides?: Partial<PlanSegment>
): PlanSegment => ({
  id: generateId('segment'),
  label: 'Warm-up',
  durationMinutes: 10,
  pieceRefs: [],
  techniques: ['scales', 'arpeggios'],
  instructions: 'Start slowly and gradually increase tempo',
  tempoTargets: {
    start: 60,
    end: 120,
  },
  metadata: {},
  ...overrides,
})

/**
 * Build a PracticePlanSchedule with defaults
 */
export const buildPlanSchedule = (
  overrides?: Partial<PracticePlanSchedule>
): PracticePlanSchedule => ({
  kind: 'single',
  durationMinutes: 30,
  timeOfDay: '18:00',
  flexibility: 'same-day',
  startDate: getISODate(1),
  endDate: null,
  target: getISODate(1),
  metadata: {},
  ...overrides,
})

/**
 * Build a recurring schedule
 */
export const buildRecurringSchedule = (
  overrides?: Partial<PracticePlanSchedule>
): PracticePlanSchedule => ({
  kind: 'recurring',
  rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  durationMinutes: 45,
  timeOfDay: '18:00',
  flexibility: 'same-day',
  startDate: getISODate(1),
  endDate: getISODate(90), // 3 months
  metadata: {
    frequency: 'weekly',
    daysOfWeek: ['monday', 'wednesday', 'friday'],
  },
  ...overrides,
})

/**
 * Build a PracticePlan with defaults
 */
export const buildPracticePlan = (
  overrides?: Partial<PracticePlan>
): PracticePlan => {
  const now = getISODate()
  const id = generateId('plan')

  return {
    id,
    user_id: 'user_test_123',
    title: 'Daily Practice Routine',
    description: 'A comprehensive daily practice plan for intermediate level',
    type: 'custom',
    focusAreas: ['technique', 'sight-reading'],
    techniques: ['scales', 'arpeggios', 'sight-reading'],
    pieceRefs: [buildPlanPieceRef()],
    schedule: buildPlanSchedule(),
    visibility: 'private',
    status: 'active',
    ownerId: 'user_test_123',
    templateVersion: undefined,
    tags: ['daily', 'intermediate'],
    metadata: {
      level: 'intermediate',
      estimatedWeeks: 12,
    },
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

/**
 * Build a PlanCheckIn with defaults
 */
export const buildPlanCheckIn = (
  overrides?: Partial<PlanCheckIn>
): PlanCheckIn => ({
  recordedAt: getISODate(),
  responses: {
    'How did the warm-up feel?': 'Good, fingers were responsive',
    'Any tension areas?': 'Slight tension in left shoulder',
  },
  ...overrides,
})

/**
 * Build PlanTargets with defaults
 */
export const buildPlanTargets = (
  overrides?: Partial<PlanTargets>
): PlanTargets => ({
  tempo: 120,
  accuracy: 95,
  duration: 30,
  ...overrides,
})

/**
 * Build a PlanOccurrence with defaults
 */
export const buildPlanOccurrence = (
  overrides?: Partial<PlanOccurrence>
): PlanOccurrence => {
  const id = generateId('occ')
  const now = getISODate()
  const scheduledStart = getISODate(1)
  const scheduledEnd = new Date(scheduledStart)
  scheduledEnd.setMinutes(scheduledEnd.getMinutes() + 30)

  return {
    id,
    planId: generateId('plan'),
    user_id: 'user_test_123',
    scheduledStart,
    scheduledEnd: scheduledEnd.toISOString(),
    flexWindow: 'same-day',
    recurrenceKey: null,
    segments: [
      buildPlanSegment({ label: 'Warm-up', durationMinutes: 5 }),
      buildPlanSegment({ label: 'Technical Work', durationMinutes: 15 }),
      buildPlanSegment({ label: 'Repertoire', durationMinutes: 10 }),
    ],
    targets: buildPlanTargets(),
    reflectionPrompts: [
      'How did the practice session feel overall?',
      'What areas need more focus tomorrow?',
    ],
    status: 'scheduled',
    logEntryId: null,
    checkIn: undefined,
    notes: null,
    reminderState: undefined,
    metrics: undefined,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

/**
 * Build a completed occurrence
 */
export const buildCompletedOccurrence = (
  overrides?: Partial<PlanOccurrence>
): PlanOccurrence => {
  return buildPlanOccurrence({
    status: 'completed',
    logEntryId: generateId('log'),
    checkIn: buildPlanCheckIn(),
    metrics: {
      actualDuration: 35,
      completedSegments: 3,
      tempoAchieved: 115,
    },
    ...overrides,
  })
}

/**
 * Build a CreatePlanDraft for store operations
 */
export const buildCreatePlanDraft = (
  overrides?: Partial<CreatePlanDraft>
): CreatePlanDraft => ({
  title: 'New Practice Plan',
  description: 'A new practice plan for testing',
  schedule: {
    kind: 'single',
    startDate: getISODate(1).split('T')[0], // Just the date part
    timeOfDay: '18:00',
    durationMinutes: 30,
    flexibility: 'same-day',
    endDate: null,
  },
  segments: [
    {
      label: 'Warm-up',
      durationMinutes: 10,
      instructions: 'Start slowly',
      techniques: ['scales'],
    },
    {
      label: 'Main Practice',
      durationMinutes: 20,
      instructions: 'Focus on difficult passages',
      techniques: ['sight-reading'],
    },
  ],
  reflectionPrompts: ['How did it go?', 'What to improve next time?'],
  focusAreas: ['technique'],
  techniques: ['scales', 'sight-reading'],
  type: 'custom',
  ...overrides,
})

/**
 * Build a set of plans with occurrences for testing lists
 */
export const buildPlanWithOccurrences = (
  planOverrides?: Partial<PracticePlan>,
  occurrenceCount = 3
): {
  plan: PracticePlan
  occurrences: PlanOccurrence[]
} => {
  const plan = buildPracticePlan(planOverrides)
  const occurrences: PlanOccurrence[] = []

  for (let i = 0; i < occurrenceCount; i++) {
    const scheduledStart = getISODate(i * 7) // Weekly occurrences
    const scheduledEnd = new Date(scheduledStart)
    scheduledEnd.setMinutes(scheduledEnd.getMinutes() + 30)

    occurrences.push(
      buildPlanOccurrence({
        planId: plan.id,
        scheduledStart,
        scheduledEnd: scheduledEnd.toISOString(),
        status: i === 0 ? 'scheduled' : i === 1 ? 'completed' : 'scheduled',
        recurrenceKey:
          plan.schedule.kind === 'recurring' ? scheduledStart : null,
      })
    )
  }

  return { plan, occurrences }
}

/**
 * Build test data for a full planning scenario
 */
export const buildPlanningScenario = () => {
  const userId = 'user_test_123'

  // Create multiple plans with different characteristics
  const dailyPractice = buildPlanWithOccurrences(
    {
      id: 'plan_daily',
      user_id: userId,
      title: 'Daily Technical Practice',
      schedule: buildRecurringSchedule({
        rule: 'FREQ=DAILY',
        durationMinutes: 30,
      }),
      type: 'custom',
      status: 'active',
    },
    7 // One week of occurrences
  )

  const weeklyLesson = buildPlanWithOccurrences(
    {
      id: 'plan_weekly',
      user_id: userId,
      title: 'Weekly Lesson Preparation',
      schedule: buildRecurringSchedule({
        rule: 'FREQ=WEEKLY;BYDAY=SA',
        durationMinutes: 60,
      }),
      type: 'course',
      status: 'active',
    },
    4 // One month of occurrences
  )

  const bootcamp = buildPlanWithOccurrences(
    {
      id: 'plan_bootcamp',
      user_id: userId,
      title: '30-Day Technique Bootcamp',
      description: 'Intensive technique improvement program',
      schedule: buildPlanSchedule({
        startDate: getISODate(-15), // Started 15 days ago
        endDate: getISODate(15), // Ends in 15 days
      }),
      type: 'bootcamp',
      status: 'active',
    },
    30 // Full bootcamp
  )

  return {
    plans: [dailyPractice.plan, weeklyLesson.plan, bootcamp.plan],
    occurrences: [
      ...dailyPractice.occurrences,
      ...weeklyLesson.occurrences,
      ...bootcamp.occurrences,
    ],
    userId,
  }
}

// Reset ID counter for test isolation
export const resetIdCounter = () => {
  idCounter = 1
}
