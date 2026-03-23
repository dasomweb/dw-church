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
        'primary-hover': 'var(--dw-primary-hover, #1d4ed8)',
        secondary: 'var(--dw-secondary, #64748b)',
        accent: 'var(--dw-accent, #f59e0b)',
        surface: 'var(--dw-surface, #f8fafc)',
        'surface-alt': 'var(--dw-surface-alt, #f8fafc)',
        border: 'var(--dw-border, #e2e8f0)',
        'text-primary': 'var(--dw-text-primary, #0f172a)',
        'text-secondary': 'var(--dw-text-secondary, #475569)',
        'text-muted': 'var(--dw-text-muted, #94a3b8)',
        'on-primary': '#ffffff',
      },
      fontFamily: {
        heading: ['var(--dw-font-heading, "Pretendard")', 'sans-serif'],
        body: ['var(--dw-font-body, "Pretendard")', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
