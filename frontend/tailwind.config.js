/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary luxurious black/gold theme
        raven: {
          black: '#0A0A0A',
          charcoal: '#1A1A1A',
          dark: '#252525',
          gray: '#3A3A3A',
        },
        gold: {
          50: '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE699',
          300: '#FFD966',
          400: '#FFCC33',
          500: '#D4AF37', // Primary gold
          600: '#B8960F',
          700: '#8B7355',
          800: '#6B5B3D',
          900: '#4A3F2A',
        },
        silver: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#C0C0C0', // Primary silver
          600: '#737373',
          700: '#525252',
          800: '#404040',
          900: '#262626',
        },
        platinum: {
          50: '#F8F9FA',
          100: '#E8EAED',
          200: '#E5E4E2', // Primary platinum
          300: '#D3D3D3',
          400: '#B0B0B0',
          500: '#8E8E8E',
        },
        // Project-specific accent colors
        spicy: {
          red: '#DC2626',
          orange: '#EA580C',
          flame: '#F97316',
        },
        logistics: {
          blue: '#2563EB',
          teal: '#0D9488',
        },
        news: {
          indigo: '#4F46E5',
        },
        gaming: {
          purple: '#9333EA',
          pink: '#EC4899',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%)',
        'gradient-forge': 'linear-gradient(135deg, #1A1A1A 0%, #2D1810 50%, #1A1A1A 100%)',
        'mesh-gold': 'radial-gradient(at 40% 20%, rgba(212, 175, 55, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(212, 175, 55, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(212, 175, 55, 0.05) 0px, transparent 50%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(212, 175, 55, 0.3)',
        'gold-lg': '0 0 40px rgba(212, 175, 55, 0.4)',
        'gold-glow': '0 0 60px rgba(212, 175, 55, 0.5)',
        'inner-gold': 'inset 0 0 20px rgba(212, 175, 55, 0.2)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'flame': 'flame 1s ease-in-out infinite',
        'spark': 'spark 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.6)' },
        },
        flame: {
          '0%, 100%': { transform: 'scaleY(1) scaleX(1)' },
          '50%': { transform: 'scaleY(1.1) scaleX(0.95)' },
        },
        spark: {
          '0%': { opacity: 0, transform: 'translateY(0) scale(0)' },
          '50%': { opacity: 1, transform: 'translateY(-20px) scale(1)' },
          '100%': { opacity: 0, transform: 'translateY(-40px) scale(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}






