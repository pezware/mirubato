// Jest setup file for backend tests
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = {
    subtle: {
        digest: jest.fn(),
        sign: jest.fn(),
        verify: jest.fn(),
    },
    getRandomValues: jest.fn(arr => {
        return arr.map(() => Math.floor(Math.random() * 256));
    }),
};
// Suppress console errors during tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});
afterAll(() => {
    console.error = originalError;
});
//# sourceMappingURL=setup.js.map