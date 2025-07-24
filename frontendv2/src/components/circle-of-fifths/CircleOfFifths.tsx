import React, { useState, useEffect } from 'react'
import CircleVisualization from './CircleVisualization'
import KeyDetailsPanel from './KeyDetailsPanel'
import CircleOfFifthsControls from './CircleOfFifthsControls'
import PianoKeyboard from './PianoKeyboard'
import { PlaybackMode } from './types'
import { getKeyData } from './keyData'
import { musicalAudioService } from '../../services/musicalAudioService'

const CircleOfFifths: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('C')
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [volume, setVolume] = useState(50)
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('chord')
  const [tempo, setTempo] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)

  const keyData = getKeyData(selectedKey)

  // Initialize audio service and set volume
  useEffect(() => {
    if (isAudioEnabled) {
      musicalAudioService.initialize()
      musicalAudioService.setVolume(volume)
    }

    // Cleanup on unmount
    return () => {
      musicalAudioService.dispose()
    }
  }, [isAudioEnabled, volume])

  // Update volume when it changes
  useEffect(() => {
    musicalAudioService.setVolume(volume)
  }, [volume])

  // Stop playback when playback mode changes
  useEffect(() => {
    if (isPlaying) {
      musicalAudioService.stop()
      setIsPlaying(false)
    }
  }, [playbackMode, isPlaying])

  const handleKeySelect = async (keyId: string) => {
    // Stop any currently playing audio before changing key
    if (isPlaying) {
      musicalAudioService.stop()
      setIsPlaying(false)
    }

    setSelectedKey(keyId)

    if (isAudioEnabled) {
      // Play the key's chord/scale based on current mode
      const keyInfo = getKeyData(keyId)
      setIsPlaying(true)

      try {
        await musicalAudioService.playKeyAudio(
          keyId,
          keyInfo.scale,
          keyInfo.primaryChords,
          playbackMode,
          tempo
        )
      } catch (error) {
        console.error('Failed to play audio:', error)
      } finally {
        setIsPlaying(false)
      }
    }
  }

  const handlePlay = async () => {
    if (isPlaying) {
      // Stop playback
      musicalAudioService.stop()
      setIsPlaying(false)
    } else if (isAudioEnabled) {
      // Start playback
      setIsPlaying(true)

      try {
        await musicalAudioService.playKeyAudio(
          selectedKey,
          keyData.scale,
          keyData.primaryChords,
          playbackMode,
          tempo
        )
      } catch (error) {
        console.error('Failed to play audio:', error)
      } finally {
        setIsPlaying(false)
      }
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Controls Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <CircleOfFifthsControls
          isAudioEnabled={isAudioEnabled}
          onAudioToggle={setIsAudioEnabled}
          volume={volume}
          onVolumeChange={setVolume}
          playbackMode={playbackMode}
          onPlaybackModeChange={setPlaybackMode}
          tempo={tempo}
          onTempoChange={setTempo}
          isPlaying={isPlaying}
          onPlay={handlePlay}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: Circle Visualization and Piano Keyboard - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Circle Visualization */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <CircleVisualization
              selectedKey={selectedKey}
              onKeySelect={handleKeySelect}
            />
          </div>

          {/* Piano Keyboard */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <PianoKeyboard
              selectedKey={selectedKey}
              keyData={keyData}
              isPlaying={isPlaying}
            />
          </div>
        </div>

        {/* Right side: Key Details Panel - 1 column on large screens */}
        <div className="lg:col-span-1">
          <KeyDetailsPanel keyData={keyData} />
        </div>
      </div>
    </div>
  )
}

export default CircleOfFifths
