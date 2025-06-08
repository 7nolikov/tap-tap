/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./app.js",
    // Add paths to any other files that use Tailwind classes
  ],
  theme: {
    extend: {
      colors: {
        'primary-bg': '#0D1117',
        'container-bg': '#161B22',
        'item-bg': '#0D1117',
        'text-primary': '#C9D1D9',
        'text-secondary': '#8B949E',
        'accent': '#58A6FF',
        'accent-darker': '#1F6FEB',
        'button-actions': '#238636',
        'button-remove': '#DA3633',
        // Category border colors
        'border-yellow': '#F1E05A',
        'border-blue': '#3B82F6',
        'border-orange': '#F98222',
        'border-pink': '#EC4899',
      }
    },
  },
  plugins: [],
} 