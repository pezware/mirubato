/**
 * Dictionary API routes
 */

import { Hono } from 'hono'
import type { Env, Variables } from '../types/env'
import { auth } from '../middleware/auth'

// Import handlers
import { termsHandler } from '../api/handlers/terms'
import { searchHandler } from '../api/handlers/search'
import { batchHandler } from '../api/handlers/batch'
import { exportHandler } from '../api/handlers/export'
import { enhanceHandler } from '../api/handlers/enhance'
import { adminHandler } from '../api/handlers/admin'
import { analyticsHandler } from '../api/handlers/analytics'
import { debugHandler } from '../api/handlers/debug'

// SEO imports
import { DictionaryDatabase } from '../services/storage/dictionary-database'
import {
  generateTermHtml,
  generateNotFoundHtml,
} from '../utils/seo-html-generator'
import { SupportedLanguage, DictionaryEntry } from '../types/dictionary'
import { cache, edgeCache } from '../middleware/cache'

export const dictionaryRoutes = new Hono<{
  Bindings: Env
  Variables: Variables
}>()

// API v1 routes
const v1 = new Hono<{ Bindings: Env; Variables: Variables }>()

// Public endpoints
v1.route('/terms', termsHandler)
v1.route('/search', searchHandler)
v1.route('/batch', batchHandler)
v1.route('/export', exportHandler)
v1.route('/analytics', analyticsHandler)

// Debug endpoints (protect in production)
v1.use('/debug/*', async (c, next) => {
  if (c.env.ENVIRONMENT === 'production') {
    return c.json({ error: 'Debug endpoints not available in production' }, 403)
  }
  await next()
})
v1.route('/debug', debugHandler)

// Protected endpoints (require auth)
v1.use('/enhance/*', auth())
v1.route('/enhance', enhanceHandler)

// Admin endpoints (require admin role)
v1.use('/admin/*', auth({ roles: ['admin'] }))
v1.route('/admin', adminHandler)

// Mount v1 routes
dictionaryRoutes.route('/api/v1', v1)

/**
 * SEO-friendly dictionary routes for search engine indexing
 * These routes generate server-side rendered HTML pages
 */

// SEO Route: Get dictionary term by language and term
// GET /dictionary/:lang/:term
dictionaryRoutes.get(
  '/dictionary/:lang/:term',
  cache({
    ttl: 3600, // Cache for 1 hour
    varyBy: ['Accept-Language'],
  }),
  edgeCache({
    maxAge: 1800, // 30 minutes
    sMaxAge: 3600, // 1 hour for shared caches
    staleWhileRevalidate: 7200, // 2 hours stale while revalidate
  }),
  async c => {
    const { lang, term } = c.req.param()
    const decodedTerm = decodeURIComponent(term)

    // Validate language parameter
    const supportedLanguages: SupportedLanguage[] = [
      'en',
      'es',
      'fr',
      'de',
      'zh-CN',
      'zh-TW',
    ]
    if (!supportedLanguages.includes(lang as SupportedLanguage)) {
      return c.redirect(`/dictionary/en/${term}`, 301)
    }

    const db = new DictionaryDatabase(c.env.DB)

    try {
      // Try to find the term in the requested language first
      let entry = await db.findByTerm(decodedTerm, lang, {
        searchAllLanguages: false,
      })

      // If not found in requested language, try all languages
      if (!entry) {
        entry = await db.findByTerm(decodedTerm, lang, {
          searchAllLanguages: true,
        })
      }

      if (entry) {
        // Get related terms and language versions
        const [relatedTermsResult, languageVersions] = await Promise.all([
          db.getRelatedTerms(entry.id).catch(() => []),
          db
            .getTermInLanguages(entry.normalized_term, supportedLanguages)
            .catch(() => ({ languages: {} })),
        ])

        const relatedTerms =
          relatedTermsResult?.slice(0, 5)?.map(rt => rt.entry.term) || []

        // Determine base URL based on environment
        const hostname = c.req.header('host') || 'mirubato.com'
        const baseUrl =
          hostname.includes('localhost') || hostname.includes('staging')
            ? `https://${hostname.replace(':9799', '')}`
            : 'https://mirubato.com'

        // Convert language entries to boolean availability map
        const languageAvailability: Partial<
          Record<SupportedLanguage, boolean>
        > = {}
        if (languageVersions.languages) {
          Object.keys(languageVersions.languages).forEach(langKey => {
            const langCode = langKey as SupportedLanguage
            const languages = languageVersions.languages as Record<
              SupportedLanguage,
              DictionaryEntry
            >
            languageAvailability[langCode] = !!languages[langCode]
          })
        }

        const html = generateTermHtml({
          entry,
          lang: lang as SupportedLanguage,
          term: decodedTerm,
          relatedTerms: relatedTerms,
          languageVersions: languageAvailability,
          baseUrl,
        })

        // Set SEO headers
        c.header('Content-Type', 'text/html; charset=utf-8')
        c.header('X-Robots-Tag', 'index, follow')

        // Set language-specific headers
        c.header('Content-Language', lang)

        return c.html(html)
      } else {
        // Term not found - generate suggestions using simple prefix matching
        const suggestionsResult = await c.env.DB.prepare(
          `
          SELECT DISTINCT term 
          FROM dictionary_entries 
          WHERE (
            normalized_term LIKE ? 
            OR term LIKE ?
          )
          AND lang = ?
          AND overall_score >= 60
          ORDER BY overall_score DESC, term ASC
          LIMIT 5
        `
        )
          .bind(`${decodedTerm.toLowerCase()}%`, `${decodedTerm}%`, lang)
          .all()

        const suggestions = suggestionsResult.results || []

        const hostname = c.req.header('host') || 'mirubato.com'
        const baseUrl =
          hostname.includes('localhost') || hostname.includes('staging')
            ? `https://${hostname.replace(':9799', '')}`
            : 'https://mirubato.com'

        const html = generateNotFoundHtml(
          decodedTerm,
          lang as SupportedLanguage,
          suggestions.map(s => s.term as string),
          baseUrl
        )

        c.header('Content-Type', 'text/html; charset=utf-8')
        c.header('X-Robots-Tag', 'noindex, follow')

        return c.html(html, 404)
      }
    } catch (error) {
      console.error('SEO route error:', error)

      // Return a generic error page
      const hostname = c.req.header('host') || 'mirubato.com'
      const baseUrl =
        hostname.includes('localhost') || hostname.includes('staging')
          ? `https://${hostname.replace(':9799', '')}`
          : 'https://mirubato.com'

      const errorHtml = generateNotFoundHtml(
        decodedTerm,
        lang as SupportedLanguage,
        [],
        baseUrl
      )

      c.header('Content-Type', 'text/html; charset=utf-8')
      c.header('X-Robots-Tag', 'noindex, follow')

      return c.html(errorHtml, 500)
    }
  }
)

// SEO Route: Dictionary index page
// GET /dictionary
dictionaryRoutes.get(
  '/dictionary',
  cache({ ttl: 3600 }),
  edgeCache({ maxAge: 1800, sMaxAge: 3600 }),
  async c => {
    const hostname = c.req.header('host') || 'mirubato.com'
    const baseUrl =
      hostname.includes('localhost') || hostname.includes('staging')
        ? `https://${hostname.replace(':9799', '')}`
        : 'https://mirubato.com'

    // Redirect to the main app dictionary page
    return c.redirect(`${baseUrl}/toolbox`, 301)
  }
)

// Sitemap routes for SEO
// GET /dictionary/sitemap.xml - Main sitemap index
dictionaryRoutes.get(
  '/dictionary/sitemap.xml',
  cache({ ttl: 86400 }), // Cache for 24 hours
  edgeCache({ maxAge: 43200, sMaxAge: 86400 }), // 12 hours / 24 hours
  async c => {
    const hostname = c.req.header('host') || 'mirubato.com'
    const baseUrl =
      hostname.includes('localhost') || hostname.includes('staging')
        ? `https://${hostname.replace(':9799', '')}`
        : 'https://mirubato.com'

    const supportedLanguages: SupportedLanguage[] = [
      'en',
      'es',
      'fr',
      'de',
      'zh-CN',
      'zh-TW',
    ]

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${supportedLanguages
  .map(
    lang => `  <sitemap>
    <loc>${baseUrl}/dictionary/sitemap-${lang}.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`

    c.header('Content-Type', 'application/xml; charset=utf-8')
    return c.text(sitemapIndex)
  }
)

// GET /dictionary/sitemap-:lang.xml - Language-specific sitemaps
dictionaryRoutes.get(
  '/dictionary/sitemap-:lang.xml',
  cache({ ttl: 86400 }),
  edgeCache({ maxAge: 43200, sMaxAge: 86400 }),
  async c => {
    const { lang } = c.req.param()

    // Validate language
    const supportedLanguages: SupportedLanguage[] = [
      'en',
      'es',
      'fr',
      'de',
      'zh-CN',
      'zh-TW',
    ]
    if (!supportedLanguages.includes(lang as SupportedLanguage)) {
      return c.notFound()
    }

    const hostname = c.req.header('host') || 'mirubato.com'
    const baseUrl =
      hostname.includes('localhost') || hostname.includes('staging')
        ? `https://${hostname.replace(':9799', '')}`
        : 'https://mirubato.com'

    try {
      // Get published terms for this language with good quality scores
      const terms = await c.env.DB.prepare(
        `
        SELECT normalized_term, updated_at, overall_score, search_count
        FROM dictionary_entries 
        WHERE lang = ? 
        AND overall_score >= 70
        AND status = 'published'
        ORDER BY search_count DESC, overall_score DESC
        LIMIT 10000
      `
      )
        .bind(lang)
        .all()

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${terms.results
  .map((termRow: Record<string, unknown>) => {
    const searchCount = Number(termRow.search_count) || 0
    const overallScore = Number(termRow.overall_score) || 0
    const normalizedTerm = String(termRow.normalized_term)
    const updatedAt = String(termRow.updated_at || new Date().toISOString())

    const priority =
      searchCount > 100 ? '1.0' : overallScore >= 90 ? '0.8' : '0.6'
    const changefreq = searchCount > 50 ? 'weekly' : 'monthly'

    return `  <url>
    <loc>${baseUrl}/dictionary/${lang}/${encodeURIComponent(normalizedTerm)}</loc>
    <lastmod>${updatedAt.split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  })
  .join('\n')}
</urlset>`

      c.header('Content-Type', 'application/xml; charset=utf-8')
      return c.text(sitemap)
    } catch (error) {
      console.error('Sitemap generation error:', error)
      return c.text('Error generating sitemap', 500)
    }
  }
)
