import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types'
import { templatesHandler } from './templates'
import type { Env } from '../../index'
import type { Variables } from '../middleware'

const createTemplateRecord = () => ({
  id: 'template_123',
  authorId: 'author_abc',
  sourcePlanId: 'plan_original',
  title: 'Morning Warmup',
  description: 'A simple routine',
  type: 'custom' as const,
  focusAreas: ['tone'],
  techniques: ['staccato'],
  pieceRefs: [],
  schedule: {
    kind: 'single' as const,
    durationMinutes: 30,
    timeOfDay: '09:00',
    flexibility: 'fixed' as const,
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: null,
  },
  tags: ['warmup'],
  templateVersion: 1,
  visibility: 'public',
  adoptionCount: 3,
  metadata: {
    difficulty: 'beginner',
    preview: {
      segments: [
        {
          label: 'Preview Warmup',
          durationMinutes: 5,
          techniques: ['staccato'],
          instructions: 'Use light articulation',
          tempoTargets: { targetBpm: 80 },
        },
      ],
    },
  },
  publishedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deletedAt: null,
})

const createPlanOccurrenceRecord = () => ({
  id: 'plan_occ_original',
  planId: 'plan_original',
  user_id: 'author_abc',
  scheduledStart: '2024-01-02T09:00:00.000Z',
  scheduledEnd: '2024-01-02T09:30:00.000Z',
  flexWindow: null,
  recurrenceKey: null,
  segments: [
    {
      label: 'Canonical Warmup',
      durationMinutes: 15,
      techniques: ['legato'],
      instructions: 'Use connected sound',
      tempoTargets: { targetBpm: 95 },
    },
  ],
  targets: {},
  reflectionPrompts: [],
  status: 'scheduled' as const,
  logEntryId: null,
  checkIn: undefined,
  notes: null,
  reminderState: undefined,
  metrics: {},
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  deletedAt: null,
})

const { mockDbHelpersInstance, mockDatabaseHelpers, mockCalculateChecksum } =
  vi.hoisted(() => {
    const mockDbHelpersInstance = {
      upsertSyncData: vi.fn(),
    }

    return {
      mockDbHelpersInstance,
      mockDatabaseHelpers: vi.fn(function () {
        return mockDbHelpersInstance
      }),
      mockCalculateChecksum: vi.fn().mockResolvedValue('checksum'),
    }
  })

vi.mock('../../utils/database', () => ({
  DatabaseHelpers: mockDatabaseHelpers,
  calculateChecksum: mockCalculateChecksum,
}))

vi.mock('../middleware', () => ({
  authMiddleware: (c: unknown, next: () => Promise<void>) => {
    ;(c as { set: (key: string, value: unknown) => void }).set(
      'userId',
      'user_123'
    )
    return next()
  },
  validateBody: () => async (c: unknown, next: () => Promise<void>) => {
    const context = c as {
      req: { json: () => Promise<unknown> }
      set: (key: string, value: unknown) => void
    }
    const body = await context.req.json()
    context.set('validatedBody', body)
    return next()
  },
}))

describe('templatesHandler', () => {
  let app: Hono<{ Bindings: Env; Variables: Variables }>
  let mockPrepare: ReturnType<typeof vi.fn>
  let templateFromDb = createTemplateRecord()
  let planOccurrencesFromDb: { data: string }[]

  const createEnv = () => ({
    DB: { prepare: mockPrepare } as unknown as D1Database,
    ENVIRONMENT: 'test',
    JWT_SECRET: 'jwt-secret',
    MAGIC_LINK_SECRET: 'magic-secret',
    GOOGLE_CLIENT_ID: 'google-client',
    GOOGLE_CLIENT_SECRET: 'google-secret',
    RESEND_API_KEY: 'resend',
    MUSIC_CATALOG: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as KVNamespace,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockDbHelpersInstance.upsertSyncData.mockReset()
    mockDbHelpersInstance.upsertSyncData.mockResolvedValue({
      id: 'sync-id',
      entity_id: 'entity-id',
      action: 'created',
    })
    mockCalculateChecksum.mockResolvedValue('checksum')
    templateFromDb = createTemplateRecord()
    planOccurrencesFromDb = []

    const mockFirst = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ data: JSON.stringify(templateFromDb) })
      )
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst })
    const mockAll = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ results: planOccurrencesFromDb })
      )
    const mockBindOccurrences = vi.fn().mockReturnValue({ all: mockAll })
    mockPrepare = vi.fn().mockImplementation((query: string) => {
      if (query.includes("json_extract(data, '$.planId')")) {
        return { bind: mockBindOccurrences }
      }
      return { bind: mockBind }
    })

    app = new Hono<{ Bindings: Env; Variables: Variables }>()
    app.route('/api/templates', templatesHandler)
  })

  it('includes sourceTemplateId when adopting a template', async () => {
    const req = new Request('http://localhost/api/templates/adopt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ templateId: templateFromDb.id }),
    })

    const res = await app.fetch(req, createEnv())

    expect(res.status).toBe(200)
    const payload = (await res.json()) as Record<
      string,
      Record<string, unknown>
    >

    expect(payload?.plan?.sourceTemplateId).toBe(templateFromDb.id)
    expect(
      (payload?.plan?.metadata as Record<string, unknown>)?.adoptedFrom
    ).toBe(templateFromDb.id)

    const savedPlan = mockDbHelpersInstance.upsertSyncData.mock.calls[0][0]
      .data as { sourceTemplateId?: string }
    expect(savedPlan.sourceTemplateId).toBe(templateFromDb.id)
  })

  it('populates adopted occurrence segments from template preview metadata', async () => {
    // Remove canonical data to force preview usage
    planOccurrencesFromDb = []
    templateFromDb.metadata = {
      difficulty: 'beginner',
      preview: {
        segments: [
          {
            label: 'Preview Warmup',
            durationMinutes: 10,
            techniques: ['staccato', 'spiccato'],
            instructions: 'Light bow strokes',
            tempoTargets: { targetBpm: 88 },
          },
        ],
      },
    }

    const req = new Request('http://localhost/api/templates/adopt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ templateId: templateFromDb.id }),
    })

    const res = await app.fetch(req, createEnv())

    expect(res.status).toBe(200)
    const payload = (await res.json()) as Record<
      string,
      Array<Record<string, unknown>>
    >

    expect(payload.occurrences[0].segments).toMatchObject([
      {
        label: 'Preview Warmup',
        durationMinutes: 10,
        techniques: ['staccato', 'spiccato'],
        instructions: 'Light bow strokes',
        tempoTargets: { targetBpm: 88 },
      },
    ])

    const occurrenceCall = mockDbHelpersInstance.upsertSyncData.mock.calls.find(
      call => call[0].entityType === 'plan_occurrence'
    )

    expect(occurrenceCall?.[0].data.segments).toEqual(
      payload.occurrences[0].segments
    )
  })

  it('prefers canonical source plan segments when available', async () => {
    templateFromDb.metadata = {
      difficulty: 'beginner',
      preview: {
        segments: [
          {
            label: 'Preview Warmup',
            durationMinutes: 10,
            techniques: ['balance'],
            instructions: 'Preview instructions',
            tempoTargets: { targetBpm: 88 },
          },
        ],
      },
    }

    planOccurrencesFromDb = [
      { data: JSON.stringify(createPlanOccurrenceRecord()) },
    ]

    const req = new Request('http://localhost/api/templates/adopt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ templateId: templateFromDb.id }),
    })

    const res = await app.fetch(req, createEnv())

    expect(res.status).toBe(200)
    const payload = (await res.json()) as Record<
      string,
      Array<Record<string, unknown>>
    >

    expect(payload.occurrences[0].segments).toMatchObject([
      {
        label: 'Canonical Warmup',
        durationMinutes: 15,
        instructions: 'Use connected sound',
        tempoTargets: { targetBpm: 95 },
        techniques: ['legato'],
      },
    ])
  })
})
