// Mock for audioManager
export const audioManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  setInstrument: jest.fn(),
  getInstrument: jest.fn().mockReturnValue('piano'),
  playNote: jest.fn().mockResolvedValue(undefined),
  playNoteAt: jest.fn().mockResolvedValue(undefined),
  isInitialized: jest.fn().mockReturnValue(true),
  isLoading: jest.fn().mockReturnValue(false),
  dispose: jest.fn(),
}
