import { Renderer, Stave, StaveNote, Voice, Formatter, Beam } from 'vexflow'
import type {
  SheetMusic,
  Measure,
  TimeSignature,
} from '../modules/sheetMusic/types'
import { convertMeasureForVexFlow } from './sheetMusicTypeConverters'

export interface RenderOptions {
  width: number
  scale: number
  measuresPerLine?: number
  startMeasureNumber?: number
}

export class NotationRenderer {
  private renderer: Renderer | null = null
  private context: ReturnType<Renderer['getContext']> | null = null

  constructor(private container: HTMLDivElement) {}

  render(sheetMusic: SheetMusic, options: RenderOptions) {
    // Debug logging
    console.log('NotationRenderer.render called with:', {
      title: sheetMusic.title,
      measures: sheetMusic.measures?.length || 0,
      instrument: sheetMusic.instrument,
    })

    // Validate input
    if (!sheetMusic.measures || sheetMusic.measures.length === 0) {
      console.error('No measures to render in sheet music')
      this.container.innerHTML =
        '<div style="padding: 20px; text-align: center;">No music data available</div>'
      return
    }

    // Clear previous content
    this.container.innerHTML = ''

    try {
      // Create renderer
      this.renderer = new Renderer(this.container, Renderer.Backends.SVG)
    } catch (error) {
      console.error('Failed to create VexFlow renderer:', error)
      this.container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: red;">Failed to initialize music renderer</div>'
      return
    }

    // Calculate height based on number of measures
    const measuresPerLine = options.measuresPerLine || 2
    const numberOfLines = Math.ceil(
      sheetMusic.measures.length / measuresPerLine
    )
    // Adjust height based on layout
    const lineHeight = measuresPerLine === 1 ? 150 : 150 // Consistent line height
    const baseHeight = measuresPerLine === 1 ? 60 : 100
    const height = baseHeight + numberOfLines * lineHeight

    this.renderer.resize(options.width, height)
    this.context = this.renderer.getContext()
    this.context.scale(options.scale, options.scale)

    // Calculate available width after scaling
    const scaledWidth = options.width / options.scale
    // Dynamic margin based on measures per line
    const margin = measuresPerLine === 1 ? 40 : 20 // More margin for single measure
    const staveWidth = (scaledWidth - margin * 2) / measuresPerLine
    const staveX = margin
    let currentY = measuresPerLine === 1 ? 40 : 40 // Consistent top padding

    // Render measures
    sheetMusic.measures.forEach((measure, index) => {
      const x = staveX + (index % measuresPerLine) * staveWidth

      // Start new line if needed
      if (index > 0 && index % measuresPerLine === 0) {
        currentY += lineHeight
      }

      try {
        // Get the time signature for this measure (from measure itself or from sheet music)
        const measureTimeSignature =
          measure.timeSignature || sheetMusic.timeSignature
        this.renderMeasure(
          measure,
          x,
          currentY,
          staveWidth,
          index === 0,
          measureTimeSignature as TimeSignature
        )
      } catch (error) {
        console.error(`Error rendering measure ${index + 1}:`, error)
        // Continue with next measure instead of crashing
      }

      // Add measure numbers
      if (index % measuresPerLine === 0 && this.context) {
        this.context.setFont('Arial', 10, '')
        const measureNumber = (options.startMeasureNumber || 0) + index + 1
        this.context.fillText(`${measureNumber}`, x - 12, currentY + 5)
      }
    })

    // Add tempo marking if present
    if (sheetMusic.measures[0]?.tempo && this.context) {
      this.context.setFont('Arial', 14, '')
      const tempo = sheetMusic.measures[0].tempo
      // Show tempo as BPM
      this.context.fillText(`♩ = ${tempo}`, staveX, 30)
    }
  }

  private renderMeasure(
    measure: Measure,
    x: number,
    y: number,
    width: number,
    isFirst: boolean,
    timeSignature?: TimeSignature // Pass time signature for all measures
  ) {
    try {
      // Convert measure to VexFlow-compatible format
      const vexMeasure = convertMeasureForVexFlow(measure)

      console.log(`Rendering measure ${measure.number}:`, {
        clef: vexMeasure.clef,
        timeSignature: vexMeasure.timeSignature,
        keySignature: vexMeasure.keySignature,
        notesCount: vexMeasure.notes?.length || 0,
        firstNote: vexMeasure.notes?.[0],
      })

      // Ensure we have a time signature for voice creation
      if (!vexMeasure.timeSignature && !timeSignature) {
        console.warn(
          `Measure ${measure.number} missing time signature, using 4/4`
        )
      }

      // Create stave
      const stave = new Stave(x, y, width)

      // Add clef, time signature, and key signature for first measure
      if (isFirst) {
        if (vexMeasure.clef) {
          try {
            stave.addClef(vexMeasure.clef)
          } catch (error) {
            console.warn(
              `Invalid clef "${vexMeasure.clef}", using treble as fallback`,
              error
            )
            stave.addClef('treble')
          }
        }
        if (vexMeasure.timeSignature)
          stave.addTimeSignature(vexMeasure.timeSignature)
        if (vexMeasure.keySignature)
          stave.addKeySignature(vexMeasure.keySignature)
      }

      if (this.context) {
        stave.setContext(this.context).draw()
      }

      // Parse time signature for voice configuration
      let numBeats = 4
      let beatValue = 4
      // Use the measure's time signature if available, otherwise use the passed time signature
      const timeSig = vexMeasure.timeSignature || timeSignature || '4/4'

      // Handle both string format ("4/4") and enum format
      if (typeof timeSig === 'string' && timeSig.includes('/')) {
        const [beats, value] = timeSig.split('/').map(Number)
        if (!isNaN(beats) && !isNaN(value)) {
          numBeats = beats
          beatValue = value
        }
      } else {
        console.warn(`Invalid time signature format: ${timeSig}, using 4/4`)
      }

      // Check if measure has any notes
      if (!vexMeasure.notes || vexMeasure.notes.length === 0) {
        // Add a whole rest for empty measures
        const restDuration = this.getRestDurationForTimeSignature(
          numBeats,
          beatValue
        )
        const vexNotes = [
          new StaveNote({ keys: ['b/4'], duration: restDuration + 'r' }),
        ]

        // Create voice and add the rest
        const voice = new Voice({ numBeats, beatValue })
        voice.addTickables(vexNotes)

        // Format and draw
        new Formatter().joinVoices([voice]).format([voice], width - 20)
        if (this.context) {
          voice.draw(this.context, stave)
        }
        return
      }

      // Convert measure notes to VexFlow notes
      const vexNotes = vexMeasure.notes.map(note => {
        // Validate note data
        if (!note.keys || note.keys.length === 0) {
          console.warn('Note missing keys, using default', note)
          return new StaveNote({
            keys: ['b/4'],
            duration: note.duration || 'q',
          })
        }
        if (!note.duration) {
          console.warn('Note missing duration, using quarter note', note)
          return new StaveNote({ keys: note.keys, duration: 'q' })
        }

        try {
          // Check if this is a rest
          if (note.rest) {
            return new StaveNote({
              keys: note.keys,
              duration: note.duration + 'r', // Add 'r' suffix for rests
            })
          }
          return new StaveNote({ keys: note.keys, duration: note.duration })
        } catch (error) {
          console.error('Error creating StaveNote:', note, error)
          // Return a default quarter note as fallback
          return new StaveNote({ keys: ['b/4'], duration: 'q' })
        }
      })

      // Calculate total duration of notes in the measure
      const totalDuration = this.calculateTotalDuration(vexNotes)
      const expectedDuration = (numBeats / beatValue) * 4 // Convert to quarter note units

      console.log(`Measure ${measure.number} duration check:`, {
        totalDuration,
        expectedDuration,
        numBeats,
        beatValue,
      })

      // If measure has too many notes, warn but try to render anyway
      if (totalDuration > expectedDuration) {
        console.warn(
          `Measure ${measure.number} has too many beats: ${totalDuration} > ${expectedDuration}`
        )
        // Don't add rests, just try to render what we have
      } else if (totalDuration < expectedDuration) {
        // If measure is incomplete, add rests to fill it
        const remainingDuration = expectedDuration - totalDuration
        const rests = this.createRestsForDuration(remainingDuration)
        vexNotes.push(...rests)
      }

      // Create beams for sixteenth notes (group by 4)
      // Only beam actual notes, not rests
      const beams: Beam[] = []
      let noteGroup: StaveNote[] = []

      for (const vexNote of vexNotes) {
        const duration = vexNote.getDuration()
        // Check if it's a sixteenth note (not a rest)
        if (duration === '16') {
          noteGroup.push(vexNote)
          // Create beam when we have 4 sixteenth notes
          if (noteGroup.length === 4) {
            beams.push(new Beam(noteGroup))
            noteGroup = []
          }
        } else {
          // Reset group if we encounter a non-sixteenth note or rest
          noteGroup = []
        }
      }

      // Create voice and add notes
      const voice = new Voice({ numBeats, beatValue })

      try {
        voice.addTickables(vexNotes)

        // Format and draw
        new Formatter().joinVoices([voice]).format([voice], width - 20)
        if (this.context) {
          voice.draw(this.context, stave)
        }

        // Draw beams
        if (this.context) {
          beams.forEach(beam => {
            beam.setContext(this.context!).draw()
          })
        }
      } catch (error: unknown) {
        console.error(
          `Error formatting/drawing measure ${measure.number}:`,
          error
        )

        // If we get a "too many ticks" error, try to render without strict formatting
        if (error.message && error.message.includes('Too many ticks')) {
          console.warn(
            `Attempting to render measure ${measure.number} without strict voice formatting`
          )

          // Create a voice with auto mode to be more lenient
          const lenientVoice = new Voice({
            numBeats,
            beatValue,
            resolution: 65536,
          })
          lenientVoice.setMode(0) // Set to SOFT mode (less strict)

          try {
            lenientVoice.addTickables(vexNotes)

            // Try to format with more width
            new Formatter()
              .joinVoices([lenientVoice])
              .format([lenientVoice], width)
            if (this.context) {
              lenientVoice.draw(this.context, stave)
            }
          } catch (lenientError) {
            console.error(
              `Failed to render measure ${measure.number} even in lenient mode:`,
              lenientError
            )
            // As a last resort, just draw the stave without notes
          }
        }
      }
    } catch (error) {
      console.error(`Failed to render measure ${measure.number}:`, error)
      // Don't re-throw to allow other measures to render
    }
  }

  private getRestDurationForTimeSignature(
    numBeats: number,
    beatValue: number
  ): string {
    // Calculate the rest duration based on time signature
    const totalQuarterNotes = (numBeats / beatValue) * 4

    // Map quarter note values to VexFlow duration strings
    if (totalQuarterNotes >= 4) return 'w' // whole rest
    if (totalQuarterNotes >= 2) return 'h' // half rest
    if (totalQuarterNotes >= 1) return 'q' // quarter rest
    if (totalQuarterNotes >= 0.5) return '8' // eighth rest
    return '16' // sixteenth rest as fallback
  }

  private calculateTotalDuration(notes: StaveNote[]): number {
    // Calculate total duration in quarter note units
    let total = 0
    for (const note of notes) {
      const duration = note.getDuration()
      // Remove 'r' suffix for rests to get the base duration
      const baseDuration = duration.replace('r', '')
      switch (baseDuration) {
        case 'w':
          total += 4
          break
        case 'h':
          total += 2
          break
        case 'q':
          total += 1
          break
        case '8':
          total += 0.5
          break
        case '16':
          total += 0.25
          break
        case '32':
          total += 0.125
          break
      }
    }
    return total
  }

  private createRestsForDuration(duration: number): StaveNote[] {
    // Create rests to fill the given duration (in quarter note units)
    const rests: StaveNote[] = []
    let remaining = duration

    // Fill with the largest possible rests first
    while (remaining > 0) {
      if (remaining >= 4) {
        rests.push(new StaveNote({ keys: ['b/4'], duration: 'wr' }))
        remaining -= 4
      } else if (remaining >= 2) {
        rests.push(new StaveNote({ keys: ['b/4'], duration: 'hr' }))
        remaining -= 2
      } else if (remaining >= 1) {
        rests.push(new StaveNote({ keys: ['b/4'], duration: 'qr' }))
        remaining -= 1
      } else if (remaining >= 0.5) {
        rests.push(new StaveNote({ keys: ['b/4'], duration: '8r' }))
        remaining -= 0.5
      } else if (remaining >= 0.25) {
        rests.push(new StaveNote({ keys: ['b/4'], duration: '16r' }))
        remaining -= 0.25
      } else {
        // For very small remaining durations, use 32nd rest
        rests.push(new StaveNote({ keys: ['b/4'], duration: '32r' }))
        remaining -= 0.125
      }
    }

    return rests
  }

  dispose() {
    if (this.renderer) {
      // Clean up if needed
      this.renderer = null
      this.context = null
    }
  }
}
