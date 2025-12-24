import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import astroPlugin from 'eslint-plugin-astro'
import prettyConfig from 'eslint-config-prettier'
import astroParser from 'astro-eslint-parser' // Import parser directly
import jsxA11y from 'eslint-plugin-jsx-a11y'
import sonarjs from 'eslint-plugin-sonarjs'

export default tseslint.config(
  { ignores: ['dist', '.astro', 'node_modules'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...astroPlugin.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      sonarjs.configs.recommended,
      prettyConfig, // Must be last to override other rules
    ],
    files: ['**/*.{js,jsx,ts,tsx,astro}'],
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
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': 'off', // Handle by TS
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser, // Use the imported parser
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
  },
)
