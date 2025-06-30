import { useState, useEffect, useRef } from 'react'
import { cn } from '../../utils/cn'

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  placeholderSrc?: string
  blurAmount?: number
  transitionDuration?: number
  onLoad?: () => void
  onError?: (error: Error) => void
}

export default function ProgressiveImage({
  src,
  alt,
  className,
  placeholderSrc,
  blurAmount = 20,
  transitionDuration = 300,
  onLoad,
  onError,
}: ProgressiveImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholderSrc || '')
  const [imageLoading, setImageLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // Reset state when src changes
    setImageLoading(true)
    setError(null)

    // Start with placeholder if available
    if (placeholderSrc && placeholderSrc !== imageSrc) {
      setImageSrc(placeholderSrc)
    }

    // Load the full image
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      setImageSrc(src)
      setImageLoading(false)
      onLoad?.()
    }

    img.onerror = () => {
      const err = new Error(`Failed to load image: ${src}`)
      setError(err)
      setImageLoading(false)
      onError?.(err)
    }

    img.src = src

    return () => {
      // Clean up by removing event handlers
      img.onload = null
      img.onerror = null
    }
  }, [src, placeholderSrc, onLoad, onError, imageSrc])

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
      >
        <div className="text-center p-4">
          <svg
            className="mx-auto h-12 w-12 mb-2"
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
          <p className="text-sm">Failed to load image</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Placeholder/blurred image */}
      {placeholderSrc && imageLoading && (
        <img
          src={placeholderSrc}
          alt={alt}
          className={cn(
            'absolute inset-0 w-full h-full object-contain',
            'transition-opacity duration-300'
          )}
          style={{
            filter: `blur(${blurAmount}px)`,
            transform: 'scale(1.1)', // Slightly scale to hide blur edges
          }}
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-contain',
          'transition-opacity',
          imageLoading && 'opacity-0',
          !imageLoading && 'opacity-100'
        )}
        style={{
          transitionDuration: `${transitionDuration}ms`,
        }}
      />

      {/* Loading skeleton if no placeholder */}
      {!placeholderSrc && imageLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}
