import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LogbookEntry } from '@/api/logbook'
import { useLogbookStore } from '@/stores/logbookStore'
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences'
import { PracticeLogsList } from './PracticeLogsList'
import ManualEntryForm from '@/components/ManualEntryForm'
import { cn } from '@/utils/cn'

interface LogbookSplitViewProps {
  entries: LogbookEntry[]
  onUpdate: () => void
  showTimeline?: boolean
  className?: string
  initialSelectedId?: string
  hidePieceInfo?: boolean
}

export function LogbookSplitView({
  entries,
  onUpdate,
  showTimeline = false,
  className = '',
  initialSelectedId,
  hidePieceInfo = false,
}: LogbookSplitViewProps) {
  const { t } = useTranslation(['logbook', 'common'])
  const { deleteEntry } = useLogbookStore()
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null)

  // Layout preferences
  const { setLastSelectedId, lastSelectedId } = useLayoutPreferences('logbook')

  // Initialize selected entry
  useEffect(() => {
    if (initialSelectedId) {
      const entry = entries.find(e => e.id === initialSelectedId)
      if (entry) {
        setSelectedEntry(entry)
        setLastSelectedId(entry.id)
      }
    } else if (lastSelectedId && !selectedEntry) {
      // Restore last selected entry from preferences
      const entry = entries.find(e => e.id === lastSelectedId)
      if (entry) {
        setSelectedEntry(entry)
      }
    }
  }, [
    initialSelectedId,
    lastSelectedId,
    entries,
    selectedEntry,
    setLastSelectedId,
  ])

  // Handle entry selection
  const handleEntrySelect = useCallback(
    (entry: LogbookEntry) => {
      setSelectedEntry(entry)
      setLastSelectedId(entry.id)
    },
    [setLastSelectedId]
  )

  // Handle edit
  const handleEdit = useCallback((entry: LogbookEntry) => {
    setEditingEntry(entry)
  }, [])

  // Handle delete
  const handleDelete = useCallback(
    async (entry: LogbookEntry) => {
      if (!confirm(t('logbook:entry.confirmDelete'))) {
        return
      }

      try {
        await deleteEntry(entry.id)
        if (selectedEntry?.id === entry.id) {
          setSelectedEntry(null)
          setLastSelectedId(undefined)
        }
        onUpdate()
      } catch (error) {
        console.error('Failed to delete entry:', error)
      }
    },
    [deleteEntry, onUpdate, selectedEntry, t, setLastSelectedId]
  )

  // If editing, show the edit form
  if (editingEntry) {
    return (
      <ManualEntryForm
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={() => {
          setEditingEntry(null)
          onUpdate()
        }}
      />
    )
  }

  // Return simplified view with all details in the list
  return (
    <div className={cn('w-full', className)}>
      <PracticeLogsList
        entries={entries}
        selectedEntryId={selectedEntry?.id}
        onEntrySelect={handleEntrySelect}
        onEntryEdit={handleEdit}
        onEntryDelete={handleDelete}
        showTimeline={showTimeline}
        hidePieceInfo={hidePieceInfo}
      />
    </div>
  )
}

export default LogbookSplitView
