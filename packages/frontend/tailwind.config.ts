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
          DEFAULT: '#00f7ff',
          50: '#e0feff',
          100: '#b8fdff',
          400: '#22e2eb',
          500: '#00f7ff',
          600: '#00cdd6',
          700: '#00a3ad',
        },
        secondary: {
          DEFAULT: '#00bcd4',
          500: '#00bcd4',
          600: '#0097a7',
        },
        surface: {
          DEFAULT: '#000000',
          1: '#050505',
          2: '#0a0a0a',
          3: '#111111',
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
          'linear-gradient(135deg, #00f7ff 0%, #00bcd4 100%)',
      },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,0.02) inset, 0 1px 2px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(0,247,255,0.3), 0 8px 24px -8px rgba(0,247,255,0.4)',
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
