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
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fdf2f4',
          100: '#fbe5e8',
          200: '#f7cbd2',
          300: '#f0a3ae',
          400: '#e8a3ae', // Light accent
          500: '#6D2932', // Primary accent
          550: '#61242c',
          600: '#561C24', // Darker accent
          650: '#48171e',
          700: '#45161c',
          800: '#381217',
          900: '#2b0e12',
          950: '#1d090c',
        },
        indigo: {
          50: '#fdf2f4',
          100: '#fbe5e8',
          200: '#f7cbd2',
          300: '#f0a3ae',
          400: '#e8a3ae', // Light accent
          450: '#e8a3ae',
          455: '#e8a3ae',
          500: '#6D2932', // Primary accent
          550: '#561C24', // Darker accent
          600: '#6D2932', // Primary accent
          650: '#561C24', // Darker accent
          655: '#561C24',
          700: '#45161c',
          800: '#381217',
          900: '#2b0e12',
          950: '#1d090c',
        },
        purple: {
          50: '#fdf2f4',
          100: '#fbe5e8',
          200: '#f7cbd2',
          300: '#f0a3ae',
          400: '#e8a3ae', // Light accent
          500: '#6D2932', // Primary accent
          550: '#561C24', // Darker accent
          600: '#561C24', // Darker accent
          650: '#561C24',
          700: '#45161c',
          800: '#381217',
          900: '#2b0e12',
          950: '#1d090c',
        },
        pink: {
          50: '#fdf2f4',
          100: '#fbe5e8',
          200: '#f7cbd2',
          300: '#f0a3ae',
          400: '#e8a3ae',
          500: '#6D2932',
          600: '#561C24',
          700: '#45161c',
          800: '#381217',
          900: '#2b0e12',
          950: '#1d090c',
        },
        darkbg: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          500: '#737373',
          800: '#242424',
          900: '#121212', // Neutral dark background
          950: '#0a0a0a', // Main neutral near-black base
        },
        slate: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          450: '#8c8c8c',
          500: '#737373',
          550: '#5c5c5c',
          600: '#525252',
          650: '#404040',
          700: '#383838',
          750: '#2d2d2d',
          800: '#242424',
          850: '#1a1a1a',
          900: '#121212', // Neutral dark surface background
          950: '#0a0a0a', // Main neutral near-black base background
        }
      }
    },
  },
  plugins: [],
}
