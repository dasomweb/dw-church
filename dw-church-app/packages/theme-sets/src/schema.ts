/**
 * ThemeSet — bundles design tokens + layout configuration + page-template
 * compositions into one selectable design system. A tenant picks ONE
 * theme set, and that determines:
 *
 *   - colors / typography / spacing / radius / shadows (DesignTokens)
 *   - header / footer / container layout shape
 *   - default page compositions for common church pages
 *     (home / vision / history / staff / sermons / contact / ...)
 *
 * Two-tier product (project_two_tier_product memory):
 *   Basic = pick a theme set + INTAKE form → live site in 10 min
 *   Pro/Enterprise = + AI builder for deviations from theme set defaults
 *
 * v1 ships theme sets hardcoded in TS modules under `./sets/`. Future
 * iterations may persist them in `public.theme_sets` for user-editable
 * theme sets (Enterprise feature), but the structural contract stays
 * here as the canonical schema both code-defined and DB-defined sets
 * conform to.
 */
import { z } from 'zod';
import { designTokensSchema } from '@dw-church/design-tokens';

// ─── Layout configuration ────────────────────────────────────
//
// Replaces the hardcoded BORDER_RADIUS_MAP / CONTENT_WIDTH_MAP /
// CARD_SHADOW_MAP objects in apps/web/app/tenant/[slug]/layout.tsx.
// Each value drives a `--dw-*` CSS variable (or compiles into a
// className lookup) at SSR time.

export const headerVariantSchema = z.enum([
  'default',      // 좌측 로고 + 우측 nav
  'centered',     // 로고 위 + nav 가운데
  'transparent',  // 배경 없음 (히어로 위에 겹침)
  'dark',         // 다크 배경 + 라이트 텍스트
  'minimal',      // 로고만, nav 햄버거 토글
]);

export const footerVariantSchema = z.enum([
  'three-column', // 좌: 브랜드, 중: 연락처, 우: 소셜
  'centered',     // 모두 중앙 정렬
  'minimal',      // copyright 한 줄
  'dark',         // 다크 배경
]);

export const contentWidthSchema = z.enum([
  'narrow',       // 768px
  'default',      // 1024px
  'wide',         // 1280px
  'full',         // 100%
]);

export const cardStyleSchema = z.enum([
  'shadow',       // 부드러운 그림자
  'border',       // 1px 테두리
  'flat',         // 둘 다 없음
  'elevated',     // 큰 그림자
]);

export const themeSetLayoutSchema = z.object({
  header: headerVariantSchema,
  footer: footerVariantSchema,
  contentWidth: contentWidthSchema,
  cardStyle: cardStyleSchema,
  // Sermon grid density — 화면 폭이 충분하면 이 숫자가 column 수.
  sermonGrid: z.number().int().min(2).max(6),
}).strict();

// ─── Page templates ──────────────────────────────────────────
//
// "교회 비전" 같은 표준화된 페이지 종류에 대해, 어떤 블록을 어떤 순서로
// 어떤 props 로 채울지 정의. INTAKE 폼의 placeholder 토큰
// (`$INTAKE.churchVisionTitle` 같은) 이 props 안에 들어있어, 자동
// 빌더가 INTAKE 데이터로 치환해 실제 page_sections 를 만듦.

export const pageTemplateBlockSchema = z.object({
  blockType: z.string(),                              // 'hero_banner', 'text_image' 등
  props: z.record(z.unknown()),                       // 토큰화된 props
});

export const pageTemplateSchema = z.object({
  /** 라우트 slug — `home`, `vision`, `history`, `staff` 등 */
  slug: z.string(),
  /** 운영자에게 보이는 이름 — "교회 비전" */
  title: z.string(),
  /** 짧은 설명 — picker UI 에 표시 */
  description: z.string().optional(),
  /** Basic 사용자 onboarding 시 자동 생성할지 여부 (home/vision/contact 는 true) */
  defaultEnabled: z.boolean(),
  /** 블록 목록 — page_sections row 로 풀어짐 */
  blocks: z.array(pageTemplateBlockSchema),
});

// ─── Theme set ────────────────────────────────────────────────

export const themeSetMetaSchema = z.object({
  /** 안정적인 식별자 — "modern-light", "traditional-formal" */
  id: z.string().regex(/^[a-z0-9-]+$/, 'kebab-case 만 허용'),
  /** 운영자에게 보이는 이름 */
  name: z.string(),
  /** 한 줄 설명 — picker 카드에 표시 */
  description: z.string(),
  /** preview 이미지 — 1200x800 권장, R2 hosted */
  previewImageUrl: z.string(),
  /** 타깃 분위기 키워드 (검색/필터용) — "모던", "따뜻한", "전통" */
  tags: z.array(z.string()),
  /** 추천 대상 한 문장 — "도시 교회 / 4000명 규모" */
  recommendedFor: z.string().optional(),
});

export const themeSetSchema = z.object({
  meta: themeSetMetaSchema,
  tokens: designTokensSchema,
  layout: themeSetLayoutSchema,
  pageTemplates: z.array(pageTemplateSchema),
}).strict();

export type HeaderVariant = z.infer<typeof headerVariantSchema>;
export type FooterVariant = z.infer<typeof footerVariantSchema>;
export type ContentWidth = z.infer<typeof contentWidthSchema>;
export type CardStyle = z.infer<typeof cardStyleSchema>;
export type ThemeSetLayout = z.infer<typeof themeSetLayoutSchema>;
export type PageTemplate = z.infer<typeof pageTemplateSchema>;
export type PageTemplateBlock = z.infer<typeof pageTemplateBlockSchema>;
export type ThemeSetMeta = z.infer<typeof themeSetMetaSchema>;
export type ThemeSet = z.infer<typeof themeSetSchema>;
