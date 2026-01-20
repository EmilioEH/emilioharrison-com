/// <reference types="vitest" />
import { configDefaults } from 'vitest/config'
import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    exclude: [...configDefaults.exclude, '**/tests/*.spec.ts', '**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx,astro}'],
      exclude: ['src/env.d.ts', 'src/content/config.ts', 'tests/**', '**/*.spec.ts'],
      thresholds: {
        lines: 2,
        functions: 2,
        branches: 2,
        statements: 2,
        'src/lib/date-helpers.ts': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
})
