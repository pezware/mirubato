import { useEffect, useState } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import EnhancedReports from '../components/practice-reports/EnhancedReports'
import AppLayout from '../components/layout/AppLayout'
import ManualEntryForm from '../components/ManualEntryForm'
import TimerEntry from '../components/TimerEntry'

export default function LogbookPage() {
  const { error, loadEntries, clearError } = useLogbookStore()
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showTimer, setShowTimer] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  return (
    <AppLayout
      onNewEntry={() => setShowManualEntry(true)}
      onTimerClick={() => setShowTimer(true)}
    >
      <div className="p-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="text-red-700 flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </p>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Reports Section */}
        <EnhancedReports />

        {/* Manual Entry Modal */}
        {showManualEntry && (
          <ManualEntryForm
            onClose={() => setShowManualEntry(false)}
            onSave={() => setShowManualEntry(false)}
          />
        )}

        {/* Timer Modal */}
        {showTimer && (
          <TimerEntry
            isOpen={showTimer}
            onClose={() => setShowTimer(false)}
            onComplete={() => {
              setShowTimer(false)
              // Open manual entry form
              setShowManualEntry(true)
            }}
          />
        )}
      </div>
    </AppLayout>
  )
}
