# Music Dictionary Service Documentation

## Overview

The Music Dictionary Service is a comprehensive, AI-powered microservice that provides musical term definitions and educational content for the Mirubato platform. Built on Cloudflare Workers, it leverages edge computing for global low-latency access while integrating multiple AI providers for content generation and enhancement.

## Current Status (July 2025)

### ✅ Fully Implemented Features

#### **Core Functionality**

- ✅ **Complete Backend Service**: Fully functional Cloudflare Worker at `dictionary.mirubato.com`
- ✅ **Multi-Language Support**: 6 UI languages (en, es, fr, de, zh-TW, zh-CN) + source language tracking (it, la)
- ✅ **AI-Powered Generation**: Cloudflare AI primary with OpenAI/Anthropic/Google fallbacks
- ✅ **Quality Scoring System**: Automated quality assessment with enhancement capabilities
- ✅ **Comprehensive API**: Full REST API with all CRUD operations
- ✅ **Frontend Integration**: Complete React UI with TypeScript client
- ✅ **Security**: XSS protection, input sanitization, safe external links
- ✅ **Performance**: Multi-layer caching (Browser → Edge → KV → D1)

#### **Recent Fixes & Improvements**

- ✅ Fixed XSS vulnerabilities with iterative sanitization
- ✅ Added dictionary domains to CSP headers
- ✅ Resolved TypeScript type mismatches between backend/frontend
- ✅ Fixed CORS configuration for staging environment
- ✅ Added debug endpoints for development
- ✅ Completed i18n translations for all 6 languages
- ✅ Fixed JSON syntax errors in Chinese translations
- ✅ Fixed AI query response format mismatch causing "Invalid response from server" errors
- ✅ Fixed language handling to respect user's UI language preferences
- ✅ Fixed quality score display (was showing 7000% instead of 70%)
- ✅ Updated UI to match Circle of Fifths styling with Morandi color scheme
- ✅ Replaced all emoji icons with Lucide React icons for consistency

### 🔧 Placeholder Features (Not Critical for MVP)

While the core dictionary functionality is complete and production-ready, some analytics and admin features return placeholder data:

- **Analytics Handler**: Search analytics, AI usage stats, content gap analysis
- **Admin API Keys**: API key listing endpoint returns empty array
- **Detailed Metrics**: Token tracking, database size metrics, index efficiency

These features are scaffolded but not critical for the main dictionary operations.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                              │
│            (Web App, Mobile App, API Consumers)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Edge                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Dictionary Service Worker                │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │   Routes    │  │  Middleware  │  │  Handlers  │  │    │
│  │  │             │  │              │  │            │  │    │
│  │  │ • Health    │  │ • Auth       │  │ • Terms    │  │    │
│  │  │ • Docs      │  │ • Rate Limit │  │ • Search   │  │    │
│  │  │ • API v1    │  │ • Cache      │  │ • Batch    │  │    │
│  │  │             │  │ • Logging    │  │ • Enhance  │  │    │
│  │  │             │  │ • CORS       │  │ • Export   │  │    │
│  │  │             │  │ • Request ID │  │ • Admin    │  │    │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┬─────────────────┐
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   D1 Database │ │  KV Namespace │ │   R2 Bucket   │ │ AI Providers  │
│               │ │               │ │               │ │               │
│ • Dictionary  │ │ • Cache       │ │ • Exports     │ │ • Cloudflare  │
│   entries     │ │ • Rate limits │ │ • Backups     │ │ • OpenAI      │
│ • Analytics   │ │ • Sessions    │ │ • Reports     │ │ • Anthropic   │
│ • Feedback    │ │               │ │               │ │ • Google      │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

### Core Components

#### **1. Routing Layer** (`src/routes/`)

- **health.ts**: Health check endpoints (/health, /livez, /readyz, /metrics)
- **docs.ts**: OpenAPI documentation and Swagger UI
- **dictionary.ts**: Main API routes with version prefixing

#### **2. Middleware Stack** (`src/middleware/`)

- **Authentication**: JWT validation, API keys, role-based access
- **Rate Limiting**: Tiered limits with sliding window algorithm
- **Caching**: KV-based response caching with ETags
- **Request Tracking**: UUID generation and structured logging

#### **3. API Handlers** (`src/api/handlers/`)

- **Terms**: Single term lookup with AI generation fallback
- **Search**: Full-text and semantic search with analytics
- **Batch**: Bulk queries up to 50 terms
- **Enhancement**: AI-powered quality improvement
- **Admin**: Term management and seeding
- **Debug**: Development helpers for testing

#### **4. Services Layer** (`src/services/`)

- **Storage**: D1 database queries, KV cache, R2 exports
- **AI**: Multi-provider orchestration, quality scoring
- **Analytics**: Search tracking and usage metrics

### Data Models

```typescript
interface DictionaryEntry {
  id: string
  term: string
  normalized_term: string
  type: TermType
  lang: string // Language of the entry
  source_lang?: string // Original language (e.g., 'it' for Italian terms)
  lang_confidence: number // Language detection confidence
  definition: {
    concise: string
    detailed: string
    etymology?: string
    pronunciation?: Pronunciation
    usage_example?: string
  }
  metadata: {
    instruments?: string[]
    difficulty_level?: string
    historical_period?: string
    cultural_origin?: string
    related_terms?: string[]
  }
  references: References
  ai_metadata: AIMetadata
  quality_score: QualityScore
  created_at: string
  updated_at: string
  version: number
}
```

## API Specification

### Base URL

```
https://dictionary.mirubato.com/api/v1
```

### Key Endpoints

#### **Search with Language Support**

```http
GET /search?q=forte&lang=es
GET /search?q=pianissimo&searchAllLanguages=true
GET /search?q=allegro&preferredLangs=en,es,fr
```

#### **Get Term**

```http
GET /terms/:term?lang=fr
GET /terms/:term/languages?languages=en,es,fr,de
```

#### **Batch Query**

```http
POST /batch/query
{
  "terms": ["allegro", "andante", "adagio"],
  "lang": "fr"
}
```

#### **Admin Operations**

```http
POST /admin/seed/initialize  # Initialize seed queue
POST /admin/seed/process     # Process seed queue
GET /admin/seed/status       # Check queue status
```

## Frontend Integration

### TypeScript Client Usage

```typescript
import { dictionaryAPI } from '@/api/dictionary'
import { useTranslation } from 'react-i18next'

function DictionarySearch() {
  const { i18n } = useTranslation()

  const searchTerm = async (query: string) => {
    const results = await dictionaryAPI.searchTerms({
      query,
      lang: i18n.language as SupportedLanguage,
      searchAllLanguages: true,
    })
    return results
  }
}
```

### UI Components & Styling

The dictionary UI follows the Mirubato design system with consistent styling:

#### **Component Architecture**

- **Dictionary**: Main container component orchestrating the dictionary functionality
- **DictionarySearch**: Search bar with autocomplete and validation
- **DictionaryResults**: Search results display with pagination
- **DictionaryTerm**: Detailed term view with multi-language support
- **DictionaryCategories**: Category browser for exploring terms by type
- **DictionaryPopular**: Popular terms and recent searches display
- **DictionaryReferences**: External references with secure link handling
- **SafeExternalLink**: Security wrapper for external URLs

#### **Visual Design (Updated July 2025)**

- **Card Styling**: All cards use Circle of Fifths pattern: `bg-white rounded-lg p-X border-l-4 border-morandi-[color]-300`
- **Color Scheme**:
  - Sage (green): Main dictionary content and primary actions
  - Rose: Popular terms and trending content
  - Peach: Related content and suggestions
  - Sky: Language indicators and info cards
  - Sand: Feedback and supplementary sections
- **Icons**: Lucide React icons throughout (no emojis)
  - Clock for tempo
  - Volume2 for dynamics/audio
  - Music2 for articulation
  - Layout for form
  - Theater for genre
  - Piano/Guitar for instruments
  - BookOpen for theory
  - User for composers
  - Calendar for periods
- **Responsive**: Mobile-first design with proper touch targets

### Security Features

The frontend implements comprehensive security measures:

- **XSS Protection**: Multi-layer sanitization with DOMPurify
- **URL Validation**: Whitelist-based external link filtering
- **Content Security**: Safe rendering of AI-generated content
- **External Link Warnings**: User confirmation for external domains

## Performance & Caching

### Multi-Layer Caching Strategy

1. **Browser Cache**: Cache-Control headers (5min - 1hr)
2. **Edge Cache**: Cloudflare CDN (1hr - 24hr)
3. **KV Cache**: Application-level (5min - 1hr)
4. **Database Cache**: D1 query caching

### Performance Targets

- **P95 Latency**: < 200ms for cached terms
- **P95 Latency**: < 2s for AI generation
- **Availability**: 99.9% uptime
- **Throughput**: 10,000 requests/minute

## AI Integration

### Provider Strategy

```typescript
interface AIStrategy {
  primary: {
    model: 'llama-3.1-8b-instruct'
    provider: 'cloudflare'
    useCase: 'initial_definition_generation'
  }
  validation: {
    model: 'mistral-7b-instruct-v0.2'
    provider: 'cloudflare'
    useCase: 'quality_verification'
  }
  enhancement: {
    model: 'claude-3-haiku'
    provider: 'anthropic'
    useCase: 'periodic_quality_improvement'
  }
  fallback: {
    model: 'gpt-3.5-turbo'
    provider: 'openai'
    useCase: 'error_recovery'
  }
}
```

### Quality Scoring Components

- **Accuracy**: Technical correctness (0-1)
- **Completeness**: Coverage of aspects (0-1)
- **Clarity**: Readability and structure (0-1)
- **References**: Source quality (0-1)
- **Overall**: Weighted average

## Deployment & Configuration

### Local Development

```bash
cd dictionary
npm install
npm run db:migrate        # Run migrations
npm run dev              # Start dev server (port 9799)
```

### Environment Configuration

```bash
# Required secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put JWT_SECRET --env staging

# Optional AI providers
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put ANTHROPIC_API_KEY --env production
wrangler secret put GOOGLE_API_KEY --env production
```

### Deployment

```bash
# Staging
wrangler deploy --env staging

# Production
wrangler deploy --env production
```

### Health Monitoring

- **Health Check**: `https://dictionary.mirubato.com/health`
- **API Docs**: `https://dictionary.mirubato.com/docs`
- **Metrics**: `https://dictionary.mirubato.com/metrics`

## TypeScript Build Fixes Applied

### Key Issues Resolved

1. **Database null vs undefined**: Created `formatDictionaryEntry` helper for conversions
2. **DictionaryGenerator constructor**: Updated to use correct `Env` parameter
3. **Private method access**: Used public `generateEntry` method
4. **Missing properties**: Accessed properties from correct object locations
5. **OpenAPI response types**: Added missing status codes and consistent formatting

## Migration Notes

### From GraphQL to REST

The dictionary service uses REST API patterns consistent with the migrated Mirubato architecture:

- RESTful endpoints with clear resource paths
- JWT authentication matching other services
- Consistent error response format
- OpenAPI documentation

### Database Schema Updates

Recent migrations added:

1. Multi-language support fields (`lang`, `source_lang`, `lang_confidence`)
2. Seed queue table for batch term generation
3. Proper indexes for performance
4. Updated CHECK constraints for new term types

## Future Enhancements

### Planned Features

1. **Audio Pronunciations**: TTS integration for term pronunciation
2. **Visual Examples**: Image/diagram storage in R2
3. **Collaborative Editing**: User-contributed definitions
4. **Advanced Analytics**: ML-based usage insights
5. **Real-time Updates**: WebSocket support for live features

### Scaling Considerations

- Durable Objects for real-time features
- Queue processing for batch operations
- Multi-region database replication
- GraphQL API layer (optional)

## Cost Analysis

### Estimated Monthly Costs (10K daily active users)

```
AI Processing:
- Cloudflare AI: ~$20/month (500K queries)
- OpenAI Fallback: ~$10/month (50K queries)
- Claude Enhancement: ~$15/month (weekly batch)

Storage:
- D1 Database: ~$5/month (10GB)
- KV Storage: ~$5/month (1M reads)
- R2 Storage: ~$2/month (exports)

Total: ~$57/month
```

## Automatic Pre-Seeding System (December 2025)

### Overview

The dictionary service now includes an automatic pre-seeding system that generates high-quality musical term definitions while respecting Cloudflare AI free tier limits. The system prioritizes quality over quantity, using 50% of daily tokens for seeding while reserving 50% for user queries.

### Token Budget Management

**Daily Allocation:**

- Total Free Tier: 10,000 neurons/day
- User Queries: 5,000 neurons (50%)
- Auto-Seeding: 5,000 neurons (50%)
- Using Llama 3.1 8B: ~595 high-quality terms/day

**Budget Manager Features:**

- Hard limit at 4,500 tokens (90% of allocation)
- Circuit breaker protection
- Real-time usage tracking
- Automatic suspension on overrun

### Seeding Strategy

**Phase 1 - Core Terms (Month 1):**

- Priority 10 terms: tempo, dynamics, articulation
- Priority 9 terms: theory, notation
- ~50 essential sight-reading terms

**Phase 2 - Extended Terms (Months 2-3):**

- Priority 8 terms: instruments, form, technique
- Priority 7 terms: genre, period
- Wikipedia relationship extraction
- ~500 total terms by month 3

### Quality Controls

- **Minimum Quality Score**: 85%
- **Batch Size**: 5 terms (quality over speed)
- **Manual Review Queue**: For scores 85-87%
- **Auto-Approval**: Only for scores >87%
- **Daily Quality Reports**: Track average scores

### Configuration

**Staging Environment:**

```javascript
SEED_ENABLED = true
SEED_DAILY_LIMIT = 10 // Only 10 terms/day
SEED_PRIORITY_THRESHOLD = 10 // Highest priority only
SEED_BATCH_SIZE = 2
QUALITY_MIN_THRESHOLD = 90
```

**Production Environment:**

```javascript
SEED_ENABLED = true
SEED_DAILY_TOKEN_BUDGET = 5000
SEED_PRIORITY_THRESHOLD = 8
SEED_BATCH_SIZE = 5
QUALITY_MIN_THRESHOLD = 85
```

### Scheduled Processing

**Production Schedule (UTC):**

- 02:00 - Process batch (low traffic)
- 08:00 - Process batch (before work)
- 14:00 - Process batch (lunch)
- 20:00 - Process batch (evening)

**Staging Schedule:**

- 12:00 - Single daily test run

### Implementation Components

1. **TokenBudgetManager**: Tracks and enforces daily limits
2. **SeedProcessor**: Quality-first term generation
3. **Scheduled Handler**: Cron job processing
4. **Quality Validator**: Ensures high standards
5. **Monitoring Service**: Tracks metrics and alerts

### Database Schema Updates

```sql
-- Token usage tracking
CREATE TABLE ai_token_usage (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  terms_processed INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Manual review queue
CREATE TABLE manual_review_queue (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  generated_content TEXT NOT NULL,
  quality_score REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_at TEXT,
  reviewer_notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Monitoring & Metrics

**Key Metrics:**

- Average quality score (target: >87%)
- Token usage vs budget (target: <90%)
- Terms processed per day
- Manual review queue size
- User query token availability

**Alerts:**

- Token budget >80% used
- Quality score <85% average
- Failed generation attempts >10%
- Manual review queue >50 items

### Future Enhancements

1. **Wikipedia Relationship Parser** (Month 2)
   - Extract term relationships
   - Build knowledge graph
   - Enhance cross-references

2. **Progressive Enhancement** (Month 3)
   - Re-process low-quality terms
   - Add pronunciation audio
   - Expand examples

3. **Multi-Model Strategy** (Month 4)
   - Test smaller models for specific tasks
   - Optimize token usage further
   - A/B test quality differences

## Summary

The Music Dictionary Service is **production-ready** with:

- ✅ Full core functionality implemented and tested
- ✅ Multi-language support across 6 languages
- ✅ Comprehensive security measures
- ✅ Performance optimization with caching
- ✅ Complete frontend integration
- ✅ All critical bugs fixed
- 🚀 **NEW**: Automatic pre-seeding system (December 2025)

The service provides a robust foundation for musical education with AI-powered content generation, making it a valuable addition to the Mirubato platform.

---

_Last Updated: December 2025_  
_Version: 1.1.0_  
_Status: Production Ready with Auto-Seeding_
