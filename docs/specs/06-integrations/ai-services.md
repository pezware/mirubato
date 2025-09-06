# AI Services Integration Specification

## Purpose

AI services enhance Mirubato with intelligent features that would be impossible or impractical to implement with traditional algorithms. These services provide metadata extraction, content generation, intelligent suggestions, and natural language understanding.

## Why AI Integration Matters

Manual data entry is the enemy of consistent practice logging. AI eliminates friction by:

- **Extracting metadata** from score images automatically
- **Generating explanations** for musical terms
- **Providing practice suggestions** based on patterns
- **Understanding natural language** queries
- **Identifying patterns** humans might miss

## Cloudflare AI Architecture

### Why Cloudflare AI

**Advantages**:

- **Edge deployment**: AI runs near users globally
- **No cold starts**: Models stay warm
- **Cost effective**: Pay per request, not for idle GPUs
- **Privacy focused**: Data stays in region
- **Integrated**: Works seamlessly with Workers

### Available Models

```typescript
interface CloudflareAIModels {
  // Vision models (for score analysis)
  vision: {
    '@cf/llava-hf/llava-1.5-7b-hf': {
      purpose: 'Score metadata extraction'
      inputTypes: ['image']
      outputType: 'structured-text'
    }
  }

  // Text models (for explanations)
  text: {
    '@cf/meta/llama-2-7b-chat-int8': {
      purpose: 'Term explanations, suggestions'
      maxTokens: 2048
      streaming: true
    }
  }

  // Embedding models (for search)
  embeddings: {
    '@cf/baai/bge-base-en-v1.5': {
      purpose: 'Semantic search'
      dimensions: 768
    }
  }

  // Audio models (future)
  audio: {
    '@cf/openai/whisper': {
      purpose: 'Practice session transcription'
      languages: ['en', 'es', 'fr', 'de', 'it']
    }
  }
}
```

## Core AI Features

### 1. Score Metadata Extraction

**Purpose**: Extract structured information from sheet music images.

**Implementation Strategy**:

```typescript
interface ScoreAnalyzer {
  async analyzeScore(imageUrl: string): Promise<ScoreMetadata> {
    // Prepare image for AI
    const imageData = await this.prepareImage(imageUrl)

    // Construct targeted prompt
    const prompt = this.buildExtractionPrompt()

    // Query vision model
    const response = await env.AI.run(
      '@cf/llava-hf/llava-1.5-7b-hf',
      {
        image: imageData,
        prompt: prompt,
        max_tokens: 512
      }
    )

    // Parse and validate response
    return this.parseAIResponse(response)
  }

  buildExtractionPrompt(): string {
    return `Analyze this sheet music image and extract:
    1. Title of the piece (exact text at top)
    2. Composer name (usually below title)
    3. Opus or catalog number if visible
    4. Key signature (count sharps/flats)
    5. Time signature (numbers after clef)
    6. Tempo marking (Italian term or BPM)
    7. Dynamic markings visible
    8. Instrument (based on clef and staves)

    Return as JSON with these exact keys:
    {
      "title": "...",
      "composer": "...",
      "opus": "...",
      "key": "...",
      "timeSignature": "...",
      "tempo": "...",
      "dynamics": [...],
      "instrument": "..."
    }

    If any field is not visible, use null.`
  }

  parseAIResponse(response: string): ScoreMetadata {
    try {
      // AI responses may include explanation text
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')

      const data = JSON.parse(jsonMatch[0])

      // Validate and normalize
      return {
        title: this.cleanTitle(data.title),
        composer: this.normalizeComposer(data.composer),
        opus: this.parseOpus(data.opus),
        key: this.normalizeKey(data.key),
        timeSignature: this.validateTimeSignature(data.timeSignature),
        tempo: this.parseTempo(data.tempo),
        dynamics: this.validateDynamics(data.dynamics),
        instrument: this.normalizeInstrument(data.instrument),
        confidence: this.calculateConfidence(data)
      }
    } catch (error) {
      // Fallback to basic extraction
      return this.basicExtraction(response)
    }
  }
}
```

**Quality Assurance**:

```typescript
interface QualityControl {
  // Confidence scoring
  calculateConfidence(metadata: ScoreMetadata): number {
    let score = 0
    const weights = {
      title: 0.3,
      composer: 0.3,
      key: 0.15,
      timeSignature: 0.15,
      tempo: 0.1
    }

    for (const [field, weight] of Object.entries(weights)) {
      if (metadata[field] && this.isReasonable(field, metadata[field])) {
        score += weight
      }
    }

    return score
  }

  // Validation rules
  isReasonable(field: string, value: any): boolean {
    switch (field) {
      case 'timeSignature':
        return /^\d+\/\d+$/.test(value)
      case 'key':
        return this.validKeys.includes(value)
      case 'tempo':
        return this.validTempos.includes(value) ||
               (typeof value === 'number' && value >= 20 && value <= 300)
      default:
        return true
    }
  }
}
```

### 2. Practice Suggestions

**Purpose**: Provide intelligent practice recommendations.

**Suggestion Engine**:

```typescript
interface PracticeSuggestionAI {
  async generateSuggestions(
    context: PracticeContext
  ): Promise<Suggestion[]> {
    const prompt = `Given a musician's practice history:
    - Current repertoire: ${context.repertoire.map(r => r.title).join(', ')}
    - Recent practice: ${context.recentSessions.map(s => `${s.duration}min on ${s.piece}`).join(', ')}
    - Goals: ${context.goals.map(g => g.description).join(', ')}
    - Available time: ${context.availableTime} minutes
    - Skill level: ${context.level}

    Suggest 3 practice activities optimized for progress.
    Consider:
    1. Pieces needing attention (not practiced recently)
    2. Technical exercises for current challenges
    3. Goal alignment
    4. Variety and engagement

    Format each suggestion as:
    {
      "activity": "...",
      "duration": minutes,
      "reason": "why this helps",
      "piece": "specific piece if applicable"
    }`

    const response = await env.AI.run(
      '@cf/meta/llama-2-7b-chat-int8',
      { prompt, max_tokens: 500 }
    )

    return this.parseSuggestions(response)
  }

  // Learn from feedback
  async improveWithFeedback(
    suggestion: Suggestion,
    feedback: 'accepted' | 'rejected' | 'modified'
  ) {
    // Store feedback for pattern analysis
    await this.storeFeedback({
      suggestion,
      feedback,
      context: this.getCurrentContext(),
      timestamp: Date.now()
    })

    // Adjust future suggestions based on patterns
    if (feedback === 'rejected') {
      this.adjustWeights(suggestion.type, -0.1)
    } else if (feedback === 'accepted') {
      this.adjustWeights(suggestion.type, 0.1)
    }
  }
}
```

### 3. Natural Language Queries

**Purpose**: Understand and respond to natural language questions.

**Query Understanding**:

```typescript
interface NaturalLanguageProcessor {
  async processQuery(query: string): Promise<QueryResult> {
    // Classify intent
    const intent = await this.classifyIntent(query)

    switch (intent) {
      case 'find_score':
        return this.searchScores(query)
      case 'practice_stats':
        return this.generateStats(query)
      case 'explain_term':
        return this.explainTerm(query)
      case 'suggest_practice':
        return this.suggestPractice(query)
      default:
        return this.generalResponse(query)
    }
  }

  async classifyIntent(query: string): Promise<Intent> {
    const prompt = `Classify this music practice query into one category:
    - find_score: Looking for sheet music
    - practice_stats: Asking about practice history/statistics
    - explain_term: Asking about musical terminology
    - suggest_practice: Asking what to practice
    - general: Other music-related question

    Query: "${query}"

    Respond with only the category name.`

    const response = await env.AI.run(
      '@cf/meta/llama-2-7b-chat-int8',
      { prompt, max_tokens: 10 }
    )

    return this.parseIntent(response)
  }
}
```

### 4. Pattern Recognition

**Purpose**: Identify trends and patterns in practice data.

**Pattern Analysis**:

```typescript
interface PatternRecognition {
  async analyzePracticePatterns(
    sessions: PracticeSession[]
  ): Promise<Insights> {
    // Prepare data for analysis
    const data = this.prepareDataset(sessions)

    const prompt = `Analyze this practice data and identify patterns:
    ${JSON.stringify(data, null, 2)}

    Look for:
    1. Time-of-day preferences
    2. Duration patterns
    3. Mood correlations
    4. Progress indicators
    5. Fatigue patterns
    6. Optimal practice conditions

    Provide actionable insights, not just observations.`

    const response = await env.AI.run(
      '@cf/meta/llama-2-7b-chat-int8',
      { prompt, max_tokens: 1000 }
    )

    return this.parseInsights(response)
  }

  // Generate embeddings for similarity search
  async generateEmbeddings(text: string): Promise<number[]> {
    const response = await env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      { text }
    )

    return response.data[0] // 768-dimensional vector
  }

  // Find similar practice sessions
  async findSimilarSessions(
    session: PracticeSession
  ): Promise<PracticeSession[]> {
    const embedding = await this.generateEmbeddings(
      this.sessionToText(session)
    )

    // Cosine similarity search in vector database
    return await this.vectorSearch(embedding, 5)
  }
}
```

## Prompt Engineering Best Practices

### Effective Prompt Structure

```typescript
class PromptBuilder {
  build(task: string, context: any): string {
    return `
      ${this.role()}
      ${this.task(task)}
      ${this.context(context)}
      ${this.constraints()}
      ${this.outputFormat()}
      ${this.examples()}
    `.trim()
  }

  role(): string {
    return 'You are a knowledgeable music teacher assistant.'
  }

  task(description: string): string {
    return `Task: ${description}`
  }

  context(data: any): string {
    return `Context:\n${JSON.stringify(data, null, 2)}`
  }

  constraints(): string {
    return `Constraints:
    - Be concise and practical
    - Focus on actionable advice
    - Consider the user's skill level
    - Avoid jargon without explanation`
  }

  outputFormat(): string {
    return `Output format: JSON with specific keys as shown in examples`
  }

  examples(): string {
    return `Example:
    Input: [example input]
    Output: [example output]`
  }
}
```

### Response Validation

```typescript
class ResponseValidator {
  validate(response: string, schema: Schema): ValidationResult {
    // Check for required fields
    const missingFields = this.checkRequired(response, schema)
    if (missingFields.length > 0) {
      return { valid: false, errors: missingFields }
    }

    // Validate data types
    const typeErrors = this.checkTypes(response, schema)
    if (typeErrors.length > 0) {
      return { valid: false, errors: typeErrors }
    }

    // Check reasonable values
    const valueErrors = this.checkValues(response, schema)
    if (valueErrors.length > 0) {
      return { valid: false, errors: valueErrors }
    }

    return { valid: true }
  }
}
```

## Cost Management

### Request Optimization

```typescript
class AIRequestOptimizer {
  // Batch similar requests
  async batchRequests(requests: AIRequest[]): Promise<Response[]> {
    const batched = this.groupSimilar(requests)
    const responses = await Promise.all(
      batched.map(batch => this.processBatch(batch))
    )
    return this.unbatch(responses, requests)
  }

  // Cache common queries
  async cachedQuery(prompt: string): Promise<string> {
    const cacheKey = this.hashPrompt(prompt)

    // Check cache first
    const cached = await env.KV.get(cacheKey)
    if (cached) return cached

    // Query AI
    const response = await env.AI.run(model, { prompt })

    // Cache for appropriate duration
    const ttl = this.determineTTL(prompt)
    await env.KV.put(cacheKey, response, { expirationTtl: ttl })

    return response
  }

  // Use appropriate model for task
  selectModel(task: TaskType): ModelConfig {
    switch (task) {
      case 'simple_extraction':
        return { model: 'small', maxTokens: 100 }
      case 'complex_analysis':
        return { model: 'large', maxTokens: 1000 }
      case 'quick_classification':
        return { model: 'tiny', maxTokens: 10 }
    }
  }
}
```

### Usage Monitoring

```typescript
interface AIUsageMetrics {
  requestCount: number
  tokenCount: number
  costEstimate: number
  averageLatency: number
  errorRate: number
  cacheHitRate: number

  // Track per feature
  byFeature: {
    scoreExtraction: MetricSet
    suggestions: MetricSet
    termExplanations: MetricSet
    patternAnalysis: MetricSet
  }
}
```

## Error Handling

### Graceful Degradation

```typescript
class AIFallback {
  async executeWithFallback<T>(
    aiFunction: () => Promise<T>,
    fallback: () => T
  ): Promise<T> {
    try {
      return await this.withTimeout(aiFunction(), 5000)
    } catch (error) {
      this.logError(error)

      // Try simpler approach
      if (this.canSimplify(aiFunction)) {
        return await this.simplified(aiFunction)
      }

      // Use non-AI fallback
      return fallback()
    }
  }

  // Fallback strategies
  fallbackStrategies = {
    scoreExtraction: () => this.manualEntry(),
    suggestions: () => this.ruleBased(),
    termExplanation: () => this.dictionaryLookup(),
    patternAnalysis: () => this.statisticalAnalysis(),
  }
}
```

## Privacy and Ethics

### Data Handling Principles

1. **Minimal Data**: Send only necessary context
2. **No PII**: Strip personal identifiers
3. **Regional Processing**: Keep data in user's region
4. **Transparent**: Tell users when AI is used
5. **Opt-out Available**: Allow disabling AI features

### Responsible AI Use

```typescript
interface ResponsibleAI {
  // Add disclaimers
  wrapResponse(response: string, confidence: number): string {
    if (confidence < 0.7) {
      return `${response}\n\n*This suggestion is generated by AI and may need verification.*`
    }
    return response
  }

  // Filter inappropriate content
  async filterContent(text: string): Promise<boolean> {
    // Check for inappropriate content
    return this.contentFilter.check(text)
  }

  // Respect user preferences
  async checkConsent(userId: string, feature: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId)
    return preferences.aiFeatures[feature] !== false
  }
}
```

## Success Metrics

**Quality Metrics**:

- Extraction accuracy rate
- Suggestion acceptance rate
- Query understanding accuracy
- Pattern recognition value
- User satisfaction scores

**Performance Metrics**:

- Response latency
- Cache hit rates
- Error rates
- Cost per request
- Token efficiency

## Related Documentation

- [Scorebook](../05-features/scorebook.md) - Score metadata extraction
- [Dictionary](../05-features/dictionary.md) - Term explanations
- [Analytics](../05-features/analytics.md) - Pattern analysis
- [Cloudflare Services](../01-architecture/cloudflare-services.md) - AI platform

---

_Last updated: December 2024 | Version 1.7.6_
