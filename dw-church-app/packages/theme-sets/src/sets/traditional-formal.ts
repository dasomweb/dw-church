/**
 * Traditional Formal — 네이비 + 골드, 세리프(Noto Serif KR) 헤딩.
 * 전통적이고 격식 있는 분위기. 장로교/감리교 등 역사 있는 교회에 권장.
 */
import type { ThemeSet } from '../schema.js';
import { DEFAULT_DESIGN_TOKENS } from '@dw-church/design-tokens';
import { CHURCH_PAGE_TEMPLATES } from './_shared-templates.js';

export const traditionalFormal: ThemeSet = {
  meta: {
    id: 'traditional-formal',
    name: 'Traditional Formal',
    description: '네이비 + 골드, 명조(세리프) 헤딩. 역사와 격식을 중시하는 교회에 권장.',
    previewImageUrl: 'https://placehold.co/1200x800/1e3a5f/c5a572?text=Traditional+Formal',
    tags: ['전통', '격식', '세리프'],
    recommendedFor: '역사 있는 장로교/감리교 / 격식 있는 분위기',
  },
  tokens: {
    ...DEFAULT_DESIGN_TOKENS,
    colors: {
      system: {
        primary: '#1e3a5f',
        secondary: '#3b5a7f',
        accent: '#c5a572',
        text: '#1f2937',
        muted: '#6b7280',
        background: '#ffffff',
        border: '#dfe3e8',
        surface: '#f5f3ee',
        onDark: '#ffffff',
        onDarkMuted: 'rgba(255,255,255,0.85)',
      },
      custom: {},
    },
    typography: {
      families: {
        heading: "'Noto Serif KR', 'Nanum Myeongjo', serif",
        body: "'Noto Sans KR', 'Pretendard', system-ui, sans-serif",
        korean: "'Noto Serif KR', 'Noto Sans KR', system-ui, sans-serif",
      },
      scales: DEFAULT_DESIGN_TOKENS.typography.scales,
    },
  },
  layout: { header: 'centered', footer: 'three-column', contentWidth: 'default', cardStyle: 'border', sermonGrid: 3 },
  pageTemplates: CHURCH_PAGE_TEMPLATES,
};
