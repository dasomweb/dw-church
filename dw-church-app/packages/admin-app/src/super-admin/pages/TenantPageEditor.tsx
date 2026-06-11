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
import { BuilderCanvas } from '../../components/builder/BuilderCanvas';
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
    { value: 'video_board', label: '영상 게시판', props: { title: '영상', category: '', limit: 6 } },
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
    { value: 'schedule_split', label: '예배 및 모임 (이미지+표)', props: { imageUrl: '', imagePosition: 'left', groups: [{ title: '주일 예배', columns: ['예배', '시간', '장소'], rows: [['1부 예배', '오전 9:00', '본당']] }] } },
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
  // Slugs of pages currently linked from the live nav menu — lets the page
  // list show which pages are actually reachable from the site's menu.
  const [menuSlugs, setMenuSlugs] = useState<Set<string>>(new Set());
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  // Which element inside the selected section the inspector focuses.
  // '__section__' = whole-block mode; a real key (e.g. 'title', 'content')
  // = focus mode, which shows that element's applied font/color (read from
  // the in-process canvas DOM via the design-token CSS cascade).
  const [selectedElementKey, setSelectedElementKey] = useState<string>('__section__');
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  // NO auto-save: edits update local `sections` (the in-process canvas reflects
  // them instantly) + `dirty` (drives the 저장/게시 buttons). The old iframe-
  // preview reload machinery is gone — the canvas renders @dw-church/blocks in
  // process, so there's nothing to reload.
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // edited since last save (drives the button)
  const [publishing, setPublishing] = useState(false);
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

  // Storefront origin for the "미리보기" link — admin.truelight.app →
  // truelight.app (the public web app; tenants render at /tenant/<slug>).
  const webOrigin = useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host.startsWith('admin.')) return `https://${host.replace('admin.', '')}`;
    return (import.meta.env.VITE_WEB_BASE_URL as string) || '';
  }, []);


  const headers = useMemo(() => ({
    Authorization: `Bearer ${session?.accessToken ?? ''}`,
    'X-Tenant-Slug': tenant?.slug ?? '',
    'Content-Type': 'application/json',
  }), [session?.accessToken, tenant?.slug]);
  // Headers for body-less requests (DELETE): Fastify rejects a request with
  // Content-Type: application/json but an empty body ("Body cannot be empty")
  // → 400. So omit Content-Type when there's no body.
  const noBodyHeaders = useMemo(() => ({
    Authorization: `Bearer ${session?.accessToken ?? ''}`,
    'X-Tenant-Slug': tenant?.slug ?? '',
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

  // Load the live menu → which pages are reachable from the nav. Used to badge
  // the page list so the operator sees which pages are actually in the menu.
  useEffect(() => {
    if (!tenant?.slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/v1/menus`, { headers, cache: 'no-store' });
        if (!res.ok) return;
        const body = await res.json() as { data?: { pageSlug?: string; page_slug?: string; isVisible?: boolean; is_visible?: boolean }[] };
        if (cancelled) return;
        const slugs = new Set<string>();
        for (const m of body.data ?? []) {
          if (m.isVisible === false || m.is_visible === false) continue;
          const slug = m.pageSlug ?? m.page_slug;
          if (slug) slugs.add(slug);
        }
        setMenuSlugs(slugs);
      } catch { /* non-fatal — badges just won't show */ }
    })();
    return () => { cancelled = true; };
  }, [tenant?.slug, baseUrl, headers]);

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
        setSelectedElementKey('__section__');
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
  // Live storefront URL for the selected page — opened by the 미리보기 button.
  const previewUrl = (webOrigin && tenant?.slug && selectedPage)
    ? `${webOrigin}/tenant/${tenant.slug}${selectedPage.isHome ? '' : `/${selectedPage.slug}`}`
    : '';

  // ElementInspector edits — auto-saved immediately so the live preview
  // reflects them (debounced reload, no flicker). `dirty` tracks "edited since
  // last publish" to drive the Publish (visibility) button.
  // NO auto-save (사장님 directive — per-keystroke PUTs strained the system):
  // edits ONLY mutate local `sections` (the in-process canvas reflects them
  // instantly) and add the section to `dirty`, which arms the 저장 button.
  // Nothing hits the server until the operator clicks 저장 / 게시.
  const handlePropsChange = (sectionId: string, next: Record<string, unknown>) => {
    if (!next || typeof next !== 'object' || Object.keys(next).length === 0) return;
    if (!sections.some((s) => s.id === sectionId)) return;
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, props: next } : s)));
    setDirty((prev) => new Set(prev).add(sectionId));
  };
  const handleStyleChange = (sectionId: string, blockStyle: unknown) => {
    const sec = sections.find((s) => s.id === sectionId);
    handlePropsChange(sectionId, { ...(sec?.props ?? {}), blockStyle });
  };

  // Explicit save — PUT every dirty section's props. Returns true on success
  // so 게시 can save-then-publish. Runs only from the 저장 / 게시 buttons.
  const [saving, setSaving] = useState(false);
  const saveAll = async (): Promise<boolean> => {
    if (!selectedPageId || dirty.size === 0) return true;
    setSaving(true);
    try {
      for (const id of Array.from(dirty)) {
        const sec = sections.find((s) => s.id === id);
        if (!sec) continue;
        const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections/${id}`, {
          method: 'PUT', headers, body: JSON.stringify({ props: sec.props }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
          throw new Error(body?.error?.message || `HTTP ${res.status}`);
        }
      }
      setDirty(new Set());
      return true;
    } catch (err) {
      showToast('error', err instanceof Error ? `저장 실패: ${err.message}` : '저장 실패');
      return false;
    } finally {
      setSaving(false);
    }
  };
  const handleSave = async () => {
    if (await saveAll()) showToast('success', '저장되었습니다');
  };

  // Canvas click → select a section + the clicked element. A bare section
  // click reports '__section__' (whole-block mode); clicking title/subtitle/
  // content/etc. reports that element key so the inspector enters focus mode
  // and shows the element's design-token-applied font/color.
  const selectElement = (sectionId: string, elementKey: string) => {
    setSelectedSectionId(sectionId);
    setSelectedElementKey(elementKey || '__section__');
  };

  // Publish — persist any pending edits FIRST (no auto-save), then make the
  // page publicly visible (status=published).
  const publishChanges = async () => {
    if (!selectedPageId || publishing) return;
    setPublishing(true);
    try {
      if (!(await saveAll())) return; // saveAll surfaced the error already
      if (selectedPage && selectedPage.status !== 'published') {
        const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}`, {
          method: 'PUT', headers, body: JSON.stringify({ status: 'published' }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPages((prev) => prev.map((p) => (p.id === selectedPageId ? { ...p, status: 'published' } : p)));
      }
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

  // Create a normal (static) page. Prompts for a title; the slug is derived
  // ascii-safe (falls back to page-xxxx for Korean-only titles). super_admin
  // bypasses the Pro+ plan gate on POST /pages.
  const createStaticPage = async () => {
    const title = window.prompt('새 페이지 제목을 입력하세요 (예: 교회 안내)');
    if (!title || !title.trim()) return;
    const rand = Math.random().toString(36).slice(2, 6);
    const ascii = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const slug = ascii ? `${ascii}-${rand}` : `page-${rand}`;
    setCreating(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/pages`, {
        method: 'POST', headers,
        body: JSON.stringify({ title: title.trim(), slug, kind: 'static', status: 'published', isHome: false, sortOrder: 999 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = normalizePage(await res.json() as Record<string, unknown>);
      setPages((prev) => [...prev, created]);
      setSelectedPageId(created.id);
      showToast('success', `"${title.trim()}" 페이지 생성됨 — 블록을 추가하세요. 메뉴에 노출하려면 메뉴 관리에서 연결하세요.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '페이지 생성 실패');
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
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '블록 추가 실패');
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!selectedPageId) return;
    // Deselect FIRST so the inspector unmounts and flushes any pending edit to
    // the section while it still exists (avoids a PUT to a just-deleted section
    // that would error). Then drop it locally and DELETE on the server.
    setSelectedSectionId((cur) => (cur === sectionId ? null : cur));
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setDirty((prev) => { const n = new Set(prev); n.delete(sectionId); return n; });
    try {
      const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections/${sectionId}`, {
        method: 'DELETE', headers: noBodyHeaders,
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? `블록 삭제 실패: ${err.message}` : '블록 삭제 실패');
    }
  };

  // Drag & drop reorder of sections. Reorders locally (the in-process canvas
  // reflects it immediately), then persists the new order via
  // POST /sections/reorder { ids }.
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
        } catch (err) {
          showToast('error', err instanceof Error ? err.message : '순서 변경 실패');
        }
      })();
      return withOrder;
    });
  };

  const hasChanges = dirty.size > 0;
  const canSave = !saving && !publishing && hasChanges;
  const canPublish = !publishing && !saving && (hasChanges || (selectedPage != null && selectedPage.status !== 'published'));

  const publishLabel = publishing
    ? '게시 중…'
    : selectedPage && selectedPage.status !== 'published'
      ? '게시 (PUBLISH)'
      : hasChanges
        ? `변경사항 게시${dirty.size ? ` (${dirty.size})` : ''}`
        : '게시됨 (PUBLISHED)';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top toolbar — NO auto-save. Edits stay local until 저장 / 게시. */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-1.5 shrink-0">
        <span className="text-xs text-gray-500 truncate">
          {selectedPage ? selectedPage.title : tenant?.name ?? ''}
          {hasChanges
            ? <span className="ml-2 text-amber-600">· 저장되지 않은 변경 {dirty.size}개</span>
            : <span className="ml-2 text-gray-400">· 모든 변경 저장됨</span>}
        </span>
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="이 페이지를 새 탭에서 미리보기"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              ↗ 미리보기
            </a>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              canSave
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'cursor-default bg-gray-100 text-gray-400'
            }`}
          >
            {saving ? '저장 중…' : `저장${dirty.size ? ` (${dirty.size})` : ''}`}
          </button>
          <button
            type="button"
            onClick={publishChanges}
            disabled={!canPublish}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              canPublish
                ? 'bg-green-600 text-white hover:bg-green-500'
                : 'cursor-default bg-gray-100 text-gray-400'
            }`}
          >
            {publishLabel}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Pane 1 — Pages */}
      <aside className="w-48 shrink-0 border-r bg-white overflow-y-auto">
        <div className="p-3 border-b flex items-center justify-between gap-1">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">페이지</h2>
          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void createStaticPage()}
            disabled={creating}
            title="새 일반 페이지 만들기"
            className="rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {creating ? '…' : '+ 페이지'}
          </button>
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
        </div>
        {loadingPages ? (
          <div className="p-3 text-xs text-gray-500">로딩 중...</div>
        ) : (
          <ul>
            {pages.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    // No auto-save: warn before discarding unsaved edits on switch.
                    if (p.id !== selectedPageId && dirty.size > 0 &&
                        !window.confirm('저장하지 않은 변경사항이 있습니다. 저장하지 않고 다른 페이지로 이동할까요?')) return;
                    setSelectedPageId(p.id);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedPageId === p.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {p.title}
                    {p.isHome && <span className="text-[10px] text-blue-500">★</span>}
                    {(menuSlugs.has(p.slug) || p.isHome) && (
                      <span
                        title="현재 메뉴(네비게이션)에 표시되는 페이지"
                        className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-[9px] font-medium px-1.5 py-px"
                      >
                        메뉴
                      </span>
                    )}
                  </span>
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
                  onClick={() => selectElement(s.id, '__section__')}
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

      {/* Pane 3 — Live preview (center) — in-process @dw-church/blocks render.
          Edits update `sections` state synchronously, so the canvas reflects
          every change instantly (b2bsmart-identical, no save→reload round trip). */}
      <section className="flex-1 min-w-0 overflow-hidden">
        {selectedPage ? (
          <BuilderCanvas
            sections={sections}
            slug={tenant?.slug ?? ''}
            baseUrl={baseUrl}
            headers={headers}
            selectedSectionId={selectedSectionId}
            selectedElementKey={selectedElementKey}
            onSelect={selectElement}
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
            // Driven by canvas clicks: '__section__' = whole-block mode;
            // a real element key (title/content/…) = focus mode, which shows
            // that element's design-token-applied font/color (read live from
            // the in-process canvas DOM by the inspector's useAppliedStyle).
            elementKey={selectedElementKey}
            onClose={() => { setSelectedSectionId(null); setSelectedElementKey('__section__'); }}
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
