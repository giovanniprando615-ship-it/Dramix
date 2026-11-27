/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#060810', 900: '#04050A', 800: '#0A0D18', 700: '#0E1322', 600: '#141A2E', 500: '#1C2340' },
        brand: { DEFAULT: '#E52E4D', hover: '#C92440', soft: '#FF5B79' },
        coin: { DEFAULT: '#F5B83D', deep: '#B57F14', bg: '#1A150A' }
      },
      fontFamily: { sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'] },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } }
      },
      animation: { shimmer: 'shimmer 1.6s infinite' }
    }
  },
  plugins: []
};
