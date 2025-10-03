import React, { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Music, Link, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { LogPracticeButton } from '@/components/ui/ProtectedButtonFactory'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import {
  MusicTitleLarge,
  MusicComposerLarge,
  Modal,
  ModalBody,
  ModalFooter,
  DropdownMenu,
} from '@/components/ui'
import type { DropdownMenuItem } from '@/components/ui'
import { LogbookSplitView } from '@/components/logbook/LogbookSplitView'
import type { LogbookEntry } from '@/api/logbook'
import {
  formatDuration,
  formatDateTime,
  formatRelativeTime,
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
  onStatusChange?: (newStatus: keyof RepertoireStatus) => void
  onPieceUpdated?: (updatedPiece: { title: string; composer: string }) => void
}

export const PieceDetailView: React.FC<PieceDetailViewProps> = ({
  item,
  sessions,
  onLogPractice,
  onEditNotes,
  onStatusChange,
  onPieceUpdated,
}) => {
  const { t, i18n } = useTranslation(['repertoire', 'common', 'logbook', 'reports'])
  const [timeFilter, setTimeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [isEditingPiece, setIsEditingPiece] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [selectedSessionId] = useState<string | undefined>(undefined)
  const [showMenu, setShowMenu] = useState(false)

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

  // Convert sessions to LogbookEntry format
  const sessionsAsEntries = useMemo(() => {
    return filteredSessions.map(
      session =>
        ({
          id: session.id,
          timestamp: session.timestamp,
          duration: session.duration,
          type: session.type || 'practice',
          mood: session.mood,
          instrument: session.instrument,
          notes: session.notes,
          pieces: [{ title: item.scoreTitle, composer: item.scoreComposer }],
          techniques: [],
          tags: [],
          goalIds: [],
          createdAt:
            typeof session.timestamp === 'string'
              ? session.timestamp
              : new Date(session.timestamp).toISOString(),
          updatedAt:
            typeof session.timestamp === 'string'
              ? session.timestamp
              : new Date(session.timestamp).toISOString(),
        }) as LogbookEntry
    )
  }, [filteredSessions, item])

  // Handle entry updates from LogbookSplitView
  const handleEntryUpdate = useCallback(() => {
    // Refresh if needed
  }, [])

  // Build dropdown menu items
  const menuItems: DropdownMenuItem[] = [
    {
      label: t('common:edit'),
      onClick: () => setIsEditingPiece(true),
      icon: <Edit2 className="w-3.5 h-3.5" />,
    },
    {
      label: t('repertoire:removeFromPieces'),
      onClick: () => {
        if (sessions.length === 0) {
          setShowDeleteConfirm(true)
        } else {
          setShowRemoveConfirm(true)
        }
      },
      variant: 'danger',
      icon: <Trash2 className="w-3.5 h-3.5" />,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Combined Header, Stats, and Notes Card */}
      <Card padding="md">
        {/* Top Summary Stats (aligned with Overview page) */}
        {(() => {
          // Compute today's total for this piece
          const todayTotalMinutes = sessions.reduce((sum, s) => {
            const d = new Date(s.timestamp)
            const start = new Date()
            start.setHours(0, 0, 0, 0)
            const end = new Date(start)
            end.setDate(end.getDate() + 1)
            return d >= start && d < end ? sum + s.duration : sum
          }, 0)

          const renderTotalDuration = () => {
            const totalMinutes = stats.totalPracticeTime
            const totalHours = totalMinutes / 60
            if (totalHours >= 100) {
              const roundedHours = Math.ceil(totalHours)
              return (
                <>
                  <span className="block sm:hidden">
                    {t('reports:stats.hoursOnly', { hours: roundedHours })}
                  </span>
                  <span className="hidden sm:block">
                    {formatDuration(totalMinutes)}
                  </span>
                </>
              )
            }
            return formatDuration(totalMinutes)
          }

          return (
            <div className="space-y-2 mb-4" data-testid="piece-summary-stats">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-morandi-stone-50 rounded-lg p-2 sm:p-3 flex flex-col justify-center items-center">
                  <p className="text-lg font-bold text-morandi-stone-900 text-center">
                    {formatDuration(todayTotalMinutes)}
                  </p>
                  <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
                    <span className="block sm:hidden">{t('reports:stats.today')}</span>
                    <span className="hidden sm:block">{t('reports:stats.todaysPractice')}</span>
                  </p>
                </div>

                <div className="bg-morandi-stone-100 rounded-lg p-2 sm:p-3 flex flex-col justify-center items-center">
                  <p className="text-lg font-bold text-morandi-stone-900 text-center">
                    {stats.sessionCount}
                  </p>
                  <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
                    <span className="block sm:hidden">{t('reports:table.sessions')}</span>
                    <span className="hidden sm:block">{t('reports:table.sessions')}</span>
                  </p>
                </div>

                <div className="bg-morandi-rose-50 rounded-lg p-2 sm:p-3 flex flex-col justify-center items-center">
                  <p className="text-lg font-bold text-morandi-stone-900 text-center">
                    {renderTotalDuration()}
                  </p>
                  <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
                    <span className="block sm:hidden">{t('reports:stats.total')}</span>
                    <span className="hidden sm:block">{t('reports:totalPractice')}</span>
                  </p>
                </div>
              </div>
            </div>
          )
        })()}
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <MusicTitleLarge className="text-stone-900">
              {toTitleCase(item.scoreTitle)}
            </MusicTitleLarge>
            <div>
              <MusicComposerLarge className="text-stone-600">
                {toTitleCase(item.scoreComposer)}
              </MusicComposerLarge>
              {item.catalogNumber && (
                <span className="text-stone-600"> • {item.catalogNumber}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <DropdownMenu
              items={menuItems}
              isOpen={showMenu}
              onToggle={() => setShowMenu(!showMenu)}
              onClose={() => setShowMenu(false)}
              ariaLabel={t('common:moreOptions')}
            />
          </div>
        </div>

        

        {/* Divider */}
        <div className="border-t border-stone-200 my-4"></div>

        {/* Current Status Only */}
        <div className="mb-4">
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
        </div>

        {/* Divider */}
        <div className="border-t border-stone-200 my-4"></div>

        {/* Notes Section */}
        <div>
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
      </Card>

      {/* Practice History Section with Filters */}
      <div className="space-y-4">
        <Card padding="sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="hidden sm:block text-base sm:text-lg font-semibold text-morandi-stone-700">
              {t('repertoire:practiceHistory')}
            </h3>
            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <div className="flex gap-2">
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
                  <option value="performance">
                    {t('common:music.performance')}
                  </option>
                  <option value="lesson">{t('common:music.lesson')}</option>
                </select>
              </div>
              <LogPracticeButton onClick={onLogPractice}>
                + {t('repertoire:logPractice')}
              </LogPracticeButton>
            </div>
          </div>
        </Card>

        {/* Practice History List using LogbookSplitView */}
        {sessionsAsEntries.length > 0 ? (
          <LogbookSplitView
            entries={sessionsAsEntries}
            onUpdate={handleEntryUpdate}
            showTimeline={false}
            initialSelectedId={selectedSessionId}
            hidePieceInfo={true}
          />
        ) : (
          <Card padding="lg">
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-900 mb-2">
                {t('repertoire:noPracticeSessions')}
              </h3>
              <p className="text-stone-600">
                {t('repertoire:startTrackingPrompt')}
              </p>
            </div>
          </Card>
        )}
      </div>

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
