/**
 * Practice Page - Multi-Voice Implementation
 *
 * This is the main practice page that uses the multi-voice architecture.
 * All content is rendered using the Score type which supports multiple
 * voices playing simultaneously.
 *
 * DESIGN PRINCIPLE: Scores display for ALL users (guest or logged in).
 * User authentication is ONLY for saving progress, not for viewing content.
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { MultiVoicePracticeView } from '../components/MultiVoicePracticeView'
import { SaveProgressPrompt, PracticeHeader } from '../components'
import { useViewport } from '../hooks/useViewport'
// User-specific imports - only used when logged in
import { EventBus } from '../modules/core/EventBus'
import { SheetMusicLibraryModuleMultiVoice } from '../modules/sheetMusic/SheetMusicLibraryModuleMultiVoice'
import { EventDrivenStorage } from '../modules/core/eventDrivenStorage'
import { ExtendedMultiVoiceAudioManager } from '../utils/multiVoiceAudioManagerExtensions'
import type { Score } from '../modules/sheetMusic/multiVoiceTypes'
import { logger } from '../utils/logger'

// Import multi-voice scores
import {
  bachMinuetMultiVoice,
  mozartSonataK545MultiVoice,
  chopinPreludeOp28No4MultiVoice,
  furEliseEasyMultiVoice,
  satieGymnopedie1MultiVoice,
  greensleevesPianoMultiVoice,
} from '../data/sheetMusic/multiVoice/realScores'

const Practice: React.FC = () => {
  const { isMobile } = useViewport()
  const { user } = useAuth()

  // Load scores once at the top level
  const allScores: Score[] = [
    bachMinuetMultiVoice,
    mozartSonataK545MultiVoice,
    chopinPreludeOp28No4MultiVoice,
    furEliseEasyMultiVoice,
    satieGymnopedie1MultiVoice,
    greensleevesPianoMultiVoice,
  ]

  // State
  const [selectedScore, setSelectedScore] = useState<Score | null>(
    allScores[0] || null
  )
  const [availableScores] = useState<Score[]>(allScores)
  const [audioManager] = useState(() =>
    ExtendedMultiVoiceAudioManager.getInstance()
  )
  const [, setSheetMusicModule] =
    useState<SheetMusicLibraryModuleMultiVoice | null>(null)
  const [isLoading] = useState(false)

  // Initialize user module only for logged-in users with proper storage
  useEffect(() => {
    // Skip entirely if no user is logged in
    if (!user || !user.id) {
      return
    }

    let mounted = true
    let module: SheetMusicLibraryModuleMultiVoice | null = null

    const initializeUserModule = async () => {
      try {
        // Check if we have proper storage backend first
        const testStorage = typeof window !== 'undefined' && window.localStorage
        if (!testStorage) {
          // No storage available, skip initialization
          return
        }

        const eventBus = EventBus.getInstance()
        const eventStorage = new EventDrivenStorage()

        // Only create module if we have a real user
        module = new SheetMusicLibraryModuleMultiVoice(eventBus, eventStorage)
        await module.initialize()

        if (mounted) {
          setSheetMusicModule(module)
          logger.info('Initialized user-specific sheet music module', {
            userId: user.id,
          })
        }
      } catch (moduleError) {
        // Only log if it's a real error, not just missing storage
        if (
          moduleError instanceof Error &&
          !moduleError.message.includes('timeout')
        ) {
          const errorMessage = moduleError.message
          logger.warn('User module initialization failed', {
            error: errorMessage,
            userId: user.id,
          })
        }
        // Continue without user features - this is fine
      }
    }

    initializeUserModule()

    return () => {
      mounted = false
      if (module) {
        try {
          module.destroy()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [user])

  // Session handlers
  const handleSessionStart = () => {
    logger.info('Practice session started', {
      scoreId: selectedScore?.title,
      userId: user?.id,
    })
  }

  const handleSessionEnd = () => {
    logger.info('Practice session ended', {
      scoreId: selectedScore?.title,
      userId: user?.id,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-mirubato-wood-50 to-white">
        <PracticeHeader isMobile={isMobile} />
        <div className="flex items-center justify-center h-96">
          <div className="text-mirubato-wood-600">
            Loading practice content...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mirubato-wood-50 to-white">
      <PracticeHeader isMobile={isMobile} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Score Selector */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-medium text-mirubato-wood-800 mb-4">
            Choose Your Practice
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableScores.map(score => (
              <button
                key={score.title}
                onClick={() => setSelectedScore(score)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  selectedScore?.title === score.title
                    ? 'border-mirubato-leaf-500 bg-mirubato-leaf-50'
                    : 'border-mirubato-wood-200 hover:border-mirubato-wood-300'
                }`}
              >
                <h3 className="font-medium text-mirubato-wood-800">
                  {score.title}
                </h3>
                <p className="text-sm text-mirubato-wood-600 mt-1">
                  {score.composer}
                </p>
                <div className="text-xs text-mirubato-wood-500 mt-2">
                  {score.parts.length} part{score.parts.length > 1 ? 's' : ''} •
                  {score.measures.length} measures
                </div>
                {score.metadata && (
                  <div className="text-xs text-mirubato-wood-500 mt-1">
                    Difficulty: {score.metadata.difficulty || 'N/A'}
                  </div>
                )}
              </button>
            ))}
          </div>

          {availableScores.length === 0 && (
            <div className="text-center py-8 text-mirubato-wood-500">
              No scores available. Please check your connection and try again.
            </div>
          )}
        </div>

        {/* Practice View */}
        {selectedScore && (
          <div className="bg-white rounded-lg shadow-sm">
            <MultiVoicePracticeView
              key={selectedScore.title} // Force remount when score changes
              score={selectedScore}
              audioManager={audioManager}
              onSessionStart={handleSessionStart}
              onSessionEnd={handleSessionEnd}
              enablePerformanceTracking={!!user}
              initialDisplayOptions={{
                showTrebleStaff: true,
                showBassStaff: true,
                showVoiceColors: true,
                voiceOpacity: {},
                showMeasureNumbers: true,
                showNoteNames: false,
                staffSpacing: 1.0,
                showTempo: true,
                showDynamics: true,
                showFingerings: true,
                showGrandStaffBrace: true,
              }}
            />
          </div>
        )}
      </main>

      {/* Save Progress Prompt - only for logged in users */}
      {user && <SaveProgressPrompt />}
    </div>
  )
}

export default Practice
