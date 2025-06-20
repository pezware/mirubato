// This file must be imported before any modules that use crypto
// Add crypto polyfill for test environment

// Create a more comprehensive crypto polyfill
const cryptoPolyfill = {
  getRandomValues: (arr: any) => {
    if (arr instanceof Uint8Array || arr instanceof Uint32Array) {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
    }
    return arr
  },
  randomUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  },
} as any

// Apply polyfill to all possible global contexts
if (typeof (globalThis as any).crypto === 'undefined') {
  ;(globalThis as any).crypto = cryptoPolyfill
}
if (typeof (global as any).crypto === 'undefined') {
  ;(global as any).crypto = cryptoPolyfill
}
// Skip window assignment in Node.js environment

export {}
