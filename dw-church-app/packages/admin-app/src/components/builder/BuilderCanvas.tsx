// BuilderCanvas — in-process page-builder preview (b2bsmart-identical).
//
// Replaces the old iframe LivePreviewPane. Renders the SAME @dw-church/blocks
// BlockRenderer the storefront uses, in `editorMode`, directly inside the admin
// SPA — so the operator gets instant per-edit feedback (no save→reload round
// trip) and the editor render is pixel-identical to the public site for every
// shared block.
//
// Theme: the `.b2b-blocks-preview` scope (from @dw-church/blocks/styles.css)
// defines the full design-token scale + sensible --dw-* defaults. We overlay
// the tenant's actual theme as inline --dw-*/--brand-* vars on that wrapper —
// the SAME bridge the storefront layout applies (tokens → --dw-*), so colors
// and fonts match the live site.
//
// Church-specific blocks (sermons/bulletins/staff/board/… data blocks, and the
// church static blocks that live in apps/web and fetch or aren't in the shared
// BLOCK_MAP) render as a labeled placeholder card — the same affordance
// b2bsmart's admin uses for data blocks that only resolve on the storefront.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BlockRenderer, type RenderableSection } from '@dw-church/blocks';
import {
  tokensToCssVars,
  legacyThemeToTokens,
  DEFAULT_DESIGN_TOKENS,
  type DesignTokens,
} from '@dw-church/design-tokens';
import '@dw-church/blocks/styles.css';

interface Section {
  id: string;
  blockType: string;
  sortOrder: number;
  isVisible: boolean;
  props: Record<string, unknown>;
}

interface Props {
  sections: Section[];
  slug: string;
  baseUrl: string;
  headers: Record<string, string>;
  selectedSectionId?: string | null;
  selectedElementKey?: string | null;
  /**
   * Reports the clicked section + the clicked element's key. The element
   * key comes from the @dw-church/blocks BlockRenderer (it walks up to the
   * nearest [data-element]); a click on section chrome / the background
   * reports '__section__'. The inspector enters focus mode for a real
   * element key (showing that element's applied font/color from the design
   * tokens) and whole-block mode for '__section__'.
   */
  onSelect?: (sectionId: string, elementKey: string) => void;
}

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 834, mobile: 390 };
const DEVICE_LABEL: Record<Device, string> = { desktop: '데스크탑', tablet: '태블릿', mobile: '모바일' };

// Church content-module data blocks that the shared @dw-church/blocks BLOCK_MAP
// doesn't render in-process (they fetch from /api/v1/... on the storefront).
// Shown as a labeled card so the operator knows the block exists + edits its
// props in the inspector; the real data render appears on the published site.
// NOTE: church STATIC blocks (pastor_message / newcomer_info / worship_*) now
// live in the shared set and render fully in-process — they are NOT listed here.
const CHURCH_BLOCK_LABELS: Record<string, string> = {
  recent_sermons: '설교 목록 (Data Block)',
  recent_bulletins: '주보 목록 (Data Block)',
  recent_columns: '칼럼 목록 (Data Block)',
  album_gallery: '앨범 (Data Block)',
  staff_grid: '교역자 (Data Block)',
  history_timeline: '교회 연혁 (Data Block)',
  event_grid: '행사 (Data Block)',
  board: '게시판 (Data Block)',
  banner_slider: '배너 슬라이더 (Data Block)',
  hero_image_slider: '배너 슬라이더 (Data Block)',
  // contact_info is an async Server Component (fetches church settings).
  contact_info: '연락처 (Data Block)',
  address_info: '연락처 (Data Block)',
};

// Resolve the tenant's DesignTokens from the API responses — the SAME
// b2bsmart token system the storefront uses. Priority: explicit tokens
// (/theme/tokens) → legacy /theme blob converted → defaults.
function resolveTokens(tokensResp: unknown, themeResp: unknown): DesignTokens {
  const t = tokensResp as Partial<DesignTokens> | null | undefined;
  if (t?.colors?.system && t?.typography?.families && t?.typography?.scales) {
    return t as DesignTokens;
  }
  if (themeResp && typeof themeResp === 'object') {
    try {
      return legacyThemeToTokens(themeResp as never);
    } catch {
      /* fall through to defaults */
    }
  }
  return DEFAULT_DESIGN_TOKENS;
}

// Emit the full --brand-* set from tokens (tokensToCssVars) PLUS a small
// --dw-* / --accent bridge derived from the same tokens, so package blocks
// that still read the legacy vars (HeroBanner, CTA) also pick up the tenant's
// color + font set. Single source of truth = DesignTokens.
function buildVars(tokens: DesignTokens): Record<string, string> {
  const brand = tokensToCssVars(tokens);
  const sys = tokens.colors.system;
  const fam = tokens.typography.families;
  return {
    ...brand,
    '--dw-primary': sys.primary,
    '--dw-secondary': sys.secondary,
    '--dw-accent': sys.accent,
    '--dw-background': sys.background,
    '--dw-surface': sys.surface,
    '--dw-text': sys.text,
    '--dw-font-heading': fam.heading,
    '--dw-font-body': fam.body,
    '--accent': sys.primary,
    '--bg': sys.background,
    '--bg-subtle': sys.surface,
    '--text-primary': sys.text,
    '--text-muted': sys.muted,
  };
}

// Webfont loader for the canvas — mirrors apps/web layout.tsx googleFontsHref
// so the editor preview uses the same fonts the storefront loads. The canvas
// only sets font-family CSS vars; without loading the webfont the browser
// falls back to a system font and the chosen Korean font never shows.
const PRELOADED_FONTS = new Set(['Pretendard', 'Pretendard Variable', 'system-ui', 'sans-serif', 'serif', 'monospace', '-apple-system', 'BlinkMacSystemFont']);
function firstFamily(stack: string | undefined): string | null {
  if (!stack) return null;
  const first = stack.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
  return first || null;
}
function ensureGoogleFonts(families: (string | undefined)[]) {
  if (typeof document === 'undefined') return;
  const names = families
    .map(firstFamily)
    .filter((f): f is string => f != null && !PRELOADED_FONTS.has(f))
    .filter((f, i, arr) => arr.indexOf(f) === i);
  for (const name of names) {
    const id = `dw-gfont-${name.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
}

function ChurchBlockCard({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-6 py-8 text-center">
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-blue-600">{label}</div>
        <div className="text-sm text-blue-800">
          교회 콘텐츠 블록 — 게시된 사이트에서 실제 데이터로 렌더링됩니다.
        </div>
        <div className="mt-1 text-[11px] text-blue-600/70">
          오른쪽 인스펙터에서 제목·표시 개수·변형 등을 설정하세요.
        </div>
      </div>
    </div>
  );
}

export function BuilderCanvas({ sections, slug, baseUrl, headers, selectedSectionId, selectedElementKey, onSelect }: Props) {
  const [device, setDevice] = useState<Device>('desktop');
  const [cssVars, setCssVars] = useState<Record<string, string>>({});
  // Stabilize the header dep so the theme effect doesn't refetch every render.
  const headerKey = `${headers.Authorization}|${headers['X-Tenant-Slug']}`;

  // Fetch tenant theme once per tenant — same endpoints the storefront uses.
  useEffect(() => {
    if (!baseUrl || !headers['X-Tenant-Slug']) return;
    let cancelled = false;
    // `?? ''` — noUncheckedIndexedAccess types the indexed header as
    // string|undefined, which fetch's HeadersInit rejects. The effect already
    // guards on a present X-Tenant-Slug above.
    const h = { Authorization: headers.Authorization ?? '', 'X-Tenant-Slug': headers['X-Tenant-Slug'] ?? '' };
    (async () => {
      try {
        const [tRes, tokRes] = await Promise.all([
          fetch(`${baseUrl}/api/v1/theme`, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`${baseUrl}/api/v1/theme/tokens`, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (cancelled) return;
        const theme = tRes?.data ?? tRes ?? null;
        const tokens = tokRes?.data ?? tokRes ?? null;
        const resolved = resolveTokens(tokens, theme);
        ensureGoogleFonts([resolved.typography.families.heading, resolved.typography.families.body]);
        setCssVars(buildVars(resolved));
      } catch {
        if (!cancelled) setCssVars(buildVars(DEFAULT_DESIGN_TOKENS));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, headerKey]);

  const visibleSections = useMemo(
    () => sections.filter((s) => s.isVisible !== false).sort((a, b) => a.sortOrder - b.sortOrder),
    [sections],
  );

  const width = DEVICE_WIDTH[device];
  const wrapperStyle = { ...cssVars } as React.CSSProperties;

  // Scroll the selected section into view when it changes.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedSectionId) return;
    const el = scrollRef.current?.querySelector(`[data-canvas-section="${selectedSectionId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedSectionId]);

  // Mark the focused element so the styles.css `[data-element-selected]`
  // outline shows which element the inspector is editing. Clear any stale
  // marks first. Runs after render so the freshly-rendered nodes exist.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    root.querySelectorAll('[data-element-selected="true"]').forEach((n) => n.removeAttribute('data-element-selected'));
    if (!selectedSectionId || !selectedElementKey || selectedElementKey === '__section__') return;
    const safeId = selectedSectionId.replace(/"/g, '');
    const safeKey = selectedElementKey.replace(/"/g, '');
    const el = root.querySelector(`[data-section-id="${safeId}"] [data-element="${safeKey}"]`);
    el?.setAttribute('data-element-selected', 'true');
  }, [selectedSectionId, selectedElementKey, sections]);

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${device === d ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>
              {DEVICE_LABEL[d]}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-400">실시간 미리보기 · 클릭하여 섹션 선택</span>
      </div>

      {/* Canvas */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        <div
          className="b2b-blocks-preview relative mx-auto overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm transition-[max-width] duration-200"
          style={{ ...wrapperStyle, maxWidth: width ? `${width}px` : '100%', backgroundColor: 'var(--dw-background)' }}
        >
          {visibleSections.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              섹션을 추가하면 여기에 표시됩니다
            </div>
          ) : (
            visibleSections.map((s) => {
              const selected = s.id === selectedSectionId;
              const churchLabel = CHURCH_BLOCK_LABELS[s.blockType];
              return (
                <div
                  key={s.id}
                  data-canvas-section={s.id}
                  // Church placeholder cards aren't rendered by BlockRenderer
                  // (no editorMode click div), so they need the wrapper click.
                  // Real blocks report clicks (with element key) via the
                  // BlockRenderer onElementClick below — no wrapper onClick so
                  // the element key isn't swallowed.
                  onClick={churchLabel ? () => onSelect?.(s.id, '__section__') : undefined}
                  className={`relative transition-shadow ${churchLabel ? 'cursor-pointer' : ''} ${
                    selected ? 'ring-2 ring-inset ring-blue-500' : 'hover:ring-1 hover:ring-inset hover:ring-blue-300'
                  }`}
                >
                  {selected && (
                    <span className="pointer-events-none absolute left-0 top-0 z-10 rounded-br-md bg-blue-500 px-2 py-0.5 font-mono text-[10px] text-white">
                      {s.blockType}{selectedElementKey && selectedElementKey !== '__section__' ? ` · ${selectedElementKey}` : ''}
                    </span>
                  )}
                  {churchLabel ? (
                    <ChurchBlockCard label={churchLabel} />
                  ) : (
                    <BlockRenderer
                      section={{ id: s.id, blockType: s.blockType, props: s.props, styleOverrides: (s.props as { blockStyle?: never }).blockStyle ?? null } as RenderableSection}
                      slug={slug}
                      editorMode
                      onElementClick={(sectionId, elementKey) => onSelect?.(sectionId, elementKey)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
