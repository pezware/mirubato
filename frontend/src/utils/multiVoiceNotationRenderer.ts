/**
 * Multi-Voice Notation Renderer
 *
 * Handles rendering of multi-voice scores using VexFlow,
 * supporting polyphonic music, grand staff notation, and complex layouts.
 */

import {
  Renderer,
  Stave,
  StaveNote,
  Voice as VexVoice,
  Formatter,
  StaveConnector,
  Beam,
  Accidental,
  Articulation as VexArticulation,
  Annotation,
  StaveTie,
  // Factory,
} from 'vexflow'
import {
  Score,
  MultiVoiceMeasure,
  Staff,
  Voice,
  MultiVoiceNote,
} from '../modules/sheetMusic/multiVoiceTypes'
import {
  Clef,
  NoteDuration,
  TimeSignature,
  KeySignature,
  Articulation,
} from '../modules/sheetMusic/types'

/**
 * Rendering options for multi-voice notation
 */
export interface MultiVoiceRenderOptions {
  /** Width of the rendering area */
  width: number
  /** Height of the rendering area */
  height: number
  /** Padding around the score */
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
  /** Scale factor for the entire score */
  scale: number
  /** Whether to show measure numbers */
  showMeasureNumbers: boolean
  /** Whether to show voice names */
  showVoiceNames: boolean
  /** Spacing between staves */
  staveSpacing: number
  /** Spacing between systems */
  systemSpacing: number
  /** Measures per system */
  measuresPerSystem: number
  /** Whether to auto-layout the score */
  autoLayout: boolean
}

/**
 * Default rendering options
 */
const DEFAULT_OPTIONS: MultiVoiceRenderOptions = {
  width: 1200,
  height: 800,
  padding: {
    top: 40,
    right: 40,
    bottom: 40,
    left: 40,
  },
  scale: 1.0,
  showMeasureNumbers: true,
  showVoiceNames: false,
  staveSpacing: 80,
  systemSpacing: 100,
  measuresPerSystem: 4,
  autoLayout: true,
}

/**
 * System type for layout
 */
interface LayoutSystem {
  measures: MultiVoiceMeasure[]
  startMeasure: number
  endMeasure: number
}

/**
 * Multi-voice notation renderer
 */
export class MultiVoiceNotationRenderer {
  private renderer: Renderer | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private context: any = null
  // private factory: Factory | null = null
  private options: MultiVoiceRenderOptions

  constructor(
    private container: HTMLElement,
    options: Partial<MultiVoiceRenderOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.setupRenderer()
  }

  /**
   * Sets up the VexFlow renderer
   */
  private setupRenderer(): void {
    // Clear existing content
    this.container.innerHTML = ''

    // Create renderer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.renderer = new Renderer(this.container as any, Renderer.Backends.SVG)

    // Configure renderer
    this.renderer.resize(this.options.width, this.options.height)
    this.context = this.renderer.getContext()
    this.context.setFont('Arial', 10)
    this.context.scale(this.options.scale, this.options.scale)

    // Create factory for easier API
    // this.factory = new Factory({
    //   renderer: { elementId: this.container.id, width: this.options.width, height: this.options.height }
    // })
  }

  /**
   * Renders a complete score
   */
  public renderScore(score: Score): void {
    if (!this.context) {
      throw new Error('Renderer not initialized')
    }

    // Clear previous rendering
    this.context.clear()

    // Calculate layout
    const systems = this.layoutSystems(score)

    // Render each system
    let currentY = this.options.padding.top
    for (const system of systems) {
      this.renderSystem(system, currentY)
      currentY +=
        this.calculateSystemHeight(system) + this.options.systemSpacing
    }

    // Add score title and composer
    this.renderScoreHeader(score)
  }

  /**
   * Layouts the score into systems
   */
  private layoutSystems(score: Score): LayoutSystem[] {
    const systems: LayoutSystem[] = []
    const measuresPerSystem = this.options.measuresPerSystem

    for (let i = 0; i < score.measures.length; i += measuresPerSystem) {
      const systemMeasures = score.measures.slice(i, i + measuresPerSystem)
      systems.push({
        measures: systemMeasures,
        startMeasure: i,
        endMeasure: Math.min(
          i + measuresPerSystem - 1,
          score.measures.length - 1
        ),
      })
    }

    return systems
  }

  /**
   * Renders a system (line of measures)
   */
  private renderSystem(system: LayoutSystem, y: number): void {
    const measures = system.measures
    const measureWidth = this.calculateMeasureWidth(measures.length)
    let currentX = this.options.padding.left

    // Group staves by part
    // const staveGroups = this.groupStavesByPart(measures[0])

    // Render each measure
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i]
      const isFirstMeasure = i === 0
      // const isLastMeasure = i === measures.length - 1

      // Render staves for this measure
      const staves = this.renderMeasureStaves(
        measure,
        currentX,
        y,
        measureWidth,
        isFirstMeasure
      )

      // Connect staves if needed
      if (isFirstMeasure) {
        this.connectStaves(staves, currentX)
      }

      // Render voices for each staff
      this.renderMeasureVoices(measure, staves)

      currentX += measureWidth
    }
  }

  /**
   * Groups staves by part for proper bracketing
   */
  // private groupStavesByPart(measure: MultiVoiceMeasure): Map<string, Staff[]> {
  //   const groups = new Map<string, Staff[]>()
  //
  //   for (const staff of measure.staves) {
  //     // Extract part ID from staff ID (assumes format "partId-staffN")
  //     const partId = staff.id.split('-')[0]
  //     if (!groups.has(partId)) {
  //       groups.set(partId, [])
  //     }
  //     groups.get(partId)!.push(staff)
  //   }
  //
  //   return groups
  // }

  /**
   * Renders staves for a measure
   */
  private renderMeasureStaves(
    measure: MultiVoiceMeasure,
    x: number,
    y: number,
    width: number,
    showClefAndKey: boolean
  ): Map<string, Stave> {
    const staves = new Map<string, Stave>()
    let currentY = y

    for (const staff of measure.staves) {
      const stave = new Stave(x, currentY, width)

      // Add clef and key signature on first measure
      if (showClefAndKey) {
        stave.addClef(this.mapClefToVexFlow(staff.clef))
        if (measure.keySignature) {
          stave.addKeySignature(
            this.mapKeySignatureToVexFlow(measure.keySignature)
          )
        }
      }

      // Add time signature if changed
      if (measure.timeSignature) {
        stave.addTimeSignature(measure.timeSignature)
      }

      // Add measure number
      if (this.options.showMeasureNumbers && staff === measure.staves[0]) {
        stave.setMeasure(measure.number)
      }

      // Set context and draw
      stave.setContext(this.context).draw()

      staves.set(staff.id, stave)
      currentY += this.options.staveSpacing
    }

    return staves
  }

  /**
   * Connects staves with brackets/braces
   */
  private connectStaves(staves: Map<string, Stave>, _x: number): void {
    const staveArray = Array.from(staves.values())
    if (staveArray.length < 2) return

    // Connect grand staff with brace
    const connector = new StaveConnector(
      staveArray[0],
      staveArray[staveArray.length - 1]
    )
    connector.setType(StaveConnector.type.BRACE)
    connector.setContext(this.context).draw()

    // Add single barline
    const barConnector = new StaveConnector(
      staveArray[0],
      staveArray[staveArray.length - 1]
    )
    barConnector.setType(StaveConnector.type.SINGLE_LEFT)
    barConnector.setContext(this.context).draw()
  }

  /**
   * Renders voices for a measure
   */
  private renderMeasureVoices(
    measure: MultiVoiceMeasure,
    staves: Map<string, Stave>
  ): void {
    // Collect all voices to format together
    const vexVoices: VexVoice[] = []
    const voiceNoteMap = new Map<Voice, StaveNote[]>()

    for (const staff of measure.staves) {
      const stave = staves.get(staff.id)
      if (!stave) continue

      for (const voice of staff.voices) {
        const vexNotes = this.convertVoiceToVexFlow(voice, staff, measure)
        const vexVoice = new VexVoice({
          numBeats: this.getBeatsFromTimeSignature(measure.timeSignature),
          beatValue: this.getBeatValueFromTimeSignature(measure.timeSignature),
        })

        vexVoice.addTickables(vexNotes)
        vexVoices.push(vexVoice)
        voiceNoteMap.set(voice, vexNotes)

        // Apply stem direction
        if (voice.stemDirection && voice.stemDirection !== 'auto') {
          vexNotes.forEach(note => {
            if (note instanceof StaveNote) {
              note.setStemDirection(voice.stemDirection === 'up' ? 1 : -1)
            }
          })
        }
      }
    }

    // Format voices together
    if (vexVoices.length > 0) {
      const formatter = new Formatter()

      // Join voices if they're on the same staff
      const groups: VexVoice[][] = []
      for (const staff of measure.staves) {
        const staveVoices: VexVoice[] = []
        const stave = staves.get(staff.id)
        if (!stave) continue

        for (let i = 0; i < staff.voices.length; i++) {
          const voiceIndex =
            measure.staves
              .slice(0, measure.staves.indexOf(staff))
              .reduce((sum, s) => sum + s.voices.length, 0) + i
          staveVoices.push(vexVoices[voiceIndex])
        }

        if (staveVoices.length > 0) {
          groups.push(staveVoices)
        }
      }

      // Format each group
      for (const group of groups) {
        const staveWidth = staves.values().next().value?.getWidth() || 200
        formatter.joinVoices(group).format(group, staveWidth - 120)
      }

      // Draw all voices
      let voiceIndex = 0
      for (const staff of measure.staves) {
        const stave = staves.get(staff.id)
        if (!stave) continue

        for (const _voice of staff.voices) {
          vexVoices[voiceIndex].draw(this.context, stave)
          voiceIndex++
        }
      }
    }

    // Add beams, ties, and other connections
    this.addBeamsAndTies(voiceNoteMap)
  }

  /**
   * Converts a voice to VexFlow notes
   */
  private convertVoiceToVexFlow(
    voice: Voice,
    staff: Staff,
    _measure: MultiVoiceMeasure
  ): StaveNote[] {
    const notes: StaveNote[] = []

    for (const note of voice.notes) {
      const vexNote = this.createVexFlowNote(note, staff.clef)
      notes.push(vexNote)
    }

    return notes
  }

  /**
   * Creates a VexFlow note from a MultiVoiceNote
   */
  private createVexFlowNote(note: MultiVoiceNote, clef: Clef): StaveNote {
    const vexNote = new StaveNote({
      keys: note.rest ? ['b/4'] : note.keys,
      duration:
        this.mapDurationToVexFlow(note.duration) + (note.rest ? 'r' : ''),
      clef: this.mapClefToVexFlow(clef).toLowerCase(),
      stemDirection:
        note.stem === 'up' ? 1 : note.stem === 'down' ? -1 : undefined,
    })

    // Add accidentals
    if (note.accidental && !note.rest) {
      note.keys.forEach((_key, index) => {
        vexNote.addModifier(new Accidental(note.accidental!), index)
      })
    }

    // Add dots
    if (note.dots) {
      for (let i = 0; i < note.dots; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vexNote as any).addDotToAll?.()
      }
    }

    // Add articulations
    if (note.articulation) {
      vexNote.addModifier(
        new VexArticulation(this.mapArticulationToVexFlow(note.articulation))
      )
    }

    // Add dynamics
    if (note.dynamic) {
      vexNote.addModifier(
        new Annotation(note.dynamic).setVerticalJustification(
          Annotation.VerticalJustify.BOTTOM
        )
      )
    }

    // Add fingering
    if (note.fingering) {
      vexNote.addModifier(
        new Annotation(note.fingering).setVerticalJustification(
          Annotation.VerticalJustify.TOP
        )
      )
    }

    return vexNote
  }

  /**
   * Adds beams and ties to notes
   */
  private addBeamsAndTies(voiceNoteMap: Map<Voice, StaveNote[]>): void {
    for (const [voice, notes] of voiceNoteMap) {
      // Auto-beam eighth notes and shorter
      const beamableNotes: StaveNote[] = []
      for (const note of notes) {
        const duration = (note as StaveNote & { duration?: string }).duration
        if (duration && ['8', '16', '32'].includes(duration)) {
          beamableNotes.push(note)
        } else if (beamableNotes.length > 1) {
          const beam = new Beam(beamableNotes)
          beam.setContext(this.context).draw()
          beamableNotes.length = 0
        } else {
          beamableNotes.length = 0
        }
      }

      // Handle remaining beamable notes
      if (beamableNotes.length > 1) {
        const beam = new Beam(beamableNotes)
        beam.setContext(this.context).draw()
      }

      // Add ties
      for (let i = 0; i < voice.notes.length - 1; i++) {
        if (voice.notes[i].tie === 'start') {
          const tie = new StaveTie({
            firstNote: notes[i],
            lastNote: notes[i + 1],
            firstIndexes: [0],
            lastIndexes: [0],
          })
          tie.setContext(this.context).draw()
        }
      }
    }
  }

  /**
   * Renders the score header
   */
  private renderScoreHeader(score: Score): void {
    const ctx = this.context

    // Title
    ctx.save()
    ctx.setFont('Arial', 24, 'bold')
    ctx.fillText(score.title, this.options.width / 2, 20, {
      textAlign: 'center',
    })

    // Composer
    ctx.setFont('Arial', 14, 'normal')
    ctx.fillText(
      score.composer,
      this.options.width - this.options.padding.right,
      35,
      { textAlign: 'right' }
    )

    // Arranger
    if (score.arranger) {
      ctx.setFont('Arial', 12, 'italic')
      ctx.fillText(
        `arr. ${score.arranger}`,
        this.options.width - this.options.padding.right,
        50,
        { textAlign: 'right' }
      )
    }

    ctx.restore()
  }

  /**
   * Calculates measure width
   */
  private calculateMeasureWidth(measureCount: number): number {
    const availableWidth =
      this.options.width -
      this.options.padding.left -
      this.options.padding.right
    return availableWidth / measureCount
  }

  /**
   * Calculates system height
   */
  private calculateSystemHeight(system: LayoutSystem): number {
    const measures = system.measures
    const maxStaves = Math.max(...measures.map(m => m.staves.length))
    return maxStaves * this.options.staveSpacing
  }

  /**
   * Maps our Clef enum to VexFlow clef string
   */
  private mapClefToVexFlow(clef: Clef): string {
    const clefMap: Record<Clef, string> = {
      [Clef.TREBLE]: 'treble',
      [Clef.BASS]: 'bass',
      [Clef.ALTO]: 'alto',
      [Clef.TENOR]: 'tenor',
      [Clef.GRAND_STAFF]: 'treble', // Default to treble for grand staff
    }
    return clefMap[clef] || 'treble'
  }

  /**
   * Maps our KeySignature to VexFlow format
   */
  private mapKeySignatureToVexFlow(keySignature: KeySignature): string {
    // VexFlow expects key signatures like 'C', 'G', 'F#', etc.
    return keySignature
      .replace(/_MAJOR|_MINOR/g, '')
      .replace('_SHARP', '#')
      .replace('_FLAT', 'b')
  }

  /**
   * Maps our NoteDuration to VexFlow format
   */
  private mapDurationToVexFlow(duration: NoteDuration): string {
    const durationMap: Record<NoteDuration, string> = {
      [NoteDuration.WHOLE]: 'w',
      [NoteDuration.HALF]: 'h',
      [NoteDuration.QUARTER]: 'q',
      [NoteDuration.EIGHTH]: '8',
      [NoteDuration.SIXTEENTH]: '16',
      [NoteDuration.THIRTY_SECOND]: '32',
    }
    return durationMap[duration] || 'q'
  }

  /**
   * Maps our Articulation to VexFlow format
   */
  private mapArticulationToVexFlow(articulation: Articulation): string {
    const articulationMap: Partial<Record<Articulation, string>> = {
      [Articulation.STACCATO]: 'a.',
      [Articulation.TENUTO]: 'a-',
      [Articulation.ACCENT]: 'a>',
      [Articulation.MARCATO]: 'a^',
      // [Articulation.FERMATA]: 'a@a',
    }
    return articulationMap[articulation] || 'a.'
  }

  /**
   * Gets number of beats from time signature
   */
  private getBeatsFromTimeSignature(timeSignature?: TimeSignature): number {
    if (!timeSignature) return 4
    const [beats] = timeSignature.split('/').map(Number)
    return beats
  }

  /**
   * Gets beat value from time signature
   */
  private getBeatValueFromTimeSignature(timeSignature?: TimeSignature): number {
    if (!timeSignature) return 4
    const [, beatValue] = timeSignature.split('/').map(Number)
    return beatValue
  }

  /**
   * Updates rendering options
   */
  public updateOptions(options: Partial<MultiVoiceRenderOptions>): void {
    this.options = { ...this.options, ...options }
    this.setupRenderer()
  }

  /**
   * Resizes the renderer
   */
  public resize(width: number, height: number): void {
    this.options.width = width
    this.options.height = height
    this.setupRenderer()
  }

  /**
   * Clears the rendering
   */
  public clear(): void {
    if (this.context) {
      this.context.clear()
    }
  }

  /**
   * Destroys the renderer
   */
  public destroy(): void {
    this.clear()
    this.renderer = null
    this.context = null
    // this.factory = null
  }
}
