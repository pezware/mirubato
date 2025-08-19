import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LogbookEntry } from '@/api/logbook'
import { useLogbookStore } from '@/stores/logbookStore'
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences'
import { ResizableSplitView, EntryDetailPanel } from '@/components/ui'
import { PracticeLogsList } from './PracticeLogsList'
import ManualEntryForm from '@/components/ManualEntryForm'
import { cn } from '@/utils/cn'

interface LogbookSplitViewProps {
  entries: LogbookEntry[]
  onUpdate: () => void
  showTimeline?: boolean
  className?: string
  initialSelectedId?: string
}

export function LogbookSplitView({
  entries,
  onUpdate,
  showTimeline = false,
  className = '',
  initialSelectedId,
}: LogbookSplitViewProps) {
  const { t } = useTranslation(['logbook', 'common'])
  const { deleteEntry } = useLogbookStore()
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null)

  // Layout preferences
  const { splitRatio, setSplitRatio, setLastSelectedId, lastSelectedId } =
    useLayoutPreferences('logbook')

  // Check if we're on mobile/tablet
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

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

  // Handle navigation between entries
  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedEntry) return

      const currentIndex = entries.findIndex(e => e.id === selectedEntry.id)
      if (currentIndex === -1) return

      let newIndex: number
      if (direction === 'prev') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : entries.length - 1
      } else {
        newIndex = currentIndex < entries.length - 1 ? currentIndex + 1 : 0
      }

      const newEntry = entries[newIndex]
      if (newEntry) {
        setSelectedEntry(newEntry)
        setLastSelectedId(newEntry.id)
      }
    },
    [selectedEntry, entries, setLastSelectedId]
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

  // Mobile layout - stack detail panel below list
  if (isMobile) {
    return (
      <div className={cn('space-y-4', className)}>
        <PracticeLogsList
          entries={entries}
          selectedEntryId={selectedEntry?.id}
          onEntrySelect={handleEntrySelect}
          onEntryEdit={handleEdit}
          showTimeline={showTimeline}
        />
        {/* Stack detail panel below list on mobile */}
        {selectedEntry && (
          <div className="border-t border-gray-200 pt-4">
            <EntryDetailPanel
              entry={selectedEntry}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onNavigate={handleNavigate}
              onClose={() => setSelectedEntry(null)}
            />
          </div>
        )}
      </div>
    )
  }

  // Desktop layout - split view
  return (
    <ResizableSplitView
      defaultRatio={splitRatio}
      onRatioChange={setSplitRatio}
      storageKey="logbook-split"
      minSizes={[500, 350]}
      maxSizes={[Infinity, 600]}
      className={className}
    >
      <PracticeLogsList
        entries={entries}
        selectedEntryId={selectedEntry?.id}
        onEntrySelect={handleEntrySelect}
        onEntryEdit={handleEdit}
        showTimeline={showTimeline}
      />
      <EntryDetailPanel
        entry={selectedEntry}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onNavigate={handleNavigate}
        onClose={() => {
          setSelectedEntry(null)
          setLastSelectedId(undefined)
        }}
      />
    </ResizableSplitView>
  )
}

export default LogbookSplitView
