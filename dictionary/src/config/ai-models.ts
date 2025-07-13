/**
 * AI Model Configuration
 * Based on Cloudflare Workers AI documentation: https://developers.cloudflare.com/workers-ai/
 */

import { CloudflareAIModels, AIPipelineConfig } from '../types/ai'

export const CLOUDFLARE_AI_MODELS: CloudflareAIModels = {
  TEXT_GENERATION: {
    LLAMA_3_1_8B: {
      model: '@cf/meta/llama-3.1-8b-instruct',
      provider: 'cloudflare',
      maxTokens: 2048,
      temperature: 0.3,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      cost_per_million_tokens: 0.04,
      latency_estimate_ms: 500,
      strengths: [
        'Structured output',
        'Musical knowledge',
        'JSON formatting',
        'Multi-language',
      ],
      use_cases: [
        'definition_generation',
        'content_enhancement',
        'reference_extraction',
      ],
    },

    LLAMA_3_2_3B: {
      model: '@cf/meta/llama-3.2-3b-instruct',
      provider: 'cloudflare',
      maxTokens: 1024,
      temperature: 0.1,
      top_p: 0.95,
      cost_per_million_tokens: 0.049,
      latency_estimate_ms: 200,
      strengths: [
        'Very fast response',
        'Cost-effective',
        'Good for validation',
        'Consistent output',
      ],
      use_cases: ['quality_validation', 'simple_queries', 'classification'],
    },

    LLAMA_3_3_70B: {
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      provider: 'cloudflare',
      maxTokens: 2048,
      temperature: 0.3,
      top_p: 0.9,
      cost_per_million_tokens: 0.293, // Input cost, output is $2.253
      latency_estimate_ms: 800,
      strengths: [
        'Highest quality output',
        'Complex reasoning',
        'Excellent for etymology',
        'Superior musical knowledge',
      ],
      use_cases: ['complex_definitions', 'etymology', 'content_enhancement'],
    },
  },

  EMBEDDINGS: {
    BGE_BASE: {
      model: '@cf/baai/bge-base-en-v1.5',
      dimensions: 768,
      maxTokens: 512,
      use_cases: [
        'Term similarity',
        'Related concepts',
        'Semantic search',
        'Clustering',
      ],
    },

    BGE_LARGE: {
      model: '@cf/baai/bge-large-en-v1.5',
      dimensions: 1024,
      maxTokens: 512,
      use_cases: [
        'Complex queries',
        'Document search',
        'High-precision matching',
      ],
    },
  },

  CLASSIFICATION: {
    DISTILBERT: {
      model: '@cf/huggingface/distilbert-sst-2-int8',
      use_cases: [
        'Sentiment analysis',
        'Quality scoring',
        'Text classification',
      ],
      labels: ['positive', 'negative'],
    },
  },
}

// Recommended pipeline configuration for the dictionary service
export const AI_PIPELINE_CONFIG: AIPipelineConfig = {
  // Step 1: Definition Generation
  definition: {
    primary: CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_1_8B,
    fallback: CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_2_3B,
    retries: 2,
    timeout: 5000, // 5 seconds
  },

  // Step 2: Quality Validation
  validation: {
    model: CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_2_3B,
    scoreThreshold: 70,
    retries: 1,
    timeout: 3000, // 3 seconds
  },

  // Step 3: Enhancement (Weekly Batch)
  enhancement: {
    model: CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_1_8B,
    batchSize: 100,
    schedule: '0 0 * * 0', // Weekly on Sunday at midnight
    config: {
      temperature: 0.7, // Higher for creativity
      max_tokens: 1500,
    },
  },

  // Step 4: Embedding for Search
  search: {
    model: CLOUDFLARE_AI_MODELS.EMBEDDINGS.BGE_BASE,
    cacheEmbeddings: true,
    similarityThreshold: 0.8,
  },
}

// Prompt templates for different operations
export const PROMPT_TEMPLATES = {
  definition: (
    term: string,
    type: string,
    context?: any
  ) => `You are a professional music dictionary editor with deep knowledge of music theory, instruments, and musical terminology.

Create a comprehensive dictionary entry for the music term: "${term}"
Term type: ${type}
${context?.instruments ? `Relevant instruments: ${context.instruments.join(', ')}` : ''}
${context?.difficulty_level ? `Difficulty level: ${context.difficulty_level}` : ''}

Provide a response in the following JSON format:
{
  "concise": "A clear, accurate 1-2 sentence definition suitable for quick reference (max 200 characters)",
  "detailed": "A comprehensive explanation that covers the term's meaning, usage, and significance in music (3-5 sentences, 200-800 characters)",
  "etymology": "The word's origin and historical development (if known and relevant)",
  "pronunciation": {
    "ipa": "International Phonetic Alphabet notation",
    "syllables": ["syl", "la", "bles"],
    "stress_pattern": "primary stress on first syllable"
  },
  "usage_example": "A practical example sentence showing how the term is used in a musical context"
}

Guidelines:
- Be accurate and educational
- Use clear, accessible language
- Include musical context
- Avoid overly technical jargon unless necessary
- Ensure the definition is suitable for students and educators
- Only include etymology if it's interesting or helps understanding
- Format as valid JSON only, no additional text`,

  validation: (
    definition: string,
    term: string,
    type: string
  ) => `You are a music education quality reviewer. Evaluate the following dictionary definition for accuracy, clarity, and educational value.

Term: "${term}" (Type: ${type})
Definition: "${definition}"

Rate the quality of this definition considering:
1. Accuracy - Is the information correct and reliable?
2. Clarity - Is it easy to understand for the target audience?
3. Completeness - Does it cover the essential aspects?
4. Educational Value - Will it help students learn effectively?

Provide your evaluation in JSON format:
{
  "score": <number between 0-100>,
  "issues": ["list any problems or inaccuracies"],
  "suggestions": ["specific improvements that could be made"],
  "strengths": ["what aspects are particularly good"]
}

Be constructive and specific in your feedback.`,

  enhancement: (
    entry: any,
    focusAreas?: string[]
  ) => `You are enhancing a music dictionary entry to make it more comprehensive and valuable for learners.

Current entry:
${JSON.stringify(entry, null, 2)}

${focusAreas ? `Focus on improving: ${focusAreas.join(', ')}` : 'Enhance all aspects of the entry'}

Enhance this entry by:
1. Adding related terms and cross-references
2. Including historical context where relevant
3. Providing notable examples from famous compositions or musicians
4. Adding learning tips or common misconceptions
5. Expanding the usage examples
6. Including difficulty progression information
7. Adding cultural context if applicable

Maintain the existing JSON structure but enrich the content. Ensure all additions are accurate and educationally valuable.

Return the enhanced entry as valid JSON.`,

  relatedTerms: (
    term: string,
    definition: string
  ) => `Given the music term "${term}" with definition: "${definition}"

List 5-10 related musical terms that students should also know. For each term, specify the relationship type:
- synonym: terms with the same meaning
- antonym: opposite terms
- see_also: closely related concepts
- broader: more general category
- narrower: more specific examples

Format as JSON:
{
  "related_terms": [
    {
      "term": "related term",
      "relationship": "relationship_type",
      "relevance": <0.0-1.0>
    }
  ]
}`,

  referenceExtraction: (
    term: string,
    type: string
  ) => `Help find authoritative references for the music term "${term}" (type: ${type}).

Suggest appropriate resources in JSON format:
{
  "wikipedia_search": "best search query for Wikipedia",
  "book_keywords": ["keywords", "for", "book", "search"],
  "youtube_search": "search query for educational videos",
  "academic_keywords": ["keywords", "for", "research", "papers"]
}

Focus on educational and authoritative sources.`,

  qualityCheck: (
    entry: any
  ) => `You are a music education quality reviewer. Evaluate the following dictionary entry for overall quality.

Entry:
${JSON.stringify(entry, null, 2)}

Evaluate the entry considering:
1. Definition accuracy and clarity
2. Completeness of information
3. Educational value for music students
4. Reference quality and availability
5. Overall usefulness for learning

Provide your evaluation in JSON format:
{
  "score": <number between 0-100>,
  "issues": ["list any significant problems"],
  "suggestions": ["specific improvements that could be made"]
}

Be objective and constructive in your assessment.`,
}

// Model selection helper
export function selectModel(
  operation: string,
  preferFast: boolean = false
): string {
  switch (operation) {
    case 'definition':
      return preferFast
        ? CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_2_3B.model
        : CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_1_8B.model

    case 'validation':
      return CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_2_3B.model

    case 'enhancement':
      return CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_3_70B.model

    case 'translation':
      return CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_1_8B.model

    case 'embedding':
      return CLOUDFLARE_AI_MODELS.EMBEDDINGS.BGE_BASE.model

    case 'quality':
      return CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_2_3B.model

    default:
      return CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_1_8B.model
  }
}
