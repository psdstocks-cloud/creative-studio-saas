/** @type {import('tailwindcss').Config} */
module.exports = {
  // ... existing config
  theme: {
    extend: {
      // ... existing extensions
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-out',
      },
    },
  },
  // ... rest of config
};