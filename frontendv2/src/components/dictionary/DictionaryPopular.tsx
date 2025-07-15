import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { sanitizeOutput } from '@/utils/dictionarySecurity'
import { DictionaryPopularProps } from '@/types/dictionary'
import { Clock, TrendingUp } from 'lucide-react'

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
      <div className="bg-white rounded-lg p-6 border-l-4 border-morandi-sage-300">
        <h3 className="text-lg font-semibold mb-4 text-stone-800">
          {t('toolbox:dictionary.explore')}
        </h3>
        <p className="text-stone-600 text-center py-8">
          {t('toolbox:dictionary.startSearching')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="bg-white rounded-lg p-6 border-l-4 border-morandi-sage-300">
          <h3 className="text-lg font-semibold mb-4 text-stone-800 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-morandi-sage-500" />
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
        </div>
      )}

      {/* Popular Terms */}
      {terms.length > 0 && (
        <div className="bg-white rounded-lg p-6 border-l-4 border-morandi-rose-300">
          <h3 className="text-lg font-semibold mb-4 text-stone-800 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-morandi-rose-500" />
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
        </div>
      )}

      {/* Suggestion to start exploring */}
      {terms.length === 0 && recentSearches.length > 0 && (
        <div className="bg-white rounded-lg p-6 border-l-4 border-morandi-peach-300">
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
        </div>
      )}
    </div>
  )
}

export default DictionaryPopular
