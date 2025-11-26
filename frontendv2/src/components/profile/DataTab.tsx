import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Upload,
  Database,
  Clock,
  Check,
  AlertTriangle,
  RefreshCw,
  HardDrive,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Modal, ModalBody, ModalFooter } from '../ui/Modal'
import Button from '../ui/Button'
import { useAuthStore } from '../../stores/authStore'
import { useLogbookStore } from '../../stores/logbookStore'
import { useRepertoireStore } from '../../stores/repertoireStore'
import { usePlanningStore } from '../../stores/planningStore'
import { showToast } from '../../utils/toastManager'
import { syncApi } from '../../api/sync'
import type { LogbookEntry, Goal as LogbookGoal } from '../../api/logbook'
import type { RepertoireItem } from '../../api/repertoire'
import type { Goal as RepertoireGoal } from '../../api/goals'
import type {
  PracticePlan,
  PlanOccurrence,
  PlanTemplate,
} from '../../api/planning'

interface DataExportFormat {
  logbook: LogbookEntry[]
  goals: LogbookGoal[]
  repertoire: RepertoireItem[]
  repertoireGoals: RepertoireGoal[]
  practicePlans: PracticePlan[]
  planOccurrences: PlanOccurrence[]
  planTemplates: PlanTemplate[]
  scoreMetadata: Record<string, { title: string; composer?: string }>
  repertoireScoreMetadata: Array<{
    id: string
    title: string
    composer: string
  }>
  profile: {
    id?: string
    email?: string
    displayName?: string
    createdAt?: string
  }
  preferences: {
    language?: string | null
    theme?: string | null
    privacyConsent?: string | null
    sidebarCollapsed?: string | null
    uiPreferences?: string | null
  }
  customTechniques?: string[]
  metronomeSettings?: Record<string, unknown> | null
  metronomePresets?: Array<Record<string, unknown>> | null
  metronomeCustomPatterns?: Array<Record<string, unknown>> | null
  autoLoggingConfig?: Record<string, unknown> | null
  dictionaryRecentSearches?: string[]
  recentScoreSearches?: string[]
  exportDate: string
  version: string
  dataSource: 'local' | 'synced'
}

const safeParseJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function DataTab() {
  const { t } = useTranslation(['profile', 'privacy', 'common'])
  const { user, isAuthenticated } = useAuthStore()
  const { entries, goals: logbookGoals } = useLogbookStore()
  const { repertoire, goals: repertoireGoals } = useRepertoireStore()
  const { plans, occurrences, templates } = usePlanningStore()

  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<DataExportFormat | null>(
    null
  )
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSyncBeforeExport = async () => {
    if (!isAuthenticated || !localStorage.getItem('auth-token')) {
      return
    }

    setIsSyncing(true)
    try {
      await syncApi.pull()
      showToast(t('privacy:dataSynced', 'Data synced from server'), 'success')
    } catch (error) {
      console.warn('Could not sync from server, using local data:', error)
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
      let dataSource: 'local' | 'synced' = 'local'
      if (isAuthenticated && localStorage.getItem('auth-token')) {
        try {
          await handleSyncBeforeExport()
          dataSource = 'synced'
        } catch {
          dataSource = 'local'
        }
      }

      const logbookScoreMetadata = safeParseJson<
        Record<string, { title: string; composer?: string }>
      >('mirubato:logbook:scoreMetadata', {})

      const repertoireScoreMetadataRaw = safeParseJson<
        Array<{ id: string; title: string; composer: string }>
      >('mirubato:repertoire:scoreMetadata', [])

      const customTechniques = safeParseJson<string[]>(
        'mirubato:custom-techniques',
        []
      )

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

      const autoLoggingConfig = safeParseJson<Record<string, unknown> | null>(
        'autoLoggingConfig',
        null
      )

      const dictionaryRecentSearches = safeParseJson<string[]>(
        'dictionary_recent_searches',
        []
      )
      const recentScoreSearches = safeParseJson<string[]>('recentSearches', [])

      const exportData: DataExportFormat = {
        logbook: entries,
        goals: logbookGoals,
        repertoire: Array.from(repertoire.values()),
        repertoireGoals: Array.from(repertoireGoals.values()),
        practicePlans: plans,
        planOccurrences: occurrences,
        planTemplates: templates,
        scoreMetadata: logbookScoreMetadata,
        repertoireScoreMetadata: repertoireScoreMetadataRaw,
        profile: {
          id: user?.id,
          email: user?.email,
          displayName: user?.displayName,
          createdAt: user?.createdAt,
        },
        preferences: {
          language: localStorage.getItem('i18nextLng'),
          theme: localStorage.getItem('mirubato:theme'),
          privacyConsent: localStorage.getItem('mirubato:privacy-consent'),
          sidebarCollapsed: localStorage.getItem('mirubato:sidebarCollapsed'),
          uiPreferences: localStorage.getItem('mirubato:ui-preferences'),
        },
        customTechniques,
        metronomeSettings,
        metronomePresets,
        metronomeCustomPatterns,
        autoLoggingConfig,
        dictionaryRecentSearches,
        recentScoreSearches,
        exportDate: new Date().toISOString(),
        version: '2.0',
        dataSource,
      }

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

      if (!data.version || !data.exportDate) {
        throw new Error('Invalid export file format')
      }

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
        const existingGoals = safeParseJson<LogbookGoal[]>(
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
        const existingGoals = safeParseJson<RepertoireGoal[]>(
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

      // If user is logged in, sync imported data to server
      if (isAuthenticated && localStorage.getItem('auth-token')) {
        try {
          const allEntries = safeParseJson<LogbookEntry[]>(
            'mirubato:logbook:entries',
            []
          )
          const allGoals = safeParseJson<LogbookGoal[]>(
            'mirubato:logbook:goals',
            []
          )

          await syncApi.push({
            changes: {
              entries: allEntries,
              goals: allGoals,
            },
          })
        } catch (syncError) {
          console.warn('Could not sync imported data to server:', syncError)
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

  return (
    <div className="space-y-6">
      {/* Data Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
            <Database className="h-5 w-5" />
            {t('profile:sections.dataOverview', 'Your Data')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-morandi-stone-50 rounded-lg text-center">
              <div className="font-lexend text-xl font-medium text-morandi-stone-700">
                {dataStats.logbookCount}
              </div>
              <div className="text-xs text-morandi-stone-500">
                {t('profile:data.entries', 'Entries')}
              </div>
            </div>
            <div className="p-3 bg-morandi-stone-50 rounded-lg text-center">
              <div className="font-lexend text-xl font-medium text-morandi-stone-700">
                {dataStats.repertoireCount}
              </div>
              <div className="text-xs text-morandi-stone-500">
                {t('profile:data.pieces', 'Pieces')}
              </div>
            </div>
            <div className="p-3 bg-morandi-stone-50 rounded-lg text-center">
              <div className="font-lexend text-xl font-medium text-morandi-stone-700">
                {dataStats.goalsCount}
              </div>
              <div className="text-xs text-morandi-stone-500">
                {t('profile:data.goals', 'Goals')}
              </div>
            </div>
            <div className="p-3 bg-morandi-stone-50 rounded-lg text-center">
              <div className="font-lexend text-xl font-medium text-morandi-stone-700">
                {dataStats.plansCount}
              </div>
              <div className="text-xs text-morandi-stone-500">
                {t('profile:data.plans', 'Plans')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-morandi-stone-600">
            <HardDrive className="h-4 w-4" />
            {isAuthenticated
              ? t(
                  'profile:data.storageCloud',
                  'Data is synced to cloud storage'
                )
              : t(
                  'profile:data.storageLocal',
                  'Data is stored locally in your browser'
                )}
          </div>
        </CardContent>
      </Card>

      {/* Export/Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
            <RefreshCw className="h-5 w-5" />
            {t('profile:sections.dataMigration', 'Data Migration')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-morandi-stone-600">
            {t(
              'profile:dataMigrationDescription',
              'Export your data to backup or transfer to another device, or import data from a previous export.'
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowExportModal(true)}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('profile:exportData', 'Export Data')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(true)}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('profile:importData', 'Import Data')}
            </Button>
          </div>

          {isAuthenticated && (
            <p className="text-xs text-morandi-sage-600">
              <Check className="h-3 w-3 inline mr-1" />
              {t(
                'profile:syncNote',
                'Data will be synced with cloud storage before export.'
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={t('privacy:export.title', 'Export Your Data')}
        size="md"
      >
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-morandi-sage-50 rounded-lg">
              <Download className="h-5 w-5 text-morandi-sage-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-morandi-stone-700 text-sm mb-1">
                  {t('privacy:export.subtitle', 'Complete Data Export')}
                </h4>
                <p className="text-xs text-morandi-stone-600">
                  {t(
                    'privacy:export.description',
                    'This will download a JSON file containing all your data.'
                  )}
                </p>
              </div>
            </div>

            <div className="text-xs text-morandi-stone-500">
              <strong>
                {t('privacy:export.dataCount', 'Data to export:')}
              </strong>
              <span className="ml-2">
                {dataStats.logbookCount}{' '}
                {t('privacy:export.entries', 'entries')}, {dataStats.goalsCount}{' '}
                {t('privacy:export.goals', 'goals')},{' '}
                {dataStats.repertoireCount}{' '}
                {t('privacy:export.pieces', 'pieces')}, {dataStats.plansCount}{' '}
                {t('privacy:export.plans', 'plans')}
              </span>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
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
        </ModalFooter>
      </Modal>

      {/* Import Modal */}
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
        <ModalBody>
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
                    'Select a Mirubato export file (.json) to import your data.'
                  )}
                </p>
              </div>
            </div>

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

            {importError && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-700">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  {importError}
                </p>
              </div>
            )}

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
                      {t('privacy:import.repertoire', 'Repertoire:')}
                    </span>{' '}
                    {importPreview.repertoire?.length || 0}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
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
        </ModalFooter>
      </Modal>
    </div>
  )
}
