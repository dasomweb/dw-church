import { prisma } from '../../../config/database.js';
import { env } from '../../../config/env.js';
import { AppError } from '../../../middleware/error-handler.js';
import { createSection } from '../../pages/service.js';
import { mapSectionToBlock, type SectionSpec } from '../build-pages/pattern-map.js';

/**
 * Verbatim handoff import. The operator pastes existing page content; an LLM
 * STRUCTURES it (does NOT rewrite) into typed sections, then the deterministic
 * pattern-map turns each section into a block. The user's text is preserved
 * word-for-word — the AI only decides section boundaries / type / list shape.
 */

const MODEL = 'claude-sonnet-4-6';

// Section types the structurer may assign — must align with pattern-map keys so
// the deterministic mapper recognizes them.
const ALLOWED_TYPES = [
  'hero', 'about', 'features', 'services', 'steps', 'process', 'stats',
  'faq', 'team', 'pricing', 'testimonials', 'gallery', 'text-image',
  'quote', 'list', 'cta', 'contact',
];

const SYSTEM_PROMPT = `You are a content STRUCTURER for a website builder. You are NOT a writer.

You receive raw page content (pasted by an operator). Split it into sections and classify each so a layout engine can place the right block.

ABSOLUTE RULES:
1. VERBATIM. Copy every piece of text EXACTLY as given — never rewrite, translate, summarize, paraphrase, shorten, fix typos, or invent text. Every title / subtitle / description / item text you output MUST appear character-for-character in the input.
2. STRUCTURE ONLY. Your job is to (a) find section boundaries, (b) pick each section's type, (c) extract list items, (d) detect ordered vs unordered lists.
3. Do NOT add sections, headings, CTAs, or items that are not in the input.
4. Keep the input's original language. Do not translate.

For each section choose "sectionType" from EXACTLY this list:
${ALLOWED_TYPES.join(', ')}
(hero = top banner / headline; features/services = card-like groups; steps/process = ordered how-to; stats = short numbers; faq = Q&A; team = people; pricing = plans; testimonials = quotes from people; gallery = images; text-image = one block of prose; quote = a single quotation; list = a simple bullet/numbered list; cta = a call to action; contact = contact info.)

Signals to set:
- "ordered": true when the list is numbered (1. 2. 3.), false for bullets.
- For grouped items, put each in "items": [{ "title": "...", "description": "...", "value": "...", "label": "...", "name": "...", "price": "...", "role": "...", "quote": "...", "author": "..." }] — include ONLY the fields that exist in the source, all verbatim.

Output STRICT JSON only (no markdown fences):
{ "sections": [ { "sectionType": "...", "title": "...", "subtitle": "...", "description": "...", "ordered": false, "items": [...] } ] }
Omit fields that don't apply. If the input has no usable content, return { "sections": [] }.`;

interface StructuredSection extends SectionSpec {
  ordered?: boolean;
}

export async function structureContent(rawText: string): Promise<StructuredSection[]> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError('AI_NOT_CONFIGURED', 503, 'AI가 설정되지 않았습니다 (ANTHROPIC_API_KEY).');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawText.slice(0, 24000) }],
    }),
  });
  const data = (await res.json()) as { content?: Array<{ text?: string }>; error?: { message?: string } };
  if (!res.ok) {
    throw new AppError('AI_API_ERROR', 502, `LLM 호출 실패: ${data?.error?.message || `HTTP ${res.status}`}`);
  }
  const text = data.content?.map((c) => c.text ?? '').join('') ?? '';
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: { sections?: StructuredSection[] };
  try {
    parsed = JSON.parse(json);
  } catch {
    // last resort: pull the first {...} block
    const m = json.match(/\{[\s\S]*\}/);
    if (!m) throw new AppError('AI_PARSE_ERROR', 502, 'AI 응답을 해석하지 못했습니다.');
    parsed = JSON.parse(m[0]);
  }
  return Array.isArray(parsed.sections) ? parsed.sections : [];
}

export async function importContentToPage(
  schema: string,
  pageId: string,
  rawText: string,
): Promise<{ created: number; skipped: number; sections: unknown[] }> {
  if (!rawText.trim()) throw new AppError('EMPTY_CONTENT', 400, '붙여넣은 내용이 없습니다.');

  const sections = await structureContent(rawText);

  // Append after any existing sections on the page.
  const rows = await prisma.$queryRawUnsafe<{ max: number | null }[]>(
    `SELECT MAX(sort_order) AS max FROM "${schema}".page_sections WHERE page_id = $1::uuid`,
    pageId,
  );
  let sortOrder = (rows[0]?.max ?? -1) + 1;

  let created = 0;
  let skipped = 0;
  const createdRows: unknown[] = [];

  for (const spec of sections) {
    const mapped = mapSectionToBlock(spec);
    if (!mapped) { skipped++; continue; }
    const row = await createSection(schema, pageId, {
      blockType: mapped.blockType as 'hero_banner',
      props: mapped.props,
      sortOrder,
      isVisible: true,
    });
    createdRows.push(row);
    sortOrder++;
    created++;
  }

  return { created, skipped, sections: createdRows };
}
