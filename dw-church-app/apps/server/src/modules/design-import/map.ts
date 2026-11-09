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
import { CATALOG_BLOCKS, CONTENT_MODULES, BLOCK_ALIASES, TYPOGRAPHY_WARN } from './catalog.js';

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

export type SystemSlot =
  | 'primary' | 'secondary' | 'accent' | 'text' | 'muted'
  | 'background' | 'border' | 'surface' | 'onDark' | 'onDarkMuted';

export type ScaleName = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption';
export interface Styleguide {
  name: string;
  colors: Partial<Record<SystemSlot, string>>;
  fonts?: { heading?: string; body?: string; korean?: string };
  /** Type scale (px + weight) extracted from the canvas → tokensV2.typography.scales.
   *  Without this, imports keep the default h1=72px → "abnormally large" headings. */
  scale?: Partial<Record<ScaleName, { size: number; weight?: number }>>;
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

/**
 * Extract a type scale (px + heading weight) from the canvas's inline font-size
 * declarations so the design's actual sizes reach tokensV2.typography.scales.
 * The canvas uses arbitrary px (e.g. hero 56, section 28, card 20, body 15) — we
 * bucket them into our named scales. Heuristic, but far better than the 72px
 * default that made imported heroes "abnormally large".
 */
export function extractTypeScale(html: string): Partial<Record<ScaleName, { size: number; weight?: number }>> {
  const sizes = [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].map((m) => parseFloat(m[1]!)).filter((n) => n >= 8 && n <= 160);
  if (sizes.length === 0) return {};
  const uniqDesc = [...new Set(sizes)].sort((a, b) => b - a);
  const mode = (arr: number[]): number | undefined => {
    if (!arr.length) return undefined;
    const c = new Map<number, number>();
    for (const n of arr) c.set(n, (c.get(n) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0];
  };
  // Dominant heading weight (>=600) — church designs are usually 700/800.
  const weights = [...html.matchAll(/font-weight:\s*(\d{3})/gi)].map((m) => parseInt(m[1]!, 10)).filter((w) => w >= 600);
  const headW = mode(weights) ?? 800;

  // Body = the dominant real body size (14–18); 13-and-below is caption/label.
  const body = mode(sizes.filter((s) => s >= 14 && s <= 18)) ?? 16;
  // Headings = distinct sizes ABOVE body. Snap each level to a real canvas size
  // near its ideal ratio of h1 (h2≈0.70, h3≈0.48, h4≈0.36) AND strictly below
  // the level above — so adjacent design sizes (34/32) don't collapse into
  // near-equal h3/h4; we get a properly stepped scale (e.g. 56/40/26/20).
  const heads = uniqDesc.filter((s) => s > body);
  const pickBelow = (target: number, prev: number): number => {
    const cands = heads.filter((s) => s < prev);
    if (cands.length === 0) return Math.max(body + 2, Math.min(Math.round(target), prev - 2));
    return cands.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best), cands[0]!);
  };
  const h1 = Math.min(heads[0] ?? Math.round(body * 3.2), 72);
  const h2 = pickBelow(h1 * 0.70, h1);
  const h3 = pickBelow(h1 * 0.48, h2);
  const h4 = pickBelow(h1 * 0.36, h3);
  const caption = uniqDesc.filter((s) => s <= 13).sort((a, b) => b - a)[0] ?? Math.max(10, body - 3);
  return {
    h1: { size: h1, weight: headW },
    h2: { size: h2, weight: headW },
    h3: { size: h3, weight: Math.max(600, headW - 100) },
    h4: { size: h4, weight: 600 },
    body: { size: body, weight: 400 },
    caption: { size: caption, weight: 400 },
  };
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
  '- Church tone: never a black/near-black section background.\n' +
  // 2026-11-09: "이 블록들은 쓰지 말고 저걸 써라" 목록을 뺐다. 그 목록은 타이포가
  // 하드코딩된 블록을 다른 블록으로 바꾸게 했는데, 그건 **시안의 구조를 버리는 일**이고
  // schedule_board(Data Block) 의 경우 데이터 출처까지 없앴다. 타이포 결함은 우리 쪽
  // 결함이므로 블록을 고쳐서 해결한다 — 매핑에서 숨기지 않고 경고로 올린다.
  '- Keep the mockup STRUCTURE. Never swap a section for a different block type because another one ' +
  'looks simpler or more generic — the structure is the thing we are importing.\n' +
  '- If NO catalog block reproduces the section, emit your best-guess block_type anyway; it is flagged ' +
  'for the dev queue rather than silently reshaped.';

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

/**
 * `BLOCK_REPLACE` 는 **제거됐다** (2026-11-09 재감사).
 *
 * 하드코딩 타이포를 이유로 11개 블록을 다른 블록으로 강제 치환하던 표였다. 측정해 보니
 * 처방이 틀렸다:
 *   - `schedule_board`(Data Block, /api/v1/schedules) → `worship_schedule`(Static,
 *     items 직접 입력): **데이터 출처가 사라져 빈 블록**이 된다. 게다가 schedule_board 는
 *     고정 px 가 0 개여서 애초에 혐의가 없었다. `logo_bar` 도 0 개.
 *   - 치환 대상이던 `features_grid`·`hero_banner`·`call_to_action` 자체도 고정 px 를
 *     갖고 있다 — "토큰 구동 등가물" 이라는 전제가 성립하지 않았다.
 *   - 무엇보다 치환은 **시안 구조를 버린다.** 임포트의 목적과 정면으로 충돌한다.
 *
 * 대신: 구조는 시안대로 두고, 타이포를 따르지 않는 블록은 `TYPOGRAPHY_WARN`(생성값)
 * 으로 **경고에 올려** 운영자·개발 큐가 보게 한다. 이름 정규화만 `BLOCK_ALIASES` 로 한다.
 */

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
    const rawBt = (s.block_type ?? s.blockType ?? '').trim();
    if (!rawBt) continue;
    // 놓을 수 없는 이름(예: 정식 이름 cta_section)을 운영자가 편집할 수 있는 이름으로
    // 정규화한다. 구조를 다른 블록으로 바꾸지는 않는다 — 위 BLOCK_REPLACE 제거 사유 참고.
    const bt = BLOCK_ALIASES[rawBt] ?? rawBt;
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
    // 시안 구조는 그대로 두고, 테마 타이포를 따르지 않는 블록만 알린다 (치환하지 않는다).
    const needsType = [...new Set(sections.map((s) => s.blockType))].filter((t) => TYPOGRAPHY_WARN[t]);
    if (needsType.length) {
      warnings.push(
        `${screen.slug}: 아래 블록은 고정 글자 크기를 써서 테마 타이포를 일부 무시합니다 — `
        + `${needsType.join(', ')}. 시안 구조는 유지했으니 블록 타이포 수정 대상입니다.`,
      );
    }
    pages.push({ name: cleanName(screen.label), slug: screen.slug, sections, sortOrder: pages.length });
    done += 1;
  }
  onProgress('매핑 완료', done, pageScreens.length);

  const styleguide = styleguideFromTokensCss(tokensCss, churchName);
  styleguide.scale = extractTypeScale(canvasHtml); // design's real sizes → tokensV2
  return { styleguide, pages, warnings };
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
