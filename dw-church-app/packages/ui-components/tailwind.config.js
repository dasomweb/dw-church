/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  prefix: 'dw-',
  theme: {
    extend: {
      colors: {
        primary: 'var(--dw-primary, #2563eb)',
        'primary-hover': 'var(--dw-primary-hover, #1d4ed8)',
        secondary: 'var(--dw-secondary, #64748b)',
        accent: 'var(--dw-accent, #f59e0b)',
        surface: 'var(--dw-surface, #ffffff)',
        'surface-alt': 'var(--dw-surface-alt, #f8fafc)',
        border: 'var(--dw-border, #e2e8f0)',
        'text-primary': 'var(--dw-text-primary, #0f172a)',
        'text-secondary': 'var(--dw-text-secondary, #475569)',
        'text-muted': 'var(--dw-text-muted, #94a3b8)',
      },
      fontFamily: {
        sans: 'var(--dw-font-family, "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
      },
      fontSize: {
        base: 'var(--dw-font-size-base, 1rem)',
      },
      borderRadius: {
        DEFAULT: 'var(--dw-border-radius, 0.5rem)',
      },
    },
  },
  plugins: [],
};
