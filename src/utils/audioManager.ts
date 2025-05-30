import * as Tone from 'tone'

class AudioManager {
  private initialized = false
  private synth: Tone.PolySynth | null = null

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Audio already initialized')
      return
    }

    try {
      console.log('Initializing audio system...')
      
      // Start the audio context - requires user gesture
      await Tone.start()
      console.log('Tone.js started successfully')
      
      // Create a polyphonic synth for playing chords
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'triangle'
        },
        envelope: {
          attack: 0.02,
          decay: 0.3,
          sustain: 0.3,
          release: 1.2
        }
      }).toDestination()
      
      // Add a bit of reverb for warmth
      const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.2 }).toDestination()
      this.synth.connect(reverb)
      
      this.initialized = true
      console.log('Audio system ready!')
    } catch (error) {
      console.error('Audio initialization error:', error)
      throw error
    }
  }

  async playNote(note: string | string[], duration: string = '8n'): Promise<void> {
    console.log(`playNote called with: ${note}`)
    
    // Initialize on first play attempt
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.synth) {
      throw new Error('Synth not available')
    }

    try {
      // Play the note(s)
      this.synth.triggerAttackRelease(note, duration)
      console.log(`Successfully played: ${note}`)
    } catch (error) {
      console.error('Error playing note:', error)
      throw error
    }
  }

  // Check if audio is ready
  isInitialized(): boolean {
    return this.initialized
  }

  // Clean up resources
  dispose(): void {
    if (this.synth) {
      this.synth.dispose()
      this.synth = null
    }
    this.initialized = false
  }
}

// Export singleton instance
export const audioManager = new AudioManager()