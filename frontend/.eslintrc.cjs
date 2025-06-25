module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Enforce no-any for production code quality
    '@typescript-eslint/no-explicit-any': 'error',
    // Allow unused vars with underscore prefix
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Disable no-extra-semi to avoid conflicts with prettier
    'no-extra-semi': 'off',
  },
  overrides: [
    {
      // Test files have more relaxed rules
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        // Warn instead of error for any types in tests (for mocking flexibility)
        '@typescript-eslint/no-explicit-any': 'warn',
        // Allow unused parameters in test mocks
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            // Common in mock implementations
            args: 'none',
          },
        ],
        // Allow @ts-ignore in tests if needed for mocking
        '@typescript-eslint/ban-ts-comment': [
          'error',
          {
            'ts-expect-error': 'allow-with-description',
            'ts-ignore': 'allow-with-description',
            'ts-nocheck': true,
            'ts-check': false,
          },
        ],
      },
    },
    {
      // Context providers often export both component and hook
      files: ['**/contexts/*.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
}