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

// Block descriptions for AI context
const BLOCK_DESCRIPTIONS = `
Available block types and their props:

STATIC BLOCKS (content stored in props):
- hero_banner: { title, subtitle, height(sm/md/lg/full), layout(full/contained), overlayColor, overlayOpacity }
- text_image: { title, content, imageUrl }
- text_only: { title, content }
- pastor_message: { title, name, message, photoUrl }
- church_intro: { title, content, imageUrl }
- mission_vision: { title, content }
- worship_times: { title, services: [{name, day, time, location}] }
- location_map: { title, address }
- contact_info: { title, phone, address, email }
- newcomer_info: { title, content, imageUrl }
- image_gallery: { title, images[] }
- video: { title, youtubeUrl }
- quote_block: { title, content }
- divider: {}

DYNAMIC BLOCKS (data from DB, props control display):
- recent_sermons: { title, limit(number), variant(grid-2/grid-3/grid-4) }
- recent_bulletins: { title, limit, variant }
- recent_columns: { title, limit, variant }
- album_gallery: { title, limit, variant }
- staff_grid: { title, limit, variant }
- event_grid: { title, limit, variant(cards-2/cards-3/cards-4) }
- history_timeline: { title }
- board: { title, boardSlug }
- banner_slider: { title }
`;

// Page composition guidelines — typical Korean church page structures
const PAGE_GUIDELINES = `
CHURCH PAGE COMPOSITION GUIDELINES (Korean church standard):

홈 (home):
  hero_banner → banner_slider → recent_sermons(limit:4) → recent_bulletins(limit:4) → event_grid(limit:4)

교회 소개 (about):
  hero_banner → church_intro(교회 소개 텍스트+이미지) → mission_vision(비전/미션) → quote_block(교회 표어/성경구절)

담임목사 인사말 (pastor-greeting):
  hero_banner → pastor_message(목사 이름+인사말+사진) → quote_block(좋아하는 말씀)

비전/미션 (vision):
  hero_banner → mission_vision(비전 선언문) → text_image(핵심가치) → quote_block(비전 성경구절)

교회 연혁 (history):
  hero_banner → history_timeline → text_image(교회 사진+설명)

교역자 소개 (staff):
  hero_banner → staff_grid(variant:grid-4)

오시는 길 (directions):
  hero_banner → location_map(주소) → contact_info(전화/이메일) → text_image(주차 안내 등)

예배 안내 (worship):
  hero_banner → worship_times(예배 시간표) → text_image(예배 안내 상세) → location_map

새가족 안내 (newcomer):
  hero_banner → newcomer_info(환영 메시지) → text_image(등록 절차) → worship_times → location_map

설교 (sermons):
  hero_banner → recent_sermons(limit:12, variant:grid-4)

주보 (bulletins):
  hero_banner → recent_bulletins(limit:12, variant:grid-4)

목회칼럼 (columns):
  hero_banner → recent_columns(limit:12, variant:grid-3)

앨범/갤러리 (albums):
  hero_banner → album_gallery(limit:12, variant:grid-4)

교회 소식 (events):
  hero_banner → event_grid(limit:12, variant:cards-3)

교육부 (edu-children, edu-youth, edu-young-adult):
  hero_banner → text_image(부서 소개) → text_image(교육 목표) → board(boardSlug: 해당 부서 slug)

선교 (mission):
  hero_banner → text_image(선교 비전) → board(boardSlug: mission)

게시판 (custom board page):
  hero_banner → board(boardSlug: 해당 게시판)

RULES:
- hero_banner는 항상 첫 블록
- 정적 블록 content에는 실제 교회에서 사용할 수 있는 자연스러운 한국어 문구 작성
- worship_times의 services에는 실제 교회 예배 형태 반영 (주일1부, 주일2부, 수요, 금요 등)
- 동적 블록(recent_sermons 등)은 표시 설정만 (실제 데이터는 관리자가 등록)
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
- Use Korean for all content (titles, text)
- Choose blocks that best match the user's intent
- Always start with hero_banner (height: "md", layout: "full")
- For content pages, use text_image or text_only blocks with meaningful placeholder text
- For dynamic content pages (sermons, staff, etc), use the appropriate dynamic block
- Generate a slug from the page title (lowercase, hyphens, English or Korean romanization)
- Fill in realistic Korean church content for text fields

Output format:
{
  "title": "페이지 제목",
  "slug": "page-slug",
  "blocks": [
    { "blockType": "hero_banner", "props": { "title": "...", "subtitle": "...", "height": "md", "layout": "full" } },
    { "blockType": "...", "props": { ... } }
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

  // Validate block types
  const validTypes = new Set(blockTypes as readonly string[]);
  parsed.blocks = parsed.blocks.filter((b) => validTypes.has(b.blockType));

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
