/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Support toggling dark mode via .dark class
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fffbe6',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Primary Warm Amber Accent
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Alias indigo to Warm Amber scale to ensure seamless codebase-wide theme transformation
        indigo: {
          50: '#fffbe6',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        accent: {
          mint: '#10b981',
          emerald: '#059669',
          amber: '#f59e0b',
          copper: '#ea580c',
        },
        darkbg: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          500: '#64748b',
          750: '#1b2333',
          800: '#131927',
          850: '#0f1523',
          900: '#0b0f19', // Main Obsidian dark background
          950: '#070a12', // Deeper Obsidian elements
        }
      }
    },
  },
  plugins: [],
}
