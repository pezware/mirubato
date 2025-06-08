/**
 * Converter from single-voice SheetMusic to multi-voice Score format
 *
 * This utility analyzes single-voice sheet music and intelligently converts it
 * to multi-voice format by detecting hand positions based on clef and pitch.
 */

import { SheetMusic, Clef } from '../modules/sheetMusic/types'
import {
  Score,
  Staff,
  MultiVoiceMeasure,
  MultiVoiceNote,
} from '../modules/sheetMusic/multiVoiceTypes'
import { sheetMusicToScore } from '../modules/sheetMusic/multiVoiceConverters'

/**
 * Enhanced converter that splits piano music into left and right hands
 * based on staff position and note pitch
 */
export function convertSingleVoiceToMultiVoice(sheetMusic: SheetMusic): Score {
  // First use the basic converter
  const basicScore = sheetMusicToScore(sheetMusic)

  // If it's not a piano piece, return the basic conversion
  if (sheetMusic.instrument !== 'PIANO') {
    return basicScore
  }

  // For piano pieces, enhance by splitting into hands
  const enhancedMeasures: MultiVoiceMeasure[] = sheetMusic.measures.map(
    measure => {
      const rightHandNotes: MultiVoiceNote[] = []
      const leftHandNotes: MultiVoiceNote[] = []

      // Analyze notes and split them between hands
      measure.notes.forEach(note => {
        // Convert note to multi-voice format
        const multiNote: MultiVoiceNote = {
          keys: note.keys,
          duration: note.duration,
          time: note.time,
          voiceId: '', // Will be set below
          accidental: note.accidental,
          dots: note.dots,
          stem: note.stem,
          rest: note.rest,
          tie: note.tie,
        }

        // Determine which hand based on pitch
        // This is a simplified heuristic - in real music, hands can cross
        const pitch = note.keys[0]
        const noteValue = extractMidiNumber(pitch)

        // Middle C (C4) is MIDI 60
        // Generally, notes above C4 go to right hand, below to left hand
        // But we can be smarter by looking at stem direction and timing

        if (note.stem === 'down' && noteValue >= 60) {
          // Stem down in treble clef usually indicates a secondary voice
          multiNote.voiceId = 'rightHand'
          rightHandNotes.push(multiNote)
        } else if (note.stem === 'up' && noteValue < 60) {
          // Stem up in bass clef
          multiNote.voiceId = 'leftHand'
          leftHandNotes.push(multiNote)
        } else if (noteValue >= 60) {
          // Higher notes generally right hand
          multiNote.voiceId = 'rightHand'
          rightHandNotes.push(multiNote)
        } else {
          // Lower notes generally left hand
          multiNote.voiceId = 'leftHand'
          leftHandNotes.push(multiNote)
        }
      })

      // Create staves with voices
      const staves: Staff[] = []

      // Add treble staff if there are right hand notes
      if (rightHandNotes.length > 0) {
        staves.push({
          id: 'treble',
          clef: Clef.TREBLE,
          voices: [
            {
              id: 'rightHand',
              name: 'Right Hand',
              notes: rightHandNotes,
            },
          ],
        })
      }

      // Add bass staff if there are left hand notes
      if (leftHandNotes.length > 0) {
        staves.push({
          id: 'bass',
          clef: Clef.BASS,
          voices: [
            {
              id: 'leftHand',
              name: 'Left Hand',
              notes: leftHandNotes,
            },
          ],
        })
      }

      // If no notes were assigned to either hand, put them all in right hand
      if (staves.length === 0 && measure.notes.length > 0) {
        const allNotes = measure.notes.map(note => ({
          keys: note.keys,
          duration: note.duration,
          time: note.time,
          voiceId: 'rightHand',
          accidental: note.accidental,
          dots: note.dots,
          stem: note.stem,
          rest: note.rest,
          tie: note.tie,
        }))

        staves.push({
          id: 'treble',
          clef: measure.clef || Clef.TREBLE,
          voices: [
            {
              id: 'rightHand',
              name: 'Right Hand',
              notes: allNotes,
            },
          ],
        })
      }

      return {
        number: measure.number,
        staves,
        timeSignature: measure.timeSignature,
        keySignature: measure.keySignature,
        tempo: measure.tempo,
        dynamics: measure.dynamics,
        barLine: measure.barLine,
      }
    }
  )

  // Update the score with enhanced measures
  return {
    ...basicScore,
    measures: enhancedMeasures,
  }
}

/**
 * Extract MIDI number from note string (e.g., "c/4" -> 60)
 */
function extractMidiNumber(noteString: string): number {
  const match = noteString.match(/([a-g])(#|b)?\/(\d)/)
  if (!match) return 60 // Default to middle C

  const [, note, accidental, octaveStr] = match
  const octave = parseInt(octaveStr)

  // Note to MIDI base values (for octave 0)
  const noteValues: Record<string, number> = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11,
  }

  let midi = noteValues[note] + (octave + 1) * 12

  if (accidental === '#') midi += 1
  else if (accidental === 'b') midi -= 1

  return midi
}

/**
 * Batch convert multiple SheetMusic pieces to Score format
 */
export function batchConvertToMultiVoice(pieces: SheetMusic[]): Score[] {
  return pieces.map(convertSingleVoiceToMultiVoice)
}
