import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,astro}'],
  theme: {
    extend: {
      colors: {
        'md-sys-color-primary': 'var(--md-sys-color-primary)',
        'md-sys-color-on-primary': 'var(--md-sys-color-on-primary)',
        'md-sys-color-primary-container': 'var(--md-sys-color-primary-container)',
        'md-sys-color-on-primary-container': 'var(--md-sys-color-on-primary-container)',
        'md-sys-color-secondary': 'var(--md-sys-color-secondary)',
        'md-sys-color-on-secondary': 'var(--md-sys-color-on-secondary)',
        'md-sys-color-secondary-container': 'var(--md-sys-color-secondary-container)',
        'md-sys-color-on-secondary-container': 'var(--md-sys-color-on-secondary-container)',
        'md-sys-color-tertiary': 'var(--md-sys-color-tertiary)',
        'md-sys-color-on-tertiary': 'var(--md-sys-color-on-tertiary)',
        'md-sys-color-tertiary-container': 'var(--md-sys-color-tertiary-container)',
        'md-sys-color-on-tertiary-container': 'var(--md-sys-color-on-tertiary-container)',
        'md-sys-color-error': 'var(--md-sys-color-error)',
        'md-sys-color-on-error': 'var(--md-sys-color-on-error)',
        'md-sys-color-error-container': 'var(--md-sys-color-error-container)',
        'md-sys-color-on-error-container': 'var(--md-sys-color-on-error-container)',
        'md-sys-color-outline': 'var(--md-sys-color-outline)',
        'md-sys-color-surface': 'var(--md-sys-color-surface)',
        'md-sys-color-on-surface': 'var(--md-sys-color-on-surface)',
        'md-sys-color-surface-variant': 'var(--md-sys-color-surface-variant)',
        'md-sys-color-on-surface-variant': 'var(--md-sys-color-on-surface-variant)',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        display: ['Roboto', 'system-ui', 'sans-serif'],
        body: ['Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'md-1': 'var(--md-sys-elevation-1)',
        'md-2': 'var(--md-sys-elevation-2)',
        'md-3': 'var(--md-sys-elevation-3)',
      },
      borderRadius: {
        'md-xs': 'var(--md-sys-shape-corner-extra-small)',
        'md-s': 'var(--md-sys-shape-corner-small)',
        'md-m': 'var(--md-sys-shape-corner-medium)',
        'md-l': 'var(--md-sys-shape-corner-large)',
        'md-xl': 'var(--md-sys-shape-corner-extra-large)',
        'md-full': 'var(--md-sys-shape-corner-full)',
      },
    },
  },
  plugins: [typography],
}
