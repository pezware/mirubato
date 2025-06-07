let idCounter = 0
export const nanoid = jest.fn(() => `test-id-${++idCounter}`)
export const customAlphabet = jest.fn(() =>
  jest.fn(() => `custom-id-${++idCounter}`)
)
