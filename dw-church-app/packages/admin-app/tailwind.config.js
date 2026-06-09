/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../ui-components/src/**/*.{ts,tsx}',
    // The in-process builder canvas (BuilderCanvas) renders @dw-church/blocks
    // components, which use Tailwind utility classes (min-h-[600px], grid-cols-*,
    // flex, etc.) — including the SECTION_HEIGHT_MAP / layout classes. Without
    // scanning the blocks source, Tailwind never emits those classes into the
    // admin CSS bundle, so height / width / align / column changes silently
    // do nothing in the canvas (fonts/colors still work — they're inline CSS
    // vars, not utilities). Scan blocks so structural props apply.
    '../blocks/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
