// Mock for VexFlow
export const Renderer = jest.fn().mockImplementation(() => ({
  resize: jest.fn().mockReturnThis(),
  getContext: jest.fn().mockReturnValue({
    setFont: jest.fn(),
    setBackgroundFillStyle: jest.fn(),
    setFillStyle: jest.fn(),
    setStrokeStyle: jest.fn(),
    scale: jest.fn(),
    clear: jest.fn(),
  }),
}))

export const Stave = jest.fn().mockImplementation(() => ({
  addClef: jest.fn().mockReturnThis(),
  addTimeSignature: jest.fn().mockReturnThis(),
  setContext: jest.fn().mockReturnThis(),
  draw: jest.fn(),
}))

export const StaveNote = jest.fn().mockImplementation(() => ({
  addModifier: jest.fn().mockReturnThis(),
  setContext: jest.fn().mockReturnThis(),
  draw: jest.fn(),
}))

export const Voice = jest.fn().mockImplementation(() => ({
  addTickables: jest.fn().mockReturnThis(),
  setContext: jest.fn().mockReturnThis(),
  draw: jest.fn(),
}))

export const Formatter = {
  FormatAndDraw: jest.fn(),
}

export const Accidental = jest.fn()

export const Flow = {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Accidental,
}

export const Vex = { Flow }
