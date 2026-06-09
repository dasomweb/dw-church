/**
 * Warm Family — 따뜻한 코랄 + 앰버, 부드러운 산세리프(Gothic A1).
 * 가족적이고 환영하는 분위기. 가정교회/소형 공동체에 권장.
 */
import type { ThemeSet } from '../schema.js';
import { DEFAULT_DESIGN_TOKENS } from '@dw-church/design-tokens';
import { CHURCH_PAGE_TEMPLATES } from './_shared-templates.js';

export const warmFamily: ThemeSet = {
  meta: {
    id: 'warm-family',
    name: 'Warm Family',
    description: '따뜻한 코랄 + 베이지 톤. 가족적이고 환영하는 소형 공동체에 권장.',
    previewImageUrl: 'https://placehold.co/1200x800/e07856/fffaf5?text=Warm+Family',
    tags: ['따뜻한', '가족적', '환영'],
    recommendedFor: '가정교회 / 소형 공동체 / 따뜻한 분위기',
  },
  tokens: {
    ...DEFAULT_DESIGN_TOKENS,
    colors: {
      system: {
        primary: '#e07856',
        secondary: '#d97706',
        accent: '#f4a261',
        text: '#44403c',
        muted: '#78716c',
        background: '#fffaf5',
        border: '#f0e3d6',
        surface: '#fdf2e9',
      },
      custom: {},
    },
    typography: {
      families: {
        heading: "'Gothic A1', 'Noto Sans KR', system-ui, sans-serif",
        body: "'Noto Sans KR', 'Pretendard', system-ui, sans-serif",
        korean: "'Noto Sans KR', 'Gothic A1', system-ui, sans-serif",
      },
      scales: DEFAULT_DESIGN_TOKENS.typography.scales,
    },
  },
  layout: { header: 'default', footer: 'centered', contentWidth: 'default', cardStyle: 'shadow', sermonGrid: 3 },
  pageTemplates: CHURCH_PAGE_TEMPLATES,
};
