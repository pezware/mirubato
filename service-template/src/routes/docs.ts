import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Env } from '../types'

/**
 * OpenAPI documentation generator
 */
export function docsRoute(c: any) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Mirubato Service API',
      version: '1.0.0',
      description: 'API documentation for Mirubato microservice',
    },
    servers: [
      {
        url: c.req.url.replace('/docs', ''),
        description: 'Current server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          description: 'Comprehensive health check endpoint',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                      timestamp: { type: 'string', format: 'date-time' },
                      version: { type: 'string' },
                      environment: { type: 'string' },
                      checks: {
                        type: 'object',
                        properties: {
                          database: { type: 'boolean' },
                          cache: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '503': {
              description: 'Service is unhealthy',
            },
          },
        },
      },
      '/livez': {
        get: {
          summary: 'Liveness probe',
          description: 'Simple check that service is running',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is alive',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['ok'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/readyz': {
        get: {
          summary: 'Readiness probe',
          description: 'Check if service can handle requests',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is ready',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['ready'] },
                    },
                  },
                },
              },
            },
            '503': {
              description: 'Service is not ready',
            },
          },
        },
      },
      '/metrics': {
        get: {
          summary: 'Prometheus metrics',
          description: 'Metrics endpoint in Prometheus format',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Metrics in Prometheus format',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
  }

  return c.json(spec)
}

/**
 * Example of using OpenAPIHono for type-safe routes
 */
export const createTypedRoute = () => {
  const route = createRoute({
    method: 'get',
    path: '/api/example/{id}',
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
      query: z.object({
        include: z.string().optional(),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              id: z.string(),
              name: z.string(),
              createdAt: z.string(),
            }),
          },
        },
        description: 'Success',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: 'Not found',
      },
    },
  })

  return route
}
