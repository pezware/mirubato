import type { Env, AlertMessage, AlertRule, MetricData } from './types'

// Check alert rules against current metrics
export async function checkAlertRules(env: Env, metrics: MetricData[]) {
  // Get enabled alert rules
  const rules = await env.DB.prepare(
    `
    SELECT * FROM alert_rules
    WHERE enabled = 1
  `
  ).all()

  for (const rule of rules.results || []) {
    const alertRule = rule as unknown as AlertRule
    await checkRule(env, alertRule, metrics)
  }
}

// Check individual rule
async function checkRule(env: Env, rule: AlertRule, metrics: MetricData[]) {
  // Filter metrics relevant to this rule
  const relevantMetrics = metrics.filter(m => {
    if (rule.worker && m.worker !== rule.worker) return false
    if (rule.metric && !m.event.includes(rule.metric)) return false
    return true
  })

  if (relevantMetrics.length === 0) return

  // Calculate aggregate value based on metric type
  let value: number
  switch (rule.metric) {
    case 'error_rate':
      const totalRequests = metrics
        .filter(m => m.event === 'request')
        .reduce((sum, m) => sum + m.count, 0)
      const errors = metrics
        .filter(m => m.event === 'error')
        .reduce((sum, m) => sum + m.count, 0)
      value = totalRequests > 0 ? errors / totalRequests : 0
      break

    case 'response_time_p95':
      const p95Values = relevantMetrics.map(m => m.p95).filter(v => v > 0)
      value = p95Values.length > 0 ? Math.max(...p95Values) : 0
      break

    case 'success_rate':
      const requests = metrics
        .filter(m => m.event === 'request')
        .reduce((sum, m) => sum + m.count, 0)
      const successes = metrics
        .filter(m => m.event === 'request' && m.event.includes('success'))
        .reduce((sum, m) => sum + m.count, 0)
      value = requests > 0 ? successes / requests : 1
      break

    default:
      // For custom metrics, use the average value
      value =
        relevantMetrics.reduce((sum, m) => sum + m.avg_response_time, 0) /
        relevantMetrics.length
  }

  // Check if condition is met
  let conditionMet = false
  switch (rule.condition) {
    case 'greater_than':
      conditionMet = value > rule.threshold
      break
    case 'less_than':
      conditionMet = value < rule.threshold
      break
    case 'equals':
      conditionMet = Math.abs(value - rule.threshold) < 0.001
      break
  }

  if (conditionMet) {
    // Check if alert is already active
    const activeAlert = await env.DB.prepare(
      `
      SELECT id FROM alert_history
      WHERE rule_id = ? AND resolved_at IS NULL
      ORDER BY triggered_at DESC
      LIMIT 1
    `
    )
      .bind(rule.id)
      .first()

    if (!activeAlert) {
      // Create new alert
      await env.DB.prepare(
        `
        INSERT INTO alert_history (rule_id, triggered_at, value)
        VALUES (?, ?, ?)
      `
      )
        .bind(rule.id, new Date().toISOString(), value)
        .run()

      // Send alert notification
      await env.ALERT_QUEUE.send({
        type: 'metric_alert',
        severity: rule.severity,
        rule_id: rule.id,
        title: rule.name,
        message: `${rule.metric} is ${value.toFixed(2)} (threshold: ${rule.threshold})`,
        value,
        threshold: rule.threshold,
        worker: rule.worker,
        metric: rule.metric,
        timestamp: Date.now(),
      })
    }
  } else {
    // Check if we should resolve an active alert
    const activeAlert = await env.DB.prepare(
      `
      SELECT id FROM alert_history
      WHERE rule_id = ? AND resolved_at IS NULL
      ORDER BY triggered_at DESC
      LIMIT 1
    `
    )
      .bind(rule.id)
      .first()

    if (activeAlert) {
      // Resolve the alert
      await env.DB.prepare(
        `
        UPDATE alert_history
        SET resolved_at = ?
        WHERE id = ?
      `
      )
        .bind(new Date().toISOString(), activeAlert.id)
        .run()

      // Send resolution notification
      await env.ALERT_QUEUE.send({
        type: 'metric_alert',
        severity: 'info',
        rule_id: rule.id,
        title: `${rule.name} - Resolved`,
        message: `${rule.metric} has returned to normal (${value.toFixed(2)})`,
        value,
        threshold: rule.threshold,
        worker: rule.worker,
        metric: rule.metric,
        timestamp: Date.now(),
      })
    }
  }
}

// Process alert notification
export async function processAlert(alert: AlertMessage, env: Env) {
  const channels = await getNotificationChannels(env, alert.rule_id)

  // Send to each configured channel
  const promises = []

  if (channels.includes('slack') && env.SLACK_WEBHOOK_URL) {
    promises.push(sendSlackAlert(env.SLACK_WEBHOOK_URL, alert))
  }

  if (channels.includes('pagerduty') && env.PAGERDUTY_KEY) {
    promises.push(sendPagerDutyAlert(env.PAGERDUTY_KEY, alert))
  }

  if (channels.includes('email') && env.EMAIL_API_KEY) {
    promises.push(sendEmailAlert(env.EMAIL_API_KEY, alert))
  }

  await Promise.all(promises)

  // Update notification sent status
  if (alert.rule_id) {
    await env.DB.prepare(
      `
      UPDATE alert_history
      SET notification_sent = 1
      WHERE rule_id = ? AND resolved_at IS NULL
    `
    )
      .bind(alert.rule_id)
      .run()
  }
}

// Get notification channels for a rule
async function getNotificationChannels(
  env: Env,
  ruleId?: number
): Promise<string[]> {
  if (!ruleId) return ['slack'] // Default channel

  const rule = await env.DB.prepare(
    `
    SELECT notification_channels FROM alert_rules
    WHERE id = ?
  `
  )
    .bind(ruleId)
    .first()

  if (rule?.notification_channels) {
    return JSON.parse(rule.notification_channels as string)
  }

  return ['slack']
}

// Send Slack alert
async function sendSlackAlert(webhookUrl: string, alert: AlertMessage) {
  const color =
    alert.severity === 'critical'
      ? '#FF0000'
      : alert.severity === 'warning'
        ? '#FFA500'
        : '#36A64F'

  const payload = {
    attachments: [
      {
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true,
          },
          {
            title: 'Time',
            value: new Date(alert.timestamp).toLocaleString(),
            short: true,
          },
          ...(alert.worker
            ? [
                {
                  title: 'Worker',
                  value: alert.worker,
                  short: true,
                },
              ]
            : []),
          ...(alert.value !== undefined
            ? [
                {
                  title: 'Current Value',
                  value: alert.value.toFixed(2),
                  short: true,
                },
              ]
            : []),
          ...(alert.threshold !== undefined
            ? [
                {
                  title: 'Threshold',
                  value: alert.threshold.toFixed(2),
                  short: true,
                },
              ]
            : []),
        ],
        footer: 'Mirubato Monitoring',
        ts: Math.floor(alert.timestamp / 1000),
      },
    ],
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Slack alert failed: ${response.statusText}`)
  }
}

// Send PagerDuty alert
async function sendPagerDutyAlert(apiKey: string, alert: AlertMessage) {
  const eventAction = alert.message.includes('Resolved') ? 'resolve' : 'trigger'

  const payload = {
    routing_key: apiKey,
    event_action: eventAction,
    dedup_key: `mirubato-${alert.rule_id || alert.type}`,
    payload: {
      summary: alert.message,
      severity:
        alert.severity === 'critical'
          ? 'critical'
          : alert.severity === 'warning'
            ? 'warning'
            : 'info',
      source: 'mirubato-monitoring',
      component: alert.worker || 'unknown',
      group: alert.metric || 'metrics',
      custom_details: {
        value: alert.value,
        threshold: alert.threshold,
        timestamp: new Date(alert.timestamp).toISOString(),
      },
    },
  }

  const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.pagerduty+json;version=2',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`PagerDuty alert failed: ${response.statusText}`)
  }
}

// Send email alert (placeholder - implement based on your email service)
async function sendEmailAlert(apiKey: string, alert: AlertMessage) {
  // This is a placeholder - implement based on your email service
  // (e.g., SendGrid, AWS SES, Postmark, etc.)
  console.log('Email alert would be sent:', alert)

  // Example with a generic email API:
  /*
  const response = await fetch('https://api.emailservice.com/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'alerts@mirubato.com',
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html: `
        <h2>${alert.title}</h2>
        <p>${alert.message}</p>
        <table>
          <tr><td>Severity:</td><td>${alert.severity}</td></tr>
          <tr><td>Time:</td><td>${new Date(alert.timestamp).toLocaleString()}</td></tr>
          ${alert.worker ? `<tr><td>Worker:</td><td>${alert.worker}</td></tr>` : ''}
          ${alert.value !== undefined ? `<tr><td>Value:</td><td>${alert.value.toFixed(2)}</td></tr>` : ''}
          ${alert.threshold !== undefined ? `<tr><td>Threshold:</td><td>${alert.threshold.toFixed(2)}</td></tr>` : ''}
        </table>
      `,
    }),
  })
  */
}
