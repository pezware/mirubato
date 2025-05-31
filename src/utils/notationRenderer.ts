import { Renderer, Stave, StaveNote, Voice, Formatter, Beam } from 'vexflow'
import { SheetMusic, Measure } from '../types/sheetMusic'

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
    // Clear previous content
    this.container.innerHTML = ''

    // Create renderer
    this.renderer = new Renderer(this.container, Renderer.Backends.SVG)

    // Calculate height based on number of measures
    const measuresPerLine = options.measuresPerLine || 2
    const numberOfLines = Math.ceil(
      sheetMusic.measures.length / measuresPerLine
    )
    const height = 100 + numberOfLines * 150 // Base height + lines

    this.renderer.resize(options.width, height)
    this.context = this.renderer.getContext()
    this.context.scale(options.scale, options.scale)

    // Calculate available width after scaling
    const scaledWidth = options.width / options.scale
    const margin = 20 // Smaller margin for mobile
    const staveWidth = (scaledWidth - margin * 2) / measuresPerLine
    const staveX = margin
    let currentY = 40 // Less top padding

    // Render measures
    sheetMusic.measures.forEach((measure, index) => {
      const x = staveX + (index % measuresPerLine) * staveWidth

      // Start new line if needed
      if (index > 0 && index % measuresPerLine === 0) {
        currentY += 150
      }

      this.renderMeasure(measure, x, currentY, staveWidth, index === 0)

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
      // Show just the tempo marking without BPM for practice
      this.context.fillText(tempo.marking || '', staveX, 30)
    }
  }

  private renderMeasure(
    measure: Measure,
    x: number,
    y: number,
    width: number,
    isFirst: boolean
  ) {
    // Create stave
    const stave = new Stave(x, y, width)

    // Add clef, time signature, and key signature for first measure
    if (isFirst) {
      if (measure.clef) stave.addClef(measure.clef)
      if (measure.timeSignature) stave.addTimeSignature(measure.timeSignature)
      if (measure.keySignature) stave.addKeySignature(measure.keySignature)
    }

    if (this.context) {
      stave.setContext(this.context).draw()
    }

    // Convert measure notes to VexFlow notes
    const vexNotes = measure.notes.map(
      note => new StaveNote({ keys: note.keys, duration: note.duration })
    )

    // Create beams for sixteenth notes (group by 4)
    const beams: Beam[] = []
    for (let i = 0; i < vexNotes.length; i += 4) {
      if (i + 3 < vexNotes.length && vexNotes[i].getDuration() === '16') {
        beams.push(new Beam(vexNotes.slice(i, i + 4)))
      }
    }

    // Create voice and add notes
    const voice = new Voice({ numBeats: 4, beatValue: 4 })
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
  }

  dispose() {
    if (this.renderer) {
      // Clean up if needed
      this.renderer = null
      this.context = null
    }
  }
}
