import { useState, useMemo } from 'react';
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
// ─── Inline block/template metadata (from @dw-church/design-blocks) ──
// Avoids external dependency that breaks Vercel builds.
// When design-blocks is published to npm, replace with:
//   import { ... } from '@dw-church/design-blocks';

type PropFieldType = 'string' | 'text' | 'number' | 'boolean' | 'select' | 'image' | 'url' | 'color' | 'array' | 'rich_text';

interface PropSchema {
  key: string;
  type: PropFieldType;
  label: string;
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  options?: { label: string; value: string }[];
  arrayItemSchema?: PropSchema[];
  min?: number;
  max?: number;
  step?: number;
}

interface BlockMeta {
  type: string;
  label: string;
  category: string;
  icon: string;
  description: string;
  defaultProps: Record<string, unknown>;
  propsSchema: PropSchema[];
}

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: { blockType: string; defaultProps: Record<string, unknown>; sortOrder: number; isVisible: boolean }[];
}

const BLOCK_REGISTRY: BlockMeta[] = [
  // Hero
  { type: 'hero_full_width', label: '풀 와이드 히어로', category: '히어로', icon: 'H', description: '전체 너비 배경 이미지 히어로', defaultProps: { title: '환영합니다', height: 'lg' }, propsSchema: [{ key: 'title', type: 'string', label: '제목', required: true }, { key: 'subtitle', type: 'string', label: '부제목' }, { key: 'backgroundImageUrl', type: 'image', label: '배경 이미지' }, { key: 'ctaLabel', type: 'string', label: 'CTA 버튼' }, { key: 'ctaUrl', type: 'url', label: 'CTA 링크' }, { key: 'height', type: 'select', label: '높이', options: [{ label: '작게', value: 'sm' }, { label: '보통', value: 'md' }, { label: '크게', value: 'lg' }, { label: '전체', value: 'full' }] }] },
  { type: 'hero_image_slider', label: '이미지 슬라이더', category: '히어로', icon: 'S', description: '여러 이미지 자동 전환', defaultProps: { slides: [], height: 'lg' }, propsSchema: [{ key: 'autoplayInterval', type: 'number', label: '자동 전환 (ms)', defaultValue: 5000 }] },
  { type: 'hero_split', label: '분할 히어로', category: '히어로', icon: 'SP', description: '텍스트+이미지 분할', defaultProps: { title: '', imageUrl: '' }, propsSchema: [{ key: 'title', type: 'string', label: '제목', required: true }, { key: 'subtitle', type: 'string', label: '부제목' }, { key: 'description', type: 'text', label: '설명' }, { key: 'imageUrl', type: 'image', label: '이미지', required: true }, { key: 'imagePosition', type: 'select', label: '이미지 위치', options: [{ label: '오른쪽', value: 'right' }, { label: '왼쪽', value: 'left' }] }] },
  // About
  { type: 'pastor_message', label: '담임목사 인사', category: '소개', icon: 'PM', description: '담임목사 인사말', defaultProps: { pastorName: '', message: '' }, propsSchema: [{ key: 'title', type: 'string', label: '섹션 제목' }, { key: 'pastorName', type: 'string', label: '이름', required: true }, { key: 'pastorTitle', type: 'string', label: '직함' }, { key: 'message', type: 'text', label: '인사말', required: true }, { key: 'imageUrl', type: 'image', label: '사진' }] },
  { type: 'church_intro', label: '교회 소개', category: '소개', icon: 'CI', description: '교회 소개 텍스트', defaultProps: { description: '' }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'description', type: 'text', label: '소개글', required: true }, { key: 'imageUrl', type: 'image', label: '이미지' }] },
  { type: 'mission_vision', label: '미션/비전', category: '소개', icon: 'MV', description: '미션, 비전, 핵심 가치', defaultProps: { items: [] }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'items', type: 'array', label: '항목', arrayItemSchema: [{ key: 'icon', type: 'string', label: '아이콘' }, { key: 'title', type: 'string', label: '제목', required: true }, { key: 'description', type: 'text', label: '설명', required: true }] }] },
  // Content
  { type: 'recent_sermons', label: '설교 그리드', category: '콘텐츠', icon: 'RS', description: '최근 설교', defaultProps: { limit: 6 }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'limit', type: 'number', label: '표시 개수', defaultValue: 6, min: 1, max: 50 }] },
  { type: 'recent_bulletins', label: '주보 목록', category: '콘텐츠', icon: 'RB', description: '최근 주보', defaultProps: { limit: 6 }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'limit', type: 'number', label: '표시 개수', defaultValue: 6, min: 1, max: 50 }] },
  { type: 'event_grid', label: '행사 카드', category: '콘텐츠', icon: 'EG', description: '교회 행사', defaultProps: { limit: 4 }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'limit', type: 'number', label: '표시 개수', defaultValue: 4, min: 1, max: 50 }] },
  { type: 'album_gallery', label: '앨범 갤러리', category: '콘텐츠', icon: 'AG', description: '앨범 그리드', defaultProps: { limit: 6 }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'limit', type: 'number', label: '표시 개수', defaultValue: 6, min: 1, max: 50 }] },
  { type: 'staff_grid', label: '교역자 그리드', category: '콘텐츠', icon: 'SG', description: '교역자 카드', defaultProps: { limit: 8 }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'limit', type: 'number', label: '표시 개수', defaultValue: 8, min: 1, max: 50 }] },
  { type: 'history_timeline', label: '교회 연혁', category: '콘텐츠', icon: 'HT', description: '세로 타임라인', defaultProps: {}, propsSchema: [{ key: 'title', type: 'string', label: '제목' }] },
  // Text
  { type: 'text_image', label: '텍스트+이미지', category: '텍스트', icon: 'TI', description: '텍스트와 이미지 좌우 배치', defaultProps: { content: '', imageUrl: '' }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'content', type: 'text', label: '내용', required: true }, { key: 'imageUrl', type: 'image', label: '이미지', required: true }, { key: 'imagePosition', type: 'select', label: '이미지 위치', options: [{ label: '오른쪽', value: 'right' }, { label: '왼쪽', value: 'left' }] }] },
  { type: 'text_only', label: '텍스트', category: '텍스트', icon: 'T', description: '텍스트 전용', defaultProps: { content: '' }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'content', type: 'text', label: '내용', required: true }] },
  { type: 'quote_block', label: '인용/성경구절', category: '텍스트', icon: 'Q', description: '인용문 또는 성경 말씀', defaultProps: { quote: '' }, propsSchema: [{ key: 'quote', type: 'text', label: '인용문', required: true }, { key: 'source', type: 'string', label: '출처' }, { key: 'reference', type: 'string', label: '참조' }, { key: 'style', type: 'select', label: '스타일', options: [{ label: '카드', value: 'card' }, { label: '심플', value: 'simple' }, { label: '하이라이트', value: 'highlight' }] }] },
  // Schedule/Contact
  { type: 'worship_times', label: '예배 시간', category: '교회 정보', icon: 'WT', description: '예배 시간 안내', defaultProps: { services: [] }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'services', type: 'array', label: '예배', arrayItemSchema: [{ key: 'name', type: 'string', label: '예배명', required: true }, { key: 'day', type: 'string', label: '요일', required: true }, { key: 'time', type: 'string', label: '시간', required: true }, { key: 'location', type: 'string', label: '장소' }] }, { key: 'layout', type: 'select', label: '레이아웃', options: [{ label: '카드', value: 'cards' }, { label: '테이블', value: 'table' }] }] },
  { type: 'map_embed', label: '약도', category: '교회 정보', icon: 'M', description: 'Google Maps 임베드', defaultProps: { address: '' }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'address', type: 'string', label: '주소', required: true }, { key: 'embedUrl', type: 'url', label: '임베드 URL' }] },
  { type: 'address_info', label: '연락처 정보', category: '교회 정보', icon: 'AI', description: '주소, 전화, 이메일', defaultProps: {}, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'address', type: 'string', label: '주소' }, { key: 'phone', type: 'string', label: '전화' }, { key: 'email', type: 'string', label: '이메일' }] },
  { type: 'visitor_welcome', label: '새가족 환영', category: '교회 정보', icon: 'VW', description: '새가족 환영 메시지', defaultProps: { message: '' }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'message', type: 'text', label: '환영 메시지', required: true }, { key: 'imageUrl', type: 'image', label: '이미지' }] },
  { type: 'first_time_guide', label: '처음 오시는 분', category: '교회 정보', icon: 'FG', description: '단계별 안내', defaultProps: { steps: [] }, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'steps', type: 'array', label: '단계', arrayItemSchema: [{ key: 'title', type: 'string', label: '제목', required: true }, { key: 'description', type: 'text', label: '설명', required: true }] }] },
  // CTA
  { type: 'call_to_action', label: 'CTA 배너', category: 'CTA', icon: 'CTA', description: '행동 유도 배너', defaultProps: { title: '', ctaLabel: '', ctaUrl: '' }, propsSchema: [{ key: 'title', type: 'string', label: '제목', required: true }, { key: 'description', type: 'string', label: '설명' }, { key: 'ctaLabel', type: 'string', label: '버튼 텍스트', required: true }, { key: 'ctaUrl', type: 'url', label: '버튼 링크', required: true }, { key: 'backgroundColor', type: 'color', label: '배경색' }] },
  { type: 'newsletter_signup', label: '뉴스레터 구독', category: 'CTA', icon: 'NL', description: '이메일 구독 폼', defaultProps: {}, propsSchema: [{ key: 'title', type: 'string', label: '제목' }, { key: 'description', type: 'string', label: '설명' }] },
  // Layout
  { type: 'hero_banner', label: '히어로 배너 (레거시)', category: '레거시', icon: 'B', description: '기존 히어로 배너', defaultProps: {}, propsSchema: [] },
  { type: 'divider', label: '구분선', category: '레이아웃', icon: '—', description: '섹션 구분선', defaultProps: {}, propsSchema: [{ key: 'style', type: 'select', label: '스타일', options: [{ label: '라인', value: 'line' }, { label: '점', value: 'dots' }, { label: '그래디언트', value: 'gradient' }] }] },
  { type: 'section_header', label: '섹션 헤더', category: '레이아웃', icon: 'SH', description: '섹션 제목+부제목', defaultProps: { title: '' }, propsSchema: [{ key: 'title', type: 'string', label: '제목', required: true }, { key: 'subtitle', type: 'string', label: '부제목' }, { key: 'align', type: 'select', label: '정렬', options: [{ label: '왼쪽', value: 'left' }, { label: '가운데', value: 'center' }, { label: '오른쪽', value: 'right' }] }] },
  { type: 'video', label: '비디오', category: '레거시', icon: 'V', description: 'YouTube 영상', defaultProps: {}, propsSchema: [{ key: 'youtubeUrl', type: 'url', label: 'YouTube URL' }] },
  { type: 'image_gallery', label: '이미지 갤러리', category: '레거시', icon: 'IG', description: '이미지 URL 목록', defaultProps: {}, propsSchema: [{ key: 'images', type: 'text', label: '이미지 URLs (한 줄에 하나)' }] },
];

function getBlockMetaByType(type: string): BlockMeta | undefined {
  return BLOCK_REGISTRY.find((b) => b.type === type);
}

const BLOCK_CATEGORIES_GROUPED = (() => {
  const groups: { category: string; blocks: BlockMeta[] }[] = [];
  const order = ['히어로', '소개', '콘텐츠', '텍스트', '교회 정보', 'CTA', '레이아웃'];
  for (const cat of order) {
    const blocks = BLOCK_REGISTRY.filter((b) => b.category === cat);
    if (blocks.length > 0) groups.push({ category: cat, blocks });
  }
  // Add any remaining
  const covered = new Set(order);
  for (const b of BLOCK_REGISTRY) {
    if (!covered.has(b.category)) {
      const existing = groups.find((g) => g.category === b.category);
      if (existing) existing.blocks.push(b);
      else groups.push({ category: b.category, blocks: [b] });
    }
  }
  return groups;
})();

const TEMPLATES: PageTemplate[] = [
  { id: 'home-classic', name: '클래식 홈페이지', description: '히어로 + 설교 + 예배안내 + 연락처', category: 'home', sections: [
    { blockType: 'hero_image_slider', defaultProps: { slides: [], height: 'lg' }, sortOrder: 0, isVisible: true },
    { blockType: 'pastor_message', defaultProps: { title: '담임목사 인사', pastorName: '', message: '' }, sortOrder: 1, isVisible: true },
    { blockType: 'recent_sermons', defaultProps: { title: '최근 설교', limit: 6 }, sortOrder: 2, isVisible: true },
    { blockType: 'worship_times', defaultProps: { title: '예배 안내', services: [] }, sortOrder: 3, isVisible: true },
    { blockType: 'address_info', defaultProps: { title: '연락처' }, sortOrder: 4, isVisible: true },
  ] },
  { id: 'home-modern', name: '모던 홈페이지', description: '히어로 + 미션 + 설교 + 행사 + 뉴스레터', category: 'home', sections: [
    { blockType: 'hero_full_width', defaultProps: { title: '환영합니다', subtitle: '함께 예배하는 공동체', height: 'lg' }, sortOrder: 0, isVisible: true },
    { blockType: 'mission_vision', defaultProps: { title: '미션 & 비전', items: [] }, sortOrder: 1, isVisible: true },
    { blockType: 'recent_sermons', defaultProps: { title: '최근 설교', limit: 6 }, sortOrder: 2, isVisible: true },
    { blockType: 'event_grid', defaultProps: { title: '교회 소식', limit: 4 }, sortOrder: 3, isVisible: true },
    { blockType: 'newsletter_signup', defaultProps: { title: '소식 받기' }, sortOrder: 4, isVisible: true },
  ] },
  { id: 'about', name: '교회 소개', description: '교회 소개 + 미션/비전 + 담임목사', category: 'about', sections: [
    { blockType: 'section_header', defaultProps: { title: '교회 소개', subtitle: '' }, sortOrder: 0, isVisible: true },
    { blockType: 'church_intro', defaultProps: { title: '우리 교회', description: '' }, sortOrder: 1, isVisible: true },
    { blockType: 'mission_vision', defaultProps: { title: '미션 & 비전', items: [] }, sortOrder: 2, isVisible: true },
    { blockType: 'pastor_message', defaultProps: { title: '담임목사 인사', pastorName: '', message: '' }, sortOrder: 3, isVisible: true },
  ] },
  { id: 'history', name: '교회 연혁', description: '타임라인 연혁', category: 'history', sections: [
    { blockType: 'section_header', defaultProps: { title: '교회 연혁' }, sortOrder: 0, isVisible: true },
    { blockType: 'history_timeline', defaultProps: { title: '' }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'staff', name: '교역자 소개', description: '교역자 그리드', category: 'staff', sections: [
    { blockType: 'section_header', defaultProps: { title: '섬기는 사람들' }, sortOrder: 0, isVisible: true },
    { blockType: 'staff_grid', defaultProps: { title: '', limit: 20 }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'worship', name: '예배 안내', description: '예배 시간 + 약도', category: 'worship', sections: [
    { blockType: 'section_header', defaultProps: { title: '예배 안내' }, sortOrder: 0, isVisible: true },
    { blockType: 'worship_times', defaultProps: { services: [] }, sortOrder: 1, isVisible: true },
    { blockType: 'map_embed', defaultProps: { title: '오시는 길', address: '' }, sortOrder: 2, isVisible: true },
  ] },
  { id: 'contact', name: '연락처', description: '연락처 + 약도', category: 'contact', sections: [
    { blockType: 'address_info', defaultProps: { title: '연락처' }, sortOrder: 0, isVisible: true },
    { blockType: 'map_embed', defaultProps: { title: '오시는 길', address: '' }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'newcomer', name: '새가족 안내', description: '환영 메시지 + 안내 + 예배 + 약도', category: 'newcomer', sections: [
    { blockType: 'hero_full_width', defaultProps: { title: '새가족을 환영합니다', height: 'md' }, sortOrder: 0, isVisible: true },
    { blockType: 'visitor_welcome', defaultProps: { title: '환영합니다', message: '' }, sortOrder: 1, isVisible: true },
    { blockType: 'first_time_guide', defaultProps: { title: '처음 오시는 분', steps: [] }, sortOrder: 2, isVisible: true },
    { blockType: 'worship_times', defaultProps: { title: '예배 시간', services: [] }, sortOrder: 3, isVisible: true },
    { blockType: 'map_embed', defaultProps: { title: '오시는 길', address: '' }, sortOrder: 4, isVisible: true },
  ] },
  { id: 'sermons', name: '설교 아카이브', description: '설교 목록', category: 'sermons', sections: [
    { blockType: 'section_header', defaultProps: { title: '설교' }, sortOrder: 0, isVisible: true },
    { blockType: 'recent_sermons', defaultProps: { limit: 12 }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'bulletins', name: '주보 아카이브', description: '주보 목록', category: 'bulletins', sections: [
    { blockType: 'section_header', defaultProps: { title: '주보' }, sortOrder: 0, isVisible: true },
    { blockType: 'recent_bulletins', defaultProps: { limit: 12 }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'events', name: '행사 페이지', description: '행사 목록', category: 'events', sections: [
    { blockType: 'section_header', defaultProps: { title: '교회 행사' }, sortOrder: 0, isVisible: true },
    { blockType: 'event_grid', defaultProps: { limit: 12 }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'gallery', name: '갤러리', description: '앨범 갤러리', category: 'gallery', sections: [
    { blockType: 'section_header', defaultProps: { title: '갤러리' }, sortOrder: 0, isVisible: true },
    { blockType: 'album_gallery', defaultProps: { limit: 12 }, sortOrder: 1, isVisible: true },
  ] },
  { id: 'giving', name: '헌금 안내', description: 'CTA + 안내', category: 'giving', sections: [
    { blockType: 'hero_full_width', defaultProps: { title: '헌금 안내', height: 'sm' }, sortOrder: 0, isVisible: true },
    { blockType: 'text_only', defaultProps: { title: '헌금 방법', content: '' }, sortOrder: 1, isVisible: true },
    { blockType: 'call_to_action', defaultProps: { title: '온라인 헌금', ctaLabel: '헌금하기', ctaUrl: '' }, sortOrder: 2, isVisible: true },
  ] },
];

// ─── Dynamic Props Form (schema-driven) ──────────────────
function DynamicPropsForm({
  schema,
  props,
  onChange,
}: {
  schema: PropSchema[];
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...props, [key]: value });

  if (schema.length === 0) {
    return (
      <div className="bg-gray-50 rounded p-3 text-sm text-gray-500">
        이 블록은 기본 설정으로 작동합니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schema.map((field) => {
        const value = props[field.key] ?? field.defaultValue ?? '';

        switch (field.type) {
          case 'string':
          case 'url':
          case 'image':
          case 'color':
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">
                  {field.label}{field.required && <span className="text-red-400"> *</span>}
                </label>
                <input
                  type={field.type === 'color' ? 'color' : 'text'}
                  value={(value as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full border rounded px-2 py-1.5 text-sm ${field.type === 'color' ? 'h-10' : ''}`}
                />
              </div>
            );

          case 'text':
          case 'rich_text':
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">
                  {field.label}{field.required && <span className="text-red-400"> *</span>}
                </label>
                <textarea
                  value={(value as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  rows={4}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            );

          case 'number':
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">
                  {field.label}{field.required && <span className="text-red-400"> *</span>}
                </label>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={(value as number) || 0}
                  onChange={(e) => set(field.key, parseFloat(e.target.value) || 0)}
                  className="w-32 border rounded px-2 py-1.5 text-sm"
                />
              </div>
            );

          case 'boolean':
            return (
              <div key={field.key}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => set(field.key, e.target.checked)}
                    className="rounded"
                  />
                  {field.label}
                </label>
              </div>
            );

          case 'select':
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">{field.label}</label>
                <select
                  value={(value as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">선택하세요</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );

          case 'array':
            return (
              <ArrayField
                key={field.key}
                field={field}
                value={(value as Record<string, unknown>[]) || []}
                onChange={(arr) => set(field.key, arr)}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── Array field for nested schemas ──────────────────────
function ArrayField({
  field,
  value,
  onChange,
}: {
  field: PropSchema;
  value: Record<string, unknown>[];
  onChange: (arr: Record<string, unknown>[]) => void;
}) {
  const addItem = () => {
    const defaults: Record<string, unknown> = {};
    field.arrayItemSchema?.forEach((s) => { defaults[s.key] = s.defaultValue ?? ''; });
    onChange([...value, defaults]);
  };

  const removeItem = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const updateItem = (idx: number, key: string, val: unknown) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], [key]: val };
    onChange(updated);
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-2">{field.label}</label>
      {value.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-end mb-2 p-2 bg-gray-50 rounded">
          {field.arrayItemSchema?.map((sub) => (
            <div key={sub.key} className="flex-1">
              <label className="block text-[10px] text-gray-500">{sub.label}</label>
              {sub.type === 'text' ? (
                <textarea
                  value={(item[sub.key] as string) || ''}
                  onChange={(e) => updateItem(idx, sub.key, e.target.value)}
                  rows={2}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              ) : (
                <input
                  value={(item[sub.key] as string) || ''}
                  onChange={(e) => updateItem(idx, sub.key, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => removeItem(idx)}
            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 flex-shrink-0"
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        + 항목 추가
      </button>
    </div>
  );
}

// ─── Block label/icon helpers (registry-driven) ──────────
function getBlockLabel(type: BlockType): string {
  return getBlockMetaByType(type)?.label ?? type;
}

function getBlockIcon(type: BlockType): string {
  const meta = getBlockMetaByType(type);
  if (!meta) return '?';
  return meta.icon.length <= 2 ? meta.icon.toUpperCase() : meta.icon.charAt(0).toUpperCase();
}

// ─── Build categories from registry ──────────────────────
function useBlockCategories() {
  return useMemo(() => BLOCK_CATEGORIES_GROUPED, []);
}

// ─── Template Gallery ────────────────────────────────────
function TemplateGallery({ onSelect, onClose }: { onSelect: (t: PageTemplate) => void; onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = selectedCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === selectedCategory);

  const categories = [...new Set(TEMPLATES.map((t) => t.category))];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold">템플릿으로 시작하기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-2xl opacity-50">{t.category.charAt(0).toUpperCase()}</span>
                </div>
                <h4 className="font-bold text-sm group-hover:text-blue-600 transition-colors">{t.name}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {t.sections.length}개 섹션
                  </span>
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12">이 카테고리에 템플릿이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page form ───────────────────────────────────────────
interface PageFormData {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  isHome: boolean;
}

// ─── Main component ─────────────────────────────────────
export default function PageEditor() {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionProps, setSectionProps] = useState<Record<string, Record<string, unknown>>>({});
  const [showPageForm, setShowPageForm] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  const blockCategories = useBlockCategories();
  const { data: pages, isLoading: pagesLoading } = usePages();
  const { data: sections } = usePageSections(selectedPageId || '');
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

  const handleSelectPage = (page: Page) => {
    setSelectedPageId(page.id);
    setEditingSectionId(null);
    setShowAddBlock(false);
    setSectionProps({});
  };

  const handleCreatePage = () => {
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
        { onSuccess: () => setShowPageForm(false) },
      );
    } else {
      createPage.mutate(
        { ...data, sortOrder: (pages?.length || 0) },
        {
          onSuccess: (newPage) => {
            setShowPageForm(false);
            setSelectedPageId(newPage.id);
          },
        },
      );
    }
  };

  const handleDeletePage = () => {
    if (!selectedPage) return;
    if (window.confirm(`"${selectedPage.title}" 페이지를 삭제하시겠습니까?`)) {
      deletePage.mutate(selectedPage.id, {
        onSuccess: () => setSelectedPageId(null),
      });
    }
  };

  const handleAddSection = (blockType: BlockType) => {
    if (!selectedPageId) return;
    const meta = getBlockMetaByType(blockType);
    createSection.mutate({
      pageId: selectedPageId,
      data: {
        blockType,
        props: meta?.defaultProps ?? {},
        sortOrder: sortedSections.length,
        isVisible: true,
      },
    });
    setShowAddBlock(false);
  };

  const handleApplyTemplate = (template: PageTemplate) => {
    if (!selectedPageId) return;
    template.sections.forEach((sec, i) => {
      createSection.mutate({
        pageId: selectedPageId,
        data: {
          blockType: sec.blockType,
          props: sec.defaultProps,
          sortOrder: sortedSections.length + i,
          isVisible: sec.isVisible,
        },
      });
    });
    setShowTemplateGallery(false);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!selectedPageId || !sections) return;
    const sorted = [...sortedSections];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[index]!, b = sorted[swapIdx]!;
    sorted[index] = b; sorted[swapIdx] = a;
    reorderSections.mutate({
      pageId: selectedPageId,
      orderedIds: sorted.map((s) => s.id),
    });
  };

  const handleDeleteSection = (section: PageSection) => {
    if (!selectedPageId) return;
    if (window.confirm('이 섹션을 삭제하시겠습니까?')) {
      deleteSection.mutate({ pageId: selectedPageId, sectionId: section.id });
      if (editingSectionId === section.id) setEditingSectionId(null);
    }
  };

  const handleSaveSectionProps = (section: PageSection) => {
    if (!selectedPageId) return;
    const props = sectionProps[section.id] ?? section.props;
    updateSection.mutate({
      pageId: selectedPageId,
      sectionId: section.id,
      data: { props },
    });
    setEditingSectionId(null);
  };

  const handleToggleVisibility = (section: PageSection) => {
    if (!selectedPageId) return;
    updateSection.mutate({
      pageId: selectedPageId,
      sectionId: section.id,
      data: { isVisible: !section.isVisible },
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left sidebar - page list */}
      <div className="w-64 flex-shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold">페이지 목록</h3>
          <button
            onClick={handleCreatePage}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
          >
            + 추가
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pagesLoading && <p className="p-4 text-sm text-gray-500">로딩 중...</p>}
          {pages?.sort((a, b) => a.sortOrder - b.sortOrder).map((page) => (
            <button
              key={page.id}
              onClick={() => handleSelectPage(page)}
              className={`w-full text-left px-4 py-3 border-b text-sm hover:bg-gray-50 transition-colors ${
                selectedPageId === page.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
              }`}
            >
              <div className="font-medium truncate">{page.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                /{page.slug}
                {page.isHome && <span className="ml-1 text-blue-600">(홈)</span>}
                {page.status === 'draft' && <span className="ml-1 text-amber-600">(임시)</span>}
              </div>
            </button>
          ))}
          {pages?.length === 0 && (
            <p className="p-4 text-sm text-gray-400">페이지가 없습니다</p>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto">
        {!selectedPage ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <p className="text-sm">왼쪽에서 페이지를 선택하세요</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Page header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{selectedPage.title}</h2>
                <p className="text-sm text-gray-500">/{selectedPage.slug}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTemplateGallery(true)}
                  className="text-sm px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                >
                  템플릿 적용
                </button>
                <button
                  onClick={handleEditPage}
                  className="text-sm px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200"
                >
                  페이지 수정
                </button>
                <button
                  onClick={handleDeletePage}
                  className="text-sm px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  삭제
                </button>
              </div>
            </div>

            {/* Sections */}
            {sortedSections.map((section, index) => {
              const meta = getBlockMetaByType(section.blockType);
              return (
                <div
                  key={section.id}
                  className={`bg-white border rounded-lg overflow-hidden ${
                    !section.isVisible ? 'opacity-60' : ''
                  } ${editingSectionId === section.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
                    <span className="w-8 h-8 bg-blue-100 text-blue-700 text-xs font-bold rounded flex items-center justify-center">
                      {getBlockIcon(section.blockType)}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{getBlockLabel(section.blockType)}</span>
                      {meta?.category && (
                        <span className="ml-2 text-[10px] text-gray-400">
                          {meta.category}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleMoveSection(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="위로">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={() => handleMoveSection(index, 'down')} disabled={index === sortedSections.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="아래로">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button onClick={() => handleToggleVisibility(section)} className="p-1 text-gray-400 hover:text-gray-700" title={section.isVisible ? '숨기기' : '표시'}>
                        {section.isVisible ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        )}
                      </button>
                      <button
                        onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                        className={`p-1 hover:text-gray-700 ${editingSectionId === section.id ? 'text-blue-600' : 'text-gray-400'}`}
                        title="편집"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteSection(section)} className="p-1 text-gray-400 hover:text-red-600" title="삭제">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>

                  {editingSectionId === section.id && (
                    <div className="p-4 border-t bg-white">
                      <DynamicPropsForm
                        schema={meta?.propsSchema ?? []}
                        props={sectionProps[section.id] ?? section.props}
                        onChange={(p) => setSectionProps((prev) => ({ ...prev, [section.id]: p }))}
                      />
                      <div className="flex gap-2 mt-4 pt-3 border-t">
                        <button
                          onClick={() => handleSaveSectionProps(section)}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingSectionId(null)}
                          className="px-4 py-1.5 bg-gray-200 text-sm rounded hover:bg-gray-300"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add section button */}
            <div className="relative">
              <button
                onClick={() => setShowAddBlock(!showAddBlock)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                + 섹션 추가
              </button>

              {showAddBlock && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                  {blockCategories.map((category) => (
                    <div key={category.category}>
                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {category.label}
                      </div>
                      {category.blocks.map((block) => (
                        <button
                          key={block.type}
                          onClick={() => handleAddSection(block.type)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-sm"
                        >
                          <span className="w-7 h-7 bg-blue-100 text-blue-700 text-xs font-bold rounded flex items-center justify-center flex-shrink-0">
                            {block.icon.length <= 2 ? block.icon.toUpperCase() : block.icon.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-medium">{block.label}</span>
                            <span className="text-xs text-gray-400 ml-2">{block.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template gallery modal */}
      {showTemplateGallery && (
        <TemplateGallery
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

      {/* Page form modal */}
      {showPageForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">
              {selectedPage ? '페이지 수정' : '새 페이지'}
            </h3>
            <form onSubmit={handleSubmit(onSubmitPage)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  {...register('title', { required: '제목을 입력하세요' })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  {...register('slug', { required: 'slug를 입력하세요' })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="about-us"
                />
                {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">상태</label>
                  <select {...register('status')} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="draft">임시저장</option>
                    <option value="published">공개</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register('isHome')} className="rounded" />
                    홈 페이지
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createPage.isPending || updatePage.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  저장
                </button>
                <button type="button" onClick={() => setShowPageForm(false)} className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300">
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
