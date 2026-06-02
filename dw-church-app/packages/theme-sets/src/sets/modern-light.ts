/**
 * Modern Light — Phase 10-α 의 1개 sample theme set.
 *
 * 화이트 + 블루 그라데이션, sans-serif (Pretendard 우선), 와이드
 * 컨테이너. 도시형 중대형 교회의 깔끔한 모던 디자인.
 *
 * Phase 10-β 에서 나머지 9개 theme set 이 같은 schema 로 추가됨:
 *   - Modern Dark (다크 + 시안)
 *   - Traditional Formal (네이비 + 골드, 세리프)
 *   - Warm Family (베이지 + 살구)
 *   - Bold Youth (비비드 + 큰 폰트)
 *   - Minimalist (모노톤)
 *   - Korean Traditional (한지 + 명조)
 *   - Worship Atmosphere (자주 + 골드, 영상 배경)
 *   - Community Casual (파스텔)
 *   - Premium Editorial (매거진 스타일)
 */
import type { ThemeSet } from '../schema.js';
import { DEFAULT_DESIGN_TOKENS } from '@dw-church/design-tokens';

export const modernLight: ThemeSet = {
  meta: {
    id: 'modern-light',
    name: 'Modern Light',
    description: '깔끔한 화이트 베이스 + 모던 블루 액센트. 도시형 중대형 교회에 권장.',
    previewImageUrl: 'https://placehold.co/1200x800/2563eb/ffffff?text=Modern+Light',
    tags: ['모던', '깔끔한', '도시형'],
    recommendedFor: '도시형 중대형 교회 / 4000명 규모',
  },
  tokens: {
    ...DEFAULT_DESIGN_TOKENS,
    colors: {
      system: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        accent: '#06b6d4',
        text: '#0f172a',
        muted: '#64748b',
        background: '#ffffff',
        border: '#e2e8f0',
        surface: '#f8fafc',
      },
      custom: {},
    },
    typography: {
      families: {
        heading: "'Pretendard', 'Inter', system-ui, sans-serif",
        body: "'Pretendard', 'Inter', system-ui, sans-serif",
        korean: "'Pretendard', 'Noto Sans KR', system-ui, sans-serif",
      },
      scales: DEFAULT_DESIGN_TOKENS.typography.scales,
    },
  },
  layout: {
    header: 'default',
    footer: 'three-column',
    contentWidth: 'default',
    cardStyle: 'shadow',
    sermonGrid: 4,
  },
  pageTemplates: [
    {
      slug: 'home',
      title: '홈',
      description: '메인 페이지 — 히어로 + 인사말 + 최근 설교',
      defaultEnabled: true,
      blocks: [
        {
          blockType: 'hero_banner',
          props: {
            title: '$INTAKE.churchName',
            subtitle: '$INTAKE.churchVision',
            backgroundImageUrl: '$INTAKE.heroImageUrl',
            variant: 'image-overlay',
            overlayColor: '#0f172a',
            overlayOpacity: 0.4,
          },
        },
        {
          blockType: 'pastor_message',
          props: {
            title: '담임 목사 인사말',
            content: '$INTAKE.pastorMessage',
            pastorName: '$INTAKE.pastorName',
            pastorPhotoUrl: '$INTAKE.pastorPhotoUrl',
          },
        },
        {
          blockType: 'recent_sermons',
          props: {
            title: '최근 설교',
            limit: 4,
            variant: 'grid',
          },
        },
      ],
    },
    {
      slug: 'vision',
      title: '교회 비전',
      description: '교회의 비전, 미션, 핵심 가치',
      defaultEnabled: true,
      blocks: [
        {
          blockType: 'hero_banner',
          props: {
            title: '교회 비전',
            subtitle: '$INTAKE.churchVision',
            variant: 'page-hero',
          },
        },
        {
          blockType: 'text_only',
          props: {
            title: '비전',
            content: '$INTAKE.visionStatement',
          },
        },
      ],
    },
    {
      slug: 'history',
      title: '연혁',
      description: '교회 역사 timeline',
      defaultEnabled: true,
      blocks: [
        {
          blockType: 'hero_banner',
          props: { title: '연혁', variant: 'page-hero' },
        },
        {
          blockType: 'history_timeline',
          props: {
            items: '$INTAKE.historyItems',
          },
        },
      ],
    },
    {
      slug: 'staff',
      title: '교역자',
      description: '교역자 소개 그리드',
      defaultEnabled: true,
      blocks: [
        {
          blockType: 'hero_banner',
          props: { title: '교역자', variant: 'page-hero' },
        },
        {
          blockType: 'staff_grid',
          props: {
            columns: 3,
            items: '$INTAKE.staffMembers',
          },
        },
      ],
    },
    {
      slug: 'sermons',
      title: '설교',
      description: '설교 목록 + 검색',
      defaultEnabled: true,
      blocks: [
        {
          blockType: 'hero_banner',
          props: { title: '설교', variant: 'page-hero' },
        },
        {
          blockType: 'recent_sermons',
          props: {
            title: '',
            limit: 12,
            variant: 'grid',
            withFilter: true,
          },
        },
      ],
    },
    {
      slug: 'contact',
      title: '오시는 길',
      description: '주소, 지도, 연락처',
      defaultEnabled: true,
      blocks: [
        {
          blockType: 'hero_banner',
          props: { title: '오시는 길', variant: 'page-hero' },
        },
        {
          blockType: 'contact_info',
          props: {
            address: '$INTAKE.churchAddress',
            phone: '$INTAKE.churchPhone',
            email: '$INTAKE.churchEmail',
          },
        },
        {
          blockType: 'location_map',
          props: {
            address: '$INTAKE.churchAddress',
            zoom: 16,
          },
        },
      ],
    },
  ],
};
