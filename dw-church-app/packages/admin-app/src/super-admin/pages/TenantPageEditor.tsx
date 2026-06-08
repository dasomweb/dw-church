/**
 * Super-admin PageBuilder. Mounts at /super-admin/t/:slug/pages.
 *
 * 3-pane shell — page list / section list / inspector. The inspector is
 * the full ported b2bsmart ElementInspector (3-tab Content/Style/Advanced,
 * element-registry-driven property fields), wired to write section.props
 * (and props.blockStyle for per-block style) through the existing
 * PUT /pages/:id/sections/:sectionId endpoint with an X-Tenant-Slug header
 * for the target tenant. The element-registry (element-registry.ts) covers
 * every dw-church block_type in PageEditor BLOCK_DEFS, so the operator gets
 * the same rich controls here as the tenant-side PageEditor.
 */
import { useEffect, useMemo, useState } from 'react';
import type { PageSection } from '@dw-church/api-client';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';
import { ElementInspector } from '../../components/builder/ElementInspector';
import { LivePreviewPane } from '../../components/builder/LivePreviewPane';

interface PageRow {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  status: string;
  kind?: string;
}

// Page kinds the operator can assign. *_detail pages are templates rendered
// for each item of that content type, where blocks bind to the current item
// via DynamicSource (the ⚙ button on text/image/url fields).
const PAGE_KINDS: { value: string; label: string }[] = [
  { value: 'static', label: '일반 페이지' },
  { value: 'sermon_detail', label: '설교 상세 템플릿' },
  { value: 'column_detail', label: '칼럼 상세 템플릿' },
  { value: 'bulletin_detail', label: '주보 상세 템플릿' },
];

interface Section {
  id: string;
  blockType: string;
  sortOrder: number;
  isVisible: boolean;
  props: Record<string, unknown>;
}

export default function TenantPageEditor() {
  const session = useAuthStore((s) => s.session);
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [saving, setSaving] = useState(false);
  // Bumped after every successful section save so the live preview iframe
  // reloads and reflects the edit (public page fetches with no-store).
  const [previewNonce, setPreviewNonce] = useState(0);

  const baseUrl = useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  }, []);

  // Public origin for the live preview — the tenant subdomain on the web
  // app's root domain. admin.truelight.app → {slug}.truelight.app. In dev
  // (no admin. host) fall back to VITE_WEB_BASE_URL or the same host.
  const tenantOrigin = useMemo(() => {
    if (!tenant?.slug) return '';
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host.startsWith('admin.')) {
      return `https://${tenant.slug}.${host.replace('admin.', '')}`;
    }
    const webBase = (import.meta.env.VITE_WEB_BASE_URL as string) || '';
    return webBase ? `${webBase.replace(/\/+$/, '')}/tenant/${tenant.slug}` : '';
  }, [tenant?.slug]);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${session?.accessToken ?? ''}`,
    'X-Tenant-Slug': tenant?.slug ?? '',
    'Content-Type': 'application/json',
  }), [session?.accessToken, tenant?.slug]);

  // Load pages list
  useEffect(() => {
    if (!tenant?.slug) return;
    let cancelled = false;
    (async () => {
      setLoadingPages(true);
      try {
        const res = await fetch(`${baseUrl}/api/v1/pages`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json() as { data: PageRow[] };
        if (cancelled) return;
        setPages(body.data);
        if (body.data.length > 0 && !selectedPageId) setSelectedPageId(body.data[0]!.id);
      } catch (err) {
        if (!cancelled) showToast('error', err instanceof Error ? err.message : '페이지 로딩 실패');
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.slug, baseUrl, headers, showToast, selectedPageId]);

  // Load sections for selected page
  useEffect(() => {
    if (!selectedPageId) { setSections([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingSections(true);
      try {
        const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json() as { data: Section[] };
        if (cancelled) return;
        setSections(body.data.sort((a, b) => a.sortOrder - b.sortOrder));
        setSelectedSectionId(body.data[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) showToast('error', err instanceof Error ? err.message : '섹션 로딩 실패');
      } finally {
        if (!cancelled) setLoadingSections(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPageId, baseUrl, headers, showToast]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;
  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;
  // Home page renders at the origin root; other pages at /{slug}.
  const previewPath = selectedPage ? (selectedPage.isHome ? '' : selectedPage.slug) : '';

  // ElementInspector callbacks — route its debounced props / block-style writes
  // through this console's raw fetch (carries X-Tenant-Slug for the target
  // tenant). Block-style is stored in props.blockStyle (dw-church PageSection
  // has no styleOverrides field).
  const handlePropsChange = (sectionId: string, next: Record<string, unknown>) => {
    void (async () => {
      if (!selectedPageId) return;
      setSaving(true);
      try {
        const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections/${sectionId}`, {
          method: 'PUT', headers, body: JSON.stringify({ props: next }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated = await res.json() as Section;
        setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setPreviewNonce((n) => n + 1); // reflect the edit in the live preview
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : '저장 실패');
      } finally {
        setSaving(false);
      }
    })();
  };
  const handleStyleChange = (sectionId: string, blockStyle: unknown) => {
    const sec = sections.find((s) => s.id === sectionId);
    handlePropsChange(sectionId, { ...(sec?.props ?? {}), blockStyle });
  };

  // Change a page's kind (static ↔ a *_detail template). Marking a page as a
  // detail template activates DynamicSource binding in the inspector.
  const handleKindChange = (kind: string) => {
    if (!selectedPageId) return;
    setPages((prev) => prev.map((p) => (p.id === selectedPageId ? { ...p, kind } : p)));
    void (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}`, {
          method: 'PUT', headers, body: JSON.stringify({ kind }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : '페이지 종류 저장 실패');
      }
    })();
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Pane 1 — Pages */}
      <aside className="w-48 shrink-0 border-r bg-white overflow-y-auto">
        <div className="p-3 border-b">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">페이지</h2>
        </div>
        {loadingPages ? (
          <div className="p-3 text-xs text-gray-500">로딩 중...</div>
        ) : (
          <ul>
            {pages.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedPageId(p.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedPageId === p.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                >
                  {p.title}
                  {p.isHome && <span className="ml-1.5 text-[10px] text-blue-500">★</span>}
                  <div className="text-[10px] text-gray-400 font-mono">/{p.slug}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Pane 2 — Sections */}
      <section className="w-60 shrink-0 border-r bg-gray-50 overflow-y-auto">
        <div className="p-3 border-b bg-white space-y-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">섹션</h2>
          {selectedPage && (
            <label className="block">
              <span className="text-[10px] text-gray-400">페이지 종류</span>
              <select
                value={selectedPage.kind ?? 'static'}
                onChange={(e) => handleKindChange(e.target.value)}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              >
                {PAGE_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
              {selectedPage.kind && selectedPage.kind !== 'static' && (
                <span className="mt-1 block text-[10px] leading-tight text-blue-600">
                  상세 템플릿: 블록 필드의 ⚙ 로 "현재 항목" 데이터를 연결하세요
                </span>
              )}
            </label>
          )}
        </div>
        {loadingSections ? (
          <div className="p-3 text-xs text-gray-500">로딩 중...</div>
        ) : sections.length === 0 ? (
          <div className="p-3 text-xs text-gray-400">섹션 없음</div>
        ) : (
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedSectionId(s.id)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-200 ${selectedSectionId === s.id ? 'bg-blue-50' : 'hover:bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-600">{s.blockType}</span>
                    {!s.isVisible && <span className="text-[10px] text-gray-400">숨김</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {(s.props.title as string) ?? (s.props.heading as string) ?? '(no title)'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pane 3 — Live preview (center) */}
      <section className="flex-1 min-w-0 overflow-hidden">
        {selectedPage && tenantOrigin ? (
          <LivePreviewPane
            tenantOrigin={tenantOrigin}
            pagePath={previewPath}
            reloadNonce={previewNonce}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-400">
            페이지를 선택하면 미리보기가 표시됩니다
          </div>
        )}
      </section>

      {/* Pane 4 — Inspector (right) */}
      <section className="w-96 shrink-0 border-l overflow-y-auto bg-white">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">인스펙터</h2>
          {saving && <span className="text-[10px] text-gray-500">저장 중...</span>}
        </div>
        {selectedSection ? (
          <ElementInspector
            key={selectedSection.id}
            pageId={selectedPageId ?? ''}
            sections={sections.map((s) => ({ ...s, pageId: selectedPageId ?? '' })) as unknown as PageSection[]}
            sectionId={selectedSection.id}
            elementKey=""
            onClose={() => setSelectedSectionId(null)}
            onPropsChange={handlePropsChange}
            onStyleOverridesChange={handleStyleChange}
            pageKind={selectedPage?.kind}
          />
        ) : (
          <div className="p-6 text-sm text-gray-400 text-center">섹션을 선택하세요</div>
        )}
      </section>
    </div>
  );
}
