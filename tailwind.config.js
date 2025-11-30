import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,astro}",
    ],
    theme: {
        extend: {
            colors: {
                paper: "#F7F3E9", // cream
                ink: "#1A1F3A",   // navy
                teal: "#4ECDC4",
                coral: "#FF6B6B",
                gold: "#FFD166",
                navy: "#1A1F3A",
                cream: "#F7F3E9",
                sticky: {
                    yellow: "#FEF08A",
                    green: "#BBF7D0",
                    pink: "#FBCFE8",
                    blue: "#BAE6FD",
                    purple: "#E9D5FF",
                    orange: "#FED7AA",
                },
                btn: {
                    primary: "#18181B",
                    secondary: "#F4F4F5",
                    accent: "#3B82F6",
                },
            },
            fontFamily: {
                display: ['"Archivo Black"', 'sans-serif'],
                body: ['"DM Sans"', 'sans-serif'],
                accent: ['"Space Grotesk"', 'sans-serif'],
                sans: ['"DM Sans"', 'sans-serif'], // Default sans to DM Sans
            },
            fontSize: {
                'display-xl': ['var(--text-display-xl)', { lineHeight: 'var(--leading-tight)' }],
                'display-l': ['var(--text-display-l)', { lineHeight: 'var(--leading-tight)' }],
                'heading-xl': ['var(--text-heading-xl)', { lineHeight: 'var(--leading-snug)' }],
                'heading-l': ['var(--text-heading-l)', { lineHeight: 'var(--leading-snug)' }],
                'heading-m': ['var(--text-heading-m)', { lineHeight: 'var(--leading-normal)' }],
                'heading-s': ['var(--text-heading-s)', { lineHeight: 'var(--leading-normal)' }],
                'body-xl': ['var(--text-body-xl)', { lineHeight: 'var(--leading-relaxed)' }],
                'body-l': ['var(--text-body-l)', { lineHeight: 'var(--leading-relaxed)' }],
                'body-base': ['var(--text-body-base)', { lineHeight: 'var(--leading-relaxed)' }],
                'body-s': ['var(--text-body-s)', { lineHeight: 'var(--leading-normal)' }],
                'eyebrow': ['var(--text-eyebrow)', { lineHeight: '1.25', letterSpacing: '0.08em', fontWeight: '700' }],
                'fine': ['var(--text-fine)', { lineHeight: 'var(--leading-normal)' }],
            },
            boxShadow: {
                'hard': '6px 6px 0px 0px #000000',
                'hard-sm': '4px 4px 0px 0px #000000',
                'hard-lg': '8px 8px 0px 0px #000000',
                'hard-xl': '12px 12px 0px 0px #000000',
            },
            typography: (theme) => ({
                DEFAULT: {
                    css: {
                        '--tw-prose-body': theme('colors.ink'),
                        '--tw-prose-headings': theme('colors.ink'),
                        '--tw-prose-links': theme('colors.teal'),
                        '--tw-prose-bold': theme('colors.ink'),
                        '--tw-prose-counters': theme('colors.ink'),
                        '--tw-prose-bullets': theme('colors.ink'),
                        '--tw-prose-hr': theme('colors.ink'),
                        '--tw-prose-quotes': theme('colors.ink'),
                        '--tw-prose-quote-borders': theme('colors.ink'),
                        '--tw-prose-captions': theme('colors.ink'),
                        '--tw-prose-code': theme('colors.ink'),
                        '--tw-prose-pre-code': theme('colors.paper'),
                        '--tw-prose-pre-bg': theme('colors.ink'),
                        fontFamily: theme('fontFamily.body'),
                        h1: { fontFamily: theme('fontFamily.display') },
                        h2: { fontFamily: theme('fontFamily.display') },
                        h3: { fontFamily: theme('fontFamily.display') },
                        h4: { fontFamily: theme('fontFamily.display') },
                    },
                },
            }),
        },
    },
    plugins: [
        typography,
    ],
}
