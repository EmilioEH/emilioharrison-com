import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettyConfig from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'

/**
 * Fast ESLint config for local development
 * - Excludes SonarJS for speed (~30s instead of 10+ min)
 * - SonarJS runs in CI via eslint.config.strict.js
 * - Scoped to src/ for faster linting
 */
export default tseslint.config(
  { ignores: ['dist', '.astro', 'node_modules', '**/*.astro', '.wrangler', '** 2.*', '** 2/**'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      prettyConfig, // Must be last to override other rules
    ],
    files: ['src/**/*.{js,jsx,ts,tsx}'],
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
)
