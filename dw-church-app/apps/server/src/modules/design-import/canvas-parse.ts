/**
 * Claude Design `.dc.html` canvas parser — PURE (no network, no DOM).
 *
 * Parses the deterministic contract our PREP-PROMPT tells Claude Design to emit
 * (scripts/design-importer/CLAUDE-DESIGN-PREP-PROMPT.md):
 *   • each screen container: data-screen-label="NN 이름" + data-page-slug="home|about|…"
 *   • each section top element: data-block="<block_type>"  (or "NEEDS_BLOCK: …")
 *   • dynamic lists: <sc-for list="{{ 이름 }}">  → data block
 *   • header/footer: <dc-import name="…Header/…Footer">  → NOT page sections
 *
 * We parse by attribute position (no HTML tree needed): every data-block is
 * assigned to the nearest preceding data-page-slug. This yields the page→block
 * structure for the review table BEFORE any write — the "실속" the operator sees.
 * Prop extraction (titles/text/images) is a later LLM step; this is structure.
 */

export interface ParsedSection {
  blockType: string;
  /** true when the designer marked it NEEDS_BLOCK (no matching block yet). */
  needsBlock: boolean;
  note?: string;
}

export interface ParsedPage {
  slug: string;
  label?: string;
  sections: ParsedSection[];
  /** sc-for list names found inside this page (dynamic content hints). */
  dynamicLists: string[];
}

export interface ParsedCanvas {
  pages: ParsedPage[];
  /** dc-import component names (header/footer) — reported, not imported as pages. */
  imports: string[];
  warnings: string[];
}

interface Marker { index: number; value: string; label?: string }

function allMatches(re: RegExp, s: string): { index: number; groups: string[] }[] {
  const out: { index: number; groups: string[] }[] = [];
  let m: RegExpExecArray | null;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = rx.exec(s)) !== null) {
    out.push({ index: m.index, groups: m.slice(1) as string[] });
    if (m.index === rx.lastIndex) rx.lastIndex++; // guard against zero-width
  }
  return out;
}

/** Find the data-screen-label sitting near a page marker (same element). */
function labelNear(html: string, pageIndex: number): string | undefined {
  const window = html.slice(Math.max(0, pageIndex - 300), pageIndex + 300);
  return /data-screen-label\s*=\s*"([^"]+)"/i.exec(window)?.[1]?.trim();
}

export function parseCanvas(html: string): ParsedCanvas {
  const warnings: string[] = [];

  const pageMarkers: Marker[] = allMatches(/data-page-slug\s*=\s*"([^"]+)"/i, html).map((m) => ({
    index: m.index,
    value: m.groups[0]!.trim(),
    label: labelNear(html, m.index),
  }));

  const blockMarkers = allMatches(/data-block\s*=\s*"([^"]+)"/i, html).map((m) => ({
    index: m.index,
    value: m.groups[0]!.trim(),
  }));

  const scForMarkers = allMatches(/<sc-for\b[^>]*\blist\s*=\s*"?\{\{\s*([^}"]+?)\s*\}\}"?/i, html).map((m) => ({
    index: m.index,
    value: m.groups[0]!.trim(),
  }));

  const imports = allMatches(/<dc-import\b[^>]*\bname\s*=\s*"([^"]+)"/i, html).map((m) => m.groups[0]!.trim());

  if (pageMarkers.length === 0) {
    warnings.push('data-page-slug 화면 표시가 없습니다 — PREP-PROMPT 규칙(화면=페이지)이 적용됐는지 확인하세요.');
  }
  if (blockMarkers.length === 0) {
    warnings.push('data-block 섹션 표시가 없습니다 — 매핑이 추론으로 떨어집니다(PREP-PROMPT 재확인).');
  }

  // Sort pages by document order; each owns the markers between it and the next.
  const sorted = [...pageMarkers].sort((a, b) => a.index - b.index);
  const pages: ParsedPage[] = sorted.map((p, i) => {
    const end = sorted[i + 1]?.index ?? Infinity;
    const sections: ParsedSection[] = blockMarkers
      .filter((b) => b.index >= p.index && b.index < end)
      .map((b) => {
        const needsBlock = /^NEEDS_BLOCK/i.test(b.value);
        return needsBlock
          ? { blockType: 'NEEDS_BLOCK', needsBlock: true, note: b.value.replace(/^NEEDS_BLOCK\s*:?\s*/i, '').trim() || undefined }
          : { blockType: b.value, needsBlock: false };
      });
    const dynamicLists = scForMarkers.filter((s) => s.index >= p.index && s.index < end).map((s) => s.value);
    return { slug: p.value, label: p.label, sections, dynamicLists };
  });

  // Blocks before the first page marker (or when there are no pages) are orphaned.
  const firstPageIndex = sorted[0]?.index ?? Infinity;
  const orphanBlocks = blockMarkers.filter((b) => b.index < firstPageIndex).length;
  if (orphanBlocks > 0) {
    warnings.push(`${orphanBlocks}개 섹션이 어떤 data-page-slug 화면에도 속하지 않습니다(무시됨).`);
  }
  for (const p of pages) {
    if (p.sections.length === 0) warnings.push(`페이지 "${p.slug}" 에 data-block 섹션이 없습니다.`);
    const last = p.sections[p.sections.length - 1];
    if (last && last.blockType !== 'call_to_action' && last.blockType !== 'cta_section') {
      warnings.push(`페이지 "${p.slug}" 가 CTA 로 끝나지 않습니다(마지막=${last.blockType}).`);
    }
  }

  return { pages, imports, warnings };
}
