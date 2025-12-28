import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettyConfig from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import sonarjs from 'eslint-plugin-sonarjs'

/**
 * Strict ESLint config for CI/CD
 * - Includes SonarJS for comprehensive code quality checks
 * - Slower (~10+ min) but thorough
 * - Used by: npm run lint:strict, GitHub Actions
 * - DO NOT use for local development (too slow)
 */
export default tseslint.config(
  { ignores: ['dist', '.astro', 'node_modules', '**/*.astro', '.wrangler'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      sonarjs.configs.recommended, // ⚠️ SLOW: Code smell detection
      prettyConfig, // Must be last to override other rules
    ],
    files: ['src/**/*.{js,jsx,ts,tsx}', 'tests/**/*.{js,jsx,ts,tsx}'],
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
      'max-lines-per-function': 'off', // Disabled: using cognitive-complexity instead
      'sonarjs/cognitive-complexity': ['warn', 15],
    },
  },
)
