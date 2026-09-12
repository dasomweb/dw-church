/**
 * Claude Design `.dc.html` canvas parser — PURE (no network, no DOM).
 *
 * Reality (verified against a real export, 2026-09-12): Claude Design canvases
 * mark SCREENS with `data-screen-label="NN 이름"` and dynamic lists with
 * `<sc-for list="{{ name }}">`, and split header/footer via `<dc-import>`, but do
 * NOT reliably add `data-page-slug` / `data-block`. So we parse by screen label,
 * infer the page slug, and surface dynamic-list + image + heading signals. Exact
 * block typing + prop extraction per section is the LLM map step (map.ts); this
 * module is the deterministic skeleton the operator reviews before any write.
 */

export interface ParsedSection {
  /** block_type when the designer annotated data-block; else '' (infer via LLM). */
  blockType: string;
  needsBlock: boolean;
  note?: string;
}

export interface ParsedScreen {
  /** raw data-screen-label, e.g. "01 메인". */
  label: string;
  /** inferred canonical page slug (home|about|staff|worship|sermons|…). */
  slug: string;
  /** detail/mobile mockups are not composed as pages (handled by dedicated routes). */
  kind: 'page' | 'detail' | 'mobile' | 'template';
  /** explicit data-block sections when present (usually empty → infer). */
  sections: ParsedSection[];
  /** sc-for list names inside this screen (dynamic-content signals). */
  dynamicLists: string[];
  /** absolute image URLs referenced in this screen (→ download to R2 on apply). */
  imageUrls: string[];
  /** short visible-heading samples (largest/boldest text) for the review table. */
  headings: string[];
}

export interface ParsedCanvas {
  screens: ParsedScreen[];
  /** dc-import component names (header/footer/ministry template) — not pages. */
  imports: string[];
  /** every distinct image URL across the canvas. */
  imageUrls: string[];
  warnings: string[];
}

interface Marker { index: number; value: string }

function allMatches(re: RegExp, s: string): { index: number; groups: string[] }[] {
  const out: { index: number; groups: string[] }[] = [];
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = rx.exec(s)) !== null) {
    out.push({ index: m.index, groups: m.slice(1) as string[] });
    if (m.index === rx.lastIndex) rx.lastIndex++;
  }
  return out;
}

/** Raw per-screen HTML slices (for the LLM map step). Screen boundary = each
 *  data-screen-label / data-page-slug marker to the next. */
export function splitScreensRaw(html: string): { label: string; html: string }[] {
  const marks = allMatches(/data-(?:screen-label|page-slug)\s*=\s*"([^"]+)"/i, html)
    .map((m) => ({ index: m.index, value: m.groups[0]!.trim() }))
    .sort((a, b) => a.index - b.index);
  return marks.map((m, i) => ({
    // back up to the opening '<' of the element carrying the marker
    label: m.value,
    html: html.slice(html.lastIndexOf('<', m.index), marks[i + 1] ? html.lastIndexOf('<', marks[i + 1]!.index) : html.length),
  }));
}

/** Keyword → canonical slug. Order matters (first hit wins). */
const SLUG_RULES: { slug: string; kind: ParsedScreen['kind']; kws: RegExp }[] = [
  { slug: '', kind: 'mobile', kws: /모바일|mobile/i },
  { slug: 'sermon-detail', kind: 'detail', kws: /설교\s*상세|sermon\s*detail/i },
  { slug: 'news-detail', kind: 'detail', kws: /게시글\s*상세|글\s*상세|post\s*detail/i },
  { slug: 'album-detail', kind: 'detail', kws: /갤러리\s*상세|앨범\s*상세|photo\s*detail/i },
  { slug: 'home', kind: 'page', kws: /메인|홈|home|main/i },
  { slug: 'about', kind: 'page', kws: /소개|비전|교회\s*소개|about|vision|인사말/i },
  { slug: 'staff', kind: 'page', kws: /섬기는\s*사람|교역자|직분|섬김이|staff|leader/i },
  { slug: 'worship', kind: 'page', kws: /예배\s*안내|오시는\s*길|예배|worship|location|directions/i },
  { slug: 'sermons', kind: 'page', kws: /설교/i },
  { slug: 'news', kind: 'page', kws: /소식|공지|게시판|news|notice|board/i },
  { slug: 'albums', kind: 'page', kws: /갤러리|앨범|포토|gallery|album|photo/i },
  { slug: 'sunday-school', kind: 'page', kws: /교육|세대별|사역|주일학교|부서|교육부|ministry|education/i },
  { slug: 'pasture', kind: 'page', kws: /목장|셀|구역|소그룹|pasture|cell|small\s*group/i },
];

/** Infer canonical slug + kind from a Korean/English screen label. */
export function inferSlug(label: string): { slug: string; kind: ParsedScreen['kind'] } {
  const name = label.replace(/^\s*\d+\s*[-.]?\s*/, '').trim(); // strip "01 " / "01 - "
  for (const r of SLUG_RULES) if (r.kws.test(name)) return { slug: r.slug, kind: r.kind };
  // Fallback: kebab of the cleaned label (romanization not attempted).
  return { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page', kind: 'page' };
}

/** Extract short heading-like text (bold/large inline divs or h1-h3) from a chunk. */
function extractHeadings(chunk: string): string[] {
  const out: string[] = [];
  // font-weight 700/800 divs, or <h1..3>, first ~6, trimmed of tags/braces.
  const re = /(?:font-weight:\s*(?:700|800)[^>]*>|<h[1-3][^>]*>)([^<{}]{2,80})</gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk)) !== null && out.length < 6) {
    const t = m[1]!.replace(/\s+/g, ' ').trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

function extractImages(chunk: string): string[] {
  const urls = new Set<string>();
  for (const m of allMatches(/<img[^>]*\bsrc\s*=\s*"([^"]+)"/i, chunk)) urls.add(m.groups[0]!);
  for (const m of allMatches(/background(?:-image)?\s*:[^;"']*url\((['"]?)([^)'"]+)\1\)/i, chunk)) urls.add(m.groups[1]!);
  return [...urls].filter((u) => /^https?:\/\//i.test(u) || u.startsWith('uploads/') || u.startsWith('./uploads/'));
}

export function parseCanvas(html: string): ParsedCanvas {
  const warnings: string[] = [];

  const screenMarkers: Marker[] = allMatches(/data-(?:screen-label|page-slug)\s*=\s*"([^"]+)"/i, html).map((m) => ({
    index: m.index,
    value: m.groups[0]!.trim(),
  }));
  const blockMarkers = allMatches(/data-block\s*=\s*"([^"]+)"/i, html).map((m) => ({ index: m.index, value: m.groups[0]!.trim() }));
  const scForMarkers = allMatches(/<sc-for\b[^>]*\blist\s*=\s*"?\{\{\s*([^}"]+?)\s*\}\}"?/i, html).map((m) => ({ index: m.index, value: m.groups[0]!.trim() }));
  const imports = allMatches(/<dc-import\b[^>]*\bname\s*=\s*"([^"]+)"/i, html).map((m) => m.groups[0]!.trim());

  if (screenMarkers.length === 0) warnings.push('data-screen-label/data-page-slug 화면 표시가 없습니다 — 캔버스 형식을 확인하세요.');

  const sorted = [...screenMarkers].sort((a, b) => a.index - b.index);
  const seenSlugs = new Map<string, number>();
  const screens: ParsedScreen[] = sorted.map((s, i) => {
    const end = sorted[i + 1]?.index ?? html.length;
    const chunk = html.slice(s.index, end);
    let { slug, kind } = inferSlug(s.value);
    // Templated screens (label is a {{ }} expression) → dept template.
    if (/\{\{/.test(s.value)) kind = 'template';
    // De-dupe page slugs (e.g. two "설교" screens) — keep first as canonical.
    if (slug && kind === 'page') {
      const n = seenSlugs.get(slug) ?? 0;
      seenSlugs.set(slug, n + 1);
      if (n > 0) slug = `${slug}-${n + 1}`;
    }
    const sections: ParsedSection[] = blockMarkers
      .filter((b) => b.index >= s.index && b.index < end)
      .map((b) => (/^NEEDS_BLOCK/i.test(b.value)
        ? { blockType: 'NEEDS_BLOCK', needsBlock: true, note: b.value.replace(/^NEEDS_BLOCK\s*:?\s*/i, '').trim() || undefined }
        : { blockType: b.value, needsBlock: false }));
    return {
      label: s.value,
      slug,
      kind,
      sections,
      dynamicLists: scForMarkers.filter((f) => f.index >= s.index && f.index < end).map((f) => f.value),
      imageUrls: extractImages(chunk),
      headings: extractHeadings(chunk),
    };
  });

  const imageUrls = [...new Set(screens.flatMap((s) => s.imageUrls))];
  const pageCount = screens.filter((s) => s.kind === 'page').length;
  if (pageCount === 0) warnings.push('페이지로 판단된 화면이 없습니다(전부 상세/모바일/템플릿?).');

  return { screens, imports, imageUrls, warnings };
}
