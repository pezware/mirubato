import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useScoreStore } from '../../stores/scoreStore'
import { useAuthStore } from '../../stores/authStore'
import { scoreService } from '../../services/scoreService'
import Autocomplete from '../ui/Autocomplete'
import { useScoreSearch } from '../../hooks/useScoreSearch'
import ImageEditor from './ImageEditor'
import Button from '../ui/Button'
import { X, Upload, Trash2, Edit } from 'lucide-react'
import { sanitizeImageUrl, getFallbackImageUrl } from '../../utils/urlSanitizer'

export default function ScoreManagement() {
  const { t } = useTranslation(['scorebook', 'common', 'ui'])
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { toggleManagement, userLibrary, loadUserLibrary } = useScoreStore()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'images'>(
    'file'
  )
  const [uploadUrl, setUploadUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    scoreId?: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imageTitle, setImageTitle] = useState('')
  const [imageComposer, setImageComposer] = useState('')
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(
    null
  )
  const [processedImages, setProcessedImages] = useState<
    {
      file: File
      preview: string
      edited?: boolean
    }[]
  >([])

  // Use the score search hook for predictive search
  const scoreSearch = useScoreSearch({ minLength: 0 })

  // Load user library on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadUserLibrary()
    }
  }, [isAuthenticated, loadUserLibrary])

  const handleScoreSelect = (scoreId: string) => {
    navigate(`/scorebook/${scoreId}`)
    toggleManagement()
  }

  // File upload handlers
  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      setUploadResult({
        success: false,
        message: 'Please select a valid PDF file',
      })
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async e => {
        try {
          const base64 = e.target?.result as string

          const response = await scoreService.importScore({
            url: base64,
            filename: file.name,
          })

          if (response.success) {
            setUploadResult({
              success: true,
              message: `Successfully uploaded ${response.data.title}`,
              scoreId: response.data.id,
            })
            // Reload user library with error handling
            try {
              await loadUserLibrary()
            } catch (libError) {
              console.error('Failed to reload library:', libError)
              // Don't fail the whole upload if library reload fails
            }
          } else {
            setUploadResult({
              success: false,
              message: response.error || 'Upload failed',
            })
          }
        } catch (error) {
          console.error('Import API error:', error)
          setUploadResult({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : 'Upload failed. Please try again.',
          })
        } finally {
          // Always clear uploading state
          setIsUploading(false)
        }
      }
      reader.onerror = () => {
        console.error('FileReader error')
        setUploadResult({
          success: false,
          message: 'Failed to read file. Please try again.',
        })
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadResult({
        success: false,
        message: 'Upload failed. Please try again.',
      })
      setIsUploading(false)
    }
  }

  // Handle image uploads
  const handleImageUpload = async (files: File[]) => {
    // Validate files
    const validImages = files.filter(file =>
      ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)
    )

    if (validImages.length === 0) {
      setUploadResult({
        success: false,
        message: 'Please select valid image files (PNG, JPG, JPEG)',
      })
      return
    }

    if (validImages.length > 20) {
      setUploadResult({
        success: false,
        message: 'Maximum 20 images allowed per score',
      })
      return
    }

    setSelectedImages(validImages)
    setUploadResult(null)

    // Create preview URLs for images
    const previews = validImages.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      edited: false,
    }))
    setProcessedImages(previews)
  }

  // Handle image editing
  const handleEditImage = (index: number) => {
    setEditingImageIndex(index)
  }

  const handleSaveEditedImage = async (editedBlob: Blob) => {
    if (editingImageIndex === null) return

    // Convert blob to File
    const originalFile = processedImages[editingImageIndex].file
    const editedFile = new File([editedBlob], originalFile.name, {
      type: editedBlob.type,
    })

    // Update processed images
    const newProcessedImages = [...processedImages]
    newProcessedImages[editingImageIndex] = {
      file: editedFile,
      preview: URL.createObjectURL(editedBlob),
      edited: true,
    }
    setProcessedImages(newProcessedImages)

    // Update selected images
    const newSelectedImages = [...selectedImages]
    newSelectedImages[editingImageIndex] = editedFile
    setSelectedImages(newSelectedImages)

    setEditingImageIndex(null)
  }

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      processedImages.forEach(img => {
        if (img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview)
        }
      })
    }
  }, [processedImages])

  const submitImageUpload = async () => {
    if (selectedImages.length === 0) return

    setIsUploading(true)
    setUploadResult(null)

    try {
      // Convert images to base64
      const imagesData = await Promise.all(
        selectedImages.map(async file => {
          return new Promise<{ filename: string; data: string }>(
            (resolve, reject) => {
              const reader = new FileReader()
              reader.onload = e => {
                resolve({
                  filename: file.name,
                  data: e.target?.result as string,
                })
              }
              reader.onerror = reject
              reader.readAsDataURL(file)
            }
          )
        })
      )

      const response = await scoreService.importImages({
        images: imagesData,
        title: imageTitle || undefined,
        composer: imageComposer || undefined,
      })

      if (response.success) {
        setUploadResult({
          success: true,
          message: `Successfully uploaded ${response.data.title}`,
          scoreId: response.data.id,
        })
        // Clear form
        setSelectedImages([])
        setProcessedImages([])
        setImageTitle('')
        setImageComposer('')
        if (imageInputRef.current) imageInputRef.current.value = ''

        loadUserLibrary() // Reload user library
      } else {
        setUploadResult({
          success: false,
          message: response.error || 'Upload failed',
        })
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      setUploadResult({
        success: false,
        message: 'Upload failed. Please try again.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlImport = async () => {
    if (!uploadUrl.trim()) {
      setUploadResult({
        success: false,
        message: 'Please enter a URL',
      })
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const response = await scoreService.importScore({ url: uploadUrl })

      if (response.success) {
        setUploadResult({
          success: true,
          message: `Successfully imported ${response.data.title}`,
          scoreId: response.data.id,
        })
        // Reload user library with error handling
        try {
          await loadUserLibrary()
        } catch (libError) {
          console.error('Failed to reload library:', libError)
          // Don't fail the whole upload if library reload fails
        }
        setUploadUrl('')
      } else {
        setUploadResult({
          success: false,
          message: response.error || 'Import failed',
        })
      }
    } catch (error) {
      console.error('Import failed:', error)
      setUploadResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Import failed. Please try again.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (target.classList.contains('drop-zone')) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)

    if (uploadMode === 'file') {
      const pdfFile = files.find(file => file.type === 'application/pdf')
      if (pdfFile) {
        handleFileUpload(pdfFile)
      } else {
        setUploadResult({
          success: false,
          message: 'Please drop a PDF file',
        })
      }
    } else if (uploadMode === 'images') {
      handleImageUpload(files)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={toggleManagement}>
      <div
        className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-morandi-stone-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-morandi-stone-800">
              {t('scorebook:scoreManagement', 'Score Management')}
            </h3>
            <Button onClick={toggleManagement} variant="ghost" size="icon-md">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Search Scores */}
            <div>
              <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                {t('scorebook:searchScores', 'Search Scores')}
              </h4>
              <Autocomplete
                value={scoreSearch.query}
                onChange={query => scoreSearch.setQuery(query)}
                onSelect={option => {
                  // Navigate to the selected score
                  handleScoreSelect(option.value)
                }}
                options={scoreSearch.suggestions}
                placeholder={t(
                  'scorebook:searchPlaceholder',
                  'Search by title, composer...'
                )}
                isLoading={scoreSearch.isLoading}
                className="w-full"
                inputClassName="bg-morandi-stone-50"
                dropdownClassName="max-h-80"
                emptyMessage={
                  scoreSearch.query.length < 2
                    ? t('scorebook:typeToSearch', 'Type to search...')
                    : t('scorebook:noResults', 'No scores found')
                }
              />

              {/* Show recent results if there are any */}
              {scoreSearch.results.length > 0 && scoreSearch.query && (
                <div className="mt-3 text-xs text-morandi-stone-500">
                  {t(
                    'scorebook:foundResults',
                    `Found ${scoreSearch.results.length} scores`
                  )}
                </div>
              )}

              {/* Error message */}
              {scoreSearch.error && (
                <div className="mt-2 text-sm text-red-600">
                  {scoreSearch.error}
                </div>
              )}
            </div>

            {/* Upload Score (Authenticated only) */}
            {isAuthenticated && (
              <div>
                <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                  {t('scorebook:uploadScore', 'Upload New Score')}
                </h4>

                {/* Mode selector */}
                <div className="flex gap-2 mb-3">
                  <Button
                    onClick={() => setUploadMode('file')}
                    variant={uploadMode === 'file' ? 'primary' : 'secondary'}
                    size="sm"
                    className="flex-1"
                  >
                    PDF
                  </Button>
                  <Button
                    onClick={() => setUploadMode('images')}
                    variant={uploadMode === 'images' ? 'primary' : 'secondary'}
                    size="sm"
                    className="flex-1"
                  >
                    Images
                  </Button>
                  <Button
                    onClick={() => setUploadMode('url')}
                    variant={uploadMode === 'url' ? 'primary' : 'secondary'}
                    size="sm"
                    className="flex-1"
                  >
                    URL
                  </Button>
                </div>

                {uploadMode === 'file' ? (
                  <div
                    className={`drop-zone border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-morandi-sage-500 bg-morandi-sage-50'
                        : 'border-morandi-stone-300'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file)
                      }}
                      className="hidden"
                    />
                    <svg
                      className="w-12 h-12 mx-auto text-morandi-stone-400 mb-3"
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
                    <p className="text-sm text-morandi-stone-600 mb-2">
                      {t(
                        'scorebook:uploadPrompt',
                        'Drop PDF files here or click to browse'
                      )}
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      loading={isUploading}
                      size="sm"
                    >
                      {isUploading
                        ? 'Uploading...'
                        : t('scorebook:selectFiles', 'Select Files')}
                    </Button>
                  </div>
                ) : uploadMode === 'images' ? (
                  <div className="space-y-3">
                    {/* Image file input */}
                    <div
                      className={`drop-zone border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging
                          ? 'border-morandi-sage-500 bg-morandi-sage-50'
                          : 'border-morandi-stone-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        multiple
                        onChange={e => {
                          const files = Array.from(e.target.files || [])
                          if (files.length > 0) handleImageUpload(files)
                        }}
                        className="hidden"
                      />
                      <svg
                        className="w-12 h-12 mx-auto text-morandi-stone-400 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm text-morandi-stone-600 mb-2">
                        {t(
                          'scorebook:uploadImagesPrompt',
                          'Drop image files here or click to browse'
                        )}
                      </p>
                      <p className="text-xs text-morandi-stone-500 mb-3">
                        PNG, JPG, JPEG • Max 20 images • 10MB per image
                      </p>
                      <Button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploading}
                        loading={isUploading}
                        size="sm"
                      >
                        {t('scorebook:selectImages', 'Select Images')}
                      </Button>
                    </div>

                    {/* Selected images preview */}
                    {selectedImages.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-morandi-stone-700">
                            {selectedImages.length} image
                            {selectedImages.length > 1 ? 's' : ''} selected
                          </p>
                          <Button
                            onClick={() => {
                              setSelectedImages([])
                              setProcessedImages([])
                              if (imageInputRef.current)
                                imageInputRef.current.value = ''
                            }}
                            variant="danger"
                            size="sm"
                          >
                            Clear
                          </Button>
                        </div>

                        {/* Image previews grid - Responsive */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {processedImages.map((img, index) => (
                            <div
                              key={index}
                              className="relative group aspect-[3/4]"
                            >
                              <img
                                src={
                                  sanitizeImageUrl(img.preview) ||
                                  getFallbackImageUrl()
                                }
                                alt={`Page ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg border border-morandi-stone-200"
                                onError={e => {
                                  e.currentTarget.src = getFallbackImageUrl()
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2">
                                <Button
                                  onClick={() => handleEditImage(index)}
                                  variant="secondary"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  leftIcon={<Edit className="w-3 h-3" />}
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => {
                                    const newImages = selectedImages.filter(
                                      (_, i) => i !== index
                                    )
                                    const newProcessed = processedImages.filter(
                                      (_, i) => i !== index
                                    )
                                    setSelectedImages(newImages)
                                    setProcessedImages(newProcessed)
                                  }}
                                  variant="danger"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  leftIcon={<Trash2 className="w-3 h-3" />}
                                >
                                  Remove
                                </Button>
                              </div>
                              {img.edited && (
                                <div className="absolute top-1 right-1 bg-morandi-sage-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded shadow-sm">
                                  Edited
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Optional metadata */}
                        <input
                          type="text"
                          value={imageTitle}
                          onChange={e => setImageTitle(e.target.value)}
                          placeholder={t(
                            'ui:components.scoreUpload.titlePlaceholder'
                          )}
                          className="w-full px-3 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-sm"
                        />
                        <input
                          type="text"
                          value={imageComposer}
                          onChange={e => setImageComposer(e.target.value)}
                          placeholder={t(
                            'ui:components.scoreUpload.composerPlaceholder'
                          )}
                          className="w-full px-3 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-sm"
                        />

                        <Button
                          onClick={submitImageUpload}
                          disabled={isUploading || selectedImages.length === 0}
                          loading={isUploading}
                          fullWidth
                          size="sm"
                          leftIcon={<Upload className="w-4 h-4" />}
                        >
                          {isUploading ? 'Uploading...' : 'Upload Images'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={uploadUrl}
                      onChange={e => setUploadUrl(e.target.value)}
                      placeholder={t(
                        'ui:components.scoreUpload.urlPlaceholder'
                      )}
                      className="w-full px-3 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-sm"
                    />
                    <Button
                      onClick={handleUrlImport}
                      disabled={isUploading || !uploadUrl.trim()}
                      loading={isUploading}
                      fullWidth
                      size="sm"
                    >
                      {isUploading ? 'Importing...' : 'Import from URL'}
                    </Button>
                    <p className="text-xs text-morandi-stone-500">
                      Import PDFs from Mutopia Project or other sources
                    </p>
                  </div>
                )}

                {/* Upload result message */}
                {uploadResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-sm ${
                      uploadResult.success
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {uploadResult.message}
                    {uploadResult.success && uploadResult.scoreId && (
                      <Button
                        onClick={() => handleScoreSelect(uploadResult.scoreId!)}
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                      >
                        View Score →
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* My Scores (Authenticated only) */}
            {isAuthenticated && userLibrary.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                  {t('scorebook:myScores', 'My Scores')}
                </h4>
                <div className="space-y-2">
                  {userLibrary.slice(0, 5).map(score => (
                    <Button
                      key={score.id}
                      onClick={() => handleScoreSelect(score.id)}
                      variant="secondary"
                      fullWidth
                      className="justify-start text-left p-3"
                    >
                      <div className="w-full">
                        <div className="font-medium text-morandi-stone-800">
                          {score.title}
                        </div>
                        <div className="text-sm text-morandi-stone-600">
                          {score.composer} • {score.instrument}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Editor Modal */}
      {editingImageIndex !== null && processedImages[editingImageIndex] && (
        <ImageEditor
          imageUrl={processedImages[editingImageIndex].preview}
          onSave={handleSaveEditedImage}
          onCancel={() => setEditingImageIndex(null)}
        />
      )}
    </div>
  )
}
