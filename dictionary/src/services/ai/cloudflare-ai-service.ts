/**
 * Cloudflare AI Service Implementation
 */

import { Env } from '../../types/env'
import { CloudflareAIResponse, AIModelUsage } from '../../types/ai'
import { ServiceError as AIServiceError } from '@mirubato/workers-utils'
import { CLOUDFLARE_AI_MODELS } from '../../config/ai-models'

export class CloudflareAIService {
  constructor(private env: Env) {}

  /**
   * Generate structured content using Cloudflare AI
   */
  async generateStructuredContent(
    prompt: string,
    model: string = '@cf/meta/llama-3.1-8b-instruct',
    options: {
      max_tokens?: number
      temperature?: number
      top_p?: number
      stream?: boolean
    } = {}
  ): Promise<CloudflareAIResponse> {
    const startTime = Date.now()

    try {
      // Add JSON instruction to prompt for better structured output
      const structuredPrompt = `${prompt}
      
IMPORTANT: Respond with valid JSON only. No markdown, no additional text, just the JSON object.`

      const response = (await this.env.AI.run(
        model as any,
        {
          prompt: structuredPrompt,
          max_tokens: options.max_tokens || 500,
          temperature: options.temperature || 0.3,
          top_p: options.top_p || 0.9,
          stream: options.stream || false,
          // Note: Cloudflare AI doesn't support all OpenAI parameters yet
        } as any
      )) as any

      const latency = Date.now() - startTime

      // Log usage for analytics
      await this.logUsage({
        model_name: model,
        model_provider: 'cloudflare',
        operation_type: 'generation',
        prompt_tokens: this.estimateTokens(structuredPrompt),
        completion_tokens: this.estimateTokens(response.response || ''),
        total_tokens:
          this.estimateTokens(structuredPrompt) +
          this.estimateTokens(response.response || ''),
        latency_ms: latency,
        success: !!response.response,
        error_message: response.error,
      })

      return {
        response: response.response,
        error: response.error,
        model: model,
        latency_ms: latency,
        cached: false, // Cloudflare AI doesn't indicate caching yet
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      // Log failed attempt
      await this.logUsage({
        model_name: model,
        model_provider: 'cloudflare',
        operation_type: 'generation',
        prompt_tokens: this.estimateTokens(prompt),
        completion_tokens: 0,
        total_tokens: this.estimateTokens(prompt),
        latency_ms: Date.now() - startTime,
        success: false,
        error_message: errorMessage,
      })

      throw new AIServiceError(
        `Cloudflare AI generation failed: ${errorMessage}`,
        'cloudflare',
        { model, error: errorMessage }
      )
    }
  }

  /**
   * Generate embeddings for semantic search
   */
  async generateEmbedding(
    text: string,
    model: string = '@cf/baai/bge-base-en-v1.5'
  ): Promise<number[]> {
    const startTime = Date.now()

    try {
      const response = (await this.env.AI.run(
        model as any,
        {
          text: text,
        } as any
      )) as any

      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid embedding response format')
      }

      const latency = Date.now() - startTime

      // Log usage
      await this.logUsage({
        model_name: model,
        model_provider: 'cloudflare',
        operation_type: 'embedding',
        prompt_tokens: this.estimateTokens(text),
        completion_tokens: 0,
        total_tokens: this.estimateTokens(text),
        latency_ms: latency,
        success: true,
      })

      // Return the first embedding (Cloudflare returns array of arrays)
      return response.data[0] || response.data
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      await this.logUsage({
        model_name: model,
        model_provider: 'cloudflare',
        operation_type: 'embedding',
        prompt_tokens: this.estimateTokens(text),
        completion_tokens: 0,
        total_tokens: this.estimateTokens(text),
        latency_ms: Date.now() - startTime,
        success: false,
        error_message: errorMessage,
      })

      throw new AIServiceError(
        `Cloudflare AI embedding failed: ${errorMessage}`,
        'cloudflare',
        { model, error: errorMessage }
      )
    }
  }

  /**
   * Batch process multiple prompts efficiently
   */
  async batchGenerate(
    prompts: string[],
    model: string = '@cf/meta/llama-3.1-8b-instruct',
    options: {
      max_tokens?: number
      temperature?: number
      concurrency?: number
    } = {}
  ): Promise<CloudflareAIResponse[]> {
    const batchSize = options.concurrency || 5 // Cloudflare AI concurrent request limit
    const results: CloudflareAIResponse[] = []

    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize)

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(prompt =>
          this.generateStructuredContent(prompt, model, {
            max_tokens: options.max_tokens,
            temperature: options.temperature,
          })
        )
      )

      // Collect results and handle failures
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            response: undefined,
            error: result.reason?.message || 'Batch processing failed',
            model: model,
            latency_ms: 0,
          })
        }
      }

      // Rate limiting delay between batches
      if (i + batchSize < prompts.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  /**
   * Parse JSON response from AI model
   */
  parseJSONResponse<T = unknown>(response: string): T {
    if (!response) {
      throw new Error('Empty response from AI model')
    }

    // Clean up common LLM response issues
    let cleaned = response.trim()

    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```json\n?/gi, '').replace(/```\n?/g, '')

    // Remove any text before first { or [
    const jsonStart = cleaned.match(/[{[]/)
    if (jsonStart && jsonStart.index !== undefined) {
      cleaned = cleaned.substring(jsonStart.index)
    }

    // Remove any text after last } or ]
    const jsonEnd = cleaned.match(/[}\]](?!.*[}\]])/s)
    if (jsonEnd && jsonEnd.index !== undefined) {
      cleaned = cleaned.substring(0, jsonEnd.index + 1)
    }

    try {
      return JSON.parse(cleaned) as T
    } catch (error) {
      console.error('JSON parse error:', error, 'Response:', cleaned)
      throw new Error(
        `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Test if Cloudflare AI is available and working
   */
  async testConnection(): Promise<{
    available: boolean
    latency?: number
    error?: string
  }> {
    if (!this.env.AI) {
      return {
        available: false,
        error: 'Cloudflare AI binding not configured',
      }
    }

    try {
      const startTime = Date.now()

      const response = (await this.env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct' as any,
        {
          prompt: 'Reply with "OK" in JSON format: {"status": "OK"}',
          max_tokens: 20,
          temperature: 0,
        } as any
      )) as any

      const latency = Date.now() - startTime

      return {
        available: !!response.response,
        latency,
        error: response.error,
      }
    } catch (error) {
      return {
        available: false,
        error:
          error instanceof Error ? error.message : 'Connection test failed',
      }
    }
  }

  /**
   * Get available models for a specific use case
   */
  getAvailableModels(useCase: 'generation' | 'embedding' | 'classification') {
    switch (useCase) {
      case 'generation':
        return Object.values(CLOUDFLARE_AI_MODELS.TEXT_GENERATION)
      case 'embedding':
        return Object.values(CLOUDFLARE_AI_MODELS.EMBEDDINGS)
      case 'classification':
        return Object.values(CLOUDFLARE_AI_MODELS.CLASSIFICATION)
      default:
        return []
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  /**
   * Log AI usage for analytics
   */
  private async logUsage(
    usage: Omit<AIModelUsage, 'id' | 'created_at'>
  ): Promise<void> {
    try {
      // Calculate approximate cost
      const modelConfig = Object.values(
        CLOUDFLARE_AI_MODELS.TEXT_GENERATION
      ).find(m => m.model === usage.model_name)

      const costPerToken = modelConfig?.cost_per_million_tokens
        ? modelConfig.cost_per_million_tokens / 1_000_000
        : 0

      const cost_usd = usage.total_tokens * costPerToken

      // Store in database for analytics
      await this.env.DB.prepare(
        `
        INSERT INTO ai_model_usage (
          id, model_name, model_provider, operation_type,
          prompt_tokens, completion_tokens, total_tokens,
          cost_usd, latency_ms, success, error_message,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          crypto.randomUUID(),
          usage.model_name,
          usage.model_provider,
          usage.operation_type,
          usage.prompt_tokens,
          usage.completion_tokens,
          usage.total_tokens,
          cost_usd,
          usage.latency_ms,
          usage.success ? 1 : 0,
          usage.error_message || null,
          new Date().toISOString()
        )
        .run()
    } catch (error) {
      // Don't throw - logging shouldn't break the main flow
      console.error('Failed to log AI usage:', error)
    }
  }
}
