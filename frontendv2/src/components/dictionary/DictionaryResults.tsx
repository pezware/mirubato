import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { sanitizeOutput } from '@/utils/dictionarySecurity'
import { DictionaryResultsProps, SupportedLanguage } from '@/types/dictionary'

/**
 * Display dictionary search results with pagination
 */
const DictionaryResults: React.FC<DictionaryResultsProps> = ({
  results,
  totalResults,
  currentPage,
  totalPages,
  onTermSelect,
  onPageChange,
  isLoading,
}) => {
  const { t, i18n } = useTranslation(['toolbox'])
  const currentLanguage = i18n.language as SupportedLanguage

  // Get quality color based on score (0-100 scale)
  const getQualityColor = (score?: number) => {
    if (!score) return 'bg-stone-100'
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  // Get language display name
  const getLanguageName = (lang: string) => {
    const langNames: Record<string, string> = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      it: 'Italiano',
      la: 'Latin',
    }
    return langNames[lang] || lang.toUpperCase()
  }

  // Get language indicator color
  const getLanguageColor = (lang: string) => {
    if (lang === currentLanguage) {
      return 'bg-sage-100 text-sage-700 ring-1 ring-sage-300'
    }
    return 'bg-stone-100 text-stone-600'
  }

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    // First page
    if (start > 1) {
      pages.push(
        <Button
          key="first"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={isLoading}
        >
          1
        </Button>
      )
      if (start > 2) {
        pages.push(
          <span key="dots-start" className="px-2">
            …
          </span>
        )
      }
    }

    // Page numbers
    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onPageChange(i)}
          disabled={isLoading || i === currentPage}
        >
          {i}
        </Button>
      )
    }

    // Last page
    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(
          <span key="dots-end" className="px-2">
            …
          </span>
        )
      }
      pages.push(
        <Button
          key="last"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={isLoading}
        >
          {totalPages}
        </Button>
      )
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isLoading || currentPage === 1}
        >
          ←
        </Button>
        {pages}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLoading || currentPage === totalPages}
        >
          →
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Results count */}
      <div className="mb-4 text-sm text-stone-600">
        {t('toolbox:dictionary.showingResults', {
          start: (currentPage - 1) * results.length + 1,
          end: Math.min(currentPage * results.length, totalResults),
          total: totalResults,
        })}
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {results.map(entry => (
          <div
            key={entry.id}
            className="bg-white rounded-lg p-4 border-l-4 border-morandi-sage-300 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onTermSelect(entry)}
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-semibold text-stone-800">
                      {sanitizeOutput(entry.term)}
                    </h4>
                    {/* Language indicator */}
                    {entry.lang && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLanguageColor(
                          entry.lang
                        )}`}
                        title={
                          entry.lang === currentLanguage
                            ? t('toolbox:dictionary.currentLanguage', {
                                lang: getLanguageName(entry.lang),
                              })
                            : getLanguageName(entry.lang)
                        }
                      >
                        {entry.lang.toUpperCase()}
                        {entry.lang === currentLanguage && ' ★'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-600">
                    {t(`toolbox:dictionary.types.${entry.type}`)}
                    {entry.source_lang && entry.source_lang !== entry.lang && (
                      <span className="ml-2 text-stone-500">
                        •{' '}
                        {t('toolbox:dictionary.originalLanguage', {
                          lang: getLanguageName(entry.source_lang),
                        })}
                      </span>
                    )}
                  </p>
                </div>
                {entry.quality_score && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getQualityColor(
                      entry.quality_score.overall
                    )}`}
                  >
                    {Math.round(entry.quality_score.overall)}%
                  </span>
                )}
              </div>

              {/* Concise definition preview */}
              {entry.definition?.concise ? (
                <p className="text-stone-700 line-clamp-2">
                  {sanitizeOutput(entry.definition.concise)}
                </p>
              ) : (
                <p className="text-stone-400 italic">
                  {t('toolbox:dictionary.definitionPending')}
                </p>
              )}

              {/* Metadata tags */}
              {entry.metadata && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {entry.metadata.difficulty_level && (
                    <span className="text-xs px-2 py-1 bg-stone-100 rounded-full">
                      {t(
                        `toolbox:dictionary.difficulty.${entry.metadata.difficulty_level}`
                      )}
                    </span>
                  )}
                  {entry.metadata.instruments?.slice(0, 2).map(instrument => (
                    <span
                      key={instrument}
                      className="text-xs px-2 py-1 bg-sage-100 rounded-full"
                    >
                      {sanitizeOutput(instrument)}
                    </span>
                  ))}
                  {entry.metadata.instruments &&
                    entry.metadata.instruments.length > 2 && (
                      <span className="text-xs px-2 py-1 bg-sage-100 rounded-full">
                        +{entry.metadata.instruments.length - 2}
                      </span>
                    )}
                  {entry.references && (
                    <span className="text-xs px-2 py-1 bg-peach-100 rounded-full">
                      {t('toolbox:dictionary.hasReferences')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {renderPagination()}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600"></div>
        </div>
      )}
    </div>
  )
}

export default DictionaryResults
