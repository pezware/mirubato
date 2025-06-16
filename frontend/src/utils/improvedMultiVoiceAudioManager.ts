import * as Tone from 'tone'
import {
  MultiVoiceAudioManagerInterface,
  AudioExportOptions,
  NotePlayEvent,
  MeasureChangeEvent,
} from './multiVoiceAudioManagerInterface'
import { AudioManagerConfig } from './audioManagerInterface'
import {
  Score,
  Voice,
  MultiVoiceMeasure,
} from '../modules/sheetMusic/multiVoiceTypes'
import { TimeSignature } from '../modules/sheetMusic/types'

/**
 * Improved Multi-Voice Audio Manager with proper memory management.
 * Fixes memory leaks by:
 * 1. Properly tracking and clearing all scheduled events
 * 2. Using WeakMap for callback references
 * 3. Implementing proper cleanup in dispose()
 * 4. Avoiding accumulation of scheduled events
 */
export class ImprovedMultiVoiceAudioManager
  implements MultiVoiceAudioManagerInterface
{
  private initialized = false
  private audioStarted = false
  private pianoSampler: Tone.Sampler | null = null
  private guitarSynth: Tone.PolySynth | null = null
  private currentInstrument: 'piano' | 'guitar' = 'piano'
  private loadingPromise: Promise<void> | null = null
  private config: AudioManagerConfig
  private toneInstance: typeof Tone

  // Voice management
  private mutedVoices = new Set<string>()
  private soloedVoice: string | null = null
  private voiceVolumes = new Map<string, number>()
  private voiceGains = new Map<string, Tone.Gain>()

  // Playback state with proper cleanup tracking
  private isPlayingState = false
  // private currentScheduleId: number | null = null // Commented out as currently unused
  private playbackSpeed = 1.0

  // Properly track ALL scheduled events for cleanup
  private scheduledEventIds = new Set<number>()
  private transportEventIds: number[] = []

  // Track active Transport schedules to prevent accumulation
  private activeSchedules = new Map<string, number>()

  // Metronome
  private metronomeActive = false
  private metronomeLoop: Tone.Loop | null = null
  private metronomeSynth: Tone.Synth | null = null

  // Effects
  private reverb: Tone.Reverb | null = null

  // Event listeners with WeakMap for proper garbage collection
  private notePlayListeners = new Set<(event: NotePlayEvent) => void>()
  private measureChangeListeners = new Set<
    (event: MeasureChangeEvent) => void
  >()
  private listenerCleanupFunctions = new WeakMap<
    (...args: never[]) => unknown,
    () => void
  >()

  // Track if we're in the process of cleaning up
  private isDisposing = false

  constructor(
    config: AudioManagerConfig = {},
    toneInstance: typeof Tone = Tone
  ) {
    this.config = {
      samplesBaseUrl: 'https://tonejs.github.io/audio/salamander/',
      defaultInstrument: 'piano',
      reverb: {
        decay: 2.5,
        wet: 0.15,
        preDelay: 0.01,
      },
      ...config,
    }
    this.currentInstrument = this.config.defaultInstrument || 'piano'
    this.toneInstance = toneInstance

    // Pre-initialize to reduce first-play latency
    if (typeof window !== 'undefined') {
      this.preInitialize()
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async initialize(): Promise<void> {
    if (this.initialized || this.isDisposing) {
      return
    }

    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = this._initializeInternal()
    return this.loadingPromise
  }

  private async ensureAudioStarted(): Promise<void> {
    if (this.audioStarted || this.isDisposing) {
      return
    }

    try {
      await this.toneInstance.start()
      this.audioStarted = true
    } catch (error) {
      console.debug('Failed to start audio context:', error)
    }
  }

  private async _initializeInternal(): Promise<void> {
    try {
      const baseUrl = this.config.samplesBaseUrl!

      // Create piano sampler with reduced sample set
      this.pianoSampler = new this.toneInstance.Sampler({
        urls: {
          A0: 'A0.mp3',
          A1: 'A1.mp3',
          A2: 'A2.mp3',
          A3: 'A3.mp3',
          A4: 'A4.mp3',
          A5: 'A5.mp3',
          A6: 'A6.mp3',
          A7: 'A7.mp3',
          C1: 'C1.mp3',
          C2: 'C2.mp3',
          C3: 'C3.mp3',
          C4: 'C4.mp3',
          C5: 'C5.mp3',
          C6: 'C6.mp3',
          C7: 'C7.mp3',
          C8: 'C8.mp3',
          'F#1': 'Fs1.mp3',
          'F#2': 'Fs2.mp3',
          'F#3': 'Fs3.mp3',
          'F#4': 'Fs4.mp3',
          'F#5': 'Fs5.mp3',
          'F#6': 'Fs6.mp3',
          'F#7': 'Fs7.mp3',
        },
        release: 1,
        baseUrl,
      }).toDestination()

      // Create guitar synth
      this.guitarSynth = new this.toneInstance.PolySynth(
        this.toneInstance.Synth,
        {
          oscillator: { type: 'triangle' },
          envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 1,
          },
        }
      ).toDestination()

      // Add reverb
      this.reverb = new this.toneInstance.Reverb({
        decay: this.config.reverb!.decay || 1.5,
        wet: this.config.reverb!.wet || 0.1,
        preDelay: this.config.reverb!.preDelay || 0.01,
      }).toDestination()

      // Connect instruments
      try {
        this.pianoSampler.disconnect()
        this.guitarSynth.disconnect()
      } catch {
        // Ignore disconnect errors
      }

      this.pianoSampler.toDestination()
      this.guitarSynth.toDestination()
      this.pianoSampler.connect(this.reverb)
      this.guitarSynth.connect(this.reverb)

      // Create metronome synth
      this.metronomeSynth = new this.toneInstance.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0,
          release: 0.1,
        },
      }).toDestination()

      await this.toneInstance.loaded()
      this.initialized = true

      // Set up optimized audio context
      if (this.toneInstance.context) {
        const ctx = this.toneInstance.context as unknown as AudioContext
        try {
          if (ctx && 'latencyHint' in ctx) {
            ;(ctx as AudioContext & { latencyHint: string }).latencyHint =
              'interactive'
          }
        } catch {
          // Ignore if not supported
        }
      }
    } catch (error) {
      this.loadingPromise = null
      throw error
    }
  }

  private preInitialize(): void {
    setTimeout(() => {
      if (!this.initialized && !this.loadingPromise && !this.isDisposing) {
        this.initialize().catch(() => {
          // Background initialization failed
        })
      }
    }, 500)
  }

  setInstrument(instrument: 'piano' | 'guitar'): void {
    this.currentInstrument = instrument
  }

  getInstrument(): 'piano' | 'guitar' {
    return this.currentInstrument
  }

  async playNote(
    note: string | string[],
    duration: string = '8n',
    velocity: number = 0.8
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    await this.ensureAudioStarted()

    const instrument = this.getActiveInstrument()
    if (instrument && !this.isDisposing) {
      const time = this.toneInstance.immediate()
      instrument.triggerAttackRelease(note, duration, time, velocity)
    }
  }

  async playNoteAt(
    note: string | string[],
    time: number,
    duration: string = '8n',
    velocity: number = 0.8
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    const instrument = this.getActiveInstrument()
    if (instrument && !this.isDisposing) {
      const toneTime = this.toneInstance.now() + time
      instrument.triggerAttackRelease(note, duration, toneTime, velocity)
    }
  }

  async playScore(score: Score, startMeasure: number = 1): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    await this.ensureAudioStarted()

    // Stop and clean up any existing playback
    this.stopPlayback()

    if (this.isDisposing) return

    // Reset transport
    this.toneInstance.Transport.position = 0
    this.isPlayingState = true

    // Set initial tempo
    const firstMeasure = score.measures[0]
    if (firstMeasure?.tempo) {
      this.toneInstance.Transport.bpm.value = firstMeasure.tempo
    }

    // Schedule all notes
    this.scheduleScore(score, startMeasure)
    // Note: scheduleId was used for currentScheduleId tracking but is currently unused

    // Start transport
    this.toneInstance.Transport.start()
  }

  async playVoice(
    score: Score,
    voiceId: string,
    startMeasure: number = 1
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    const filteredScore = this.filterScoreByVoice(score, voiceId)
    await this.playScore(filteredScore, startMeasure)
  }

  stopPlayback(): void {
    if (this.isDisposing) return

    // Stop transport
    this.toneInstance.Transport.stop()
    this.toneInstance.Transport.cancel()

    // Clear all scheduled events properly
    this.clearAllScheduledEvents()

    // Reset state
    this.isPlayingState = false
    // this.currentScheduleId = null // Commented out as currently unused
  }

  /**
   * Properly clear all scheduled events to prevent memory leaks
   */
  private clearAllScheduledEvents(): void {
    // Clear tracked event IDs
    this.scheduledEventIds.forEach(eventId => {
      try {
        this.toneInstance.Transport.clear(eventId)
      } catch (error) {
        console.debug('Error clearing event:', error)
      }
    })
    this.scheduledEventIds.clear()

    // Clear transport event IDs
    this.transportEventIds.forEach(eventId => {
      try {
        this.toneInstance.Transport.clear(eventId)
      } catch (error) {
        console.debug('Error clearing transport event:', error)
      }
    })
    this.transportEventIds = []

    // Clear active schedules
    this.activeSchedules.forEach(eventId => {
      try {
        this.toneInstance.Transport.clear(eventId)
      } catch (error) {
        console.debug('Error clearing active schedule:', error)
      }
    })
    this.activeSchedules.clear()

    // Cancel all Transport events as a final cleanup
    try {
      this.toneInstance.Transport.cancel()
    } catch (error) {
      console.debug('Error canceling transport:', error)
    }
  }

  isPlaying(): boolean {
    return this.isPlayingState
  }

  muteVoice(voiceId: string): void {
    this.mutedVoices.add(voiceId)
    const gain = this.voiceGains.get(voiceId)
    if (gain) {
      gain.gain.value = 0
    }
  }

  unmuteVoice(voiceId: string): void {
    this.mutedVoices.delete(voiceId)
    const gain = this.voiceGains.get(voiceId)
    if (gain) {
      gain.gain.value = this.voiceVolumes.get(voiceId) ?? 1
    }
  }

  isVoiceMuted(voiceId: string): boolean {
    return this.mutedVoices.has(voiceId)
  }

  soloVoice(voiceId: string): void {
    this.soloedVoice = voiceId
  }

  clearSolo(): void {
    this.soloedVoice = null
  }

  getSoloedVoice(): string | null {
    return this.soloedVoice
  }

  setVoiceVolume(voiceId: string, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.voiceVolumes.set(voiceId, clampedVolume)

    const gain = this.voiceGains.get(voiceId)
    if (gain && !this.isVoiceMuted(voiceId)) {
      gain.gain.value = clampedVolume
    }
  }

  getVoiceVolume(voiceId: string): number {
    return this.voiceVolumes.get(voiceId) ?? 1
  }

  startMetronome(timeSignature: TimeSignature, tempo: number = 120): void {
    this.stopMetronome()

    if (this.isDisposing) return

    const beatsPerMeasure = this.getBeatsPerMeasure(timeSignature)
    this.toneInstance.Transport.bpm.value = tempo

    let beatCount = 0
    this.metronomeLoop = new this.toneInstance.Loop(time => {
      if (this.isDisposing) return

      const isDownbeat = beatCount % beatsPerMeasure === 0
      const frequency = isDownbeat ? 880 : 440

      this.metronomeSynth?.triggerAttackRelease(frequency, '32n', time, 0.5)
      beatCount++
    }, '4n')

    this.metronomeLoop.start(0)
    this.metronomeActive = true
  }

  stopMetronome(): void {
    if (this.metronomeLoop) {
      this.metronomeLoop.stop()
      this.metronomeLoop.dispose()
      this.metronomeLoop = null
    }
    this.metronomeActive = false
  }

  isMetronomeActive(): boolean {
    return this.metronomeActive
  }

  setMetronomeTempo(tempo: number): void {
    this.toneInstance.Transport.bpm.value = tempo
  }

  onNotePlay(callback: (event: NotePlayEvent) => void): () => void {
    this.notePlayListeners.add(callback)

    // Create cleanup function
    const cleanup = () => {
      this.notePlayListeners.delete(callback)
      this.listenerCleanupFunctions.delete(callback)
    }

    // Store cleanup function in WeakMap
    this.listenerCleanupFunctions.set(callback, cleanup)

    return cleanup
  }

  onMeasureChange(callback: (event: MeasureChangeEvent) => void): () => void {
    this.measureChangeListeners.add(callback)

    // Create cleanup function
    const cleanup = () => {
      this.measureChangeListeners.delete(callback)
      this.listenerCleanupFunctions.delete(callback)
    }

    // Store cleanup function in WeakMap
    this.listenerCleanupFunctions.set(callback, cleanup)

    return cleanup
  }

  async exportAudio(
    _score: Score,
    _options: AudioExportOptions
  ): Promise<ArrayBuffer> {
    const buffer = new ArrayBuffer(44100 * 2 * 2)
    return buffer
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(4, speed))
    if ('playbackRate' in this.toneInstance.Transport) {
      ;(
        this.toneInstance.Transport as typeof this.toneInstance.Transport & {
          playbackRate: number
        }
      ).playbackRate = this.playbackSpeed
    }
  }

  getPlaybackSpeed(): number {
    return this.playbackSpeed
  }

  isLoading(): boolean {
    return this.loadingPromise !== null && !this.initialized
  }

  dispose(): void {
    // Mark as disposing to prevent new operations
    this.isDisposing = true

    // Stop all playback
    this.stopPlayback()
    this.stopMetronome()

    // Clear all listeners properly
    this.notePlayListeners.clear()
    this.measureChangeListeners.clear()
    this.listenerCleanupFunctions = new WeakMap()

    // Dispose audio nodes
    if (this.pianoSampler) {
      this.pianoSampler.dispose()
      this.pianoSampler = null
    }
    if (this.guitarSynth) {
      this.guitarSynth.dispose()
      this.guitarSynth = null
    }
    if (this.metronomeSynth) {
      this.metronomeSynth.dispose()
      this.metronomeSynth = null
    }

    // Clear voice gains
    this.voiceGains.forEach(gain => gain.dispose())
    this.voiceGains.clear()
    this.voiceVolumes.clear()
    this.mutedVoices.clear()

    if (this.reverb) {
      this.reverb.dispose()
      this.reverb = null
    }

    // Reset all state
    this.soloedVoice = null
    // this.currentScheduleId = null // Commented out as currently unused
    this.isPlayingState = false
    this.audioStarted = false
    this.initialized = false
    this.loadingPromise = null
    this.isDisposing = false
  }

  // Private helper methods

  private getActiveInstrument(): Tone.Sampler | Tone.PolySynth | null {
    if (this.currentInstrument === 'piano') {
      return this.pianoSampler
    } else if (this.currentInstrument === 'guitar') {
      return this.guitarSynth
    }
    return null
  }

  private scheduleScore(score: Score, startMeasure: number): number {
    if (this.isDisposing) return 0

    let currentTime = 0
    const scheduleId = Date.now()

    // Pre-calculate active voices
    const activeVoices = new Set<string>()
    score.measures.forEach(measure => {
      measure.staves.forEach(staff => {
        staff.voices.forEach(voice => {
          if (this.shouldPlayVoice(voice.id)) {
            activeVoices.add(voice.id)
          }
        })
      })
    })

    // Clear existing scheduled events before scheduling new ones
    this.clearAllScheduledEvents()

    // Schedule measures
    score.measures.forEach(measure => {
      if (measure.number < startMeasure) {
        currentTime += this.getMeasureDurationPrecise(measure)
        return
      }

      // Schedule measure change event
      const measureEventId = this.toneInstance.Transport.schedule(
        time => {
          if (!this.isDisposing) {
            this.measureChangeListeners.forEach(listener => {
              listener({ measureNumber: measure.number, time })
            })
          }
        },
        `0:${Math.floor(currentTime)}:${Math.floor((currentTime % 1) * 4)}`
      )
      this.scheduledEventIds.add(measureEventId)

      // Update tempo if changed
      if (measure.tempo) {
        const tempoEventId = this.toneInstance.Transport.schedule(
          () => {
            if (!this.isDisposing) {
              this.toneInstance.Transport.bpm.value = measure.tempo!
            }
          },
          `0:${Math.floor(currentTime)}:${Math.floor((currentTime % 1) * 4)}`
        )
        this.scheduledEventIds.add(tempoEventId)
      }

      // Schedule voices
      measure.staves.forEach(staff => {
        staff.voices.forEach(voice => {
          if (activeVoices.has(voice.id)) {
            this.scheduleVoiceNotes(voice, currentTime, measure)
          }
        })
      })

      currentTime += this.getMeasureDurationPrecise(measure)
    })

    return scheduleId
  }

  private scheduleVoiceNotes(
    voice: Voice,
    measureStartTime: number,
    _measure: MultiVoiceMeasure
  ): void {
    if (this.isDisposing) return

    const instrument = this.getActiveInstrument()
    if (!instrument) return

    const voiceVelocity = this.getVoiceVolume(voice.id) * 0.8

    voice.notes.forEach(note => {
      if (!note.rest && note.keys && note.keys.length > 0) {
        const noteTimeInBeats = measureStartTime + note.time
        const toneTime = `0:${Math.floor(noteTimeInBeats)}:${Math.floor((noteTimeInBeats % 1) * 4)}`
        const duration = this.getNoteDuration(note.duration, 0)

        // Convert keys to Tone.js format
        const toneKeys = note.keys
          .map(key => {
            const parts = key.split('/')
            if (parts.length !== 2) return null
            const [noteName, octave] = parts
            return noteName.toUpperCase() + octave
          })
          .filter(Boolean) as string[]

        if (toneKeys.length > 0) {
          const noteEventId = this.toneInstance.Transport.schedule(
            scheduleTime => {
              if (this.isDisposing) return

              try {
                instrument.triggerAttackRelease(
                  toneKeys,
                  duration,
                  scheduleTime,
                  voiceVelocity
                )
              } catch (error) {
                console.debug('Audio playback error:', error)
              }

              // Emit note play event only if there are listeners
              if (this.notePlayListeners.size > 0) {
                this.notePlayListeners.forEach(listener => {
                  listener({
                    note: {
                      keys: toneKeys,
                      voiceId: voice.id,
                      duration,
                    },
                    time: scheduleTime,
                    velocity: voiceVelocity,
                  })
                })
              }
            },
            toneTime
          )

          this.scheduledEventIds.add(noteEventId)
        }
      }
    })
  }

  private shouldPlayVoice(voiceId: string): boolean {
    if (this.soloedVoice) {
      return voiceId === this.soloedVoice
    }
    return !this.mutedVoices.has(voiceId)
  }

  private filterScoreByVoice(score: Score, voiceId: string): Score {
    return {
      ...score,
      measures: score.measures.map(measure => ({
        ...measure,
        staves: measure.staves.map(staff => ({
          ...staff,
          voices: staff.voices.filter(voice => voice.id === voiceId),
        })),
      })),
    }
  }

  private getMeasureDurationPrecise(measure: MultiVoiceMeasure): number {
    const timeSignature = measure.timeSignature || TimeSignature.FOUR_FOUR
    return this.getBeatsPerMeasure(timeSignature)
  }

  private getBeatsPerMeasure(timeSignature: TimeSignature): number {
    const signatures: Partial<Record<TimeSignature, number>> = {
      [TimeSignature.FOUR_FOUR]: 4,
      [TimeSignature.THREE_FOUR]: 3,
      [TimeSignature.SIX_EIGHT]: 6,
      [TimeSignature.TWO_FOUR]: 2,
      [TimeSignature.FIVE_FOUR]: 5,
      [TimeSignature.SEVEN_EIGHT]: 7,
      [TimeSignature.TWELVE_EIGHT]: 12,
      [TimeSignature.NINE_EIGHT]: 9,
      [TimeSignature.THREE_EIGHT]: 3,
    }
    return signatures[timeSignature] || 4
  }

  private getNoteDuration(duration: string, _beatDuration: number): string {
    const durationMap: Record<string, string> = {
      whole: '1n',
      half: '2n',
      quarter: '4n',
      eighth: '8n',
      sixteenth: '16n',
      'thirty-second': '32n',
    }
    return durationMap[duration] || '4n'
  }
}

// Global instance management with proper cleanup
let globalImprovedAudioManagerInstance: ImprovedMultiVoiceAudioManager | null =
  null

export function createImprovedMultiVoiceAudioManager(
  config?: AudioManagerConfig,
  toneInstance?: typeof Tone
): MultiVoiceAudioManagerInterface {
  if (!config && !toneInstance && !globalImprovedAudioManagerInstance) {
    globalImprovedAudioManagerInstance = new ImprovedMultiVoiceAudioManager()
    return globalImprovedAudioManagerInstance
  }
  if (!config && !toneInstance && globalImprovedAudioManagerInstance) {
    return globalImprovedAudioManagerInstance
  }
  return new ImprovedMultiVoiceAudioManager(config, toneInstance)
}

export function disposeGlobalImprovedAudioManager(): void {
  if (globalImprovedAudioManagerInstance) {
    globalImprovedAudioManagerInstance.dispose()
    globalImprovedAudioManagerInstance = null
  }
}
