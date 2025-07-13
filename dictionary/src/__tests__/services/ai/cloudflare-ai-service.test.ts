import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudflareAIService } from '../../../services/ai/cloudflare-ai-service'
import type { Env } from '../../../types/env'
import { AIServiceError } from '../../../utils/errors'

describe('CloudflareAIService', () => {
  let service: CloudflareAIService
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = {
      AI: {
        run: vi.fn()
      } as any,
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn()
          })
        })
      } as any,
      CACHE: {} as any,
      STORAGE: {} as any,
      QUALITY_THRESHOLD: '70',
      CACHE_TTL: '3600',
      ENVIRONMENT: 'test',
      API_SERVICE_URL: 'http://localhost:8787'
    }

    service = new CloudflareAIService(mockEnv)
  })

  describe('generateStructuredContent', () => {
    it('should generate structured content successfully', async () => {
      const mockResponse = {
        response: '{"definition": "A piano is a keyboard instrument."}'
      }
      ;(mockEnv.AI.run as any).mockResolvedValue(mockResponse)

      const result = await service.generateStructuredContent(
        'Define piano',
        '@cf/meta/llama-3.1-8b-instruct'
      )

      expect(result.response).toBe(mockResponse.response)
      expect(result.model).toBe('@cf/meta/llama-3.1-8b-instruct')
      expect(result.latency_ms).toBeDefined()
      expect(result.cached).toBe(false)

      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/meta/llama-3.1-8b-instruct', {
        prompt: expect.stringContaining('Define piano'),
        max_tokens: 500,
        temperature: 0.3,
        top_p: 0.9,
        stream: false
      })
    })

    it('should handle AI service errors', async () => {
      const error = new Error('AI service unavailable')
      ;(mockEnv.AI.run as any).mockRejectedValue(error)

      await expect(
        service.generateStructuredContent('Define piano')
      ).rejects.toThrow(AIServiceError)

      await expect(
        service.generateStructuredContent('Define piano')
      ).rejects.toThrow('Cloudflare AI generation failed')
    })

    it('should use custom options', async () => {
      const mockResponse = { response: '{"test": true}' }
      ;(mockEnv.AI.run as any).mockResolvedValue(mockResponse)

      await service.generateStructuredContent('Test prompt', '@cf/mistral/mistral-7b', {
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.95,
        stream: true
      })

      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/mistral/mistral-7b', {
        prompt: expect.any(String),
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.95,
        stream: true
      })
    })
  })

  describe('generateEmbedding', () => {
    it('should generate embeddings successfully', async () => {
      const mockEmbedding = {
        data: [new Array(768).fill(0.1)]
      }
      ;(mockEnv.AI.run as any).mockResolvedValue(mockEmbedding)

      const result = await service.generateEmbedding('piano keyboard instrument')

      expect(result).toEqual(mockEmbedding.data[0])
      expect(result).toHaveLength(768)
      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        '@cf/baai/bge-base-en-v1.5',
        { text: 'piano keyboard instrument' }
      )
    })

    it('should handle embedding generation errors', async () => {
      (mockEnv.AI.run as any).mockRejectedValue(new Error('Embedding failed'))

      await expect(
        service.generateEmbedding('test text')
      ).rejects.toThrow(AIServiceError)
    })

    it('should use custom embedding model', async () => {
      const mockEmbedding = {
        data: [new Array(1024).fill(0.2)]
      }
      ;(mockEnv.AI.run as any).mockResolvedValue(mockEmbedding)

      await service.generateEmbedding('test text', '@cf/baai/bge-large-en-v1.5')

      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        '@cf/baai/bge-large-en-v1.5',
        { text: 'test text' }
      )
    })
  })

  describe('batchGenerate', () => {
    it('should process batch requests', async () => {
      const prompts = [
        'Define piano',
        'Define guitar',
        'Define violin',
        'Define drums',
        'Define flute',
        'Define saxophone'
      ]

      const mockResponses = prompts.map((_, i) => ({
        response: `{"definition": "Definition ${i}"}`
      }))

      let callCount = 0
      ;(mockEnv.AI.run as any).mockImplementation(() => {
        return Promise.resolve(mockResponses[callCount++])
      })

      const results = await service.batchGenerate(prompts)

      expect(results).toHaveLength(6)
      expect(mockEnv.AI.run).toHaveBeenCalledTimes(6)
      
      // Should process in batches of 5
      expect(results.map(r => r.response)).toEqual(
        mockResponses.map(r => r.response)
      )
    })

    it('should handle partial batch failures gracefully', async () => {
      const prompts = ['prompt1', 'prompt2', 'prompt3']
      
      ;(mockEnv.AI.run as any)
        .mockResolvedValueOnce({ response: '{"success": true}' })
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce({ response: '{"success": true}' })

      // The batchGenerate method uses allSettled so it doesn't throw
      const results = await service.batchGenerate(prompts)
      
      expect(results).toHaveLength(3)
      expect(results[0].response).toBe('{"success": true}')
      expect(results[1].error).toBe('Cloudflare AI generation failed: AI error')
      expect(results[2].response).toBe('{"success": true}')
    })
  })

  describe('testConnection', () => {
    it('should test AI connection availability', async () => {
      (mockEnv.AI.run as any).mockResolvedValue({
        response: '{"status": "OK"}'
      })

      const result = await service.testConnection()

      expect(result.available).toBe(true)
      expect(result.latency).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it('should handle connection test failures', async () => {
      (mockEnv.AI.run as any).mockRejectedValue(new Error('Model not available'))

      const result = await service.testConnection()

      expect(result.available).toBe(false)
      expect(result.error).toBe('Model not available')
    })

    it('should handle missing AI binding', async () => {
      const serviceWithoutAI = new CloudflareAIService({ ...mockEnv, AI: undefined } as any)
      const result = await serviceWithoutAI.testConnection()

      expect(result.available).toBe(false)
      expect(result.error).toBe('Cloudflare AI binding not configured')
    })
  })

  describe('parseJSONResponse', () => {
    it('should parse clean JSON', () => {
      const jsonString = '{"key": "value", "number": 42}'
      const result = service.parseJSONResponse<{ key: string; number: number }>(jsonString)

      expect(result).toEqual({ key: 'value', number: 42 })
    })

    it('should handle JSON with markdown code blocks', () => {
      const jsonWithMarkdown = '```json\n{"key": "value"}\n```'
      const result = service.parseJSONResponse(jsonWithMarkdown)

      expect(result).toEqual({ key: 'value' })
    })

    it('should handle JSON with extra text', () => {
      const jsonWithText = 'Here is the response: {"key": "value"} and some more text'
      const result = service.parseJSONResponse(jsonWithText)

      expect(result).toEqual({ key: 'value' })
    })

    it('should handle arrays', () => {
      const arrayJson = '[1, 2, 3, 4, 5]'
      const result = service.parseJSONResponse<number[]>(arrayJson)

      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should throw on invalid JSON', () => {
      expect(() => service.parseJSONResponse('not json')).toThrow('Failed to parse AI response as JSON')
    })

    it('should throw on empty response', () => {
      expect(() => service.parseJSONResponse('')).toThrow('Empty response from AI model')
    })
  })

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      // Roughly 4 characters per token
      const text = 'This is a test sentence with multiple words.'
      const estimate = (service as any).estimateTokens(text)

      expect(estimate).toBeGreaterThan(5)
      expect(estimate).toBeLessThan(20)
    })

    it('should handle empty text', () => {
      const estimate = (service as any).estimateTokens('')
      expect(estimate).toBe(0)
    })
  })

  describe('logUsage', () => {
    it('should log AI usage to database', async () => {
      const usage = {
        model_name: '@cf/meta/llama-3.1-8b-instruct',
        model_provider: 'cloudflare',
        operation_type: 'generation' as const,
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
        latency_ms: 500,
        success: true
      }

      await (service as any).logUsage(usage)

      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_model_usage')
      )
    })

    it('should handle logging errors gracefully', async () => {
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('DB error'))
        })
      })

      // Should not throw
      await expect((service as any).logUsage({})).resolves.not.toThrow()
    })
  })
})