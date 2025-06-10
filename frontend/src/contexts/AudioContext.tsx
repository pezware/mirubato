import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { MultiVoiceAudioManagerInterface } from '../utils/multiVoiceAudioManagerInterface'
import { createMultiVoiceAudioManager } from '../utils/multiVoiceAudioManager'

interface AudioContextValue {
  audioManager: MultiVoiceAudioManagerInterface
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined)

interface AudioProviderProps {
  children: ReactNode
  audioManager?: MultiVoiceAudioManagerInterface
}

/**
 * Provider component for audio manager dependency injection
 * @category Audio
 * @subcategory Providers
 */
export const AudioProvider: React.FC<AudioProviderProps> = ({
  children,
  audioManager: providedAudioManager,
}) => {
  const audioManager = useMemo(
    () => providedAudioManager || createMultiVoiceAudioManager(),
    [providedAudioManager]
  )

  const value = useMemo(() => ({ audioManager }), [audioManager])

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

/**
 * Hook to access the audio manager from context
 * @returns The audio manager instance
 * @throws Error if used outside of AudioProvider
 */
export const useAudioManager = (): MultiVoiceAudioManagerInterface => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudioManager must be used within an AudioProvider')
  }
  return context.audioManager
}
