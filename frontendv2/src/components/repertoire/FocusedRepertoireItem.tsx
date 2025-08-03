import React, { useState } from 'react'
import { formatDistanceToNow, isToday } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { formatDuration, capitalizeTimeString } from '@/utils/dateUtils'
import { toTitleCase } from '@/utils/textFormatting'
import { RepertoireItem, RepertoireStatus } from '@/api/repertoire'
import { Goal } from '@/api/goals'
import { Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { MusicTitle } from '@/components/ui'

interface RecentPractice {
  timestamp: number
  duration: number
}

interface EnrichedRepertoireItem extends RepertoireItem {
  scoreTitle: string
  scoreComposer: string
  activeGoals?: Goal[]
  recentPractice?: RecentPractice[]
}

interface FocusedRepertoireItemProps {
  item: EnrichedRepertoireItem
}

export const FocusedRepertoireItem: React.FC<FocusedRepertoireItemProps> = ({
  item,
}) => {
  const { t } = useTranslation(['repertoire', 'common'])
  const { removeFromRepertoire } = useRepertoireStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Status configuration
  const statusConfig: Record<
    keyof RepertoireStatus,
    { color: string; bg: string; label: string }
  > = {
    planned: {
      color: 'text-stone-600',
      bg: 'bg-stone-100',
      label: t('repertoire:status.planned'),
    },
    learning: {
      color: 'text-green-700',
      bg: 'bg-green-100',
      label: t('repertoire:status.learning'),
    },
    polished: {
      color: 'text-blue-700',
      bg: 'bg-blue-100',
      label: t('repertoire:status.polished'),
    },
    dropped: {
      color: 'text-gray-700',
      bg: 'bg-gray-100',
      label: t('repertoire:status.dropped'),
    },
  }

  const status = statusConfig[item.status]
  const activeGoal = item.activeGoals?.[0]

  // Determine if needs attention (not practiced in 5+ days)
  const lastPractice = item.lastPracticed || item.recentPractice?.[0]?.timestamp
  const lastPracticeDate = lastPractice ? new Date(lastPractice) : null
  const daysSinceLastPractice = lastPractice
    ? Math.floor((Date.now() - lastPractice) / (1000 * 60 * 60 * 24))
    : null

  const needsAttention = daysSinceLastPractice && daysSinceLastPractice >= 5

  // Determine status indicator color
  const isActive = lastPracticeDate ? isToday(lastPracticeDate) : false
  const indicatorClass =
    item.status === 'polished'
      ? 'bg-morandi-navy-500' // Dark morandi blue for polished pieces
      : isActive
        ? 'bg-green-500'
        : needsAttention
          ? 'bg-orange-500'
          : 'bg-gray-300'

  // Format last practice time
  const lastPracticeText = lastPracticeDate
    ? isToday(lastPracticeDate)
      ? t('repertoire:practicedToday')
      : item.status === 'polished'
        ? lastPracticeDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : capitalizeTimeString(
            formatDistanceToNow(lastPracticeDate, { addSuffix: true })
          )
    : '' // Remove "Not practiced yet" text

  // Calculate total practice time
  const totalPracticeTime = item.totalPracticeTime || 0

  // Check if item can be deleted (no practice sessions)
  const canDelete =
    (item.practiceCount === 0 || !item.practiceCount) &&
    item.status !== 'dropped'

  const handleDelete = async () => {
    if (!canDelete) return

    setIsDeleting(true)
    try {
      await removeFromRepertoire(item.scoreId)
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to delete repertoire item:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        {/* Status Indicator */}
        <div className={`w-1 h-12 rounded-full ${indicatorClass}`} />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2">
            {/* Title and Composer */}
            <div>
              <MusicTitle
                as="h3"
                className="text-base break-words text-stone-900"
              >
                {toTitleCase(item.scoreComposer)} -{' '}
                {toTitleCase(item.scoreTitle)}
              </MusicTitle>
            </div>

            {/* Metadata and Actions Row */}
            <div className="flex items-center justify-between gap-2">
              {/* Left side: Status and metadata */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-stone-600 flex-wrap min-w-0 flex-1">
                {/* Status Badge */}
                <span
                  className={`px-2 py-0.5 ${status.color} rounded-full text-xs font-medium flex-shrink-0`}
                >
                  {status.label}
                </span>

                {/* Last practiced - only show if there's actual text */}
                {lastPracticeText && (
                  <>
                    <span className="text-stone-400 flex-shrink-0">•</span>
                    <span
                      className={`flex-shrink-0 ${
                        needsAttention ? 'text-orange-600 font-medium' : ''
                      }`}
                    >
                      {lastPracticeText}
                    </span>
                  </>
                )}

                {/* Total practice time - show only if there's practice time */}
                {totalPracticeTime > 0 && (
                  <>
                    <span className="text-stone-400 flex-shrink-0">•</span>
                    <span className="flex-shrink-0">
                      {formatDuration(totalPracticeTime)}
                    </span>
                  </>
                )}

                {/* Goal (if present) - will wrap to next line if needed */}
                {activeGoal && (
                  <>
                    <span className="text-stone-400 flex-shrink-0">•</span>
                    <span className="truncate min-w-0">
                      {t('common:goal')}: {activeGoal.title}
                    </span>
                  </>
                )}
              </div>

              {/* Right side: Delete button */}
              {canDelete && (
                <div className="flex-shrink-0">
                  {showDeleteConfirm ? (
                    <div className="flex gap-1">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="min-w-[32px] min-h-[32px] px-2 text-xs"
                      >
                        {t('common:yes')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="min-w-[32px] min-h-[32px] px-2 text-xs"
                      >
                        {t('common:cancel')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        setShowDeleteConfirm(true)
                      }}
                      title={t('repertoire:delete')}
                      className="text-stone-500 hover:text-red-600 min-w-[44px] min-h-[44px] p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
