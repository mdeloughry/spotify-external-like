/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Spillover brand colors (spotify- prefix kept for compatibility)
        spotify: {
          green: '#22c55e',  // Tailwind green-500, distinct from Spotify's #1DB954
          black: '#0f0f0f',
          white: '#FFFFFF',
          gray: '#404040',
          lightgray: '#a3a3a3'
        }
      }
    }
  },
  plugins: []
};
