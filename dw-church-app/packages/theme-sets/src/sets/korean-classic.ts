/**
 * Korean Classic — 한지 톤 + 전통 적색/고동, 명조(Noto Serif KR).
 * 한국 전통 정서를 살린 차분한 디자인. 전통 깊은 교회/한옥 예배당에 권장.
 */
import type { ThemeSet } from '../schema.js';
import { DEFAULT_DESIGN_TOKENS } from '@dw-church/design-tokens';
import { CHURCH_PAGE_TEMPLATES } from './_shared-templates.js';

export const koreanClassic: ThemeSet = {
  meta: {
    id: 'korean-classic',
    name: 'Korean Classic',
    description: '한지 베이지 + 전통 적색·고동, 명조체. 한국 전통 정서의 차분한 디자인.',
    previewImageUrl: 'https://placehold.co/1200x800/8b2e2e/faf6ef?text=Korean+Classic',
    tags: ['전통', '한국적', '명조', '차분한'],
    recommendedFor: '전통 깊은 교회 / 한국적 정서 강조',
  },
  tokens: {
    ...DEFAULT_DESIGN_TOKENS,
    colors: {
      system: {
        primary: '#8b2e2e',
        secondary: '#a8624a',
        accent: '#b08d57',
        text: '#2d2a26',
        muted: '#6f6960',
        background: '#faf6ef',
        border: '#e6ddcf',
        surface: '#f2ebdd',
        onDark: '#ffffff',
        onDarkMuted: 'rgba(255,255,255,0.85)',
      },
      custom: {},
    },
    typography: {
      families: {
        heading: "'Noto Serif KR', 'Nanum Myeongjo', serif",
        body: "'Noto Serif KR', 'Noto Sans KR', system-ui, serif",
        korean: "'Noto Serif KR', 'Nanum Myeongjo', serif",
      },
      scales: DEFAULT_DESIGN_TOKENS.typography.scales,
    },
  },
  layout: { header: 'centered', footer: 'three-column', contentWidth: 'narrow', cardStyle: 'border', sermonGrid: 3 },
  pageTemplates: CHURCH_PAGE_TEMPLATES,
};
