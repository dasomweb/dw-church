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

/**
 * Generate a page structure from a natural language prompt.
 * Returns the generated page definition without saving.
 */
export async function generatePageFromPrompt(prompt: string): Promise<GeneratedPage> {
  const systemContext = `You are a church website page builder AI.
Given a user's request, generate a page with appropriate blocks.

${BLOCK_DESCRIPTIONS}

RULES:
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
