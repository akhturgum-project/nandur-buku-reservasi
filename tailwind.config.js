/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nandur-cream': '#fce9c0',
        'nandur-green': '#1A4D2E',
        'nandur-hover': '#4F7942',
        'nandur-text': '#332B25',
        'nandur-surface': '#FDF8ED'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}
