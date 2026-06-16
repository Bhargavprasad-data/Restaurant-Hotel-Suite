/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff1f3',
          100: '#ffe0e5',
          200: '#ffc6cf',
          300: '#ff9dac',
          400: '#ff6580',
          500: '#FF385C',
          600: '#e0314f',
          700: '#bc1f3a',
          800: '#9d1d36',
          900: '#861d34',
        },
        accent: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'brand-sm': '0 2px 8px rgba(255,56,92,0.25)',
        'brand':    '0 4px 14px rgba(255,56,92,0.35)',
        'brand-lg': '0 8px 30px rgba(255,56,92,0.4)',
        'card':     '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-lg':  '0 10px 40px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease forwards',
        'fade-in-up':    'fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in':      'scaleIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer':       'shimmer-wave 1.6s ease-in-out infinite',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.4,0,0.2,1) forwards',
        'slide-out-left':'slideOutLeft 0.3s cubic-bezier(0.4,0,0.2,1) forwards',
      },
      keyframes: {
        fadeIn:        { from: { opacity: 0 }, to: { opacity: 1 } },
        fadeInUp:      { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:       { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        'shimmer-wave':{ '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        slideInLeft:   { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        slideOutLeft:  { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-100%)' } },
      },
    },
  },
  plugins: [],
}
