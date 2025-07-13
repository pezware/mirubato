import type { Context } from 'hono'
import type { ApiResponse } from '../types'

/**
 * Standard success response
 */
export function successResponse<T>(c: Context, data: T, message?: string, status = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  }
  return c.json(response, status)
}

/**
 * Standard error response
 */
export function errorResponse(
  c: Context,
  error: string,
  status = 400,
  details?: unknown
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    ...(details && { details }),
  }
  return c.json(response, status)
}

/**
 * Paginated response
 */
export function paginatedResponse<T>(
  c: Context,
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
  }
): Response {
  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return c.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  })
}

/**
 * No content response
 */
export function noContentResponse(c: Context): Response {
  return c.body(null, 204)
}

/**
 * Created response
 */
export function createdResponse<T>(c: Context, data: T, location?: string): Response {
  if (location) {
    c.header('Location', location)
  }
  return successResponse(c, data, 'Created successfully', 201)
}

/**
 * Accepted response (for async operations)
 */
export function acceptedResponse(
  c: Context,
  taskId?: string,
  message = 'Request accepted for processing'
): Response {
  return c.json(
    {
      success: true,
      message,
      ...(taskId && { taskId }),
    },
    202
  )
}
