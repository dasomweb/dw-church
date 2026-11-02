/**
 * Default values for a fresh project. The ThemeEditor preset picker (Phase 2)
 * will pivot off these — selecting "default" applies this snapshot, "compact"
 * shrinks the type scale, "large" / "xlarge" grow it.
 */
import type { DesignTokens, TypographyScaleName, TypographyScaleSpec } from './schema.js';

// Korean-optimized type scale. Korean glyphs are full-height with no ascender/
// descender slack, so they need MORE line-height than Latin (English display
// leading of ~1.15 clips 받침 and crowds the next line). Modern Korean web type
// (Pretendard-driven — Toss / 당근 / Naver) uses generous body leading (~1.7),
// heading leading of 1.25–1.45, and slight NEGATIVE letter-spacing on large
// headings (자간 축소, ~-0.02em). Body never drops below 16px (incl. mobile).
const defaultScales: Record<TypographyScaleName, TypographyScaleSpec> = {
  h1:       { fontFamily: 'heading', size: { desktop: 72, tablet: 56, mobile: 42 }, weight: 700, lineHeight: 1.25, letterSpacing: -1.5 },
  h2:       { fontFamily: 'heading', size: { desktop: 40, tablet: 36, mobile: 30 }, weight: 700, lineHeight: 1.3,  letterSpacing: -0.8 },
  h3:       { fontFamily: 'heading', size: { desktop: 26, tablet: 24, mobile: 22 }, weight: 600, lineHeight: 1.35, letterSpacing: -0.5 },
  h4:       { fontFamily: 'heading', size: { desktop: 20, tablet: 19, mobile: 18 }, weight: 600, lineHeight: 1.4,  letterSpacing: -0.3 },
  h5:       { fontFamily: 'heading', size: { desktop: 17, tablet: 17, mobile: 16 }, weight: 600, lineHeight: 1.45 },
  h6:       { fontFamily: 'heading', size: { desktop: 15, tablet: 15, mobile: 14 }, weight: 600, lineHeight: 1.45 },
  body:     { fontFamily: 'body',    size: { desktop: 17, tablet: 17, mobile: 17 }, weight: 400, lineHeight: 1.75 },
  caption:  { fontFamily: 'body',    size: { desktop: 14, tablet: 14, mobile: 13 }, weight: 400, lineHeight: 1.6 },
  overline: { fontFamily: 'body',    size: { desktop: 13, tablet: 13, mobile: 13 }, weight: 600, lineHeight: 1.5, letterSpacing: 0.6, transform: 'uppercase' },
  label:    { fontFamily: 'body',    size: { desktop: 15, tablet: 15, mobile: 14 }, weight: 500, lineHeight: 1.55 },
  button:   { fontFamily: 'body',    size: { desktop: 16, tablet: 16, mobile: 15 }, weight: 600, lineHeight: 1.3 },
};

export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: {
    system: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#06b6d4',
      text: '#1e293b',
      muted: '#64748b',
      background: '#ffffff',
      border: '#e2e8f0',
      surface: '#f1f5f9',
      // Dark-background text colors — used when copy sits over an image/overlay
      // (e.g. hero with Background Image + Overlay). onDark = headings/primary,
      // onDarkMuted = subtitles/secondary. Centralizes the white-on-photo color
      // so operators tune it once instead of per-section.
      onDark: '#ffffff',
      onDarkMuted: 'rgba(255,255,255,0.85)',
    },
    custom: {},
  },
  typography: {
    families: {
      // Korean-first stack — Pretendard is the de-facto standard modern Korean
      // web font (broad glyph coverage). The storefront already loads Pretendard
      // (static) via CDN, so it's the guaranteed-rendered default. Latin
      // fallbacks come AFTER so Korean text isn't driven by Inter's Latin-only
      // metrics; Noto Sans KR is a loaded Korean fallback.
      heading: "'Pretendard', 'Noto Sans KR', system-ui, sans-serif",
      body: "'Pretendard', 'Noto Sans KR', system-ui, sans-serif",
      korean: "'Pretendard', 'Noto Sans KR', system-ui, sans-serif",
    },
    scales: defaultScales,
  },
  breakpoints: {
    tablet: 1024,
    mobile: 640,
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  },
  radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  containerMax: 1200,
  spacing: {
    sectionPaddingY: 75,
    containerPaddingX: 20,
    gapGrid: 24,
    sectionMarginY: 0,
  },
  // Header chrome — 로고 40px. 네비는 한글 기준 16px — 라틴 `text-sm`(14px) 을
  // 그대로 쓰면 한글 메뉴가 작다(자모 2~4개가 한 블록에 들어가 획이 몽친다).
  // to-css-vars 가 15px 하한을 교므로 구 스댉샷도 불법적으로 작아지지 않는다.
  header: {
    variant: 'standard',
    liveBannerText: '지금 예배가 진행 중입니다',
    liveBannerButtonLabel: '생중계 보기',
    liveBannerUrl: '',
    searchUrl: '/search',
    accountLabel: '교인 로그인',
    accountUrl: '',
    logoHeight: 40,
    navFontSize: 16,
    navFontWeight: 500,
    brandTextEn: '',
    utilityBarEnabled: false,
    utilityBarText: '',
    utilityShowFontSize: true,
    utilityShowKakao: true,
    utilityShowLanguage: false,
    givingEnabled: false,
    givingLabel: '온라인 헌금',
    givingUrl: '/giving',
  },
  // Footer design — dark navy columns layout matching the standard church
  // footer (logo + 오시는 길 + Social Media / 온라인 예배 + copyright).
  footer: {
    variant: 'columns',
    background: '#0b1622',
    text: '#9ca3af',
    heading: '#e5e7eb',
    showLogo: true,
    brandMode: 'logo',
    logoUrl: '',
    brandText: '',
    directionsLabel: '오시는 길',
    socialLabel: 'Social Media / 온라인 예배',
    copyright: '',
    tagline: '',
    showNav: true,
  },
  // Button design — reproduces ButtonElement's prior look: rounded corners
  // inheriting radius.md (radius omitted), 20/10 padding, no shadow. Operators
  // change these in 테마설정 → 버튼 to restyle every button site-wide.
  button: {
    shape: 'rounded',
    paddingX: 20,
    paddingY: 10,
    shadow: false,
  },
};

/**
 * Font-size preset table — Phase 2 ThemeEditor exposes these via a 4-radio
 * picker. compact/default/large/xlarge each scales the headings + body anchor.
 * `default` matches DEFAULT_DESIGN_TOKENS exactly.
 */
// Korean-optimized density presets. 모든 헤더에서 본몸은 16px 이상, 취소문은 13px
// 이상 — 한글은 그 아래에서 받침 획이 뫙친다(compact 도 하한을 지킨다).
// `default` stays in sync with defaultScales above
// so detectFontSizePreset still recognizes a default snapshot. Line-height and
// letter-spacing (the bigger Korean-readability levers) live in the base scales
// and survive a preset switch (applyFontSizePreset only overrides size).
export const FONT_SIZE_PRESETS = {
  compact: {
    h1: { desktop: 56, mobile: 36 },
    h2: { desktop: 32, mobile: 26 },
    h3: { desktop: 24, mobile: 20 },
    h4: { desktop: 18, mobile: 17 },
    h5: { desktop: 16, mobile: 15 },
    h6: { desktop: 14, mobile: 14 },
    body: { desktop: 16, mobile: 16 },
    caption: { desktop: 13, mobile: 13 },
  },
  default: {
    h1: { desktop: 72, mobile: 42 },
    h2: { desktop: 40, mobile: 30 },
    h3: { desktop: 26, mobile: 22 },
    h4: { desktop: 20, mobile: 18 },
    h5: { desktop: 17, mobile: 16 },
    h6: { desktop: 15, mobile: 14 },
    body: { desktop: 17, mobile: 17 },
    caption: { desktop: 14, mobile: 13 },
  },
  large: {
    h1: { desktop: 88, mobile: 48 },
    h2: { desktop: 48, mobile: 34 },
    h3: { desktop: 30, mobile: 24 },
    h4: { desktop: 22, mobile: 20 },
    h5: { desktop: 18, mobile: 17 },
    h6: { desktop: 16, mobile: 15 },
    body: { desktop: 18, mobile: 18 },
    caption: { desktop: 15, mobile: 14 },
  },
  xlarge: {
    h1: { desktop: 96, mobile: 52 },
    h2: { desktop: 56, mobile: 38 },
    h3: { desktop: 36, mobile: 26 },
    h4: { desktop: 24, mobile: 22 },
    h5: { desktop: 20, mobile: 18 },
    h6: { desktop: 17, mobile: 16 },
    body: { desktop: 19, mobile: 19 },
    caption: { desktop: 16, mobile: 15 },
  },
} as const;

export type FontSizePresetName = keyof typeof FONT_SIZE_PRESETS;

/**
 * Spacing density presets. Phase 2 picker.
 */
export const SPACING_PRESETS = {
  cozy:    { sectionPaddingY: 48,  containerPaddingX: 16, gapGrid: 16, sectionMarginY: 0 },
  default: { sectionPaddingY: 75,  containerPaddingX: 20, gapGrid: 24, sectionMarginY: 0 },
  airy:    { sectionPaddingY: 100, containerPaddingX: 24, gapGrid: 32, sectionMarginY: 16 },
  spacious:{ sectionPaddingY: 140, containerPaddingX: 32, gapGrid: 40, sectionMarginY: 32 },
} as const;

export type SpacingPresetName = keyof typeof SPACING_PRESETS;
