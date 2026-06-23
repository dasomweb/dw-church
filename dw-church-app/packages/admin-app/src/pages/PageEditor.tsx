import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
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
import { useAuthStore } from '../stores/auth';

// ═══════════════════════════════════════════════════════════
// Block Registry — types, variants, metadata
// ═══════════════════════════════════════════════════════════

// Image library is now fetched from the server's shared_images table, which
// super admins curate under "이미지 라이브러리" in the super admin console.
// No hard-coded Unsplash links — CLAUDE.md rule: self-host through R2.

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
  nature: 'static' | 'dynamic' | 'layout';
  variants: BlockVariant[];
  defaultProps: Record<string, unknown>;
  editableFields: { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'select' | 'image' | 'images' | 'url' | 'array' | 'tags' | 'services' | 'buttons' | 'groups'; options?: { label: string; value: string }[]; max?: number }[];
}

// CONTENT_ONLY — tenant page editor is locked to "글·사진만 수정" per the
// operator's done-for-you model (2026-06-16): we build the site; tenants edit
// only TEXT and IMAGES of existing blocks. So we hide everything structural —
// the block palette (add block), add/edit/delete page, block add/duplicate/
// delete/reorder, templates, and the size/layout/color/link fields (only the
// text + image element groups remain in the inspector). The full builder lives
// in the super-admin TenantPageEditor.
const CONTENT_ONLY = true;

const BLOCK_DEFS: BlockDef[] = [
  // ─── Hero ─────────────────────────────────────
  { type: 'hero_banner', label: '히어로 배너', category: '히어로', icon: '🖼️', nature: 'static', description: '배경 이미지 + 텍스트 오버레이 배너', variants: [{ id: 'centered', label: '중앙' }, { id: 'left', label: '좌측' }], defaultProps: { title: '환영합니다', subtitle: '', height: 'md', textAlign: 'center', layout: 'full', overlayColor: '#000000', overlayOpacity: 50 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제목', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }, { key: 'overlayColor', label: '오버레이 색상', type: 'text' }, { key: 'overlayOpacity', label: '오버레이 투명도 (%)', type: 'number' }, { key: 'buttonText', label: '버튼 텍스트', type: 'text' }, { key: 'buttonUrl', label: '버튼 링크', type: 'url' }, { key: 'layout', label: '레이아웃', type: 'select', options: [{ label: '풀 와이드', value: 'full' }, { label: '컨테이너', value: 'contained' }] }, { key: 'height', label: '높이', type: 'select', options: [{ label: '작게', value: 'sm' }, { label: '보통', value: 'md' }, { label: '크게', value: 'lg' }, { label: '전체', value: 'full' }] }] },
  { type: 'banner_slider', label: '배너 슬라이더', category: '히어로', icon: '🎠', nature: 'dynamic', description: '배너 관리에서 등록한 배너 자동 슬라이드', variants: [], defaultProps: { category: 'main' }, editableFields: [{ key: 'category', label: '배너 카테고리', type: 'select', options: [{ label: '메인', value: 'main' }, { label: '서브', value: 'sub' }] }] },
  { type: 'hero_image_slider', label: '이미지 슬라이더', category: '히어로', icon: '🎞️', nature: 'dynamic', description: '여러 이미지 자동 전환', variants: [{ id: 'full', label: '풀스크린' }, { id: 'contained', label: '컨테이너' }], defaultProps: { images: [], height: 'lg' }, editableFields: [{ key: 'images', label: '슬라이드 이미지', type: 'images', max: 10 }, { key: 'autoplayInterval', label: '자동 전환 (ms)', type: 'number' }] },
  { type: 'hero_split', label: '분할 히어로', category: '히어로', icon: '⬛', nature: 'static', description: '텍스트+이미지 분할', variants: [{ id: 'right', label: '이미지 우측' }, { id: 'left', label: '이미지 좌측' }], defaultProps: { title: '', imageUrl: '', imagePosition: 'right' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제목', type: 'text' }, { key: 'description', label: '설명', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },

  // ─── About ────────────────────────────────────
  { type: 'pastor_message', label: '담임목사 인사', category: '소개', icon: '🙏', nature: 'static', description: '담임목사 인사말', variants: [{ id: 'right', label: '사진 우측' }, { id: 'left', label: '사진 좌측' }], defaultProps: { pastorName: '', message: '', layout: 'right' }, editableFields: [{ key: 'title', label: '섹션 제목', type: 'text' }, { key: 'pastorName', label: '이름', type: 'text' }, { key: 'pastorTitle', label: '직함', type: 'text' }, { key: 'message', label: '인사말', type: 'textarea' }, { key: 'imageUrl', label: '사진', type: 'image' }] },
  { type: 'church_intro', label: '교회 소개', category: '소개', icon: '⛪', nature: 'static', description: '교회 소개 텍스트', variants: [{ id: 'with-image', label: '이미지 포함' }, { id: 'text-only', label: '텍스트만' }], defaultProps: { content: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'content', label: '소개글', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },
  { type: 'mission_vision', label: '미션/비전', category: '소개', icon: '🎯', nature: 'static', description: '미션, 비전, 핵심 가치', variants: [{ id: 'cards-4', label: '4열 카드' }, { id: 'cards-3', label: '3열 카드' }, { id: 'cards-2', label: '2열 카드' }, { id: 'list', label: '리스트' }], defaultProps: { content: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'content', label: '내용', type: 'textarea' }] },

  // ─── Content ───────────────────────────────────
  { type: 'recent_sermons', label: '설교', category: '콘텐츠', icon: '🎤', nature: 'dynamic', description: '최근 설교 목록', variants: [{ id: 'grid-4', label: '4열' }, { id: 'grid-3', label: '3열' }, { id: 'grid-2', label: '2열' }, { id: 'list', label: '리스트' }], defaultProps: { limit: 6 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'recent_bulletins', label: '주보', category: '콘텐츠', icon: '📄', nature: 'dynamic', description: '최근 주보', variants: [{ id: 'list', label: '리스트' }, { id: 'grid-2', label: '2열' }, { id: 'grid-3', label: '3열' }, { id: 'grid-4', label: '4열' }, { id: 'grid-5', label: '5열' }, { id: 'grid-6', label: '6열' }], defaultProps: { limit: 6 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'event_grid', label: '행사', category: '콘텐츠', icon: '📅', nature: 'dynamic', description: '교회 행사', variants: [{ id: 'cards-4', label: '4열' }, { id: 'cards-3', label: '3열' }, { id: 'cards-2', label: '2열' }], defaultProps: { limit: 4 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'album_gallery', label: '앨범', category: '콘텐츠', icon: '📷', nature: 'dynamic', description: '앨범 갤러리', variants: [{ id: 'grid-4', label: '4열' }, { id: 'grid-3', label: '3열' }, { id: 'grid-2', label: '2열' }], defaultProps: { limit: 6, category: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'staff_grid', label: '교역자', category: '콘텐츠', icon: '👥', nature: 'dynamic', description: '교역자 카드', variants: [{ id: 'grid-4', label: '4열' }, { id: 'grid-3', label: '3열' }, { id: 'grid-2', label: '2열' }, { id: 'grouped', label: '직분별 그룹' }], defaultProps: { limit: 20 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }, { key: 'groupBy', label: '그룹 기준', type: 'select', options: [{ label: '직분 (role)', value: 'role' }, { label: '부서 (department)', value: 'department' }] }, { key: 'customGroups', label: '그룹 순서', type: 'tags' }] },
  { type: 'cell_grid', label: '목장', category: '콘텐츠', icon: '🏠', nature: 'dynamic', description: '목장(셀) 안내 카드', variants: [{ id: 'grid-3', label: '3열' }, { id: 'grid-2', label: '2열' }, { id: 'grid-4', label: '4열' }], defaultProps: { title: '목장 안내', limit: 24 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'history_timeline', label: '교회 연혁', category: '콘텐츠', icon: '📜', nature: 'dynamic', description: '세로 타임라인', variants: [{ id: 'left', label: '좌측' }, { id: 'alternating', label: '교차' }], defaultProps: {}, editableFields: [{ key: 'title', label: '제목', type: 'text' }] },

  { type: 'recent_columns', label: '목회칼럼', category: '콘텐츠', icon: '✍️', nature: 'dynamic', description: '최근 목회칼럼', variants: [{ id: 'grid-3', label: '3열' }, { id: 'grid-2', label: '2열' }, { id: 'grid-4', label: '4열' }, { id: 'list', label: '리스트' }], defaultProps: { limit: 6 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'video_board', label: '영상 게시판', category: '콘텐츠', icon: '📺', nature: 'dynamic', description: '카테고리별 유튜브 영상', variants: [{ id: 'grid-2', label: '2열' }, { id: 'grid-1', label: '1열(크게)' }], defaultProps: { title: '영상', category: '', limit: 6 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'category', label: '카테고리 (이름 또는 슬러그)', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },
  { type: 'schedule_board', label: '예배 및 모임', category: '콘텐츠', icon: '🗓️', nature: 'dynamic', description: '관리에서 등록한 예배/모임 표', variants: [{ id: 'image-left', label: '이미지 좌측' }, { id: 'image-right', label: '이미지 우측' }, { id: 'no-image', label: '이미지 없음' }], defaultProps: { imageUrl: '', imagePosition: 'left' }, editableFields: [{ key: 'imageUrl', label: '이미지', type: 'image' }, { key: 'imagePosition', label: '이미지 위치', type: 'select', options: [{ label: '좌측', value: 'left' }, { label: '우측', value: 'right' }, { label: '없음', value: 'none' }] }] },
  { type: 'board', label: '게시판', category: '콘텐츠', icon: '📋', nature: 'dynamic', description: '게시판', variants: [{ id: 'list', label: '리스트' }, { id: 'grid-2', label: '2열' }, { id: 'grid-3', label: '3열' }], defaultProps: { boardSlug: '', limit: 10 }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'boardSlug', label: '게시판 슬러그', type: 'text' }, { key: 'limit', label: '표시 개수', type: 'number' }] },

  // ─── 폼/신청서 ─────────────────────────────────
  // 제출 내역은 관리자 > 폼 제출 인박스(form_submissions)로 들어옵니다.
  { type: 'contact_form', label: '문의 폼', category: '폼/신청서', icon: '📨', nature: 'dynamic', description: '방문자 문의를 받아 폼 제출 인박스로 전달', variants: [{ id: 'stacked', label: '세로' }, { id: 'side-by-side', label: '제목+폼 분할' }], defaultProps: { title: '문의하기', description: '궁금하신 점을 남겨주시면 빠르게 답변드리겠습니다.', submitLabel: '보내기', submittingLabel: '보내는 중...', successMessage: '문의가 접수되었습니다. 감사합니다.', errorMessage: '전송 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.', fields: [{ name: 'name', label: '이름', type: 'text', required: true }, { name: 'phone', label: '연락처', type: 'tel' }, { name: 'email', label: '이메일', type: 'email' }, { name: 'message', label: '문의 내용', type: 'textarea', required: true }] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'description', label: '안내 문구', type: 'textarea' }, { key: 'submitLabel', label: '버튼 텍스트', type: 'text' }, { key: 'successMessage', label: '완료 메시지', type: 'text' }] },
  { type: 'cell_report', label: '목장사역보고서', category: '폼/신청서', icon: '🗒️', nature: 'dynamic', description: '목장 인도자가 주간 사역을 보고 → 폼 제출 인박스', variants: [], defaultProps: { title: '목장 사역 보고서', subtitle: '한 주간의 목장 모임을 보고해 주세요.' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '안내 문구', type: 'textarea' }] },

  // ─── Text ──────────────────────────────────────
  { type: 'text_image', label: '텍스트+이미지', category: '텍스트', icon: '📝', nature: 'static', description: '텍스트와 이미지', variants: [{ id: 'right', label: '이미지 우측' }, { id: 'left', label: '이미지 좌측' }], defaultProps: { content: '', imageUrl: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'content', label: '내용', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },
  { type: 'text_only', label: '텍스트', category: '텍스트', icon: '📃', nature: 'static', description: '텍스트 전용', variants: [{ id: 'left', label: '좌측 정렬' }, { id: 'center', label: '중앙 정렬' }], defaultProps: { content: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'content', label: '내용', type: 'textarea' }] },
  { type: 'quote_block', label: '인용/성경구절', category: '텍스트', icon: '✝️', nature: 'static', description: '인용문 또는 성경 말씀', variants: [{ id: 'card', label: '카드' }, { id: 'simple', label: '심플' }, { id: 'highlight', label: '하이라이트' }], defaultProps: { quote: '' }, editableFields: [{ key: 'quote', label: '인용문', type: 'textarea' }, { key: 'source', label: '출처', type: 'text' }, { key: 'reference', label: '참조', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }] },
  { type: 'logo_title', label: '로고+타이틀', category: '텍스트', icon: '🏷️', nature: 'static', description: '로고 + 라벨 + 제목', variants: [{ id: 'horizontal', label: '로고 좌측' }, { id: 'center', label: '중앙 정렬' }], defaultProps: { variant: 'horizontal', eyebrow: '', title: '', subtitle: '', logoUrl: '', logoWidth: 72 }, editableFields: [{ key: 'logoUrl', label: '로고', type: 'image' }, { key: 'eyebrow', label: '라벨', type: 'text' }, { key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제', type: 'text' }, { key: 'logoWidth', label: '로고 크기(px)', type: 'number' }] },
  { type: 'button_group', label: '버튼 그룹', category: '텍스트', icon: '🔘', nature: 'static', description: '제목 + 여러 개의 버튼', variants: [{ id: 'center', label: '중앙 정렬' }, { id: 'left', label: '좌측 정렬' }], defaultProps: { title: '', subtitle: '', align: 'center', buttons: [{ text: '버튼 1', url: '' }, { text: '버튼 2', url: '' }] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제', type: 'text' }, { key: 'buttons', label: '버튼 목록', type: 'buttons' }] },

  // ─── Church Info ───────────────────────────────
  { type: 'worship_times', label: '예배 시간', category: '교회 정보', icon: '⏰', nature: 'static', description: '예배 시간 안내', variants: [{ id: 'table', label: '테이블' }], defaultProps: { services: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'services', label: '예배/모임 목록', type: 'services' }] },
  { type: 'map_embed', label: '약도', category: '교회 정보', icon: '📍', nature: 'static', description: 'Google Maps', variants: [{ id: 'full', label: '전체 너비' }, { id: 'with-info', label: '정보 포함' }], defaultProps: { address: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'address', label: '주소', type: 'text' }] },
  { type: 'address_info', label: '연락처', category: '교회 정보', icon: '📞', nature: 'static', description: '주소, 전화, 이메일', variants: [{ id: 'cards', label: '카드' }, { id: 'inline', label: '인라인' }], defaultProps: {}, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'address', label: '주소', type: 'text' }, { key: 'phone', label: '전화', type: 'text' }, { key: 'email', label: '이메일', type: 'text' }] },
  { type: 'visitor_welcome', label: '새가족 환영', category: '교회 정보', icon: '💝', nature: 'static', description: '새가족 환영 메시지', variants: [{ id: 'split', label: '분할' }, { id: 'centered', label: '중앙' }], defaultProps: { message: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'message', label: '환영 메시지', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },
  { type: 'first_time_guide', label: '처음 오시는 분', category: '교회 정보', icon: '🧭', nature: 'static', description: '단계별 안내', variants: [{ id: 'numbered', label: '번호' }, { id: 'icons', label: '아이콘' }], defaultProps: { steps: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }] },

  // ─── CTA ───────────────────────────────────────
  { type: 'call_to_action', label: 'CTA 배너', category: 'CTA', icon: '🔔', nature: 'static', description: '행동 유도 배너', variants: [{ id: 'centered', label: '중앙' }, { id: 'split', label: '분할' }, { id: 'banner', label: '배너' }], defaultProps: { title: '', ctaLabel: '', ctaUrl: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'description', label: '설명', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }, { key: 'ctaLabel', label: '버튼 텍스트', type: 'text' }, { key: 'ctaUrl', label: '버튼 링크', type: 'url' }] },
  { type: 'newsletter_signup', label: '뉴스레터', category: 'CTA', icon: '✉️', nature: 'static', description: '이메일 구독', variants: [{ id: 'inline', label: '인라인' }, { id: 'card', label: '카드' }], defaultProps: {}, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'description', label: '설명', type: 'text' }] },

  // ─── Layout Block ──────────────────────────────
  { type: 'layout_row', label: '행 (Row)', category: '레이아웃', icon: '↔️', nature: 'static', description: '자식 블록을 가로로 배치', variants: [], defaultProps: { layout: 'row', gap: 16, padding: '24px', children: [] }, editableFields: [{ key: 'padding', label: '패딩 (CSS)', type: 'text' }, { key: 'margin', label: '마진 (CSS)', type: 'text' }, { key: 'gap', label: '간격 (px)', type: 'number' }, { key: 'backgroundColor', label: '배경색', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }, { key: 'overlayColor', label: '오버레이 색상', type: 'text' }, { key: 'overlayOpacity', label: '오버레이 투명도 (%)', type: 'number' }, { key: 'borderColor', label: '테두리 색상', type: 'text' }, { key: 'borderWidth', label: '테두리 두께 (px)', type: 'number' }, { key: 'borderRadius', label: '모서리 둥글기 (px)', type: 'number' }, { key: 'divider', label: '구분선 표시', type: 'select', options: [{ label: '없음', value: '' }, { label: '있음', value: 'true' }] }, { key: 'dividerColor', label: '구분선 색상', type: 'text' }, { key: 'linkUrl', label: '링크 URL', type: 'url' }, { key: 'linkTarget', label: '링크 타겟', type: 'select', options: [{ label: '현재 창', value: '_self' }, { label: '새 창', value: '_blank' }] }] },
  { type: 'layout_columns', label: '컬럼 (Columns)', category: '레이아웃', icon: '▥', nature: 'static', description: '2~4열 그리드 레이아웃', variants: [{ id: 'columns-2', label: '2열' }, { id: 'columns-3', label: '3열' }, { id: 'columns-4', label: '4열' }], defaultProps: { layout: 'columns-2', gap: 24, padding: '24px', children: [] }, editableFields: [{ key: 'layout', label: '열 수', type: 'select', options: [{ label: '2열', value: 'columns-2' }, { label: '3열', value: 'columns-3' }, { label: '4열', value: 'columns-4' }] }, { key: 'padding', label: '패딩', type: 'text' }, { key: 'margin', label: '마진', type: 'text' }, { key: 'gap', label: '간격 (px)', type: 'number' }, { key: 'backgroundColor', label: '배경색', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }, { key: 'overlayColor', label: '오버레이 색상', type: 'text' }, { key: 'overlayOpacity', label: '오버레이 투명도 (%)', type: 'number' }, { key: 'borderColor', label: '테두리 색상', type: 'text' }, { key: 'borderWidth', label: '테두리 두께 (px)', type: 'number' }, { key: 'linkUrl', label: '링크 URL', type: 'url' }] },
  { type: 'layout_section', label: '섹션 (Section)', category: '레이아웃', icon: '▣', nature: 'static', description: '배경+패딩 컨테이너', variants: [], defaultProps: { layout: 'section', padding: '40px 24px', children: [] }, editableFields: [{ key: 'padding', label: '패딩', type: 'text' }, { key: 'margin', label: '마진', type: 'text' }, { key: 'backgroundColor', label: '배경색', type: 'text' }, { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' }, { key: 'overlayColor', label: '오버레이 색상', type: 'text' }, { key: 'overlayOpacity', label: '오버레이 투명도 (%)', type: 'number' }, { key: 'borderColor', label: '테두리 색상', type: 'text' }, { key: 'borderWidth', label: '테두리 두께 (px)', type: 'number' }, { key: 'borderRadius', label: '모서리 둥글기 (px)', type: 'number' }, { key: 'maxWidth', label: '최대 너비', type: 'select', options: [{ label: '7xl (기본)', value: '7xl' }, { label: '5xl (좁게)', value: '5xl' }, { label: '전체', value: 'full' }] }, { key: 'linkUrl', label: '링크 URL', type: 'url' }, { key: 'linkTarget', label: '링크 타겟', type: 'select', options: [{ label: '현재 창', value: '_self' }, { label: '새 창', value: '_blank' }] }] },
  { type: 'divider', label: '구분선', category: '레이아웃', icon: '➖', nature: 'static', description: '섹션 구분', variants: [{ id: 'line', label: '라인' }, { id: 'dots', label: '점' }, { id: 'gradient', label: '그래디언트' }], defaultProps: {}, editableFields: [] },
  { type: 'section_header', label: '섹션 헤더', category: '레이아웃', icon: '🏷️', nature: 'static', description: '제목+부제목', variants: [{ id: 'center', label: '중앙' }, { id: 'left', label: '좌측' }], defaultProps: { title: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제목', type: 'text' }] },

  // ─── Legacy ────────────────────────────────────
  { type: 'location_map', label: '지도/약도', category: '교회 정보', icon: '🗺️', nature: 'static', description: '교회 위치 지도', variants: [{ id: 'default', label: '기본' }], defaultProps: { address: '' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'address', label: '주소', type: 'text' }, { key: 'lat', label: '위도', type: 'number' }, { key: 'lng', label: '경도', type: 'number' }] },
  { type: 'directions_split', label: '오시는 길(지도+연락처)', category: '교회 정보', icon: '📍', nature: 'static', description: '좌측 지도 + 우측 연락처(교회명/주소/전화)', variants: [{ id: 'map-left', label: '지도 좌측' }, { id: 'map-right', label: '지도 우측' }], defaultProps: { eyebrow: 'Contact', title: '오시는 길', churchName: '', address: '', phone: '', email: '' }, editableFields: [{ key: 'eyebrow', label: '라벨', type: 'text' }, { key: 'title', label: '제목', type: 'text' }, { key: 'churchName', label: '교회명', type: 'text' }, { key: 'address', label: '주소', type: 'text' }, { key: 'phone', label: '전화', type: 'text' }, { key: 'email', label: '이메일', type: 'text' }, { key: 'mapEmbedUrl', label: '지도 임베드 URL(선택)', type: 'text' }] },
  { type: 'schedule_split', label: '예배 안내(이미지+표)', category: '교회 정보', icon: '🗓️', nature: 'static', description: '좌측 이미지 + 우측 예배/모임 표 여러 개', variants: [{ id: 'image-left', label: '이미지 좌측' }, { id: 'image-right', label: '이미지 우측' }], defaultProps: { imageUrl: '', groups: [{ title: '주일 예배', columns: ['예배', '시간', '장소'], rows: [['1부 예배', '오전 9:00', '본당']] }] }, editableFields: [{ key: 'imageUrl', label: '이미지', type: 'image' }, { key: 'groups', label: '예배/모임 표', type: 'groups' }] },
  { type: 'contact_info', label: '연락처 (자동)', category: '교회 정보', icon: '📱', nature: 'static', description: '설정에서 자동 로드', variants: [], defaultProps: {}, editableFields: [] },
  { type: 'newcomer_info', label: '새가족 안내 (레거시)', category: '교회 정보', icon: '🤝', nature: 'static', description: '새가족 환영 메시지', variants: [], defaultProps: { title: '처음 오신 분들을 환영합니다' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'subtitle', label: '부제목', type: 'text' }, { key: 'content', label: '내용', type: 'textarea' }, { key: 'imageUrl', label: '이미지', type: 'image' }] },
  { type: 'giving_info', label: '헌금 안내', category: '교회 정보', icon: '💌', nature: 'static', description: '온라인 헌금 방법 안내 (Zelle·체크·QR) — 결제 처리 아님', variants: [], defaultProps: { title: '헌금 안내' }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'intro', label: '안내문', type: 'textarea' }, { key: 'zelle', label: 'Zelle (이메일/전화)', type: 'text' }, { key: 'bankInfo', label: '계좌 이체 정보', type: 'text' }, { key: 'mailingName', label: '체크 수취인 (교회명)', type: 'text' }, { key: 'mailingAddress', label: '우편 주소', type: 'text' }, { key: 'note', label: '추가 안내', type: 'textarea' }, { key: 'qrImageUrl', label: 'QR 이미지', type: 'image' }] },
  { type: 'worship_schedule', label: '예배안내 (레거시)', category: '교회 정보', icon: '🕐', nature: 'static', description: '예배 시간 안내', variants: [], defaultProps: { services: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }] },
  { type: 'video', label: '비디오', category: '레거시', icon: '🎬', nature: 'static', description: 'YouTube 영상', variants: [], defaultProps: {}, editableFields: [{ key: 'youtubeUrl', label: 'YouTube URL', type: 'url' }, { key: 'title', label: '제목', type: 'text' }] },
  { type: 'image_gallery', label: '이미지 갤러리', category: '레거시', icon: '🎨', nature: 'static', description: '이미지 목록', variants: [], defaultProps: { images: [] }, editableFields: [{ key: 'title', label: '제목', type: 'text' }, { key: 'images', label: '이미지', type: 'images', max: 20 }] },
];

function getBlockDef(type: string): BlockDef | undefined {
  return BLOCK_DEFS.find((b) => b.type === type);
}

// Palette color mapping — gives each block nature a distinct tint so the
// user can visually spot Data (dynamic) vs Static vs Layout blocks at a glance.
function natureTone(nature: BlockDef['nature']): { list: string; grid: string; label: string } {
  if (nature === 'dynamic') {
    return {
      list: 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-400',
      grid: 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-400',
      label: 'text-amber-900 group-hover:text-amber-900',
    };
  }
  if (nature === 'layout') {
    return {
      list: 'bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-400',
      grid: 'bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-400',
      label: 'text-purple-900 group-hover:text-purple-900',
    };
  }
  return {
    list: 'border-transparent hover:bg-blue-50 hover:border-blue-200',
    grid: 'border-gray-100 hover:bg-blue-50 hover:border-blue-200',
    label: 'text-gray-700 group-hover:text-blue-700',
  };
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
// ═══════════════════════════════════════════════════════════
// Block Palette (left sidebar — drag source)
// ═══════════════════════════════════════════════════════════
type NatureFilter = 'all' | 'static' | 'dynamic' | 'layout';
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
        if (natureFilter === 'layout' && b.nature !== 'layout') return false;
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
          {([['all', '전체'], ['static', '스태틱'], ['dynamic', '데이터'], ['layout', '레이아웃']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setNatureFilter(val)}
              className={`flex-1 text-[10px] py-1 rounded-md transition-colors font-medium ${
                natureFilter === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {val === 'static' && '📄 '}{val === 'dynamic' && '⚡ '}{val === 'layout' && '📦 '}{label}
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
                {cat.blocks.map((block) => {
                  const tone = natureTone(block.nature);
                  return (
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
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-grab active:cursor-grabbing transition-colors text-left group border ${tone.list}`}
                      title={block.description}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="text-base">{block.icon}</span>
                      <span className={`truncate font-medium flex-1 ${tone.label}`}>{block.label}</span>
                      <span className="text-[10px] flex-shrink-0" title={block.nature === 'dynamic' ? '데이터 블록' : block.nature === 'layout' ? '레이아웃 블록' : '스태틱 블록'}>
                        {block.nature === 'dynamic' ? '⚡' : block.nature === 'layout' ? '📦' : '📄'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Grid view */
              <div className="grid grid-cols-2 gap-1">
                {cat.blocks.map((block) => {
                  const tone = natureTone(block.nature);
                  return (
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
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs cursor-grab active:cursor-grabbing transition-colors text-center group border ${tone.grid}`}
                      title={block.description}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="text-xl">{block.icon}</span>
                      <span className={`text-[10px] font-medium leading-tight ${tone.label}`}>{block.label}</span>
                      <span className="text-[9px] flex-shrink-0" title={block.nature === 'dynamic' ? '데이터 블록' : block.nature === 'layout' ? '레이아웃 블록' : '스태틱 블록'}>
                        {block.nature === 'dynamic' ? '⚡' : block.nature === 'layout' ? '📦' : '📄'}
                      </span>
                    </div>
                  );
                })}
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
    // Both indices are in-bounds (swapIdx is range-checked above; index is a valid item index).
    const tmp = newTags[index]!;
    newTags[index] = newTags[swapIdx]!;
    newTags[swapIdx] = tmp;
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
    // Both indices are in-bounds (swapIdx is range-checked above; index is a valid item index).
    const tmp = arr[index]!;
    arr[index] = arr[swapIdx]!;
    arr[swapIdx] = tmp;
    onChange(arr);
  };

  const handleUpdate = (index: number, field: 'name' | 'time' | 'location', val: string) => {
    const arr = [...value];
    // index references an existing rendered row, so arr[index] is defined.
    arr[index] = { ...arr[index]!, [field]: val };
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

// Button-group repeater — edit the buttons[] array ({ text, url }).
interface BtnItem { text?: string; url?: string; target?: string }
function ButtonListEditor({ value, onChange }: { value: BtnItem[]; onChange: (v: BtnItem[]) => void }) {
  const update = (i: number, field: keyof BtnItem, val: string) => {
    const a = [...value]; a[i] = { ...a[i]!, [field]: val }; onChange(a);
  };
  const remove = (i: number) => onChange(value.filter((_, x) => x !== i));
  const move = (i: number, dir: 'up' | 'down') => {
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= value.length) return;
    const a = [...value]; const t = a[i]!; a[i] = a[j]!; a[j] = t; onChange(a);
  };
  return (
    <div className="space-y-1.5">
      {value.map((b, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
          <input value={b.text || ''} onChange={(e) => update(i, 'text', e.target.value)} placeholder="버튼 텍스트" className="border rounded px-2 py-1 text-xs" />
          <input value={b.url || ''} onChange={(e) => update(i, 'url', e.target.value)} placeholder="링크 URL" className="border rounded px-2 py-1 text-xs" />
          <div className="flex gap-0.5">
            <button type="button" onClick={() => move(i, 'up')} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px]">▲</button>
            <button type="button" onClick={() => move(i, 'down')} disabled={i === value.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px]">▼</button>
            <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-[10px]">×</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { text: '', url: '' }])} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">+ 버튼 추가</button>
    </div>
  );
}

// Schedule-tables repeater — edit groups[] ({ title, columns[3], rows[][] }).
interface SchedGroup { title?: string; columns?: string[]; rows?: string[][] }
function ScheduleGroupsEditor({ value, onChange }: { value: SchedGroup[]; onChange: (v: SchedGroup[]) => void }) {
  const colsOf = (g: SchedGroup) => (g.columns && g.columns.length ? g.columns : ['예배', '시간', '장소']);
  const setGroup = (gi: number, patch: Partial<SchedGroup>) => {
    const a = [...value]; a[gi] = { ...a[gi]!, ...patch }; onChange(a);
  };
  const setCol = (gi: number, ci: number, val: string) => {
    const c = [...colsOf(value[gi]!)]; c[ci] = val; setGroup(gi, { columns: c });
  };
  const setCell = (gi: number, ri: number, ci: number, val: string) => {
    const rows = (value[gi]!.rows || []).map((r) => [...r]);
    while (rows[ri]!.length < colsOf(value[gi]!).length) rows[ri]!.push('');
    rows[ri]![ci] = val; setGroup(gi, { rows });
  };
  const addRow = (gi: number) => setGroup(gi, { rows: [...(value[gi]!.rows || []), colsOf(value[gi]!).map(() => '')] });
  const removeRow = (gi: number, ri: number) => setGroup(gi, { rows: (value[gi]!.rows || []).filter((_, i) => i !== ri) });
  const removeGroup = (gi: number) => onChange(value.filter((_, i) => i !== gi));
  const addGroup = () => onChange([...value, { title: '새 표', columns: ['예배', '시간', '장소'], rows: [['', '', '']] }]);

  return (
    <div className="space-y-2">
      {value.map((g, gi) => {
        const c = colsOf(g);
        const gridCols = `repeat(${c.length}, 1fr) auto`;
        return (
          <div key={gi} className="border rounded-lg p-2 space-y-1.5">
            <div className="flex items-center gap-1">
              <input value={g.title || ''} onChange={(e) => setGroup(gi, { title: e.target.value })} placeholder="표 제목 (예: 주일 예배)" className="border rounded px-2 py-1 text-xs font-medium flex-1" />
              <button type="button" onClick={() => removeGroup(gi)} className="text-red-400 hover:text-red-600 text-[10px] px-1 whitespace-nowrap">표 삭제</button>
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: gridCols }}>
              {c.map((col, ci) => (
                <input key={`h${ci}`} value={col} onChange={(e) => setCol(gi, ci, e.target.value)} className="border rounded px-1 py-0.5 text-[10px] bg-gray-50 font-medium" />
              ))}
              <span />
              {(g.rows || []).map((row, ri) => (
                <Fragment key={ri}>
                  {c.map((_, ci) => (
                    <input key={ci} value={row[ci] || ''} onChange={(e) => setCell(gi, ri, ci, e.target.value)} className="border rounded px-1 py-0.5 text-xs" />
                  ))}
                  <button type="button" onClick={() => removeRow(gi, ri)} className="text-red-400 hover:text-red-600 text-[10px]">×</button>
                </Fragment>
              ))}
            </div>
            <button type="button" onClick={() => addRow(gi)} className="text-[10px] text-blue-600 hover:text-blue-800">+ 행 추가</button>
          </div>
        );
      })}
      <button type="button" onClick={addGroup} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">+ 표 추가</button>
    </div>
  );
}

// Category display labels. Ids must match what super admin uploads under.
const LIBRARY_CATEGORY_LABELS: Record<string, string> = {
  nature: '자연',
  flower: '꽃',
  sky: '하늘',
  park: '공원',
  cross: '십자가',
  church: '교회',
  bible: '성경',
  abstract: '추상',
};

interface SharedLibraryImage {
  id: string;
  url: string;
  title: string;
  category: string;
}

function ImageLibraryModal({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const session = useAuthStore((s) => s.session);
  const token = session?.accessToken;
  const [images, setImages] = useState<SharedLibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/shared-images', {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        if (!res.ok) throw new Error('load failed');
        const json = (await res.json()) as { data: SharedLibraryImage[] };
        if (cancelled) return;
        const list = json.data ?? [];
        setImages(list);
        if (list.length > 0 && !activeCategory) setActiveCategory(list[0]!.category);
      } catch {
        if (!cancelled) setImages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Unique categories present in the returned library.
  const categories = Array.from(new Set(images.map((i) => i.category)));
  const activeImages = images.filter((i) => i.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-bold">이미지 라이브러리</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">불러오는 중...</div>
        ) : images.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6 text-sm text-gray-400 text-center">
            아직 등록된 공용 이미지가 없습니다. <br />
            슈퍼어드민에서 이미지 라이브러리에 이미지를 추가할 수 있습니다.
          </div>
        ) : (
          <>
            <div className="flex gap-1 px-5 py-2 border-b overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                    activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {LIBRARY_CATEGORY_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {activeImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => onSelect(img.url)}
                    className="group relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <img src={img.url} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                      <span className="w-full text-white text-xs py-1.5 px-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        {img.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Child Block Picker — for Layout Blocks
// ═══════════════════════════════════════════════════════════
function ChildBlockPicker({ onSelect, onClose }: { onSelect: (type: string) => void; onClose: () => void }) {
  // Exclude Layout Blocks from children picker to prevent deep nesting
  const availableBlocks = BLOCK_DEFS.filter((b) => b.nature !== 'layout');
  const categories = (() => {
    const order = ['히어로', '소개', '콘텐츠', '텍스트', '교회 정보', 'CTA'];
    const groups: { category: string; blocks: BlockDef[] }[] = [];
    for (const cat of order) {
      const blocks = availableBlocks.filter((b) => b.category === cat);
      if (blocks.length > 0) groups.push({ category: cat, blocks });
    }
    return groups;
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="text-sm font-bold">자식 블록 선택</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Layout Block 안에 넣을 블록을 선택하세요</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {categories.map((cat) => (
            <div key={cat.category} className="mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">{cat.category}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {cat.blocks.map((b) => (
                  <button
                    key={b.type}
                    onClick={() => onSelect(b.type)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <span className="text-lg">{b.icon}</span>
                    <span className="text-[10px] font-medium text-gray-700">{b.label}</span>
                    <span className="text-[9px] text-gray-400">{b.nature === 'dynamic' ? '⚡ 데이터' : '📄 스태틱'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Layout Child Editor — edit a single child inside a Layout Block
// ═══════════════════════════════════════════════════════════
function LayoutChildEditor({
  child, childDef, index, totalChildren, onUpdate, onRemove, onMoveUp, onMoveDown, onUploadImage,
}: {
  child: { blockType: string; props: Record<string, unknown> };
  childDef: BlockDef | undefined;
  index: number;
  totalChildren: number;
  onUpdate: (newChild: { blockType: string; props: Record<string, unknown> }) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const set = (key: string, value: unknown) => onUpdate({ ...child, props: { ...child.props, [key]: value } });

  if (!childDef) {
    return (
      <div className="p-2 border border-red-200 rounded-lg bg-red-50 text-xs text-red-600">
        알 수 없는 블록 타입: {child.blockType}
        <button onClick={onRemove} className="ml-2 text-red-800 underline">삭제</button>
      </div>
    );
  }

  return (
    <div className="border border-indigo-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50/50 border-b border-indigo-100">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-indigo-600 hover:text-indigo-800"
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className="text-xs">{childDef.icon}</span>
        <span className="text-xs font-medium text-gray-700 flex-1 truncate">
          {childDef.label}
          {!!child.props.title && <span className="text-gray-400 ml-1">— {String(child.props.title).slice(0, 20)}</span>}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
            title="위로"
          >↑</button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalChildren - 1}
            className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
            title="아래로"
          >↓</button>
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] text-red-400 hover:text-red-700 px-1"
            title="삭제"
          >✕</button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="p-2.5 space-y-2">
          {/* Variant selector */}
          {childDef.variants.length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-0.5">스타일</label>
              <div className="flex flex-wrap gap-1">
                {childDef.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => set('variant', v.id)}
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      child.props.variant === v.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editable fields — content-only keeps just text + image (글·사진). */}
          {childDef.editableFields
            .filter((field) => !CONTENT_ONLY || ['text', 'textarea', 'image', 'images'].includes(field.type))
            .map((field) => (
            <div key={field.key}>
              <label className="text-[10px] font-medium text-gray-500 block mb-0.5">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={(child.props[field.key] as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  rows={5}
                  className="w-full border rounded px-2 py-1.5 text-xs leading-relaxed resize-y min-h-[90px]"
                />
              ) : field.type === 'select' ? (
                <select
                  value={(child.props[field.key] as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-xs"
                >
                  {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={(child.props[field.key] as number) || 0}
                  onChange={(e) => set(field.key, parseInt(e.target.value) || 0)}
                  className="w-24 border rounded px-2 py-1 text-xs"
                />
              ) : field.type === 'image' ? (
                <ImageUpload
                  value={(child.props[field.key] as string) || ''}
                  onChange={(url) => set(field.key, url)}
                  onUpload={onUploadImage}
                  resize={/background|hero|cover/i.test(field.key) ? 'hero' : 'block'}
                  aspectRatio="16/9"
                />
              ) : (
                <input
                  type="text"
                  value={(child.props[field.key] as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              )}
            </div>
          ))}
          {childDef.editableFields.length === 0 && (
            <p className="text-[10px] text-gray-400">설정 없음</p>
          )}
        </div>
      )}
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
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragOverIdx: number | null;
}) {
  const def = getBlockDef(section.blockType);
  const props = localProps;
  const set = (key: string, value: unknown) => onPropsChange({ ...props, [key]: value });
  const [collapsed, setCollapsed] = useState(true);
  const [showChildPicker, setShowChildPicker] = useState(false);
  const isDynamic = def?.nature === 'dynamic';
  const isLayoutBlock = def?.nature === 'layout';
  const layoutChildren = (props.children as { blockType: string; props: Record<string, unknown> }[]) || [];

  // Layout Block: child management
  const addChild = (blockType: string) => {
    const childDef = getBlockDef(blockType);
    const newChild = {
      blockType,
      props: { ...(childDef?.defaultProps || {}), variant: childDef?.variants[0]?.id },
    };
    set('children', [...layoutChildren, newChild]);
    setShowChildPicker(false);
  };

  const updateChild = (idx: number, newChild: { blockType: string; props: Record<string, unknown> }) => {
    const newChildren = [...layoutChildren];
    newChildren[idx] = newChild;
    set('children', newChildren);
  };

  const removeChild = (idx: number) => {
    set('children', layoutChildren.filter((_, i) => i !== idx));
  };

  const moveChild = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= layoutChildren.length) return;
    const newChildren = [...layoutChildren];
    [newChildren[idx], newChildren[targetIdx]] = [newChildren[targetIdx]!, newChildren[idx]!];
    set('children', newChildren);
  };

  const [imageLibraryField, setImageLibraryField] = useState<string | null>(null);

  // Element type mapping — groups editable fields by Element type
  // (Text / Image / Link / Config)
  const getElementCategory = (fieldKey: string, fieldType: string): 'text' | 'image' | 'link' | 'config' => {
    if (fieldType === 'image' || fieldType === 'images') return 'image';
    if (fieldType === 'url' || fieldKey.toLowerCase().includes('url') && fieldType !== 'text') return 'link';
    if (fieldType === 'select' || fieldType === 'number') return 'config';
    if (fieldType === 'text' || fieldType === 'textarea' || fieldType === 'tags' || fieldType === 'services') return 'text';
    return 'config';
  };

  const elementGroupMeta: Record<string, { icon: string; label: string; color: string }> = {
    text: { icon: '📝', label: '텍스트 엘리먼트', color: 'text-blue-600' },
    image: { icon: '🖼️', label: '이미지 엘리먼트', color: 'text-green-600' },
    link: { icon: '🔗', label: '링크 엘리먼트', color: 'text-purple-600' },
    config: { icon: '⚙️', label: '설정', color: 'text-gray-500' },
  };

  // Group fields by element category
  type EditableField = NonNullable<BlockDef['editableFields']>[number];
  const groupedFields = useMemo<Record<string, EditableField[]>>(() => {
    const groups: Record<string, EditableField[]> = { text: [], image: [], link: [], config: [] };
    if (!def) return groups;
    for (const f of def.editableFields) {
      const cat = getElementCategory(f.key, f.type);
      groups[cat]!.push(f);
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def]);

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
        {/* Drag handle — hidden in content-only (no reordering) */}
        {!CONTENT_ONLY && (
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
        )}

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
              {!!props.title && (
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

        {/* Action buttons — content-only shows ONLY the edit (글·사진) button;
            move/visibility/duplicate/delete are structural and hidden. */}
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {!CONTENT_ONLY && (
            <>
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
            </>
          )}
          <button onClick={onToggleEdit} className={`p-1 rounded transition-colors ${isEditing ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'}`} title="편집">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          {!CONTENT_ONLY && (
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="삭제">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded content (variants + preview) - shown when not collapsed and not editing */}
      {!collapsed && !isEditing && (
        <div className="px-3 py-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Title preview */}
          {!!props.title && (
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
            {(CONTENT_ONLY ? (['text', 'image'] as const) : (['text', 'image', 'link', 'config'] as const)).map((cat) => {
              const fields = groupedFields[cat] || [];
              if (fields.length === 0) return null;
              const meta = elementGroupMeta[cat]!;
              return (
                <div key={cat} className="space-y-1.5">
                  {/* Element group header */}
                  <div className={`flex items-center gap-1 pt-1.5 ${cat === 'text' ? '' : 'mt-1.5 pt-2 border-t border-gray-100'}`}>
                    <span className="text-[10px]">{meta.icon}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                  </div>
                  {fields.map((field) => (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-medium text-gray-500">{field.label}</label>
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
                    rows={7}
                    className="w-full border rounded-lg px-2.5 py-2 text-sm leading-relaxed resize-y min-h-[120px]"
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
                ) : field.type === 'buttons' ? (
                  <ButtonListEditor
                    value={(props[field.key] as BtnItem[]) || []}
                    onChange={(val) => set(field.key, val)}
                  />
                ) : field.type === 'groups' ? (
                  <ScheduleGroupsEditor
                    value={(props[field.key] as SchedGroup[]) || []}
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
                </div>
              );
            })}
            {def.editableFields.length === 0 && (
              <p className="text-xs text-gray-400">이 블록은 기본 설정으로 작동합니다.</p>
            )}

            {/* Layout Block — Child Blocks Editor */}
            {isLayoutBlock && (
              <div className="mt-3 pt-3 border-t border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-indigo-700">📦 자식 블록 ({layoutChildren.length})</h4>
                  {!CONTENT_ONLY && (
                    <button
                      type="button"
                      onClick={() => setShowChildPicker(true)}
                      className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700"
                    >
                      + 블록 추가
                    </button>
                  )}
                </div>

                {layoutChildren.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50/30">
                    <p className="text-xs text-indigo-400">자식 블록이 없습니다</p>
                    <p className="text-[10px] text-gray-400 mt-1">위 "+ 블록 추가"로 블록을 넣으세요</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {layoutChildren.map((child, idx) => {
                      const childDef = getBlockDef(child.blockType);
                      return (
                        <LayoutChildEditor
                          key={idx}
                          child={child}
                          childDef={childDef}
                          index={idx}
                          totalChildren={layoutChildren.length}
                          onUpdate={(newChild) => updateChild(idx, newChild)}
                          onRemove={() => removeChild(idx)}
                          onMoveUp={() => moveChild(idx, 'up')}
                          onMoveDown={() => moveChild(idx, 'down')}
                          onUploadImage={onUploadImage}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onSave} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">저장</button>
              <button onClick={onToggleEdit} className="px-3 py-1 bg-gray-100 text-xs rounded-lg hover:bg-gray-200 transition-colors">취소</button>
            </div>
          </div>
        )}
      </div>

      {/* Child Block Picker */}
      {showChildPicker && (
        <ChildBlockPicker
          onSelect={addChild}
          onClose={() => setShowChildPicker(false)}
        />
      )}

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
    if (!selectedPageId) {
      showToast('error', '먼저 페이지를 선택하세요');
      return;
    }
    if (addingRef.current) return;
    addingRef.current = true;
    setTimeout(() => { addingRef.current = false; }, 1000);
    const def = getBlockDef(blockType);
    const insertIdx = atIndex ?? sortedSections.length;
    createSection.mutate(
      {
        pageId: selectedPageId,
        data: {
          blockType: blockType as BlockType,
          props: { ...def?.defaultProps, variant: def?.variants[0]?.id },
          sortOrder: insertIdx,
          isVisible: true,
        },
      },
      {
        onSuccess: () => showToast('success', `${def?.label || blockType} 블록이 추가되었습니다`),
        onError: (err) => showToast('error', `블록 추가 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`),
      },
    );
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
      const sec = template.sections[i]!; // i is bounded by the loop condition
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
    // Both indices are in-bounds (swapIdx is range-checked above; index is a valid item index).
    const tmp = sorted[index]!;
    sorted[index] = sorted[swapIdx]!;
    sorted[swapIdx] = tmp;
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
    if (!moved) return; // fromIdx came from a real drag source, so this is always defined in practice
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
      {/* Block Palette — hidden in content-only (tenants can't add blocks) */}
      {!CONTENT_ONLY && <BlockPalette onAdd={handleAddBlock} />}

      {/* Page List */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
          <h3 className="text-xs font-semibold">페이지</h3>
          <div className="flex gap-1">
            {/* Add-page hidden in content-only — page structure is set up for the tenant. */}
            {!CONTENT_ONLY && <button onClick={handleCreatePage} className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">+ 추가</button>}
          </div>
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
              {/* Page-level structural actions (templates/settings/delete) are
                  hidden in content-only — tenants edit content, not structure. */}
              {!CONTENT_ONLY && (
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
              )}
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
                  // NOTE: this is consumed by <ImageUpload onUpload=…>, which
                  // already client-side resizes (its `resize` prop) before
                  // calling here — do NOT resize again (double-encode). New
                  // direct (non-ImageUpload) callers must resize themselves.
                  const res = await apiClient!.uploadFile(file);
                  return res.url;
                }}
                onDragStart={(e) => handleSectionDragStart(e, index)}
                onDragOver={(e) => handleSectionDragOver(e, index)}
                onDrop={(e) => handleSectionDrop(e, index)}
                dragOverIdx={dragOverIdx}
              />
            ))}

            {/* Block drop zone — hidden in content-only (no adding blocks). */}
            {!CONTENT_ONLY && (
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
            )}
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
