/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
    // These classes are required for the dynamic colors in page.tsx
    'from-[#3b82f6]', 'to-[#3b82f6]/80', 'border-[#3b82f6]/20',
    'from-[#10b981]', 'to-[#10b981]/80', 'border-[#10b981]/20',
    'from-[#ef4444]', 'to-[#ef4444]/80', 'border-[#ef4444]/20',
    'from-[#f59e0b]', 'to-[#f59e0b]/80', 'border-[#f59e0b]/20',
    'from-[#8b5cf6]', 'to-[#8b5cf6]/80', 'border-[#8b5cf6]/20',
    'from-[#ec4899]', 'to-[#ec4899]/80', 'border-[#ec4899]/20',
    'from-[#06b6d4]', 'to-[#06b6d4]/80', 'border-[#06b6d4]/20',
    'from-[#78350f]', 'to-[#78350f]/80', 'border-[#78350f]/20',
    // Your previous safelisted items
    {
      pattern: /(border|text)-(yellow|blue|orange|green|red|zinc|cyan|indigo)-(400|500)/,
      variants: ["hover", "focus"],
    },
    'bg-accent',
    'hover:bg-accent-darker',
    'text-white',
    'bg-button-remove',
    'hover:bg-red-700',
    'opacity-0',
    'opacity-100',
    'group-hover:opacity-100',
  ],
  plugins: [],
};