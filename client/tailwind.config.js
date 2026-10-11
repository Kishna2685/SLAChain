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
        cyber: {
          900: '#080b14',
          850: '#0d1322',
          800: '#111827',
          700: '#1f293d',
          600: '#2b3853',
          neon: '#00f0ff',
          purple: '#a855f7',
          emerald: '#10b981',
          crimson: '#ef4444',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 20px -5px rgba(0, 240, 255, 0.4)',
        'neon-purple': '0 0 20px -5px rgba(168, 85, 247, 0.4)',
        'neon-crimson': '0 0 20px -5px rgba(239, 68, 68, 0.4)',
        'neon-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.4)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 240, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
