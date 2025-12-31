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
        // Professional University Theme Colors
        primary: {
          DEFAULT: '#2563EB',
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
        primaryDark: '#1E40AF',
        accent: '#4F46E5',
        bgPage: '#F8FAFC',
        bgCard: '#FFFFFF',
        textHeading: '#0F172A',
        textBody: '#475569',
        textHelper: '#64748B',
        dark: {
          100: '#1f2d3d',
          200: '#111827',
          300: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        // Custom typography scale
        'app-title': ['2rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'section-heading': ['1.25rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
        'subheading': ['1rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        'helper': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
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
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(118, 255, 3, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(118, 255, 3, 0.8)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '0.9' },
          '50%': { opacity: '1' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-2px)' },
        }
      }
    },
  },
  plugins: [],
}
