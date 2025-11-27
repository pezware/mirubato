import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Copy, Check, Share2 } from 'lucide-react'
import { Modal, ModalFooter } from '../ui/Modal'
import Button from '../ui/Button'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ShareCardPreview, type CardVariant } from './ShareCardPreview'
import { WeeklyShareCardPreview } from './WeeklyShareCardPreview'
import { useShareCard } from '../../hooks/useShareCard'
import { useWeeklyShareCard } from '../../hooks/useWeeklyShareCard'

type CardType = 'daily' | 'weekly'

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
  // Create a canvas with the scaled dimensions
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const rect = element.getBoundingClientRect()
  canvas.width = rect.width * scale
  canvas.height = rect.height * scale
  ctx.scale(scale, scale)

  // Use foreignObject to render HTML to canvas
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
  const weeklyCardData = useWeeklyShareCard()

  const [cardType, setCardType] = useState<CardType>('daily')
  const [variant, setVariant] = useState<CardVariant>('story')
  const [showUsername, setShowUsername] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Check if user has notes to share
  const hasNotes = shareCardData.todayNotes.length > 0
  const isWeekly = cardType === 'weekly'

  const cardTypeOptions = [
    { value: 'daily', label: t('share:daily', 'Daily') },
    { value: 'weekly', label: t('share:weekly', 'Weekly') },
  ]

  const variantOptions = [
    { value: 'story', label: t('share:story', 'Story (9:16)') },
    { value: 'square', label: t('share:square', 'Square (1:1)') },
    { value: 'long', label: t('share:long', 'Long (Full Notes)') },
  ]

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return

    setIsGenerating(true)
    try {
      // Try to use html-to-image if available, otherwise use native approach
      let blob: Blob | null = null

      try {
        // Dynamic import for html-to-image
        const { toPng } = await import('html-to-image')
        const dataUrl = await toPng(cardRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#f5f3f0',
          // Skip font embedding to avoid CSP issues with Google Fonts
          skipFonts: true,
          // Ensure we capture the element properly
          cacheBust: true,
        })

        blob = dataUrlToBlob(dataUrl)
      } catch (err) {
        console.error('html-to-image failed:', err)
        // Fallback: try generateImage
        blob = await generateImage(cardRef.current)
      }

      if (blob) {
        // Create download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `mirubato-${isWeekly ? 'weekly' : variant}-${new Date().toISOString().split('T')[0]}.png`
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
  }, [variant, isWeekly])

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

        await navigator.share({
          title: t('share:shareTitle', "Today's Practice"),
          text: t(
            'share:shareText',
            'Check out my practice session on Mirubato!'
          ),
          files: [file],
        })
      }
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to share:', error)
      }
    } finally {
      setIsGenerating(false)
    }
  }, [t])

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('share:shareCard', 'Share Practice Card')}
      size="xl"
      isMobileOptimized
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Preview Panel */}
        <div className="flex-1 flex flex-col items-center">
          <div
            className="overflow-auto max-h-[60vh] rounded-xl shadow-lg"
            style={{ transform: 'scale(0.55)', transformOrigin: 'top center' }}
          >
            {isWeekly ? (
              <WeeklyShareCardPreview
                ref={cardRef}
                data={weeklyCardData}
                showUsername={showUsername}
              />
            ) : (
              <ShareCardPreview
                ref={cardRef}
                data={shareCardData}
                variant={variant}
                showUsername={showUsername}
                showNotes={showNotes}
              />
            )}
          </div>
        </div>

        {/* Options Panel */}
        <div className="lg:w-64 space-y-4">
          {/* Card Type (Daily/Weekly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('share:cardType', 'Card Type')}
            </label>
            <SegmentedControl
              options={cardTypeOptions}
              value={cardType}
              onChange={value => setCardType(value as CardType)}
              size="sm"
            />
          </div>

          {/* Card Size - only for daily */}
          {!isWeekly && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('share:cardSize', 'Card Size')}
              </label>
              <SegmentedControl
                options={variantOptions}
                value={variant}
                onChange={value => {
                  const newVariant = value as CardVariant
                  setVariant(newVariant)
                  // Auto-enable notes for long variant
                  if (newVariant === 'long' && hasNotes) {
                    setShowNotes(true)
                  }
                }}
                size="sm"
              />
            </div>
          )}

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

          {/* Show Notes Toggle - only for daily */}
          {!isWeekly && hasNotes && (
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
          {(isWeekly ? !weeklyCardData.hasData : !shareCardData.hasData) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                {isWeekly
                  ? t(
                      'share:noWeeklyDataNotice',
                      'No practice data this week. Add some entries to share your weekly progress!'
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

      <ModalFooter>
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
