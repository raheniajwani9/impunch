/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        salt: '#FDF5EE',
        ink: '#1A1D29',
        primary: {
          400: '#3374FF',
          500: '#0050FF',
          600: '#003FCC',
        },
        accent: {
          400: '#FF6E33',
          500: '#FF5200',
          600: '#CC4200',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        radarPulse: {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        radar: 'radarPulse 1.7s ease-out infinite',
      },
    },
  },
  plugins: [],
}