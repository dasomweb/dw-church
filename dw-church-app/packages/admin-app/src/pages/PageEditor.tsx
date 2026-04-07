import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { Page, PageSection, BlockType } from '@dw-church/api-client';
import {
  usePages,
  usePageSections,
  useCreatePage,
  useUpdatePage,
  useDeletePage,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
} from '@dw-church/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { useToast } from '../components';
import { ImageUpload, MultiImageUpload } from '../components/ImageUpload';

// ═══════════════════════════════════════════════════════════
// Block Registry — types, variants, metadata
// ═══════════════════════════════════════════════════════════

// ─── Image Library ────────────────────────────────────────
const IMAGE_LIBRARY: { category: string; images: { url: string; label: string }[] }[] = [
  { category: '자연', images: [
    { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=85&auto=format', label: '산과 호수' },
    { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=85&auto=format', label: '숲속 안개' },
    { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85&auto=format', label: '푸른 숲' },
    { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=85&auto=format', label: '초원과 하늘' },
  ]},
  { category: '꽃', images: [
    { url: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=1920&q=85&auto=format', label: '핑크 꽃' },
    { url: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=1920&q=85&auto=format', label: '라벤더' },
    { url: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=1920&q=85&auto=format', label: '봄꽃' },
    { url: 'https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=1920&q=85&auto=format', label: '들꽃' },
  ]},
  { category: '하늘', images: [
    { url: 'https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=1920&q=85&auto=format', label: '일출' },
    { url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=85&auto=format', label: '구름' },
    { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=85&auto=format', label: '황금빛 하늘' },
    { url: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1920&q=85&auto=format', label: '노을' },
  ]},
  { category: '십자가', images: [
    { url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&q=85&auto=format', label: '십자가 실루엣' },
    { url: 'https://images.unsplash.com/photo-1445855743215-296f0ec091ef?w=1920&q=85&auto=format', label: '언덕 위 십자가' },
    { url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1920&q=85&auto=format', label: '빛과 십자가' },
    { url: 'https://images.unsplash.com/photo-1474314170901-f351b68f544f?w=1920&q=85&auto=format', label: '나무 십자가' },
  ]},
  { category: '교회', images: [
    { url: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1920&q=85&auto=format', label: '교회 건물' },
    { url: 'https://images.unsplash.com/photo-1510936111840-65e151ad71bb?w=1920&q=85&auto=format', label: '스테인드 글라스' },
    { url: 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=1920&q=85&auto=format', label: '예배당 내부' },
    { url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424cb?w=1920&q=85&auto=format', label: '교회 첨탑' },
  ]},
  { category: '모던', images: [
    { url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=85&auto=format', label: '블루 그래디언트' },
    { url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&q=85&auto=format', label: '추상 웨이브' },
    { url: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=1920&q=85&auto=format', label: '컬러 추상' },
    { url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=85&auto=format', label: '그래디언트' },
  ]},
  { category: '텍스처', images: [
    { url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1920&q=85&auto=format', label: '종이 텍스처' },
    { url: 'https://images.unsplash.com/photo-1533628635777-112b2239b1c7?w=1920&q=85&auto=format', label: '대리석' },
    { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&q=85&auto=format', label: '다크 텍스처' },
    { url: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?w=1920&q=85&auto=format', label: '나무결' },
  ]},
];

interface BlockVariant {
  id: string;
  label: string;
}

interface BlockDef {
  type: string;
  label: string;
  category: string;
  icon: string;
  description: string;
  nature: 'static' | 'dynamic';
  variants: BlockVariant[];
  defaultProps: Record<string, unknown>;
  editableFields: { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'select' | 'image' | 'images' | 'url' | 'array' | 'tags' | 'services'; options?: { label: string; value: string }[]; max?: number }[];
}

const DYNAMIC_BLOCK_TYPES = new Set([
  'banner_slider', 'hero_image_slider', 'recent_sermons', 'recent_bulletins',
  'album_gallery', 'staff_grid', 'event_grid', 'history_timeline',
]);

const BLOCK_DEFS: BlockDef[] = [
  // ─── Hero ─────────────────────────────────────
  { type: 'hero_banner', label: '히어로 배너', category: '히어로', icon: '🖼️', nature: 'static', description: '배경 이미지 + 텍스트 오버레이 배너', variants: [{ id: 'centered', label: '중앙' }, { id: 'left', label: '좌측' }], defaultProps: { title: '환영합니다', subtitle: '', height: 'md', textAlign: 'center', layout: 'full', overlayColor: '#000000', overlayOpacity: 50 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제목', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }, { key: 'overlayColor', label: '오버레이 색상', type: 'text' }, { key: 'overlayOpacity', label: '오버레이 투명도 (%)', type: 'number' }, { key: 'buttonText', label: '버튼 텍스트', type: 'text' }, { key: 'buttonUrl', label: '버튼 링크', type: 'url' }, { key: 'layout', label: '레이아웃', type: 'select', options: [{ label: '풀 와이드', value: 'full' }, { label: '컨테이너', value: 'contained' }] }, { key: 'height', label: '높이', type: 'select', options: [{ label: '작게', value: 'sm' }, { label: '보통', value: 'md' }, { label: '크게', value: 'lg' }, { label: '전체', value: 'full' }] }] },
  { type: 'banner_slider', label: '배너 슬라이더', category: '히어로', icon: '🎠', nature: 'dynamic', description: '배너 관리에서 등록한 배너 자동 슬라이드', variants: [], defaultProps: { category: 'main' }, editableFields: [{ key: 'category', label: '배너 카테고리', type: 'select', options: [{ label: '메인', value: 'main' }, { label: '서브', value: 'sub' }] }] },
  { type: 'hero_image_slider', label: '이미지 슬라이더', category: '히어로', icon: '🎞️', nature: 'dynamic', description: '여러 이미지 자동 전환', variants: [{ id: 'full', label: '풀스크린' }, { id: 'contained', label: '컨테이너' }], defaultProps: { images: [], height: 'lg' }, editableFields: [{ key: 'images', label: '슬라이드 이미지', type: 'images', max: 10 }, { key: 'autoplayInterval', label: '자동 전환 (ms)', type: 'number' }] },
  { type: 'hero_split', label: '분할 히어로', category: '히어로', icon: '⬛', nature: 'static', description: '텍스트+이미지 분할', variants: [{ id: 'right', label: '이미지 우측' }, { id: 'left', label: '이미지 좌측' }], defaultProps: { title: '', imageUrl: '', imagePosition: 'right' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제목', type: 'text' }, { key: 'description', label: '설명', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },

  // ─── About ────────────────────────────────────
  { type: 'pastor_message', label: '담임목사 인사', category: '소개', icon: '🙏', nature: 'static', description: '담임목사 인사말', variants: [{ id: 'right', label: '사진 우측' }, { id: 'left', label: '사진 좌측' }], defaultProps: { pastorName: '', message: '', layout: 'right' }, editableFields: [{ key: 'title', label: '섹션 제목', type: 'text' }, { key: 'pastorName', label: '이름', type: 'text' }, { key: 'pastorTitle', label: '직함', type: 'text' }, { key: 'message', label: '인사말', type: 'textarea' }, { key: 'imageUrl', label: '사진', type: 'image' }] },
  { type: 'church_intro', label: '교회 소개', category: '소개', icon: '⛪', nature: 'static', description: '교회 소개 텍스트', variants: [{ id: 'with-image', label: '이미지 포함' }, { id: 'text-only', label: '텍스트만' }], defaultProps: { description: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'description', label: '소개글', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },
  { type: 'mission_vision', label: '미션/비전', category: '소개', icon: '🎯', nature: 'static', description: '미션, 비전, 핵심 가치', variants: [{ id: 'cards-4', label: '4열 카드' }, { id: 'cards-3', label: '3열 카드' }, { id: 'cards-2', label: '2열 카드' }, { id: 'list', label: '리스트' }], defaultProps: { items: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },

  // ─── Content ───────────────────────────────────
  { type: 'recent_sermons', label: '설교', category: '콘텐츠', icon: '🎤', nature: 'dynamic', description: '최근 설교 목록', variants: [{ id: 'grid-4', label: '4열' }, { id: 'grid-3', label: '3열' }, { id: 'grid-2', label: '2열' }, { id: 'list', label: '리스트' }], defaultProps: { limit: 6 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'recent_bulletins', label: '주보', category: '콘텐츠', icon: '📄', nature: 'dynamic', description: '최근 주보', variants: [{ id: 'list', label: '리스트' }, { id: 'grid-2', label: '2열' }, { id: 'grid-3', label: '3열' }, { id: 'grid-4', label: '4열' }, { id: 'grid-5', label: '5열' }, { id: 'grid-6', label: '6열' }], defaultProps: { limit: 6 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'event_grid', label: '행사', category: '콘텐츠', icon: '📅', nature: 'dynamic', description: '교회 행사', variants: [{ id: 'cards-4', label: '4열' }, { id: 'cards-3', label: '3열' }, { id: 'cards-2', label: '2열' }], defaultProps: { limit: 4 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'album_gallery', label: '앨범', category: '콘텐츠', icon: '📷', nature: 'dynamic', description: '앨범 갤러리', variants: [{ id: 'grid-4', label: '4열' }, { id: 'grid-3', label: '3열' }, { id: 'grid-2', label: '2열' }], defaultProps: { limit: 6 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'staff_grid', label: '교역자', category: '콘텐츠', icon: '👥', nature: 'dynamic', description: '교역자 카드', variants: [{ id: 'grid-4', label: '4열' }, { id: 'grid-3', label: '3열' }, { id: 'grid-2', label: '2열' }, { id: 'grouped', label: '직분별 그룹' }], defaultProps: { limit: 20 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }, { key: 'groupBy', label: '그룹 기준', type: 'select', options: [{ label: '직분 (role)', value: 'role' }, { label: '부서 (department)', value: 'department' }] }, { key: 'customGroups', label: '그룹 순서', type: 'tags' }] },
  { type: 'history_timeline', label: '교회 연혁', category: '콘텐츠', icon: '📜', nature: 'dynamic', description: '세로 타임라인', variants: [{ id: 'left', label: '좌측' }, { id: 'alternating', label: '교차' }], defaultProps: {}, editableFields: [{ key: 'title', label: '제목', type: 'text' }] },

  // ─── Text ──────────────────────────────────────
  { type: 'text_image', label: '텍스트+이미지', category: '텍스트', icon: '📝', nature: 'static', description: '텍스트와 이미지', variants: [{ id: 'right', label: '이미지 우측' }, { id: 'left', label: '이미지 좌측' }], defaultProps: { content: '', imageUrl: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'content', label: '내용', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },
  { type: 'text_only', label: '텍스트', category: '텍스트', icon: '📃', nature: 'static', description: '텍스트 전용', variants: [{ id: 'left', label: '좌측 정렬' }, { id: 'center', label: '중앙 정렬' }], defaultProps: { content: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'content', label: '내용', type: 'textarea' }] },
  { type: 'quote_block', label: '인용/성경구절', category: '텍스트', icon: '✝️', nature: 'static', description: '인용문 또는 성경 말씀', variants: [{ id: 'card', label: '카드' }, { id: 'simple', label: '심플' }, { id: 'highlight', label: '하이라이트' }], defaultProps: { quote: '' }, editableFields: [{ key: 'quote', label: '인용문', type: 'textarea' }, { key: 'source', label: '출처', type: 'text' }, { key: 'reference', label: '참조', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }] },

  // ─── Church Info ───────────────────────────────
  { type: 'worship_times', label: '예배 시간', category: '교회 정보', icon: '⏰', nature: 'static', description: '예배 시간 안내', variants: [{ id: 'table', label: '테이블' }], defaultProps: { services: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'services', label: '예배/모임 목록', type: 'services' }] },
  { type: 'map_embed', label: '약도', category: '교회 정보', icon: '📍', nature: 'static', description: 'Google Maps', variants: [{ id: 'full', label: '전체 너비' }, { id: 'with-info', label: '정보 포함' }], defaultProps: { address: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'address', label: '주소', type: 'text' }] },
  { type: 'address_info', label: '연락처', category: '교회 정보', icon: '📞', nature: 'static', description: '주소, 전화, 이메일', variants: [{ id: 'cards', label: '카드' }, { id: 'inline', label: '인라인' }], defaultProps: {}, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'address', label: '주소', type: 'text' }, { key: 'phone', label: '전화', type: 'text' }, { key: 'email', label: '이메일', type: 'text' }] },
  { type: 'visitor_welcome', label: '새가족 환영', category: '교회 정보', icon: '💝', nature: 'static', description: '새가족 환영 메시지', variants: [{ id: 'split', label: '분할' }, { id: 'centered', label: '중앙' }], defaultProps: { message: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'message', label: '환영 메시지', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },
  { type: 'first_time_guide', label: '처음 오시는 분', category: '교회 정보', icon: '🧭', nature: 'static', description: '단계별 안내', variants: [{ id: 'numbered', label: '번호' }, { id: 'icons', label: '아이콘' }], defaultProps: { steps: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }] },

  // ─── CTA ───────────────────────────────────────
  { type: 'call_to_action', label: 'CTA 배너', category: 'CTA', icon: '🔔', nature: 'static', description: '행동 유도 배너', variants: [{ id: 'centered', label: '중앙' }, { id: 'split', label: '분할' }, { id: 'banner', label: '배너' }], defaultProps: { title: '', ctaLabel: '', ctaUrl: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'description', label: '설명', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }, { key: 'ctaLabel', label: '버튼 텍스트', type: 'text' }, { key: 'ctaUrl', label: '버튼 링크', type: 'url' }] },
  { type: 'newsletter_signup', label: '뉴스레터', category: 'CTA', icon: '✉️', nature: 'static', description: '이메일 구독', variants: [{ id: 'inline', label: '인라인' }, { id: 'card', label: '카드' }], defaultProps: {}, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'description', label: '설명', type: 'text' }] },

  // ─── Layout ────────────────────────────────────
  { type: 'divider', label: '구분선', category: '레이아웃', icon: '➖', nature: 'static', description: '섹션 구분', variants: [{ id: 'line', label: '라인' }, { id: 'dots', label: '점' }, { id: 'gradient', label: '그래디언트' }], defaultProps: {}, editableFields: [] },
  { type: 'section_header', label: '섹션 헤더', category: '레이아웃', icon: '🏷️', nature: 'static', description: '제목+부제목', variants: [{ id: 'center', label: '중앙' }, { id: 'left', label: '좌측' }], defaultProps: { title: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제목', type: 'text' }] },

  // ─── Legacy ────────────────────────────────────
  { type: 'location_map', label: '지도/약도', category: '교회 정보', icon: '🗺️', nature: 'static', description: '교회 위치 지도', variants: [{ id: 'default', label: '기본' }], defaultProps: { address: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'address', label: '주소', type: 'text' }, { key: 'lat', label: '위도', type: 'number' }, { key: 'lng', label: '경도', type: 'number' }] },
  { type: 'contact_info', label: '연락처 (자동)', category: '교회 정보', icon: '📱', nature: 'static', description: '설정에서 자동 로드', variants: [], defaultProps: {}, editableFields: [] },
  { type: 'newcomer_info', label: '새가족 안내 (레거시)', category: '교회 정보', icon: '🤝', nature: 'static', description: '새가족 환영 메시지', variants: [], defaultProps: { title: '처음 오신 분들을 환영합니다' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'content', label: '내용', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },
  { type: 'worship_schedule', label: '예배안내 (레거시)', category: '교회 정보', icon: '🕐', nature: 'static', description: '예배 시간 안내', variants: [], defaultProps: { services: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }] },
  { type: 'video', label: '비디오', category: '레거시', icon: '🎬', nature: 'static', description: 'YouTube 영상', variants: [], defaultProps: {}, editableFields: [{ key: 'youtubeUrl', label: 'YouTube URL', type: 'url' }, { key: 'title', label: '제목', type: 'text' }] },
  { type: 'image_gallery', label: '이미지 갤러리', category: '레거시', icon: '🎨', nature: 'static', description: '이미지 목록', variants: [], defaultProps: { images: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'images', label: '이미지', type: 'images', max: 20 }] },
];

function getBlockDef(type: string): BlockDef | undefined {
  return BLOCK_DEFS.find((b) => b.type === type);
}

const BLOCK_CATEGORIES = (() => {
  const order = ['히어로', '소개', '콘텐츠', '텍스트', '교회 정보', 'CTA', '레이아웃'];
  const groups: { category: string; blocks: BlockDef[] }[] = [];
  for (const cat of order) {
    const blocks = BLOCK_DEFS.filter((b) => b.category === cat);
    if (blocks.length > 0) groups.push({ category: cat, blocks });
  }
  return groups;
})();

// ─── Templates ───────────────────────────────────
interface PageTemplate {
  id: string;
  name: string;
  description: string;
  sections: { blockType: string; defaultProps: Record<string, unknown>; sortOrder: number; isVisible: boolean }[];
}

const TEMPLATES: PageTemplate[] = [
  { id: 'home-classic', name: '클래식 홈페이지', description: '히어로 + 설교 + 예배안내 + 연락처', sections: [
    { blockType: 'hero_image_slider', defaultProps: { slides: [], height: 'lg' }, sortOrder: 0, isVisible: true },
    { blockType: 'pastor_message', defaultProps: { title: '담임목사 인사', pastorName: '', message: '' }, sortOrder: 1, isVisible: true },
    { blockType: 'recent_sermons', defaultProps: { title: '최근 설교', limit: 6 }, sortOrder: 2, isVisible: true },
    { blockType: 'worship_times', defaultProps: { title: '예배 안내', services: [] }, sortOrder: 3, isVisible: true },
    { blockType: 'address_info', defaultProps: { title: '연락처' }, sortOrder: 4, isVisible: true },
  ] },
  { id: 'home-modern', name: '모던 홈페이지', description: '히어로 + 미션 + 설교 + 행사', sections: [
    { blockType: 'hero_full_width', defaultProps: { title: '환영합니다', subtitle: '함께 예배하는 공동체', height: 'lg' }, sortOrder: 0, isVisible: true },
    { blockType: 'mission_vision', defaultProps: { title: '미션 & 비전', items: [] }, sortOrder: 1, isVisible: true },
    { blockType: 'recent_sermons', defaultProps: { title: '최근 설교', limit: 6 }, sortOrder: 2, isVisible: true },
    { blockType: 'event_grid', defaultProps: { title: '교회 소식', limit: 4 }, sortOrder: 3, isVisible: true },
    { blockType: 'newsletter_signup', defaultProps: { title: '소식 받기' }, sortOrder: 4, isVisible: true },
  ] },
  { id: 'about', name: '교회 소개', description: '교회 소개 + 미션/비전 + 담임목사', sections: [
    { blockType: 'section_header', defaultProps: { title: '교회 소개' }, sortOrder: 0, isVisible: true },
    { blockType: 'church_intro', defaultProps: { title: '우리 교회', description: '' }, sortOrder: 1, isVisible: true },
    { blockType: 'mission_vision', defaultProps: { title: '미션 & 비전', items: [] }, sortOrder: 2, isVisible: true },
    { blockType: 'pastor_message', defaultProps: { title: '담임목사 인사', pastorName: '', message: '' }, sortOrder: 3, isVisible: true },
  ] },
  { id: 'newcomer', name: '새가족 안내', description: '환영 + 안내 + 예배 + 약도', sections: [
    { blockType: 'hero_full_width', defaultProps: { title: '새가족을 환영합니다', height: 'md' }, sortOrder: 0, isVisible: true },
    { blockType: 'visitor_welcome', defaultProps: { title: '환영합니다', message: '' }, sortOrder: 1, isVisible: true },
    { blockType: 'first_time_guide', defaultProps: { title: '처음 오시는 분', steps: [] }, sortOrder: 2, isVisible: true },
    { blockType: 'worship_times', defaultProps: { title: '예배 시간', services: [] }, sortOrder: 3, isVisible: true },
    { blockType: 'map_embed', defaultProps: { title: '오시는 길', address: '' }, sortOrder: 4, isVisible: true },
  ] },
  { id: 'contact', name: '연락처', description: '연락처 + 약도', sections: [
    { blockType: 'address_info', defaultProps: { title: '연락처' }, sortOrder: 0, isVisible: true },
    { blockType: 'map_embed', defaultProps: { title: '오시는 길', address: '' }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'sermons', name: '설교 아카이브', description: '설교 목록', sections: [
    { blockType: 'section_header', defaultProps: { title: '설교' }, sortOrder: 0, isVisible: true },
    { blockType: 'recent_sermons', defaultProps: { limit: 12 }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'gallery', name: '갤러리', description: '앨범 갤러리', sections: [
    { blockType: 'section_header', defaultProps: { title: '갤러리' }, sortOrder: 0, isVisible: true },
    { blockType: 'album_gallery', defaultProps: { limit: 12 }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'giving', name: '헌금 안내', description: 'CTA + 안내', sections: [
    { blockType: 'hero_full_width', defaultProps: { title: '헌금 안내', height: 'sm' }, sortOrder: 0, isVisible: true },
    { blockType: 'text_only', defaultProps: { title: '헌금 방법', content: '' }, sortOrder: 1, isVisible: true },
    { blockType: 'call_to_action', defaultProps: { title: '온라인 헌금', ctaLabel: '헌금하기', ctaUrl: '' }, sortOrder: 2, isVisible: true },
  ] },
];

// ═══════════════════════════════════════════════════════════
// Undo Stack
// ═══════════════════════════════════════════════════════════
const MAX_UNDO = 20;

function useUndoStack<T>(initial: T) {
  const [state, setState] = useState(initial);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);

  const push = useCallback((next: T) => {
    undoStack.current.push(state);
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
    setState(next);
  }, [state]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev !== undefined) {
      redoStack.current.push(state);
      setState(prev);
    }
  }, [state]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next !== undefined) {
      undoStack.current.push(state);
      setState(next);
    }
  }, [state]);

  const reset = useCallback((val: T) => {
    undoStack.current = [];
    redoStack.current = [];
    setState(val);
  }, []);

  return { state, push, undo, redo, reset, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 };
}

// ═══════════════════════════════════════════════════════════
// Block Palette (left sidebar — drag source)
// ═══════════════════════════════════════════════════════════
type NatureFilter = 'all' | 'static' | 'dynamic';
type PaletteViewMode = 'list' | 'grid';

function BlockPalette({ onAdd }: { onAdd: (type: string) => void }) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<PaletteViewMode>('list');
  const [natureFilter, setNatureFilter] = useState<NatureFilter>('all');

  const filtered = useMemo(() => {
    return BLOCK_CATEGORIES.map((c) => ({
      ...c,
      blocks: c.blocks.filter((b) => {
        // Nature filter
        if (natureFilter === 'static' && b.nature !== 'static') return false;
        if (natureFilter === 'dynamic' && b.nature !== 'dynamic') return false;
        // Search filter
        if (search) {
          const q = search.toLowerCase();
          return b.label.includes(q) || b.description.includes(q) || b.type.includes(q);
        }
        return true;
      }),
    })).filter((c) => c.blocks.length > 0);
  }, [search, natureFilter]);

  return (
    <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Search + View Mode Toggle */}
      <div className="px-3 py-2 border-b space-y-1.5">
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="블록 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs pr-6"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm leading-none"
                title="검색 초기화"
              >
                &times;
              </button>
            )}
          </div>
          <div className="flex border rounded-lg overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 text-xs transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              title="리스트 보기"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 text-xs transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              title="그리드 보기"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
            </button>
          </div>
        </div>
        {/* Nature filter */}
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {([['all', '전체'], ['static', '정적'], ['dynamic', '동적']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setNatureFilter(val)}
              className={`flex-1 text-[10px] py-1 rounded-md transition-colors font-medium ${
                natureFilter === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {val === 'static' && '📄 '}{val === 'dynamic' && '⚡ '}{label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map((cat) => (
          <div key={cat.category} className="mb-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">{cat.category}</p>
            {viewMode === 'list' ? (
              /* List view */
              <div className="space-y-0.5">
                {cat.blocks.map((block) => (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-block-type', block.type);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={(e) => {
                      if (e.detail === 1) onAdd(block.type);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors text-left group"
                    title={block.description}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="text-base">{block.icon}</span>
                    <span className="truncate font-medium text-gray-700 group-hover:text-blue-700 flex-1">{block.label}</span>
                    <span className="text-[10px] flex-shrink-0" title={block.nature === 'dynamic' ? '동적 블록' : '정적 블록'}>
                      {block.nature === 'dynamic' ? '⚡' : '📄'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Grid view */
              <div className="grid grid-cols-2 gap-1">
                {cat.blocks.map((block) => (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-block-type', block.type);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={(e) => {
                      if (e.detail === 1) onAdd(block.type);
                    }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors text-center group border border-gray-100 hover:border-blue-200"
                    title={block.description}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="text-xl">{block.icon}</span>
                    <span className="text-[10px] font-medium text-gray-700 group-hover:text-blue-700 leading-tight">{block.label}</span>
                    <span className="text-[9px] flex-shrink-0" title={block.nature === 'dynamic' ? '동적 블록' : '정적 블록'}>
                      {block.nature === 'dynamic' ? '⚡' : '📄'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">검색 결과가 없습니다</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Image Library Modal
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// Tag Reorder List (comma-separated string with up/down/add/remove)
// ═══════════════════════════════════════════════════════════
function TagReorderList({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [newTag, setNewTag] = useState('');
  const tags = value.split(',').map((s) => s.trim()).filter(Boolean);

  const update = (newTags: string[]) => onChange(newTags.join(','));

  const handleAdd = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    update([...tags, newTag.trim()]);
    setNewTag('');
  };

  const handleRemove = (index: number) => {
    update(tags.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= tags.length) return;
    const newTags = [...tags];
    [newTags[index], newTags[swapIdx]] = [newTags[swapIdx], newTags[index]];
    update(newTags);
  };

  return (
    <div className="space-y-1.5">
      {tags.length > 0 && (
        <div className="space-y-1">
          {tags.map((tag, i) => (
            <div key={`${tag}-${i}`} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
              <span className="text-[10px] text-gray-400 w-4">{i + 1}</span>
              <span className="flex-1 text-xs font-medium">{tag}</span>
              <button
                type="button"
                onClick={() => handleMove(i, 'up')}
                disabled={i === 0}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-1"
              >▲</button>
              <button
                type="button"
                onClick={() => handleMove(i, 'down')}
                disabled={i === tags.length - 1}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-1"
              >▼</button>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-red-400 hover:text-red-600 text-xs px-1"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="그룹명 입력 (예: 담임목사)"
          className="flex-1 border rounded-lg px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newTag.trim()}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >추가</button>
      </div>
      {tags.length === 0 && (
        <p className="text-[10px] text-gray-400">그룹을 추가하지 않으면 자동으로 분류됩니다</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Service List Editor (worship schedule: name/time/location)
// ═══════════════════════════════════════════════════════════
function ServiceListEditor({ value, onChange }: { value: { name: string; time: string; location: string }[]; onChange: (val: { name: string; time: string; location: string }[]) => void }) {
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLoc, setNewLoc] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onChange([...value, { name: newName.trim(), time: newTime.trim(), location: newLoc.trim() }]);
    setNewName(''); setNewTime(''); setNewLoc('');
  };

  const handleRemove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const handleMove = (index: number, dir: 'up' | 'down') => {
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= value.length) return;
    const arr = [...value];
    [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
    onChange(arr);
  };

  const handleUpdate = (index: number, field: 'name' | 'time' | 'location', val: string) => {
    const arr = [...value];
    arr[index] = { ...arr[index], [field]: val };
    onChange(arr);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_60px] bg-gray-100 text-[10px] font-medium text-gray-500 px-2 py-1">
            <span>구분</span><span>시간</span><span>장소</span><span></span>
          </div>
          {value.map((svc, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_80px_60px] items-center px-2 py-1 border-t gap-1">
              <input value={svc.name} onChange={(e) => handleUpdate(i, 'name', e.target.value)} className="border rounded px-1 py-0.5 text-xs w-full" />
              <input value={svc.time} onChange={(e) => handleUpdate(i, 'time', e.target.value)} className="border rounded px-1 py-0.5 text-xs w-full" />
              <input value={svc.location} onChange={(e) => handleUpdate(i, 'location', e.target.value)} className="border rounded px-1 py-0.5 text-xs w-full" />
              <div className="flex gap-0.5">
                <button type="button" onClick={() => handleMove(i, 'up')} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px]">▲</button>
                <button type="button" onClick={() => handleMove(i, 'down')} disabled={i === value.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px]">▼</button>
                <button type="button" onClick={() => handleRemove(i)} className="text-red-400 hover:text-red-600 text-[10px]">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[1fr_80px_80px] gap-1">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="구분 (예: 주일 1부 예배)" className="border rounded px-2 py-1 text-xs" />
        <input value={newTime} onChange={(e) => setNewTime(e.target.value)} placeholder="시간" className="border rounded px-2 py-1 text-xs" />
        <input value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder="장소" className="border rounded px-2 py-1 text-xs" />
      </div>
      <button type="button" onClick={handleAdd} disabled={!newName.trim()} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">추가</button>
    </div>
  );
}

function ImageLibraryModal({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState(IMAGE_LIBRARY[0]?.category || '');
  const activeImages = IMAGE_LIBRARY.find((c) => c.category === activeCategory)?.images || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-bold">이미지 라이브러리</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {/* Category tabs */}
        <div className="flex gap-1 px-5 py-2 border-b overflow-x-auto">
          {IMAGE_LIBRARY.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(cat.category)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                activeCategory === cat.category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>
        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {activeImages.map((img) => (
              <button
                key={img.url}
                onClick={() => onSelect(img.url)}
                className="group relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all"
              >
                <img src={`${img.url}&w=400&q=60`} alt={img.label} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                  <span className="w-full text-white text-xs py-1.5 px-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {img.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Section Card (draggable + inline editable)
// ═══════════════════════════════════════════════════════════
function SectionCard({
  section,
  index,
  totalSections,
  isEditing,
  localProps,
  onToggleEdit,
  onPropsChange,
  onSave,
  onMove,
  onToggleVisibility,
  onDelete,
  onDuplicate,
  onVariantChange,
  onUploadImage,
  onGenerateText,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverIdx,
}: {
  section: PageSection;
  index: number;
  totalSections: number;
  isEditing: boolean;
  localProps: Record<string, unknown>;
  onToggleEdit: () => void;
  onPropsChange: (props: Record<string, unknown>) => void;
  onSave: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onVariantChange: (variant: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  onGenerateText: (prompt: string, context?: string) => Promise<string>;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragOverIdx: number | null;
}) {
  const def = getBlockDef(section.blockType);
  const props = localProps;
  const set = (key: string, value: unknown) => onPropsChange({ ...props, [key]: value });
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const { showToast } = useToast();
  const isDynamic = def?.nature === 'dynamic';

  const handleAiText = async (fieldKey: string, fieldLabel: string) => {
    setAiLoading(fieldKey);
    try {
      const blockLabel = def?.label || section.blockType;
      const currentValue = (props[fieldKey] as string) || '';
      const prompt = currentValue
        ? `"${blockLabel}" 블록의 "${fieldLabel}" 내용을 개선해주세요. 현재 내용: "${currentValue}". 개선된 내용만 출력하세요.`
        : `교회 웹사이트의 "${blockLabel}" 블록에 들어갈 "${fieldLabel}" 내용을 작성해주세요. 내용만 출력하세요.`;
      const text = await onGenerateText(prompt, `블록: ${blockLabel}, 필드: ${fieldLabel}`);
      set(fieldKey, text.trim());
    } catch (err) {
      showToast('error', `AI 텍스트 생성 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setAiLoading(null);
    }
  };

  const [imageLibraryField, setImageLibraryField] = useState<string | null>(null);

  // Find first image URL in props for thumbnail preview
  const thumbnailUrl = useMemo(() => {
    const imageFields = ['backgroundImageUrl', 'imageUrl', 'imageurl'];
    for (const key of imageFields) {
      if (props[key] && typeof props[key] === 'string') return props[key] as string;
    }
    // Check images array
    if (Array.isArray(props.images) && props.images.length > 0) {
      const first = props.images[0];
      if (typeof first === 'string') return first;
    }
    return null;
  }, [props]);

  // Expand when editing starts
  useEffect(() => {
    if (isEditing) setCollapsed(false);
  }, [isEditing]);

  const handleHeaderClick = () => {
    if (!isEditing) setCollapsed((c) => !c);
  };

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-all ${
        !section.isVisible ? 'opacity-60' : ''
      } ${isEditing ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'} ${
        dragOverIdx === index ? 'border-t-4 border-t-blue-500' : ''
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-1.5 py-2 bg-gray-50/80 border-b cursor-pointer select-none group/header"
        onClick={handleHeaderClick}
      >
        {/* Drag handle */}
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart(e);
          }}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 text-gray-300 hover:text-gray-500 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="드래그하여 이동"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="10" r="1.5" /><circle cx="15" cy="10" r="1.5" />
            <circle cx="9" cy="15" r="1.5" /><circle cx="15" cy="15" r="1.5" />
            <circle cx="9" cy="20" r="1.5" /><circle cx="15" cy="20" r="1.5" />
          </svg>
        </div>

        <span className="text-lg flex-shrink-0">{def?.icon || '?'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-medium truncate ${!section.isVisible ? 'line-through text-gray-400' : ''}`}>
              {def?.label || section.blockType}
            </span>
            {isDynamic && (
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex-shrink-0">
                ⚡ 자동 로드
              </span>
            )}
            {!section.isVisible && (
              <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium flex-shrink-0">
                숨김
              </span>
            )}
          </div>
          {/* Inline preview when collapsed */}
          {collapsed && !isEditing && (
            <div className="flex items-center gap-2 mt-0.5">
              {props.title && (
                <span className="text-[11px] text-gray-400 truncate max-w-[160px]">{props.title as string}</span>
              )}
              {thumbnailUrl && (
                <img
                  src={`${thumbnailUrl}${thumbnailUrl.includes('?') ? '&' : '?'}w=40&h=24&fit=crop`}
                  alt=""
                  className="w-8 h-5 object-cover rounded flex-shrink-0"
                />
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onMove('up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors disabled:opacity-20" title="위로">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={() => onMove('down')} disabled={index === totalSections - 1} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors disabled:opacity-20" title="아래로">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button onClick={onToggleVisibility} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors" title={section.isVisible ? '숨기기' : '표시'}>
            {section.isVisible ? '👁️' : '👁️‍🗨️'}
          </button>
          <button onClick={onDuplicate} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="복제">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button onClick={onToggleEdit} className={`p-1 rounded transition-colors ${isEditing ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'}`} title="편집">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="삭제">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Expanded content (variants + preview) - shown when not collapsed and not editing */}
      {!collapsed && !isEditing && (
        <div className="px-3 py-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Title preview */}
          {props.title && (
            <p className="text-xs text-gray-500 truncate">{props.title as string}</p>
          )}
          {/* Variant selector */}
          {def?.variants && def.variants.length > 0 && (
            <div className="flex gap-1">
              {def.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onVariantChange(v.id)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    (props.variant || def.variants[0]?.id) === v.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isEditing ? '2000px' : '0px',
          opacity: isEditing ? 1 : 0,
        }}
      >
        {isEditing && def && (
          <div className="p-3 space-y-2 border-t bg-white">
            {/* Variant selector in edit mode */}
            {def.variants && def.variants.length > 0 && (
              <div className="flex gap-1 pb-1">
                {def.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onVariantChange(v.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      (props.variant || def.variants[0]?.id) === v.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
            {def.editableFields.map((field) => (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-medium text-gray-500">{field.label}</label>
                  {(field.type === 'text' || field.type === 'textarea') && (
                    <button
                      type="button"
                      onClick={() => handleAiText(field.key, field.label)}
                      disabled={aiLoading === field.key}
                      className="flex items-center gap-0.5 text-[10px] text-purple-600 hover:text-purple-800 disabled:opacity-50"
                      title="AI로 생성"
                    >
                      {aiLoading === field.key ? <span className="inline-block w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" /> : <span>✨</span>}
                      AI
                    </button>
                  )}
                  {field.type === 'image' && (
                    <button
                      type="button"
                      onClick={() => setImageLibraryField(field.key)}
                      className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800"
                      title="이미지 라이브러리"
                    >
                      <span>🖼️</span> 라이브러리
                    </button>
                  )}
                </div>
                {field.type === 'textarea' ? (
                  <textarea
                    value={(props[field.key] as string) || ''}
                    onChange={(e) => set(field.key, e.target.value)}
                    rows={3}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs resize-none"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={(props[field.key] as string) || ''}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={(props[field.key] as number) || 0}
                    onChange={(e) => set(field.key, parseInt(e.target.value) || 0)}
                    className="w-24 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                ) : field.type === 'image' ? (
                  <ImageUpload
                    value={(props[field.key] as string) || ''}
                    onChange={(url) => set(field.key, url)}
                    onUpload={onUploadImage}
                    aspectRatio="16/9"
                  />
                ) : field.type === 'images' ? (
                  <MultiImageUpload
                    value={(props[field.key] as string[]) || []}
                    onChange={(urls) => set(field.key, urls)}
                    onUpload={onUploadImage}
                    max={field.max || 10}
                  />
                ) : field.type === 'tags' ? (
                  <TagReorderList
                    value={(props[field.key] as string) || ''}
                    onChange={(val) => set(field.key, val)}
                  />
                ) : field.type === 'services' ? (
                  <ServiceListEditor
                    value={(props[field.key] as { name: string; time: string; location: string }[]) || []}
                    onChange={(val) => set(field.key, val)}
                  />
                ) : (
                  <input
                    type="text"
                    value={(props[field.key] as string) || ''}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                )}
              </div>
            ))}
            {def.editableFields.length === 0 && (
              <p className="text-xs text-gray-400">이 블록은 기본 설정으로 작동합니다.</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={onSave} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">저장</button>
              <button onClick={onToggleEdit} className="px-3 py-1 bg-gray-100 text-xs rounded-lg hover:bg-gray-200 transition-colors">취소</button>
            </div>
          </div>
        )}
      </div>

      {/* Image Library Modal */}
      {imageLibraryField && (
        <ImageLibraryModal
          onSelect={(url) => {
            set(imageLibraryField, url);
            setImageLibraryField(null);
          }}
          onClose={() => setImageLibraryField(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Template Gallery Modal
// ═══════════════════════════════════════════════════════════
function TemplateGallery({ onSelect, onClose }: { onSelect: (t: PageTemplate) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-bold">템플릿으로 시작하기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="text-left border rounded-xl p-3 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg mb-2 flex items-center justify-center">
                  <span className="text-xs text-gray-400">{t.sections.length}개 섹션</span>
                </div>
                <h4 className="font-bold text-sm group-hover:text-blue-600">{t.name}</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Page Form
// ═══════════════════════════════════════════════════════════
interface PageFormData {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  isHome: boolean;
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function PageEditor() {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionProps, setSectionProps] = useState<Record<string, Record<string, unknown>>>({});
  const [showPageForm, setShowPageForm] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const { showToast } = useToast();
  const { data: pages, isLoading: pagesLoading } = usePages();
  const { data: sections } = usePageSections(selectedPageId || '');
  const queryClient = useQueryClient();
  const apiClient = useDWChurchClient();
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PageFormData>();

  const selectedPage = pages?.find((p) => p.id === selectedPageId) ?? null;
  const sortedSections = [...(sections || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  // Keyboard shortcut: Ctrl+Z undo (TODO: connect to undo stack when sections are local)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        // placeholder for future undo
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Handlers ────────────────────────────────────
  const handleSelectPage = (page: Page) => {
    setSelectedPageId(page.id);
    setEditingSectionId(null);
    setSectionProps({});
  };

  const handleCreatePage = () => {
    setSelectedPageId(null);
    reset({ title: '', slug: '', status: 'draft', isHome: false });
    setShowPageForm(true);
  };

  const handleEditPage = () => {
    if (!selectedPage) return;
    reset({ title: selectedPage.title, slug: selectedPage.slug, status: selectedPage.status, isHome: selectedPage.isHome });
    setShowPageForm(true);
  };

  const onSubmitPage = (data: PageFormData) => {
    if (selectedPage) {
      updatePage.mutate(
        { id: selectedPage.id, data: { ...data, sortOrder: selectedPage.sortOrder } },
        { onSuccess: () => { setShowPageForm(false); showToast('success', '저장되었습니다.'); } },
      );
    } else {
      createPage.mutate(
        { ...data, sortOrder: (pages?.length || 0) },
        { onSuccess: (newPage) => { setShowPageForm(false); setSelectedPageId(newPage.id); showToast('success', '페이지가 생성되었습니다.'); } },
      );
    }
  };

  const handleDeletePage = () => {
    if (!selectedPage || !window.confirm(`"${selectedPage.title}" 페이지를 삭제하시겠습니까?`)) return;
    deletePage.mutate(selectedPage.id, { onSuccess: () => setSelectedPageId(null) });
  };

  const addingRef = useRef(false);
  const handleAddBlock = (blockType: string, atIndex?: number) => {
    if (!selectedPageId || addingRef.current) return;
    addingRef.current = true;
    setTimeout(() => { addingRef.current = false; }, 1000);
    const def = getBlockDef(blockType);
    const insertIdx = atIndex ?? sortedSections.length;
    createSection.mutate({
      pageId: selectedPageId,
      data: {
        blockType: blockType as BlockType,
        props: { ...def?.defaultProps, variant: def?.variants[0]?.id },
        sortOrder: insertIdx,
        isVisible: true,
      },
    });
  };

  const handleDuplicateSection = (section: PageSection) => {
    if (!selectedPageId || addingRef.current) return;
    addingRef.current = true;
    setTimeout(() => { addingRef.current = false; }, 1000);
    const currentProps = sectionProps[section.id] ?? section.props;
    createSection.mutate({
      pageId: selectedPageId,
      data: {
        blockType: section.blockType as BlockType,
        props: { ...currentProps },
        sortOrder: section.sortOrder + 1,
        isVisible: section.isVisible,
      },
    });
    showToast('success', '섹션이 복제되었습니다.');
  };

  const handleApplyTemplate = async (template: PageTemplate) => {
    if (!selectedPageId || !apiClient) return;
    setShowTemplateGallery(false);
    const baseOrder = sortedSections.length;
    let successCount = 0;
    for (let i = 0; i < template.sections.length; i++) {
      const sec = template.sections[i];
      try {
        await apiClient.createSection(selectedPageId, {
          blockType: sec.blockType as BlockType,
          props: sec.defaultProps,
          sortOrder: baseOrder + i,
          isVisible: sec.isVisible,
        });
        successCount++;
      } catch {
        // Continue with remaining sections
      }
    }
    queryClient.invalidateQueries({ queryKey: ['pages', 'sections', selectedPageId] });
    if (successCount === template.sections.length) {
      showToast('success', `"${template.name}" 템플릿이 적용되었습니다. (${successCount}개 블록)`);
    } else {
      showToast('error', `${successCount}/${template.sections.length}개 블록만 생성되었습니다.`);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!selectedPageId || !sections) return;
    const sorted = [...sortedSections];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[index], sorted[swapIdx]] = [sorted[swapIdx], sorted[index]];
    reorderSections.mutate({ pageId: selectedPageId, orderedIds: sorted.map((s) => s.id) });
  };

  const handleSaveSectionProps = (section: PageSection) => {
    if (!selectedPageId) return;
    const props = sectionProps[section.id] ?? section.props;
    updateSection.mutate({ pageId: selectedPageId, sectionId: section.id, data: { props } });
    setEditingSectionId(null);
    showToast('success', '저장되었습니다.');
  };

  const handleToggleVisibility = (section: PageSection) => {
    if (!selectedPageId) return;
    updateSection.mutate({ pageId: selectedPageId, sectionId: section.id, data: { isVisible: !section.isVisible } });
  };

  const handleDeleteSection = (section: PageSection) => {
    if (!selectedPageId || !window.confirm('이 섹션을 삭제하시겠습니까?')) return;
    if (editingSectionId === section.id) setEditingSectionId(null);
    const queryKey = ['pages', 'sections', selectedPageId];
    const prev = queryClient.getQueryData<PageSection[]>(queryKey);
    if (prev) {
      queryClient.setQueryData(queryKey, prev.filter((s) => s.id !== section.id));
    }
    deleteSection.mutate(
      { pageId: selectedPageId, sectionId: section.id },
      { onError: () => { if (prev) queryClient.setQueryData(queryKey, prev); } },
    );
  };

  const handleVariantChange = (section: PageSection, variant: string) => {
    if (!selectedPageId) return;
    const currentProps = sectionProps[section.id] ?? section.props;
    const newProps = { ...currentProps, variant };
    setSectionProps((prev) => ({ ...prev, [section.id]: newProps }));
    updateSection.mutate({ pageId: selectedPageId, sectionId: section.id, data: { props: newProps } });
  };

  // ─── Drag & Drop (section reorder + palette drop) ──
  const handleSectionDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('application/x-section-idx', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-block-type') ? 'copy' : 'move';
    setDragOverIdx(index);
  };

  const handleSectionDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    setDragOverIdx(null);

    const blockType = e.dataTransfer.getData('application/x-block-type');
    if (blockType) {
      handleAddBlock(blockType, targetIdx);
      return;
    }

    const fromIdxStr = e.dataTransfer.getData('application/x-section-idx');
    if (!fromIdxStr || !selectedPageId) return;
    const fromIdx = parseInt(fromIdxStr);
    if (fromIdx === targetIdx) return;

    const sorted = [...sortedSections];
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(targetIdx, 0, moved);
    reorderSections.mutate({ pageId: selectedPageId, orderedIds: sorted.map((s) => s.id) });
  };

  const handleBoardDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-block-type')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOverIdx(sortedSections.length);
    }
  };

  const handleBoardDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIdx(null);
    const blockType = e.dataTransfer.getData('application/x-block-type');
    if (blockType) handleAddBlock(blockType);
  };

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════
  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Block Palette */}
      <BlockPalette onAdd={handleAddBlock} />

      {/* Page List */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
          <h3 className="text-xs font-semibold">페이지</h3>
          <button onClick={handleCreatePage} className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">+ 추가</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pagesLoading && <p className="p-3 text-xs text-gray-500">로딩 중...</p>}
          {pages?.sort((a, b) => a.sortOrder - b.sortOrder).map((page) => (
            <button
              key={page.id}
              onClick={() => handleSelectPage(page)}
              className={`w-full text-left px-3 py-2 border-b text-xs hover:bg-gray-50 ${
                selectedPageId === page.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
              }`}
            >
              <div className="font-medium truncate">{page.title}</div>
              <div className="text-[10px] text-gray-400">
                /{page.slug}
                {page.isHome && <span className="ml-1 text-blue-600">(홈)</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Board */}
      <div className="flex-1 overflow-y-auto bg-gray-100/50 p-5"
        onDragOver={handleBoardDragOver}
        onDrop={handleBoardDrop}
        onDragLeave={() => setDragOverIdx(null)}
      >
        {!selectedPage ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">페이지를 선택하세요</p>
                <p className="text-xs text-gray-400 mt-1">왼쪽에서 페이지를 선택하거나 새로 만드세요</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Page header */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-5 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedPage.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-400">/{selectedPage.slug}</p>
                  {selectedPage.isHome && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">홈</span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    selectedPage.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {selectedPage.status === 'published' ? '공개' : '임시저장'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setShowTemplateGallery(true)} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
                  템플릿
                </button>
                <button onClick={handleEditPage} className="text-xs px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                  수정
                </button>
                <button onClick={handleDeletePage} className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium">
                  삭제
                </button>
              </div>
            </div>

            {/* Sections */}
            {sortedSections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                totalSections={sortedSections.length}
                isEditing={editingSectionId === section.id}
                localProps={sectionProps[section.id] ?? section.props}
                onToggleEdit={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                onPropsChange={(p) => setSectionProps((prev) => ({ ...prev, [section.id]: p }))}
                onSave={() => handleSaveSectionProps(section)}
                onMove={(dir) => handleMoveSection(index, dir)}
                onToggleVisibility={() => handleToggleVisibility(section)}
                onDelete={() => handleDeleteSection(section)}
                onDuplicate={() => handleDuplicateSection(section)}
                onVariantChange={(v) => handleVariantChange(section, v)}
                onUploadImage={async (file: File) => {
                  const res = await apiClient.uploadFile(file);
                  return res.url;
                }}
                onGenerateText={async (prompt: string, context?: string) => {
                  const res = await apiClient.generateText(prompt, context);
                  return res.text;
                }}
                onDragStart={(e) => handleSectionDragStart(e, index)}
                onDragOver={(e) => handleSectionDragOver(e, index)}
                onDrop={(e) => handleSectionDrop(e, index)}
                dragOverIdx={dragOverIdx}
              />
            ))}

            {/* Drop zone at bottom */}
            <div
              className={`border-2 border-dashed rounded-xl py-8 text-center text-xs transition-all ${
                dragOverIdx === sortedSections.length
                  ? 'border-blue-400 bg-blue-50/80 text-blue-600 animate-pulse'
                  : 'border-gray-300 text-gray-400 hover:border-gray-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverIdx(sortedSections.length); }}
              onDrop={(e) => { handleBoardDrop(e); }}
            >
              {sortedSections.length === 0 ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p>왼쪽 팔레트에서 블록을 드래그하거나 클릭하세요</p>
                  <p className="text-gray-300">또는 상단의 "템플릿" 버튼으로 시작하세요</p>
                </div>
              ) : (
                <p>블록을 여기에 드롭하여 추가</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template Gallery */}
      {showTemplateGallery && (
        <TemplateGallery onSelect={handleApplyTemplate} onClose={() => setShowTemplateGallery(false)} />
      )}

      {/* Page Form Modal */}
      {showPageForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl w-full max-w-md p-5">
            <h3 className="text-base font-bold mb-3">{selectedPage ? '페이지 수정' : '새 페이지'}</h3>
            <form onSubmit={handleSubmit(onSubmitPage)} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">제목</label>
                <input {...register('title', { required: '제목을 입력하세요' })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                {errors.title && <p className="text-red-500 text-xs mt-0.5">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Slug</label>
                <input {...register('slug', { required: 'slug를 입력하세요' })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="about-us" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">상태</label>
                  <select {...register('status')} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="draft">임시저장</option>
                    <option value="published">공개</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" {...register('isHome')} className="rounded" />
                    홈 페이지
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={createPage.isPending || updatePage.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">저장</button>
                <button type="button" onClick={() => setShowPageForm(false)} className="px-4 py-2 bg-gray-100 text-sm rounded-lg hover:bg-gray-200">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
