import { z } from 'zod';

export const blockTypes = [
  // Hero (static)
  'hero_banner',
  'hero_full_width',
  // Banner slider (dynamic — linked to admin 배너 관리)
  'banner_slider',
  'hero_image_slider',
  'hero_split',
  // About
  'pastor_message',
  'church_intro',
  'mission_vision',
  // Content (dynamic widgets)
  'recent_sermons',
  'recent_bulletins',
  'online_bulletin',
  'recent_columns',
  'album_gallery',
  'video_board',
  'staff_grid',
  'history_timeline',
  'event_grid',
  'schedule_board',
  'schedule_split',
  'week_schedule',
  // Info grid (예배시간·오시는길 등 한눈에)
  'info_columns',
  'quick_links',
  // Text
  'text_image',
  'text_only',
  'quote_block',
  'custom_html',
  'hero_overlap',
  'sermon_feature',
  'news_split',
  'bento_grid',
  'dashboard_banner',
  // Church Info
  'worship_schedule',
  'worship_times',
  'location_map',
  'map_embed',
  'contact_info',
  'address_info',
  'newcomer_info',
  'visitor_welcome',
  'first_time_guide',
  'giving_info',
  // Media
  'image_gallery',
  'video',
  // CTA
  'call_to_action',
  'newsletter_signup',
  // Layout Block — container with children blocks
  'layout_row',
  'layout_columns',
  'layout_section',
  'divider',
  'section_header',
  'two_columns',
  'three_columns',
  'tabs',
  'accordion',
  // Board
  'board',
  // Contact form (새가족 등록 등)
  'contact_form',
  // 목장(셀) Data Block + 새가족 등록 폼 Static Block
  'cell_grid',
  'newcomer_form',
  // 목장사역보고서 폼 Data Block (form_type=cell_report)
  'cell_report',
  // 폼 빌더로 만든 커스텀 폼 (props.formSlug) + 폼과 텍스트를 2단으로 배치하는 폼 블록.
  // 스토어프론트(@dw-church/blocks)는 이미 렌더하지만 enum 누락으로 저장이 막혀 있었음.
  'custom_form',
  'form_split',
  // Claude Design 시안 블록 — BlockRenderer/BLOCK_DEFS 에는 있었으나 이 enum 누락으로
  // 섹션 추가(POST /sections)가 400 나던 것들. (설교 매거진·특징 그리드·오늘의 말씀·
  // 주보광고·다가오는 행사·단계 목록·버튼 그룹·오시는길·로고 타이틀)
  'sermon_magazine',
  'devotion_reader',
  'cardnews',
  'features_grid',
  'steps_list',
  // b2bsmart 모던 블록 — 렌더러(BLOCK_MAP)엔 있었으나 pages enum 누락으로 저장 400
  // 나던 것들. AI 페이지 생성 다양성(A)에서 사용 + 운영자 수동 추가도 가능하게.
  'cta_section',
  'stats_counter',
  'faq_accordion',
  'testimonials',
  'check_list',
  'verse_of_day',
  'news_announcements',
  'featured_event',
  // 주일설교 묵상 — 대표 설교(설교 모듈) + '이번 주 묵상' 사이드바(말씀·책·기도제목). 에디토리얼 홈용 데이터 블록.
  'sermon_meditation',
  'button_group',
  'directions_split',
  'logo_title',
  // 신규 범용 블록 (2026-09-14) — 어느 테넌트든 쓰는 플랫폼 블록.
  // 서브메뉴 페이지헤더 · 제목+본문+이미지(세로) · 가치 카드그리드 · 항목 리스트.
  'page_subnav',
  'prose_image',
  'values_grid',
  'detail_rows',
  'info_bar',
] as const;

export type BlockType = (typeof blockTypes)[number];

// Page kind — 'static' is a normal page; the *_detail kinds mark a page as
// the builder-designed template for a content type's detail view (blocks
// bind to the current item via DynamicSource).
export const pageKindSchema = z.enum(['static', 'sermon_detail', 'column_detail', 'bulletin_detail']);

export const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  isHome: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
  kind: pageKindSchema.optional(),  // createPage defaults to 'static'
  sortOrder: z.number().int().default(0),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  isHome: z.boolean().optional(),
  status: z.enum(['draft', 'published']).optional(),
  kind: pageKindSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const createSectionSchema = z.object({
  blockType: z.enum(blockTypes),
  props: z.record(z.unknown()).default({}),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
});

export const updateSectionSchema = z.object({
  blockType: z.enum(blockTypes).optional(),
  props: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export const reorderSectionsSchema = z.object({
  ids: z.array(z.string().uuid()),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
