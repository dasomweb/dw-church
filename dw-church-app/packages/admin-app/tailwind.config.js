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
    extend: {
      // DASOMWEB Design System (Claude Design project 62088c45, _tokens.css).
      // 관리자 콘솔 전역 디자인 언어. 폰트 = Pretendard, 주조색 = 브랜드 블루.
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'Menlo', 'monospace'],
      },
      colors: {
        // 시맨틱 토큰 (CSS 변수 참조 — index.css :root 에 정의).
        brand: 'var(--brand)',
        primary: 'var(--primary)',
        surface: 'var(--surface)',
        ink: 'var(--fg)',
        muted: 'var(--fg-muted)',
        line: 'var(--border)',
        // Tailwind blue 스케일을 브랜드 블루로 재매핑 → 기존 47개 페이지의
        // bg-blue-600 버튼 · bg-blue-50/text-blue-700 활성 nav 가 전부 브랜드색으로
        // 바뀐다(페이지별 수정 없이 전역 리스킨). 중심값 600=#1466d6(--brand).
        blue: {
          50: '#eff5fe',
          100: '#dbe8fc',
          200: '#bcd4f9',
          300: '#8fb6f3',
          400: '#3d84ec',
          500: '#2b7fff',
          600: '#1466d6',
          700: '#0f4fa8',
          800: '#0e3f83',
          900: '#11386c',
        },
        // 중립(회색) 스케일도 디자인 토큰으로 재매핑 → 기존 text-gray-900(제목)·
        // text-gray-500/600(본문·보조)·bg-gray-50(surface)·border-gray-200(테두리)가
        // 전부 디자인 시스템 텍스트/면 색(#16181d · #61697a · #f7f8fa · #e5e7eb)이 된다.
        gray: {
          50: '#f7f8fa',   // --surface (페이지/입력 배경)
          100: '#eef0f3',  // hover 면
          200: '#e5e7eb',  // --border
          300: '#cdd3dd',
          400: '#8b93a3',  // placeholder·아주 옅은 보조
          500: '#61697a',  // --fg-muted (보조 텍스트)
          600: '#4b5462',
          700: '#353c49',
          800: '#242a33',
          900: '#16181d',  // --fg (본문·제목)
        },
      },
      borderRadius: {
        // 디자인 토큰 radius (sm 8 · base 12 · lg 16).
        lg: '12px',
        xl: '14px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
