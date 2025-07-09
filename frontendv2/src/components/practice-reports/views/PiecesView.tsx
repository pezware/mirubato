import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { PiecesStatistics } from '../PiecesStatistics'
import { PieceComposerStats } from '../PieceComposerStats'
import { useAutocomplete } from '../../../hooks/useAutocomplete'
import { formatDuration } from '../../../utils/dateUtils'
import { Card } from '../../ui/Card'
import { Search } from 'lucide-react'

interface PiecesViewProps {
  analytics: EnhancedAnalyticsData
}

export default function PiecesView({ analytics }: PiecesViewProps) {
  const { t } = useTranslation(['reports', 'common'])
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null)
  const [selectedComposer, setSelectedComposer] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Autocomplete hooks
  const pieceAutocomplete = useAutocomplete({
    type: 'piece',
    composer: selectedComposer || undefined,
    minLength: 0,
  })

  const composerAutocomplete = useAutocomplete({
    type: 'composer',
    minLength: 0,
  })

  // Filter pieces based on search - removed as unused

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-morandi-stone-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('reports:searchPiecesComposers')}
              className="w-full pl-10 pr-4 py-2 border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedComposer || ''}
              onChange={e => setSelectedComposer(e.target.value || null)}
              className="px-4 py-2 border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-purple-500"
            >
              <option value="">{t('reports:allComposers')}</option>
              {composerAutocomplete.suggestions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={selectedPiece || ''}
              onChange={e => setSelectedPiece(e.target.value || null)}
              className="px-4 py-2 border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-purple-500"
            >
              <option value="">{t('reports:allPieces')}</option>
              {pieceAutocomplete.suggestions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Selected Piece/Composer Stats */}
      {(selectedPiece || selectedComposer) && (
        <PieceComposerStats
          analytics={analytics}
          selectedPiece={selectedPiece}
          selectedComposer={selectedComposer}
          formatDuration={formatDuration}
        />
      )}

      {/* Pieces Statistics Table */}
      <div>
        <h3 className="text-lg font-semibold text-morandi-stone-700 mb-3">
          {t('reports:detailedStatistics')}
        </h3>
        <PiecesStatistics
          analytics={analytics}
          formatDuration={formatDuration}
          selectedPiece={selectedPiece}
          selectedComposer={selectedComposer}
          setSelectedPiece={setSelectedPiece}
        />
      </div>
    </div>
  )
}
