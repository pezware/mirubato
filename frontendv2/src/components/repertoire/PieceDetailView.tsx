import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import {
  ChevronLeft,
  Edit2,
  Clock,
  Target,
  Music,
  Smile,
  Link,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { formatDuration } from '@/utils/dateUtils'
import { RepertoireStatus } from '@/api/repertoire'
import { EditPieceModal } from '../practice-reports/EditPieceModal'
import { useLogbookStore } from '@/stores/logbookStore'
import { toast } from '@/utils/toast'

interface PracticeSession {
  id: string
  timestamp: string | number
  duration: number
  type: string
  notes?: string
  mood?: string
  tempo?: number
  instrument?: string
}

interface EnrichedRepertoireItem {
  scoreId: string
  scoreTitle: string
  scoreComposer: string
  status: keyof RepertoireStatus
  personalNotes?: string
  referenceLinks?: string[]
  catalogNumber?: string
}

interface PieceDetailViewProps {
  item: EnrichedRepertoireItem
  sessions: PracticeSession[]
  onBack: () => void
  onLogPractice: () => void
  onEditNotes: () => void
  onEditSession?: (sessionId: string) => void
  onStatusChange?: (newStatus: keyof RepertoireStatus) => void
}

export const PieceDetailView: React.FC<PieceDetailViewProps> = ({
  item,
  sessions,
  onBack,
  onLogPractice,
  onEditNotes,
  onEditSession,
  onStatusChange,
}) => {
  const { t } = useTranslation(['repertoire', 'common'])
  const [timeFilter, setTimeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [isEditingPiece, setIsEditingPiece] = useState(false)
  const { updatePieceName } = useLogbookStore()

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

  const handleStatusChange = (newStatus: keyof RepertoireStatus) => {
    onStatusChange?.(newStatus)
    setIsEditingStatus(false)
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalPracticeTime = sessions.reduce((sum, s) => sum + s.duration, 0)
    const avgSessionTime =
      sessions.length > 0 ? totalPracticeTime / sessions.length : 0
    const lastSession = sessions[0] // Assuming sorted by date desc

    let lastPracticed = 'Never'
    if (lastSession) {
      const date = new Date(lastSession.timestamp)
      if (isToday(date)) {
        lastPracticed = 'Today'
      } else if (isYesterday(date)) {
        lastPracticed = 'Yesterday'
      } else {
        lastPracticed = formatDistanceToNow(date, { addSuffix: true })
      }
    }

    return {
      totalPracticeTime,
      sessionCount: sessions.length,
      lastPracticed,
      avgSessionTime,
    }
  }, [sessions])

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions]

    // Time filter
    if (timeFilter !== 'all') {
      const now = Date.now()
      const filterMap: Record<string, number> = {
        '7days': 7 * 24 * 60 * 60 * 1000,
        '30days': 30 * 24 * 60 * 60 * 1000,
        '3months': 90 * 24 * 60 * 60 * 1000,
      }
      const cutoff = now - filterMap[timeFilter]
      filtered = filtered.filter(s => {
        const timestamp =
          typeof s.timestamp === 'string'
            ? new Date(s.timestamp).getTime()
            : s.timestamp
        return timestamp > cutoff
      })
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(s => s.type === typeFilter)
    }

    return filtered
  }, [sessions, timeFilter, typeFilter])

  // Group sessions by month
  const groupedSessions = useMemo(() => {
    const groups: Record<string, PracticeSession[]> = {}

    filteredSessions.forEach(session => {
      const monthKey = format(new Date(session.timestamp), 'MMMM yyyy')
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(session)
    })

    return Object.entries(groups).map(([month, sessions]) => ({
      month,
      sessions: sessions.sort((a, b) => {
        const aTime =
          typeof a.timestamp === 'string'
            ? new Date(a.timestamp).getTime()
            : a.timestamp
        const bTime =
          typeof b.timestamp === 'string'
            ? new Date(b.timestamp).getTime()
            : b.timestamp
        return bTime - aTime
      }),
    }))
  }, [filteredSessions])

  const formatSessionDate = (timestamp: string | number) => {
    const date = new Date(timestamp)
    if (isToday(date)) return t('common:time.today')
    if (isYesterday(date)) return t('common:time.yesterday')
    return format(date, 'MMMM d')
  }

  const formatSessionTime = (timestamp: string | number) => {
    return format(new Date(timestamp), 'h:mm a')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'practice':
        return <Target className="w-4 h-4" />
      case 'lesson':
        return <Music className="w-4 h-4" />
      case 'performance':
        return <Smile className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'excited':
        return 'text-green-600'
      case 'satisfied':
        return 'text-blue-600'
      case 'neutral':
        return 'text-gray-600'
      case 'frustrated':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Bar with Breadcrumb */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-4">
        <nav className="flex items-center gap-2 text-sm">
          <button
            onClick={onBack}
            className="text-stone-600 hover:text-stone-900 flex items-center gap-1 whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">
              {t('repertoire:myRepertoire')}
            </span>
            <span className="sm:hidden">{t('common:back')}</span>
          </button>
          <span className="text-stone-400">›</span>
          <span className="text-stone-900 font-medium truncate">
            {item.scoreComposer} - {item.scoreTitle}
          </span>
        </nav>
      </div>

      {/* Piece Header */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-8 py-6 sm:py-8">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 mb-2">
              {item.scoreTitle}
            </h1>
            <div className="text-base sm:text-lg text-stone-600 mb-4 sm:mb-6">
              {item.scoreComposer}{' '}
              {item.catalogNumber && `• ${item.catalogNumber}`}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingPiece(true)}
            className="flex items-center gap-2 ml-4"
          >
            <Edit2 className="w-4 h-4" />
            {t('common:edit')}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
              {t('repertoire:totalPractice')}
            </div>
            <div className="text-lg sm:text-2xl font-semibold text-stone-900">
              {formatDuration(stats.totalPracticeTime)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
              {t('repertoire:sessions')}
            </div>
            <div className="text-lg sm:text-2xl font-semibold text-stone-900">
              {stats.sessionCount}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
              {t('repertoire:status.current')}
            </div>
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
                className="w-44"
              />
            ) : (
              <button
                onClick={() => setIsEditingStatus(true)}
                className={`text-lg sm:text-2xl font-semibold ${statusConfig[item.status].color} hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1`}
              >
                {t(`repertoire:status.${item.status}`)}
                <Edit2 className="w-4 h-4 mt-1 opacity-60" />
              </button>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
              {t('repertoire:avgSession')}
            </div>
            <div className="text-lg sm:text-2xl font-semibold text-stone-900">
              {formatDuration(stats.avgSessionTime)}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mt-6 pt-6 border-t border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm uppercase tracking-wider text-stone-500">
              {t('repertoire:personalNotes')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditNotes}
              className="flex items-center gap-2 -mt-1"
            >
              <Edit2 className="w-3 h-3" />
              {t('common:edit')}
            </Button>
          </div>
          <div className="text-stone-700">
            {item.personalNotes ? (
              <p className="whitespace-pre-wrap">{item.personalNotes}</p>
            ) : (
              <p className="text-stone-500 italic text-sm">
                {t('repertoire:addNotesPrompt')}
              </p>
            )}
          </div>

          {/* Reference Links */}
          {item.referenceLinks && item.referenceLinks.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-stone-600 mb-2">
                {t('repertoire:referenceLinks')}
              </h4>
              <div className="space-y-2">
                {item.referenceLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <Link className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{link}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-stone-100 px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-3">
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm"
          >
            <option value="all">{t('common:time.allTime')}</option>
            <option value="7days">{t('common:time.lastWeek')}</option>
            <option value="30days">{t('common:time.lastMonth')}</option>
            <option value="3months">{t('repertoire:last3Months')}</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm"
          >
            <option value="all">{t('repertoire:allTypes')}</option>
            <option value="practice">{t('common:music.practice')}</option>
            <option value="performance">{t('common:music.performance')}</option>
            <option value="lesson">{t('common:music.lesson')}</option>
          </select>
        </div>
        <Button variant="primary" onClick={onLogPractice}>
          + {t('repertoire:logPractice')}
        </Button>
      </div>

      {/* Timeline View */}
      <div className="px-4 sm:px-8 py-6 sm:py-8">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-stone-200" />

          {groupedSessions.map((group, groupIndex) => (
            <div key={group.month}>
              {/* Month separator */}
              {groupIndex > 0 && (
                <div className="flex items-center gap-4 my-8">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-sm font-semibold text-stone-600">
                    {group.month}
                  </span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>
              )}

              {/* Sessions */}
              {group.sessions.map((session, index) => (
                <div
                  key={session.id}
                  className="relative mb-6 ml-8"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-9 top-2 w-3 h-3 bg-white border-2 border-green-500 rounded-full" />

                  {/* Session card */}
                  <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-stone-900">
                          {formatSessionDate(session.timestamp)}
                        </div>
                        <div className="text-sm text-stone-600">
                          {formatSessionTime(session.timestamp)}
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        {formatDuration(session.duration)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-4 text-sm text-stone-600 mb-3">
                      <div className="flex items-center gap-1">
                        {getTypeIcon(session.type)}
                        <span>{t(`common:music.${session.type}`)}</span>
                      </div>
                      {session.tempo && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.tempo} BPM</span>
                        </div>
                      )}
                      {session.mood && (
                        <div
                          className={`flex items-center gap-1 ${getMoodColor(session.mood)}`}
                        >
                          <Smile className="w-4 h-4" />
                          <span>{t(`logbook:mood.${session.mood}`)}</span>
                        </div>
                      )}
                    </div>

                    {session.notes && (
                      <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-700">
                        {session.notes}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditSession?.(session.id)}
                      >
                        {t('common:edit')}
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ))}

          {/* Empty state */}
          {filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-900 mb-2">
                {t('repertoire:noPracticeSessions')}
              </h3>
              <p className="text-stone-600 mb-6">
                {t('repertoire:startTrackingPrompt')}
              </p>
              <Button variant="primary" onClick={onLogPractice}>
                {t('repertoire:logFirstSession')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Piece Modal */}
      {isEditingPiece && (
        <EditPieceModal
          isOpen={isEditingPiece}
          onClose={() => setIsEditingPiece(false)}
          piece={{ title: item.scoreTitle, composer: item.scoreComposer }}
          onSave={async (oldPiece, newPiece) => {
            try {
              const updatedCount = await updatePieceName(oldPiece, newPiece)
              toast.success(
                t('reports:pieceEdit.successMessage', { count: updatedCount })
              )
              setIsEditingPiece(false)
              // Update the local item data
              item.scoreTitle = newPiece.title
              item.scoreComposer = newPiece.composer || ''
            } catch (_error) {
              toast.error(t('reports:pieceEdit.errorMessage'))
            }
          }}
        />
      )}
    </div>
  )
}
