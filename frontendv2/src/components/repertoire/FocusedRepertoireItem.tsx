import React from 'react'
import { formatDistanceToNow, isToday } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { formatDuration, capitalizeTimeString } from '@/utils/dateUtils'
import { toTitleCase } from '@/utils/textFormatting'
import { RepertoireItem, RepertoireStatus } from '@/api/repertoire'
import { Goal } from '@/api/goals'
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

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
