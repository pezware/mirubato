import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/Modal'
import Button from '../ui/Button'
import { Input } from '../ui/Input'
import { scoreService } from '../../services/scoreService'
import type { Score } from '../../services/scoreService'
import type { Collection } from '../../types/collections'
import { cn } from '../../utils/cn'
import { FileText, Image, Link, Upload } from 'lucide-react'

interface ImportScoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (score: Score, selectedCollections?: string[]) => void
}

type ImportType = 'pdf' | 'images' | 'url'

export default function ImportScoreModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportScoreModalProps) {
  const { t } = useTranslation(['scorebook', 'common'])
  const [importType, setImportType] = useState<ImportType>('pdf')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([])

  // URL import state
  const [importUrl, setImportUrl] = useState('')

  // Collection selection state
  const [userCollections, setUserCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set()
  )
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)

  // Load user collections when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUserCollections()
    }
  }, [isOpen])

  const loadUserCollections = async () => {
    setIsLoadingCollections(true)
    try {
      const collections = await scoreService.getUserCollections()
      setUserCollections(collections)
    } catch (err) {
      console.error('Failed to load collections:', err)
    } finally {
      setIsLoadingCollections(false)
    }
  }

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      setError(null)
    } else {
      setError(
        t('scorebook:errors.invalidPdf', 'Please select a valid PDF file')
      )
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validImages = files.filter(file => file.type.startsWith('image/'))

    if (validImages.length === 0) {
      setError(
        t('scorebook:errors.invalidImages', 'Please select valid image files')
      )
      return
    }

    setImageFiles(validImages)
    setError(null)
  }

  const toggleCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollections)
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId)
    } else {
      newSelected.add(collectionId)
    }
    setSelectedCollections(newSelected)
  }

  const handleImport = async () => {
    setIsImporting(true)
    setError(null)

    try {
      let importedScore: Score | null = null

      if (importType === 'pdf' && pdfFile) {
        // Upload PDF
        importedScore = await scoreService.uploadScore(pdfFile, {
          title: pdfFile.name.replace('.pdf', ''),
        })
      } else if (importType === 'images' && imageFiles.length > 0) {
        // Convert images to base64 and upload
        const imageData = await Promise.all(
          imageFiles.map(async file => {
            const reader = new FileReader()
            return new Promise<{ filename: string; data: string }>(
              (resolve, reject) => {
                reader.onload = () => {
                  resolve({
                    filename: file.name,
                    data: reader.result as string,
                  })
                }
                reader.onerror = reject
                reader.readAsDataURL(file)
              }
            )
          })
        )

        const result = await scoreService.importImages({
          images: imageData,
          title: imageFiles[0].name.replace(/\.[^/.]+$/, ''),
        })

        if (result.success) {
          importedScore = result.data
        } else {
          throw new Error(result.error || 'Import failed')
        }
      } else if (importType === 'url' && importUrl) {
        // Import from URL
        const result = await scoreService.importScore({
          url: importUrl,
        })

        if (result.success) {
          importedScore = result.data
        } else {
          throw new Error(result.error || 'Import failed')
        }
      }

      if (importedScore) {
        // Add to selected collections
        if (selectedCollections.size > 0) {
          const collectionPromises = Array.from(selectedCollections).map(
            collectionId =>
              scoreService.addScoreToCollection(collectionId, importedScore!.id)
          )
          await Promise.all(collectionPromises)
        }

        // Success callback
        if (onSuccess) {
          onSuccess(importedScore, Array.from(selectedCollections))
        }

        // Reset and close
        handleClose()
      }
    } catch (err) {
      console.error('Import failed:', err)
      setError(
        err instanceof Error
          ? err.message
          : t('scorebook:errors.importFailed', 'Import failed')
      )
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    // Reset state
    setPdfFile(null)
    setImageFiles([])
    setImportUrl('')
    setSelectedCollections(new Set())
    setError(null)
    onClose()
  }

  const canImport = () => {
    if (importType === 'pdf') return !!pdfFile
    if (importType === 'images') return imageFiles.length > 0
    if (importType === 'url') return !!importUrl.trim()
    return false
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-morandi-stone-800 mb-6">
          {t('scorebook:importScore', 'Import Score')}
        </h2>

        {/* Import type selector */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={importType === 'pdf' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setImportType('pdf')}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {t('scorebook:importPdf', 'PDF')}
          </Button>
          <Button
            variant={importType === 'images' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setImportType('images')}
            className="flex items-center gap-2"
          >
            <Image className="w-4 h-4" />
            {t('scorebook:importImages', 'Images')}
          </Button>
          <Button
            variant={importType === 'url' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setImportType('url')}
            className="flex items-center gap-2"
          >
            <Link className="w-4 h-4" />
            {t('scorebook:importUrl', 'URL')}
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Import content based on type */}
        <div className="mb-6">
          {importType === 'pdf' && (
            <div>
              <label className="block">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    'hover:border-morandi-sage-400 hover:bg-morandi-sage-50',
                    pdfFile
                      ? 'border-morandi-sage-500 bg-morandi-sage-50'
                      : 'border-morandi-stone-300'
                  )}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-morandi-stone-500" />
                  <p className="text-sm text-morandi-stone-600">
                    {pdfFile
                      ? pdfFile.name
                      : t(
                          'scorebook:uploadPrompt',
                          'Drop PDF files here or click to browse'
                        )}
                  </p>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfSelect}
                    className="sr-only"
                  />
                </div>
              </label>
            </div>
          )}

          {importType === 'images' && (
            <div>
              <label className="block">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    'hover:border-morandi-sage-400 hover:bg-morandi-sage-50',
                    imageFiles.length > 0
                      ? 'border-morandi-sage-500 bg-morandi-sage-50'
                      : 'border-morandi-stone-300'
                  )}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-morandi-stone-500" />
                  <p className="text-sm text-morandi-stone-600">
                    {imageFiles.length > 0
                      ? t(
                          'scorebook:selectedImages',
                          '{{count}} images selected',
                          { count: imageFiles.length }
                        )
                      : t(
                          'scorebook:uploadImagesPrompt',
                          'Drop image files here or click to browse'
                        )}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="sr-only"
                  />
                </div>
              </label>
              {imageFiles.length > 0 && (
                <div className="mt-2 text-xs text-morandi-stone-600">
                  {imageFiles.map(file => file.name).join(', ')}
                </div>
              )}
            </div>
          )}

          {importType === 'url' && (
            <div>
              <Input
                type="url"
                value={importUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setImportUrl(e.target.value)
                }
                placeholder={t(
                  'scorebook:importUrlPlaceholder',
                  'Enter URL to PDF file...'
                )}
                className="w-full"
              />
              <p className="mt-2 text-xs text-morandi-stone-600">
                {t(
                  'scorebook:importUrlHelp',
                  'Enter a direct link to a PDF file'
                )}
              </p>
            </div>
          )}
        </div>

        {/* Collection selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-morandi-stone-700 mb-3">
            {t('scorebook:addToCollections', 'Add to Collections (optional)')}
          </h3>

          {isLoadingCollections ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-morandi-sage-500"></div>
            </div>
          ) : userCollections.length === 0 ? (
            <p className="text-sm text-morandi-stone-500">
              {t('scorebook:noCollections', 'No collections yet')}
            </p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {userCollections.map(collection => (
                <label
                  key={collection.id}
                  className={cn(
                    'flex items-center p-2 rounded-lg border cursor-pointer transition-all',
                    selectedCollections.has(collection.id)
                      ? 'border-morandi-sage-500 bg-morandi-sage-50'
                      : 'border-morandi-stone-200 hover:border-morandi-stone-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedCollections.has(collection.id)}
                    onChange={() => toggleCollection(collection.id)}
                    className="sr-only"
                  />
                  <span className="flex-1 text-sm text-morandi-stone-700">
                    {collection.name}
                  </span>
                  {selectedCollections.has(collection.id) && (
                    <svg
                      className="w-4 h-4 text-morandi-sage-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={isImporting}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            loading={isImporting}
            disabled={!canImport()}
          >
            {t('scorebook:import', 'Import')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
