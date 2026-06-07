import { useEffect, useMemo, useRef, useState } from 'react';
import { usePages } from '@dw-church/api-client';
// STAGE-1 STUB — catalog / application-form link targets are b2b-specific.
type ApplicationForm = { id: string; title?: string; slug?: string; name?: string; isActive?: boolean };
const useCatalogs = (): { data: unknown; isLoading: boolean } => ({ data: undefined, isLoading: false });
const useApplicationForms = (): { data: unknown; isLoading: boolean } => ({ data: undefined, isLoading: false });

/**
 * Reusable link picker for the builder inspector.
 *
 * Three modes auto-detected from the current value:
 *
 *   page      → '/about', '/services/wholesale' (anything starting
 *                with '/'). Combobox lists the tenant's published
 *                pages, search filters by title/slug, picking writes
 *                the slug back. Free-text typing supported for slugs
 *                that don't yet exist (e.g. operator wires a button
 *                to a page they're about to create).
 *
 *   external  → 'https://…' / 'mailto:' / 'tel:'. Plain text input.
 *
 *   anchor    → '#features', '#contact'. Same input as external,
 *                separate tab so the operator can tell at a glance
 *                that the link scrolls within the current page
 *                rather than navigating away.
 *
 * Empty value defaults to the page tab — the most common case for
 * CTAs in B2B sites.
 */

type LinkMode = 'page' | 'external' | 'anchor' | 'catalog' | 'form';

function detectMode(value: string): LinkMode {
  const v = value.trim();
  if (!v) return 'page';
  if (v.startsWith('#')) return 'anchor';
  if (v.startsWith('catalog:')) return 'catalog';
  if (v.startsWith('form:')) return 'form';
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:') || v.startsWith('tel:')) {
    return 'external';
  }
  return 'page';
}

export interface LinkFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Optional placeholder for the URL/anchor input. */
  placeholder?: string;
  /** Force the field into a single mode (hides the tab switcher). */
  lockMode?: LinkMode;
}

export function LinkField({ value, onChange, placeholder, lockMode }: LinkFieldProps) {
  const [mode, setMode] = useState<LinkMode>(lockMode ?? detectMode(value));

  // Re-sync mode when an external value change matches a different
  // category — covers the "operator reset to default" case where the
  // current mode no longer fits.
  useEffect(() => {
    if (lockMode) return;
    const next = detectMode(value);
    setMode((current) => (current === next ? current : next));
  }, [value, lockMode]);

  return (
    <div className="space-y-2">
      {!lockMode && (
        <div className="inline-flex rounded border border-gray-200 overflow-hidden text-[11px] flex-wrap">
          {(['page', 'external', 'anchor', 'catalog', 'form'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m === 'page' ? 'Page' :
               m === 'external' ? 'External URL' :
               m === 'anchor' ? 'Anchor (#)' :
               m === 'catalog' ? 'Catalog 📖' : 'Form 📝'}
            </button>
          ))}
        </div>
      )}

      {mode === 'page' && (
        <PagePicker value={value} onChange={onChange} placeholder={placeholder} />
      )}
      {mode === 'catalog' && (
        <CatalogPicker value={value} onChange={onChange} />
      )}
      {mode === 'form' && (
        <FormSlugPicker value={value} onChange={onChange} />
      )}
      {mode === 'external' && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'https://example.com'}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
        />
      )}
      {mode === 'anchor' && (
        <input
          type="text"
          value={value.startsWith('#') ? value.slice(1) : value}
          onChange={(e) => {
            const raw = e.target.value.replace(/^#+/, '');
            onChange(raw ? `#${raw}` : '');
          }}
          placeholder={placeholder ?? 'features'}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
        />
      )}
    </div>
  );
}

/* ─── page combobox ─────────────────────────────────────────── */

function PagePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const { data: pages, isLoading } = usePages();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Resync the input when the parent value changes (e.g. operator
  // pasted a path elsewhere, or switched element).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Normalise the comparison: '/about' and 'about' both match the
  // page with slug 'about'. We compare against the slug shape that
  // the storefront actually uses ('/about').
  const normalisedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!pages) return [];
    if (!normalisedQuery || normalisedQuery === '/') return pages;
    return pages.filter((p) => {
      const slugPath = `/${p.slug}`;
      return (
        p.title.toLowerCase().includes(normalisedQuery) ||
        slugPath.toLowerCase().includes(normalisedQuery)
      );
    });
  }, [pages, normalisedQuery]);

  // Currently-selected page (if value is a known slug).
  const selectedPage = useMemo(() => {
    if (!pages || !value) return null;
    const slug = value.startsWith('/') ? value.slice(1) : value;
    return pages.find((p) => p.slug === slug) ?? null;
  }, [pages, value]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Commit raw text on blur so operators can wire a button to
          // a page they're about to create. Only commit if it differs
          // from the parent's value to avoid a no-op render loop.
          const next = query.trim();
          if (next !== value) onChange(next);
        }}
        placeholder={placeholder ?? '/about or search pages'}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
      />
      {selectedPage && !open && (
        <p className="mt-1 text-[10px] text-gray-500">
          → <span className="font-medium text-gray-700">{selectedPage.title}</span>
          {selectedPage.status === 'draft' && (
            <span className="ml-1 text-amber-600">(draft)</span>
          )}
        </p>
      )}
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-auto rounded border border-gray-200 bg-white shadow-lg">
          {isLoading && (
            <div className="px-3 py-2 text-[11px] text-gray-500">Loading pages…</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-gray-500">
              No matching page. The value you type will be saved as-is.
            </div>
          )}
          {!isLoading &&
            filtered.map((p) => {
              const slugPath = `/${p.slug}`;
              const isSelected = value === slugPath || value === p.slug;
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    // mousedown beats the parent input's blur — without
                    // this the dropdown closes before the click registers.
                    e.preventDefault();
                    onChange(slugPath);
                    setQuery(slugPath);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{p.title}</div>
                  <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2">
                    <span>{slugPath}</span>
                    {p.status === 'draft' && (
                      <span className="text-amber-600">Draft</span>
                    )}
                    {p.isHome && <span className="text-blue-600">Home</span>}
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

/* ─── catalog picker ────────────────────────────────────────── */

function CatalogPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: catalogs, isLoading } = useCatalogs();
  const list = Array.isArray(catalogs) ? catalogs : [];
  const currentSlug = value.startsWith('catalog:') ? value.slice('catalog:'.length) : '';
  return (
    <div>
      <select
        value={currentSlug}
        onChange={(e) => onChange(e.target.value ? `catalog:${e.target.value}` : '')}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
      >
        <option value="">— 카탈로그 선택 —</option>
        {isLoading && <option disabled>로딩 중...</option>}
        {list.map((c) => (
          <option key={c.id} value={c.slug}>{c.title} ({c.slug})</option>
        ))}
      </select>
      <p className="mt-1 text-[10px] text-gray-500 leading-snug">
        선택한 카탈로그가 클릭 시 모달 안에서 reader 로 열림.
      </p>
    </div>
  );
}

/* ─── form slug picker ──────────────────────────────────────── */
/**
 * Searchable dropdown backed by useApplicationForms — 운영자가 slug 를
 * 외워서 타이핑하지 않도록 양식 이름으로 검색하고 클릭으로 선택.
 * 저장 형식은 'form:<slug>' (CTA / button scheme 과 일치).
 */
function FormSlugPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const currentSlug = value.startsWith('form:') ? value.slice('form:'.length) : '';
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useApplicationForms();
  const forms = useMemo<ApplicationForm[]>(() => {
    const raw = data as unknown;
    if (Array.isArray(raw)) return raw as ApplicationForm[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)) {
      return (raw as { data: ApplicationForm[] }).data;
    }
    return [];
  }, [data]);

  const selected = forms.find((f) => f.slug === currentSlug) ?? null;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return forms;
    return forms.filter(
      (f) =>
        (f.name ?? '').toLowerCase().includes(term) ||
        (f.slug ?? '').toLowerCase().includes(term),
    );
  }, [q, forms]);

  return (
    <div>
      {selected ? (
        <div className="flex items-center gap-2 mb-2 p-2 rounded border border-gray-200 bg-gray-50">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {selected.name}
              {!selected.isActive && (
                <span className="ml-1.5 text-[10px] font-normal text-amber-600">비활성</span>
              )}
            </div>
            <div className="text-[11px] font-mono text-gray-400 truncate">
              form:{selected.slug}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:bg-white"
            title="Clear form selection"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="text-xs text-gray-400 mb-2">No form selected</div>
      )}

      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name · slug"
        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
      />

      {open && (
        <div className="mt-1 max-h-52 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-2.5 text-[11px] text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-2.5 text-[11px] text-gray-400">
              No results — 신청서 양식 관리에서 먼저 생성하세요.
            </div>
          ) : (
            filtered.slice(0, 60).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onChange(`form:${f.slug}`);
                  setOpen(false);
                  setQ('');
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-blue-50 ${
                  currentSlug === f.slug ? 'bg-blue-100' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-900 truncate">
                    {f.name}
                    {!f.isActive && (
                      <span className="ml-1.5 text-[10px] font-normal text-amber-600">비활성</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 truncate">
                    {f.slug}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      <p className="mt-1 text-[10px] text-gray-500 leading-snug">
        클릭 시 모달 안에서 form 열림.
      </p>
    </div>
  );
}
