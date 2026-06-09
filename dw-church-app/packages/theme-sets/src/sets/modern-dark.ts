/**
 * Modern Dark — 다크 베이스 + 시안 액센트, IBM Plex Sans KR.
 * 세련되고 현대적인 분위기. 청년부 강세 / 미디어 중심 교회에 권장.
 */
import type { ThemeSet } from '../schema.js';
import { DEFAULT_DESIGN_TOKENS } from '@dw-church/design-tokens';
import { CHURCH_PAGE_TEMPLATES } from './_shared-templates.js';

export const modernDark: ThemeSet = {
  meta: {
    id: 'modern-dark',
    name: 'Modern Dark',
    description: '다크 베이스 + 시안 액센트. 미디어 중심 / 청년부 강세 교회에 권장.',
    previewImageUrl: 'https://placehold.co/1200x800/0f172a/22d3ee?text=Modern+Dark',
    tags: ['다크', '모던', '미디어'],
    recommendedFor: '미디어 중심 / 청년부 강세 / 세련된 분위기',
  },
  tokens: {
    ...DEFAULT_DESIGN_TOKENS,
    colors: {
      system: {
        primary: '#22d3ee',
        secondary: '#818cf8',
        accent: '#f472b6',
        text: '#e2e8f0',
        muted: '#94a3b8',
        background: '#0f172a',
        border: '#1e293b',
        surface: '#1e293b',
      },
      custom: {},
    },
    typography: {
      families: {
        heading: "'IBM Plex Sans KR', 'Noto Sans KR', system-ui, sans-serif",
        body: "'IBM Plex Sans KR', 'Noto Sans KR', system-ui, sans-serif",
        korean: "'Noto Sans KR', 'IBM Plex Sans KR', system-ui, sans-serif",
      },
      scales: DEFAULT_DESIGN_TOKENS.typography.scales,
    },
  },
  layout: { header: 'dark', footer: 'dark', contentWidth: 'wide', cardStyle: 'flat', sermonGrid: 4 },
  pageTemplates: CHURCH_PAGE_TEMPLATES,
};
