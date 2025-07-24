import React from 'react'
import { formatDistanceToNow, isToday } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { formatDuration } from '@/utils/dateUtils'
import { toTitleCase } from '@/utils/textFormatting'
import { RepertoireItem, RepertoireStatus } from '@/api/repertoire'
import { Goal } from '@/api/goals'

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

  // Determine status indicator color
  const isActive = lastPracticeDate ? isToday(lastPracticeDate) : false
  const indicatorClass = isActive
    ? 'bg-green-500'
    : needsAttention
      ? 'bg-orange-500'
      : 'bg-gray-300'

  // Format last practice time
  const lastPracticeText = lastPracticeDate
    ? isToday(lastPracticeDate)
      ? t('repertoire:practicedToday')
      : formatDistanceToNow(lastPracticeDate, { addSuffix: true })
    : t('repertoire:notPracticedYet')

  // Calculate total practice time
  const totalPracticeTime = item.totalPracticeTime || 0
  const recentSessionDuration = item.recentPractice?.[0]?.duration || 0

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        <div className={`w-1 h-12 rounded-full ${indicatorClass}`} />

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-base font-medium text-stone-900">
                  {toTitleCase(item.scoreComposer)} -{' '}
                  {toTitleCase(item.scoreTitle)}
                </h3>
                {/* Status Badge */}
                <span
                  className={`px-2 py-0.5 ${status.bg} ${status.color} rounded-full text-xs font-medium`}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-stone-600">
                <span
                  className={
                    needsAttention ? 'text-orange-600 font-medium' : ''
                  }
                >
                  {lastPracticeText}
                </span>
                {isActive && recentSessionDuration > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(recentSessionDuration)}</span>
                  </>
                )}
                <span>•</span>
                <span>
                  {formatDuration(totalPracticeTime)}{' '}
                  {t('repertoire:totalSessions')}
                </span>
                {activeGoal && (
                  <>
                    <span>•</span>
                    <span>
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
