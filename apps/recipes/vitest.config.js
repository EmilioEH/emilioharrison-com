/// <reference types="vitest" />
import { configDefaults } from 'vitest/config'
import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx,astro}'],
      exclude: ['src/env.d.ts', 'src/content/config.ts', 'tests/**', '**/*.spec.ts'],
    },
    exclude: [...configDefaults.exclude, '**/tests/*.spec.ts', '**/node_modules/**', '**/dist/**'],
  },
})
