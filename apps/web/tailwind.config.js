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
          50:  '#fbffe8',
          100: '#f1ffb8',
          200: '#e6ff7a',
          300: '#d9ff3f',
          400: '#c8f20a',
          500: '#aee600',
          600: '#8fc400',
          700: '#6f9703',
          900: '#263400',
        },
        sport: {
          green: '#d9ff3f',
          orange: '#ff8a3d',
        },
        ink: '#070a08',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

module.exports = config;
