/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0faf2',
          100: '#daf1de',
          200: '#c8e8cf',
          300: '#bdddbe',
          400: '#8eb69b',
          500: '#6e9e87',
          600: '#487661',
          700: '#235347',
          900: '#0b2b26',
        },
        sport: {
          green: '#bdddbe',
          orange: '#ffbe9e',
        },
        ink: '#051f20',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

module.exports = config;
