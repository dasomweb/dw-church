/**
 * Map a Claude Design canvas → an ImportSpec (theme styleguide + pages of blocks).
 *
 * The canvas has NO data-block markers (verified against a real export), so block
 * typing + prop extraction is inference: for each page screen we hand Claude the
 * screen's HTML + the block catalog + the rules, and it emits an ordered list of
 * True Light blocks with real content in props. Deterministic bits (screen→slug,
 * sc-for dynamic hints, image URLs, styleguide from _tokens.css) come from parsing.
 */
import { env } from '../../config/env.js';
import { parseCanvas, splitScreensRaw, inferSlug, type ParsedScreen } from './canvas-parse.js';
import { CATALOG_BLOCKS, CONTENT_MODULES } from './catalog.js';

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

export type SystemSlot =
  | 'primary' | 'secondary' | 'accent' | 'text' | 'muted'
  | 'background' | 'border' | 'surface' | 'onDark' | 'onDarkMuted';

export interface Styleguide {
  name: string;
  colors: Partial<Record<SystemSlot, string>>;
  fonts?: { heading?: string; body?: string; korean?: string };
}
export interface SectionSpec { blockType: string; props: Record<string, unknown> }
export interface PageSpec { name: string; slug: string; sections: SectionSpec[]; sortOrder: number }
export interface ImportSpec { styleguide: Styleguide; pages: PageSpec[]; warnings: string[] }

// ── styleguide from _tokens.css ─────────────────────────────────────────────

/** Parse the FIRST :root block's `--name: value;` pairs (light theme). */
function rootVars(css: string): Record<string, string> {
  const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const m of root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!.trim()] = m[2]!.trim();
  return out;
}

export function styleguideFromTokensCss(css: string | undefined, name = 'Claude Design'): Styleguide {
  const v = css ? rootVars(css) : {};
  const pick = (...keys: string[]): string | undefined => { for (const k of keys) if (v[k]) return v[k]; return undefined; };
  const isHex = (s?: string): s is string => !!s && /^#[0-9a-f]{3,8}$/i.test(s);
  const colors: Partial<Record<SystemSlot, string>> = {};
  const set = (slot: SystemSlot, val?: string) => { if (isHex(val)) colors[slot] = val; };
  set('primary', pick('primary', 'brand'));
  set('secondary', pick('brand', 'primary'));
  set('accent', pick('primary', 'brand'));
  set('text', pick('fg'));
  set('muted', pick('fg-muted', 'muted'));
  set('background', pick('bg', 'background'));
  set('surface', pick('surface'));
  set('border', pick('border'));
  const sans = pick('font-sans');
  const fam = sans ? sans.split(',')[0]!.replace(/['"]/g, '').trim() : undefined;
  return { name, colors, fonts: fam ? { heading: fam, body: fam, korean: fam } : undefined };
}

// ── LLM map (per screen) ────────────────────────────────────────────────────

const CATALOG_STR = CATALOG_BLOCKS.map((b) => `- ${b.t} (${b.g}): ${b.d}`).join('\n');
const MODULES_STR = CONTENT_MODULES.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))).join(', ');

const MAP_SYSTEM =
  'You convert ONE screen of a Claude Design church-website mockup (HTML with inline styles) ' +
  'into an ordered list of True Light page blocks. Output ONLY via the emit_page tool.\n' +
  'Rules:\n' +
  '- Use ONLY block_type values from the CATALOG. Each visually distinct section → one block, in order.\n' +
  '- Extract REAL content verbatim into props (title, subtitle, content, verse, worship times, button labels). Never invent; never lorem.\n' +
  '- Dynamic lists rendered via <sc-for list="{{ X }}"> → the matching DATA block ' +
  '(sermons→recent_sermons, news→news_announcements or board, words→verse_of_day, staff→staff_grid, ' +
  'depts→info_columns, worship→worship_schedule, gallery/galleryTop→album_gallery, pastures→cell_grid, ' +
  'events→event_grid). Set its config props (title, limit, variant) but NOT the individual items — the module fills them.\n' +
  '- Static content → static blocks (hero_banner, text_image, features_grid/info_columns, worship_times, location_map, contact_info, quote_block, pastor_message, newcomer_info).\n' +
  '- Use camelCase prop keys matching our elements: title, subtitle, content, imageUrl, backgroundImageUrl, buttonText, buttonUrl, items (arrays), overlayOpacity.\n' +
  '- Keep image src URLs as-is in props (they are re-hosted to R2 later).\n' +
  '- FIRST block of a page is usually hero_banner. Every page ENDS with call_to_action.\n' +
  '- Church tone: never a black/near-black section background.';

interface EmitSection { block_type?: string; blockType?: string; props?: Record<string, unknown> }

const EMIT_TOOL = {
  name: 'emit_page',
  description: 'Emit the ordered blocks for this screen.',
  input_schema: {
    type: 'object',
    properties: {
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: { block_type: { type: 'string' }, props: { type: 'object' } },
          required: ['block_type'],
        },
      },
    },
    required: ['sections'],
  },
} as const;

const VALID_BLOCKS = new Set(CATALOG_BLOCKS.map((b) => b.t));

async function mapScreen(label: string, slug: string, screenHtml: string): Promise<{ sections: SectionSpec[]; warning?: string }> {
  const user =
    `Screen label: ${label}\nPage slug: ${slug}\n\n` +
    `CATALOG (block_type (group): use):\n${CATALOG_STR}\n\n` +
    `CONTENT MODULES (for data blocks): ${MODULES_STR}\n\n` +
    `SCREEN HTML:\n${screenHtml.slice(0, 24000)}`;
  const res = await fetch(ANTHROPIC_BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 8000, temperature: 0.2, system: MAP_SYSTEM,
      tools: [EMIT_TOOL], tool_choice: { type: 'tool', name: 'emit_page' },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) return { sections: [], warning: `${slug}: Claude HTTP ${res.status} ${(await res.text()).slice(0, 160)}` };
  const data = (await res.json()) as { content?: { type: string; input?: { sections?: EmitSection[] } }[] };
  const tool = data.content?.find((b) => b.type === 'tool_use');
  const raw = tool?.input?.sections ?? [];
  const sections: SectionSpec[] = [];
  for (const s of raw) {
    const bt = (s.block_type ?? s.blockType ?? '').trim();
    if (!bt) continue;
    if (!VALID_BLOCKS.has(bt)) { sections.push({ blockType: bt, props: { ...(s.props ?? {}), _unknownBlock: true } }); continue; }
    sections.push({ blockType: bt, props: s.props ?? {} });
  }
  return { sections };
}

// ── orchestration ───────────────────────────────────────────────────────────

export interface MapProgress { (msg: string, done: number, total: number): void }

/** Map the whole canvas → ImportSpec. Only 'page'/'template' screens become pages. */
export async function mapCanvas(
  canvasHtml: string,
  tokensCss: string | undefined,
  churchName: string,
  onProgress: MapProgress = () => {},
): Promise<ImportSpec> {
  const parsed = parseCanvas(canvasHtml);
  const chunks = splitScreensRaw(canvasHtml);
  const chunkByLabel = new Map(chunks.map((c) => [c.label, c.html]));
  const pageScreens = parsed.screens.filter((s) => s.kind === 'page' && s.slug);
  const warnings = [...parsed.warnings];

  const pages: PageSpec[] = [];
  let done = 0;
  for (const screen of pageScreens) {
    onProgress(`매핑 중: ${screen.label}`, done, pageScreens.length);
    const html = chunkByLabel.get(screen.label) ?? '';
    const { sections, warning } = await mapScreen(screen.label, screen.slug, html);
    if (warning) warnings.push(warning);
    // guarantee a trailing CTA if the model forgot
    if (sections.length && !/call_to_action|cta_section/.test(sections[sections.length - 1]!.blockType)) {
      sections.push({ blockType: 'call_to_action', props: {} });
    }
    pages.push({ name: cleanName(screen.label), slug: screen.slug, sections, sortOrder: pages.length });
    done += 1;
  }
  onProgress('매핑 완료', done, pageScreens.length);

  return { styleguide: styleguideFromTokensCss(tokensCss, churchName), pages, warnings };
}

function cleanName(label: string): string {
  return label.replace(/^\s*\d+\s*[-.]?\s*/, '').replace(/\s*·.*$/, '').trim() || label;
}

/** All image URLs in the canvas (for the R2 re-host step). */
export function canvasImageUrls(canvasHtml: string): string[] {
  return parseCanvas(canvasHtml).imageUrls;
}

export type { ParsedScreen };
export { inferSlug };
