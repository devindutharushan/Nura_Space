import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#F6F7F5',
          surface: '#FFFFFF',
          elevated: '#EEF3F0',
          soft: '#EEF3F0',
        },
        border: {
          subtle: '#DDE5DF',
          muted: '#CCD6CF',
          strong: '#B5C2BA',
        },
        accent: {
          primary: '#256D5A',
          hover: '#1F5A4B',
          soft: '#E5F2ED',
        },
        text: {
          primary: '#17211D',
          secondary: '#5E6B64',
          muted: '#8A968F',
        },
        severity: {
          info: '#2563EB',
          warning: '#D97706',
          critical: '#DC2626',
          success: '#15803D',
        },
        status: {
          connected: '#15803D',
          disconnected: '#8A968F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 33, 29, 0.04), 0 4px 16px rgba(23, 33, 29, 0.06)',
        'card-lg': '0 8px 32px rgba(23, 33, 29, 0.10), 0 2px 6px rgba(23, 33, 29, 0.05)',
        toast: '0 8px 24px rgba(23, 33, 29, 0.12), 0 2px 4px rgba(23, 33, 29, 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
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
      backgroundImage: {
        'app-gradient':
          'radial-gradient(circle at 10% -10%, rgba(37, 109, 90, 0.06) 0%, transparent 45%), radial-gradient(circle at 100% 0%, rgba(37, 109, 90, 0.04) 0%, transparent 40%), linear-gradient(180deg, #F6F7F5 0%, #F6F7F5 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
