import * as Tone from 'tone'
import { PlaybackMode } from '../components/circle-of-fifths/types'

// Note frequency mapping (A4 = 440Hz)
// Kept for potential future use with frequency-based synthesis
// const noteFrequencies: Record<string, number> = {
//   C: 261.63,
//   'C#': 277.18,
//   Db: 277.18,
//   D: 293.66,
//   'D#': 311.13,
//   Eb: 311.13,
//   E: 329.63,
//   F: 349.23,
//   'F#': 369.99,
//   Gb: 369.99,
//   G: 392.0,
//   'G#': 415.3,
//   Ab: 415.3,
//   A: 440.0,
//   'A#': 466.16,
//   Bb: 466.16,
//   B: 493.88,
//   Cb: 493.88,
//   'B#': 261.63,
//   'E#': 349.23,
//   Fb: 329.63,
// }

// Convert note name to frequency with octave
// Note: This function is kept for potential future use with frequency-based synthesis
// const getNoteFrequency = (note: string, octave: number = 4): number => {
//   const baseFreq = noteFrequencies[note]
//   if (!baseFreq) return 440 // Default to A4 if note not found
//
//   // Adjust for octave (C4 is middle C)
//   const octaveOffset = octave - 4
//   return baseFreq * Math.pow(2, octaveOffset)
// }

// Convert note names to Tone.js format (e.g., "C#4")
const toToneNote = (note: string, octave: number = 4): string => {
  // Handle enharmonic slash notation (e.g., "F#/Gb" -> "F#")
  const slashIndex = note.indexOf('/')
  const baseNote = slashIndex > -1 ? note.substring(0, slashIndex) : note

  // Remove chord notation (m, dim, maj, etc.) to get just the note name
  const noteOnly = baseNote.replace(/m(aj)?|dim|aug|sus|add|[0-9]+/g, '').trim()

  // Handle enharmonic equivalents
  const noteMap: Record<string, string> = {
    'E#': 'F',
    'B#': 'C',
    Cb: 'B',
    Fb: 'E',
  }

  const mappedNote = noteMap[noteOnly] || noteOnly
  return `${mappedNote}${octave}`
}

class MusicalAudioService {
  private synth: Tone.PolySynth | null = null
  private volume: Tone.Volume | null = null
  private initialized = false
  private currentSequence: Tone.Sequence | null = null
  private playbackTimeout: NodeJS.Timeout | null = null

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Start Tone.js audio context
      await Tone.start()

      // Create synth with a nice piano-like sound
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'triangle',
        },
        envelope: {
          attack: 0.02,
          decay: 0.3,
          sustain: 0.3,
          release: 1,
        },
      })

      // Create volume control
      this.volume = new Tone.Volume(0)

      // Connect synth -> volume -> destination
      this.synth.connect(this.volume)
      this.volume.toDestination()

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize musical audio service:', error)
      throw error
    }
  }

  setVolume(volume: number): void {
    if (!this.volume) return

    // Convert 0-100 to dB (-60 to 0)
    const db = volume === 0 ? -Infinity : -60 + (volume / 100) * 60
    this.volume.volume.rampTo(db, 0.1)
  }

  async playChord(notes: string[], duration: number = 1): Promise<void> {
    await this.initialize()
    if (!this.synth) return

    // Stop any currently playing sequence
    this.stopCurrentSequence()

    // Convert notes to Tone.js format
    const toneNotes = notes.map(note => toToneNote(note))

    // Play chord
    this.synth.triggerAttackRelease(toneNotes, duration)

    // Wait for the chord to finish playing
    return new Promise(resolve => {
      this.playbackTimeout = setTimeout(() => {
        this.playbackTimeout = null
        resolve()
      }, duration * 1000)
    })
  }

  async playScale(
    notes: string[],
    mode: 'ascending' | 'descending' | 'both' = 'ascending',
    tempo: number = 120
  ): Promise<void> {
    await this.initialize()
    if (!this.synth) return

    // Stop any currently playing sequence
    this.stopCurrentSequence()

    // Prepare note sequence
    let sequence: string[] = []

    if (mode === 'ascending' || mode === 'both') {
      sequence = [...notes.map(note => toToneNote(note))]
    }

    if (mode === 'descending') {
      sequence = [...notes.map(note => toToneNote(note))].reverse()
    }

    if (mode === 'both') {
      const ascending = notes.map(note => toToneNote(note))
      const descending = [...ascending].reverse().slice(1) // Avoid repeating the top note
      sequence = [...ascending, ...descending]
    }

    // Calculate note duration based on tempo
    const noteDuration = 60 / tempo // Duration of each note in seconds

    // Create and start sequence
    this.currentSequence = new Tone.Sequence(
      (time, note) => {
        if (this.synth) {
          this.synth.triggerAttackRelease(note, noteDuration * 0.8, time)
        }
      },
      sequence,
      noteDuration
    ).start(0)

    // Start transport
    Tone.Transport.start()

    // Stop after sequence completes and wait for it
    const totalDuration = sequence.length * noteDuration
    return new Promise(resolve => {
      this.playbackTimeout = setTimeout(() => {
        this.stopCurrentSequence()
        resolve()
      }, totalDuration * 1000)
    })
  }

  async playArpeggio(
    notes: string[],
    pattern: number[] = [0, 2, 4], // Default to triad
    tempo: number = 120
  ): Promise<void> {
    await this.initialize()
    if (!this.synth) return

    // Stop any currently playing sequence
    this.stopCurrentSequence()

    // Create arpeggio pattern
    const arpeggioNotes: string[] = []

    // Build arpeggio based on pattern (up and down)
    for (const index of pattern) {
      if (index < notes.length) {
        arpeggioNotes.push(toToneNote(notes[index]))
      }
    }

    // Add descending pattern
    for (let i = pattern.length - 2; i > 0; i--) {
      const index = pattern[i]
      if (index < notes.length) {
        arpeggioNotes.push(toToneNote(notes[index]))
      }
    }

    // Calculate note duration based on tempo
    const noteDuration = 60 / (tempo * 2) // Faster for arpeggios

    // Create and start sequence
    this.currentSequence = new Tone.Sequence(
      (time, note) => {
        if (this.synth) {
          this.synth.triggerAttackRelease(note, noteDuration * 0.8, time)
        }
      },
      arpeggioNotes,
      noteDuration
    ).start(0)

    // Start transport
    Tone.Transport.start()

    // Stop after sequence completes and wait for it
    const totalDuration = arpeggioNotes.length * noteDuration
    return new Promise(resolve => {
      this.playbackTimeout = setTimeout(() => {
        this.stopCurrentSequence()
        resolve()
      }, totalDuration * 1000)
    })
  }

  async playKeyAudio(
    keyId: string,
    scale: string[],
    _primaryChords: string[],
    mode: PlaybackMode,
    tempo: number = 120
  ): Promise<void> {
    switch (mode) {
      case 'chord': {
        // Play the tonic chord (I chord)
        const tonicChord = this.buildChord(keyId, scale)
        await this.playChord(tonicChord)
        break
      }

      case 'scale':
        await this.playScale(scale, 'both', tempo)
        break

      case 'arpeggio': {
        const arpeggioNotes = this.buildChord(keyId, scale)
        await this.playArpeggio(arpeggioNotes, [0, 1, 2], tempo)
        break
      }
    }
  }

  private buildChord(root: string, scale: string[]): string[] {
    // Handle enharmonic slash notation in root (e.g., "F#/Gb" -> "F#")
    const cleanRoot = root.includes('/') ? root.split('/')[0] : root

    // Build a simple triad using the scale
    const rootIndex = scale.findIndex(note => note === cleanRoot)
    if (rootIndex === -1) return [cleanRoot] // Fallback to just root

    const chord: string[] = [cleanRoot]

    // Add third (2 scale degrees up)
    const thirdIndex = (rootIndex + 2) % scale.length
    chord.push(scale[thirdIndex])

    // Add fifth (4 scale degrees up)
    const fifthIndex = (rootIndex + 4) % scale.length
    chord.push(scale[fifthIndex])

    return chord
  }

  private stopCurrentSequence(): void {
    if (this.currentSequence) {
      this.currentSequence.stop()
      this.currentSequence.dispose()
      this.currentSequence = null
    }
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout)
      this.playbackTimeout = null
    }
    Tone.Transport.stop()
    Tone.Transport.cancel()
  }

  // Public method to stop playback
  stop(): void {
    this.stopCurrentSequence()
  }

  dispose(): void {
    this.stopCurrentSequence()

    if (this.synth) {
      this.synth.dispose()
      this.synth = null
    }

    if (this.volume) {
      this.volume.dispose()
      this.volume = null
    }

    this.initialized = false
  }
}

// Export singleton instance
export const musicalAudioService = new MusicalAudioService()
