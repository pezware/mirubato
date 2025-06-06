import React from 'react'
import { SheetMusicDisplay } from './SheetMusicDisplay'
import { SheetMusicErrorBoundary } from './ErrorBoundary'
import type { SheetMusic } from '../types/sheetMusic'

interface PracticeNotationProps {
  sheetMusic: SheetMusic
  currentPlayingMeasure?: number
}

export const PracticeNotation: React.FC<PracticeNotationProps> = ({
  sheetMusic,
  currentPlayingMeasure,
}) => {
  return (
    <>
      {/* Piece Info */}
      <div className="bg-white/70 backdrop-blur rounded-lg shadow-sm border border-mirubato-wood-100 p-3 sm:p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <span className="font-medium text-mirubato-wood-800">
              {sheetMusic.title}
            </span>
            <span className="text-mirubato-wood-500 ml-2">
              {sheetMusic.composer}
            </span>
          </div>
          <div className="text-mirubato-wood-500">
            {sheetMusic.measures[0]?.keySignature} •{' '}
            {sheetMusic.measures[0]?.tempo?.marking}
          </div>
        </div>
      </div>

      {/* Notation Display */}
      <div className="relative mb-4 w-full">
        <SheetMusicErrorBoundary
          onError={error => {
            // Log error for monitoring
            if (process.env.NODE_ENV === 'development') {
              console.error('Sheet music rendering error:', error)
            }
          }}
        >
          <SheetMusicDisplay
            sheetMusic={sheetMusic}
            className="shadow-sm border border-mirubato-wood-100 rounded-xl"
            currentPlayingMeasure={currentPlayingMeasure}
          />
        </SheetMusicErrorBoundary>
      </div>
    </>
  )
}
