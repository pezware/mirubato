export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/integration/d1-uat.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        paths: {
          '../../../shared/types': ['../shared/types/index.ts']
        }
      },
      isolatedModules: false
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^nanoid$': '<rootDir>/src/__mocks__/nanoid.ts',
    '^@mirubato/shared/types$': '<rootDir>/../shared/types/index.ts',
    '^(\\.\\./){3}shared/types$': '<rootDir>/../shared/types/index.ts',
    '^(\\.\\./){2}shared/types$': '<rootDir>/../shared/types/index.ts'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@as-integrations|@apollo|@mirubato/shared)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test-utils/**',
    '!src/__tests__/**',
    '!src/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  testTimeout: 10000
};