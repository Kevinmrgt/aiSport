/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system minimaliste — palette zinc monochrome
        // primary-600 = zinc-900 (noir interactif principal)
        // RGAA 4.1: contraste AA conservé (noir sur blanc ≥ 7:1)
        primary: {
          50:  '#fafafa',  // zinc-50
          100: '#f4f4f5',  // zinc-100
          200: '#e4e4e7',  // zinc-200
          300: '#d4d4d8',  // zinc-300
          400: '#a1a1aa',  // zinc-400
          500: '#71717a',  // zinc-500
          600: '#18181b',  // zinc-900 — couleur interactive principale
          700: '#27272a',  // zinc-800 — hover
          900: '#09090b',  // zinc-950
        },
        sport: {
          green: '#16a34a',
          orange: '#ea580c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

module.exports = config;
