import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../../types'
import { authMiddleware, requireAuth } from '../../middleware/auth'
import { validateBody, validateQuery, commonSchemas } from '../../middleware/validation'
import { standardRateLimiter } from '../../middleware/rate-limit'
import { cachePresets } from '../../middleware/cache'
import { ExampleService } from '../../services/example.service'
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
} from '../../utils/response'

/**
 * Example API routes
 * Shows common patterns for CRUD operations
 */
export const exampleRoutes = new Hono<{ Bindings: Env }>()

// Apply middleware to all routes
exampleRoutes.use('*', authMiddleware)
exampleRoutes.use('*', standardRateLimiter)

/**
 * Validation schemas
 */
const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
})

const updateItemSchema = createItemSchema.partial()

const itemIdSchema = z.object({
  id: z.string().uuid(),
})

/**
 * GET /api/items
 * List items with pagination
 */
exampleRoutes.get(
  '/',
  validateQuery(
    commonSchemas.pagination.extend({
      status: z.string().optional(),
    })
  ),
  cachePresets.api,
  async c => {
    const userId = requireAuth(c)
    const query = c.get('validatedQuery')

    const service = new ExampleService(c.env.DB)
    const result = await service.listItems(userId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    })

    return paginatedResponse(c, result.items, {
      page: query.page,
      limit: query.limit,
      total: result.total,
    })
  }
)

/**
 * GET /api/items/:id
 * Get single item by ID
 */
exampleRoutes.get('/:id', validateParams(itemIdSchema), cachePresets.api, async c => {
  const userId = requireAuth(c)
  const { id } = c.get('validatedParams')

  const service = new ExampleService(c.env.DB)
  const item = await service.getItemById(id, userId)

  if (!item) {
    return errorResponse(c, 'Item not found', 404)
  }

  return successResponse(c, item)
})

/**
 * POST /api/items
 * Create new item
 */
exampleRoutes.post('/', validateBody(createItemSchema), async c => {
  const userId = requireAuth(c)
  const data = c.get('validatedBody')

  const service = new ExampleService(c.env.DB)
  const item = await service.createItem(userId, {
    ...data,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
  })

  return createdResponse(c, item, `/api/items/${item.id}`)
})

/**
 * PUT /api/items/:id
 * Update item
 */
exampleRoutes.put('/:id', validateParams(itemIdSchema), validateBody(updateItemSchema), async c => {
  const userId = requireAuth(c)
  const { id } = c.get('validatedParams')
  const data = c.get('validatedBody')

  const service = new ExampleService(c.env.DB)
  const item = await service.updateItem(id, userId, {
    ...data,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
  })

  if (!item) {
    return errorResponse(c, 'Item not found', 404)
  }

  return successResponse(c, item, 'Item updated successfully')
})

/**
 * DELETE /api/items/:id
 * Delete item
 */
exampleRoutes.delete('/:id', validateParams(itemIdSchema), async c => {
  const userId = requireAuth(c)
  const { id } = c.get('validatedParams')

  const service = new ExampleService(c.env.DB)
  const deleted = await service.deleteItem(id, userId)

  if (!deleted) {
    return errorResponse(c, 'Item not found', 404)
  }

  return noContentResponse(c)
})

/**
 * GET /api/items/search
 * Search items
 */
exampleRoutes.get(
  '/search',
  validateQuery(
    z.object({
      q: z.string().min(1),
      limit: z.coerce.number().int().positive().max(50).default(10),
    })
  ),
  cachePresets.api,
  async c => {
    const userId = requireAuth(c)
    const { q, limit } = c.get('validatedQuery')

    const service = new ExampleService(c.env.DB)
    const items = await service.searchItems(userId, q, limit)

    return successResponse(c, items)
  }
)

/**
 * POST /api/items/bulk-update
 * Bulk update item status
 */
exampleRoutes.post(
  '/bulk-update',
  validateBody(
    z.object({
      itemIds: z.array(z.string().uuid()),
      status: z.enum(['active', 'inactive', 'archived']),
    })
  ),
  async c => {
    const userId = requireAuth(c)
    const { itemIds, status } = c.get('validatedBody')

    if (itemIds.length > 100) {
      return errorResponse(c, 'Cannot update more than 100 items at once', 400)
    }

    const service = new ExampleService(c.env.DB)
    const updated = await service.bulkUpdateStatus(userId, itemIds, status)

    return successResponse(c, { updated }, `Updated ${updated} items`)
  }
)
