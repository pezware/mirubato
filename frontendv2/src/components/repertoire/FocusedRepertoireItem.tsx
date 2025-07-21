import React from 'react'
import { Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatDuration } from '@/utils/dateUtils'

interface FocusedRepertoireItemProps {
  item: any // Type will be defined based on enrichedRepertoire
  onPlay?: () => void
}

export const FocusedRepertoireItem: React.FC<FocusedRepertoireItemProps> = ({
  item,
  onPlay,
}) => {
  // Calculate progress percentage from active goals
  const activeGoal = item.activeGoals?.[0]
  const progress = activeGoal
    ? Math.round((activeGoal.currentValue / activeGoal.targetValue) * 100)
    : 0

  // Determine if needs attention (not practiced in 5+ days)
  const lastPractice = item.lastPracticed || item.recentPractice?.[0]?.timestamp
  const daysSinceLastPractice = lastPractice
    ? Math.floor((Date.now() - lastPractice) / (1000 * 60 * 60 * 24))
    : null

  const needsAttention = daysSinceLastPractice && daysSinceLastPractice >= 5

  // Determine status indicator color
  const isActive = daysSinceLastPractice === 0
  const indicatorClass = isActive
    ? 'bg-green-500'
    : needsAttention
      ? 'bg-orange-500'
      : 'bg-gray-300'

  // Format last practice time
  const lastPracticeText = lastPractice
    ? daysSinceLastPractice === 0
      ? 'Practiced today'
      : formatDistanceToNow(new Date(lastPractice), { addSuffix: true })
    : 'Not practiced yet'

  // Calculate total practice time
  const totalPracticeTime = item.totalPracticeTime || 0
  const recentSessionDuration = item.recentPractice?.[0]?.duration || 0

  // Determine progress ring color
  const progressColor = needsAttention ? '#f59e0b' : '#22c55e'

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        <div className={`w-1 h-12 rounded-full ${indicatorClass}`} />

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-medium text-stone-900">
                {item.scoreComposer} - {item.scoreTitle}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-stone-600">
                <span
                  className={
                    needsAttention ? 'text-orange-600 font-medium' : ''
                  }
                >
                  {lastPracticeText}
                </span>
                {daysSinceLastPractice === 0 && recentSessionDuration > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(recentSessionDuration)}</span>
                  </>
                )}
                <span>•</span>
                <span>{formatDuration(totalPracticeTime)} total</span>
                {activeGoal && (
                  <>
                    <span>•</span>
                    <span>Goal: {activeGoal.title}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Progress Ring */}
              <div className="relative w-10 h-10">
                <svg
                  className="transform -rotate-90 w-10 h-10"
                  viewBox="0 0 40 40"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="#e5e5e5"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke={progressColor}
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="100"
                    strokeDashoffset={100 - progress}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-stone-700">
                  {progress}%
                </div>
              </div>

              {/* Play Button */}
              <button
                onClick={e => {
                  e.stopPropagation()
                  onPlay?.()
                }}
                className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                title="Start practice"
              >
                <Play className="w-4 h-4 text-stone-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
