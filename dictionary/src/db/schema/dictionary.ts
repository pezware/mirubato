import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Dictionary entries table
export const dictionaryEntries = sqliteTable(
  'dictionary_entries',
  {
    id: text('id').primaryKey(),
    term: text('term').notNull(),
    normalizedTerm: text('normalized_term').notNull(),
    type: text('type').notNull(), // scale, chord, interval, technique, tempo_marking, etc.
    instrument: text('instrument'), // piano, guitar, violin, general, etc.
    difficultyLevel: text('difficulty_level'), // beginner, intermediate, advanced

    // Definition content
    conciseDefinition: text('concise_definition').notNull(),
    detailedDefinition: text('detailed_definition').notNull(),
    etymology: text('etymology'),
    usageExample: text('usage_example'),

    // Pronunciation
    pronunciationIpa: text('pronunciation_ipa'),
    pronunciationSyllables: text('pronunciation_syllables'), // JSON array
    pronunciationStressPattern: text('pronunciation_stress_pattern'),

    // Quality metrics
    overallScore: integer('overall_score').default(0),
    accuracyScore: integer('accuracy_score').default(0),
    clarityScore: integer('clarity_score').default(0),
    completenessScore: integer('completeness_score').default(0),
    educationalValueScore: integer('educational_value_score').default(0),

    // Metadata
    status: text('status').default('draft'), // draft, published, archived
    language: text('language').default('en'),
    region: text('region'),
    historical_period: text('historical_period'),

    // Related content (JSON)
    relatedTerms: text('related_terms'), // JSON array
    externalReferences: text('external_references'), // JSON array
    notableExamples: text('notable_examples'), // JSON array
    commonMisconceptions: text('common_misconceptions'), // JSON array
    learningTips: text('learning_tips'), // JSON array
    culturalContext: text('cultural_context'), // JSON object

    // System fields
    createdAt: text('created_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: text('updated_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    lastReviewedAt: text('last_reviewed_at'),
    generationMetadata: text('generation_metadata'), // JSON object

    // Versioning
    version: integer('version').default(1).notNull(),
    previousVersionId: text('previous_version_id'),
  },
  table => ({
    termIdx: index('idx_term').on(table.term),
    normalizedTermIdx: index('idx_normalized_term').on(table.normalizedTerm),
    typeIdx: index('idx_type').on(table.type),
    instrumentIdx: index('idx_instrument').on(table.instrument),
    statusIdx: index('idx_status').on(table.status),
    scoreIdx: index('idx_overall_score').on(table.overallScore),
  })
)

// Quality checkpoints table
export const qualityCheckpoints = sqliteTable(
  'quality_checkpoints',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => dictionaryEntries.id),
    checkType: text('check_type').notNull(), // validation, enhancement, review
    score: integer('score').notNull(),
    issues: text('issues'), // JSON array
    suggestions: text('suggestions'), // JSON array
    strengths: text('strengths'), // JSON array
    metadata: text('metadata'), // JSON object
    createdAt: text('created_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  table => ({
    entryIdIdx: index('idx_checkpoint_entry_id').on(table.entryId),
    checkTypeIdx: index('idx_checkpoint_type').on(table.checkType),
  })
)

// Search analytics table
export const searchAnalytics = sqliteTable(
  'search_analytics',
  {
    id: text('id').primaryKey(),
    searchTerm: text('search_term').notNull(),
    normalizedSearchTerm: text('normalized_search_term').notNull(),
    resultCount: integer('result_count').notNull(),
    clickedEntryId: text('clicked_entry_id'),
    userId: text('user_id'),
    sessionId: text('session_id'),
    searchType: text('search_type'), // text, semantic, filter
    metadata: text('metadata'), // JSON object
    createdAt: text('created_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  table => ({
    searchTermIdx: index('idx_search_term').on(table.searchTerm),
    userIdx: index('idx_search_user').on(table.userId),
  })
)

// User feedback table
export const userFeedback = sqliteTable(
  'user_feedback',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => dictionaryEntries.id),
    userId: text('user_id'),
    feedbackType: text('feedback_type').notNull(), // helpful, not_helpful, correction, suggestion
    content: text('content'),
    metadata: text('metadata'), // JSON object
    status: text('status').default('pending'), // pending, reviewed, implemented
    createdAt: text('created_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  table => ({
    entryIdIdx: index('idx_feedback_entry_id').on(table.entryId),
    userIdIdx: index('idx_feedback_user_id').on(table.userId),
    statusIdx: index('idx_feedback_status').on(table.status),
  })
)

// AI model usage tracking
export const aiModelUsage = sqliteTable(
  'ai_model_usage',
  {
    id: text('id').primaryKey(),
    operation: text('operation').notNull(), // definition, validation, enhancement, embedding
    provider: text('provider').notNull(), // cloudflare, openai, anthropic
    model: text('model').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    totalTokens: integer('total_tokens'),
    costUsd: real('cost_usd'),
    latencyMs: integer('latency_ms'),
    success: integer('success', { mode: 'boolean' }).notNull(),
    error: text('error'),
    metadata: text('metadata'), // JSON object
    createdAt: text('created_at')
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  table => ({
    operationIdx: index('idx_usage_operation').on(table.operation),
    providerIdx: index('idx_usage_provider').on(table.provider),
    createdAtIdx: index('idx_usage_created_at').on(table.createdAt),
  })
)

// Type exports for TypeScript
export type DictionaryEntry = typeof dictionaryEntries.$inferSelect
export type NewDictionaryEntry = typeof dictionaryEntries.$inferInsert
export type QualityCheckpoint = typeof qualityCheckpoints.$inferSelect
export type NewQualityCheckpoint = typeof qualityCheckpoints.$inferInsert
export type SearchAnalytic = typeof searchAnalytics.$inferSelect
export type NewSearchAnalytic = typeof searchAnalytics.$inferInsert
export type UserFeedback = typeof userFeedback.$inferSelect
export type NewUserFeedback = typeof userFeedback.$inferInsert
export type AIModelUsage = typeof aiModelUsage.$inferSelect
export type NewAIModelUsage = typeof aiModelUsage.$inferInsert
