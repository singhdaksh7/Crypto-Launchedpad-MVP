import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F0B90B',
          50: '#FDF8E6',
          100: '#FBF0C4',
          400: '#F6DF85',
          500: '#F0B90B',
          600: '#CFA009',
          700: '#9E7A07',
        },
        bnb: '#F0B90B',
        'bnb-light': '#F8D446',
        'bnb-text': '#F3C84B',
        base: '#070A12',
        surface: {
          DEFAULT: '#0D1320',
          1: '#0D1320',
          2: '#121B2D',
          3: '#18243C',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#34D399',
          text: '#6EE7B7',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          text: '#FCA5A5',
        },
        warning: {
          DEFAULT: '#FBBF24',
          text: '#FCD34D',
        },
        ink: {
          100: '#F4F7FC',
          200: '#EAF0FA',
          300: '#D6DEEC',
          400: '#9DAAC0',
          500: '#7E8BA3',
          600: '#5F6B82',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern':
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
        'brand-gradient':
          'linear-gradient(135deg, #F8D446 0%, #F0B90B 100%)',
      },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,0.02) inset, 0 1px 2px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(240,185,11,0.3), 0 8px 24px -8px rgba(240,185,11,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
