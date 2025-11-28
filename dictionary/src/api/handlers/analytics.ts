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
  period: z.enum(['hour', 'day', 'week', 'month']).optional(),
})

/**
 * Get analytics summary
 * GET /api/v1/analytics/summary
 */
analyticsHandler.get('/summary', async c => {
  const db = new DictionaryDatabase(c.env.DB)

  // Get various statistics
  const [
    summary,
    popularSearches,
    qualityStats,
    typeDistribution,
    recentAdditions,
    lowQualityTerms,
    searchStats,
  ] = await Promise.all([
    db.getAnalyticsSummary(),
    db.getPopularSearches(20),
    db.getQualityDistribution(),
    db.getTypeDistribution(),
    db.getRecentAdditions(10),
    db.getLowQualityTerms(10),
    db.getSearchStatistics(),
  ])

  const avgQualityScore = summary.avg_quality_score
  const totalTerms = summary.total_terms

  return c.json(
    createApiResponse({
      total_terms: totalTerms,
      avg_quality_score: avgQualityScore,
      quality_distribution: qualityStats,
      type_distribution: typeDistribution,
      popular_searches: popularSearches,
      recent_additions: recentAdditions,
      low_quality_terms: lowQualityTerms,
      search_statistics: searchStats,
      last_updated: new Date().toISOString(),
    })
  )
})

/**
 * Get search analytics
 * GET /api/v1/analytics/searches
 */
analyticsHandler.get(
  '/searches',
  zValidator('query', timeRangeSchema),
  async c => {
    const { start_date, end_date, period } = c.req.valid('query')
    const db = new DictionaryDatabase(c.env.DB)

    const searchData = await db.getSearchAnalytics({
      startDate: start_date ? new Date(start_date) : undefined,
      endDate: end_date ? new Date(end_date) : undefined,
      period,
    })

    return c.json(
      createApiResponse({
        period,
        start_date: start_date || searchData.earliest_date,
        end_date: end_date || searchData.latest_date,
        total_searches: searchData.total_searches,
        unique_terms: searchData.unique_terms,
        success_rate: searchData.success_rate,
        top_searches: searchData.top_searches,
        failed_searches: [], // Not implemented in DB yet
        search_volume_by_period: searchData.searches_by_period,
      })
    )
  }
)

/**
 * Get AI usage analytics
 * GET /api/v1/analytics/ai-usage
 */
analyticsHandler.get(
  '/ai-usage',
  zValidator('query', timeRangeSchema),
  async c => {
    const { start_date, end_date } = c.req.valid('query')
    const db = new DictionaryDatabase(c.env.DB)

    const aiUsage = await db.getAIUsageStats({
      startDate: start_date ? new Date(start_date) : undefined,
      endDate: end_date ? new Date(end_date) : undefined,
    })

    return c.json(
      createApiResponse({
        period: {
          start: start_date || new Date().toISOString(),
          end: end_date || new Date().toISOString(),
        },
        total_requests: aiUsage.total_requests,
        total_tokens: 0, // Not implemented in DB yet
        total_cost_usd: aiUsage.cost_estimate,
        by_model: aiUsage.by_model,
        by_operation: {}, // Not implemented in DB yet
        average_latency_ms: aiUsage.avg_response_time,
        success_rate: 1 - aiUsage.error_rate,
        daily_usage: [], // Not implemented in DB yet
      })
    )
  }
)

/**
 * Get quality improvement trends
 * GET /api/v1/analytics/quality-trends
 */
analyticsHandler.get(
  '/quality-trends',
  zValidator('query', timeRangeSchema),
  async c => {
    const { start_date, end_date, period } = c.req.valid('query')
    const db = new DictionaryDatabase(c.env.DB)

    const qualityTrends = await db.getQualityTrends({
      startDate: start_date ? new Date(start_date) : undefined,
      endDate: end_date ? new Date(end_date) : undefined,
      period,
    })

    return c.json(
      createApiResponse({
        period,
        trends: qualityTrends.trends,
        improvements: qualityTrends.improvements,
        average_improvement: qualityTrends.avg_change,
        enhancement_success_rate: 0,
      })
    )
  }
)

/**
 * Get content gaps analysis
 * GET /api/v1/analytics/content-gaps
 */
analyticsHandler.get('/content-gaps', async c => {
  // Create a proper ContentGaps object for recommendations
  const contentGaps: ContentGaps = {
    missing_references: [],
    low_quality_entries: [],
    incomplete_entries: [],
    missing_pronunciations: [],
    missing_etymology: [],
    missing_examples: [],
    low_quality_by_type: {},
  }

  return c.json(
    createApiResponse({
      missing_references: 0, // Not implemented in DB yet
      missing_pronunciations: 0, // Not implemented in DB yet
      missing_etymology: 0, // Not implemented in DB yet
      missing_examples: 0, // Not implemented in DB yet
      low_quality_by_type: {}, // Not implemented in DB yet
      recommendations: generateRecommendations(contentGaps),
    })
  )
})

/**
 * Get performance metrics
 * GET /api/v1/analytics/performance
 */
analyticsHandler.get('/performance', async c => {
  const db = new DictionaryDatabase(c.env.DB)

  // Get performance metrics from various sources
  const metrics = await db.getPerformanceMetrics()

  return c.json(
    createApiResponse({
      database: {
        total_size_mb: 0, // Not implemented in DB yet
        index_efficiency: 0, // Not implemented in DB yet
        query_performance: metrics.avg_response_time,
      },
      cache: {
        hit_rate: metrics.cache_hit_rate,
        avg_response_time_ms: metrics.avg_response_time,
        entries_cached: 0, // Not implemented in DB yet
      },
      api: {
        requests_per_minute: metrics.requests_per_second * 60,
        avg_response_time_ms: metrics.avg_response_time,
        error_rate: metrics.error_rate,
      },
      ai: {
        avg_generation_time_ms: 0, // Not implemented in DB yet
        avg_tokens_per_request: 0, // Not implemented in DB yet
        model_availability: 1.0, // Not implemented in DB yet
      },
    })
  )
})

/**
 * Export analytics data
 * GET /api/v1/analytics/export
 */
analyticsHandler.get(
  '/export',
  zValidator(
    'query',
    z.object({
      format: z.enum(['json', 'csv']).default('json'),
      include: z
        .array(
          z.enum([
            'summary',
            'searches',
            'ai_usage',
            'quality_trends',
            'content_gaps',
            'performance',
          ])
        )
        .optional(),
    })
  ),
  async c => {
    const { format, include } = c.req.valid('query')
    const db = new DictionaryDatabase(c.env.DB)

    // Collect all requested data
    const sections = include || [
      'summary',
      'searches',
      'ai_usage',
      'quality_trends',
    ]
    const data: Record<string, unknown> = {}

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
          'Content-Disposition': `attachment; filename="mirubato-analytics-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return c.json(
      createApiResponse({
        exported_at: new Date().toISOString(),
        data,
      })
    )
  }
)

/**
 * Helper functions
 */
interface ContentGaps {
  missing_references: unknown[]
  low_quality_entries: unknown[]
  incomplete_entries: unknown[]
  missing_pronunciations: unknown[]
  missing_etymology: unknown[]
  missing_examples: unknown[]
  low_quality_by_type: Record<string, number>
}

function generateRecommendations(gaps: ContentGaps): string[] {
  const recommendations: string[] = []

  if (gaps.missing_references.length > 50) {
    recommendations.push(
      'Focus on adding Wikipedia references for popular terms'
    )
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

interface AnalyticsSummary {
  total_terms: number
  avg_quality_score: number
  total_searches: number
  total_feedback: number
  quality_distribution: unknown
  type_distribution: unknown
  top_searches: unknown
}

async function getAnalyticsSummary(
  db: DictionaryDatabase
): Promise<AnalyticsSummary> {
  const [summary, qualityStats, typeDistribution, popularSearches] =
    await Promise.all([
      db.getAnalyticsSummary(),
      db.getQualityDistribution(),
      db.getTypeDistribution(),
      db.getPopularSearches(10),
    ])

  return {
    total_terms: summary.total_terms,
    avg_quality_score: summary.avg_quality_score,
    total_searches: summary.total_searches,
    total_feedback: summary.total_feedback,
    quality_distribution: qualityStats,
    type_distribution: typeDistribution,
    top_searches: popularSearches,
  }
}

async function convertAnalyticsToCSV(
  data: Record<string, unknown>
): Promise<string> {
  const rows: string[] = []

  // Summary section
  if (data.summary) {
    const summary = data.summary as AnalyticsSummary
    rows.push('ANALYTICS SUMMARY')
    rows.push('Metric,Value')
    rows.push(`Total Terms,${summary.total_terms}`)
    rows.push('')

    rows.push('Quality Distribution')
    rows.push('Level,Count')
    for (const [level, count] of Object.entries(
      summary.quality_distribution as Record<string, unknown>
    )) {
      rows.push(`${level},${count}`)
    }
    rows.push('')
  }

  // Add other sections similarly...

  return rows.join('\n')
}
