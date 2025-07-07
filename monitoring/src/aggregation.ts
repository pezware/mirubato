import { Monitor, CLOUDFLARE_COSTS, calculateCost } from '@shared/monitoring'
import type { Env, MetricData, CostData } from './types'
import { checkAlertRules } from './alerts'

// Aggregate metrics from Analytics Engine
export async function aggregateRecentMetrics(env: Env, monitor: Monitor) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const now = new Date()

  try {
    // Query Analytics Engine for recent metrics
    // Note: This is a simplified query structure as the actual Analytics Engine SQL API
    // may have different syntax. Adjust based on Cloudflare's documentation.
    const metricsData: MetricData[] = [
      // This would be replaced with actual Analytics Engine query results
      // For now, we'll simulate some data
    ]

    // In production, you would use the Analytics Engine SQL API:
    // const results = await env.ANALYTICS.query(...)

    // Store in D1 for historical tracking
    const stmt = env.DB.prepare(`
      INSERT INTO metrics_hourly (timestamp, worker, metric, count, sum, min, max, p50, p95, p99)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const batch = []
    for (const row of metricsData) {
      batch.push(
        stmt.bind(
          now.toISOString(),
          row.worker,
          row.event,
          row.count,
          row.avg_response_time * row.count,
          row.min_response_time,
          row.max_response_time,
          row.p50,
          row.p95,
          row.p99
        )
      )
    }

    if (batch.length > 0) {
      await env.DB.batch(batch)
    }

    // Cache current metrics in KV for fast access
    await env.METRICS_CACHE.put(
      'current_metrics',
      JSON.stringify({
        timestamp: now.toISOString(),
        metrics: metricsData,
      }),
      { expirationTtl: 300 } // 5 minutes
    )

    // Check for alerts
    await checkAlertRules(env, metricsData)

    // Track successful aggregation
    await monitor.trackBusiness('metrics_aggregated', batch.length, {
      worker: 'monitoring',
    })
  } catch (error) {
    await monitor.trackError(error as Error, {
      operation: 'aggregateRecentMetrics',
      worker: 'monitoring',
    })
    throw error
  }
}

// Calculate costs based on usage
export async function calculateHourlyCosts(env: Env, monitor: Monitor) {
  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  try {
    // Get usage metrics from the last hour
    const usage = await getHourlyUsage(env, hourAgo, now)

    // Calculate and store costs
    const batch = []
    let totalCost = 0

    for (const [resource, workerUsage] of Object.entries(usage)) {
      for (const [worker, amount] of Object.entries(workerUsage)) {
        const cost = calculateCost(resource, amount)
        totalCost += cost

        batch.push(
          env.DB.prepare(
            `
            INSERT INTO cost_tracking (date, worker, resource_type, usage, cost_usd)
            VALUES (?, ?, ?, ?, ?)
          `
          ).bind(
            now.toISOString().split('T')[0],
            worker,
            resource,
            amount,
            cost
          )
        )
      }
    }

    if (batch.length > 0) {
      await env.DB.batch(batch)
    }

    // Cache current costs
    await env.METRICS_CACHE.put(
      'current_costs',
      JSON.stringify({
        timestamp: now.toISOString(),
        hourly_cost: totalCost,
        daily_projection: totalCost * 24,
      }),
      { expirationTtl: 3600 } // 1 hour
    )

    // Alert if costs are trending high
    const dailyCostProjection = totalCost * 24
    if (dailyCostProjection > 10) {
      await env.ALERT_QUEUE.send({
        type: 'cost_alert',
        severity: dailyCostProjection > 20 ? 'critical' : 'warning',
        title: 'High Cost Alert',
        message: `Daily cost projection: $${dailyCostProjection.toFixed(2)}`,
        value: dailyCostProjection,
        threshold: 10,
        timestamp: Date.now(),
      })
    }

    await monitor.trackBusiness('costs_calculated', totalCost, {
      worker: 'monitoring',
    })
  } catch (error) {
    await monitor.trackError(error as Error, {
      operation: 'calculateHourlyCosts',
      worker: 'monitoring',
    })
    throw error
  }
}

// Get hourly usage from metrics
async function getHourlyUsage(
  env: Env,
  start: Date,
  end: Date
): Promise<Record<string, Record<string, number>>> {
  const usage: Record<string, Record<string, number>> = {}

  // Query request counts
  const requests = await env.DB.prepare(
    `
    SELECT worker, SUM(count) as total_requests
    FROM metrics_hourly
    WHERE timestamp >= ? AND timestamp < ? AND metric = 'request'
    GROUP BY worker
  `
  )
    .bind(start.toISOString(), end.toISOString())
    .all()

  for (const row of requests.results || []) {
    if (!usage.requests) usage.requests = {}
    usage.requests[row.worker as string] = row.total_requests as number
  }

  // Query CPU time
  const cpuTime = await env.DB.prepare(
    `
    SELECT worker, SUM(sum) as total_cpu_time
    FROM metrics_hourly
    WHERE timestamp >= ? AND timestamp < ? AND metric = 'cpu_time'
    GROUP BY worker
  `
  )
    .bind(start.toISOString(), end.toISOString())
    .all()

  for (const row of cpuTime.results || []) {
    if (!usage.cpu_time) usage.cpu_time = {}
    usage.cpu_time[row.worker as string] = row.total_cpu_time as number
  }

  // Estimate D1 operations based on request patterns
  // This is a simplified estimation - in production you'd track actual D1 operations
  for (const row of requests.results || []) {
    const worker = row.worker as string
    const requestCount = row.total_requests as number

    if (!usage.d1_reads) usage.d1_reads = {}
    if (!usage.d1_writes) usage.d1_writes = {}

    // Estimate based on worker type
    if (worker === 'api') {
      usage.d1_reads[worker] = requestCount * 2 // 2 reads per request average
      usage.d1_writes[worker] = requestCount * 0.3 // 30% of requests write
    } else if (worker === 'scores') {
      usage.d1_reads[worker] = requestCount * 1.5
      usage.d1_writes[worker] = requestCount * 0.1
    }
  }

  // Add Analytics Engine usage
  if (!usage.analytics_writes) usage.analytics_writes = {}
  usage.analytics_writes.monitoring = (requests.results?.length || 0) * 100 // Estimate

  return usage
}

// Clean up old data
export async function cleanupOldData(env: Env, monitor: Monitor) {
  const retentionDays = {
    raw_metrics: 7,
    hourly_aggregates: 30,
    daily_summaries: 365,
    alerts: 90,
  }

  try {
    // Clean up old hourly metrics
    const thirtyDaysAgo = new Date(
      Date.now() - retentionDays.hourly_aggregates * 24 * 60 * 60 * 1000
    )
    await env.DB.prepare(
      `
      DELETE FROM metrics_hourly
      WHERE timestamp < ?
    `
    )
      .bind(thirtyDaysAgo.toISOString())
      .run()

    // Clean up old alerts
    const ninetyDaysAgo = new Date(
      Date.now() - retentionDays.alerts * 24 * 60 * 60 * 1000
    )
    await env.DB.prepare(
      `
      DELETE FROM alert_history
      WHERE triggered_at < ?
    `
    )
      .bind(ninetyDaysAgo.toISOString())
      .run()

    // Clean up old cost data (keep daily summaries)
    const yearAgo = new Date(
      Date.now() - retentionDays.daily_summaries * 24 * 60 * 60 * 1000
    )
    await env.DB.prepare(
      `
      DELETE FROM cost_tracking
      WHERE date < ? AND date NOT IN (
        SELECT DISTINCT date FROM cost_tracking
        GROUP BY date
        HAVING date = MIN(date)
      )
    `
    )
      .bind(yearAgo.toISOString().split('T')[0])
      .run()

    await monitor.trackBusiness('data_cleaned', 1, {
      worker: 'monitoring',
    })
  } catch (error) {
    await monitor.trackError(error as Error, {
      operation: 'cleanupOldData',
      worker: 'monitoring',
    })
    throw error
  }
}

// Generate weekly report
export async function generateWeeklyReport(env: Env, monitor: Monitor) {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  try {
    // Gather weekly statistics
    const stats = await gatherWeeklyStats(env, weekAgo, now)

    // Generate report
    const report = {
      period: {
        start: weekAgo.toISOString(),
        end: now.toISOString(),
      },
      summary: stats,
      generated_at: now.toISOString(),
    }

    // Store report in R2
    const reportKey = `weekly-reports/${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}.json`
    await env.REPORTS.put(reportKey, JSON.stringify(report, null, 2))

    // Send notification if configured
    if (env.SLACK_WEBHOOK_URL) {
      await sendSlackNotification(env.SLACK_WEBHOOK_URL, {
        text: 'Weekly Monitoring Report',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Weekly Report Generated*\nPeriod: ${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Total Requests*\n${stats.total_requests.toLocaleString()}`,
              },
              {
                type: 'mrkdwn',
                text: `*Error Rate*\n${(stats.error_rate * 100).toFixed(2)}%`,
              },
              {
                type: 'mrkdwn',
                text: `*Avg Response Time*\n${stats.avg_response_time.toFixed(0)}ms`,
              },
              {
                type: 'mrkdwn',
                text: `*Total Cost*\n$${stats.total_cost.toFixed(2)}`,
              },
            ],
          },
        ],
      })
    }

    await monitor.trackBusiness('weekly_report_generated', 1, {
      worker: 'monitoring',
    })
  } catch (error) {
    await monitor.trackError(error as Error, {
      operation: 'generateWeeklyReport',
      worker: 'monitoring',
    })
    throw error
  }
}

// Gather weekly statistics
async function gatherWeeklyStats(env: Env, start: Date, end: Date) {
  // Get request statistics
  const requestStats = await env.DB.prepare(
    `
    SELECT 
      SUM(count) as total_requests,
      AVG(p50) as avg_response_time,
      SUM(CASE WHEN metric = 'error' THEN count ELSE 0 END) as error_count
    FROM metrics_hourly
    WHERE timestamp >= ? AND timestamp < ?
  `
  )
    .bind(start.toISOString(), end.toISOString())
    .first()

  // Get cost statistics
  const costStats = await env.DB.prepare(
    `
    SELECT SUM(cost_usd) as total_cost
    FROM cost_tracking
    WHERE date >= ? AND date < ?
  `
  )
    .bind(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
    .first()

  const totalRequests = (requestStats?.total_requests as number) || 0
  const errorCount = (requestStats?.error_count as number) || 0

  return {
    total_requests: totalRequests,
    error_rate: totalRequests > 0 ? errorCount / totalRequests : 0,
    avg_response_time: (requestStats?.avg_response_time as number) || 0,
    total_cost: (costStats?.total_cost as number) || 0,
  }
}

// Send Slack notification
async function sendSlackNotification(webhookUrl: string, payload: any) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.statusText}`)
  }
}
