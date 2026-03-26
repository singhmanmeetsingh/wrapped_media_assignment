/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        lime: {
          400: '#CCFF00',
          500: '#B8E600',
        },
        dark: {
          900: '#0A0A0A',
          800: '#141414',
          700: '#1A1A1A',
          600: '#222222',
          500: '#2A2A2A',
          400: '#333333',
        },
      },
      fontFamily: {
        heading: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
