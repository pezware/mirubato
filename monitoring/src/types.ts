import { AnalyticsEngineDataset } from '@cloudflare/workers-types'

export interface Env {
  ANALYTICS: AnalyticsEngineDataset
  DB: D1Database
  METRICS_CACHE: KVNamespace
  ALERT_QUEUE: Queue<AlertMessage>
  AGGREGATOR: DurableObjectNamespace
  REPORTS: R2Bucket
  API: Fetcher
  SCORES: Fetcher
  FRONTEND: Fetcher
  ENVIRONMENT: string
  ALERT_WEBHOOK_URL?: string
  PAGERDUTY_KEY?: string
  SLACK_WEBHOOK_URL?: string
  EMAIL_API_KEY?: string
}

export interface AlertMessage {
  type: 'metric_alert' | 'cost_alert' | 'slo_alert'
  severity: 'info' | 'warning' | 'critical'
  rule_id?: number
  title: string
  message: string
  value?: number
  threshold?: number
  worker?: string
  metric?: string
  timestamp: number
}

export interface MetricData {
  worker: string
  event: string
  count: number
  avg_response_time: number
  min_response_time: number
  max_response_time: number
  p50: number
  p95: number
  p99: number
}

export interface CostData {
  resource: string
  usage: number
  cost: number
  worker?: string
}

export interface AlertRule {
  id: number
  name: string
  worker?: string
  metric: string
  condition: 'greater_than' | 'less_than' | 'equals'
  threshold: number
  window_minutes: number
  severity: 'info' | 'warning' | 'critical'
  enabled: boolean
  notification_channels: string[]
}

export interface SLODefinition {
  id: number
  name: string
  worker: string
  target_percentage: number
  window_days: number
}

export interface DashboardData {
  summary: {
    total_requests: number
    error_rate: number
    avg_response_time: number
    active_alerts: number
  }
  workers: Record<string, WorkerMetrics>
  costs: {
    today: number
    month_to_date: number
    projection: number
  }
  alerts: AlertMessage[]
  slo_status: SLOStatus[]
}

export interface WorkerMetrics {
  requests_per_second: number
  error_rate: number
  p95_response_time: number
  queue_depth?: number
  cpu_time?: number
}

export interface SLOStatus {
  name: string
  worker: string
  current_percentage: number
  target_percentage: number
  remaining_error_budget: number
}

export interface MetricsQuery {
  worker?: string
  metric?: string
  start?: string
  end?: string
  interval?: string
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count'
}

export interface CostQuery {
  period?: 'day' | 'week' | 'month'
  breakdown?: boolean
  trend?: string
  worker?: string
}
