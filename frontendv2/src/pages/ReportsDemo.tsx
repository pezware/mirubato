import { useEffect } from 'react'
import EnhancedPracticeReports from '../components/EnhancedPracticeReports'
import { useLogbookStore } from '../stores/logbookStore'

// Demo page for testing Enhanced Reporting UI in isolation
export default function ReportsDemo() {
  const { loadEntries, entries } = useLogbookStore()

  useEffect(() => {
    // Load any existing practice data
    loadEntries()
  }, [loadEntries])

  // Generate sample data if none exists
  useEffect(() => {
    if (entries.length === 0) {
      console.info(
        'No practice data found. Use the Logbook page to create some practice entries for testing.'
      )
    }
  }, [entries])

  return (
    <div className="min-h-screen bg-morandi-sand-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h1 className="text-xl font-semibold text-blue-900 mb-2">
            Enhanced Reporting UI - Demo Mode
          </h1>
          <p className="text-blue-700">
            This is a demo page for testing the Enhanced Reporting UI in
            isolation.
          </p>
          <p className="text-blue-700 mt-2">
            Current entries: {entries.length} | Access this page at{' '}
            <code className="bg-blue-100 px-1 rounded">/reports-demo</code>
          </p>
        </div>

        <EnhancedPracticeReports />
      </div>
    </div>
  )
}
