/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,html}', './components.json'],
  theme: {
    extend: {},
  },
  plugins: [],
};

module.exports = config;
