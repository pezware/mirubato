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
  /** Whether to use strict timing validation */
  strictTiming: boolean
}

/**
 * Default rendering options
 */
const DEFAULT_OPTIONS: MultiVoiceRenderOptions = {
  width: 1200,
  height: 800,
  padding: {
    top: 60,
    right: 40,
    bottom: 40,
    left: 40,
  },
  scale: 1.0,
  showMeasureNumbers: true,
  showVoiceNames: false,
  staveSpacing: 120,
  systemSpacing: 140,
  measuresPerSystem: 3, // Reduce measures per system for better spacing
  autoLayout: true,
  strictTiming: false, // Default to lenient mode for compatibility
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
  private setupRenderer(forceRecreate: boolean = false): void {
    // Only clear and recreate if necessary
    if (!this.renderer || forceRecreate) {
      // Clear existing content only if we're forcing recreation
      if (forceRecreate) {
        this.container.innerHTML = ''
      }

      // Create renderer with SVG backend
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.renderer = new Renderer(this.container as any, Renderer.Backends.SVG)
    }

    // Configure/reconfigure renderer
    this.renderer.resize(this.options.width, this.options.height)
    this.context = this.renderer.getContext()
    this.context.setFont('Arial', 10, 'normal')

    // Disable any debug output
    if (this.context.setDebug) {
      this.context.setDebug(false)
    }

    // Reset scale to 1 before applying new scale
    this.context.scale(1 / this.previousScale, 1 / this.previousScale)
    this.context.scale(this.options.scale, this.options.scale)
    this.previousScale = this.options.scale

    // Create factory for easier API
    // this.factory = new Factory({
    //   renderer: { elementId: this.container.id, width: this.options.width, height: this.options.height }
    // })
  }

  private previousScale: number = 1

  /**
   * Renders a complete score
   */
  public renderScore(score: Score): void {
    if (!this.context || !this.renderer) {
      throw new Error('Renderer not initialized')
    }

    // Clear previous rendering using our custom clear method
    this.clear()

    // Re-setup the context after clearing
    this.context = this.renderer.getContext()
    this.context.setFont('Arial', 8, 'normal')
    this.context.scale(this.options.scale, this.options.scale)

    try {
      // Validate score has measures
      if (!score.measures || score.measures.length === 0) {
        console.warn('Score has no measures to render')
        return
      }

      // Calculate layout
      const systems = this.layoutSystems(score)

      // Render each system
      let currentY = this.options.padding.top
      for (const system of systems) {
        try {
          this.renderSystem(system, currentY)
          currentY +=
            this.calculateSystemHeight(system) + this.options.systemSpacing
        } catch (systemError) {
          console.error(
            `Error rendering system starting at measure ${system.startMeasure + 1}:`,
            systemError
          )
          // Continue with next system
          currentY += 100 // Default spacing on error
        }
      }

      // Add score title and composer
      this.renderScoreHeader(score)
    } catch (error) {
      console.error('Error rendering score:', error)
      // Show error message on canvas
      this.context.save()
      this.context.setFont('Arial', 14, 'normal')
      this.context.fillText(
        'Error rendering score. See console for details.',
        20,
        50
      )
      this.context.restore()
      throw error // Re-throw to be handled by parent component
    }
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
    const measureWidth = this.calculateMeasureWidth(measures)
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

      // Skip empty staves
      if (!staff.voices || staff.voices.length === 0) {
        continue
      }

      for (const voice of staff.voices) {
        const vexNotes = this.convertVoiceToVexFlow(voice, staff, measure)
        const vexVoice = new VexVoice({
          numBeats: this.getBeatsFromTimeSignature(measure.timeSignature),
          beatValue: this.getBeatValueFromTimeSignature(measure.timeSignature),
        })

        // Set VexFlow timing strictness based on options
        vexVoice.setStrict(this.options.strictTiming)

        try {
          vexVoice.addTickables(vexNotes)
          vexVoices.push(vexVoice)
          voiceNoteMap.set(voice, vexNotes)
        } catch (error) {
          console.warn(
            `Voice formatting error in measure ${measure.number}:`,
            error
          )
          // Try again with mode SOFT
          try {
            vexVoice.setMode(VexVoice.Mode.SOFT)
            vexVoice.addTickables(vexNotes)
            vexVoices.push(vexVoice)
            voiceNoteMap.set(voice, vexNotes)
          } catch (softError) {
            console.warn(
              `Voice still failed in SOFT mode, skipping voice ${voice.id} in measure ${measure.number}`
            )
            continue
          }
        }

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
        if (group.length === 0) continue

        try {
          const staveWidth = staves.values().next().value?.getWidth() || 200
          // Only format if all voices have notes
          const allVoicesHaveNotes = group.every(v => {
            try {
              return v.getTickables().length > 0
            } catch (e) {
              return false
            }
          })

          if (allVoicesHaveNotes) {
            // Calculate note density to adjust spacing
            const totalNotes = group.reduce((sum, voice) => {
              try {
                return sum + voice.getTickables().length
              } catch (e) {
                return sum
              }
            }, 0)

            // Increase spacing for dense passages
            const spacingMultiplier = Math.max(1, totalNotes / 8)
            const formatWidth = Math.max(
              staveWidth - 80,
              150 * spacingMultiplier
            )

            // In non-strict mode, let VexFlow auto-justify
            if (!this.options.strictTiming) {
              formatter.joinVoices(group)
              formatter.format(group, formatWidth, {
                autoBeam: true,
              })
            } else {
              formatter.joinVoices(group).format(group, formatWidth)
            }
          }
        } catch (formatError) {
          console.warn(
            `Error formatting voice group in measure ${measure.number}:`,
            formatError
          )
          // Continue with next group
        }
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
    measure: MultiVoiceMeasure
  ): StaveNote[] {
    const notes: StaveNote[] = []

    // If voice has no notes, create a whole rest
    if (!voice.notes || voice.notes.length === 0) {
      const wholeRest = new StaveNote({
        keys: ['b/4'],
        duration: 'wr',
        clef: this.mapClefToVexFlow(staff.clef).toLowerCase(),
      })
      return [wholeRest]
    }

    // Calculate total duration needed for the measure
    const beatsNeeded = this.getBeatsFromTimeSignature(measure.timeSignature)
    const beatValue = this.getBeatValueFromTimeSignature(measure.timeSignature)
    const totalDurationNeeded = (beatsNeeded / beatValue) * 4 // Convert to quarter note units

    // Calculate current total duration
    let currentTotalDuration = 0
    for (const note of voice.notes) {
      const vexNote = this.createVexFlowNote(note, staff.clef)
      notes.push(vexNote)
      currentTotalDuration += this.getNoteDurationValue(
        note.duration,
        note.dots
      )
    }

    // If not in strict timing mode, return notes as-is and let VexFlow handle it
    if (!this.options.strictTiming) {
      return notes
    }

    // Check if voice duration matches measure duration (only in strict mode)
    const tolerance = 0.0625 // 1/16th note tolerance for rounding errors

    if (Math.abs(currentTotalDuration - totalDurationNeeded) < tolerance) {
      // Close enough, consider it complete
      return notes
    } else if (currentTotalDuration < totalDurationNeeded) {
      // Voice is incomplete, add rests to fill the measure
      const remainingDuration = totalDurationNeeded - currentTotalDuration
      // Only log significant gaps
      if (remainingDuration > 0.25) {
        console.log(
          `Voice ${voice.id} in measure ${measure.number}: Adding ${remainingDuration} quarter notes of rest (had ${currentTotalDuration}, needs ${totalDurationNeeded})`
        )
      }
      const restDurations = this.calculateRestDurations(remainingDuration)

      for (const restDuration of restDurations) {
        const rest = new StaveNote({
          keys: ['b/4'],
          duration: this.mapDurationToVexFlow(restDuration) + 'r',
          clef: this.mapClefToVexFlow(staff.clef).toLowerCase(),
        })
        notes.push(rest)
      }
    } else if (currentTotalDuration > totalDurationNeeded + tolerance) {
      // Voice has too many notes
      // First check if this might be due to grace notes or tuplets
      const excess = currentTotalDuration - totalDurationNeeded

      // If the excess is small, it might be a rounding error or grace notes
      if (excess <= 0.5) {
        // Try to let VexFlow handle it with setStrict(false)
        console.log(
          `Voice ${voice.id} in measure ${measure.number}: Slight timing overflow (${excess}), letting VexFlow handle it`
        )
        return notes
      }

      // Otherwise, we need to handle the overflow
      console.warn(
        `Voice ${voice.id} in measure ${measure.number}: Has too many notes (${currentTotalDuration} vs ${totalDurationNeeded} needed). Attempting to fix...`
      )

      // Recalculate notes to fit
      const fittingNotes: StaveNote[] = []
      let accumulatedDuration = 0

      for (const note of voice.notes) {
        const noteDuration = this.getNoteDurationValue(note.duration, note.dots)
        if (accumulatedDuration + noteDuration <= totalDurationNeeded) {
          const vexNote = this.createVexFlowNote(note, staff.clef)
          fittingNotes.push(vexNote)
          accumulatedDuration += noteDuration
        } else {
          // This note would exceed the measure, stop here
          break
        }
      }

      // If we stopped mid-measure, add a rest to complete it
      if (accumulatedDuration < totalDurationNeeded) {
        const remainingDuration = totalDurationNeeded - accumulatedDuration
        const restDurations = this.calculateRestDurations(remainingDuration)

        for (const restDuration of restDurations) {
          const rest = new StaveNote({
            keys: ['b/4'],
            duration: this.mapDurationToVexFlow(restDuration) + 'r',
            clef: this.mapClefToVexFlow(staff.clef).toLowerCase(),
          })
          fittingNotes.push(rest)
        }
      }

      return fittingNotes
    }

    return notes
  }

  /**
   * Gets the duration value in quarter note units
   */
  private getNoteDurationValue(duration: NoteDuration, dots?: number): number {
    const durationValues: Record<NoteDuration, number> = {
      [NoteDuration.WHOLE]: 4,
      [NoteDuration.HALF]: 2,
      [NoteDuration.QUARTER]: 1,
      [NoteDuration.EIGHTH]: 0.5,
      [NoteDuration.SIXTEENTH]: 0.25,
      [NoteDuration.THIRTY_SECOND]: 0.125,
      // [NoteDuration.SIXTY_FOURTH]: 0.0625, // Not available in current enum
    }
    let value = durationValues[duration] || 1

    // Apply dots (each dot adds half the previous value)
    if (dots) {
      let dotValue = value / 2
      for (let i = 0; i < dots; i++) {
        value += dotValue
        dotValue /= 2
      }
    }

    return value
  }

  /**
   * Calculates rest durations to fill remaining time
   */
  private calculateRestDurations(remainingDuration: number): NoteDuration[] {
    const durations: NoteDuration[] = []
    const durationMap: Array<[number, NoteDuration]> = [
      [4, NoteDuration.WHOLE],
      [2, NoteDuration.HALF],
      [1, NoteDuration.QUARTER],
      [0.5, NoteDuration.EIGHTH],
      [0.25, NoteDuration.SIXTEENTH],
    ]

    let remaining = remainingDuration
    for (const [value, duration] of durationMap) {
      while (remaining >= value) {
        durations.push(duration)
        remaining -= value
      }
    }

    return durations
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
      const mappedAccidental = this.mapAccidentalToVexFlow(note.accidental)
      // Only add accidental if it maps to a valid VexFlow symbol
      if (
        mappedAccidental &&
        ['#', 'b', 'n', '##', 'bb'].includes(mappedAccidental)
      ) {
        note.keys.forEach((_key, index) => {
          vexNote.addModifier(new Accidental(mappedAccidental), index)
        })
      } else {
        console.warn(
          `Unknown accidental type: "${note.accidental}" - skipping accidental display`
        )
      }
    }

    // Add dots
    if (note.dots) {
      for (let i = 0; i < note.dots; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(vexNote as any).addDotToAll?.()
      }
    }

    // Add articulations
    if (note.articulation) {
      vexNote.addModifier(
        new VexArticulation(this.mapArticulationToVexFlow(note.articulation))
      )
    }

    // Add dynamics (only if it's a valid dynamic marking)
    if (note.dynamic && this.isValidDynamic(note.dynamic)) {
      vexNote.addModifier(
        new Annotation(note.dynamic)
          .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
          .setFont('Arial', 8, 'italic')
      )
    }

    // Add fingering (only if it's a valid fingering)
    if (note.fingering && this.isValidFingering(note.fingering)) {
      vexNote.addModifier(
        new Annotation(note.fingering)
          .setVerticalJustification(Annotation.VerticalJustify.TOP)
          .setFont('Arial', 8, 'normal')
      )
    }

    return vexNote
  }

  /**
   * Adds beams and ties to notes with improved spacing
   */
  private addBeamsAndTies(voiceNoteMap: Map<Voice, StaveNote[]>): void {
    for (const [voice, notes] of voiceNoteMap) {
      // Auto-beam eighth notes and shorter with better grouping
      const beamableNotes: StaveNote[] = []
      let beamCount = 0

      for (const note of notes) {
        const duration = (note as StaveNote & { duration?: string }).duration
        if (duration && ['8', '16', '32'].includes(duration)) {
          beamableNotes.push(note)
          beamCount++

          // Limit beam groups to 4 notes for better readability
          if (beamCount >= 4) {
            if (beamableNotes.length > 1) {
              const beam = new Beam(beamableNotes)
              beam.setContext(this.context).draw()
            }
            beamableNotes.length = 0
            beamCount = 0
          }
        } else {
          // End current beam group
          if (beamableNotes.length > 1) {
            const beam = new Beam(beamableNotes)
            beam.setContext(this.context).draw()
          }
          beamableNotes.length = 0
          beamCount = 0
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
   * Calculates measure width with dynamic sizing based on note density
   */
  private calculateMeasureWidth(measures: MultiVoiceMeasure[]): number {
    const availableWidth =
      this.options.width -
      this.options.padding.left -
      this.options.padding.right

    // Calculate total note density across all measures
    const measureComplexities: number[] = []

    for (const measure of measures) {
      let measureComplexity = 1 // Base complexity

      for (const staff of measure.staves) {
        for (const voice of staff.voices) {
          // Add complexity based on number of notes
          measureComplexity += voice.notes.length * 0.1

          // Add complexity for shorter note values
          for (const note of voice.notes) {
            if (note.duration.includes('16')) measureComplexity += 0.3
            else if (note.duration.includes('8')) measureComplexity += 0.2
            else if (note.duration.includes('32')) measureComplexity += 0.4
          }
        }
      }

      measureComplexities.push(measureComplexity)
    }

    // Minimum width per measure to prevent overcrowding
    const minWidth = 180
    const baseWidth = Math.max(availableWidth / measures.length, minWidth)

    return baseWidth
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
   * Maps MusicXML accidental names to VexFlow symbols
   */
  private mapAccidentalToVexFlow(accidental: string): string {
    const accidentalMap: Record<string, string> = {
      sharp: '#',
      flat: 'b',
      natural: 'n',
      'double-sharp': '##',
      'double-flat': 'bb',
      'sharp-sharp': '##',
      'flat-flat': 'bb',
      // Additional mappings for common variations
      '#': '#',
      b: 'b',
      n: 'n',
      '##': '##',
      bb: 'bb',
      x: '##', // Double sharp alternate notation
      'natural-sharp': '#', // Cancels previous flat
      'natural-flat': 'b', // Cancels previous sharp
    }
    const mapped = accidentalMap[accidental.toLowerCase()]
    if (!mapped) {
      console.warn(`Unmapped accidental type: "${accidental}"`)
    }
    return mapped || ''
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
   * Validates if a string is a valid dynamic marking
   */
  private isValidDynamic(dynamic: string): boolean {
    const validDynamics = [
      'ppp',
      'pp',
      'p',
      'mp',
      'mf',
      'f',
      'ff',
      'fff',
      'sfz',
      'sf',
      'fp',
      'fz',
      'cresc',
      'dim',
      'decresc',
    ]
    return validDynamics.includes(dynamic.toLowerCase())
  }

  /**
   * Validates if a string is a valid fingering
   */
  private isValidFingering(fingering: string): boolean {
    // Valid fingerings are numbers 1-5 or special markings
    return /^[1-5]$|^[pima]$|^t$|^th$/i.test(fingering)
  }

  /**
   * Updates rendering options
   */
  public updateOptions(options: Partial<MultiVoiceRenderOptions>): void {
    this.options = { ...this.options, ...options }
    // Don't force recreate when updating options
    this.setupRenderer(false)
  }

  /**
   * Resizes the renderer
   */
  public resize(width: number, height: number): void {
    this.options.width = width
    this.options.height = height
    // Don't force recreate when resizing
    this.setupRenderer(false)
  }

  /**
   * Clears the rendering
   */
  public clear(): void {
    if (this.context) {
      // Clear using context method if available
      if (this.context.clear) {
        this.context.clear()
      }

      // Also clear the SVG element directly
      const svg = this.container.querySelector('svg')
      if (svg) {
        // Keep the SVG element but clear its contents
        while (svg.firstChild) {
          svg.removeChild(svg.firstChild)
        }
      }
    }
  }

  /**
   * Destroys the renderer
   */
  public destroy(): void {
    this.clear()
    // Clear the container completely on destroy
    this.container.innerHTML = ''
    this.renderer = null
    this.context = null
    // this.factory = null
  }
}
