import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { showToast } from '@/utils/toastManager'
import { generateNormalizedScoreId } from '@/utils/scoreIdNormalizer'
import Button from '@/components/ui/Button'
import { Music, X } from 'lucide-react'

interface AddToRepertoirePromptProps {
  pieceTitle: string
  composer?: string | null
  onClose: () => void
  onAdded?: () => void
}

export function AddToRepertoirePrompt({
  pieceTitle,
  composer,
  onClose,
  onAdded,
}: AddToRepertoirePromptProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const { addToRepertoire } = useRepertoireStore()
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    setIsAdding(true)
    try {
      // Create a normalized scoreId from the piece info
      const scoreId = generateNormalizedScoreId(pieceTitle, composer)

      await addToRepertoire(scoreId, 'learning')

      showToast(
        t('repertoire:addedToRepertoire', { piece: pieceTitle }),
        'success'
      )

      onAdded?.()
      onClose()
    } catch (error) {
      console.error('Failed to add to repertoire:', error)
      showToast(t('repertoire:failedToAdd'), 'error')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border border-stone-200 p-4 animate-slide-up z-40">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-stone-400 hover:text-stone-600"
        aria-label={t('common:close')}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Music className="w-8 h-8 text-sage-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-stone-800 mb-1">
            {t('repertoire:addToRepertoireQuestion')}
          </h3>
          <p className="text-sm text-stone-600 mb-3">
            {composer
              ? t('repertoire:justPracticedWithComposer', {
                  piece: pieceTitle,
                  composer: composer,
                })
              : t('repertoire:justPracticed', { piece: pieceTitle })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? t('common:adding') : t('repertoire:addToRepertoire')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('common:notNow')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
