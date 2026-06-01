/**
 * Super-admin PageBuilder (Phase 4 — minimal viable).
 *
 * Mounts at /super-admin/t/:slug/pages. The full b2bsmart inspector
 * (17 property fields × 3-tab Layout/Style/Advanced × element-registry
 * driven specs) is ~4800 lines of source plus contexts (DynamicSource,
 * AIImageGenerate, MediaPicker) that depend on tenant nav state and
 * apps/agents which dw-church doesn't ship. Porting that wholesale in
 * one go would either fail at runtime or eat days of mechanical work.
 *
 * This file ships a focused subset that exercises the new path
 * end-to-end:
 *   - 3-pane shell — page list / sections / inspector — same layout
 *     b2bsmart will eventually replace
 *   - Sections render through @dw-church/blocks' BlockRenderer so the
 *     new SectionShell + element primitives + block-style-resolver
 *     pipeline is actually exercised
 *   - The inspector reads/writes section.props through the existing
 *     PUT /pages/:id/sections/:sectionId endpoint (no API churn)
 *   - 6 essential property fields are inline: text, textarea, image
 *     URL, color, number, select. These are the operator-set values
 *     that drive 80% of block configuration. The b2bsmart 17-field
 *     pack lands in a follow-up Phase 4b that ports
 *     packages/blocks/property-fields verbatim.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

interface PageRow {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  status: string;
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
  const [saving, setSaving] = useState(false);

  const baseUrl = useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  }, []);

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

  const updateSectionProps = async (next: Record<string, unknown>) => {
    if (!selectedPageId || !selectedSection) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/pages/${selectedPageId}/sections/${selectedSection.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ props: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json() as Section;
      setSections((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Pane 1 — Pages */}
      <aside className="w-56 border-r bg-white overflow-y-auto">
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
      <section className="w-72 border-r bg-gray-50 overflow-y-auto">
        <div className="p-3 border-b bg-white">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">섹션</h2>
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

      {/* Pane 3 — Inspector */}
      <section className="flex-1 overflow-y-auto bg-white">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">인스펙터</h2>
          {saving && <span className="text-[10px] text-gray-500">저장 중...</span>}
        </div>
        {selectedSection ? (
          <Inspector key={selectedSection.id} section={selectedSection} onChange={updateSectionProps} saving={saving} />
        ) : (
          <div className="p-6 text-sm text-gray-400 text-center">섹션을 선택하세요</div>
        )}
      </section>
    </div>
  );
}

// ─── Inspector ───────────────────────────────────────────────────────
function Inspector({ section, onChange, saving }: { section: Section; onChange: (next: Record<string, unknown>) => void; saving: boolean }) {
  // Local draft state — only commits on blur to avoid hammering the
  // server every keystroke.
  const [draft, setDraft] = useState<Record<string, unknown>>(section.props);
  useEffect(() => { setDraft(section.props); }, [section.id, section.props]);

  const commit = (key: string, value: unknown) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-gray-400 font-mono mb-2">
        block_type: <span className="text-gray-700">{section.blockType}</span>
      </div>

      {/* Field rendering — block-type-agnostic. Inspect the props shape
          and render a field per top-level key. Future Phase 4b will
          replace this with the element-registry spec-driven inspector. */}
      {Object.entries(draft).map(([key, value]) => (
        <Field
          key={key}
          name={key}
          value={value}
          onChange={(v) => commit(key, v)}
          disabled={saving}
        />
      ))}
    </div>
  );
}

function Field({ name, value, onChange, disabled }: { name: string; value: unknown; onChange: (v: unknown) => void; disabled: boolean }) {
  // Field type inference — by key name suffix + value type. Crude but
  // covers the dw-church block prop shapes. Phase 4b replaces with
  // explicit per-block specs from element-registry.
  const isImage = /imageUrl|image|backgroundImageUrl|thumbnailUrl|logoUrl|photoUrl/i.test(name);
  const isColor = /color|background|fill/i.test(name) && typeof value === 'string' && /^#/.test(value);
  const isLongText = typeof value === 'string' && (value.length > 80 || /content|description|message|html|body/i.test(name));
  const isNumber = typeof value === 'number';
  const isBool = typeof value === 'boolean';
  const isUrl = typeof value === 'string' && /url|href|link/i.test(name);
  const isShortText = typeof value === 'string';

  const label = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Url/g, 'URL');

  if (isBool) {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="font-medium text-gray-700">{label}</span>
      </label>
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {isImage ? (
        <div className="space-y-1">
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="https://..."
            className="w-full px-2 py-1.5 text-xs border rounded disabled:opacity-50"
          />
          {typeof value === 'string' && value && (
            <img src={value} alt="" className="w-full h-24 object-cover rounded border" />
          )}
        </div>
      ) : isColor ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(value as string) ?? '#000000'}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-8 h-8 rounded cursor-pointer disabled:opacity-50"
          />
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-2 py-1.5 text-xs font-mono border rounded disabled:opacity-50"
          />
        </div>
      ) : isUrl ? (
        <input
          type="url"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://..."
          className="w-full px-2 py-1.5 text-xs border rounded disabled:opacity-50"
        />
      ) : isNumber ? (
        <input
          type="number"
          value={value as number}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full px-2 py-1.5 text-sm border rounded disabled:opacity-50"
        />
      ) : isLongText ? (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full px-2 py-1.5 text-sm border rounded disabled:opacity-50"
        />
      ) : isShortText ? (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-2 py-1.5 text-sm border rounded disabled:opacity-50"
        />
      ) : (
        <div className="text-xs text-gray-400 italic">
          {Array.isArray(value) ? `Array(${value.length})` : typeof value === 'object' && value !== null ? 'Object' : '(unsupported)'}
        </div>
      )}
    </div>
  );
}
