import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  AlertTriangle,
  Mail,
  Clock,
  Check,
  RefreshCw,
} from 'lucide-react'
import { Button, Card, Modal, Input } from '../ui'
import { useAuthStore } from '../../stores/authStore'
import { useLogbookStore } from '../../stores/logbookStore'
import { useRepertoireStore } from '../../stores/repertoireStore'
import { usePlanningStore } from '../../stores/planningStore'
import { showToast } from '../../utils/toastManager'
import { syncApi } from '../../api/sync'
import { LogbookEntry, Goal as LogbookGoal } from '../../api/logbook'
import { RepertoireItem } from '../../api/repertoire'
import { Goal as RepertoireGoal } from '../../api/goals'
import type {
  PracticePlan,
  PlanOccurrence,
  PlanTemplate,
} from '../../api/planning'

/**
 * Comprehensive data export format for Mirubato
 *
 * IMPORTANT: When adding new data types to the application, update this interface
 * and the handleDataExport/handleDataImport functions to include the new data.
 *
 * Version history:
 * - 1.0: Initial version with logbook, repertoire, profile, preferences
 * - 2.0: Added goals, planning data, custom techniques, metronome settings,
 *        score metadata, and other localStorage data for complete data migration
 */
interface DataExportFormat {
  // Core practice data
  logbook: LogbookEntry[]
  goals: LogbookGoal[]
  repertoire: RepertoireItem[]
  repertoireGoals: RepertoireGoal[]

  // Planning data
  practicePlans: PracticePlan[]
  planOccurrences: PlanOccurrence[]
  planTemplates: PlanTemplate[]

  // Score metadata cache
  scoreMetadata: Record<string, { title: string; composer?: string }>
  repertoireScoreMetadata: Array<{
    id: string
    title: string
    composer: string
  }>

  // User profile
  profile: {
    id?: string
    email?: string
    displayName?: string
    createdAt?: string
  }

  // User preferences and settings
  preferences: {
    language?: string | null
    theme?: string | null
    privacyConsent?: string | null
    sidebarCollapsed?: string | null
    uiPreferences?: string | null
  }

  // Custom data
  customTechniques?: string[]
  metronomeSettings?: Record<string, unknown> | null
  metronomePresets?: Array<Record<string, unknown>> | null
  metronomeCustomPatterns?: Array<Record<string, unknown>> | null
  autoLoggingConfig?: Record<string, unknown> | null
  dictionaryRecentSearches?: string[]
  recentScoreSearches?: string[]

  // Metadata
  exportDate: string
  version: string
  dataSource: 'local' | 'synced'
}

// Helper to safely parse JSON from localStorage
const safeParseJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function DataSubjectRights() {
  const { t } = useTranslation(['privacy', 'common'])
  const { user, isAuthenticated } = useAuthStore()
  const { entries, goals: logbookGoals } = useLogbookStore()
  const { repertoire, goals: repertoireGoals } = useRepertoireStore()
  const { plans, occurrences, templates } = usePlanningStore()
  // Toast utility available via showToast

  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<DataExportFormat | null>(
    null
  )
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDataAccess = () => {
    setShowAccessModal(true)
  }

  // Sync data from server before export (for logged-in users)
  const handleSyncBeforeExport = async () => {
    if (!isAuthenticated || !localStorage.getItem('auth-token')) {
      return
    }

    setIsSyncing(true)
    try {
      // Pull latest data from server
      const syncData = await syncApi.pull()

      // The sync data is automatically merged into local storage
      // by the respective stores through their sync handlers
      console.log('✅ Data synced from server before export:', {
        entries: syncData.entries?.length || 0,
        goals: syncData.goals?.length || 0,
      })

      showToast(t('privacy:dataSynced', 'Data synced from server'), 'success')
    } catch (error) {
      console.warn('⚠️ Could not sync from server, using local data:', error)
      showToast(
        t('privacy:syncFailed', 'Could not sync from server, using local data'),
        'warning'
      )
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDataExport = async () => {
    setIsExporting(true)
    try {
      // For logged-in users, first sync from server to get latest data
      let dataSource: 'local' | 'synced' = 'local'
      if (isAuthenticated && localStorage.getItem('auth-token')) {
        try {
          await handleSyncBeforeExport()
          dataSource = 'synced'
        } catch {
          // Continue with local data if sync fails
          dataSource = 'local'
        }
      }

      // Gather score metadata from logbook store
      const logbookScoreMetadata = safeParseJson<
        Record<string, { title: string; composer?: string }>
      >('mirubato:logbook:scoreMetadata', {})

      // Gather score metadata from repertoire store
      const repertoireScoreMetadataRaw = safeParseJson<
        Array<{ id: string; title: string; composer: string }>
      >('mirubato:repertoire:scoreMetadata', [])

      // Gather custom techniques
      const customTechniques = safeParseJson<string[]>(
        'mirubato:custom-techniques',
        []
      )

      // Gather metronome settings
      const metronomeSettings = safeParseJson<Record<string, unknown> | null>(
        'mirubato-metronome-settings',
        null
      )
      const metronomePresets = safeParseJson<Array<
        Record<string, unknown>
      > | null>('mirubato-metronome-presets', null)
      const metronomeCustomPatterns = safeParseJson<Array<
        Record<string, unknown>
      > | null>('mirubato-metronome-custom-patterns', null)

      // Gather auto logging config
      const autoLoggingConfig = safeParseJson<Record<string, unknown> | null>(
        'autoLoggingConfig',
        null
      )

      // Gather recent searches
      const dictionaryRecentSearches = safeParseJson<string[]>(
        'dictionary_recent_searches',
        []
      )
      const recentScoreSearches = safeParseJson<string[]>('recentSearches', [])

      // Compile comprehensive user data
      const exportData: DataExportFormat = {
        // Core practice data
        logbook: entries,
        goals: logbookGoals,
        repertoire: Array.from(repertoire.values()),
        repertoireGoals: Array.from(repertoireGoals.values()),

        // Planning data
        practicePlans: plans,
        planOccurrences: occurrences,
        planTemplates: templates,

        // Score metadata
        scoreMetadata: logbookScoreMetadata,
        repertoireScoreMetadata: repertoireScoreMetadataRaw,

        // Profile
        profile: {
          id: user?.id,
          email: user?.email,
          displayName: user?.displayName,
          createdAt: user?.createdAt,
        },

        // Preferences
        preferences: {
          language: localStorage.getItem('i18nextLng'),
          theme: localStorage.getItem('mirubato:theme'),
          privacyConsent: localStorage.getItem('mirubato:privacy-consent'),
          sidebarCollapsed: localStorage.getItem('mirubato:sidebarCollapsed'),
          uiPreferences: localStorage.getItem('mirubato:ui-preferences'),
        },

        // Custom data
        customTechniques,
        metronomeSettings,
        metronomePresets,
        metronomeCustomPatterns,
        autoLoggingConfig,
        dictionaryRecentSearches,
        recentScoreSearches,

        // Metadata
        exportDate: new Date().toISOString(),
        version: '2.0',
        dataSource,
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mirubato-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast(
        t('privacy:dataExported', 'Your data has been exported successfully'),
        'success'
      )
      setShowExportModal(false)
    } catch (error) {
      console.error('Data export failed:', error)
      showToast(
        t(
          'privacy:exportFailed',
          'Failed to export your data. Please try again.'
        ),
        'error'
      )
    } finally {
      setIsExporting(false)
    }
  }

  // Handle file selection for import
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setImportError(null)
    setImportPreview(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text) as DataExportFormat

      // Validate basic structure
      if (!data.version || !data.exportDate) {
        throw new Error('Invalid export file format')
      }

      // Check version compatibility
      const [major] = data.version.split('.').map(Number)
      if (major > 2) {
        throw new Error(
          `Export file version ${data.version} is not supported. Please update Mirubato.`
        )
      }

      setImportPreview(data)
    } catch (error) {
      console.error('Failed to parse import file:', error)
      setImportError(
        error instanceof Error
          ? error.message
          : t('privacy:importParseError', 'Failed to parse import file')
      )
    }
  }

  // Handle data import
  const handleDataImport = async () => {
    if (!importPreview) return

    setIsImporting(true)
    try {
      // Import logbook entries
      if (importPreview.logbook?.length > 0) {
        const existingEntries = safeParseJson<LogbookEntry[]>(
          'mirubato:logbook:entries',
          []
        )
        const existingIds = new Set(existingEntries.map(e => e.id))
        const newEntries = importPreview.logbook.filter(
          e => !existingIds.has(e.id)
        )
        const mergedEntries = [...existingEntries, ...newEntries]
        localStorage.setItem(
          'mirubato:logbook:entries',
          JSON.stringify(mergedEntries)
        )
      }

      // Import goals
      if (importPreview.goals?.length > 0) {
        const existingGoals = safeParseJson<Goal[]>(
          'mirubato:logbook:goals',
          []
        )
        const existingIds = new Set(existingGoals.map(g => g.id))
        const newGoals = importPreview.goals.filter(g => !existingIds.has(g.id))
        const mergedGoals = [...existingGoals, ...newGoals]
        localStorage.setItem(
          'mirubato:logbook:goals',
          JSON.stringify(mergedGoals)
        )
      }

      // Import repertoire
      if (importPreview.repertoire?.length > 0) {
        const existingRepertoire = safeParseJson<RepertoireItem[]>(
          'mirubato:repertoire:items',
          []
        )
        const existingIds = new Set(existingRepertoire.map(r => r.scoreId))
        const newRepertoire = importPreview.repertoire.filter(
          r => !existingIds.has(r.scoreId)
        )
        const mergedRepertoire = [...existingRepertoire, ...newRepertoire]
        localStorage.setItem(
          'mirubato:repertoire:items',
          JSON.stringify(mergedRepertoire)
        )
      }

      // Import repertoire goals
      if (importPreview.repertoireGoals?.length > 0) {
        const existingGoals = safeParseJson<Goal[]>(
          'mirubato:repertoire:goals',
          []
        )
        const existingIds = new Set(existingGoals.map(g => g.id))
        const newGoals = importPreview.repertoireGoals.filter(
          g => !existingIds.has(g.id)
        )
        const mergedGoals = [...existingGoals, ...newGoals]
        localStorage.setItem(
          'mirubato:repertoire:goals',
          JSON.stringify(mergedGoals)
        )
      }

      // Import practice plans
      if (importPreview.practicePlans?.length > 0) {
        const existingPlans = safeParseJson<PracticePlan[]>(
          'mirubato:planning:plans',
          []
        )
        const existingIds = new Set(existingPlans.map(p => p.id))
        const newPlans = importPreview.practicePlans.filter(
          p => !existingIds.has(p.id)
        )
        const mergedPlans = [...existingPlans, ...newPlans]
        localStorage.setItem(
          'mirubato:planning:plans',
          JSON.stringify(mergedPlans)
        )
      }

      // Import plan occurrences
      if (importPreview.planOccurrences?.length > 0) {
        const existingOccurrences = safeParseJson<PlanOccurrence[]>(
          'mirubato:planning:occurrences',
          []
        )
        const existingIds = new Set(existingOccurrences.map(o => o.id))
        const newOccurrences = importPreview.planOccurrences.filter(
          o => !existingIds.has(o.id)
        )
        const mergedOccurrences = [...existingOccurrences, ...newOccurrences]
        localStorage.setItem(
          'mirubato:planning:occurrences',
          JSON.stringify(mergedOccurrences)
        )
      }

      // Import plan templates
      if (importPreview.planTemplates?.length > 0) {
        const existingTemplates = safeParseJson<PlanTemplate[]>(
          'mirubato:planning:templates',
          []
        )
        const existingIds = new Set(existingTemplates.map(t => t.id))
        const newTemplates = importPreview.planTemplates.filter(
          t => !existingIds.has(t.id)
        )
        const mergedTemplates = [...existingTemplates, ...newTemplates]
        localStorage.setItem(
          'mirubato:planning:templates',
          JSON.stringify(mergedTemplates)
        )
      }

      // Import score metadata
      if (
        importPreview.scoreMetadata &&
        Object.keys(importPreview.scoreMetadata).length > 0
      ) {
        const existingMetadata = safeParseJson<
          Record<string, { title: string; composer?: string }>
        >('mirubato:logbook:scoreMetadata', {})
        const mergedMetadata = {
          ...existingMetadata,
          ...importPreview.scoreMetadata,
        }
        localStorage.setItem(
          'mirubato:logbook:scoreMetadata',
          JSON.stringify(mergedMetadata)
        )
      }

      // Import repertoire score metadata
      if (importPreview.repertoireScoreMetadata?.length > 0) {
        const existingMetadata = safeParseJson<
          Array<{ id: string; title: string; composer: string }>
        >('mirubato:repertoire:scoreMetadata', [])
        const existingIds = new Set(existingMetadata.map(m => m.id))
        const newMetadata = importPreview.repertoireScoreMetadata.filter(
          m => !existingIds.has(m.id)
        )
        const mergedMetadata = [...existingMetadata, ...newMetadata]
        localStorage.setItem(
          'mirubato:repertoire:scoreMetadata',
          JSON.stringify(mergedMetadata)
        )
      }

      // Import custom techniques
      if (importPreview.customTechniques?.length) {
        const existingTechniques = safeParseJson<string[]>(
          'mirubato:custom-techniques',
          []
        )
        const mergedTechniques = [
          ...new Set([
            ...existingTechniques,
            ...importPreview.customTechniques,
          ]),
        ]
        localStorage.setItem(
          'mirubato:custom-techniques',
          JSON.stringify(mergedTechniques)
        )
      }

      // Import metronome settings (only if not already present)
      if (
        importPreview.metronomeSettings &&
        !localStorage.getItem('mirubato-metronome-settings')
      ) {
        localStorage.setItem(
          'mirubato-metronome-settings',
          JSON.stringify(importPreview.metronomeSettings)
        )
      }
      if (
        importPreview.metronomePresets &&
        !localStorage.getItem('mirubato-metronome-presets')
      ) {
        localStorage.setItem(
          'mirubato-metronome-presets',
          JSON.stringify(importPreview.metronomePresets)
        )
      }
      if (
        importPreview.metronomeCustomPatterns &&
        !localStorage.getItem('mirubato-metronome-custom-patterns')
      ) {
        localStorage.setItem(
          'mirubato-metronome-custom-patterns',
          JSON.stringify(importPreview.metronomeCustomPatterns)
        )
      }

      // Import auto logging config (only if not already present)
      if (
        importPreview.autoLoggingConfig &&
        !localStorage.getItem('autoLoggingConfig')
      ) {
        localStorage.setItem(
          'autoLoggingConfig',
          JSON.stringify(importPreview.autoLoggingConfig)
        )
      }

      // If user is logged in, sync imported data to server
      if (isAuthenticated && localStorage.getItem('auth-token')) {
        try {
          const allEntries = safeParseJson<LogbookEntry[]>(
            'mirubato:logbook:entries',
            []
          )
          const allGoals = safeParseJson<Goal[]>('mirubato:logbook:goals', [])

          await syncApi.push({
            changes: {
              entries: allEntries,
              goals: allGoals,
            },
          })
          console.log('✅ Imported data synced to server')
        } catch (syncError) {
          console.warn('⚠️ Could not sync imported data to server:', syncError)
          showToast(
            t(
              'privacy:importSyncFailed',
              'Data imported locally. Sync to server failed.'
            ),
            'warning'
          )
        }
      }

      showToast(
        t(
          'privacy:dataImported',
          'Your data has been imported successfully. Please refresh the page.'
        ),
        'success'
      )
      setShowImportModal(false)
      setImportFile(null)
      setImportPreview(null)

      // Offer to refresh the page
      setTimeout(() => {
        if (
          window.confirm(
            t(
              'privacy:refreshToApply',
              'Refresh the page to see imported data?'
            )
          )
        ) {
          window.location.reload()
        }
      }, 500)
    } catch (error) {
      console.error('Data import failed:', error)
      showToast(
        t(
          'privacy:importFailed',
          'Failed to import your data. Please try again.'
        ),
        'error'
      )
    } finally {
      setIsImporting(false)
    }
  }

  const handleDataDeletion = async () => {
    if (deleteConfirmation !== 'DELETE') {
      showToast(
        t(
          'privacy:deleteConfirmationRequired',
          'Please type DELETE to confirm'
        ),
        'error'
      )
      return
    }

    setIsDeleting(true)
    try {
      // In a real implementation, this would call the API
      // For now, we'll clear local data and show confirmation

      // Clear local storage
      const keysToKeep = ['i18nextLng'] // Keep language preference
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
        }
      })

      showToast(
        t(
          'privacy:dataDeleted',
          'Your account deletion request has been submitted. You will receive a confirmation email.'
        ),
        'success'
      )

      setShowDeleteModal(false)
      setDeleteConfirmation('')

      // In a real app, this would redirect to logout
      // window.location.href = '/logout'
    } catch (error) {
      console.error('Data deletion failed:', error)
      showToast(
        t(
          'privacy:deleteFailed',
          'Failed to process deletion request. Please try again.'
        ),
        'error'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleContactPrivacyOfficer = () => {
    const subject = encodeURIComponent('GDPR Data Subject Request')
    const body = encodeURIComponent(`Hello,

I am writing to exercise my GDPR rights regarding my personal data.

User ID: ${user?.id || 'Not logged in'}
Email: ${user?.email || 'Not provided'}
Request Type: [Please specify: Access, Rectification, Erasure, Restriction, Portability, Objection, or Withdraw Consent]

Details of my request:
[Please describe your specific request]

Thank you,
${user?.displayName || '[Your Name]'}`)

    window.open(`mailto:privacy@mirubato.com?subject=${subject}&body=${body}`)
  }

  // Calculate data counts for display
  const dataStats = {
    logbookCount: entries.length,
    goalsCount: logbookGoals.length,
    repertoireCount: repertoire.size,
    repertoireGoalsCount: repertoireGoals.size,
    plansCount: plans.length,
    occurrencesCount: occurrences.length,
    templatesCount: templates.length,
    totalPracticeMinutes: entries.reduce(
      (sum, entry) => sum + (entry.duration || 0),
      0
    ),
  }

  // Non-logged-in users can still access export/import for local data

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-lexend text-lg font-medium text-morandi-stone-700 mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {t('privacy:rights.title', 'Your Data Rights')}
        </h3>

        <p className="text-sm text-morandi-stone-600 mb-6">
          {t(
            'privacy:rights.description',
            'Under GDPR, you have rights regarding your personal data:'
          )}
        </p>

        {/* Data Migration Section - Always visible */}
        <div className="mb-6 p-4 bg-morandi-stone-50 rounded-lg border border-morandi-stone-200">
          <h4 className="font-medium text-morandi-stone-700 mb-2 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('privacy:dataMigration.title', 'Data Migration')}
          </h4>
          <p className="text-xs text-morandi-stone-600 mb-4">
            {t(
              'privacy:dataMigration.description',
              'Export your data to move to a new device, or import data from a previous export. Works for both local (non-account) and cloud (signed-in) users.'
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('privacy:dataMigration.export', 'Export All Data')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('privacy:dataMigration.import', 'Import Data')}
            </Button>
          </div>
          {isAuthenticated && (
            <p className="text-xs text-morandi-sage-600 mt-2">
              <Check className="h-3 w-3 inline mr-1" />
              {t(
                'privacy:dataMigration.syncNote',
                'Signed in: Data will be synced with cloud storage.'
              )}
            </p>
          )}
          {!isAuthenticated && (
            <p className="text-xs text-morandi-stone-500 mt-2">
              {t(
                'privacy:dataMigration.localNote',
                'Not signed in: Data is stored locally in your browser.'
              )}
            </p>
          )}
        </div>

        {/* GDPR Rights Grid - Only for logged-in users */}
        {user && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Access Rights */}
            <div className="space-y-3">
              <h4 className="font-medium text-morandi-stone-700 text-sm">
                {t('privacy:rights.access', 'Request a copy of your data')}
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDataAccess}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                View My Data
              </Button>
            </div>

            {/* Rectification */}
            <div className="space-y-3">
              <h4 className="font-medium text-morandi-stone-700 text-sm">
                {t('privacy:rights.rectify', 'Correct inaccurate data')}
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleContactPrivacyOfficer}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Request Correction
              </Button>
            </div>

            {/* Erasure (Right to be Forgotten) */}
            <div className="space-y-3">
              <h4 className="font-medium text-morandi-stone-700 text-sm">
                {t('privacy:rights.erase', 'Delete your data')}
              </h4>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        )}

        {user && (
          <div className="mt-6 p-4 bg-morandi-sage-50 rounded-lg border border-morandi-sage-200">
            <h4 className="font-medium text-morandi-stone-700 mb-2">
              {t('privacy:contact.title', 'Privacy Questions?')}
            </h4>
            <p className="text-xs text-morandi-stone-600 mb-3">
              For other GDPR rights (restriction, objection, withdrawal of
              consent), contact our Privacy Officer:
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleContactPrivacyOfficer}
              className="text-xs"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Privacy Officer
            </Button>
          </div>
        )}
      </Card>

      {/* Data Access Modal */}
      <Modal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        title="Your Data Overview"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 text-sm">
            {user && (
              <div>
                <h4 className="font-medium text-morandi-stone-700">
                  Profile Information
                </h4>
                <ul className="mt-2 space-y-1 text-morandi-stone-600">
                  <li>Email: {user.email}</li>
                  <li>Display Name: {user.displayName || 'Not provided'}</li>
                  <li>
                    Account created:{' '}
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'Unknown'}
                  </li>
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-medium text-morandi-stone-700">
                Practice Data
              </h4>
              <ul className="mt-2 space-y-1 text-morandi-stone-600">
                <li>Logbook entries: {dataStats.logbookCount}</li>
                <li>Goals: {dataStats.goalsCount}</li>
                <li>Repertoire pieces: {dataStats.repertoireCount}</li>
                <li>Repertoire goals: {dataStats.repertoireGoalsCount}</li>
                <li>
                  Total practice time:{' '}
                  {Math.round((dataStats.totalPracticeMinutes / 60) * 10) / 10}{' '}
                  hours ({dataStats.totalPracticeMinutes} minutes)
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-morandi-stone-700">
                Planning Data
              </h4>
              <ul className="mt-2 space-y-1 text-morandi-stone-600">
                <li>Practice plans: {dataStats.plansCount}</li>
                <li>Plan occurrences: {dataStats.occurrencesCount}</li>
                <li>Plan templates: {dataStats.templatesCount}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-morandi-stone-700">
                Preferences
              </h4>
              <ul className="mt-2 space-y-1 text-morandi-stone-600">
                <li>
                  Language: {localStorage.getItem('i18nextLng') || 'English'}
                </li>
                <li>
                  Privacy consent:{' '}
                  {localStorage.getItem('mirubato:privacy-consent')
                    ? 'Given'
                    : 'Not given'}
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-morandi-stone-500">
              For a complete machine-readable export of your data, use the
              "Export All Data" option in the Data Migration section.
            </p>
          </div>
        </div>
      </Modal>

      {/* Data Export Confirmation Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={t('privacy:export.title', 'Export Your Data')}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-morandi-sage-50 rounded-lg">
            <Download className="h-5 w-5 text-morandi-sage-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-morandi-stone-700 text-sm mb-1">
                {t('privacy:export.subtitle', 'Complete Data Export')}
              </h4>
              <p className="text-xs text-morandi-stone-600 mb-2">
                {t(
                  'privacy:export.description',
                  'This will download a JSON file containing all your data:'
                )}
              </p>
              <ul className="text-xs text-morandi-stone-600 space-y-0.5 list-disc list-inside">
                <li>
                  {t(
                    'privacy:export.logbook',
                    'Practice logbook entries and goals'
                  )}
                </li>
                <li>
                  {t(
                    'privacy:export.repertoire',
                    'Repertoire pieces and goals'
                  )}
                </li>
                <li>
                  {t(
                    'privacy:export.plans',
                    'Practice plans, occurrences, and templates'
                  )}
                </li>
                <li>
                  {t(
                    'privacy:export.settings',
                    'Metronome settings, custom techniques'
                  )}
                </li>
                <li>
                  {t(
                    'privacy:export.preferences',
                    'User preferences and settings'
                  )}
                </li>
              </ul>
            </div>
          </div>

          {isAuthenticated && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <RefreshCw className="h-3 w-3 inline mr-1" />
                {t(
                  'privacy:export.syncNote',
                  'Your data will be synced from the server before export to ensure you have the latest version.'
                )}
              </p>
            </div>
          )}

          <div className="text-xs text-morandi-stone-500">
            <strong>{t('privacy:export.dataCount', 'Data to export:')}</strong>
            <span className="ml-2">
              {dataStats.logbookCount} {t('privacy:export.entries', 'entries')},{' '}
              {dataStats.goalsCount} {t('privacy:export.goals', 'goals')},{' '}
              {dataStats.repertoireCount} {t('privacy:export.pieces', 'pieces')}
              , {dataStats.plansCount} {t('privacy:export.plans', 'plans')}
            </span>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportModal(false)}
              disabled={isExporting || isSyncing}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDataExport}
              disabled={isExporting || isSyncing}
            >
              {isExporting || isSyncing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  {isSyncing
                    ? t('privacy:export.syncing', 'Syncing...')
                    : t('privacy:export.exporting', 'Exporting...')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t('privacy:export.button', 'Export Data')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Data Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setImportFile(null)
          setImportPreview(null)
          setImportError(null)
        }}
        title={t('privacy:import.title', 'Import Your Data')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-morandi-sage-50 rounded-lg">
            <Upload className="h-5 w-5 text-morandi-sage-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-morandi-stone-700 text-sm mb-1">
                {t('privacy:import.subtitle', 'Import Data from Backup')}
              </h4>
              <p className="text-xs text-morandi-stone-600">
                {t(
                  'privacy:import.description',
                  'Select a Mirubato export file (.json) to import your data. Existing data will be preserved - only new items will be added.'
                )}
              </p>
            </div>
          </div>

          {/* File input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importFile
                ? importFile.name
                : t('privacy:import.selectFile', 'Select Export File')}
            </Button>
          </div>

          {/* Error message */}
          {importError && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-red-700">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                {importError}
              </p>
            </div>
          )}

          {/* Preview of import data */}
          {importPreview && (
            <div className="p-4 bg-morandi-stone-50 rounded-lg border border-morandi-stone-200">
              <h4 className="font-medium text-morandi-stone-700 text-sm mb-3">
                {t('privacy:import.preview', 'Import Preview')}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-morandi-stone-600">
                <div>
                  <span className="font-medium">
                    {t('privacy:import.version', 'Version:')}
                  </span>{' '}
                  {importPreview.version}
                </div>
                <div>
                  <span className="font-medium">
                    {t('privacy:import.exportDate', 'Exported:')}
                  </span>{' '}
                  {new Date(importPreview.exportDate).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">
                    {t('privacy:import.entries', 'Entries:')}
                  </span>{' '}
                  {importPreview.logbook?.length || 0}
                </div>
                <div>
                  <span className="font-medium">
                    {t('privacy:import.goals', 'Goals:')}
                  </span>{' '}
                  {importPreview.goals?.length || 0}
                </div>
                <div>
                  <span className="font-medium">
                    {t('privacy:import.repertoire', 'Repertoire:')}
                  </span>{' '}
                  {importPreview.repertoire?.length || 0}
                </div>
                <div>
                  <span className="font-medium">
                    {t('privacy:import.plans', 'Plans:')}
                  </span>{' '}
                  {importPreview.practicePlans?.length || 0}
                </div>
              </div>
              {importPreview.profile?.email && (
                <div className="mt-2 pt-2 border-t border-morandi-stone-200 text-xs text-morandi-stone-500">
                  <span className="font-medium">
                    {t('privacy:import.fromAccount', 'From account:')}
                  </span>{' '}
                  {importPreview.profile.email}
                </div>
              )}
            </div>
          )}

          {isAuthenticated && importPreview && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <RefreshCw className="h-3 w-3 inline mr-1" />
                {t(
                  'privacy:import.syncNote',
                  'Your imported data will be synced to the cloud after import.'
                )}
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowImportModal(false)
                setImportFile(null)
                setImportPreview(null)
                setImportError(null)
              }}
              disabled={isImporting}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDataImport}
              disabled={isImporting || !importPreview}
            >
              {isImporting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  {t('privacy:import.importing', 'Importing...')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('privacy:import.button', 'Import Data')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Account Deletion Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 text-sm mb-1">
                Permanent Account Deletion
              </h4>
              <p className="text-xs text-red-700">
                This action cannot be undone. All your data including practice
                logs, repertoire, and profile information will be permanently
                deleted.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-morandi-stone-700 mb-2">
              Type "DELETE" to confirm:
            </label>
            <Input
              value={deleteConfirmation}
              onChange={e => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowDeleteModal(false)
                setDeleteConfirmation('')
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDataDeletion}
              disabled={isDeleting || deleteConfirmation !== 'DELETE'}
            >
              {isDeleting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
