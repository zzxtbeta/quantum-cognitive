/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
      },
      colors: {
        signal: {
          high: '#ef4444',
          mid: '#f59e0b',
          low: '#64748b',
        },
        accent: '#3b82f6',
        ink: {
          900: '#05050e',
          800: '#0a0a18',
          700: '#10101f',
          600: '#161628',
        },
        blue: {
          ...require('tailwindcss/colors').blue,
          glow: 'rgba(59,130,246,0.25)',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(59,130,246,0.18)',
        'glow':    '0 0 24px rgba(59,130,246,0.25)',
        'glow-lg': '0 0 48px rgba(59,130,246,0.30)',
      },
      animation: {
        'fade-up': 'fadeSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
        'shimmer': 'shimmer 4s linear infinite',
      },
    },
  },
  plugins: [],
}
