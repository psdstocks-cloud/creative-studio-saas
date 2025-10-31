/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        'theme-bg-primary': 'rgb(var(--bg-primary))',
        'theme-bg-secondary': 'rgb(var(--bg-secondary))',
        'theme-bg-tertiary': 'rgb(var(--bg-tertiary))',
        'theme-bg-elevated': 'rgb(var(--bg-elevated))',
        'theme-text-primary': 'rgb(var(--text-primary))',
        'theme-text-secondary': 'rgb(var(--text-secondary))',
        'theme-text-tertiary': 'rgb(var(--text-tertiary))',
        'theme-text-muted': 'rgb(var(--text-muted))',
        'theme-border': 'rgb(var(--border-color))',
        'theme-border-hover': 'rgb(var(--border-hover))',
        'theme-primary': 'rgb(var(--primary-rgb))',
        'theme-primary-hover': 'rgb(var(--primary-hover-rgb))',
        'theme-success': 'rgb(var(--success-rgb))',
        'theme-warning': 'rgb(var(--warning-rgb))',
        'theme-error': 'rgb(var(--error-rgb))',
        'theme-info': 'rgb(var(--info-rgb))',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-out',
        fadeIn: 'fadeIn 0.5s ease-in',
      },
    },
  },
  plugins: [],
}
