import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button, Input, Select, cn } from '../ui'
import { scoreService } from '../../services/scoreService'
import type { Score } from '../../services/scoreService'
import type { Collection } from '../../types/collections'
import {
  FileText,
  Image,
  Link,
  Upload,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles,
  Music,
  Edit2,
} from 'lucide-react'

interface ImportScoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (score: Score, selectedCollections?: string[]) => void
}

type ImportType = 'pdf' | 'images' | 'url'
type WizardStep = 'upload' | 'processing' | 'metadata' | 'collections'

interface ExtractedMetadata {
  title: string
  composer: string
  opus?: string
  instrument: 'piano' | 'guitar' | 'both'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  key_signature?: string
  time_signature?: string
  tempo_marking?: string
  style_period?: string
  confidence?: {
    title?: number
    composer?: number
    difficulty?: number
  }
}

// Step indicator component
function StepIndicator({
  steps,
  currentStep,
}: {
  steps: { id: WizardStep; label: string }[]
  currentStep: WizardStep
}) {
  const currentIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
              index < currentIndex
                ? 'bg-morandi-sage-500 text-white'
                : index === currentIndex
                  ? 'bg-morandi-sage-500 text-white ring-4 ring-morandi-sage-100'
                  : 'bg-morandi-stone-200 text-morandi-stone-500'
            )}
          >
            {index < currentIndex ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          <span
            className={cn(
              'ml-2 text-sm hidden sm:inline',
              index === currentIndex
                ? 'text-morandi-stone-800 font-medium'
                : 'text-morandi-stone-500'
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 sm:w-16 h-0.5 mx-2',
                index < currentIndex
                  ? 'bg-morandi-sage-500'
                  : 'bg-morandi-stone-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Confidence indicator component
function ConfidenceIndicator({ confidence }: { confidence?: number }) {
  if (confidence === undefined) return null

  const getColor = (conf: number) => {
    if (conf >= 0.8) return 'bg-morandi-sage-500'
    if (conf >= 0.5) return 'bg-morandi-peach-500'
    return 'bg-morandi-rose-500'
  }

  const getLabel = (conf: number) => {
    if (conf >= 0.8) return 'High'
    if (conf >= 0.5) return 'Medium'
    return 'Low'
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <div className={cn('w-2 h-2 rounded-full', getColor(confidence))} />
      <span className="text-morandi-stone-500">
        {getLabel(confidence)} confidence
      </span>
    </div>
  )
}

export default function ImportScoreModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportScoreModalProps) {
  const { t } = useTranslation(['scorebook', 'common'])

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload')
  const [importType, setImportType] = useState<ImportType>('pdf')

  // Upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [importUrl, setImportUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingMessage, setProcessingMessage] = useState('')

  // Metadata state
  const [metadata, setMetadata] = useState<ExtractedMetadata>({
    title: '',
    composer: '',
    instrument: 'piano',
    difficulty: 'intermediate',
  })
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)

  // Collection state
  const [userCollections, setUserCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set()
  )
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)

  // Final save state
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Temporary score ID for preview
  const [tempScoreId, setTempScoreId] = useState<string | null>(null)

  // Define wizard steps
  const steps = useMemo(
    () => [
      {
        id: 'upload' as WizardStep,
        label: t('scorebook:steps.upload', 'Upload'),
      },
      {
        id: 'processing' as WizardStep,
        label: t('scorebook:steps.processing', 'Processing'),
      },
      {
        id: 'metadata' as WizardStep,
        label: t('scorebook:steps.review', 'Review'),
      },
      {
        id: 'collections' as WizardStep,
        label: t('scorebook:steps.organize', 'Organize'),
      },
    ],
    [t]
  )

  // Instrument options
  const instrumentOptions = [
    { value: 'piano', label: t('scorebook:piano', 'Piano') },
    { value: 'guitar', label: t('scorebook:guitar', 'Guitar') },
    { value: 'both', label: t('scorebook:both', 'Both') },
  ]

  // Difficulty options
  const difficultyOptions = [
    { value: 'beginner', label: t('scorebook:beginner', 'Beginner') },
    {
      value: 'intermediate',
      label: t('scorebook:intermediate', 'Intermediate'),
    },
    { value: 'advanced', label: t('scorebook:advanced', 'Advanced') },
  ]

  // Style period options
  const stylePeriodOptions = [
    { value: '', label: t('scorebook:selectPeriod', 'Select period...') },
    { value: 'baroque', label: t('scorebook:baroque', 'Baroque') },
    { value: 'classical', label: t('scorebook:classical', 'Classical') },
    { value: 'romantic', label: t('scorebook:romantic', 'Romantic') },
    { value: 'modern', label: t('scorebook:modern', 'Modern') },
    {
      value: 'contemporary',
      label: t('scorebook:contemporary', 'Contemporary'),
    },
  ]

  // Load user collections
  useEffect(() => {
    if (isOpen && currentStep === 'collections') {
      loadUserCollections()
    }
  }, [isOpen, currentStep])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen])

  const resetState = () => {
    setCurrentStep('upload')
    setImportType('pdf')
    setPdfFile(null)
    setImageFiles([])
    setImportUrl('')
    setThumbnailUrl(null)
    setIsProcessing(false)
    setProcessingProgress(0)
    setProcessingMessage('')
    setMetadata({
      title: '',
      composer: '',
      instrument: 'piano',
      difficulty: 'intermediate',
    })
    setIsEditingMetadata(false)
    setSelectedCollections(new Set())
    setError(null)
    setTempScoreId(null)
  }

  const loadUserCollections = async () => {
    setIsLoadingCollections(true)
    try {
      const collections = await scoreService.getUserCollections()
      setUserCollections(collections)

      // Auto-select default collection
      const defaultCollection = collections.find(c => c.is_default)
      if (defaultCollection) {
        setSelectedCollections(new Set([defaultCollection.id]))
      }
    } catch (err) {
      console.error('Failed to load collections:', err)
    } finally {
      setIsLoadingCollections(false)
    }
  }

  // File handlers
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      setError(null)
      // Set initial title from filename
      setMetadata(prev => ({
        ...prev,
        title: file.name.replace('.pdf', ''),
      }))
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
    // Set initial title from first image filename
    setMetadata(prev => ({
      ...prev,
      title: validImages[0].name.replace(/\.[^/.]+$/, ''),
    }))

    // Create thumbnail preview
    const reader = new FileReader()
    reader.onload = () => {
      setThumbnailUrl(reader.result as string)
    }
    reader.readAsDataURL(validImages[0])
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

  // Check if we can proceed to next step
  const canProceed = () => {
    switch (currentStep) {
      case 'upload':
        if (importType === 'pdf') return !!pdfFile
        if (importType === 'images') return imageFiles.length > 0
        if (importType === 'url') return !!importUrl.trim()
        return false
      case 'processing':
        return !isProcessing
      case 'metadata':
        return metadata.title.trim() !== '' && metadata.composer.trim() !== ''
      case 'collections':
        return true
      default:
        return false
    }
  }

  // Process upload and extract metadata
  const processUpload = async () => {
    setIsProcessing(true)
    setError(null)
    setProcessingProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      setProcessingMessage(
        t('scorebook:processing.uploading', 'Uploading file...')
      )

      let importedScore: Score | null = null

      if (importType === 'pdf' && pdfFile) {
        setProcessingMessage(
          t('scorebook:processing.analyzing', 'Analyzing with AI...')
        )
        importedScore = await scoreService.uploadScore(pdfFile, {
          title: metadata.title || pdfFile.name.replace('.pdf', ''),
        })
      } else if (importType === 'images' && imageFiles.length > 0) {
        setProcessingMessage(
          t('scorebook:processing.composing', 'Composing images...')
        )
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
          title: metadata.title || imageFiles[0].name.replace(/\.[^/.]+$/, ''),
        })

        if (result.success) {
          importedScore = result.data
        } else {
          throw new Error(result.error || 'Import failed')
        }
      } else if (importType === 'url' && importUrl) {
        setProcessingMessage(
          t('scorebook:processing.fetching', 'Fetching from URL...')
        )
        const result = await scoreService.importScore({ url: importUrl })

        if (result.success) {
          importedScore = result.data
        } else {
          throw new Error(result.error || 'Import failed')
        }
      }

      clearInterval(progressInterval)
      setProcessingProgress(100)

      if (importedScore) {
        setTempScoreId(importedScore.id)

        // Update metadata with AI-extracted values
        setMetadata({
          title: importedScore.title || metadata.title,
          composer: importedScore.composer || '',
          opus: importedScore.opus || undefined,
          instrument: importedScore.instrument || 'piano',
          difficulty: importedScore.difficulty || 'intermediate',
          key_signature: importedScore.key_signature || undefined,
          time_signature: importedScore.time_signature || undefined,
          tempo_marking: importedScore.tempo_marking || undefined,
          style_period: importedScore.style_period || undefined,
          confidence:
            (importedScore.metadata as ExtractedMetadata['confidence']) ||
            undefined,
        })

        // Get thumbnail
        if (importedScore.id) {
          setThumbnailUrl(scoreService.getScorePageUrl(importedScore.id, 1))
        }

        setProcessingMessage(
          t('scorebook:processing.complete', 'Processing complete!')
        )

        // Auto-advance to metadata step
        setTimeout(() => {
          setCurrentStep('metadata')
          setIsProcessing(false)
        }, 500)
      }
    } catch (err) {
      console.error('Processing failed:', err)
      setError(
        err instanceof Error
          ? err.message
          : t('scorebook:errors.processingFailed', 'Processing failed')
      )
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  // Handle step navigation
  const goToNextStep = async () => {
    const stepOrder: WizardStep[] = [
      'upload',
      'processing',
      'metadata',
      'collections',
    ]
    const currentIndex = stepOrder.indexOf(currentStep)

    if (currentStep === 'upload') {
      // Start processing
      setCurrentStep('processing')
      await processUpload()
    } else if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const goToPreviousStep = () => {
    const stepOrder: WizardStep[] = [
      'upload',
      'processing',
      'metadata',
      'collections',
    ]
    const currentIndex = stepOrder.indexOf(currentStep)

    if (currentIndex > 0) {
      // Skip processing step when going back
      if (stepOrder[currentIndex - 1] === 'processing') {
        setCurrentStep('upload')
      } else {
        setCurrentStep(stepOrder[currentIndex - 1])
      }
    }
  }

  // Final save
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // The score was already created during processing
      // We just need to update metadata and add to collections
      if (tempScoreId) {
        // Add to selected collections
        if (selectedCollections.size > 0) {
          const collectionPromises = Array.from(selectedCollections).map(
            collectionId =>
              scoreService.addScoreToCollection(collectionId, tempScoreId!)
          )
          await Promise.all(collectionPromises)
        }

        // Fetch the final score data
        const finalScore = await scoreService.getScore(tempScoreId)

        if (onSuccess) {
          onSuccess(finalScore, Array.from(selectedCollections))
        }

        onClose()
      }
    } catch (err) {
      console.error('Save failed:', err)
      setError(
        err instanceof Error
          ? err.message
          : t('scorebook:errors.saveFailed', 'Save failed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-morandi-stone-800 mb-2 text-center">
          {t('scorebook:importScore', 'Import Score')}
        </h2>

        {/* Step indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-morandi-rose-50 border border-morandi-rose-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-morandi-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-morandi-rose-700">{error}</p>
          </div>
        )}

        {/* Step content */}
        <div className="min-h-[300px]">
          {/* Upload Step */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* Import type selector */}
              <div className="flex gap-2 justify-center">
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

              {/* Upload area */}
              {importType === 'pdf' && (
                <label className="block">
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
                      'hover:border-morandi-sage-400 hover:bg-morandi-sage-50',
                      pdfFile
                        ? 'border-morandi-sage-500 bg-morandi-sage-50'
                        : 'border-morandi-stone-300'
                    )}
                  >
                    <Upload className="w-10 h-10 mx-auto mb-3 text-morandi-stone-400" />
                    <p className="text-morandi-stone-600 mb-1">
                      {pdfFile
                        ? pdfFile.name
                        : t(
                            'scorebook:uploadPrompt',
                            'Drop PDF files here or click to browse'
                          )}
                    </p>
                    <p className="text-xs text-morandi-stone-400">
                      {t('scorebook:maxSize', 'Maximum file size: 50MB')}
                    </p>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfSelect}
                      className="sr-only"
                    />
                  </div>
                </label>
              )}

              {importType === 'images' && (
                <label className="block">
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
                      'hover:border-morandi-sage-400 hover:bg-morandi-sage-50',
                      imageFiles.length > 0
                        ? 'border-morandi-sage-500 bg-morandi-sage-50'
                        : 'border-morandi-stone-300'
                    )}
                  >
                    <Upload className="w-10 h-10 mx-auto mb-3 text-morandi-stone-400" />
                    <p className="text-morandi-stone-600 mb-1">
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
                    <p className="text-xs text-morandi-stone-400">
                      {t('scorebook:imageFormats', 'JPG, PNG, WebP supported')}
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
              )}

              {importType === 'url' && (
                <div className="space-y-3">
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
                    fullWidth
                  />
                  <p className="text-xs text-morandi-stone-500">
                    {t(
                      'scorebook:importUrlHelp',
                      'Enter a direct link to a PDF file. IMSLP links are also supported.'
                    )}
                  </p>
                </div>
              )}

              {/* AI feature highlight */}
              <div className="flex items-center gap-3 p-4 bg-morandi-sage-50 rounded-lg">
                <Sparkles className="w-8 h-8 text-morandi-sage-600" />
                <div>
                  <p className="text-sm font-medium text-morandi-stone-800">
                    {t(
                      'scorebook:aiExtraction',
                      'AI-Powered Metadata Extraction'
                    )}
                  </p>
                  <p className="text-xs text-morandi-stone-600">
                    {t(
                      'scorebook:aiExtractionDesc',
                      'Title, composer, difficulty, and more will be automatically detected'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {currentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-morandi-stone-200 rounded-full">
                  <div
                    className="absolute inset-0 border-4 border-morandi-sage-500 rounded-full"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% ${processingProgress}%, 0 ${processingProgress}%)`,
                    }}
                  />
                </div>
                <Loader2 className="w-10 h-10 text-morandi-sage-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
              </div>

              <p className="text-lg font-medium text-morandi-stone-800 mb-2">
                {processingMessage}
              </p>
              <p className="text-sm text-morandi-stone-500">
                {processingProgress}% complete
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-xs mt-4 bg-morandi-stone-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-morandi-sage-500 transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Metadata Review Step */}
          {currentStep === 'metadata' && (
            <div className="space-y-6">
              <div className="flex gap-6">
                {/* Thumbnail preview */}
                <div className="w-32 flex-shrink-0">
                  <div className="aspect-[3/4] bg-morandi-stone-100 rounded-lg overflow-hidden">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt="Score preview"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-morandi-stone-300" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata form */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-morandi-stone-700">
                      {t('scorebook:extractedMetadata', 'Extracted Metadata')}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                      className="flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      {isEditingMetadata
                        ? t('common:done', 'Done')
                        : t('common:edit', 'Edit')}
                    </Button>
                  </div>

                  {/* Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-morandi-stone-600">
                        {t('scorebook:title', 'Title')} *
                      </label>
                      <ConfidenceIndicator
                        confidence={metadata.confidence?.title}
                      />
                    </div>
                    <Input
                      value={metadata.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMetadata(prev => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      disabled={!isEditingMetadata}
                      fullWidth
                    />
                  </div>

                  {/* Composer */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-morandi-stone-600">
                        {t('scorebook:composer', 'Composer')} *
                      </label>
                      <ConfidenceIndicator
                        confidence={metadata.confidence?.composer}
                      />
                    </div>
                    <Input
                      value={metadata.composer}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMetadata(prev => ({
                          ...prev,
                          composer: e.target.value,
                        }))
                      }
                      disabled={!isEditingMetadata}
                      fullWidth
                    />
                  </div>

                  {/* Opus */}
                  <div>
                    <label className="text-sm font-medium text-morandi-stone-600 mb-1 block">
                      {t('scorebook:opus', 'Opus/Catalog Number')}
                    </label>
                    <Input
                      value={metadata.opus || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMetadata(prev => ({ ...prev, opus: e.target.value }))
                      }
                      disabled={!isEditingMetadata}
                      placeholder="e.g., Op. 27, BWV 846"
                      fullWidth
                    />
                  </div>

                  {/* Instrument & Difficulty row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-morandi-stone-600 mb-1 block">
                        {t('scorebook:instrument', 'Instrument')}
                      </label>
                      <Select
                        value={metadata.instrument}
                        onChange={value =>
                          setMetadata(prev => ({
                            ...prev,
                            instrument: value as typeof metadata.instrument,
                          }))
                        }
                        options={instrumentOptions}
                        disabled={!isEditingMetadata}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-morandi-stone-600">
                          {t('scorebook:difficulty', 'Difficulty')}
                        </label>
                        <ConfidenceIndicator
                          confidence={metadata.confidence?.difficulty}
                        />
                      </div>
                      <Select
                        value={metadata.difficulty}
                        onChange={value =>
                          setMetadata(prev => ({
                            ...prev,
                            difficulty: value as typeof metadata.difficulty,
                          }))
                        }
                        options={difficultyOptions}
                        disabled={!isEditingMetadata}
                      />
                    </div>
                  </div>

                  {/* Additional metadata (collapsible) */}
                  {isEditingMetadata && (
                    <div className="space-y-4 pt-4 border-t border-morandi-stone-200">
                      <p className="text-xs text-morandi-stone-500">
                        {t(
                          'scorebook:additionalMetadata',
                          'Additional Details'
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-morandi-stone-600 mb-1 block">
                            {t('scorebook:keySignature', 'Key')}
                          </label>
                          <Input
                            value={metadata.key_signature || ''}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setMetadata(prev => ({
                                ...prev,
                                key_signature: e.target.value,
                              }))
                            }
                            placeholder="e.g., C major"
                            fullWidth
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-morandi-stone-600 mb-1 block">
                            {t('scorebook:timeSignature', 'Time')}
                          </label>
                          <Input
                            value={metadata.time_signature || ''}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setMetadata(prev => ({
                                ...prev,
                                time_signature: e.target.value,
                              }))
                            }
                            placeholder="e.g., 4/4"
                            fullWidth
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-morandi-stone-600 mb-1 block">
                          {t('scorebook:stylePeriod', 'Style Period')}
                        </label>
                        <Select
                          value={metadata.style_period || ''}
                          onChange={value =>
                            setMetadata(prev => ({
                              ...prev,
                              style_period: value as string,
                            }))
                          }
                          options={stylePeriodOptions}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Collections Step */}
          {currentStep === 'collections' && (
            <div className="space-y-4">
              <p className="text-sm text-morandi-stone-600">
                {t(
                  'scorebook:selectCollections',
                  'Choose which collections to add this score to:'
                )}
              </p>

              {isLoadingCollections ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-morandi-sage-500" />
                </div>
              ) : userCollections.length === 0 ? (
                <div className="text-center py-8 bg-morandi-stone-50 rounded-lg">
                  <p className="text-morandi-stone-600 mb-2">
                    {t('scorebook:noCollections', 'No collections yet')}
                  </p>
                  <p className="text-sm text-morandi-stone-500">
                    {t(
                      'scorebook:createCollectionLater',
                      'You can organize your scores into collections later'
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {userCollections.map(collection => (
                    <label
                      key={collection.id}
                      className={cn(
                        'flex items-center p-3 rounded-lg border cursor-pointer transition-all',
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
                      <div className="flex-1">
                        <span className="text-sm font-medium text-morandi-stone-700">
                          {collection.name}
                        </span>
                        {collection.is_default && (
                          <span className="ml-2 text-xs text-morandi-sage-600">
                            ({t('scorebook:default', 'Default')})
                          </span>
                        )}
                        {collection.description && (
                          <p className="text-xs text-morandi-stone-500 mt-0.5">
                            {collection.description}
                          </p>
                        )}
                      </div>
                      {selectedCollections.has(collection.id) && (
                        <Check className="w-5 h-5 text-morandi-sage-600" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-morandi-stone-200">
          <Button
            variant="ghost"
            onClick={currentStep === 'upload' ? onClose : goToPreviousStep}
            disabled={isProcessing || isSaving}
          >
            {currentStep === 'upload' ? (
              t('common:cancel', 'Cancel')
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('common:back', 'Back')}
              </>
            )}
          </Button>

          {currentStep === 'collections' ? (
            <Button
              variant="primary"
              onClick={handleSave}
              loading={isSaving}
              disabled={!canProceed()}
            >
              {t('scorebook:saveScore', 'Save Score')}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={goToNextStep}
              disabled={!canProceed() || isProcessing}
              loading={isProcessing && currentStep === 'upload'}
            >
              {currentStep === 'upload' ? (
                <>
                  {t('scorebook:processScore', 'Process Score')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  {t('common:next', 'Next')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
