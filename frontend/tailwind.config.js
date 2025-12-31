/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          100: '#1f2d3d',
          200: '#111827',
          300: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        google: ['Google Sans', 'Segoe UI', 'Roboto', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      minHeight: {
        '11': '2.75rem',
        '12': '3rem',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(17, 24, 39, 0.06)',
        'button': '0 6px 16px rgba(37, 99, 235, 0.18)',
        'ar': '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'spin-slow': 'spin 1s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(118, 255, 3, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(118, 255, 3, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
