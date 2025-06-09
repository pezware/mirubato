/**
 * Multi-Voice Extensions for AudioManager
 *
 * This file extends the multi-voice audio manager with additional features
 * as specified in Phase 4 of the Multi-Voice Implementation Plan.
 */

import { MultiVoiceAudioManager } from './multiVoiceAudioManager'
import { Score, Voice } from '../modules/sheetMusic/multiVoiceTypes'
import { TimeSignature } from '../modules/sheetMusic/types'
import * as Tone from 'tone'

/**
 * Extended multi-voice audio manager interface
 */
export interface ExtendedMultiVoiceAudioManagerInterface {
  // Score playback
  playScore(score: Score): Promise<void>
  stopScore(): void
  pauseScore(): void
  resumeScore(): void

  // Voice control
  playVoice(score: Score, voiceId: string): Promise<void>
  muteVoice(voiceId: string): void
  unmuteVoice(voiceId: string): void
  soloVoice(voiceId: string): void
  setVoiceVolume(voiceId: string, volume: number): void

  // Metronome
  startMetronome(timeSignature: TimeSignature, tempo: number): void
  stopMetronome(): void
  setMetronomeVolume(volume: number): void

  // Practice features
  setLoopSection(startMeasure: number, endMeasure: number): void
  clearLoop(): void
  setPlaybackSpeed(speed: number): void

  // Voice mixing
  getVoiceMixer(): VoiceMixer
}

/**
 * Voice mixer for controlling individual voice levels
 */
export interface VoiceMixer {
  setVoiceVolume(voiceId: string, volume: number): void
  setVoicePan(voiceId: string, pan: number): void
  setVoiceReverb(voiceId: string, amount: number): void
  muteVoice(voiceId: string): void
  unmuteVoice(voiceId: string): void
  soloVoice(voiceId: string): void
  resetMixer(): void
}

/**
 * Extended MultiVoiceAudioManager with Phase 4 features
 */
export class ExtendedMultiVoiceAudioManager
  extends MultiVoiceAudioManager
  implements ExtendedMultiVoiceAudioManagerInterface
{
  private metronome: Tone.Loop | null = null
  private metronomeVolume: Tone.Volume
  private extendedMetronomeSynth: Tone.MembraneSynth

  private loopStart: number | null = null
  private loopEnd: number | null = null
  private voiceParts: Map<string, Tone.Part> = new Map()

  private voiceMixer: VoiceMixerImpl

  constructor() {
    super()

    // Initialize metronome
    this.metronomeVolume = new Tone.Volume(-10).toDestination()
    this.extendedMetronomeSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: {
        attack: 0.0006,
        decay: 0.2,
        sustain: 0,
        release: 0.01,
      },
    }).connect(this.metronomeVolume)

    // Initialize voice mixer
    this.voiceMixer = new VoiceMixerImpl()
  }

  // ============== Score Playback ==============

  async playScore(score: Score): Promise<void> {
    await this.initialize()

    // Stop any current playback
    this.stopScore()

    // Set tempo if specified
    if (score.measures[0]?.tempo) {
      Tone.Transport.bpm.value = score.measures[0].tempo
    }

    // Apply playback speed
    const currentSpeed = this.getPlaybackSpeed()
    if (Tone.Transport.bpm) {
      Tone.Transport.bpm.value = Tone.Transport.bpm.value * currentSpeed
    }

    // Schedule all voices
    for (const part of score.parts) {
      for (const staffId of part.staves) {
        const staff = this.findStaff(score, staffId)
        if (!staff) continue

        for (const voice of staff.voices) {
          this.scheduleVoice(score, voice, part)
        }
      }
    }

    // Set up loop if configured
    if (this.loopStart !== null && this.loopEnd !== null) {
      Tone.Transport.loop = true
      Tone.Transport.loopStart = `${this.loopStart}:0:0`
      Tone.Transport.loopEnd = `${this.loopEnd}:0:0`
    }

    // Start transport
    Tone.Transport.start()
    // Note: playback state is managed by parent class
  }

  stopScore(): void {
    Tone.Transport.stop()
    Tone.Transport.cancel()
    // Note: playback state is managed by parent class
  }

  pauseScore(): void {
    Tone.Transport.pause()
    // Note: playback state is managed by parent class
  }

  resumeScore(): void {
    Tone.Transport.start()
    // Note: playback state is managed by parent class
  }

  // ============== Voice Control ==============

  async playVoice(score: Score, voiceId: string): Promise<void> {
    await this.initialize()

    // Stop current playback
    this.stopScore()

    // Find and play only the specified voice
    for (const part of score.parts) {
      for (const staffId of part.staves) {
        const staff = this.findStaff(score, staffId)
        if (!staff) continue

        const voice = staff.voices.find(v => v.id === voiceId)
        if (voice) {
          // Mute all other voices
          this.voiceMixer.soloVoice(voiceId)
          this.scheduleVoice(score, voice, part)

          Tone.Transport.start()
          // Note: playback state is managed by parent class
          return
        }
      }
    }
  }

  muteVoice(voiceId: string): void {
    this.voiceMixer.muteVoice(voiceId)
    super.muteVoice(voiceId)
  }

  unmuteVoice(voiceId: string): void {
    this.voiceMixer.unmuteVoice(voiceId)
    super.unmuteVoice(voiceId)
  }

  soloVoice(voiceId: string): void {
    this.voiceMixer.soloVoice(voiceId)

    // Use parent class solo method if available
    if (typeof super.soloVoice === 'function') {
      super.soloVoice(voiceId)
    }
  }

  setVoiceVolume(voiceId: string, volume: number): void {
    this.voiceMixer.setVoiceVolume(voiceId, volume)
  }

  // ============== Metronome ==============

  startMetronome(timeSignature: TimeSignature, tempo: number): void {
    this.stopMetronome()

    // Parse time signature
    const [beats, noteValue] = this.parseTimeSignature(timeSignature)
    const interval = `${noteValue}n`

    Tone.Transport.bpm.value = tempo

    let beatCount = 0
    this.metronome = new Tone.Loop(time => {
      // Accent the first beat
      const pitch = beatCount === 0 ? 'C2' : 'C3'
      const velocity = beatCount === 0 ? 0.9 : 0.5

      this.extendedMetronomeSynth.triggerAttackRelease(
        pitch,
        '32n',
        time,
        velocity
      )

      beatCount = (beatCount + 1) % beats
    }, interval)

    this.metronome.start(0)
    Tone.Transport.start()
  }

  stopMetronome(): void {
    if (this.metronome) {
      this.metronome.stop()
      this.metronome.dispose()
      this.metronome = null
    }
  }

  setMetronomeVolume(volume: number): void {
    // Volume in dB (-60 to 0)
    this.metronomeVolume.volume.value = Math.max(-60, Math.min(0, volume))
  }

  // ============== Practice Features ==============

  setLoopSection(startMeasure: number, endMeasure: number): void {
    this.loopStart = startMeasure
    this.loopEnd = endMeasure

    if (this.isPlaying()) {
      Tone.Transport.loop = true
      Tone.Transport.loopStart = `${startMeasure}:0:0`
      Tone.Transport.loopEnd = `${endMeasure}:0:0`
    }
  }

  clearLoop(): void {
    this.loopStart = null
    this.loopEnd = null
    Tone.Transport.loop = false
  }

  setPlaybackSpeed(speed: number): void {
    super.setPlaybackSpeed(speed)
    // Apply immediately if transport is available
    if (Tone.Transport.bpm) {
      const currentBpm = Tone.Transport.bpm.value
      const normalizedBpm = currentBpm / this.getPlaybackSpeed()
      Tone.Transport.bpm.value = normalizedBpm * speed
    }
  }

  // ============== Voice Mixing ==============

  getVoiceMixer(): VoiceMixer {
    return this.voiceMixer
  }

  // ============== Private Helper Methods ==============

  private findStaff(score: Score, staffId: string) {
    for (const measure of score.measures) {
      const staff = measure.staves.find(s => s.id === staffId)
      if (staff) return staff
    }
    return null
  }

  private scheduleVoice(score: Score, voice: Voice, _part: any): void {
    // Use a basic sampler for now (would be more sophisticated in real implementation)
    const instrument = new Tone.Sampler().toDestination()

    // Create a Tone.Part for this voice
    const notes = this.convertVoiceToToneNotes(score, voice)
    const tonePart = new Tone.Part((time, note) => {
      if (!this.isVoiceMuted(voice.id)) {
        instrument.triggerAttackRelease(
          note.pitch,
          note.duration,
          time,
          note.velocity
        )
      }
    }, notes)

    tonePart.start(0)
    // Store the part for later cleanup
    this.voiceParts.set(voice.id, tonePart)

    // Apply mixer settings
    this.voiceMixer.applySettingsToVoice(voice.id)
  }

  private convertVoiceToToneNotes(score: Score, voice: Voice): any[] {
    const toneNotes: any[] = []

    score.measures.forEach((_measure, measureIndex) => {
      // For now, we'll use a simplified approach without parsing time signatures

      voice.notes.forEach(note => {
        if (!note.rest) {
          const time = `${measureIndex}:${note.time}:0`
          const duration = this.convertDuration(note.duration)

          note.keys.forEach(key => {
            toneNotes.push({
              time,
              pitch: this.convertKeyToPitch(key),
              duration,
              velocity: 0.7,
            })
          })
        }
      })
    })

    return toneNotes
  }

  private parseTimeSignature(timeSignature: any): [number, number] {
    // Handle TimeSignature enum values
    const signatures: Record<string, [number, number]> = {
      FOUR_FOUR: [4, 4],
      THREE_FOUR: [3, 4],
      TWO_FOUR: [2, 4],
      SIX_EIGHT: [6, 8],
      TWO_TWO: [2, 2],
      CUT_TIME: [2, 2],
    }

    return signatures[timeSignature] || [4, 4]
  }

  private convertDuration(duration: any): string {
    const durations: Record<string, string> = {
      WHOLE: '1n',
      HALF: '2n',
      QUARTER: '4n',
      EIGHTH: '8n',
      SIXTEENTH: '16n',
      THIRTY_SECOND: '32n',
      w: '1n',
      h: '2n',
      q: '4n',
      '8': '8n',
      '16': '16n',
      '32': '32n',
    }

    return durations[duration] || '4n'
  }

  private convertKeyToPitch(key: string): string {
    // Convert VexFlow key format (e.g., "c/4") to Tone.js format (e.g., "C4")
    const match = key.match(/^([a-g])([#b]?)\/(\d)$/)
    if (!match) return 'C4'

    const [, note, accidental, octave] = match
    return `${note.toUpperCase()}${accidental}${octave}`
  }
}

/**
 * Voice Mixer Implementation
 */
class VoiceMixerImpl implements VoiceMixer {
  private voiceSettings: Map<string, VoiceChannelSettings> = new Map()
  private channels: Map<string, Tone.Channel> = new Map()

  constructor() {
    // Initialize mixer
  }

  setVoiceVolume(voiceId: string, volume: number): void {
    const settings = this.getOrCreateSettings(voiceId)
    settings.volume = Math.max(-60, Math.min(0, volume))

    const channel = this.channels.get(voiceId)
    if (channel) {
      channel.volume.value = settings.volume
    }
  }

  setVoicePan(voiceId: string, pan: number): void {
    const settings = this.getOrCreateSettings(voiceId)
    settings.pan = Math.max(-1, Math.min(1, pan))

    const channel = this.channels.get(voiceId)
    if (channel && channel.pan) {
      channel.pan.value = settings.pan
    }
  }

  setVoiceReverb(voiceId: string, amount: number): void {
    const settings = this.getOrCreateSettings(voiceId)
    settings.reverbAmount = Math.max(0, Math.min(1, amount))

    // Would need to implement reverb send per voice
  }

  muteVoice(voiceId: string): void {
    const settings = this.getOrCreateSettings(voiceId)
    settings.muted = true

    const channel = this.channels.get(voiceId)
    if (channel) {
      channel.mute = true
    }
  }

  unmuteVoice(voiceId: string): void {
    const settings = this.getOrCreateSettings(voiceId)
    settings.muted = false

    const channel = this.channels.get(voiceId)
    if (channel) {
      channel.mute = false
    }
  }

  soloVoice(voiceId: string): void {
    // Mute all other voices
    this.voiceSettings.forEach((settings, id) => {
      if (id === voiceId) {
        settings.muted = false
        settings.solo = true
      } else {
        settings.muted = true
        settings.solo = false
      }
    })

    // Apply to channels
    this.channels.forEach((channel, id) => {
      channel.mute = id !== voiceId
    })
  }

  applySettingsToVoice(voiceId: string): void {
    const settings = this.getOrCreateSettings(voiceId)
    const channel = this.getOrCreateChannel(voiceId)

    // Apply current settings to channel
    channel.volume.value = settings.volume
    channel.mute = settings.muted
  }

  private getOrCreateChannel(voiceId: string): Tone.Channel {
    let channel = this.channels.get(voiceId)
    if (!channel) {
      channel = new Tone.Channel().toDestination()
      this.channels.set(voiceId, channel)
    }
    return channel
  }

  resetMixer(): void {
    this.voiceSettings.clear()
    this.channels.forEach(channel => {
      channel.volume.value = 0
      channel.mute = false
      if (channel.pan) channel.pan.value = 0
    })
  }

  applySettingsToChannel(voiceId: string, channel: Tone.Channel): void {
    const settings = this.voiceSettings.get(voiceId)
    if (!settings) return

    channel.volume.value = settings.volume
    channel.mute = settings.muted
    if (channel.pan) {
      channel.pan.value = settings.pan
    }

    this.channels.set(voiceId, channel)
  }

  private getOrCreateSettings(voiceId: string): VoiceChannelSettings {
    if (!this.voiceSettings.has(voiceId)) {
      this.voiceSettings.set(voiceId, {
        volume: 0,
        pan: 0,
        muted: false,
        solo: false,
        reverbAmount: 0.2,
      })
    }
    return this.voiceSettings.get(voiceId)!
  }
}

interface VoiceChannelSettings {
  volume: number
  pan: number
  muted: boolean
  solo: boolean
  reverbAmount: number
}
