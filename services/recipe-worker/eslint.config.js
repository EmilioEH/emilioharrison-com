import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettyConfig from 'eslint-config-prettier'
import unusedImports from 'eslint-plugin-unused-imports'

/**
 * Lean ESLint config for the Node-only background worker — no React/browser, so it drops the
 * JSX/react plugins the apps use and runs against Node globals. Shares the monorepo's
 * typescript-eslint + unused-imports + prettier baseline.
 */
export default tseslint.config(
  { ignores: ['node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettyConfig],
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
    },
  },
)
