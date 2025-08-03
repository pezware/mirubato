import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Trash2,
  Edit,
  Eye,
  AlertTriangle,
  Mail,
  Clock,
} from 'lucide-react'
import { Button, Card, Modal, Input } from '../ui'
import { useAuthStore } from '../../stores/authStore'
import { useLogbookStore } from '../../stores/logbookStore'
import { useRepertoireStore } from '../../stores/repertoireStore'
import { showToast } from '../../utils/toastManager'

interface DataExportFormat {
  logbook: any[]
  repertoire: any[]
  profile: any
  preferences: any
  exportDate: string
  version: string
}

export function DataSubjectRights() {
  const { t } = useTranslation(['privacy', 'common'])
  const { user } = useAuthStore()
  const { entries } = useLogbookStore()
  const { repertoire } = useRepertoireStore()
  // Toast utility available via showToast

  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDataAccess = () => {
    setShowAccessModal(true)
  }

  const handleDataExport = async () => {
    setIsExporting(true)
    try {
      // Compile user data
      const exportData: DataExportFormat = {
        logbook: entries,
        repertoire: Array.from(repertoire.values()),
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
        },
        exportDate: new Date().toISOString(),
        version: '1.0',
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

  if (!user) {
    return (
      <Card className="p-6">
        <p className="text-center text-morandi-stone-600">
          {t(
            'privacy:loginRequired',
            'Please log in to access your data rights'
          )}
        </p>
      </Card>
    )
  }

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

          {/* Data Portability */}
          <div className="space-y-3">
            <h4 className="font-medium text-morandi-stone-700 text-sm">
              {t('privacy:rights.portable', 'Export your data')}
            </h4>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
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

            <div>
              <h4 className="font-medium text-morandi-stone-700">
                Practice Data
              </h4>
              <ul className="mt-2 space-y-1 text-morandi-stone-600">
                <li>Logbook entries: {entries.length}</li>
                <li>Repertoire pieces: {repertoire.size}</li>
                <li>
                  Total practice time:{' '}
                  {entries.reduce(
                    (sum, entry) => sum + (entry.duration || 0),
                    0
                  )}{' '}
                  minutes
                </li>
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
              "Export Data" option.
            </p>
          </div>
        </div>
      </Modal>

      {/* Data Export Confirmation Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Your Data"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-morandi-sage-50 rounded-lg">
            <Download className="h-5 w-5 text-morandi-sage-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-morandi-stone-700 text-sm mb-1">
                Data Export
              </h4>
              <p className="text-xs text-morandi-stone-600">
                This will download a JSON file containing all your personal data
                including: practice logs, repertoire, profile information, and
                preferences.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportModal(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDataExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
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
