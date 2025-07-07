// Example: Integrating monitoring into the Scores worker
// This shows how to add monitoring to the scores service

import { createMonitor, BatchMetricWriter } from '@shared/monitoring'

// Example integration for the Scores worker
export function addMonitoringToScoresWorker() {
  return {
    async fetch(request: Request, env: any): Promise<Response> {
      const monitor = createMonitor(env, request)
      const startTime = Date.now()
      const batchWriter = new BatchMetricWriter(monitor)

      try {
        const url = new URL(request.url)
        const pathname = url.pathname

        // Track different types of score operations
        if (pathname.includes('/render')) {
          batchWriter.add('performance', {
            index: 'performance:pdf_render',
            blobs: {
              operation: 'pdf_render',
              worker: 'scores',
            },
            doubles: {
              start_time: startTime,
            },
          })
        }

        // Your existing scores logic here
        const response = await handleScoresRequest(request, env)

        // Track completion
        const responseTime = Date.now() - startTime
        await monitor.trackRequest(response.status, responseTime, {
          path: pathname,
          method: request.method,
          worker: 'scores',
        })

        // Track resource usage
        if (pathname.includes('/render')) {
          await monitor.trackResource('browser_api', 1, { worker: 'scores' })
          await monitor.trackPerformance('pdf_render', responseTime, {
            worker: 'scores',
            pages: response.headers.get('x-page-count') || '1',
          })
        }

        if (pathname.includes('/ai')) {
          const tokens = parseInt(response.headers.get('x-ai-tokens') || '0')
          await monitor.trackResource('ai_operations', tokens, {
            worker: 'scores',
          })
        }

        // Track R2 operations
        if (request.method === 'GET' && response.status === 200) {
          await monitor.trackResource('r2_operations', 1, {
            worker: 'scores',
            operation: 'get',
          })
        }

        // Flush batch metrics
        await batchWriter.flush()

        return response
      } catch (error) {
        await monitor.trackError(error as Error, {
          worker: 'scores',
          url: request.url,
          method: request.method,
        })

        return new Response('Internal Server Error', { status: 500 })
      }
    },
  }
}

// Helper function (placeholder for actual scores logic)
async function handleScoresRequest(
  request: Request,
  env: any
): Promise<Response> {
  // This would be your actual scores worker logic
  return new Response('Score rendered', {
    status: 200,
    headers: {
      'x-page-count': '5',
      'x-ai-tokens': '150',
    },
  })
}

// Example: Monitoring heavy operations with sampling
export async function monitorPDFGeneration(
  monitor: any,
  scoreId: string,
  pageCount: number
) {
  const startTime = Date.now()

  try {
    // Your PDF generation logic here
    await generatePDF(scoreId)

    const duration = Date.now() - startTime

    // Sample based on duration - track all slow operations
    const sampleRate = duration > 5000 ? 1.0 : 0.1

    await monitor.trackPerformance('pdf_generation', duration, {
      worker: 'scores',
      score_id: scoreId,
      pages: pageCount.toString(),
      sample: sampleRate,
    })

    // Track business metric
    await monitor.trackBusiness('scores_generated', 1, {
      type: 'pdf',
      pages: pageCount.toString(),
    })
  } catch (error) {
    await monitor.trackError(error as Error, {
      operation: 'pdf_generation',
      score_id: scoreId,
    })
    throw error
  }
}

// Placeholder function
async function generatePDF(scoreId: string): Promise<void> {
  // PDF generation logic
}
