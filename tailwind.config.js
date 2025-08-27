/** @type {import('tailwindcss').Config} */
export default {
  // Disables automatic dark mode based on system preference.
  // Dark mode can still be manually triggered by adding the 'dark' class to the HTML element.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        
    },
  },
  plugins: [],
}