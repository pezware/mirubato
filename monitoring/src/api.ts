import { z } from 'zod'
import type {
  Env,
  DashboardData,
  AlertRule,
  MetricsQuery,
  CostQuery,
} from './types'

// Metrics query handler
export async function handleMetricsQuery(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url)
  const query: MetricsQuery = {
    worker: url.searchParams.get('worker') || undefined,
    metric: url.searchParams.get('metric') || undefined,
    start:
      url.searchParams.get('start') ||
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: url.searchParams.get('end') || new Date().toISOString(),
    interval: url.searchParams.get('interval') || 'hour',
    aggregation: (url.searchParams.get('aggregation') as any) || 'avg',
  }

  try {
    const results = await env.DB.prepare(
      `
      SELECT 
        timestamp,
        worker,
        metric,
        ${
          query.aggregation === 'sum'
            ? 'SUM(sum)'
            : query.aggregation === 'avg'
              ? 'AVG(sum/count)'
              : query.aggregation === 'min'
                ? 'MIN(min)'
                : query.aggregation === 'max'
                  ? 'MAX(max)'
                  : 'SUM(count)'
        } as value,
        p50,
        p95,
        p99
      FROM metrics_hourly
      WHERE timestamp >= ? AND timestamp <= ?
      ${query.worker ? 'AND worker = ?' : ''}
      ${query.metric ? 'AND metric = ?' : ''}
      GROUP BY DATE(timestamp), worker, metric
      ORDER BY timestamp DESC
      LIMIT 1000
    `
    )
      .bind(
        query.start,
        query.end,
        ...(query.worker ? [query.worker] : []),
        ...(query.metric ? [query.metric] : [])
      )
      .all()

    return Response.json({
      query,
      results: results.results,
      count: results.results?.length || 0,
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to query metrics', details: error },
      { status: 500 }
    )
  }
}

// Cost query handler
export async function handleCostQuery(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url)
  const query: CostQuery = {
    period: (url.searchParams.get('period') as any) || 'day',
    breakdown: url.searchParams.get('breakdown') === 'true',
    trend: url.searchParams.get('trend') || undefined,
    worker: url.searchParams.get('worker') || undefined,
  }

  try {
    const now = new Date()
    let startDate: Date

    switch (query.period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default: // day
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }

    if (query.breakdown) {
      // Get cost breakdown by resource and worker
      const breakdown = await env.DB.prepare(
        `
        SELECT 
          worker,
          resource_type,
          SUM(usage) as total_usage,
          SUM(cost_usd) as total_cost
        FROM cost_tracking
        WHERE date >= ?
        ${query.worker ? 'AND worker = ?' : ''}
        GROUP BY worker, resource_type
        ORDER BY total_cost DESC
      `
      )
        .bind(
          startDate.toISOString().split('T')[0],
          ...(query.worker ? [query.worker] : [])
        )
        .all()

      return Response.json({
        period: query.period,
        start_date: startDate.toISOString(),
        breakdown: breakdown.results,
        total:
          breakdown.results?.reduce(
            (sum, row) => sum + (row.total_cost as number),
            0
          ) || 0,
      })
    } else {
      // Get total costs
      const totals = await env.DB.prepare(
        `
        SELECT 
          date,
          SUM(cost_usd) as daily_cost
        FROM cost_tracking
        WHERE date >= ?
        ${query.worker ? 'AND worker = ?' : ''}
        GROUP BY date
        ORDER BY date DESC
      `
      )
        .bind(
          startDate.toISOString().split('T')[0],
          ...(query.worker ? [query.worker] : [])
        )
        .all()

      const totalCost =
        totals.results?.reduce(
          (sum, row) => sum + (row.daily_cost as number),
          0
        ) || 0
      const avgDailyCost = totalCost / (totals.results?.length || 1)
      const projection = avgDailyCost * 30 // Monthly projection

      return Response.json({
        period: query.period,
        start_date: startDate.toISOString(),
        total_cost: totalCost,
        daily_average: avgDailyCost,
        monthly_projection: projection,
        daily_costs: totals.results,
      })
    }
  } catch (error) {
    return Response.json(
      { error: 'Failed to query costs', details: error },
      { status: 500 }
    )
  }
}

// Alert configuration handler
export async function handleAlertConfig(
  request: Request,
  env: Env,
  method: string
): Promise<Response> {
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop()

  try {
    switch (method) {
      case 'GET':
        // List all alert rules
        const rules = await env.DB.prepare(
          `
          SELECT * FROM alert_rules
          ORDER BY severity DESC, created_at DESC
        `
        ).all()

        return Response.json({
          rules: rules.results?.map(row => ({
            ...row,
            notification_channels: JSON.parse(
              (row.notification_channels as string) || '[]'
            ),
          })),
        })

      case 'POST':
        // Create new alert rule
        const createSchema = z.object({
          name: z.string(),
          worker: z.string().optional(),
          metric: z.string(),
          condition: z.enum(['greater_than', 'less_than', 'equals']),
          threshold: z.number(),
          window_minutes: z.number().default(5),
          severity: z.enum(['info', 'warning', 'critical']).default('warning'),
          notification_channels: z.array(z.string()).default(['slack']),
        })

        const body = await request.json()
        const validated = createSchema.parse(body)

        const result = await env.DB.prepare(
          `
          INSERT INTO alert_rules (name, worker, metric, condition, threshold, window_minutes, severity, notification_channels)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
          .bind(
            validated.name,
            validated.worker || null,
            validated.metric,
            validated.condition,
            validated.threshold,
            validated.window_minutes,
            validated.severity,
            JSON.stringify(validated.notification_channels)
          )
          .run()

        return Response.json(
          { id: result.meta.last_row_id, ...validated },
          { status: 201 }
        )

      case 'PUT':
        // Update alert rule
        if (!id || id === 'alerts') {
          return Response.json({ error: 'Alert ID required' }, { status: 400 })
        }

        const updateSchema = z.object({
          enabled: z.boolean().optional(),
          threshold: z.number().optional(),
          window_minutes: z.number().optional(),
          severity: z.enum(['info', 'warning', 'critical']).optional(),
          notification_channels: z.array(z.string()).optional(),
        })

        const updateBody = await request.json()
        const updateValidated = updateSchema.parse(updateBody)

        const updates: string[] = []
        const values: any[] = []

        if (updateValidated.enabled !== undefined) {
          updates.push('enabled = ?')
          values.push(updateValidated.enabled ? 1 : 0)
        }
        if (updateValidated.threshold !== undefined) {
          updates.push('threshold = ?')
          values.push(updateValidated.threshold)
        }
        if (updateValidated.window_minutes !== undefined) {
          updates.push('window_minutes = ?')
          values.push(updateValidated.window_minutes)
        }
        if (updateValidated.severity !== undefined) {
          updates.push('severity = ?')
          values.push(updateValidated.severity)
        }
        if (updateValidated.notification_channels !== undefined) {
          updates.push('notification_channels = ?')
          values.push(JSON.stringify(updateValidated.notification_channels))
        }

        updates.push('updated_at = CURRENT_TIMESTAMP')
        values.push(parseInt(id))

        await env.DB.prepare(
          `
          UPDATE alert_rules
          SET ${updates.join(', ')}
          WHERE id = ?
        `
        )
          .bind(...values)
          .run()

        return Response.json({ id, ...updateValidated })

      case 'DELETE':
        // Delete alert rule
        if (!id || id === 'alerts') {
          return Response.json({ error: 'Alert ID required' }, { status: 400 })
        }

        await env.DB.prepare(
          `
          DELETE FROM alert_rules WHERE id = ?
        `
        )
          .bind(parseInt(id))
          .run()

        return Response.json({ deleted: true })

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  } catch (error) {
    return Response.json(
      { error: 'Failed to manage alerts', details: error },
      { status: 500 }
    )
  }
}

// Health check handler
export async function handleHealthCheck(env: Env): Promise<Response> {
  const checks = {
    database: false,
    kv: false,
    analytics: false,
    queue: false,
    r2: false,
  }

  try {
    // Check D1 database
    await env.DB.prepare('SELECT 1').first()
    checks.database = true
  } catch (error) {
    console.error('Database check failed:', error)
  }

  try {
    // Check KV
    await env.METRICS_CACHE.get('health_check')
    checks.kv = true
  } catch (error) {
    console.error('KV check failed:', error)
  }

  try {
    // Check Analytics Engine (write a test point)
    env.ANALYTICS.writeDataPoint({
      indexes: ['health_check'],
      blobs: { check: 'health' },
      doubles: { timestamp: Date.now() },
    })
    checks.analytics = true
  } catch (error) {
    console.error('Analytics Engine check failed:', error)
  }

  try {
    // Check Queue
    await env.ALERT_QUEUE.send({
      type: 'metric_alert',
      severity: 'info',
      title: 'Health Check',
      message: 'Health check test message',
      timestamp: Date.now(),
    })
    checks.queue = true
  } catch (error) {
    console.error('Queue check failed:', error)
  }

  try {
    // Check R2
    await env.REPORTS.head('health-check.txt')
    checks.r2 = true
  } catch (error) {
    // R2 check might fail if file doesn't exist, which is okay
    checks.r2 = true
  }

  const allHealthy = Object.values(checks).every(v => v)

  return Response.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  )
}

// Dashboard data handler
export async function handleDashboardData(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Get cached current metrics
    const cachedMetrics = await env.METRICS_CACHE.get('current_metrics')
    const cachedCosts = await env.METRICS_CACHE.get('current_costs')

    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get summary statistics
    const summary = await env.DB.prepare(
      `
      SELECT 
        SUM(count) as total_requests,
        SUM(CASE WHEN metric = 'error' THEN count ELSE 0 END) as error_count,
        AVG(CASE WHEN metric = 'request' THEN p50 ELSE NULL END) as avg_response_time
      FROM metrics_hourly
      WHERE timestamp >= ?
    `
    )
      .bind(dayAgo.toISOString())
      .first()

    // Get active alerts
    const activeAlerts = await env.DB.prepare(
      `
      SELECT ah.*, ar.name, ar.severity, ar.metric, ar.threshold
      FROM alert_history ah
      JOIN alert_rules ar ON ah.rule_id = ar.id
      WHERE ah.resolved_at IS NULL
      ORDER BY ah.triggered_at DESC
      LIMIT 10
    `
    ).all()

    // Get worker-specific metrics
    const workerMetrics = await env.DB.prepare(
      `
      SELECT 
        worker,
        SUM(count) as request_count,
        SUM(CASE WHEN metric = 'error' THEN count ELSE 0 END) as error_count,
        AVG(CASE WHEN metric = 'request' THEN p95 ELSE NULL END) as p95_response_time
      FROM metrics_hourly
      WHERE timestamp >= ?
      GROUP BY worker
    `
    )
      .bind(dayAgo.toISOString())
      .all()

    // Get SLO status
    const sloStatus = await env.DB.prepare(
      `
      SELECT 
        sd.name,
        sd.worker,
        sd.target_percentage,
        sm.success_count,
        sm.total_count,
        (sm.success_count * 100.0 / sm.total_count) as current_percentage
      FROM slo_definitions sd
      LEFT JOIN slo_measurements sm ON sd.id = sm.slo_id
      WHERE sm.date = ?
    `
    )
      .bind(now.toISOString().split('T')[0])
      .all()

    // Parse cached data
    const costs = cachedCosts
      ? JSON.parse(cachedCosts)
      : { hourly_cost: 0, daily_projection: 0 }

    // Build dashboard data
    const totalRequests = (summary?.total_requests as number) || 0
    const errorCount = (summary?.error_count as number) || 0

    const dashboardData: DashboardData = {
      summary: {
        total_requests: totalRequests,
        error_rate: totalRequests > 0 ? errorCount / totalRequests : 0,
        avg_response_time: (summary?.avg_response_time as number) || 0,
        active_alerts: activeAlerts.results?.length || 0,
      },
      workers: {},
      costs: {
        today: costs.hourly_cost * 24,
        month_to_date: await getMonthToDateCost(env),
        projection: costs.daily_projection * 30,
      },
      alerts:
        activeAlerts.results?.map(alert => ({
          type: 'metric_alert',
          severity: alert.severity as any,
          rule_id: alert.rule_id as number,
          title: alert.name as string,
          message: `${alert.metric} ${alert.value} (threshold: ${alert.threshold})`,
          value: alert.value as number,
          threshold: alert.threshold as number,
          metric: alert.metric as string,
          timestamp: new Date(alert.triggered_at as string).getTime(),
        })) || [],
      slo_status:
        sloStatus.results?.map(slo => ({
          name: slo.name as string,
          worker: slo.worker as string,
          current_percentage: slo.current_percentage as number,
          target_percentage: slo.target_percentage as number,
          remaining_error_budget:
            ((slo.target_percentage as number) -
              (slo.current_percentage as number)) *
            100,
        })) || [],
    }

    // Add worker metrics
    for (const worker of workerMetrics.results || []) {
      const requestCount = (worker.request_count as number) || 0
      const errorCount = (worker.error_count as number) || 0

      dashboardData.workers[worker.worker as string] = {
        requests_per_second: requestCount / (24 * 60 * 60),
        error_rate: requestCount > 0 ? errorCount / requestCount : 0,
        p95_response_time: (worker.p95_response_time as number) || 0,
      }
    }

    return Response.json(dashboardData)
  } catch (error) {
    return Response.json(
      { error: 'Failed to get dashboard data', details: error },
      { status: 500 }
    )
  }
}

// Get month-to-date cost
async function getMonthToDateCost(env: Env): Promise<number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const result = await env.DB.prepare(
    `
    SELECT SUM(cost_usd) as total_cost
    FROM cost_tracking
    WHERE date >= ?
  `
  )
    .bind(monthStart.toISOString().split('T')[0])
    .first()

  return (result?.total_cost as number) || 0
}
