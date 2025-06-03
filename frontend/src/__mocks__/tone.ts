// Mock for Tone.js
const Transport = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  cancel: jest.fn(),
  bpm: {
    value: 120,
    rampTo: jest.fn(),
  },
  state: 'stopped',
  schedule: jest.fn(),
  position: 0,
}

const Sampler = jest.fn().mockImplementation(() => ({
  toDestination: jest.fn().mockReturnThis(),
  triggerAttackRelease: jest.fn(),
  connect: jest.fn().mockReturnThis(),
  dispose: jest.fn(),
}))

const PolySynth = jest.fn().mockImplementation(() => ({
  toDestination: jest.fn().mockReturnThis(),
  triggerAttackRelease: jest.fn(),
  connect: jest.fn().mockReturnThis(),
  dispose: jest.fn(),
}))

const Synth = jest.fn().mockImplementation(() => ({
  toDestination: jest.fn().mockReturnThis(),
  triggerAttackRelease: jest.fn(),
}))

const Reverb = jest.fn().mockImplementation(() => ({
  toDestination: jest.fn().mockReturnThis(),
  connect: jest.fn().mockReturnThis(),
}))

const start = jest.fn().mockResolvedValue(undefined)
const loaded = jest.fn().mockResolvedValue(undefined)
const now = jest.fn().mockReturnValue(0)

// Export everything both as named exports and on the namespace
// to support both import styles
export { Transport, Sampler, PolySynth, Synth, Reverb, start, loaded, now }

// This ensures import * as Tone works correctly
const Tone = {
  Transport,
  Sampler,
  PolySynth,
  Synth,
  Reverb,
  start,
  loaded,
  now,
}

export default Tone
