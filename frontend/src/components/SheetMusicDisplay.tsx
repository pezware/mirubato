import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NotationRenderer } from '../utils/notationRenderer'
import type { SheetMusic } from '../modules/sheetMusic/types'

interface SheetMusicDisplayProps {
  sheetMusic: SheetMusic
  className?: string
  onPageChange?: (page: number) => void
  measuresPerPage?: number
  currentPlayingMeasure?: number // For future auto-flip feature
}

export const SheetMusicDisplay: React.FC<SheetMusicDisplayProps> = ({
  sheetMusic,
  className = '',
  onPageChange,
  measuresPerPage = 4,
  currentPlayingMeasure,
}) => {
  const [currentPage, setCurrentPage] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth)
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const notationRef = useRef<HTMLDivElement>(null)
  const notationRendererRef = useRef<NotationRenderer | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      notationRendererRef.current?.dispose()
      notationRendererRef.current = null
    }
  }, [])
  const touchStartX = useRef<number | null>(null)

  // Determine if we're in mobile portrait
  const isMobilePortrait =
    viewportWidth < 640 && viewportHeight > viewportWidth * 1.2

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth)
      setViewportHeight(window.innerHeight)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate responsive dimensions
  const getNotationDimensions = useCallback(() => {
    if (isMobilePortrait) {
      // Mobile portrait: optimize for readability and viewport usage
      const containerPadding = 16 // Total horizontal padding
      // Calculate how many measures can fit vertically
      // More accurate calculation: header ~80px, piece info ~60px, controls ~180px, padding ~30px = 350px
      const availableHeight = viewportHeight - 350
      // Each measure needs about 150px height at 0.9 scale (reduced for better fit)
      const measuresPerPage = Math.max(
        2, // Minimum 2 measures to better use space
        Math.min(4, Math.floor(availableHeight / 150))
      )

      return {
        width: viewportWidth - containerPadding,
        scale: 0.8, // Slightly smaller to fit more measures
        measuresPerLine: 1,
        measuresPerPage, // Dynamic based on viewport height
      }
    } else if (viewportWidth < 640) {
      // Mobile landscape
      return {
        width: viewportWidth - 32,
        scale: 0.85,
        measuresPerLine: 2,
        measuresPerPage: 2,
      }
    } else if (viewportWidth < 1024) {
      // Tablet
      return {
        width: Math.min(viewportWidth - 80, 680),
        scale: 0.85,
        measuresPerLine: 2,
        measuresPerPage: 4,
      }
    } else {
      // Desktop
      return {
        width: 760,
        scale: 0.95,
        measuresPerLine: 2,
        measuresPerPage: 4,
      }
    }
  }, [viewportWidth, viewportHeight, isMobilePortrait])

  // Calculate total pages based on responsive dimensions
  const dimensions = getNotationDimensions()
  const effectiveMeasuresPerPage =
    dimensions.measuresPerPage || measuresPerPage || 4
  const totalPages = Math.ceil(
    sheetMusic.measures.length / effectiveMeasuresPerPage
  )

  // Render music notation
  useEffect(() => {
    if (!notationRef.current || !sheetMusic.measures.length) return

    // Always create a fresh renderer to ensure proper rendering
    notationRendererRef.current?.dispose()
    notationRendererRef.current = new NotationRenderer(notationRef.current)

    const {
      width,
      scale,
      measuresPerLine,
      measuresPerPage: responsiveMeasuresPerPage,
    } = getNotationDimensions()

    // Always render current page only (no scrolling)
    const effectiveMeasuresPerPage =
      responsiveMeasuresPerPage || measuresPerPage
    const startMeasure = currentPage * effectiveMeasuresPerPage
    const endMeasure = Math.min(
      startMeasure + effectiveMeasuresPerPage,
      sheetMusic.measures.length
    )
    const pageMeasures = sheetMusic.measures.slice(startMeasure, endMeasure)

    const pageSheetMusic: SheetMusic = {
      ...sheetMusic,
      measures: pageMeasures,
    }

    notationRendererRef.current.render(pageSheetMusic, {
      width,
      scale,
      measuresPerLine,
      startMeasureNumber: startMeasure,
    })

    // Cleanup only when component unmounts, not on every render
    return () => {
      // Don't dispose on every render update
    }
  }, [
    currentPage,
    sheetMusic,
    viewportWidth,
    getNotationDimensions,
    measuresPerPage,
    isMobilePortrait,
  ])

  // Auto-flip pages when playing
  useEffect(() => {
    if (currentPlayingMeasure !== undefined) {
      const { measuresPerPage: responsiveMeasuresPerPage } =
        getNotationDimensions()
      const effectiveMeasuresPerPage =
        responsiveMeasuresPerPage || measuresPerPage
      const targetPage = Math.floor(
        currentPlayingMeasure / effectiveMeasuresPerPage
      )

      if (targetPage !== currentPage && targetPage < totalPages) {
        setCurrentPage(targetPage)
        onPageChange?.(targetPage)
      }
    }
  }, [
    currentPlayingMeasure,
    currentPage,
    totalPages,
    getNotationDimensions,
    measuresPerPage,
    onPageChange,
  ])

  // Handle page navigation
  const goToPage = useCallback(
    (page: number) => {
      if (page < 0 || page >= totalPages || page === currentPage) return

      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPage(page)
        onPageChange?.(page)
        setIsTransitioning(false)
      }, 150)
    },
    [currentPage, totalPages, onPageChange]
  )

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current) return

    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToPage(currentPage + 1)
      } else {
        goToPage(currentPage - 1)
      }
    }

    touchStartX.current = null
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPage(currentPage - 1)
      if (e.key === 'ArrowRight') goToPage(currentPage + 1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages, goToPage])

  // Page-based view for all screen sizes
  return (
    <div className={`relative ${className}`}>
      {/* Sheet Music Container */}
      <div
        className={`bg-white rounded-lg transition-opacity duration-150 relative overflow-hidden ${
          isTransitioning ? 'opacity-50' : 'opacity-100'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={notationRef}
          className={`${isMobilePortrait ? 'p-2' : 'p-4 sm:p-6'}`}
        />

        {/* Full-side click areas for page navigation */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 0}
          className={`
            absolute left-0 top-0 h-full w-1/3
            ${currentPage === 0 ? 'cursor-default' : 'cursor-pointer'}
            opacity-0 hover:opacity-5 active:opacity-10
            bg-mirubato-wood-900 transition-opacity
          `}
          aria-label="Previous page"
        />

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          className={`
            absolute right-0 top-0 h-full w-1/3
            ${currentPage === totalPages - 1 ? 'cursor-default' : 'cursor-pointer'}
            opacity-0 hover:opacity-5 active:opacity-10
            bg-mirubato-wood-900 transition-opacity
          `}
          aria-label="Next page"
        />
      </div>

      {/* Page Navigation Controls */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
        <div className="relative h-12 sm:h-16">
          {/* Previous Page Button (visible indicator) */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={`
              pointer-events-auto absolute left-2 sm:left-4 top-1/2 -translate-y-1/2
              w-8 h-8 sm:w-10 sm:h-10 rounded-full
              flex items-center justify-center
              transition-all duration-200
              ${
                currentPage === 0
                  ? 'opacity-10 cursor-not-allowed'
                  : 'opacity-20 hover:opacity-40 active:opacity-60 cursor-pointer'
              }
              bg-white/80 backdrop-blur-sm shadow-sm
              border border-mirubato-wood-200/30
            `}
            aria-label="Previous page"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-mirubato-wood-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Page Indicator */}
          <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/40 backdrop-blur-sm">
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToPage(idx)}
                    className={`
                      w-1.5 h-1.5 rounded-full transition-all
                      ${
                        idx === currentPage
                          ? 'bg-mirubato-leaf-500 w-3'
                          : 'bg-mirubato-wood-300 hover:bg-mirubato-wood-400'
                      }
                    `}
                    aria-label={`Go to page ${idx + 1}`}
                  />
                ))}
              </div>

              {viewportWidth > 400 && (
                <span className="ml-2 text-xs text-mirubato-wood-500">
                  {currentPage + 1} / {totalPages}
                </span>
              )}
            </div>
          </div>

          {/* Next Page Button (visible indicator) */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className={`
              pointer-events-auto absolute right-2 sm:right-4 top-1/2 -translate-y-1/2
              w-8 h-8 sm:w-10 sm:h-10 rounded-full
              flex items-center justify-center
              transition-all duration-200
              ${
                currentPage === totalPages - 1
                  ? 'opacity-10 cursor-not-allowed'
                  : 'opacity-20 hover:opacity-40 active:opacity-60 cursor-pointer'
              }
              bg-white/80 backdrop-blur-sm shadow-sm
              border border-mirubato-wood-200/30
            `}
            aria-label="Next page"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-mirubato-wood-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Touch hint for mobile (shows briefly on first load) */}
      {viewportWidth < 768 && currentPage === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-mirubato-wood-800/80 text-white px-4 py-2 rounded-full text-sm animate-fade-in-out">
            Tap sides to turn pages
          </div>
        </div>
      )}
    </div>
  )
}
