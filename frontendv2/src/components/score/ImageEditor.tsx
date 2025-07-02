import { useState, useRef, useCallback } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageEditorProps {
  imageUrl: string
  onSave: (editedImageBlob: Blob) => void
  onCancel: () => void
}

export default function ImageEditor({
  imageUrl,
  onSave,
  onCancel,
}: ImageEditorProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) return

    const image = imgRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = completedCrop.width
    canvas.height = completedCrop.height

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    )

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas is empty'))
        },
        'image/jpeg',
        0.95
      )
    })
  }, [completedCrop, brightness, contrast])

  const handleSave = async () => {
    const croppedImageBlob = await getCroppedImg()
    if (croppedImageBlob) {
      onSave(croppedImageBlob)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto md:w-[90vw] lg:w-[80vw] xl:max-w-4xl">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-morandi-stone-200">
          <h2 className="text-lg md:text-xl font-semibold text-morandi-stone-800">
            Edit Image
          </h2>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Crop Area - Responsive sizing */}
          <div className="relative bg-morandi-stone-100 rounded-lg overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              aspect={undefined}
              className="max-h-[40vh] md:max-h-[50vh] lg:max-h-[60vh]"
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Upload"
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  maxHeight: '60vh',
                  maxWidth: '100%',
                  height: 'auto',
                  width: 'auto',
                }}
                className="mx-auto"
              />
            </ReactCrop>
          </div>

          {/* Adjustment Controls - Mobile optimized */}
          <div className="space-y-4 bg-morandi-stone-50 p-4 md:p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-morandi-stone-700 mb-2">
                  <span>Brightness</span>
                  <span className="text-morandi-sage-600 font-normal">
                    {brightness}%
                  </span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full h-2 bg-morandi-stone-200 rounded-lg appearance-none cursor-pointer touch-none"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-morandi-stone-700 mb-2">
                  <span>Contrast</span>
                  <span className="text-morandi-sage-600 font-normal">
                    {contrast}%
                  </span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                  className="w-full h-2 bg-morandi-stone-200 rounded-lg appearance-none cursor-pointer touch-none"
                />
              </div>
            </div>
          </div>

          {/* Preview Canvas (hidden) */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons - Mobile responsive */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-morandi-stone-200">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2.5 text-morandi-stone-600 bg-morandi-stone-100 hover:bg-morandi-stone-200 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <div className="flex gap-3 flex-1 sm:flex-none">
              <button
                onClick={() => {
                  setBrightness(100)
                  setContrast(100)
                  setCrop(undefined)
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 text-morandi-stone-600 bg-morandi-stone-100 hover:bg-morandi-stone-200 rounded-lg transition-colors text-sm font-medium"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-morandi-sage-500 text-white hover:bg-morandi-sage-600 rounded-lg transition-colors text-sm font-medium shadow-sm"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
