# Dictionary Feature Specification

## Purpose

The Dictionary provides instant access to musical terminology, helping musicians understand markings, directions, and concepts encountered in scores and lessons. It combines curated definitions with AI-powered explanations for comprehensive musical literacy support.

## Why a Music Dictionary Matters

Musical scores contain terms in multiple languages (Italian, German, French, English) with context-dependent meanings. Musicians encounter:

- **Performance directions** they need to interpret correctly
- **Technical terms** that affect how to play
- **Historical context** that informs interpretation
- **Cultural variations** in terminology usage

Without immediate, contextual help, musicians may misinterpret crucial musical instructions.

## Core Design Principles

### 1. Speed Over Comprehensiveness

**Why**: Musicians need quick answers during practice.

**Implementation**:

- Instant search with autocomplete
- Common terms cached locally
- Recent searches remembered
- Quick access from score viewer

### 2. Context-Aware Definitions

**Why**: Musical terms change meaning by context.

**Example**: "Forte" means:

- In dynamics: "Loud"
- In structure: "Strong beat"
- In Italian: "Strong/strength"

### 3. Multilingual by Design

**Why**: Classical music uses international terminology.

**Supported Languages**:

- Italian (primary for classical terms)
- German (common in romantic period)
- French (impressionist terminology)
- English (modern directions)
- Spanish (guitar music)
- User's native language for explanations

## Key Features

### 1. Smart Search

**Purpose**: Find terms quickly even with uncertain spelling.

**Search Capabilities**:

```typescript
interface SearchFeatures {
  // Input processing
  fuzzyMatch: boolean // "alegro" → "allegro"
  synonymSearch: boolean // "fast" → "allegro, presto, vivace"
  partialMatch: boolean // "dim" → "diminuendo, diminished"

  // Language detection
  autoDetectLanguage: boolean // Identify term origin
  crossLanguageSearch: boolean // Search all languages

  // Context hints
  recentContext: string[] // Recently viewed pieces/composers
  instrumentContext?: string // Piano-specific terms
  periodContext?: string // Baroque-specific terms
}
```

**Fuzzy Matching Algorithm**:

```typescript
function fuzzyMatch(input: string, dictionary: Term[]): Term[] {
  return dictionary
    .map(term => ({
      term,
      score: calculateLevenshteinDistance(input, term.text),
    }))
    .filter(({ score }) => score < 3) // Max 2 character difference
    .sort((a, b) => a.score - b.score)
    .map(({ term }) => term)
}
```

### 2. Hierarchical Definitions

**Purpose**: Provide appropriate depth based on user needs.

**Definition Levels**:

```typescript
interface TermDefinition {
  // Quick glance (shown immediately)
  brief: string // "Gradually getting louder"

  // Standard definition (one tap away)
  standard: {
    definition: string
    pronunciation: string // IPA notation
    literal: string // Literal translation
    usage: string // How to apply it
  }

  // Advanced (for deep learning)
  advanced?: {
    etymology: string
    historicalContext: string
    famousExamples: Example[]
    commonMisunderstandings: string[]
    relatedTerms: Term[]
  }

  // Practical (for immediate use)
  practical: {
    howToPlay: string // Specific instructions
    audioExample?: string // URL to audio
    videoExample?: string // URL to video
    commonPieces: string[] // Where you'll see this
  }
}
```

### 3. AI-Enhanced Explanations

**Purpose**: Provide context-specific explanations for complex queries.

**AI Integration**:

```typescript
interface AIExplanation {
  // When to use AI
  triggers: {
    noExactMatch: boolean // Term not in database
    complexQuery: boolean // "What's the difference between..."
    contextNeeded: boolean // "What does this mean in Chopin?"
  }

  // AI prompt construction
  async generateExplanation(query: string, context?: Context) {
    const prompt = `
      Explain the musical term or concept: "${query}"
      ${context?.piece ? `In the context of: ${context.piece}` : ''}
      ${context?.instrument ? `For ${context.instrument} players` : ''}
      ${context?.level ? `For ${context.level} level musicians` : ''}

      Provide:
      1. Brief definition (one sentence)
      2. How to perform/interpret it
      3. Common examples in repertoire
      Keep response under 200 words.
    `

    return await AI.query(prompt)
  }
}
```

**Caching AI Responses**:

```typescript
interface AICache {
  key: string // Hash of query + context
  response: string
  timestamp: number
  useCount: number

  // Cache popular AI explanations permanently
  shouldPersist(): boolean {
    return this.useCount > 5
  }
}
```

### 4. Visual and Audio Examples

**Purpose**: Some concepts need to be seen or heard.

**Media Integration**:

```typescript
interface MediaExamples {
  // Visual examples
  notation?: {
    svg: string // Musical notation
    caption: string
  }

  // Audio examples
  audio?: {
    url: string
    duration: number
    description: string
  }

  // Interactive demos
  interactive?: {
    type: 'rhythm' | 'interval' | 'chord'
    component: string // Component name to load
  }
}
```

**Example Rendering**:

```
Term: Rubato

[Musical notation showing tempo flexibility]

[▶️ Play example] "Listen to the flexible timing"

Interactive: Try conducting rubato [Start Demo]
```

### 5. Personal Dictionary

**Purpose**: Musicians can add their own terms and notes.

**Custom Entries**:

```typescript
interface PersonalEntry {
  term: string
  definition: string
  source?: string // "My teacher says..."
  tags: string[] // "technique", "interpretation"
  linkedPieces?: string[] // Pieces where encountered

  // Personal notes
  notes: string // Markdown supported

  // Sharing
  visibility: 'private' | 'public' | 'students'
}
```

### 6. Integration Points

**Score Viewer Integration**:

- Long-press any text to look up
- Automatic term detection in scores
- Inline definitions on hover/tap
- Context passed to dictionary

**Practice Log Integration**:

- Tag entries with new terms learned
- Track term lookups per piece
- Suggest term review based on repertoire

**Teacher Mode**:

- Share custom definitions with students
- Track which terms students look up
- Create term lists for assignments

## Data Architecture

### Core Term Structure

```typescript
interface DictionaryTerm {
  id: string
  term: string
  normalizedTerm: string // Lowercase, no accents

  // Language and origin
  language: 'it' | 'de' | 'fr' | 'en' | 'es'
  origin?: string // Etymology

  // Categorization
  category:
    | 'tempo'
    | 'dynamics'
    | 'expression'
    | 'technique'
    | 'structure'
    | 'ornament'
    | 'articulation'
  subcategory?: string

  // Definitions
  definitions: {
    [locale: string]: TermDefinition
  }

  // Related data
  synonyms: string[]
  antonyms: string[]
  related: string[] // Related term IDs

  // Usage tracking
  lookupCount: number
  lastLookup?: number

  // Metadata
  addedAt: number
  updatedAt: number
  source: 'curated' | 'ai' | 'user' | 'import'
}
```

### Search Indexing

**Full-Text Search Setup**:

```sql
-- SQLite FTS5 for full-text search
CREATE VIRTUAL TABLE dictionary_fts USING fts5(
  term,
  definition,
  synonyms,
  content=dictionary_terms,
  tokenize='trigram'
);

-- Indexes for quick lookup
CREATE INDEX idx_dictionary_normalized ON dictionary_terms(normalizedTerm);
CREATE INDEX idx_dictionary_category ON dictionary_terms(category);
CREATE INDEX idx_dictionary_language ON dictionary_terms(language);
CREATE INDEX idx_dictionary_lookup ON dictionary_terms(lookupCount DESC);
```

### Offline Strategy

**Local Storage Tiers**:

1. **Essential Terms** (500): Always available offline
2. **Recent Lookups** (100): Cached after first lookup
3. **Piece-Specific** (Dynamic): Terms in current repertoire
4. **On-Demand**: Fetched as needed

```typescript
class DictionaryCache {
  private essentialTerms: Set<string> = new Set([
    'allegro',
    'andante',
    'forte',
    'piano', // ... top 500
  ])

  async ensureOfflineAvailability() {
    // Cache essential terms
    for (const term of this.essentialTerms) {
      await this.cacheTerm(term)
    }

    // Cache terms from active repertoire
    const repertoireTerms = await this.extractRepertoireTerms()
    for (const term of repertoireTerms) {
      await this.cacheTerm(term)
    }
  }
}
```

## User Interface Design

### Mobile-First Search

```
┌─────────────────────────┐
│ 🔍 Search terms...      │
├─────────────────────────┤
│ Recent:                 │
│ • accelerando           │
│ • diminuendo            │
├─────────────────────────┤
│ Suggestions:            │
│ • allegretto            │
│ • allegro               │
│ • allegrissimo          │
└─────────────────────────┘
```

### Term Display

```
┌─────────────────────────┐
│ Crescendo               │
│ [kre-SHEN-do] 🔊        │
├─────────────────────────┤
│ Gradually getting       │
│ louder                  │
├─────────────────────────┤
│ [▶️ Hear example]       │
├─────────────────────────┤
│ Related:                │
│ • diminuendo (opposite) │
│ • forte                 │
│ • sforzando             │
└─────────────────────────┘
```

## Performance Optimization

### Search Performance

**Optimization Strategies**:

1. **Debounce Input**: 300ms delay before search
2. **Limit Results**: Max 20 suggestions
3. **Cache Queries**: Remember search results
4. **Progressive Loading**: Load details on demand
5. **Web Worker**: Search in background thread

### AI Response Optimization

**Cost and Speed Balance**:

```typescript
class AIOptimizer {
  async getExplanation(term: string): Promise<string> {
    // 1. Check exact match in database
    const exact = await this.database.findExact(term)
    if (exact) return exact.definition

    // 2. Check cached AI responses
    const cached = await this.cache.get(term)
    if (cached && !this.isStale(cached)) return cached.response

    // 3. Try simple pattern matching
    const pattern = await this.patternMatch(term)
    if (pattern) return pattern

    // 4. Last resort: AI query
    return await this.queryAI(term)
  }
}
```

## Best Practices

### For Content Creation

1. **Prioritize Common Terms**: Focus on frequently encountered terms
2. **Provide Examples**: Abstract concepts need concrete examples
3. **Include Pronunciation**: Especially for non-native terms
4. **Cross-Reference**: Link related terms
5. **Update Regularly**: Music terminology evolves

### For Implementation

1. **Fast First Load**: Show cached content immediately
2. **Predictive Caching**: Pre-load likely next lookups
3. **Graceful Degradation**: Work offline with reduced features
4. **Track Usage**: Learn what users actually look up
5. **Accessible**: Screen reader friendly

## Success Metrics

**Usage Metrics**:

- Daily active dictionary users
- Searches per session
- Click-through to full definitions
- AI query frequency
- Custom term additions

**Value Metrics**:

- Lookup-to-practice correlation
- Term retention (re-lookups over time)
- User satisfaction scores
- Teacher adoption rate
- Student comprehension improvement

## Common Pitfalls to Avoid

1. **Over-Academizing**: Keep definitions practical
2. **Slow Search**: Musicians won't wait
3. **No Offline Access**: Practice happens everywhere
4. **English-Only**: Music is international
5. **Static Content**: Terms need context

## Related Documentation

- [AI Services](../06-integrations/ai-services.md) - AI explanation generation
- [Scorebook](./scorebook.md) - Score integration
- [Database Schema](../02-database/schema.md) - Dictionary tables
- [Internationalization](../04-frontend/i18n.md) - Multi-language support

---

_Last updated: 2025-09-09 | Version 1.7.6_
