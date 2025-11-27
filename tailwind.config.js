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
                paper: "#fdfbf7",
                ink: "#264653",
                teal: "#2a9d8f",
                coral: "#e76f51",
                mustard: "#e9c46a",
            },
            boxShadow: {
                'hard': '6px 6px 0px 0px #000000',
                'hard-sm': '4px 4px 0px 0px #000000',
                'hard-lg': '8px 8px 0px 0px #000000',
                'hard-xl': '12px 12px 0px 0px #000000',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // Ensure we have a nice sans, though default is usually fine.
                // The prototype used system fonts mostly, but let's stick to defaults or add if needed.
            }
        },
    },
    plugins: [
        typography,
    ],
}
