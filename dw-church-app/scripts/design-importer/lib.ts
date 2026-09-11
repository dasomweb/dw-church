/**
 * Design-importer core — the PURE, testable logic (no network).
 *
 * Two axes (see README): a STRUCTURED SPEC (styleguide + pages) → deterministic
 * theme + block sections. This module builds the theme object and the page/section
 * payloads, and orchestrates apply() through an injected client so it can be
 * unit- AND integration-tested without a real server.
 */
// scripts/ is authoring-time and lives outside any package that depends on
// design-tokens, so the workspace specifier won't resolve when run via tsx. The
// VALUE comes from the built dist by relative path (a plain object literal, no
// runtime deps); the TYPE import is erased at runtime so it can stay by name.
// (Re-run `pnpm --filter @dw-church/design-tokens build` if you change tokens.)
import { DEFAULT_DESIGN_TOKENS } from '../../packages/design-tokens/dist/defaults.js';
import type { DesignTokens } from '@dw-church/design-tokens';

// ── Spec types (what a Claude Design import is reduced to) ──────────────────

/** The 10 system color slots (design-tokens systemColorTokensSchema). */
export type SystemSlot =
  | 'primary' | 'secondary' | 'accent' | 'text' | 'muted'
  | 'background' | 'border' | 'surface' | 'onDark' | 'onDarkMuted';

export interface Styleguide {
  name: string;
  /** Palette by role → hex. All 10 recommended; missing ones inherit defaults. */
  colors: Partial<Record<SystemSlot, string>>;
  /** Open-ended custom tokens (badge tones etc.) → emitted as --brand-{name}. */
  custom?: Record<string, string>;
  fonts?: { heading?: string; body?: string; korean?: string };
}

export interface SectionSpec {
  /** Must be a server block-type enum value (pages/schema.ts blockTypes). */
  blockType: string;
  props?: Record<string, unknown>;
}

export interface PageSpec {
  name: string;
  slug: string;
  sections: SectionSpec[];
  sortOrder?: number;
}

export interface ImportSpec {
  styleguide: Styleguide;
  pages: PageSpec[];
}

// ── Theme (STEP 1) ─────────────────────────────────────────────────────────

/** CTA block types — a page must end with one of these (playbook rule). */
export const CTA_BLOCKS = new Set(['cta_section', 'call_to_action']);

/**
 * Build a full, schema-valid DesignTokens from a styleguide by overriding the
 * default tokens' palette + fonts. Starting from DEFAULT_DESIGN_TOKENS
 * guarantees every required field is present so `PUT /theme/tokens` validates.
 */
export function buildChurchTheme(sg: Styleguide): DesignTokens {
  const t: DesignTokens = structuredClone(DEFAULT_DESIGN_TOKENS);
  t.colors.system = { ...t.colors.system, ...pruneUndefined(sg.colors) };
  if (sg.custom) t.colors.custom = { ...t.colors.custom, ...sg.custom };
  if (sg.fonts) t.typography.families = { ...t.typography.families, ...pruneUndefined(sg.fonts) };
  return t;
}

/**
 * Church-tone guard: flag near-black backgrounds/bands (dark-on-dark is banned
 * for church sites — see CLAUDE-DESIGN-TOKENS.md). Returns human-readable
 * warnings; never throws (the operator decides). onDark is exempt — it is meant
 * to be dark-ish text-over-photo, not a section background.
 */
export function darkBandWarnings(sg: Styleguide): string[] {
  const warns: string[] = [];
  const bandSlots: SystemSlot[] = ['background', 'surface', 'secondary'];
  for (const slot of bandSlots) {
    const hex = sg.colors[slot];
    if (hex && isNearBlack(hex)) {
      warns.push(`교회 톤 경고: "${slot}" 가 검정에 가깝습니다(${hex}). 밝고 따뜻한 배경을 쓰세요(다크 밴드 금지).`);
    }
  }
  return warns;
}

// ── Page composition ───────────────────────────────────────────────────────

export interface ComposedPage {
  page: { title: string; slug: string; status: 'published'; sortOrder: number };
  sections: { blockType: string; props: Record<string, unknown>; sortOrder: number }[];
}

/** Turn a PageSpec into the API-ready page + ordered section payloads. */
export function composePage(page: PageSpec): ComposedPage {
  return {
    page: {
      title: page.name,
      slug: page.slug,
      status: 'published',
      sortOrder: page.sortOrder ?? 0,
    },
    sections: page.sections.map((s, i) => ({
      blockType: s.blockType,
      props: s.props ?? {},
      sortOrder: i,
    })),
  };
}

/** Spec sanity checks (non-fatal). Every page must end with a CTA. */
export function validateImportSpec(spec: ImportSpec): string[] {
  const warns = [...darkBandWarnings(spec.styleguide)];
  for (const p of spec.pages) {
    const last = p.sections[p.sections.length - 1];
    if (!last || !CTA_BLOCKS.has(last.blockType)) {
      warns.push(`페이지 "${p.slug}" 가 CTA 로 끝나지 않습니다(마지막=${last?.blockType ?? '없음'}).`);
    }
    if (p.sections.length === 0) warns.push(`페이지 "${p.slug}" 에 섹션이 없습니다.`);
  }
  return warns;
}

// ── Orchestration (injected client → testable) ─────────────────────────────

export interface ImportClient {
  putThemeTokens(tokens: DesignTokens): Promise<void>;
  createPage(page: ComposedPage['page']): Promise<{ id: string }>;
  addSection(pageId: string, section: ComposedPage['sections'][number]): Promise<void>;
}

export interface ApplyResult {
  themeApplied: boolean;
  pages: { slug: string; id: string; sections: number }[];
  warnings: string[];
}

/**
 * Apply an import: THEME FIRST (STEP 1), then each page (create + ordered
 * sections). The client is injected so this runs against a mock in tests and the
 * real HTTP client (api.ts) at authoring time. Pure orchestration — order is the
 * contract the integration test asserts.
 */
export async function applyImport(
  client: ImportClient,
  spec: ImportSpec,
  log: (msg: string) => void = () => {},
): Promise<ApplyResult> {
  const warnings = validateImportSpec(spec);
  for (const w of warnings) log(`⚠ ${w}`);

  log('STEP 1 — 테마 토큰 적용(PUT /theme/tokens)');
  await client.putThemeTokens(buildChurchTheme(spec.styleguide));

  const pages: ApplyResult['pages'] = [];
  for (const p of spec.pages) {
    const composed = composePage(p);
    const { id } = await client.createPage(composed.page);
    for (const sec of composed.sections) await client.addSection(id, sec);
    pages.push({ slug: p.slug, id, sections: composed.sections.length });
    log(`페이지 "${p.slug}" — 섹션 ${composed.sections.length}개 (id ${id})`);
  }
  return { themeApplied: true, pages, warnings };
}

// ── helpers ────────────────────────────────────────────────────────────────

function pruneUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

/** Relative luminance heuristic — true when the hex is very dark (near black). */
export function isNearBlack(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // perceived luminance (0..255); < 40 ≈ near-black.
  return 0.299 * r + 0.587 * g + 0.114 * b < 40;
}
