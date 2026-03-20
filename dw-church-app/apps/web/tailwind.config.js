/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui-components/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--dw-primary, #2563eb)',
        secondary: 'var(--dw-secondary, #64748b)',
        accent: 'var(--dw-accent, #f59e0b)',
        surface: 'var(--dw-surface, #f8fafc)',
      },
      fontFamily: {
        heading: ['var(--dw-font-heading, "Pretendard")', 'sans-serif'],
        body: ['var(--dw-font-body, "Pretendard")', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
