/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nero: {
          black: '#0A0A0A',
          blue:  '#0066FF',
          dark:  '#003CBF',
        },
      },
      fontFamily: {
        display: ["'Bebas Neue'", 'Impact', 'sans-serif'],
        body:    ["'Barlow Condensed'", "'Arial Narrow'", 'sans-serif'],
      },
    },
  },
  plugins: [],
}
