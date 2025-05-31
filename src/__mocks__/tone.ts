// Mock for Tone.js
export const Transport = {
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

export const Sampler = jest.fn().mockImplementation(() => ({
  toDestination: jest.fn().mockReturnThis(),
  triggerAttackRelease: jest.fn(),
  connect: jest.fn().mockReturnThis(),
  dispose: jest.fn(),
}))

export const PolySynth = jest.fn().mockImplementation(() => ({
  toDestination: jest.fn().mockReturnThis(),
  triggerAttackRelease: jest.fn(),
  connect: jest.fn().mockReturnThis(),
  dispose: jest.fn(),
}))

export const Synth = jest.fn().mockImplementation(() => ({
  toDestination: jest.fn().mockReturnThis(),
  triggerAttackRelease: jest.fn(),
}))

export const Reverb = jest.fn().mockImplementation(() => ({
  toDestination: jest.fn().mockReturnThis(),
  connect: jest.fn().mockReturnThis(),
}))

export const start = jest.fn().mockResolvedValue(undefined)
export const loaded = jest.fn().mockResolvedValue(undefined)
export const now = jest.fn().mockReturnValue(0)

export default {
  Transport,
  Sampler,
  PolySynth,
  Synth,
  Reverb,
  start,
  loaded,
  now,
}
