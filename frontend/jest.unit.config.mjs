/** @type {import('jest').Config} */
export default {
  displayName: 'unit',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/unit.setup.ts'],
  testTimeout: 10000, // 10 seconds global timeout to prevent hanging
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^tone$': '<rootDir>/src/__mocks__/tone.ts',
    '^vexflow$': '<rootDir>/src/__mocks__/vexflow.ts',
    '^.*/audioManager$': '<rootDir>/src/__mocks__/audioManager.ts'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@tonejs|tone|vexflow)/)'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/main.tsx',
    '!src/index.js'
  ],
}