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
  onSelectSection?: (sectionId: string) => void;
}

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 834, mobile: 390 };
const DEVICE_LABEL: Record<Device, string> = { desktop: '데스크탑', tablet: '태블릿', mobile: '모바일' };

// Church content-module + church-static blocks that the shared @dw-church/blocks
// BLOCK_MAP doesn't render (they fetch from /api/v1/... on the storefront, or
// are dw-church-only static blocks defined in apps/web). Shown as a labeled
// card so the operator knows the block exists + edits its props in the
// inspector; the real render appears on the published site.
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
  pastor_message: '담임목사 인사',
  church_intro: '교회 소개',
  newcomer_info: '새가족 안내',
  visitor_welcome: '새가족 안내',
  contact_info: '연락처',
  address_info: '연락처',
  worship_schedule: '예배 시간',
  worship_times: '예배 시간',
};

// Tenant theme → CSS vars bridge. Mirrors apps/web layout.tsx cssVars exactly
// so the in-editor render matches the storefront. tokens (--brand-* path the
// theme editor writes) take precedence, then the legacy /theme blob.
const BORDER_RADIUS_MAP: Record<string, string> = { none: '0px', sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px' };
const CONTENT_WIDTH_MAP: Record<string, string> = { narrow: '768px', default: '1024px', wide: '1280px', full: '100%' };
const CARD_SHADOW_MAP: Record<string, string> = { shadow: '0 1px 3px rgba(0,0,0,0.1)', border: 'none', flat: 'none' };

function buildCssVars(theme: any, tokens: any): Record<string, string> {
  const colors = theme?.colors ?? {};
  const fonts = theme?.fonts ?? {};
  const layout = theme?.layout ?? {};
  const sys = (tokens?.colors?.system ?? {}) as Record<string, string>;
  const fam = (tokens?.typography?.families ?? {}) as Record<string, string>;
  const headingFamily = fam.heading || fonts?.heading || "'Pretendard Variable', 'Pretendard', sans-serif";
  const bodyFamily = fam.body || fonts?.body || "'Pretendard Variable', 'Pretendard', sans-serif";
  return {
    '--dw-primary': sys.primary || colors?.primary || '#2563eb',
    '--dw-secondary': sys.secondary || colors?.secondary || '#64748b',
    '--dw-accent': sys.accent || colors?.accent || '#f59e0b',
    '--dw-background': sys.background || colors?.background || '#ffffff',
    '--dw-surface': sys.surface || colors?.surface || '#f8fafc',
    '--dw-text': sys.text || colors?.text || '#0f172a',
    '--dw-font-heading': headingFamily,
    '--dw-font-body': bodyFamily,
    '--dw-radius': BORDER_RADIUS_MAP[layout?.borderRadius ?? 'lg'] ?? '12px',
    '--dw-content-width': CONTENT_WIDTH_MAP[layout?.contentWidth ?? 'default'] ?? '1024px',
    '--dw-card-shadow': CARD_SHADOW_MAP[layout?.cardStyle ?? 'shadow'] ?? CARD_SHADOW_MAP.shadow,
    '--dw-card-border': layout?.cardStyle === 'border' ? '1px solid #e5e7eb' : 'none',
    '--dw-sermon-grid': String(layout?.sermonGrid ?? 4),
    // Bridge --dw-* → the b2bsmart --brand-*/--accent tokens the shared blocks
    // also read, so swatches/buttons in package blocks pick up tenant color.
    '--accent': sys.primary || colors?.primary || '#2563eb',
    '--bg': sys.background || colors?.background || '#ffffff',
    '--text-primary': sys.text || colors?.text || '#0f172a',
    '--brand-primary': sys.primary || colors?.primary || '#2563eb',
    '--brand-secondary': sys.secondary || colors?.secondary || '#64748b',
    '--brand-accent': sys.accent || colors?.accent || '#f59e0b',
  };
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

export function BuilderCanvas({ sections, slug, baseUrl, headers, selectedSectionId, onSelectSection }: Props) {
  const [device, setDevice] = useState<Device>('desktop');
  const [cssVars, setCssVars] = useState<Record<string, string>>({});
  // Stabilize the header dep so the theme effect doesn't refetch every render.
  const headerKey = `${headers.Authorization}|${headers['X-Tenant-Slug']}`;

  // Fetch tenant theme once per tenant — same endpoints the storefront uses.
  useEffect(() => {
    if (!baseUrl || !headers['X-Tenant-Slug']) return;
    let cancelled = false;
    const h = { Authorization: headers.Authorization, 'X-Tenant-Slug': headers['X-Tenant-Slug'] };
    (async () => {
      try {
        const [tRes, tokRes] = await Promise.all([
          fetch(`${baseUrl}/api/v1/theme`, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`${baseUrl}/api/v1/theme/tokens`, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (cancelled) return;
        const theme = tRes?.data ?? tRes ?? null;
        const tokens = tokRes?.data ?? tokRes ?? null;
        setCssVars(buildCssVars(theme, tokens));
      } catch {
        if (!cancelled) setCssVars(buildCssVars(null, null));
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
                  onClick={() => onSelectSection?.(s.id)}
                  className={`relative cursor-pointer transition-shadow ${
                    selected ? 'ring-2 ring-inset ring-blue-500' : 'hover:ring-1 hover:ring-inset hover:ring-blue-300'
                  }`}
                >
                  {selected && (
                    <span className="pointer-events-none absolute left-0 top-0 z-10 rounded-br-md bg-blue-500 px-2 py-0.5 font-mono text-[10px] text-white">
                      {s.blockType}
                    </span>
                  )}
                  {churchLabel ? (
                    <ChurchBlockCard label={churchLabel} />
                  ) : (
                    <BlockRenderer
                      section={{ id: s.id, blockType: s.blockType, props: s.props, styleOverrides: (s.props as { blockStyle?: never }).blockStyle ?? null } as RenderableSection}
                      slug={slug}
                      editorMode
                      onElementClick={(sectionId) => onSelectSection?.(sectionId)}
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
