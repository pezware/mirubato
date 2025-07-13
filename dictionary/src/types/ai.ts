/**
 * AI model and configuration types
 */

export interface AIModelConfig {
  model: string
  provider: 'cloudflare' | 'openai' | 'anthropic' | 'google'
  maxTokens: number
  temperature: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  cost_per_million_tokens?: number
  latency_estimate_ms?: number
  strengths?: string[]
  use_cases?: string[]
}

export interface CloudflareAIModels {
  TEXT_GENERATION: {
    LLAMA_3_1_8B: AIModelConfig
    LLAMA_3_2_3B: AIModelConfig
    LLAMA_3_3_70B: AIModelConfig
  }
  EMBEDDINGS: {
    BGE_BASE: EmbeddingModelConfig
    BGE_LARGE: EmbeddingModelConfig
  }
  CLASSIFICATION: {
    DISTILBERT: ClassificationModelConfig
  }
}

export interface EmbeddingModelConfig {
  model: string
  dimensions: number
  maxTokens: number
  use_cases: string[]
}

export interface ClassificationModelConfig {
  model: string
  use_cases: string[]
  labels?: string[]
}

import type { DictionaryEntry } from './dictionary'

export interface AIPromptTemplate {
  (term: string, type: string, context?: Record<string, unknown>): string
}

export interface AIOperationConfig {
  model: string
  temperature: number
  max_tokens: number
  top_p?: number
  prompt_template: AIPromptTemplate
  parse_response?: (response: string) => unknown
  validate_response?: (parsed: unknown) => boolean
}

export interface AIResponse {
  response?: string
  error?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model?: string
  latency_ms?: number
}

export interface CloudflareAIResponse extends AIResponse {
  // Cloudflare specific fields
  cached?: boolean
  cf?: {
    colo: string
    country: string
  }
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface AnthropicResponse {
  id: string
  type: string
  role: string
  content: Array<{
    type: string
    text: string
  }>
  model: string
  stop_reason: string
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface AIPipelineConfig {
  definition: {
    primary: AIModelConfig
    fallback: AIModelConfig
    retries: number
    timeout: number
  }
  validation: {
    model: AIModelConfig
    scoreThreshold: number
    retries: number
    timeout: number
  }
  enhancement: {
    model: AIModelConfig
    batchSize: number
    schedule: string // Cron expression
    config: {
      temperature: number
      max_tokens: number
    }
  }
  search: {
    model: EmbeddingModelConfig
    cacheEmbeddings: boolean
    similarityThreshold: number
  }
}

export interface AIModelUsage {
  id: string
  model_name: string
  model_provider: string
  operation_type: 'generation' | 'validation' | 'enhancement' | 'embedding'
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd?: number
  latency_ms: number
  success: boolean
  error_message?: string
  entry_id?: string
  created_at: string
}

export interface AIGenerationRequest {
  term: string
  type: string
  context?: {
    related_terms?: string[]
    instruments?: string[]
    difficulty_level?: string
    language?: string
  }
  options?: {
    include_etymology?: boolean
    include_pronunciation?: boolean
    include_examples?: boolean
    max_length?: number
  }
}

export interface AIValidationRequest {
  definition: string
  term: string
  type: string
  current_score?: number
}

export interface AIValidationResponse {
  score: number // 0-100
  issues: string[]
  suggestions: string[]
  confidence: 'high' | 'medium' | 'low'
}

export interface AIEnhancementRequest {
  entry: DictionaryEntry
  focus_areas?: ('definition' | 'references' | 'examples' | 'etymology')[]
  target_score?: number
}

export interface AIEnhancementResponse {
  enhanced_entry: DictionaryEntry
  improvements_made: string[]
  score_improvement: number
  confidence: 'high' | 'medium' | 'low'
}

// Batch processing
export interface AIBatchRequest {
  requests: AIGenerationRequest[]
  priority?: 'high' | 'normal' | 'low'
  max_parallel?: number
}

export interface AIBatchResponse {
  results: Array<{
    request_id: string
    success: boolean
    result?: DictionaryEntry
    error?: string
  }>
  total_tokens_used: number
  total_cost_usd: number
  processing_time_ms: number
}

// Error types
export interface AIError {
  type: 'rate_limit' | 'timeout' | 'parse_error' | 'model_error' | 'unknown'
  message: string
  model?: string
  provider?: string
  retry_after?: number
  details?: Record<string, unknown>
}
