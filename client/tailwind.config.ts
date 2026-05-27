import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#030712',
          surface: '#0f172a',
          elevated: '#1e293b',
        },
        border: {
          subtle: 'rgba(255,255,255,0.07)',
          muted: 'rgba(255,255,255,0.12)',
          strong: 'rgba(255,255,255,0.20)',
        },
        accent: {
          primary: '#6366f1',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          muted: '#475569',
        },
        severity: {
          info: '#38bdf8',
          warning: '#fb923c',
          critical: '#f87171',
        },
        status: {
          connected: '#4ade80',
          disconnected: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.40), 0 4px 24px rgba(0,0,0,0.25)',
        'card-lg': '0 8px 48px rgba(0,0,0,0.55)',
        toast: '0 4px 24px rgba(0,0,0,0.60), 0 1px 3px rgba(0,0,0,0.40)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
} satisfies Config;
