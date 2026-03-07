/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f0ff',
          100: '#e2e2ff',
          200: '#c7c7ff',
          300: '#a5a5ff',
          400: '#8080ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      animation: {
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-once': 'pulse 0.6s ease-in-out 1',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
