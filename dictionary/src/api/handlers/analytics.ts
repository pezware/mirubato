import { Hono } from 'hono'
import type { Env } from '../../types/env'
import { DictionaryDatabase } from '../../services/storage/dictionary-database'
import { createApiResponse } from '../../utils/errors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

export const analyticsHandler = new Hono<{ Bindings: Env }>()

// Time range schema
const timeRangeSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  period: z.enum(['hour', 'day', 'week', 'month']).optional()
})

/**
 * Get analytics summary
 * GET /api/v1/analytics/summary
 */
analyticsHandler.get('/summary', async (c) => {
  const db = new DictionaryDatabase(c.env.DB)
  
  // Get various statistics
  const [
    summary,
    popularSearches,
    qualityStats,
    typeDistribution,
    recentAdditions,
    lowQualityTerms,
    searchStats
  ] = await Promise.all([
    db.getAnalyticsSummary(),
    db.getPopularSearches(20),
    db.getQualityDistribution(),
    db.getTypeDistribution(),
    db.getRecentAdditions(10),
    db.getLowQualityTerms(10),
    db.getSearchStatistics()
  ])

  const avgQualityScore = summary.avg_quality_score
  const totalTerms = summary.total_terms

  return c.json(createApiResponse({
    total_terms: totalTerms,
    avg_quality_score: avgQualityScore,
    quality_distribution: qualityStats,
    type_distribution: typeDistribution,
    popular_searches: popularSearches,
    recent_additions: recentAdditions,
    low_quality_terms: lowQualityTerms,
    search_statistics: searchStats,
    last_updated: new Date().toISOString()
  }))
})

/**
 * Get search analytics
 * GET /api/v1/analytics/searches
 */
analyticsHandler.get('/searches', zValidator('query', timeRangeSchema), async (c) => {
  const { start_date, end_date, period } = c.req.valid('query')
  const db = new DictionaryDatabase(c.env.DB)
  
  // getSearchAnalytics not implemented in DictionaryDatabase
  const searchData = {
    earliest_date: start_date || new Date().toISOString(),
    latest_date: end_date || new Date().toISOString(),
    total_searches: 0,
    unique_terms: 0,
    success_rate: 0,
    top_searches: [],
    searches_by_period: []
  }

  return c.json(createApiResponse({
    period,
    start_date: start_date || searchData.earliest_date,
    end_date: end_date || searchData.latest_date,
    total_searches: searchData.total_searches,
    unique_terms: searchData.unique_terms,
    success_rate: searchData.success_rate,
    top_searches: searchData.top_searches,
    failed_searches: searchData.failed_searches,
    search_volume_by_period: searchData.volume_by_period
  }))
})

/**
 * Get AI usage analytics
 * GET /api/v1/analytics/ai-usage
 */
analyticsHandler.get('/ai-usage', zValidator('query', timeRangeSchema), async (c) => {
  const { start_date, end_date } = c.req.valid('query')
  const db = new DictionaryDatabase(c.env.DB)
  
  const aiUsage = await db.getAIUsageStats({
    startDate: start_date ? new Date(start_date) : undefined,
    endDate: end_date ? new Date(end_date) : undefined
  })

  return c.json(createApiResponse({
    period: {
      start: start_date || aiUsage.earliest_date,
      end: end_date || aiUsage.latest_date
    },
    total_requests: aiUsage.total_requests,
    total_tokens: aiUsage.total_tokens,
    total_cost_usd: aiUsage.total_cost,
    by_model: aiUsage.by_model,
    by_operation: aiUsage.by_operation,
    average_latency_ms: aiUsage.average_latency,
    success_rate: aiUsage.success_rate,
    daily_usage: aiUsage.daily_usage
  }))
})

/**
 * Get quality improvement trends
 * GET /api/v1/analytics/quality-trends
 */
analyticsHandler.get('/quality-trends', zValidator('query', timeRangeSchema), async (c) => {
  const { start_date, end_date, period } = c.req.valid('query')
  const db = new DictionaryDatabase(c.env.DB)
  
  // getQualityTrends not implemented in DictionaryDatabase
  const qualityTrends = {
    trends: [],
    improvements: 0,
    degradations: 0,
    avg_change: 0
  }

  return c.json(createApiResponse({
    period,
    trends: qualityTrends.trends,
    improvements: qualityTrends.improvements,
    average_improvement: qualityTrends.avg_change,
    enhancement_success_rate: 0
  }))
})

/**
 * Get content gaps analysis
 * GET /api/v1/analytics/content-gaps
 */
analyticsHandler.get('/content-gaps', async (c) => {
  const db = new DictionaryDatabase(c.env.DB)
  
  // getContentGaps not implemented in DictionaryDatabase
  const gaps: any[] = []

  return c.json(createApiResponse({
    missing_references: gaps.missing_references,
    missing_pronunciations: gaps.missing_pronunciations,
    missing_etymology: gaps.missing_etymology,
    missing_examples: gaps.missing_examples,
    low_quality_by_type: gaps.low_quality_by_type,
    recommendations: generateRecommendations(gaps)
  }))
})

/**
 * Get performance metrics
 * GET /api/v1/analytics/performance
 */
analyticsHandler.get('/performance', async (c) => {
  const db = new DictionaryDatabase(c.env.DB)
  
  // Get performance metrics from various sources
  // getPerformanceMetrics not implemented in DictionaryDatabase
  const metrics = {
    avg_response_time: 0,
    p95_response_time: 0,
    p99_response_time: 0,
    cache_hit_rate: 0,
    error_rate: 0,
    requests_per_second: 0
  }

  return c.json(createApiResponse({
    database: {
      total_size_mb: metrics.database_size_mb,
      index_efficiency: metrics.index_efficiency,
      query_performance: metrics.avg_query_time_ms
    },
    cache: {
      hit_rate: metrics.cache_hit_rate,
      avg_response_time_ms: metrics.cache_response_time,
      entries_cached: metrics.entries_cached
    },
    api: {
      requests_per_minute: metrics.requests_per_minute,
      avg_response_time_ms: metrics.api_response_time,
      error_rate: metrics.error_rate
    },
    ai: {
      avg_generation_time_ms: metrics.ai_generation_time,
      avg_tokens_per_request: metrics.avg_tokens_per_request,
      model_availability: metrics.model_availability
    }
  }))
})

/**
 * Export analytics data
 * GET /api/v1/analytics/export
 */
analyticsHandler.get('/export', zValidator('query', z.object({
  format: z.enum(['json', 'csv']).default('json'),
  include: z.array(z.enum([
    'summary',
    'searches',
    'ai_usage',
    'quality_trends',
    'content_gaps',
    'performance'
  ])).optional()
})), async (c) => {
  const { format, include } = c.req.valid('query')
  const db = new DictionaryDatabase(c.env.DB)
  
  // Collect all requested data
  const sections = include || ['summary', 'searches', 'ai_usage', 'quality_trends']
  const data: Record<string, any> = {}
  
  for (const section of sections) {
    switch (section) {
      case 'summary':
        data.summary = await getAnalyticsSummary(db)
        break
      case 'searches':
        data.searches = await db.getSearchAnalytics({})
        break
      case 'ai_usage':
        data.ai_usage = await db.getAIUsageStats({})
        break
      case 'quality_trends':
        data.quality_trends = await db.getQualityTrends({})
        break
      case 'content_gaps':
        data.content_gaps = await db.getContentGaps()
        break
      case 'performance':
        data.performance = await db.getPerformanceMetrics()
        break
    }
  }
  
  if (format === 'csv') {
    // Convert to CSV format
    const csv = await convertAnalyticsToCSV(data)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="mirubato-analytics-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  }
  
  return c.json(createApiResponse({
    exported_at: new Date().toISOString(),
    data
  }))
})

/**
 * Helper functions
 */
function generateRecommendations(gaps: any): string[] {
  const recommendations: string[] = []
  
  if (gaps.missing_references.length > 50) {
    recommendations.push('Focus on adding Wikipedia references for popular terms')
  }
  
  if (gaps.missing_pronunciations.length > 100) {
    recommendations.push('Add IPA pronunciations for frequently searched terms')
  }
  
  if (gaps.missing_etymology.length > 200) {
    recommendations.push('Enhance entries with etymology information')
  }
  
  if (gaps.missing_examples.length > 150) {
    recommendations.push('Add usage examples to improve educational value')
  }
  
  for (const [type, count] of Object.entries(gaps.low_quality_by_type)) {
    if ((count as number) > 20) {
      recommendations.push(`Improve quality of ${type} entries`)
    }
  }
  
  return recommendations
}

async function getAnalyticsSummary(db: DictionaryDatabase): Promise<any> {
  const [
    summary,
    qualityStats,
    typeDistribution,
    popularSearches
  ] = await Promise.all([
    db.getAnalyticsSummary(),
    db.getQualityDistribution(),
    db.getTypeDistribution(),
    db.getPopularSearches(10)
  ])
  
  return {
    total_terms: summary.total_terms,
    avg_quality_score: summary.avg_quality_score,
    total_searches: summary.total_searches,
    total_feedback: summary.total_feedback,
    quality_distribution: qualityStats,
    type_distribution: typeDistribution,
    top_searches: popularSearches
  }
}

async function convertAnalyticsToCSV(data: Record<string, any>): Promise<string> {
  const rows: string[] = []
  
  // Summary section
  if (data.summary) {
    rows.push('ANALYTICS SUMMARY')
    rows.push('Metric,Value')
    rows.push(`Total Terms,${data.summary.total_terms}`)
    rows.push('')
    
    rows.push('Quality Distribution')
    rows.push('Level,Count')
    for (const [level, count] of Object.entries(data.summary.quality_distribution)) {
      rows.push(`${level},${count}`)
    }
    rows.push('')
  }
  
  // Add other sections similarly...
  
  return rows.join('\n')
}