import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Music, Link, Trash2 } from 'lucide-react'
import {
  IconMoodAngry,
  IconMoodNeutral,
  IconMoodSmile,
  IconMoodHappy,
} from '@tabler/icons-react'
import Button from '@/components/ui/Button'
import { LogPracticeButton } from '@/components/ui/ProtectedButtonFactory'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import {
  MusicTitle,
  MusicComposer,
  Modal,
  ModalBody,
  ModalFooter,
} from '@/components/ui'
import {
  formatDuration,
  formatDateTime,
  formatRelativeTime,
  formatDateSeparator,
  formatTimeOnly,
} from '@/utils/dateUtils'
import { toTitleCase } from '@/utils/textFormatting'
import { RepertoireStatus } from '@/api/repertoire'
import { EditPieceModal } from '../practice-reports/EditPieceModal'
import { useLogbookStore } from '@/stores/logbookStore'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { toast } from '@/utils/toastManager'
import { generateNormalizedScoreId } from '@/utils/scoreIdNormalizer'

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
  onLogPractice: () => void
  onEditNotes: () => void
  onEditSession?: (sessionId: string) => void
  onStatusChange?: (newStatus: keyof RepertoireStatus) => void
  onPieceUpdated?: (updatedPiece: { title: string; composer: string }) => void
}

export const PieceDetailView: React.FC<PieceDetailViewProps> = ({
  item,
  sessions,
  onLogPractice,
  onEditNotes,
  onEditSession,
  onStatusChange,
  onPieceUpdated,
}) => {
  const { t, i18n } = useTranslation(['repertoire', 'common'])
  const [timeFilter, setTimeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [isEditingPiece, setIsEditingPiece] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  // Note: Modal scroll lock is now handled by the Modal component
  const { updatePieceName, loadEntries } = useLogbookStore()
  const {
    cacheScoreMetadata,
    loadRepertoire,
    removeFromRepertoire,
    dissociatePieceFromRepertoire,
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

  // Get mood icon based on mood value - matching LogbookEntryList
  const getMoodIcon = (mood?: string) => {
    const iconProps = {
      size: 18,
      className: 'text-morandi-stone-600',
      stroke: 1.5,
    }

    switch (mood) {
      case 'frustrated':
        return <IconMoodAngry {...iconProps} />
      case 'neutral':
        return <IconMoodNeutral {...iconProps} />
      case 'satisfied':
        return <IconMoodSmile {...iconProps} />
      case 'excited':
        return <IconMoodHappy {...iconProps} />
      default:
        return null
    }
  }

  // Parse and format notes with status change entries
  const formatNotesWithStatusChanges = (
    notes: string | undefined
  ): React.ReactNode => {
    if (!notes) return null

    // Regular expression to match status change entries
    // Format: [STATUS_CHANGE:ISO8601_timestamp:oldStatus:newStatus]
    // The timestamp contains colons, so we need a more specific pattern
    const statusChangeRegex =
      /\[STATUS_CHANGE:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z):([^:]+):([^\]]+)\]/g

    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = statusChangeRegex.exec(notes)) !== null) {
      // Add text before the status change
      if (match.index > lastIndex) {
        const textBefore = notes.substring(lastIndex, match.index)

        // Check if this is the first status change after user notes
        // If there's text before and it doesn't end with multiple newlines, add spacing
        if (textBefore.trim() && parts.length === 0) {
          parts.push(
            <span key={`text-${lastIndex}`}>{textBefore.trimEnd()}</span>
          )
          // Add visual separator between user notes and status history
          parts.push(
            <div
              key={`separator-${match.index}`}
              className="mt-4 mb-2 border-t border-stone-200"
            />
          )
        } else {
          parts.push(<span key={`text-${lastIndex}`}>{textBefore}</span>)
        }
      }

      // Parse the status change
      const [, timestamp, oldStatus, newStatus] = match

      // Check if timestamp is valid and parse it
      let formattedDate: string
      try {
        const date = new Date(timestamp)
        if (isNaN(date.getTime())) {
          console.warn('Invalid timestamp in status change:', timestamp)
          formattedDate = new Date().toLocaleString()
        } else {
          // Format without seconds: "Jan 12, 2025 2:30 PM"
          formattedDate = formatDateTime(date, i18n.language)
        }
      } catch (error) {
        console.error('Error parsing status change date:', timestamp, error)
        formattedDate = new Date().toLocaleString()
      }

      // Get localized status labels, with fallback to the raw status if not found
      const oldStatusLabel = t(`repertoire:status.${oldStatus}`, oldStatus)
      const newStatusLabel = t(`repertoire:status.${newStatus}`, newStatus)

      // Add formatted status change entry
      parts.push(
        <div
          key={`status-${match.index}`}
          className="mt-2 text-sm text-stone-500 italic"
        >
          [{formattedDate}]{' '}
          {t('repertoire:status.statusChangeEntry', {
            oldStatus: oldStatusLabel,
            newStatus: newStatusLabel,
          })}
        </div>
      )

      lastIndex = statusChangeRegex.lastIndex
    }

    // Add any remaining text after the last match
    if (lastIndex < notes.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{notes.substring(lastIndex)}</span>
      )
    }

    // If no status changes were found, just return the notes as-is
    return parts.length > 0 ? <>{parts}</> : <span>{notes}</span>
  }

  const handleStatusChange = (newStatus: keyof RepertoireStatus) => {
    onStatusChange?.(newStatus)
    setIsEditingStatus(false)
  }

  const handleRemoveFromRepertoire = async () => {
    try {
      setIsRemoving(true)

      // With WebSocket sync, operations should be faster
      // Reduced timeout and better error handling
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
      })

      await Promise.race([
        dissociatePieceFromRepertoire(item.scoreId),
        timeoutPromise,
      ])

      setShowRemoveConfirm(false)
      // Navigate back to repertoire list since piece is no longer in repertoire
      window.history.back()
    } catch (error) {
      console.error('Failed to remove piece from repertoire:', error)
      // Show user-friendly error message
      toast.error(t('repertoire:operationFailed'))
      // Still close the modal to prevent frozen state
      setShowRemoveConfirm(false)
    } finally {
      setIsRemoving(false)
    }
  }

  const handleDeleteCompletely = async () => {
    try {
      setIsRemoving(true)

      // With WebSocket sync, operations should be faster
      // Reduced timeout and better error handling
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
      })

      await Promise.race([removeFromRepertoire(item.scoreId), timeoutPromise])

      setShowDeleteConfirm(false)
      // Navigate back to repertoire list since piece is deleted
      window.history.back()
    } catch (error) {
      console.error('Failed to delete piece completely:', error)
      // Show user-friendly error message
      toast.error(t('repertoire:operationFailed'))
      // Still close the modal to prevent frozen state
      setShowDeleteConfirm(false)
    } finally {
      setIsRemoving(false)
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalPracticeTime = sessions.reduce((sum, s) => sum + s.duration, 0)
    const avgSessionTime =
      sessions.length > 0 ? totalPracticeTime / sessions.length : 0
    const lastSession = sessions[0] // Assuming sorted by date desc

    let lastPracticed = 'Never'
    if (lastSession) {
      lastPracticed = formatRelativeTime(lastSession.timestamp, {
        capitalize: true,
        language: i18n.language,
      })
    }

    return {
      totalPracticeTime,
      sessionCount: sessions.length,
      lastPracticed,
      avgSessionTime,
    }
  }, [sessions, i18n.language])

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions]

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date()

      if (timeFilter === 'thisMonth') {
        // Filter for current month only
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        filtered = filtered.filter(s => {
          const sessionDate = new Date(s.timestamp)
          return sessionDate >= startOfMonth
        })
      } else if (timeFilter === 'thisWeek') {
        // Filter for current week (last 7 days)
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(s => {
          const sessionDate = new Date(s.timestamp)
          return sessionDate >= weekAgo
        })
      } else if (timeFilter === 'last30') {
        // Filter for last 30 days
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(s => {
          const sessionDate = new Date(s.timestamp)
          return sessionDate >= thirtyDaysAgo
        })
      } else if (timeFilter === 'last90') {
        // Filter for last 90 days
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(s => {
          const sessionDate = new Date(s.timestamp)
          return sessionDate >= ninetyDaysAgo
        })
      }
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(s => s.type === typeFilter)
    }

    return filtered
  }, [sessions, timeFilter, typeFilter])

  // Group sessions by day
  const groupedSessions = useMemo(() => {
    const groups: Record<string, PracticeSession[]> = {}

    filteredSessions.forEach(session => {
      const dateKey = formatDateSeparator(session.timestamp, i18n.language)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(session)
    })

    return Object.entries(groups).map(([date, sessions]) => ({
      date,
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
  }, [filteredSessions, i18n.language])

  const formatSessionTime = (timestamp: string | number) => {
    return formatTimeOnly(timestamp, i18n.language)
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Piece Header */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-8 py-6 sm:py-8">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <MusicTitle as="h1" className="text-stone-900 mb-2">
              {toTitleCase(item.scoreTitle)}
            </MusicTitle>
            <div className="mb-4 sm:mb-6">
              <MusicComposer className="text-stone-600">
                {toTitleCase(item.scoreComposer)}
              </MusicComposer>
              {item.catalogNumber && (
                <span className="text-stone-600"> • {item.catalogNumber}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingPiece(true)}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              {t('common:edit')}
            </Button>

            {/* Piece Management Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Show context menu or dropdown with remove options
                  if (sessions.length === 0) {
                    setShowDeleteConfirm(true)
                  } else {
                    setShowRemoveConfirm(true)
                  }
                }}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                {t('repertoire:removeFromPieces')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
              {t('repertoire:totalPractice')}
            </div>
            <div className="text-base sm:text-lg font-semibold text-stone-900">
              {formatDuration(stats.totalPracticeTime)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
              {t('repertoire:sessions')}
            </div>
            <div className="text-base sm:text-lg font-semibold text-stone-900">
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
                className="w-28 sm:w-36"
              />
            ) : (
              <button
                onClick={() => setIsEditingStatus(true)}
                className={`text-base sm:text-lg font-semibold ${statusConfig[item.status].color} hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1`}
              >
                {t(`repertoire:status.${item.status}`)}
                <Edit2 className="w-3 h-3 opacity-60" />
              </button>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
              {t('repertoire:avgSession')}
            </div>
            <div className="text-base sm:text-lg font-semibold text-stone-900">
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
              <div className="whitespace-pre-wrap">
                {formatNotesWithStatusChanges(item.personalNotes)}
              </div>
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

      {/* Period Filter Section - matching DataTableView */}
      <Card className="mb-4 sm:mb-6" padding="sm">
        <div className="flex gap-3">
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-morandi-stone-200 rounded text-sm"
          >
            <option value="all">All time</option>
            <option value="thisMonth">This month</option>
            <option value="thisWeek">This week</option>
            <option value="last30">Last 30 days</option>
            <option value="last90">Last 90 days</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-morandi-stone-200 rounded text-sm"
          >
            <option value="all">{t('repertoire:allTypes')}</option>
            <option value="practice">{t('common:music.practice')}</option>
            <option value="performance">{t('common:music.performance')}</option>
            <option value="lesson">{t('common:music.lesson')}</option>
          </select>
        </div>
      </Card>

      {/* Practice History List - matching LogbookEntryList */}
      <Card className="mb-4 sm:mb-6" padding="sm">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-morandi-stone-700">
            {t('repertoire:practiceHistory')}
          </h3>
          <LogPracticeButton onClick={onLogPractice}>
            + {t('repertoire:logPractice')}
          </LogPracticeButton>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 overflow-hidden">
          {groupedSessions.map(group => (
            <div key={group.date}>
              {/* Day separator - matching LogbookEntryList day separator */}
              <div className="px-4 py-2 bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-600 whitespace-nowrap">
                    {group.date}
                  </span>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {group.sessions.length}{' '}
                    {group.sessions.length === 1 ? 'session' : 'sessions'}
                  </span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
              </div>

              {/* Sessions - matching LogbookEntryList rows */}
              {group.sessions.map(session => (
                <div
                  key={session.id}
                  className="border-b border-morandi-stone-200 last:border-b-0"
                >
                  <div className="p-3 hover:bg-morandi-stone-50 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Time, duration, and type row */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm text-morandi-stone-500">
                            {formatSessionTime(session.timestamp)}
                          </span>
                          <span className="text-morandi-stone-700">
                            {formatDuration(session.duration)}
                          </span>
                          <span className="px-2 py-0.5 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                            {t(`common:music.${session.type}`)}
                          </span>
                          {session.instrument && (
                            <span className="px-2 py-0.5 bg-morandi-sand-100 text-morandi-stone-700 text-xs rounded-full">
                              {session.instrument}
                            </span>
                          )}
                          {session.mood && getMoodIcon(session.mood)}
                        </div>

                        {/* Notes if present */}
                        {session.notes && (
                          <p className="text-sm text-morandi-stone-600">
                            {session.notes}
                          </p>
                        )}
                      </div>

                      {/* Edit button - matching LogbookEntryList positioning */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => onEditSession?.(session.id)}
                          className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
                          aria-label={t('common:edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
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
              <p className="text-stone-600">
                {t('repertoire:startTrackingPrompt')}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Remove from Repertoire Confirmation Modal */}
      <Modal
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        title={t('repertoire:removeFromPieces')}
        size="sm"
      >
        <ModalBody>
          <p className="text-stone-600">
            {t('repertoire:removeConfirmMessage', {
              count: sessions.length,
              title: item.scoreTitle,
            })}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowRemoveConfirm(false)}
            disabled={isRemoving}
          >
            {t('common:cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleRemoveFromRepertoire}
            disabled={isRemoving}
          >
            {isRemoving
              ? t('common:removing')
              : t('repertoire:removeFromPieces')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Completely Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('repertoire:deleteCompletely')}
        size="sm"
      >
        <ModalBody>
          <p className="text-stone-600">
            {t('repertoire:deleteConfirmMessage', {
              title: item.scoreTitle,
            })}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isRemoving}
          >
            {t('common:cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteCompletely}
            disabled={isRemoving}
          >
            {isRemoving
              ? t('common:deleting')
              : t('repertoire:deleteCompletely')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Piece Modal */}
      {isEditingPiece && (
        <EditPieceModal
          isOpen={isEditingPiece}
          onClose={() => setIsEditingPiece(false)}
          piece={{ title: item.scoreTitle, composer: item.scoreComposer }}
          onSave={async (oldPiece, newPiece) => {
            try {
              // Generate new scoreId based on updated title and composer
              const newScoreId = generateNormalizedScoreId(
                newPiece.title,
                newPiece.composer || ''
              )

              // Update the score metadata cache with NEW scoreId
              cacheScoreMetadata(newScoreId, {
                id: newScoreId,
                title: newPiece.title,
                composer: newPiece.composer || '',
              })

              // Also keep the old scoreId in cache temporarily for matching
              cacheScoreMetadata(item.scoreId, {
                id: item.scoreId,
                title: newPiece.title,
                composer: newPiece.composer || '',
              })

              // Update piece names in logbook
              const updatedCount = await updatePieceName(oldPiece, newPiece)

              // No automatic sync - user can manually sync when needed

              // Reload data
              await Promise.all([loadRepertoire(), loadEntries()])

              // Notify parent component of the update
              onPieceUpdated?.({
                title: newPiece.title,
                composer: newPiece.composer || '',
              })

              toast.success(
                t('reports:pieceEdit.successMessage', { count: updatedCount })
              )
              setIsEditingPiece(false)
            } catch (_error) {
              toast.error(t('reports:pieceEdit.errorMessage'))
            }
          }}
        />
      )}
    </div>
  )
}
