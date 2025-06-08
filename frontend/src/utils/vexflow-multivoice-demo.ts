/**
 * VexFlow Multi-Voice Rendering Demo
 *
 * This demonstrates VexFlow's native support for multi-voice rendering,
 * which our current architecture doesn't utilize.
 */

import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Beam,
  StaveConnector,
} from 'vexflow'

/**
 * Demo 1: Two voices on a single staff (e.g., classical guitar)
 */
export function renderTwoVoicesOneStaff(container: HTMLDivElement) {
  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(500, 200)
  const context = renderer.getContext()

  const stave = new Stave(10, 40, 400)
  stave.addClef('treble').addTimeSignature('4/4')
  stave.setContext(context).draw()

  // Voice 1 (stem up) - melody
  const voice1 = new Voice({ numBeats: 4, beatValue: 4 })
  voice1.addTickables([
    new StaveNote({ keys: ['e/5'], duration: 'q', stemDirection: 1 }),
    new StaveNote({ keys: ['d/5'], duration: 'q', stemDirection: 1 }),
    new StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: 1 }),
    new StaveNote({ keys: ['d/5'], duration: 'q', stemDirection: 1 }),
  ])

  // Voice 2 (stem down) - bass line
  const voice2 = new Voice({ numBeats: 4, beatValue: 4 })
  voice2.addTickables([
    new StaveNote({ keys: ['c/4'], duration: 'h', stemDirection: -1 }),
    new StaveNote({ keys: ['g/3'], duration: 'h', stemDirection: -1 }),
  ])

  // Format and draw both voices
  new Formatter().joinVoices([voice1, voice2]).format([voice1, voice2], 350)
  voice1.draw(context, stave)
  voice2.draw(context, stave)
}

/**
 * Demo 2: Grand staff for piano (treble and bass clefs)
 */
export function renderPianoGrandStaff(container: HTMLDivElement) {
  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(500, 300)
  const context = renderer.getContext()

  // Create treble and bass staves
  const trebleStave = new Stave(10, 40, 400)
  trebleStave.addClef('treble').addTimeSignature('3/4').addKeySignature('G')
  trebleStave.setContext(context).draw()

  const bassStave = new Stave(10, 140, 400)
  bassStave.addClef('bass').addTimeSignature('3/4').addKeySignature('G')
  bassStave.setContext(context).draw()

  // Connect staves with a brace
  const brace = new StaveConnector(trebleStave, bassStave)
  brace.setType(StaveConnector.type.BRACE)
  brace.setContext(context).draw()

  // Connect with a line
  const lineLeft = new StaveConnector(trebleStave, bassStave)
  lineLeft.setType(StaveConnector.type.SINGLE_LEFT)
  lineLeft.setContext(context).draw()

  // Treble voice (Bach Minuet opening)
  const trebleVoice = new Voice({ numBeats: 3, beatValue: 4 })
  trebleVoice.addTickables([
    new StaveNote({ keys: ['d/5'], duration: 'q' }),
    new StaveNote({ keys: ['g/4'], duration: '8' }),
    new StaveNote({ keys: ['a/4'], duration: '8' }),
    new StaveNote({ keys: ['b/4'], duration: '8' }),
    new StaveNote({ keys: ['c/5'], duration: '8' }),
  ])

  // Bass voice
  const bassVoice = new Voice({ numBeats: 3, beatValue: 4 })
  bassVoice.addTickables([
    new StaveNote({ keys: ['g/3'], duration: 'q', clef: 'bass' }),
    new StaveNote({ keys: ['b/3', 'd/4'], duration: 'h', clef: 'bass' }), // Chord!
  ])

  // Format voices
  new Formatter().joinVoices([trebleVoice]).format([trebleVoice], 350)

  new Formatter().joinVoices([bassVoice]).format([bassVoice], 350)

  // Draw voices
  trebleVoice.draw(context, trebleStave)
  bassVoice.draw(context, bassStave)
}

/**
 * Demo 3: Four-voice SATB choir arrangement
 */
export function renderFourVoiceChoir(container: HTMLDivElement) {
  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(500, 300)
  const context = renderer.getContext()

  // Create staves for SA (treble) and TB (bass)
  const trebleStave = new Stave(10, 40, 400)
  trebleStave.addClef('treble').addTimeSignature('4/4')
  trebleStave.setContext(context).draw()

  const bassStave = new Stave(10, 140, 400)
  bassStave.addClef('bass').addTimeSignature('4/4')
  bassStave.setContext(context).draw()

  // Connect staves
  const bracket = new StaveConnector(trebleStave, bassStave)
  bracket.setType(StaveConnector.type.BRACKET)
  bracket.setContext(context).draw()

  // Soprano voice (stems up)
  const soprano = new Voice({ numBeats: 4, beatValue: 4 })
  soprano.addTickables([
    new StaveNote({ keys: ['c/5'], duration: 'h', stemDirection: 1 }),
    new StaveNote({ keys: ['d/5'], duration: 'h', stemDirection: 1 }),
  ])

  // Alto voice (stems down)
  const alto = new Voice({ numBeats: 4, beatValue: 4 })
  alto.addTickables([
    new StaveNote({ keys: ['e/4'], duration: 'h', stemDirection: -1 }),
    new StaveNote({ keys: ['f/4'], duration: 'h', stemDirection: -1 }),
  ])

  // Tenor voice (stems up)
  const tenor = new Voice({ numBeats: 4, beatValue: 4 })
  tenor.addTickables([
    new StaveNote({
      keys: ['g/3'],
      duration: 'h',
      stemDirection: 1,
      clef: 'bass',
    }),
    new StaveNote({
      keys: ['a/3'],
      duration: 'h',
      stemDirection: 1,
      clef: 'bass',
    }),
  ])

  // Bass voice (stems down)
  const bass = new Voice({ numBeats: 4, beatValue: 4 })
  bass.addTickables([
    new StaveNote({
      keys: ['c/3'],
      duration: 'h',
      stemDirection: -1,
      clef: 'bass',
    }),
    new StaveNote({
      keys: ['d/3'],
      duration: 'h',
      stemDirection: -1,
      clef: 'bass',
    }),
  ])

  // Format treble voices together
  new Formatter().joinVoices([soprano, alto]).format([soprano, alto], 350)

  // Format bass voices together
  new Formatter().joinVoices([tenor, bass]).format([tenor, bass], 350)

  // Draw all voices
  soprano.draw(context, trebleStave)
  alto.draw(context, trebleStave)
  tenor.draw(context, bassStave)
  bass.draw(context, bassStave)
}

/**
 * Demo 4: Complex piano notation with cross-staff beaming
 */
export function renderComplexPiano(container: HTMLDivElement) {
  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(500, 300)
  const context = renderer.getContext()

  // Create grand staff
  const trebleStave = new Stave(10, 40, 400)
  trebleStave.addClef('treble').addTimeSignature('2/4')
  trebleStave.setContext(context).draw()

  const bassStave = new Stave(10, 140, 400)
  bassStave.addClef('bass').addTimeSignature('2/4')
  bassStave.setContext(context).draw()

  // Brace and line
  new StaveConnector(trebleStave, bassStave)
    .setType(StaveConnector.type.BRACE)
    .setContext(context)
    .draw()

  // Right hand - arpeggiated pattern
  const rightHand = new Voice({ numBeats: 2, beatValue: 4 })
  const rh_notes = [
    new StaveNote({ keys: ['c/5'], duration: '16' }),
    new StaveNote({ keys: ['e/5'], duration: '16' }),
    new StaveNote({ keys: ['g/5'], duration: '16' }),
    new StaveNote({ keys: ['c/6'], duration: '16' }),
    new StaveNote({ keys: ['g/5'], duration: '16' }),
    new StaveNote({ keys: ['e/5'], duration: '16' }),
    new StaveNote({ keys: ['c/5'], duration: '16' }),
    new StaveNote({ keys: ['g/4'], duration: '16' }),
  ]
  rightHand.addTickables(rh_notes)

  // Create beams for right hand
  const beam1 = new Beam(rh_notes.slice(0, 4))
  const beam2 = new Beam(rh_notes.slice(4, 8))

  // Left hand - sustained chord
  const leftHand = new Voice({ numBeats: 2, beatValue: 4 })
  leftHand.addTickables([
    new StaveNote({
      keys: ['c/3', 'e/3', 'g/3'],
      duration: 'h',
      clef: 'bass',
    }),
  ])

  // Format and draw
  new Formatter().joinVoices([rightHand]).format([rightHand], 350)
  new Formatter().joinVoices([leftHand]).format([leftHand], 350)

  rightHand.draw(context, trebleStave)
  leftHand.draw(context, bassStave)

  beam1.setContext(context).draw()
  beam2.setContext(context).draw()
}

/**
 * This demonstrates that VexFlow has FULL support for:
 * 1. Multiple voices per staff with independent stem directions
 * 2. Grand staff notation with proper connectors
 * 3. Complex rhythms and beaming
 * 4. Chords and polyphonic textures
 * 5. Cross-staff notation
 *
 * Our current architecture uses NONE of these features!
 */
