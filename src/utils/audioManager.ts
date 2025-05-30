import * as Tone from 'tone'

class AudioManager {
  private initialized = false
  private synth: Tone.Synth | null = null

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
      
      // Create a simple synth
      this.synth = new Tone.Synth().toDestination()
      
      this.initialized = true
      console.log('Audio system ready!')
    } catch (error) {
      console.error('Audio initialization error:', error)
      throw error
    }
  }

  async playNote(note: string, duration: string = '8n'): Promise<void> {
    console.log(`playNote called with: ${note}`)
    
    // Initialize on first play attempt
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.synth) {
      throw new Error('Synth not available')
    }

    try {
      // Play the note
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