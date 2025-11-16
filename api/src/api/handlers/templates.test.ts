import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types'
import { templatesHandler } from './templates'
import type { Env } from '../../index'
import type { Variables } from '../middleware'

const createTemplateRecord = () => ({
  id: 'template_123',
  authorId: 'author_abc',
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
  metadata: { difficulty: 'beginner' },
  publishedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deletedAt: null,
})

const { mockDbHelpersInstance, mockDatabaseHelpers, mockCalculateChecksum } =
  vi.hoisted(() => {
    const mockDbHelpersInstance = {
      upsertSyncData: vi.fn(),
    }

    return {
      mockDbHelpersInstance,
      mockDatabaseHelpers: vi.fn(() => mockDbHelpersInstance),
      mockCalculateChecksum: vi.fn().mockResolvedValue('checksum'),
    }
  })

vi.mock('../../utils/database', () => ({
  DatabaseHelpers: mockDatabaseHelpers,
  calculateChecksum: mockCalculateChecksum,
}))

vi.mock('../middleware', () => ({
  authMiddleware: (c: unknown, next: () => Promise<void>) => {
    ;(c as any).set('userId', 'user_123')
    return next()
  },
  validateBody: () => async (c: unknown, next: () => Promise<void>) => {
    const body = await (c as any).req.json()
    ;(c as any).set('validatedBody', body)
    return next()
  },
}))

describe('templatesHandler', () => {
  let app: Hono<{ Bindings: Env; Variables: Variables }>
  let mockPrepare: ReturnType<typeof vi.fn>
  let templateFromDb = createTemplateRecord()

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

    const mockFirst = vi.fn().mockResolvedValue({
      data: JSON.stringify(templateFromDb),
    })
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst })
    mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })

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
    const payload = (await res.json()) as any

    expect(payload?.plan?.sourceTemplateId).toBe(templateFromDb.id)
    expect(payload?.plan?.metadata?.adoptedFrom).toBe(templateFromDb.id)

    const savedPlan = mockDbHelpersInstance.upsertSyncData.mock.calls[0][0]
      .data as { sourceTemplateId?: string }
    expect(savedPlan.sourceTemplateId).toBe(templateFromDb.id)
  })
})
