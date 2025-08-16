/**
 * SEO HTML Template Generator for Dictionary Terms
 * Generates server-side rendered HTML pages for search engine indexing
 */

import { DictionaryEntry, SupportedLanguage } from '../types/dictionary'

interface HtmlTemplateOptions {
  entry: DictionaryEntry
  lang: SupportedLanguage
  term: string
  relatedTerms?: string[]
  languageVersions?: Partial<Record<SupportedLanguage, boolean>>
  baseUrl?: string
}

/**
 * Generate structured data for a dictionary term (Schema.org DefinedTerm)
 */
function generateStructuredData(
  entry: DictionaryEntry,
  baseUrl: string
): string {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: entry.term,
    description: entry.definition.concise,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Mirubato Music Dictionary',
      description: 'Comprehensive music terminology dictionary',
      url: `${baseUrl}/dictionary`,
    },
    url: `${baseUrl}/dictionary/${entry.lang}/${encodeURIComponent(entry.normalized_term)}`,
    identifier: entry.id,
    ...(entry.type && { category: entry.type }),
    ...(entry.definition.etymology && {
      etymology: entry.definition.etymology,
    }),
    ...(entry.definition.usage_example && {
      additionalProperty: {
        '@type': 'PropertyValue',
        name: 'example',
        value: entry.definition.usage_example,
      },
    }),
    ...(entry.definition.pronunciation?.ipa && {
      pronunciation: {
        '@type': 'PronunciationSpecification',
        phoneticText: entry.definition.pronunciation.ipa,
      },
    }),
    creator: {
      '@type': 'Organization',
      name: 'Mirubato',
      url: 'https://mirubato.com',
    },
    dateCreated: entry.created_at,
    dateModified: entry.updated_at,
    inLanguage: entry.lang,
  }

  return JSON.stringify(structuredData, null, 2)
}

/**
 * Generate hreflang tags for all available language versions
 */
function generateHreflangTags(
  term: string,
  languageVersions: Partial<Record<SupportedLanguage, boolean>>,
  baseUrl: string
): string {
  const languages: SupportedLanguage[] = [
    'en',
    'es',
    'fr',
    'de',
    'zh-CN',
    'zh-TW',
  ]

  return languages
    .filter(lang => languageVersions[lang])
    .map(lang => {
      const url = `${baseUrl}/dictionary/${lang}/${encodeURIComponent(term)}`
      return `    <link rel="alternate" hreflang="${lang}" href="${url}">`
    })
    .join('\n')
}

/**
 * Generate meta description from dictionary entry
 */
function generateMetaDescription(entry: DictionaryEntry): string {
  let description = entry.definition.concise

  // Add pronunciation if available
  if (entry.definition.pronunciation?.ipa) {
    description += ` Pronunciation: /${entry.definition.pronunciation.ipa}/`
  }

  // Add etymology if available and space permits
  if (entry.definition.etymology && description.length < 120) {
    const etymologyPreview = entry.definition.etymology.substring(
      0,
      160 - description.length - 10
    )
    description += `. Etymology: ${etymologyPreview}...`
  }

  // Ensure it's within meta description length limits
  return description.length > 160
    ? description.substring(0, 157) + '...'
    : description
}

/**
 * Generate full HTML page for a dictionary term
 */
export function generateTermHtml(options: HtmlTemplateOptions): string {
  const {
    entry,
    lang,
    term,
    relatedTerms = [],
    languageVersions = {},
    baseUrl = 'https://mirubato.com',
  } = options

  const pageTitle = `${entry.term} - Music Definition | Mirubato Dictionary`
  const metaDescription = generateMetaDescription(entry)
  const structuredData = generateStructuredData(entry, baseUrl)
  const hreflangTags = generateHreflangTags(term, languageVersions, baseUrl)

  // Quality score indicator
  const qualityClass =
    entry.quality_score.overall >= 80
      ? 'high'
      : entry.quality_score.overall >= 60
        ? 'medium'
        : 'low'

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO Meta Tags -->
    <title>${pageTitle}</title>
    <meta name="description" content="${metaDescription}">
    <meta name="keywords" content="music, definition, ${entry.term}, ${entry.type}, music theory, dictionary">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${baseUrl}/dictionary/${lang}/${encodeURIComponent(term)}">
    
    <!-- Hreflang Tags -->
${hreflangTags}
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:url" content="${baseUrl}/dictionary/${lang}/${encodeURIComponent(term)}">
    <meta property="og:site_name" content="Mirubato Music Dictionary">
    <meta property="og:locale" content="${lang.replace('-', '_')}">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${metaDescription}">
    <meta name="twitter:site" content="@mirubato">
    
    <!-- Additional Meta Tags -->
    <meta name="author" content="Mirubato">
    <meta name="robots" content="index, follow">
    <meta name="rating" content="general">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
${structuredData}
    </script>
    
    <!-- Styling -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7f4;
            color: #3d3d3a;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #7a8a6f 0%, #6b7a5c 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 8px;
            font-weight: 300;
        }
        
        .header .type {
            background: rgba(255,255,255,0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            display: inline-block;
        }
        
        .pronunciation {
            margin-top: 10px;
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .definition {
            margin-bottom: 30px;
        }
        
        .definition h2 {
            color: #7a8a6f;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }
        
        .definition-text {
            font-size: 1.1rem;
            margin-bottom: 15px;
            color: #444;
        }
        
        .quality-score {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .quality-score.high {
            background: #10b981;
            color: white;
        }
        
        .quality-score.medium {
            background: #f59e0b;
            color: white;
        }
        
        .quality-score.low {
            background: #ef4444;
            color: white;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section h3 {
            color: #6b7a5c;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .section p, .section ul {
            color: #555;
        }
        
        .section ul {
            padding-left: 20px;
        }
        
        .section ul li {
            margin-bottom: 5px;
        }
        
        .related-terms {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        
        .related-terms h3 {
            margin-bottom: 15px;
        }
        
        .term-links {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .term-link {
            background: #7a8a6f;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            text-decoration: none;
            font-size: 0.9rem;
            transition: background 0.2s;
        }
        
        .term-link:hover {
            background: #6b7a5c;
            color: white;
        }
        
        .language-versions {
            background: #e8ebe6;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        
        .language-versions h3 {
            margin-bottom: 15px;
        }
        
        .language-links {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .language-link {
            background: white;
            color: #7a8a6f;
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            border: 1px solid #7a8a6f;
            transition: all 0.2s;
        }
        
        .language-link:hover {
            background: #7a8a6f;
            color: white;
        }
        
        .language-link.current {
            background: #7a8a6f;
            color: white;
        }
        
        .footer {
            background: #f5f7f4;
            padding: 20px 30px;
            border-top: 1px solid #e0d8cb;
            text-align: center;
            color: #6b6b66;
        }
        
        .footer a {
            color: #7a8a6f;
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        .breadcrumb {
            padding: 15px 30px;
            background: #f9fafb;
            border-bottom: 1px solid #e0d8cb;
            font-size: 0.9rem;
        }
        
        .breadcrumb a {
            color: #7a8a6f;
            text-decoration: none;
        }
        
        .breadcrumb a:hover {
            text-decoration: underline;
        }
        
        .breadcrumb span {
            color: #6b6b66;
            margin: 0 8px;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .content {
                padding: 20px;
            }
            
            .language-links, .term-links {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Breadcrumb Navigation -->
        <nav class="breadcrumb">
            <a href="${baseUrl}">Mirubato</a>
            <span>›</span>
            <a href="${baseUrl}/toolbox">Toolbox</a>
            <span>›</span>
            <a href="${baseUrl}/dictionary">Dictionary</a>
            <span>›</span>
            <span>${entry.term}</span>
        </nav>
        
        <!-- Header -->
        <header class="header">
            <h1>${entry.term}</h1>
            <div class="type">${entry.type}</div>
            ${entry.definition.pronunciation?.ipa ? `<div class="pronunciation">/${entry.definition.pronunciation.ipa}/</div>` : ''}
            <div style="margin-top: 10px;">
                <span class="quality-score ${qualityClass}">Quality Score: ${entry.quality_score.overall}%</span>
            </div>
        </header>
        
        <!-- Main Content -->
        <main class="content">
            <!-- Definition -->
            <section class="definition">
                <h2>Definition</h2>
                <div class="definition-text">${entry.definition.concise}</div>
                ${entry.definition.detailed ? `<div class="definition-text">${entry.definition.detailed}</div>` : ''}
            </section>
            
            <!-- Etymology -->
            ${
              entry.definition.etymology
                ? `
            <section class="section">
                <h3>Etymology</h3>
                <p>${entry.definition.etymology}</p>
            </section>
            `
                : ''
            }
            
            <!-- Examples -->
            ${
              entry.definition.usage_example
                ? `
            <section class="section">
                <h3>Example</h3>
                <p>${entry.definition.usage_example}</p>
            </section>
            `
                : ''
            }
            
            <!-- Additional Information -->
            ${
              entry.metadata?.cultural_origin
                ? `
            <section class="section">
                <h3>Cultural Origin</h3>
                <p>${entry.metadata.cultural_origin}</p>
            </section>
            `
                : ''
            }
        </main>
        
        <!-- Related Terms -->
        ${
          relatedTerms.length > 0
            ? `
        <section class="related-terms">
            <h3>Related Terms</h3>
            <div class="term-links">
                ${relatedTerms
                  .map(
                    relatedTerm =>
                      `<a href="${baseUrl}/dictionary/${lang}/${encodeURIComponent(relatedTerm)}" class="term-link">${relatedTerm}</a>`
                  )
                  .join('')}
            </div>
        </section>
        `
            : ''
        }
        
        <!-- Language Versions -->
        ${
          Object.keys(languageVersions).length > 1
            ? `
        <section class="language-versions">
            <h3>Available Languages</h3>
            <div class="language-links">
                ${Object.entries(languageVersions)
                  .filter(([, available]) => available)
                  .map(([langCode]) => {
                    const isCurrentLang = langCode === lang
                    const langName =
                      {
                        en: 'English',
                        es: 'Español',
                        fr: 'Français',
                        de: 'Deutsch',
                        'zh-CN': '中文 (简体)',
                        'zh-TW': '中文 (繁體)',
                      }[langCode] || langCode.toUpperCase()

                    return `<a href="${baseUrl}/dictionary/${langCode}/${encodeURIComponent(term)}" 
                             class="language-link ${isCurrentLang ? 'current' : ''}">${langName}</a>`
                  })
                  .join('')}
            </div>
        </section>
        `
            : ''
        }
        
        <!-- Footer -->
        <footer class="footer">
            <p>
                Part of the <a href="${baseUrl}">Mirubato</a> music education platform. 
                <a href="${baseUrl}/toolbox">Explore more tools</a> |
                <a href="${baseUrl}/about">About Mirubato</a>
            </p>
            <p style="margin-top: 8px; font-size: 0.8rem;">
                © 2025 Mirubato. Content generated and verified by AI. Last updated: ${new Date(entry.updated_at).toLocaleDateString()}
            </p>
        </footer>
    </div>
</body>
</html>`

  return html
}

/**
 * Generate HTML for term not found page with suggestions
 */
export function generateNotFoundHtml(
  term: string,
  lang: SupportedLanguage,
  suggestions: string[] = [],
  baseUrl: string = 'https://mirubato.com'
): string {
  const pageTitle = `"${term}" not found - Mirubato Music Dictionary`
  const metaDescription = `The music term "${term}" was not found in our dictionary. Explore suggestions and related music terms.`

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <meta name="description" content="${metaDescription}">
    <meta name="robots" content="noindex, follow">
    <link rel="canonical" href="${baseUrl}/dictionary">
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7f4;
            color: #3d3d3a;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #7a8a6f;
            margin-bottom: 20px;
        }
        
        .suggestions {
            margin-top: 30px;
        }
        
        .suggestion-link {
            display: inline-block;
            background: #7a8a6f;
            color: white;
            padding: 8px 16px;
            margin: 5px;
            border-radius: 20px;
            text-decoration: none;
            transition: background 0.2s;
        }
        
        .suggestion-link:hover {
            background: #6b7a5c;
            color: white;
        }
        
        .back-link {
            margin-top: 20px;
        }
        
        .back-link a {
            color: #7a8a6f;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Term Not Found</h1>
        <p>We couldn't find the music term <strong>"${term}"</strong> in our dictionary.</p>
        
        ${
          suggestions.length > 0
            ? `
        <div class="suggestions">
            <h3>Did you mean?</h3>
            ${suggestions
              .map(
                suggestion =>
                  `<a href="${baseUrl}/dictionary/${lang}/${encodeURIComponent(suggestion)}" class="suggestion-link">${suggestion}</a>`
              )
              .join('')}
        </div>
        `
            : `
        <p style="margin-top: 20px;">
            Our AI is working to generate this term. Please try again later or 
            <a href="${baseUrl}/toolbox" style="color: #7a8a6f;">explore our dictionary</a>.
        </p>
        `
        }
        
        <div class="back-link">
            <a href="${baseUrl}/toolbox">← Back to Dictionary</a>
        </div>
    </div>
</body>
</html>`

  return html
}
