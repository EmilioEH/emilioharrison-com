/// <reference types="vitest" />
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
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
})
