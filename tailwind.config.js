/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all JS files in src for Tailwind classes
  ],
  theme: {
    extend: {
      colors: {
        'primary-bg': '#0D1117',
        'container-bg': '#161B22',
        'item-bg': '#161B22', // Unselected item card background, matching container-bg
        'card-bg': '#1E252E', // This can be used for hover background or other subtle shades
        'text-primary': '#C9D1D9',
        'text-secondary': '#8B949E',
        'accent': '#58A6FF',
        'accent-darker': '#1F6FEB',
        'button-actions': '#238636',
        'button-remove': '#DA3633',
        // Category border and text colors - MUST MATCH default-grocery-data.js values EXACTLY
        'yellow-400': '#F1E05A',
        'yellow-500': '#F1E05A',
        'blue-400': '#60A5FA',
        'blue-500': '#60A5FA',
        'orange-400': '#F97316',
        'orange-500': '#F97316',
        'green-400': '#22C55E',
        'green-500': '#22C55E',
        'red-400': '#EF4444',
        'red-500': '#EF4444',
        'zinc-400': '#A1A1AA',
        'zinc-500': '#A1A1AA',
        'cyan-400': '#22D3EE',
        'cyan-500': '#22D3EE',
        'indigo-400': '#818CF8',
        'indigo-500': '#818CF8',
      }
    },
  },
  safelist: [
    // Ensure these exact classes are generated, as they are dynamic in JS
    {
      pattern: /(border|text)-(yellow|blue|orange|green|red|zinc|cyan|indigo)-(400|500)/,
      variants: ['hover', 'focus'], // Include variants if categories could be interactive
    },
    'bg-accent',
    'hover:bg-accent-darker',
    'text-white',
    'bg-button-remove',
    'hover:bg-red-700',
    // Classes used on selected item-card (dynamic)
    'bg-accent/20', // From itemInteractions.js selected state
    'border-accent', // From itemInteractions.js selected state
    'hover:bg-accent-darker/[0.3]', // From itemInteractions.js selected state hover
    'opacity-0', // For initially hidden decrement button
    'opacity-100', // For visible decrement button
    'group-hover:opacity-100', // For decrement button hover
  ],
  plugins: [],
}