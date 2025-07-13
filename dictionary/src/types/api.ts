/**
 * API request/response types
 */

import { DictionaryEntry, SearchQuery, BatchQueryRequest, EnhancementRequest } from './dictionary'

// Base response structure
export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

export interface ResponseMeta {
  request_id: string
  timestamp: string
  version: string
  latency_ms: number
}

// Endpoint-specific responses
export interface TermResponse {
  entry: DictionaryEntry
  related_terms?: DictionaryEntry[]
}

export interface BatchQueryResponse {
  found: DictionaryEntry[]
  not_found: string[]
  processing: string[] // Terms being generated
}

export interface SearchResponse {
  results: DictionaryEntry[]
  total: number
  limit: number
  offset: number
  facets?: SearchFacets
}

export interface SearchFacets {
  types: Record<string, number>
  instruments: Record<string, number>
  difficulty_levels: Record<string, number>
  quality_ranges: {
    excellent: number // 90-100
    good: number // 70-89
    fair: number // 50-69
    poor: number // 0-49
  }
}

export interface EnhancementResponse {
  job_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  estimated_completion?: string
  terms_queued?: number
  terms_completed?: number
  improvements?: EnhancementImprovement[]
}

export interface EnhancementImprovement {
  term: string
  score_before: number
  score_after: number
  changes_made: string[]
}

export interface ExportResponse {
  export_id: string
  download_url?: string // For direct downloads
  status: 'preparing' | 'ready' | 'expired'
  expires_at?: string
  size_bytes?: number
  entry_count?: number
}

export interface AnalyticsResponse {
  total_terms: number
  avg_quality_score: number
  quality_distribution: QualityDistribution
  popular_searches: PopularSearch[]
  recent_additions: DictionaryEntry[]
  low_quality_terms: LowQualityTerm[]
  usage_stats: UsageStats
}

export interface QualityDistribution {
  excellent: number // 90-100
  good: number // 70-89
  fair: number // 50-69
  poor: number // 0-49
}

export interface PopularSearch {
  term: string
  search_count: number
  found_count: number
  last_searched: string
  has_entry: boolean
}

export interface LowQualityTerm {
  entry: DictionaryEntry
  issues: string[]
  search_frequency: number
  user_complaints: number
}

export interface UsageStats {
  daily_searches: number
  daily_api_calls: number
  cache_hit_rate: number
  avg_response_time_ms: number
  ai_tokens_used_today: number
  ai_cost_today_usd: number
}

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  service: string
  version: string
  environment: string
  timestamp: string
  totalLatency: number
  services: HealthCheckServices
}

export interface HealthCheckServices {
  database: ServiceHealth
  cache: ServiceHealth
  ai: AIServiceHealth
  smokeTests: SmokeTestResults
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unconfigured'
  latency?: number
  message?: string
  error?: string
  [key: string]: any // Additional service-specific data
}

export interface AIServiceHealth {
  cloudflare: ServiceHealth
  openai: ServiceHealth
  anthropic: ServiceHealth
}

export interface SmokeTestResults {
  status: 'healthy' | 'degraded' | 'unhealthy'
  tests: {
    definition_generation: boolean
    quality_validation: boolean
    reference_extraction: boolean
    multi_model_fallback: boolean
  }
  message: string
}

// AI model health check
export interface AIModelHealth {
  provider: string
  model: string
  name: string
  status: 'healthy' | 'unhealthy'
  latency?: number
  error?: string
}

// Metrics endpoint types
export interface MetricsResponse {
  dictionary_entries_total: number
  quality_checkpoints_total: number
  searches_total: number
  ai_requests_total: number
  cache_hit_rate: number
  avg_response_time_ms: number
  service_info: {
    version: string
    environment: string
  }
}

// Admin endpoint types
export interface AdminUpdateRequest {
  definition?: any
  references?: any
  metadata?: any
  quality_score?: any
  force_update?: boolean
}

// Authentication types
export interface AuthenticatedRequest {
  headers: {
    authorization?: string
    'x-api-key'?: string
  }
}

// Webhook types
export interface WebhookEvent {
  event_type: 'term.created' | 'term.updated' | 'quality.improved' | 'batch.completed'
  timestamp: string
  data: {
    term_id: string
    term: string
    changes?: {
      quality_score?: {
        before: number
        after: number
      }
      fields_updated?: string[]
    }
  }
}

// Rate limiting
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number // Unix timestamp
  retry_after?: number // Seconds
}