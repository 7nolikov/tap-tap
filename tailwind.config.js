/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all JS files in src for Tailwind classes
    // Add paths to any other files that use Tailwind classes
  ],
  theme: {
    extend: {
      colors: {
        'primary-bg': '#0D1117',
        'container-bg': '#161B22',
        'item-bg': '#161B22', // Used for unselected item background (matches container)
        'card-bg': '#1E252E', // This was previously item-bg, keeping it for clarity if needed.
        'text-primary': '#C9D1D9',
        'text-secondary': '#8B949E',
        'accent': '#58A6FF',
        'accent-darker': '#1F6FEB',
        'button-actions': '#238636',
        'button-remove': '#DA3633',
        // Category border colors - ensure these match default-grocery-data.js
        'yellow-400': '#F1E05A', // Matches default-grocery-data.js
        'yellow-500': '#F1E05A', // Use 500 as main for border for consistency
        'blue-400': '#60A5FA', // Matches default-grocery-data.js
        'blue-500': '#60A5FA', // Use 500 as main for border
        'orange-400': '#F97316', // Matches default-grocery-data.js
        'orange-500': '#F97316', // Use 500 as main for border
        'green-400': '#22C55E', // Matches default-grocery-data.js
        'green-500': '#22C55E', // Use 500 as main for border
        'red-400': '#EF4444',   // Matches default-grocery-data.js
        'red-500': '#EF4444',   // Use 500 as main for border
        'zinc-400': '#A1A1AA',  // Matches default-grocery-data.js (was gray)
        'zinc-500': '#A1A1AA',  // Use 500 as main for border
        'cyan-400': '#22D3EE',  // Matches default-grocery-data.js
        'cyan-500': '#22D3EE',  // Use 500 as main for border
        'indigo-400': '#818CF8', // Matches default-grocery-data.js
        'indigo-500': '#818CF8', // Use 500 as main for border
      }
    },
  },
  safelist: [
    // Dynamically generated classes (especially border/text colors based on category data)
    {
      pattern: /(border|text)-(yellow|blue|orange|green|red|zinc|cyan|indigo)-(400|500)/,
      variants: ['hover', 'focus'],
    },
    'bg-accent', // For preset selector background
    'hover:bg-accent-darker', // For preset selector hover
    'text-white', // For preset selector text
    'bg-button-remove', // For delete button
    'hover:bg-red-700' // For delete button hover
  ],
  plugins: [],
}