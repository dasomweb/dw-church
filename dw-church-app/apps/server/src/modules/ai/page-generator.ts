/**
 * AI Page Generator — generates page block composition from a prompt.
 * Uses Gemini to understand the request and outputs a structured block list.
 * Then creates the page + sections via the existing pages service.
 */

import { generateText } from './service.js';
import * as pageService from '../pages/service.js';
import { blockTypes } from '../pages/schema.js';

interface GeneratedBlock {
  blockType: string;
  props: Record<string, unknown>;
}

interface GeneratedPage {
  title: string;
  slug: string;
  blocks: GeneratedBlock[];
}

// 디자인 시스템 울타리(C): 블록별 허용 variant/옵션. AI 가 임의 값(grid-5 등)을
// 넣으면 블록이 깨지므로, 생성 후 허용 목록 밖의 값은 제거해 블록 기본값으로 되돌린다.
// A(다양성): 모던 블록의 variant 를 열어 AI 가 같은 블록도 여러 모양으로 쓰게 한다.
const ALLOWED_ENUM_PROPS: Record<string, Record<string, string[]>> = {
  recent_sermons: { variant: ['grid-2', 'grid-3', 'grid-4', 'list', 'featured', 'card'] },
  recent_bulletins: { variant: ['grid-2', 'grid-3', 'grid-4', 'list'] },
  recent_columns: { variant: ['grid-2', 'grid-3', 'grid-4', 'list'] },
  album_gallery: { variant: ['grid-2', 'grid-3', 'grid-4'] },
  staff_grid: { variant: ['grid-2', 'grid-3', 'grid-4', 'grouped'] },
  event_grid: { variant: ['cards-2', 'cards-3', 'cards-4'] },
  hero_banner: {
    variant: ['image-overlay', 'split-image', 'photo-scrim', 'text-only', 'page-hero'],
    height: ['sm', 'md', 'lg', 'lg-plus', 'xl', 'full'],
    layout: ['full', 'contained'],
    width: ['full-bleed', 'contained'],
    scrimSide: ['left', 'right'],
    imageSide: ['left', 'right'],
  },
  text_image: { variant: ['left', 'right', 'center'] },
  quote_block: { variant: ['card', 'simple', 'highlight', 'verse'] },
  features_grid: { variant: ['compact', 'image-card', 'icon-large'], columns: ['2', '3', '4'], align: ['left', 'center', 'right'] },
  values_grid: { columns: ['2', '3', '4'] },
  info_columns: { columns: ['2', '3', '4'] },
  steps_list: { layout: ['grid', 'vertical'] },
  cta_section: { variant: ['boxed-card', 'inline-banner', 'image-overlay', 'split-image', 'stats-strip', 'contact-info'], align: ['left', 'center', 'right'] },
  call_to_action: { variant: ['centered', 'split', 'banner'] },
  info_bar: { align: ['left', 'center'] },
};

// 모든 블록에 공통 적용되는 enum(섹션 배경 리듬 / 정렬). 교회 톤이라 dark 밴드는
// 허용하지 않는다(토큰 계약: 넓은 다크 섹션 금지) → none/subtle/accent 만.
const GLOBAL_ENUM_PROPS: Record<string, string[]> = {
  bgMode: ['none', 'subtle', 'accent'],
  textAlign: ['left', 'center', 'right'],
  align: ['left', 'center', 'right'],
};

// 스타일을 직접 지정하는 임의 값은 디자인 시스템(테마 토큰)이 통제해야 하므로
// props 에서 제거한다 — AI 가 hex 색·px·폰트명을 박아넣어 SoT 를 우회하는 것 방지.
const FORBIDDEN_STYLE_PROP_KEYS = new Set([
  'color', 'backgroundColor', 'fontFamily', 'fontSize', 'borderRadius', 'padding', 'margin',
]);

/** 생성된 블록 props 를 디자인 시스템 울타리로 정제한다. */
function sanitizeBlockProps(blockType: string, props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const enums = ALLOWED_ENUM_PROPS[blockType] ?? {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (FORBIDDEN_STYLE_PROP_KEYS.has(k)) continue; // 임의 스타일 제거(토큰이 통제)
    // 허용 목록: 블록별 enum 이 우선, 없으면 전역 enum(bgMode/정렬). 허용 밖 값은
    // 제거해 블록 기본값으로 되돌린다(깨짐/규격이탈 방지).
    const allowed = enums[k] ?? GLOBAL_ENUM_PROPS[k];
    if (allowed && typeof v === 'string' && !allowed.includes(v)) continue;
    out[k] = v;
  }
  return out;
}

// Block descriptions for AI context. EVERY block also accepts the modern knobs:
//   eyebrow  : a small uppercase label above the heading (use it to vary sections)
//   bgMode   : section background rhythm — "none" | "subtle" | "accent"
//              (alternate none↔subtle down the page; NEVER dark — church tone stays light)
//   textAlign: "left" | "center" | "right"
const BLOCK_DESCRIPTIONS = `
Available block types. Pick freely to compose a DISTINCT page — do NOT emit the
same handful every time. Prefer the modern content blocks over plain text_only.

── HERO (always the first section; pick the VARIANT that fits the content) ──
- hero_banner: { variant, eyebrow, title, subtitle, backgroundImageUrl, imageUrl, buttonText, buttonUrl, secondaryButtonText, secondaryButtonUrl, height, textAlign, scrimSide }
    variant:
      image-overlay = full-bleed photo + dark overlay, light centered text (bold landing)
      photo-scrim   = full-bleed photo + LIGHT side scrim, dark text (warm church home) — set scrimSide left/right
      split-image   = 50/50 text + side image (about / ministry intro) — uses imageUrl + imageSide
      text-only     = no photo, brand-gradient panel (minimal)
      page-hero     = compact sub-page header strip (interior pages)

── CONTENT / DESIGN blocks (author real Korean copy) ──
- prose_image: { eyebrow, title, body(HTML), imageUrl, imagePosition(below/above) } — 굵은 밑줄 제목 + 본문 + 전체폭 이미지 (설립목적/소개 줄글)
- text_image: { eyebrow, title, subtitle, content(HTML), imageUrl, variant(left/right/center), buttonText, buttonUrl }
- text_only: { title, content(HTML) } — 약관/줄글 전용, 되도록 위 블록들을 우선
- values_grid: { title, columns(2/3/4), items:[{overline, title, description}] } — 핵심 가치/약속 카드(오버라인 라벨 포함)
- features_grid: { eyebrow, title, subtitle, columns, variant(compact/image-card/icon-large), items:[{title, description, iconName, imageUrl}] } — 사역/특징 카드
- detail_rows: { title, intro, items:[{title, label, description, meta}] } — 방향/원칙 정의형 리스트(좌 제목·우 설명)
- steps_list: { eyebrow, title, items:[{title, description}], layout(grid/vertical) } — 단계/절차(등록 절차 등)
- info_columns: { title, columns, items:[{title, rows:[{label, value}]}] } — 예배시간/오시는길 한눈에(라벨+값)
- info_bar: { items:[{label, value}], background(primary/accent/surface), align } — 컬러 밴드 예배시간 바
- quote_block: { eyebrow, quote, source, reference, variant(card/simple/highlight/verse) } — 성경구절/한 줄 인용
- stats_counter: { title, columns, items:[{value, label, unit}] } — 숫자 강조
- faq_accordion: { title, items:[{question, answer}] }
- testimonials: { title, items:[{quote, author, role}] } — 간증/후기
- pastor_message: { eyebrow, title, pastorName, pastorTitle, message(HTML), imageUrl }
- worship_times: { title, services:[{name, day, time, location}] }
- worship_schedule: { title } / schedule_board: { title, imagePosition }
- newcomer_info: { title, subtitle, content(HTML), imageUrl, buttonText, buttonUrl }
- giving_info: { title, intro }
- location_map / map_embed: { title, address }
- contact_info: { title } (주소/전화는 설정에서 자동)
- image_gallery: { title, images[] }
- video: { title, youtubeUrl }
- divider: {}

── CTA (end most pages with one; vary the variant) ──
- cta_section: { variant(boxed-card/inline-banner/image-overlay/split-image/contact-info), eyebrow, title, subtitle, buttonText, buttonUrl, secondaryButtonText, secondaryButtonUrl }

── DYNAMIC blocks (data from DB; you set DISPLAY only, items load at render) ──
- recent_sermons: { title, limit, variant(grid-2/grid-3/grid-4/list/featured/card) }
- recent_bulletins: { title, limit, variant(grid-2/grid-3/grid-4/list) }
- online_bulletin: { } — 온라인 주보(최신 발행분 전체 스크롤). 주보 페이지에.
- recent_columns: { title, limit, variant }
- album_gallery: { title, limit, variant }
- staff_grid: { title, limit, variant(grid-2/grid-3/grid-4/grouped) }
- event_grid: { title, limit, variant(cards-2/cards-3/cards-4) }
- history_timeline: { title } · board: { title, boardSlug } · banner_slider: { title }
- cell_grid: { title, limit } · sermon_magazine: { title }
`;

// Page composition guidance — Korean / immigration church. These are PRINCIPLES
// and a BLOCK MENU, NOT a fixed sequence. Compose each page yourself so it feels
// distinct: choose the block order, pick each block's variant, and vary section
// backgrounds. Do NOT reproduce one canned block list every time.
const PAGE_GUIDELINES = `
COMPOSITION PRINCIPLES (follow these; you decide the actual order + variants):

1. Open with ONE hero_banner. Pick the variant to match the page:
   photo-scrim (warm home/about with a photo), image-overlay (bold landing),
   split-image (about/ministry with a side photo), page-hero (compact sub-page),
   text-only (no photo). Vary it — don't always use the same hero.
2. Build a RHYTHM: alternate section bgMode "none" ↔ "subtle" down the page so
   sections don't blur together (occasional "accent" for one emphasis section).
   Never use dark backgrounds (church tone = light & warm).
3. Use EYEBROWS (small labels) on major sections to add structure.
4. Prefer the modern content blocks (values_grid / features_grid / detail_rows /
   prose_image / steps_list / quote_block / stats_counter) over plain text_only.
   Vary block TYPES — a good page mixes 4-6 different block types, not the same one.
5. End most pages with a cta_section (vary its variant), unless the page IS a pure
   list (sermons/gallery) where the dynamic block is the finale.
6. Dynamic blocks (recent_sermons/bulletins/columns, album_gallery, staff_grid,
   event_grid, board, online_bulletin…) carry DISPLAY config only — items load from
   the DB. Pick a fitting variant (grid vs list vs featured).

BLOCK MENU by page purpose (pick + arrange + choose variants yourself):
- 홈(home): hero → (values_grid 핵심가치 | features_grid 사역) → recent_sermons →
  worship_times/info_bar 예배시간 → event_grid 소식 → newcomer_info/cta_section
- 교회소개(about): hero(split-image/photo-scrim) → pastor_message 인사말 →
  prose_image 설립목적/비전 → values_grid 핵심가치 → detail_rows 목회방향 → quote_block 말씀
- 교역자(staff): hero(page-hero) → staff_grid(grouped 직분별) → cta_section 문의
- 예배안내(worship): hero → info_bar/worship_times 예배시간 → steps_list 처음오시는분 → location_map
- 주보: hero → online_bulletin (또는 recent_bulletins grid-4)
- 설교(sermons): hero → recent_sermons(grid-3/featured) → sermon_magazine
- 갤러리: hero → album_gallery(grid-3/grid-4)
- 소식/공지: hero → event_grid(cards-3) 또는 board
- 새가족: hero → newcomer_info(이중언어) → steps_list 등록절차 → worship_times → location_map → cta_section
- 헌금: hero → giving_info → prose_image 헌금방법(Zelle/Check) → cta_section
- 연락처: hero(page-hero) → contact_info → location_map

CONTENT RULES:
- Author natural, ready-to-use Korean copy for every text field (no lorem, no English labels).
- worship_times services 예: 주일1부(오전 9:00), 주일2부(오전 11:00), 수요예배(저녁 7:30), 금요기도회(저녁 8:00).
- 이민교회 톤: 필요 시 한/영 병기(새가족·헌금), 미국 현지 타임존, YouTube 설교 우선.
- board 는 boardSlug 를 영문으로.
`;

/**
 * Generate a page structure from a natural language prompt.
 * Returns the generated page definition without saving.
 */
export async function generatePageFromPrompt(prompt: string): Promise<GeneratedPage> {
  const systemContext = `You are a church website page builder AI.
Given a user's request, generate a page with appropriate blocks.

${BLOCK_DESCRIPTIONS}

${PAGE_GUIDELINES}

ADDITIONAL RULES:
- Output ONLY valid JSON, no markdown, no explanation
- DESIGN SYSTEM GUARDRAIL: the tenant's theme (design tokens) controls ALL colors,
  fonts, radius, spacing and shadows. NEVER put hex colors, px sizes, font names,
  padding/margin, or any arbitrary styling into props. Only set content (text, urls)
  and the listed enum options (variant/height/layout) using EXACTLY the allowed values.
- Use ONLY the block types and the variant values listed above — never invent new ones.
- Use Korean for all content (titles, text).
- COMPOSE for variety: YOU choose the block order, each block's variant, and each
  section's bgMode (none/subtle/accent) rhythm. Two different pages must NOT come out
  with the same block sequence. Mix 4-6 different block types per page.
- Start with ONE hero_banner, and PICK its variant to fit the page (photo-scrim /
  image-overlay / split-image / page-hero / text-only) — don't default to the same one.
- Prefer modern content blocks (values_grid / features_grid / detail_rows / prose_image /
  steps_list / quote_block / stats_counter) over plain text_only.
- Dynamic pages (sermons/staff/gallery/bulletins…) use the matching dynamic block + a fitting variant.
- Add an eyebrow to major sections; end most pages with a cta_section (varied variant).
- Generate a slug from the page title (lowercase, hyphens, English or Korean romanization).
- Fill in realistic Korean church content for text fields.

Output format (props vary per block — set variant/eyebrow/bgMode/items as needed):
{
  "title": "페이지 제목",
  "slug": "page-slug",
  "blocks": [
    { "blockType": "hero_banner", "props": { "variant": "photo-scrim", "eyebrow": "...", "title": "...", "subtitle": "...", "buttonText": "...", "height": "lg" } },
    { "blockType": "values_grid", "props": { "eyebrow": "...", "title": "...", "columns": "3", "bgMode": "subtle", "items": [ { "overline": "...", "title": "...", "description": "..." } ] } },
    { "blockType": "cta_section", "props": { "variant": "boxed-card", "title": "...", "buttonText": "...", "buttonUrl": "..." } }
  ]
}`;

  const response = await generateText(prompt, systemContext);

  // Parse JSON from response (strip markdown code blocks if present)
  const jsonStr = response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed: GeneratedPage;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
  }

  // Validate block types (화이트리스트) + 디자인 시스템 울타리로 props 정제.
  const validTypes = new Set(blockTypes as readonly string[]);
  parsed.blocks = parsed.blocks
    .filter((b) => validTypes.has(b.blockType))
    .map((b) => ({ ...b, props: sanitizeBlockProps(b.blockType, b.props) }));

  if (parsed.blocks.length === 0) {
    throw new Error('유효한 블록이 생성되지 않았습니다.');
  }

  // Ensure slug is clean
  parsed.slug = parsed.slug
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return parsed;
}

/**
 * Generate AND save a page from prompt.
 * Creates the page and all sections in the tenant schema.
 */
export async function createPageFromPrompt(
  schema: string,
  prompt: string,
): Promise<{ page: { id: string; title: string; slug: string }; sections: number }> {
  const generated = await generatePageFromPrompt(prompt);

  // Get max sort order for new page
  const pages = await pageService.listPages(schema);
  const maxOrder = pages.length > 0 ? Math.max(...pages.map((p) => p.sort_order)) + 1 : 0;

  // Create the page
  const page = await pageService.createPage(schema, {
    title: generated.title,
    slug: generated.slug,
    isHome: false,
    status: 'published',
    sortOrder: maxOrder,
  });

  // Create sections
  for (let i = 0; i < generated.blocks.length; i++) {
    const block = generated.blocks[i]!;
    await pageService.createSection(schema, page.id, {
      blockType: block.blockType as any,
      props: block.props,
      sortOrder: i,
      isVisible: true,
    });
  }

  return { page: { id: page.id, title: page.title, slug: page.slug }, sections: generated.blocks.length };
}
