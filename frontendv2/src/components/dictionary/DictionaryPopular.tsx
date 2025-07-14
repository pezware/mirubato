import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button } from '@/components/ui'
import { sanitizeOutput } from '@/utils/dictionarySecurity'
import { DictionaryPopularProps } from '@/types/dictionary'

/**
 * Display popular terms and recent searches
 * Handles empty states gracefully
 */
const DictionaryPopular: React.FC<DictionaryPopularProps> = ({
  terms,
  recentSearches,
  onTermSelect,
}) => {
  const { t } = useTranslation(['toolbox'])

  const hasContent = terms.length > 0 || recentSearches.length > 0

  if (!hasContent) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4 text-stone-800">
          {t('toolbox:dictionary.explore')}
        </h3>
        <p className="text-stone-600 text-center py-8">
          {t('toolbox:dictionary.startSearching')}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-stone-800 flex items-center">
            <span className="mr-2">🕒</span>
            {t('toolbox:dictionary.recentSearches')}
          </h3>
          <div className="space-y-2">
            {recentSearches.map((search, index) => (
              <Button
                key={`recent-${index}`}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => onTermSelect(search)}
              >
                <span className="truncate">{sanitizeOutput(search)}</span>
              </Button>
            ))}
          </div>
          {recentSearches.length === 5 && (
            <p className="text-xs text-stone-500 mt-3 italic">
              {t('toolbox:dictionary.showingRecentSearches', { count: 5 })}
            </p>
          )}
        </Card>
      )}

      {/* Popular Terms */}
      {terms.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-stone-800 flex items-center">
            <span className="mr-2">🔥</span>
            {t('toolbox:dictionary.popularTerms')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {terms.map((term, index) => (
              <Button
                key={`popular-${index}`}
                variant="secondary"
                size="sm"
                className="text-sm"
                onClick={() => onTermSelect(term)}
              >
                <span className="truncate">{sanitizeOutput(term)}</span>
              </Button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-stone-200">
            <p className="text-sm text-stone-600">
              {t('toolbox:dictionary.popularTermsNote')}
            </p>
          </div>
        </Card>
      )}

      {/* Suggestion to start exploring */}
      {terms.length === 0 && recentSearches.length > 0 && (
        <Card className="bg-sage-50 border-sage-200">
          <div className="text-center py-4">
            <p className="text-sage-700 mb-3">
              {t('toolbox:dictionary.discoverMore')}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {/* Suggest some common music terms */}
              {['Allegro', 'Crescendo', 'Staccato', 'Fugue'].map(suggestion => (
                <Button
                  key={suggestion}
                  variant="ghost"
                  size="sm"
                  onClick={() => onTermSelect(suggestion)}
                  className="text-sage-600 hover:text-sage-700"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DictionaryPopular
