import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { RepertoireItem, RepertoireStatus } from '@/api/repertoire'
import { Goal } from '@/api/goals'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { formatDuration, formatRelativeTime } from '@/utils/dateUtils'
import { EditNotesModal } from './EditNotesModal'
import { EditGoalModal } from './EditGoalModal'
import {
  Clock,
  Target,
  Calendar,
  MoreVertical,
  Edit,
  Trash,
  StickyNote,
  Pencil,
} from 'lucide-react'

interface PracticeSession {
  id: string
  timestamp: number
  duration: number
  notes?: string
}

interface EnrichedRepertoireItem extends RepertoireItem {
  scoreTitle: string
  scoreComposer: string
  activeGoals: Goal[]
  recentPractice: PracticeSession[]
  isLogbookPiece?: boolean
  relatedSessions?: number // Number of practice sessions linked to goals
}

interface RepertoireCardProps {
  item: EnrichedRepertoireItem
  onCreateGoal: () => void
}

export function RepertoireCard({ item, onCreateGoal }: RepertoireCardProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [showEditNotesModal, setShowEditNotesModal] = useState(false)
  const [showEditGoalModal, setShowEditGoalModal] = useState(false)
  const {
    updateRepertoireStatus,
    removeFromRepertoire,
    updateRepertoireNotes,
    updateGoal,
  } = useRepertoireStore()

  // Status colors and labels
  const statusConfig: Record<
    keyof RepertoireStatus,
    { color: string; bg: string; label: string }
  > = {
    planned: {
      color: 'text-stone-700',
      bg: 'bg-stone-100',
      label: t('repertoire:status.planned'),
    },
    learning: {
      color: 'text-green-700',
      bg: 'bg-green-100',
      label: t('repertoire:status.learning'),
    },
    working: {
      color: 'text-orange-700',
      bg: 'bg-orange-100',
      label: t('repertoire:status.working'),
    },
    polished: {
      color: 'text-blue-700',
      bg: 'bg-blue-100',
      label: t('repertoire:status.polished'),
    },
    performance_ready: {
      color: 'text-purple-700',
      bg: 'bg-purple-100',
      label: t('repertoire:status.performance_ready'),
    },
  }

  const status = statusConfig[item.status]

  // Check if recently practiced (within 7 days)
  const isRecentlyPracticed =
    item.lastPracticed &&
    Date.now() - item.lastPracticed < 7 * 24 * 60 * 60 * 1000

  // Check if practiced today
  const isPracticedToday =
    item.lastPracticed &&
    new Date(item.lastPracticed).toDateString() === new Date().toDateString()

  // Calculate progress for active goals
  const primaryGoal = item.activeGoals[0]
  const goalProgress =
    primaryGoal && primaryGoal.targetValue
      ? ((primaryGoal.currentValue || 0) / primaryGoal.targetValue) * 100
      : 0

  const handleStatusChange = async (newStatus: keyof RepertoireStatus) => {
    await updateRepertoireStatus(item.scoreId, newStatus)
    setIsEditingStatus(false)
  }

  const handleRemove = async () => {
    if (confirm(t('repertoire:confirmRemove'))) {
      await removeFromRepertoire(item.scoreId)
    }
  }

  const handleViewScore = () => {
    if (!item.isLogbookPiece) {
      navigate(`/scorebook/${item.scoreId}`)
    }
  }

  const handlePractice = () => {
    if (item.isLogbookPiece) {
      // For logbook pieces, navigate to the logbook with the piece pre-filled
      navigate('/logbook', {
        state: {
          prefillPiece: {
            title: item.scoreTitle,
            composer:
              item.scoreComposer === 'Unknown' ? undefined : item.scoreComposer,
          },
        },
      })
    } else {
      navigate(`/scorebook/${item.scoreId}?startPractice=true`)
    }
  }

  return (
    <Card
      variant="elevated"
      className={`p-6 ${isPracticedToday ? 'border-l-4 border-orange-500' : ''}`}
    >
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                {item.scoreComposer
                  ? `${item.scoreComposer} - ${item.scoreTitle}`
                  : item.scoreTitle}
                {isPracticedToday && (
                  <span className="w-4 h-4 text-orange-500">🔥</span>
                )}
                {item.isLogbookPiece && (
                  <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    {t('repertoire:fromLogbook')}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-stone-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(item.totalPracticeTime)}
                </span>
                {item.lastPracticed && (
                  <span className={isRecentlyPracticed ? 'text-green-600' : ''}>
                    {t('repertoire:lastPracticed', {
                      time: formatRelativeTime(item.lastPracticed),
                    })}
                  </span>
                )}
                {item.practiceCount > 0 && (
                  <span>
                    {t('repertoire:sessionCount', {
                      count: item.practiceCount,
                    })}
                  </span>
                )}
                {item.relatedSessions && item.relatedSessions > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Target className="w-3 h-3" />
                    {t('repertoire:linkedSessions', {
                      count: item.relatedSessions,
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {isEditingStatus ? (
              <Select
                value={item.status}
                onChange={value =>
                  handleStatusChange(value as keyof RepertoireStatus)
                }
                options={Object.entries(statusConfig).map(([key, config]) => ({
                  value: key,
                  label: config.label,
                }))}
                className="w-40"
              />
            ) : (
              <button
                onClick={() => setIsEditingStatus(true)}
                className={`px-3 py-1 ${status.bg} ${status.color} rounded-full text-sm font-medium hover:opacity-80 transition-opacity`}
              >
                {status.label}
              </button>
            )}
          </div>

          {/* Active Goal */}
          {primaryGoal && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm font-medium text-blue-800">
                  <Target className="w-4 h-4" />
                  {primaryGoal.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-600">
                    {Math.round(goalProgress)}%
                  </span>
                  <button
                    onClick={() => setShowEditGoalModal(true)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title={t('repertoire:editGoal')}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              {primaryGoal.targetDate && (
                <div className="mt-2 text-sm text-blue-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t('repertoire:targetDate', {
                    date: new Date(
                      isNaN(Number(primaryGoal.targetDate))
                        ? primaryGoal.targetDate
                        : parseInt(primaryGoal.targetDate)
                    ).toLocaleDateString(),
                  })}
                </div>
              )}
            </div>
          )}

          {/* Personal Notes Section - More Prominent */}
          <div className="mt-4">
            {item.personalNotes ? (
              <Card variant="ghost" className="p-3 bg-sage-50">
                <div className="flex items-start gap-2">
                  <StickyNote className="w-4 h-4 text-sage-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">
                      {item.personalNotes}
                    </p>
                    {item.referenceLinks && item.referenceLinks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.referenceLinks.map((link, index) => (
                          <a
                            key={index}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline block"
                          >
                            📎 {link}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <button
                onClick={() => setShowEditNotesModal(true)}
                className="w-full p-3 border-2 border-dashed border-stone-300 rounded-lg text-sm text-stone-500 hover:border-sage-400 hover:text-sage-600 transition-colors flex items-center justify-center gap-2"
              >
                <StickyNote className="w-4 h-4" />
                {t('repertoire:addNotesPrompt')}
              </button>
            )}
          </div>

          {/* Difficulty Rating */}
          {item.difficultyRating && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-stone-600">
                {t('repertoire:difficulty')}:
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span
                    key={i}
                    className={
                      i <= item.difficultyRating!
                        ? 'text-yellow-500'
                        : 'text-stone-300'
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex lg:flex-col gap-2">
          {isPracticedToday ? (
            <Button variant="primary" size="sm" onClick={handlePractice}>
              {t('repertoire:continuePractice')}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handlePractice}>
              {t('repertoire:startPractice')}
            </Button>
          )}

          {!item.isLogbookPiece && (
            <Button variant="ghost" size="sm" onClick={handleViewScore}>
              {t('repertoire:viewScore')}
            </Button>
          )}

          {item.activeGoals.length === 0 && (
            <Button variant="ghost" size="sm" onClick={onCreateGoal}>
              {t('repertoire:setGoal')}
            </Button>
          )}

          {/* More Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-10">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setShowEditNotesModal(true)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  <Edit className="w-4 h-4" />
                  {t('repertoire:editNotes')}
                </button>
                <button
                  onClick={() => {
                    handleRemove()
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash className="w-4 h-4" />
                  {t('repertoire:remove')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Practice Sessions */}
      {item.recentPractice && item.recentPractice.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-200">
          <h4 className="text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:recentPractice')}
          </h4>
          <div className="space-y-2">
            {item.recentPractice.map(session => (
              <div
                key={session.id}
                className="flex items-start justify-between text-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-stone-600">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(session.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-stone-400">•</span>
                    <span>{formatDuration(session.duration)}</span>
                  </div>
                  {session.notes && (
                    <p className="mt-1 text-stone-500 text-xs">
                      {session.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {item.practiceCount > 5 && (
            <button className="mt-2 text-xs text-sage-600 hover:text-sage-700">
              {t('repertoire:viewAllSessions', {
                count: item.practiceCount,
              })}
            </button>
          )}
        </div>
      )}

      {/* Additional Goals */}
      {item.activeGoals.length > 1 && (
        <div className="mt-4 pt-4 border-t border-stone-200">
          <div className="text-sm text-stone-600">
            {t('repertoire:additionalGoals', {
              count: item.activeGoals.length - 1,
            })}
          </div>
        </div>
      )}

      {/* Edit Notes Modal */}
      {showEditNotesModal && (
        <EditNotesModal
          isOpen={showEditNotesModal}
          onClose={() => setShowEditNotesModal(false)}
          onSave={async (notes, links) => {
            await updateRepertoireNotes(item.scoreId, notes, links)
          }}
          currentNotes={item.personalNotes}
          currentLinks={item.referenceLinks}
          pieceTitle={item.scoreTitle}
        />
      )}

      {/* Edit Goal Modal */}
      {showEditGoalModal && primaryGoal && (
        <EditGoalModal
          isOpen={showEditGoalModal}
          onClose={() => setShowEditGoalModal(false)}
          onSave={async updates => {
            await updateGoal(primaryGoal.id, updates)
          }}
          goal={primaryGoal}
          pieceTitle={item.scoreTitle}
        />
      )}
    </Card>
  )
}
