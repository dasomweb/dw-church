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
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageSection } from '@dw-church/api-client';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';
import { ElementInspector } from '../../components/builder/ElementInspector';
import { LivePreviewPane } from '../../components/builder/LivePreviewPane';
import { ContentEntryPanel } from './ContentEntryPanel';

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

// Full block catalog for the "+ 블록" picker, grouped by category. Each entry
// carries sensible default props so a freshly added block renders with
// placeholder content instead of an empty box. Block `value`s must exist in
// the server's blockTypes enum (pages/schema.ts) and have a BlockRenderer
// mapping (apps/web/components/BlockRenderer.tsx).
interface AddBlock { value: string; label: string; props?: Record<string, unknown> }
const ADD_BLOCK_CATALOG: { category: string; blocks: AddBlock[] }[] = [
  { category: '히어로', blocks: [
    { value: 'hero_banner', label: '히어로 배너', props: { title: '제목', subtitle: '', height: 'md', layout: 'full', textAlign: 'center', overlayColor: '#000000', overlayOpacity: 50 } },
    { value: 'banner_slider', label: '배너 슬라이더', props: { category: 'main' } },
    { value: 'hero_split', label: '분할 히어로', props: { title: '', imagePosition: 'right' } },
  ]},
  { category: '소개', blocks: [
    { value: 'pastor_message', label: '담임목사 인사', props: { title: '담임목사 인사', pastorName: '', message: '', layout: 'right' } },
    { value: 'church_intro', label: '교회 소개', props: { title: '', content: '' } },
    { value: 'mission_vision', label: '미션 / 비전', props: { title: '', content: '' } },
  ]},
  { category: '콘텐츠', blocks: [
    { value: 'recent_sermons', label: '설교 목록', props: { title: '최근 설교', limit: 6 } },
    { value: 'recent_bulletins', label: '주보 목록', props: { title: '주보', limit: 6 } },
    { value: 'recent_columns', label: '칼럼 목록', props: { title: '목회칼럼', limit: 6 } },
    { value: 'album_gallery', label: '앨범', props: { title: '앨범', limit: 6 } },
    { value: 'staff_grid', label: '교역자', props: { title: '섬기는 사람들', limit: 20 } },
    { value: 'event_grid', label: '행사', props: { title: '교회 행사', limit: 4 } },
    { value: 'history_timeline', label: '교회 연혁', props: { title: '교회 연혁' } },
    { value: 'board', label: '게시판', props: { title: '게시판', boardSlug: '', limit: 10 } },
  ]},
  { category: '텍스트', blocks: [
    { value: 'section_header', label: '섹션 헤더', props: { title: '' } },
    { value: 'text_only', label: '텍스트', props: { title: '', content: '' } },
    { value: 'text_image', label: '텍스트 + 이미지', props: { title: '', content: '', imageUrl: '' } },
    { value: 'quote_block', label: '인용 / 말씀', props: { quote: '' } },
  ]},
  { category: '교회 정보', blocks: [
    { value: 'worship_times', label: '예배 시간', props: { title: '예배 안내', services: [] } },
    { value: 'location_map', label: '지도 / 약도', props: { title: '오시는 길', address: '' } },
    { value: 'contact_info', label: '연락처', props: { title: '연락처' } },
    { value: 'newcomer_info', label: '새가족 안내', props: { title: '처음 오신 분들을 환영합니다' } },
  ]},
  { category: 'CTA / 미디어', blocks: [
    { value: 'call_to_action', label: 'CTA 배너', props: { title: '', ctaLabel: '', ctaUrl: '' } },
    { value: 'image_gallery', label: '이미지 갤러리', props: { title: '', images: [] } },
    { value: 'video', label: '비디오', props: {} },
  ]},
  { category: '레이아웃', blocks: [
    { value: 'layout_section', label: '섹션 컨테이너', props: { layout: 'section', padding: '40px 24px', children: [] } },
    { value: 'layout_columns', label: '컬럼 (2열)', props: { layout: 'columns-2', gap: 24, padding: '24px', children: [] } },
    { value: 'divider', label: '구분선', props: {} },
  ]},
];

// This console uses raw fetch (not the api-client), so responses arrive in
// the server's snake_case. Normalize to the camelCase the UI/inspector
// expect — without this, blockType/isVisible are undefined → the inspector
// shows "No editor registered ()" and every section reads as 숨김.
function normalizeSection(s: Record<string, unknown>): Section {
  return {
    id: String(s.id),
    blockType: String(s.blockType ?? s.block_type ?? ''),
    sortOrder: Number(s.sortOrder ?? s.sort_order ?? 0),
    isVisible: (s.isVisible ?? s.is_visible ?? true) as boolean,
    props: (s.props ?? {}) as Record<string, unknown>,
  };
}
function normalizePage(p: Record<string, unknown>): PageRow {
  return {
    id: String(p.id),
    slug: String(p.slug ?? ''),
    title: String(p.title ?? ''),
    isHome: (p.isHome ?? p.is_home ?? false) as boolean,
    status: String(p.status ?? 'draft'),
    kind: (p.kind as string) ?? 'static',
  };
}

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
  // b2bsmart model: edits auto-save immediately (so the live preview reflects
  // them) — the Publish button controls page visibility (draft → published).
  // The preview iframe reload is debounced (not per keystroke) and the iframe
  // is not remounted, so there's no flicker.
  const [previewNonce, setPreviewNonce] = useState(0);
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // edited since last publish (drives the button)
  const [publishing, setPublishing] = useState(false);
  const previewTimer = useRef<number | null>(null);
  const schedulePreviewReload = () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => setPreviewNonce((n) => n + 1), 800);
  };
  useEffect(() => () => { if (previewTimer.current) clearTimeout(previewTimer.current); }, []);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
        const body = await res.json() as { data: Record<string, unknown>[] };
        if (cancelled) return;
        const rows = body.data.map(normalizePage);
        setPages(rows);
        if (rows.length > 0 && !selectedPageId) setSelectedPageId(rows[0]!.id);
      } catch (err) {
        if (!cancelled) showToast('error', err instanceof Error ? err.message : '페이지 로딩 실패');
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.slug, baseUrl, headers, showToast, selectedPageId]);

  // Load sections for selected page. Switching pages discards any unpublished
  // local edits from the previous page (operator should Publish first).
  useEffect(() => {
    setDirty(new Set());
    if (!selectedPageId) { setSections([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingSections(true);
      try {
        const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json() as { data: Record<string, unknown>[] };
        if (cancelled) return;
        const rows = body.data.map(normalizeSection).sort((a, b) => a.sortOrder - b.sortOrder);
        setSections(rows);
        setSelectedSectionId(rows[0]?.id ?? null);
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

  // ElementInspector edits — auto-saved immediately so the live preview
  // reflects them (debounced reload, no flicker). `dirty` tracks "edited since
  // last publish" to drive the Publish (visibility) button.
  const handlePropsChange = (sectionId: string, next: Record<string, unknown>) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, props: next } : s)));
    setDirty((prev) => new Set(prev).add(sectionId));
    void (async () => {
      if (!selectedPageId) return;
      try {
        const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections/${sectionId}`, {
          method: 'PUT', headers, body: JSON.stringify({ props: next }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        schedulePreviewReload();
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : '저장 실패');
      }
    })();
  };
  const handleStyleChange = (sectionId: string, blockStyle: unknown) => {
    const sec = sections.find((s) => s.id === sectionId);
    handlePropsChange(sectionId, { ...(sec?.props ?? {}), blockStyle });
  };

  // Publish — make the page publicly visible (status=published). Edits are
  // already saved (auto-save), so this just flips visibility + clears the
  // pending-changes flag and refreshes the preview.
  const publishChanges = async () => {
    if (!selectedPageId || publishing) return;
    setPublishing(true);
    try {
      if (selectedPage && selectedPage.status !== 'published') {
        const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}`, {
          method: 'PUT', headers, body: JSON.stringify({ status: 'published' }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPages((prev) => prev.map((p) => (p.id === selectedPageId ? { ...p, status: 'published' } : p)));
      }
      setDirty(new Set());
      setPreviewNonce((n) => n + 1);
      showToast('success', '게시되었습니다');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '게시 실패');
    } finally {
      setPublishing(false);
    }
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

  // Create a fresh, empty detail-template page (separate from the content
  // LIST pages) and select it. Server allows this for super_admin regardless
  // of the tenant's plan (requirePlan bypasses super_admin).
  const createTemplate = async (kind: string, label: string) => {
    setTemplateMenuOpen(false);
    setCreating(true);
    try {
      const slug = `tpl-${kind.replace(/_/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;
      const res = await fetch(`${baseUrl}/api/v1/pages`, {
        method: 'POST', headers,
        body: JSON.stringify({ title: label, slug, kind, status: 'published', isHome: false, sortOrder: 999 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = normalizePage(await res.json() as Record<string, unknown>);
      setPages((prev) => [...prev, created]);
      setSelectedPageId(created.id);
      showToast('success', `${label} 생성됨 — 블록을 추가하고 ⚙ 로 현재 항목 데이터를 연결하세요`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '템플릿 생성 실패');
    } finally {
      setCreating(false);
    }
  };

  // Add a new block (section) to the selected page. super_admin bypasses the
  // Pro+ plan gate on POST /sections, so this works on any tenant.
  const addBlock = async (blockType: string, props: Record<string, unknown> = {}) => {
    if (!selectedPageId) return;
    setAddMenuOpen(false);
    try {
      const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections`, {
        method: 'POST', headers,
        body: JSON.stringify({ blockType, props, sortOrder: sections.length, isVisible: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = normalizeSection(await res.json() as Record<string, unknown>);
      setSections((prev) => [...prev, created]);
      setSelectedSectionId(created.id);
      setPreviewNonce((n) => n + 1);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '블록 추가 실패');
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!selectedPageId) return;
    try {
      const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections/${sectionId}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      setSelectedSectionId((cur) => (cur === sectionId ? null : cur));
      setDirty((prev) => { const n = new Set(prev); n.delete(sectionId); return n; });
      setPreviewNonce((n) => n + 1);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '블록 삭제 실패');
    }
  };

  // Drag & drop reorder of sections. Reorders locally, then persists the new
  // order via POST /sections/reorder { ids } and refreshes the preview.
  const reorderSections = (from: number, to: number) => {
    if (from === to || !selectedPageId) return;
    setSections((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      const withOrder = next.map((s, i) => ({ ...s, sortOrder: i }));
      const ids = withOrder.map((s) => s.id);
      void (async () => {
        try {
          const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections/reorder`, {
            method: 'POST', headers, body: JSON.stringify({ ids }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          schedulePreviewReload();
        } catch (err) {
          showToast('error', err instanceof Error ? err.message : '순서 변경 실패');
        }
      })();
      return withOrder;
    });
  };

  const hasChanges = dirty.size > 0;
  const canPublish = !publishing && (hasChanges || (selectedPage != null && selectedPage.status !== 'published'));

  const publishLabel = publishing
    ? '게시 중…'
    : selectedPage && selectedPage.status !== 'published'
      ? '게시 (PUBLISH)'
      : hasChanges
        ? `변경사항 게시${dirty.size ? ` (${dirty.size})` : ''}`
        : '게시됨 (PUBLISHED)';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top toolbar — no auto-save; the operator publishes explicitly. */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-1.5 shrink-0">
        <span className="text-xs text-gray-500 truncate">
          {selectedPage ? selectedPage.title : tenant?.name ?? ''}
          <span className="ml-2 text-green-600">자동 저장됨</span>
          {hasChanges && <span className="ml-2 text-amber-600">· 미게시 변경 {dirty.size}개</span>}
        </span>
        <button
          type="button"
          onClick={publishChanges}
          disabled={!canPublish}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            canPublish
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'cursor-default bg-gray-100 text-gray-400'
          }`}
        >
          {publishLabel}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Pane 1 — Pages */}
      <aside className="w-48 shrink-0 border-r bg-white overflow-y-auto">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">페이지</h2>
          <div className="relative">
            <button
              type="button"
              onClick={() => setTemplateMenuOpen((v) => !v)}
              disabled={creating}
              title="새 상세 템플릿 만들기"
              className="rounded border border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {creating ? '…' : '+ 템플릿'}
            </button>
            {templateMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                {PAGE_KINDS.filter((k) => k.value !== 'static').map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => createTemplate(k.value, k.label)}
                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                  >
                    + {k.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">섹션</h2>
            {selectedPage && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAddMenuOpen((v) => !v)}
                  title="블록 추가"
                  className="rounded border border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
                >
                  + 블록
                </button>
                {addMenuOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 max-h-[28rem] w-48 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    {ADD_BLOCK_CATALOG.map((group) => (
                      <div key={group.category}>
                        <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {group.category}
                        </div>
                        {group.blocks.map((b) => (
                          <button
                            key={b.value}
                            type="button"
                            onClick={() => addBlock(b.value, b.props ?? {})}
                            className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50"
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
            {sections.map((s, idx) => (
              <li
                key={s.id}
                draggable
                onDragStart={(e) => { setDragIndex(idx); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverIndex !== idx) setDragOverIndex(idx); }}
                onDragLeave={() => { if (dragOverIndex === idx) setDragOverIndex(null); }}
                onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) reorderSections(dragIndex, idx); setDragIndex(null); setDragOverIndex(null); }}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                className={`group relative border-b border-gray-200 ${selectedSectionId === s.id ? 'bg-blue-50' : 'hover:bg-white'} ${dragOverIndex === idx && dragIndex !== idx ? 'border-t-2 border-t-blue-500' : ''} ${dragIndex === idx ? 'opacity-40' : ''}`}
              >
                <button
                  onClick={() => setSelectedSectionId(s.id)}
                  className="flex w-full items-start gap-1.5 px-2 py-2 pr-7 text-left text-sm"
                >
                  <span className="mt-0.5 cursor-grab select-none text-gray-300 group-hover:text-gray-400" title="드래그하여 순서 변경">⠿</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gray-600">{s.blockType}</span>
                      {!s.isVisible && <span className="text-[10px] text-gray-400">숨김</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-gray-400">
                      {(s.props.title as string) ?? (s.props.heading as string) ?? '(no title)'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteSection(s.id)}
                  title="블록 삭제"
                  className="absolute right-1 top-1.5 hidden h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 group-hover:flex"
                >
                  ×
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
          {hasChanges && <span className="text-[10px] text-amber-600">미게시 변경</span>}
        </div>
        {selectedSection ? (
          <>
          <ContentEntryPanel
            baseUrl={baseUrl}
            headers={headers}
            section={selectedSection}
            onChangeProps={handlePropsChange}
          />
          <ElementInspector
            key={selectedSection.id}
            pageId={selectedPageId ?? ''}
            sections={sections.map((s) => ({ ...s, pageId: selectedPageId ?? '' })) as unknown as PageSection[]}
            sectionId={selectedSection.id}
            // '__section__' = edit the whole block (all fields). An empty
            // string would put the inspector in single-element focus mode
            // and only show the "comes from content" placeholder.
            elementKey="__section__"
            onClose={() => setSelectedSectionId(null)}
            onPropsChange={handlePropsChange}
            onStyleOverridesChange={handleStyleChange}
            pageKind={selectedPage?.kind}
          />
          </>
        ) : (
          <div className="p-6 text-sm text-gray-400 text-center">섹션을 선택하세요</div>
        )}
      </section>
      </div>
    </div>
  );
}
