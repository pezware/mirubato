---
Spec-ID: SPEC-INT-001
Title: AI Services Integration
Status: ✅ Active
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# AI Services Integration Specification

Status: ✅ Active

## What

Strategic integration of AI models for metadata extraction, content generation, and intelligent features using Cloudflare AI and Gemini as fallback.

## Why

- Manual data entry creates friction in practice logging
- Sheet music metadata extraction saves significant user time
- AI-powered definitions enhance music education experience
- Edge-deployed AI provides low-latency responses globally
- Hybrid approach ensures reliability when primary AI fails

## How

- Primary: Cloudflare Workers AI for edge deployment
- Fallback: Google Gemini for complex cases
- Hybrid strategy merges results for higher confidence
- Service-specific integration (Scores and Dictionary services)
- Cost management through caching and rate limiting

## Architecture Overview

### AI Provider Strategy

| Provider          | Purpose              | Use Cases                             | Cost Model          |
| ----------------- | -------------------- | ------------------------------------- | ------------------- |
| **Cloudflare AI** | Primary provider     | Score metadata, term definitions      | Per-request pricing |
| **Google Gemini** | Fallback/enhancement | Complex scores, detailed explanations | Token-based pricing |
| **Hybrid**        | Best of both         | Critical extractions                  | Combined costs      |

### Service Integration Points

- **Scores Service**: PDF metadata extraction, visual analysis
- **Dictionary Service**: Term definitions, multilingual content
- **API Service**: Future: practice recommendations
- **Frontend**: Future: natural language search

## Cloudflare AI Integration

### Available Models

**Vision Models**:

- `@cf/meta/llama-3.2-11b-vision-instruct` - Score image analysis
- Input: Base64 encoded images
- Output: Structured metadata

**Text Models**:

- `@cf/meta/llama-3.1-8b-instruct` - Complex explanations
- `@cf/meta/llama-3.2-3b-instruct` - Quick responses
- Streaming support for real-time responses

**Embedding Models**:

- `@cf/baai/bge-base-en-v1.5` - Semantic search (768 dimensions)
- Used for similarity matching in dictionary

### Integration Benefits

- **No cold starts**: Models stay warm at edge
- **Regional processing**: Data stays in user's region
- **Integrated billing**: Single Cloudflare invoice
- **Automatic scaling**: Handles load spikes transparently

## Core AI Features

### 1. Score Metadata Extraction

**Purpose**: Extract structured information from sheet music PDFs

**Process**:

1. Convert PDF first page to image
2. Analyze with vision model
3. Extract: title, composer, opus, key, difficulty
4. Normalize composer names
5. Assign confidence scores

**Hybrid Approach**:

- Cloudflare AI attempts first (fast, cheap)
- Gemini fallback on low confidence
- Merge results for higher accuracy

**Code**: `scores/src/services/hybridAiExtractor.ts`

### 2. Music Term Definitions

**Purpose**: Generate contextual explanations for musical terms

**Multi-language Support**:

- English, Spanish, French, German, Chinese (Traditional & Simplified)
- Context-aware translations
- Difficulty-appropriate explanations

**Caching Strategy**:

- KV storage for common terms
- 30-day TTL for generated content
- Invalidation on quality feedback

**Code**: `dictionary/src/services/aiDefinitionGenerator.ts`

### 3. Visual Analysis (Active)

**Extracted Features**:

- Notation type (standard, tablature, chord chart)
- Staff count and complexity
- Quality assessment (scan quality)
- Special markings (dynamics, fingerings, lyrics)

**Use Cases**:

- Automatic difficulty assessment
- Collection categorization
- Search filtering

### 4. Practice Insights (Planned)

**Future Capabilities**:

- Pattern recognition in practice logs
- Personalized suggestions
- Progress predictions
- Technique recommendations

## Error Handling

### Fallback Strategy

1. **Primary Failure**: Cloudflare AI timeout/error
2. **Automatic Fallback**: Switch to Gemini
3. **Degraded Mode**: Use filename parsing if both fail
4. **User Notification**: Show confidence indicators

### Rate Limiting

- **Per-user limits**: 10 AI requests per minute
- **Service limits**: 1000 requests per hour total
- **Queue overflow**: Reject with 429 status
- **Priority queue**: Premium users (future)

## Performance Optimization

### Caching Layers

1. **Edge Cache**: Cloudflare CDN for images
2. **KV Cache**: Processed results (7-day TTL)
3. **Browser Cache**: Local storage for recent results
4. **Embedding Cache**: Pre-computed vectors

### Request Optimization

- **Batch processing**: Group similar requests
- **Image compression**: Reduce to 1024x1024 before analysis
- **Prompt optimization**: Minimized token usage
- **Streaming responses**: Start rendering before completion

## Cost Management

### Usage Tracking

- **Per-service metrics**: Track by Scores/Dictionary
- **Per-model costs**: Monitor expensive operations
- **User attribution**: Future billing integration
- **Daily limits**: Prevent runaway costs

### Optimization Strategies

- Cache everything possible
- Use smaller models when sufficient
- Batch similar requests
- Implement request coalescing

## Code References

### Scores Service

- Hybrid extractor: `scores/src/services/hybridAiExtractor.ts`
- Cloudflare AI: `scores/src/services/cloudflareAiExtractor.ts`
- Gemini client: `scores/src/services/geminiAiExtractor.ts`
- Types: `scores/src/types/ai.ts`

### Dictionary Service

- AI definitions: `dictionary/src/services/aiDefinitionGenerator.ts`
- Embeddings: `dictionary/src/services/embeddingService.ts`
- Prompt templates: `dictionary/src/prompts/`

### Configuration

- Environment variables: `*/wrangler.toml` (AI bindings)
- Model configs: `*/src/config/ai.ts`

## Operational Limits

- **Request timeout**: 10 seconds for AI calls
- **Image size**: Max 10MB, auto-resize to 1024x1024
- **Token limits**: 2048 tokens per request
- **Batch size**: 10 images per batch
- **Cache duration**: 7 days for results, 30 days for definitions

## Failure Modes

- **Model unavailable**: Fallback to alternate provider
- **Token limit exceeded**: Truncate prompt, retry
- **Invalid image format**: Return error, suggest re-upload
- **Network timeout**: Queue for retry with exponential backoff
- **Quote exceeded**: Disable AI features, notify user

## Monitoring

### Metrics Tracked

- Request count by model and service
- Response times (p50, p95, p99)
- Error rates by type
- Cache hit rates
- Token usage and costs

### Alerts

- Error rate > 5%
- Response time > 5s (p95)
- Daily cost > $50
- Cache hit rate < 60%

## Decisions

- **Cloudflare AI primary** (2024-04): Edge deployment, integrated billing
- **Hybrid approach** (2024-06): Reliability over single provider
- **Vision over OCR** (2024-07): Better for musical notation
- **Caching aggressive** (2024-08): Reduce costs, improve speed
- **No training on user data** (2024-09): Privacy first

## Non-Goals

- Custom model training on user data
- Real-time audio transcription
- Music generation/composition
- Optical music recognition (OMR) to MusicXML
- User-specific model fine-tuning

## Open Questions

- Should we add OpenAI as third provider?
- When to implement audio transcription?
- How to handle non-Western musical notation?
- Should we cache embeddings indefinitely?
- How to monetize AI features?

## Security & Privacy Considerations

- **Data isolation**: AI requests contain no PII
- **Regional processing**: Data stays in user's region
- **No training**: User data never used for model training
- **Audit logging**: All AI requests logged without content
- **Rate limiting**: Prevent abuse and cost overruns
- **Sanitization**: Remove metadata from uploaded images

## Related Documentation

- [Scorebook Feature](../05-features/scorebook.md) - AI metadata extraction details
- [Dictionary Feature](../05-features/dictionary.md) - AI term generation
- [Third-Party Integrations](./third-party.md) - External AI providers

---

Last updated: 2025-09-11 | Version 1.7.6
