import * as Tone from 'tone'

interface MetronomeConfig {
  tempo: number
  volume: number
  accentBeats: boolean
}

class MetronomeService {
  private loop: Tone.Loop | null = null
  private clickSynth: Tone.MembraneSynth
  private accentSynth: Tone.MembraneSynth
  private currentBeat: number = 0
  private beatsPerMeasure: number = 4
  private isPlaying: boolean = false
  private volume: Tone.Volume

  constructor() {
    // Create volume control
    this.volume = new Tone.Volume(-6).toDestination()

    // Create synths for normal and accent beats
    this.clickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 6,
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1,
      },
    }).connect(this.volume)

    this.accentSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 8,
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.15,
      },
    }).connect(this.volume)
  }

  async start(config: MetronomeConfig): Promise<void> {
    // Ensure audio context is started (important for mobile)
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }

    // Stop any existing loop
    this.stop()

    // Set volume
    this.setVolume(config.volume)

    // Create new loop
    const interval = 60 / config.tempo
    this.loop = new Tone.Loop(time => {
      if (config.accentBeats && this.currentBeat === 0) {
        // Play accent on first beat
        this.accentSynth.triggerAttackRelease('G2', '16n', time)
      } else {
        // Play normal click
        this.clickSynth.triggerAttackRelease('C3', '16n', time)
      }

      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure
    }, interval)

    // Start loop immediately
    this.loop.start(0)
    Tone.Transport.start()
    this.isPlaying = true
  }

  stop(): void {
    if (this.loop) {
      this.loop.stop()
      this.loop.dispose()
      this.loop = null
    }
    Tone.Transport.stop()
    this.currentBeat = 0
    this.isPlaying = false
  }

  setTempo(tempo: number): void {
    if (this.loop && this.isPlaying) {
      this.loop.interval = 60 / tempo
    }
  }

  setVolume(volume: number): void {
    // Convert 0-1 range to decibels (-60 to 0)
    const db = volume === 0 ? -Infinity : -60 + volume * 60
    this.volume.volume.value = db
  }

  setBeatsPerMeasure(beats: number): void {
    this.beatsPerMeasure = beats
    this.currentBeat = 0
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  dispose(): void {
    this.stop()
    this.clickSynth.dispose()
    this.accentSynth.dispose()
    this.volume.dispose()
  }
}

// Create singleton instance
let metronomeInstance: MetronomeService | null = null

export const getMetronome = (): MetronomeService => {
  if (!metronomeInstance) {
    metronomeInstance = new MetronomeService()
  }
  return metronomeInstance
}
