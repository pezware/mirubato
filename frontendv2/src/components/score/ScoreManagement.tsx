import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useScoreStore } from '../../stores/scoreStore'
import { useAuthStore } from '../../stores/authStore'
import { scoreService } from '../../services/scoreService'
import type { Score, Collection } from '../../services/scoreService'

export default function ScoreManagement() {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { toggleManagement, collections, userLibrary, loadUserLibrary } =
    useScoreStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Score[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Load user library on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadUserLibrary()
    }
  }, [isAuthenticated, loadUserLibrary])

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const results = await scoreService.searchScores({ query: searchQuery })
      setSearchResults(results.items)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleScoreSelect = (scoreId: string) => {
    navigate(`/scorebook/${scoreId}`)
    toggleManagement()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={toggleManagement}>
      <div
        className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-morandi-stone-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-morandi-stone-800">
              {t('scorebook:scoreManagement', 'Score Management')}
            </h3>
            <button
              onClick={toggleManagement}
              className="p-2 hover:bg-morandi-stone-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Search Scores */}
            <div>
              <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                {t('scorebook:searchScores', 'Search Scores')}
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={t(
                    'scorebook:searchPlaceholder',
                    'Search by title, composer...'
                  )}
                  className="flex-1 px-4 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-morandi-sage-500 text-white rounded-lg hover:bg-morandi-sage-400 transition-colors disabled:opacity-50"
                >
                  {isSearching ? '...' : t('common:search')}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map(score => (
                    <button
                      key={score.id}
                      onClick={() => handleScoreSelect(score.id)}
                      className="w-full text-left p-3 bg-morandi-stone-50 rounded-lg hover:bg-morandi-stone-100 transition-colors"
                    >
                      <div className="font-medium text-morandi-stone-800">
                        {score.title}
                      </div>
                      <div className="text-sm text-morandi-stone-600">
                        {score.composer} • {score.instrument}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Score (Authenticated only) */}
            {isAuthenticated && (
              <div>
                <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                  {t('scorebook:uploadScore', 'Upload New Score')}
                </h4>
                <div className="border-2 border-dashed border-morandi-stone-300 rounded-lg p-8 text-center">
                  <svg
                    className="w-12 h-12 mx-auto text-morandi-stone-400 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-morandi-stone-600 mb-2">
                    {t(
                      'scorebook:uploadPrompt',
                      'Drop PDF files here or click to browse'
                    )}
                  </p>
                  <button className="px-4 py-2 bg-morandi-sage-500 text-white rounded-lg hover:bg-morandi-sage-400 transition-colors text-sm">
                    {t('scorebook:selectFiles', 'Select Files')}
                  </button>
                </div>
              </div>
            )}

            {/* My Scores (Authenticated only) */}
            {isAuthenticated && userLibrary.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                  {t('scorebook:myScores', 'My Scores')}
                </h4>
                <div className="space-y-2">
                  {userLibrary.slice(0, 5).map(score => (
                    <button
                      key={score.id}
                      onClick={() => handleScoreSelect(score.id)}
                      className="w-full text-left p-3 bg-morandi-stone-50 rounded-lg hover:bg-morandi-stone-100 transition-colors"
                    >
                      <div className="font-medium text-morandi-stone-800">
                        {score.title}
                      </div>
                      <div className="text-sm text-morandi-stone-600">
                        {score.composer} • {score.instrument}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Collections */}
            <div>
              <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                {t('scorebook:collections', 'Browse Collections')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {collections
                  .filter(c => c.isFeatured)
                  .slice(0, 4)
                  .map(collection => (
                    <button
                      key={collection.id}
                      onClick={() =>
                        navigate(`/scorebook/collection/${collection.slug}`)
                      }
                      className="p-3 bg-morandi-sage-50 text-morandi-stone-700 rounded-lg hover:bg-morandi-sage-100 transition-colors text-sm text-center"
                    >
                      {collection.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
