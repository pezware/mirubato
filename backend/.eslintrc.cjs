module.exports = {
  root: true,
  env: { node: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'src/test-utils/**'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          '{}': false, // Allow {} in generated GraphQL types
        },
        extendDefaults: true,
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      files: ['src/types/generated/*.ts'],
      rules: {
        '@typescript-eslint/ban-types': 'off', // Disable ban-types rule for generated files
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in generated files
      },
    },
    {
      files: ['src/__tests__/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in test files for mocking
      },
    },
  ],
};