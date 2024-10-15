/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'solana-purple': '#9945FF',
        'solana-green': '#14F195',
        'pastel-pink': '#FFA69E',
        'pastel-red': '#FF686B',
      },
    },
  },
  plugins: [],
}
