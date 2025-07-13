import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../types'

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error, c: Context<{ Bindings: Env }>) => {
  // Log error details
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  }

  if (c.env.LOG_LEVEL === 'debug') {
    console.error('Error details:', errorDetails)
  } else {
    console.error(`Error: ${err.message} at ${c.req.method} ${c.req.path}`)
  }

  // Handle HTTPException
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: err.message,
        code: err.status,
      },
      err.status
    )
  }

  // Handle validation errors
  if (err.name === 'ZodError') {
    return c.json(
      {
        success: false,
        error: 'Validation failed',
        details: JSON.parse(err.message),
      },
      400
    )
  }

  // Handle database errors
  if (err.message.includes('D1_ERROR')) {
    return c.json(
      {
        success: false,
        error: 'Database error',
        message:
          c.env.ENVIRONMENT === 'production'
            ? 'An error occurred while processing your request'
            : err.message,
      },
      500
    )
  }

  // Default error response
  const isDevelopment = c.env.ENVIRONMENT !== 'production'
  return c.json(
    {
      success: false,
      error: 'Internal server error',
      message: isDevelopment ? err.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: err.stack }),
    },
    500
  )
}
