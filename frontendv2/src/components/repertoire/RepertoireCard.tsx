import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { RepertoireItem, RepertoireStatus } from '@/api/repertoire'
import { Goal } from '@/api/goals'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { formatDuration, formatRelativeTime } from '@/utils/dateUtils'
import { toTitleCase } from '@/utils/textFormatting'
import { EditNotesModal } from './EditNotesModal'
import { EditGoalModal } from './EditGoalModal'
import { MoreVertical, ChevronDown } from 'lucide-react'

interface PracticeSession {
  id: string
  timestamp: number
  duration: number
  notes?: string
  type?: 'practice' | 'performance' | 'lesson' | 'rehearsal' | 'technique'
  mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited' | null
}

interface EnrichedRepertoireItem extends RepertoireItem {
  scoreTitle: string
  scoreComposer: string
  activeGoals: Goal[]
  recentPractice: PracticeSession[]
  isLogbookPiece?: boolean
  relatedSessions?: number
}

interface RepertoireCardProps {
  item: EnrichedRepertoireItem
  onEditSession?: (sessionId: string) => void
}

export function RepertoireCard({ item, onEditSession }: RepertoireCardProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [showEditNotesModal, setShowEditNotesModal] = useState(false)
  const [showEditGoalModal, setShowEditGoalModal] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    updateRepertoireStatus,
    removeFromRepertoire,
    updateRepertoire,
    updateGoal,
  } = useRepertoireStore()

  // Status colors and labels
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleStatusChange = async (newStatus: keyof RepertoireStatus) => {
    await updateRepertoireStatus(item.scoreId, newStatus)
    setIsEditingStatus(false)
  }

  const handleRemove = async () => {
    if (confirm(t('repertoire:confirmRemove'))) {
      await removeFromRepertoire(item.scoreId)
    }
    setShowMenu(false)
  }

  const handleStartPractice = () => {
    if (item.isLogbookPiece) {
      navigate('/toolbox', {
        state: {
          activeTool: 'counter',
          scoreId: item.scoreId,
          scoreTitle: item.scoreTitle,
          scoreComposer: item.scoreComposer,
        },
      })
    } else {
      navigate(`/scorebook/${item.scoreId}`)
    }
    setShowMenu(false)
  }

  const handleViewScore = () => {
    if (!item.isLogbookPiece) {
      navigate(`/scorebook/${item.scoreId}`)
    }
    setShowMenu(false)
  }

  const primaryGoal = item.activeGoals[0]
  const goalProgress =
    primaryGoal &&
    primaryGoal.currentValue !== undefined &&
    primaryGoal.targetValue !== undefined
      ? Math.min(
          100,
          Math.round((primaryGoal.currentValue / primaryGoal.targetValue) * 100)
        )
      : 0

  // Format practice summary
  const practiceSummary = {
    totalTime: formatDuration(item.totalPracticeTime || 0),
    sessionCount: item.practiceCount || 0,
    lastPracticed: item.lastPracticed
      ? formatRelativeTime(item.lastPracticed)
      : null,
  }

  return (
    <>
      <Card
        variant="elevated"
        className="hover:shadow-lg transition-shadow duration-200"
      >
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            {/* Title and Composer - Clickable */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 text-left group cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-stone-900 group-hover:text-stone-700 transition-colors duration-200">
                {toTitleCase(item.scoreTitle)} -{' '}
                {toTitleCase(item.scoreComposer)}
              </h3>
            </button>

            {/* Status and Menu */}
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              {isEditingStatus ? (
                <Select
                  value={item.status}
                  onChange={value =>
                    handleStatusChange(value as keyof RepertoireStatus)
                  }
                  options={Object.entries(statusConfig).map(
                    ([key, config]) => ({
                      value: key,
                      label: config.label,
                    })
                  )}
                  className="w-32 sm:w-36"
                />
              ) : (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className={`px-3 py-1 ${status.bg} ${status.color} rounded-full text-sm font-medium hover:opacity-80 transition-opacity`}
                >
                  {status.label}
                </button>
              )}

              {/* Menu Button */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 hover:bg-stone-100 rounded-md transition-colors duration-150"
                >
                  <MoreVertical className="w-5 h-5 text-stone-600" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-10 w-48 bg-white border border-stone-200 rounded-lg shadow-lg py-1 z-10 animate-in fade-in slide-in-from-top-1 duration-200">
                    <button
                      onClick={handleStartPractice}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 transition-colors"
                    >
                      {t('repertoire:startPractice')}
                    </button>
                    {!item.isLogbookPiece && (
                      <button
                        onClick={handleViewScore}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 transition-colors"
                      >
                        {t('repertoire:viewScore')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowEditNotesModal(true)
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 transition-colors"
                    >
                      {t('repertoire:editNotes')}
                    </button>
                    <hr className="my-1 border-stone-200" />
                    <button
                      onClick={handleRemove}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      {t('common:remove')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Practice Summary */}
          <div className="flex items-center text-sm text-stone-600">
            <span>{practiceSummary.totalTime}</span>
            <span className="mx-2">•</span>
            <span>
              {practiceSummary.sessionCount} {t('repertoire:sessions')}
            </span>
            {practiceSummary.lastPracticed && (
              <>
                <span className="mx-2">•</span>
                <span>
                  {t('repertoire:lastPracticed', {
                    time: practiceSummary.lastPracticed,
                  })}
                </span>
              </>
            )}
            {/* Expand/Collapse Indicator */}
            <span
              className={`ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <ChevronDown className="w-4 h-4 text-stone-400" />
            </span>
          </div>

          {/* Active Goal (if any) */}
          {primaryGoal && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  {primaryGoal.title}
                </span>
                <span className="text-sm text-blue-600">
                  {Math.round(goalProgress)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Expandable Content */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-none' : 'max-h-0'
            }`}
          >
            {/* Personal Notes (if any) */}
            {item.personalNotes && (
              <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                <p className="text-sm text-stone-700 whitespace-pre-wrap">
                  {item.personalNotes}
                </p>
              </div>
            )}

            {/* Practice Sessions */}
            {item.recentPractice.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-200">
                <h4 className="text-sm font-medium text-stone-700 mb-2">
                  {t('repertoire:recentPracticeSessions')}
                </h4>
                <div className="space-y-3">
                  {item.recentPractice.map(session => (
                    <div
                      key={session.id}
                      className="p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      {/* Session Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-stone-900">
                            {new Date(session.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-sm text-stone-600">
                            {new Date(session.timestamp).toLocaleTimeString(
                              [],
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-stone-700">
                            {formatDuration(session.duration)}
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              if (onEditSession) {
                                onEditSession(session.id)
                              }
                            }}
                            className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
                          >
                            {t('common:edit')}
                          </button>
                        </div>
                      </div>

                      {/* Session Details */}
                      <div className="flex items-center gap-3 text-sm">
                        {session.type && (
                          <span className="px-2 py-0.5 bg-stone-200 text-stone-700 rounded-full text-xs">
                            {t(`common:music.${session.type}`)}
                          </span>
                        )}
                        {session.mood && (
                          <span className="text-stone-600">
                            {session.mood === 'frustrated' && '😣'}
                            {session.mood === 'neutral' && '😐'}
                            {session.mood === 'satisfied' && '😊'}
                            {session.mood === 'excited' && '🤩'}
                          </span>
                        )}
                      </div>

                      {/* Session Notes */}
                      {session.notes && (
                        <p className="mt-2 text-sm text-stone-600 whitespace-pre-wrap">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Modals */}
      {showEditNotesModal && (
        <EditNotesModal
          isOpen={showEditNotesModal}
          onClose={() => setShowEditNotesModal(false)}
          pieceTitle={item.scoreTitle}
          currentNotes={item.personalNotes || ''}
          currentLinks={item.referenceLinks || []}
          onSave={async (notes, links) => {
            await updateRepertoire(item.scoreId, {
              personalNotes: notes,
              referenceLinks: links,
            })
            setShowEditNotesModal(false)
          }}
        />
      )}

      {showEditGoalModal && primaryGoal && (
        <EditGoalModal
          isOpen={showEditGoalModal}
          onClose={() => setShowEditGoalModal(false)}
          goal={primaryGoal}
          pieceTitle={item.scoreTitle}
          onSave={async updates => {
            await updateGoal(primaryGoal.id, updates)
            setShowEditGoalModal(false)
          }}
        />
      )}
    </>
  )
}
