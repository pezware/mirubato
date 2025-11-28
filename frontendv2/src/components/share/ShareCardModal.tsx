import { useRef, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Copy,
  Check,
  Share2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Modal, ModalFooter } from '../ui/Modal'
import Button from '../ui/Button'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ShareCardPreview, type CardVariant } from './ShareCardPreview'
import { useShareCard } from '../../hooks/useShareCard'

interface ShareCardModalProps {
  isOpen: boolean
  onClose: () => void
}

// Convert base64 data URL to Blob (CSP-safe, doesn't use fetch)
function dataUrlToBlob(dataUrl: string): Blob {
  const base64Data = dataUrl.split(',')[1]
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type: 'image/png' })
}

// Generate image from HTML element using canvas
async function generateImage(
  element: HTMLElement,
  scale: number = 2
): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const rect = element.getBoundingClientRect()
  canvas.width = rect.width * scale
  canvas.height = rect.height * scale
  ctx.scale(scale, scale)

  const data = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          ${element.outerHTML}
        </div>
      </foreignObject>
    </svg>
  `

  const img = new Image()
  const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise(resolve => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(blob), 'image/png', 1.0)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

export function ShareCardModal({ isOpen, onClose }: ShareCardModalProps) {
  const { t } = useTranslation(['common', 'share'])
  const cardRef = useRef<HTMLDivElement>(null)
  const shareCardData = useShareCard()

  const [variant, setVariant] = useState<CardVariant>('story')
  const [showUsername, setShowUsername] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Check if user has notes to share (only for day cards)
  const hasNotes =
    shareCardData.viewMode === 'day' && shareCardData.periodNotes.length > 0

  const viewModeOptions = [
    { value: 'day', label: t('share:daily', 'Daily') },
    { value: 'week', label: t('share:weekly', 'Weekly') },
  ]

  const variantOptions = [
    { value: 'story', label: t('share:story', 'Story') },
    { value: 'square', label: t('share:square', 'Square') },
  ]

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return

    setIsGenerating(true)
    try {
      let blob: Blob | null = null

      try {
        const { toPng } = await import('html-to-image')
        const dataUrl = await toPng(cardRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#f5f3f0',
          skipFonts: true,
          cacheBust: true,
        })

        blob = dataUrlToBlob(dataUrl)
      } catch (err) {
        console.error('html-to-image failed:', err)
        blob = await generateImage(cardRef.current)
      }

      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const modeLabel = shareCardData.viewMode === 'week' ? 'weekly' : 'daily'
        link.download = `mirubato-${modeLabel}-${variant}-${new Date().toISOString().split('T')[0]}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to generate image:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [variant, shareCardData.viewMode])

  const handleCopyToClipboard = useCallback(async () => {
    if (!cardRef.current) return

    setIsGenerating(true)
    try {
      let blob: Blob | null = null

      try {
        const { toPng } = await import('html-to-image')
        const dataUrl = await toPng(cardRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#f5f3f0',
          skipFonts: true,
          cacheBust: true,
        })
        blob = dataUrlToBlob(dataUrl)
      } catch (err) {
        console.error('html-to-image failed:', err)
        blob = await generateImage(cardRef.current)
      }

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const handleNativeShare = useCallback(async () => {
    if (!cardRef.current || !navigator.share) return

    setIsGenerating(true)
    try {
      let blob: Blob | null = null

      try {
        const { toPng } = await import('html-to-image')
        const dataUrl = await toPng(cardRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#f5f3f0',
          skipFonts: true,
          cacheBust: true,
        })
        blob = dataUrlToBlob(dataUrl)
      } catch (err) {
        console.error('html-to-image failed:', err)
        blob = await generateImage(cardRef.current)
      }

      if (blob) {
        const file = new File(
          [blob],
          `mirubato-practice-${new Date().toISOString().split('T')[0]}.png`,
          { type: 'image/png' }
        )

        const shareTitle =
          shareCardData.viewMode === 'week'
            ? t('share:shareWeeklyTitle', "This Week's Practice")
            : t('share:shareTitle', "Today's Practice")

        await navigator.share({
          title: shareTitle,
          text: t(
            'share:shareText',
            'Check out my practice session on Mirubato!'
          ),
          files: [file],
        })
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to share:', error)
      }
    } finally {
      setIsGenerating(false)
    }
  }, [t, shareCardData.viewMode])

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  // Calculate preview scale - simpler now with flexible card height
  const previewScale = variant === 'story' ? 0.42 : 0.52

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('share:shareCard', 'Share Practice Card')}
      size="xl"
      isMobileOptimized
    >
      <div className="flex flex-col gap-3 max-h-[calc(85vh-140px)] overflow-hidden">
        {/* Navigation and View Mode Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 pb-2 border-b border-gray-100">
          {/* Period Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={shareCardData.goBack}
              disabled={!shareCardData.canGoBack}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t('share:previous', 'Previous')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
              {shareCardData.periodLabel.replace(/ \(.*\)$/, '')}
            </span>
            <button
              onClick={shareCardData.goForward}
              disabled={!shareCardData.canGoForward}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t('share:next', 'Next')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <SegmentedControl
            options={viewModeOptions}
            value={shareCardData.viewMode}
            onChange={value =>
              shareCardData.setViewMode(value as 'day' | 'week')
            }
            size="sm"
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Preview Panel - proper scrollable container */}
          <div className="flex-1 overflow-auto flex items-start justify-center py-2">
            <div
              className="rounded-xl shadow-lg"
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
              }}
            >
              <ShareCardPreview
                ref={cardRef}
                data={shareCardData}
                variant={variant}
                showUsername={showUsername}
                showNotes={showNotes}
              />
            </div>
          </div>

          {/* Options Panel */}
          <div className="lg:w-56 space-y-4 flex-shrink-0 overflow-y-auto">
            {/* Card Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('share:cardSize', 'Card Size')}
              </label>
              <SegmentedControl
                options={variantOptions}
                value={variant}
                onChange={value => setVariant(value as CardVariant)}
                size="sm"
              />
            </div>

            {/* Show Username Toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUsername}
                  onChange={e => setShowUsername(e.target.checked)}
                  className="rounded border-gray-300 text-morandi-sage-500 focus:ring-morandi-sage-500"
                />
                <span className="text-sm text-gray-700">
                  {t('share:showUsername', 'Show username')}
                </span>
              </label>
            </div>

            {/* Show Notes Toggle */}
            {hasNotes && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showNotes}
                    onChange={e => setShowNotes(e.target.checked)}
                    className="rounded border-gray-300 text-morandi-sage-500 focus:ring-morandi-sage-500"
                  />
                  <span className="text-sm text-gray-700">
                    {t('share:showNotes', 'Include practice notes')}
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  {t(
                    'share:notesHint',
                    "Share your thoughts from today's practice"
                  )}
                </p>
              </div>
            )}

            {/* No Data Notice */}
            {!shareCardData.hasData && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  {shareCardData.viewMode === 'week'
                    ? t(
                        'share:noWeeklyDataNotice',
                        'No practice data for this week.'
                      )
                    : t(
                        'share:noDataNotice',
                        'No practice data for today. Add an entry to share your progress!'
                      )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalFooter className="flex-shrink-0 border-t border-gray-100 pt-4 mt-2">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {canNativeShare && (
            <Button
              onClick={handleNativeShare}
              disabled={isGenerating}
              variant="primary"
              className="flex-1 sm:flex-none"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t('share:share', 'Share')}
            </Button>
          )}
          <Button
            onClick={handleCopyToClipboard}
            disabled={isGenerating}
            variant="secondary"
            className="flex-1 sm:flex-none"
          >
            {copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? t('share:copied', 'Copied!') : t('share:copy', 'Copy')}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            variant="secondary"
            className="flex-1 sm:flex-none"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('share:download', 'Download')}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
