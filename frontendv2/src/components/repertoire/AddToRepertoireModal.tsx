import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { useScoreStore } from '@/stores/scoreStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { showToast } from '@/components/ui/Toast'
import { RepertoireStatus } from '@/api/repertoire'
import { Search, Music, Plus } from 'lucide-react'

interface AddToRepertoireModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddToRepertoireModal({
  isOpen,
  onClose,
}: AddToRepertoireModalProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const [selectedScoreId, setSelectedScoreId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] =
    useState<keyof RepertoireStatus>('planned')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { addToRepertoire, repertoire } = useRepertoireStore()
  const { scores, loadScores, scoresLoading } = useScoreStore()

  useEffect(() => {
    if (isOpen && scores.length === 0) {
      loadScores()
    }
  }, [isOpen])

  // Filter scores that are not already in repertoire
  const availableScores = scores.filter(
    score =>
      !repertoire.has(score.id) &&
      (searchQuery === '' ||
        score.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (score.composer &&
          score.composer.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  const handleAdd = async () => {
    if (!selectedScoreId) {
      showToast(t('repertoire:selectScore'), 'error')
      return
    }

    setIsLoading(true)
    try {
      await addToRepertoire(selectedScoreId, selectedStatus)
      onClose()
    } catch (error) {
      // Error handled in store
    } finally {
      setIsLoading(false)
    }
  }

  const statusOptions: Array<{ value: keyof RepertoireStatus; label: string }> =
    [
      { value: 'planned', label: t('repertoire:status.planned') },
      { value: 'learning', label: t('repertoire:status.learning') },
      { value: 'working', label: t('repertoire:status.working') },
      { value: 'polished', label: t('repertoire:status.polished') },
      {
        value: 'performance_ready',
        label: t('repertoire:status.performance_ready'),
      },
    ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('repertoire:addToRepertoire')}
      size="medium"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
          <Input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('repertoire:searchScores')}
            className="pl-10"
          />
        </div>

        {/* Score Selection */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:selectPiece')}
          </label>

          {scoresLoading ? (
            <div className="flex justify-center py-8">
              <Loading type="spinner" />
            </div>
          ) : availableScores.length === 0 ? (
            <Card className="p-8 text-center">
              <Music className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-600">
                {searchQuery
                  ? t('repertoire:noScoresMatchSearch')
                  : t('repertoire:allScoresInRepertoire')}
              </p>
            </Card>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableScores.map(score => (
                <Card
                  key={score.id}
                  variant={selectedScoreId === score.id ? 'bordered' : 'ghost'}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedScoreId === score.id
                      ? 'border-sage-500 bg-sage-50'
                      : 'hover:bg-stone-50'
                  }`}
                  onClick={() => setSelectedScoreId(score.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-stone-800">
                        {score.title}
                      </h4>
                      {score.composer && (
                        <p className="text-sm text-stone-600">
                          {score.composer}
                        </p>
                      )}
                    </div>
                    {score.difficulty && (
                      <span className="text-sm text-stone-500">
                        {t(`common:difficulty.${score.difficulty}`)}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Initial Status */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:initialStatus')}
          </label>
          <Select
            value={selectedStatus}
            onChange={e =>
              setSelectedStatus(e.target.value as keyof RepertoireStatus)
            }
            className="w-full"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={!selectedScoreId || isLoading}
          >
            {isLoading ? (
              <Loading type="spinner" size="sm" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('repertoire:addToRepertoire')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
