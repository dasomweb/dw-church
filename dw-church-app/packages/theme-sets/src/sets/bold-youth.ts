/**
 * Bold Youth — 비비드 퍼플 + 핑크, 굵은 산세리프(Gothic A1 heavy).
 * 에너지 넘치는 젊은 분위기. 청년교회/대학부/개척교회에 권장.
 */
import type { ThemeSet } from '../schema.js';
import { DEFAULT_DESIGN_TOKENS } from '@dw-church/design-tokens';
import { CHURCH_PAGE_TEMPLATES } from './_shared-templates.js';

// 큰 폰트 스케일 — 헤딩을 기본보다 키워 에너지 있는 인상.
// `!` on the indexed access: tsconfig has noUncheckedIndexedAccess, so
// scales.h1 is `Spec | undefined`; spreading the undefined would widen every
// field to optional and break the DesignTokens type. The keys always exist.
const s = DEFAULT_DESIGN_TOKENS.typography.scales;
const boldScales = {
  ...s,
  h1: { ...s.h1!, size: { desktop: 88, tablet: 64, mobile: 48 }, weight: 800 },
  h2: { ...s.h2!, size: { desktop: 48, tablet: 40, mobile: 34 }, weight: 800 },
  h3: { ...s.h3!, size: { desktop: 30, tablet: 26, mobile: 24 }, weight: 700 },
};

export const boldYouth: ThemeSet = {
  meta: {
    id: 'bold-youth',
    name: 'Bold Youth',
    description: '비비드 퍼플 + 핑크, 굵고 큰 헤딩. 에너지 넘치는 청년/대학부 교회에 권장.',
    previewImageUrl: 'https://placehold.co/1200x800/7c3aed/ec4899?text=Bold+Youth',
    tags: ['비비드', '젊은', '에너지', '큰폰트'],
    recommendedFor: '청년교회 / 대학부 / 개척교회',
  },
  tokens: {
    ...DEFAULT_DESIGN_TOKENS,
    colors: {
      system: {
        primary: '#7c3aed',
        secondary: '#ec4899',
        accent: '#f59e0b',
        text: '#18181b',
        muted: '#71717a',
        background: '#ffffff',
        border: '#e9d5ff',
        surface: '#faf5ff',
      },
      custom: {},
    },
    typography: {
      families: {
        heading: "'Gothic A1', 'Noto Sans KR', system-ui, sans-serif",
        body: "'Noto Sans KR', 'Pretendard', system-ui, sans-serif",
        korean: "'Noto Sans KR', 'Gothic A1', system-ui, sans-serif",
      },
      scales: boldScales,
    },
  },
  layout: { header: 'default', footer: 'centered', contentWidth: 'wide', cardStyle: 'elevated', sermonGrid: 4 },
  pageTemplates: CHURCH_PAGE_TEMPLATES,
};
