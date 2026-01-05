import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettyConfig from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import unusedImports from 'eslint-plugin-unused-imports'
import sonarjs from 'eslint-plugin-sonarjs'

/**
 * Fast ESLint config for local development
 * - Uses cognitive-complexity instead of line counts (smarter)
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
    files: ['src/**/*.{js,jsx,ts,tsx}', 'tests/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
      sonarjs: sonarjs,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': 'off', // Handle by TS
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // Cognitive complexity: measures mental effort to understand code
      // Better than line counting for React components with JSX
      'sonarjs/cognitive-complexity': ['warn', 15],
    },
  },
)
