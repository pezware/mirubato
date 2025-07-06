import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'

interface MissingScorePromptProps {
  scoreId: string
  scoreTitle: string
  scoreComposer?: string
  onUpload?: (file: File) => void
}

export default function MissingScorePrompt({
  scoreId: _scoreId,
  scoreTitle,
  scoreComposer,
  onUpload,
}: MissingScorePromptProps) {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
      ]
      if (!allowedTypes.includes(file.type)) {
        alert(t('scorebook:upload.invalidFileType'))
        return
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        alert(t('scorebook:upload.fileTooLarge'))
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !onUpload) return

    setIsUploading(true)
    try {
      await onUpload(selectedFile)
      setShowUploadModal(false)
      setSelectedFile(null)
      // Reload the page to show the newly uploaded score
      window.location.reload()
    } catch (error) {
      console.error('Upload failed:', error)
      alert(t('scorebook:upload.failed'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <Card className="text-center p-8 max-w-2xl mx-auto my-8">
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-morandi-stone-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>

          <h3 className="text-2xl font-medium text-morandi-stone-800 mb-2">
            {scoreTitle}
          </h3>
          {scoreComposer && (
            <p className="text-lg text-morandi-stone-600 mb-4">
              {t('scorebook:by')} {scoreComposer}
            </p>
          )}
        </div>

        <div className="bg-morandi-sand-50 rounded-lg p-6 mb-6">
          <p className="text-morandi-stone-700 mb-2">
            {t('scorebook:missingScore.description')}
          </p>
          <p className="text-sm text-morandi-stone-600">
            {t('scorebook:missingScore.userMaterial')}
          </p>
        </div>

        <div className="space-y-4">
          {onUpload && (
            <Button
              onClick={() => setShowUploadModal(true)}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {t('scorebook:upload.uploadScore')}
            </Button>
          )}

          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
          >
            {t('common:goBack')}
          </Button>
        </div>

        <div className="mt-8 p-4 bg-morandi-sage-50 rounded-lg">
          <p className="text-sm text-morandi-stone-600">
            <strong>{t('scorebook:tip')}:</strong>{' '}
            {t('scorebook:missingScore.practiceWithoutFile')}
          </p>
        </div>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false)
          setSelectedFile(null)
        }}
        title={t('scorebook:upload.uploadScore')}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-morandi-stone-700">
            {t('scorebook:upload.selectFile')}
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-morandi-stone-300 rounded-lg p-8 text-center cursor-pointer hover:border-morandi-sage-400 transition-colors"
          >
            {selectedFile ? (
              <div>
                <svg
                  className="w-12 h-12 mx-auto text-morandi-sage-500 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="font-medium text-morandi-stone-800">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-morandi-stone-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <svg
                  className="w-12 h-12 mx-auto text-morandi-stone-400 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-morandi-stone-600">
                  {t('scorebook:upload.clickToSelect')}
                </p>
                <p className="text-sm text-morandi-stone-500 mt-2">
                  {t('scorebook:upload.acceptedFormats')}
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowUploadModal(false)
                setSelectedFile(null)
              }}
              disabled={isUploading}
            >
              {t('common:cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading
                ? t('scorebook:upload.uploading')
                : t('scorebook:upload.upload')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
