/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#dc2626',
        neutral: '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'Heebo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
