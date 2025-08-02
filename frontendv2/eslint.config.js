import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Typography consistency rules
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/font-(sans|mono)\\b/]',
          message:
            'Use font-inter for UI text, font-lexend for headers, or font-serif for music content instead of generic font classes.',
        },
        {
          selector:
            'JSXAttribute[name.name="className"] TemplateLiteral :matches(TemplateElement[value.raw*="font-sans"], TemplateElement[value.raw*="font-mono"])',
          message:
            'Use font-inter for UI text, font-lexend for headers, or font-serif for music content instead of generic font classes.',
        },
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/text-\\[[0-9]+px\\]/]',
          message:
            'Use standard Tailwind text size classes (text-xs, text-sm, text-base, etc.) instead of hardcoded pixel values.',
        },
        {
          selector:
            'JSXAttribute[name.name="className"] TemplateLiteral TemplateElement[value.raw*="text-["][value.raw*="px]"]',
          message:
            'Use standard Tailwind text size classes (text-xs, text-sm, text-base, etc.) instead of hardcoded pixel values.',
        },
      ],
    },
  }
)
