// MediaPicker — tenant media-library browser for the builder inspector.
//
// Browses the tenant's uploaded files via GET /api/v1/files (paginated,
// tenant-schema isolated) and lets the operator pick an existing image or
// upload a new one inline. The api-client carries the target tenant's
// X-Tenant-Slug — SuperAdminTenantLayout calls client.setTenantSlug(slug),
// so under /super-admin/t/:slug this lists / uploads to the right tenant.
//
// Uploads go through client.uploadFile (client-side resize + R2 + DB row),
// honoring the project rule that all images are self-hosted on R2 and
// recorded in the DB — never hotlinked.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';
import { resizeImage } from '../../../utils/resize-image.js';

export interface MediaItem {
  id: string;
  url: string;
  filename?: string;
  width?: number;
  height?: number;
}

interface FileRow {
  id: string;
  url: string;
  originalName?: string;
  mimeType?: string;
  createdAt?: string;
}

interface Props {
  onClose: () => void;
  onSelect?: (item: MediaItem) => void;
  onSelectMulti?: (items: MediaItem[]) => void;
  multi?: boolean;
  // accepted for caller compatibility; used only as soft display hints
  preferredRatio?: string;
  preferredKind?: string;
}

const PER_PAGE = 60;

export function MediaPicker({ onClose, onSelect, onSelectMulti, multi }: Props) {
  const client = useDWChurchClient();
  const [items, setItems] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // 'tenant' = this church's own uploads (/files); 'shared' = the super-admin
  // curated 공용 라이브러리 (/shared-images), readable by any tenant.
  const [source, setSource] = useState<'tenant' | 'shared'>('tenant');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    setPicked(new Set());
    try {
      if (source === 'shared') {
        // Shared library: { data: [{ id, url, title, category, ... }] }.
        const res = await client.adapter.get<{ data: { id: string; url: string; title?: string }[] }>(
          '/api/v1/shared-images', { active: 'true' },
        );
        setItems((res?.data ?? []).map((s) => ({ id: s.id, url: s.url, originalName: s.title })));
      } else {
        // client.adapter.get camelizes the response + carries the tenant
        // header; query params pass through as-is so perPage is honored.
        const res = await client.adapter.get<{ data: FileRow[] }>('/api/v1/files', { perPage: PER_PAGE, page: 1 });
        const all = res?.data ?? [];
        // Images only — the library also stores PDFs (bulletins) etc.
        setItems(all.filter((f) => !f.mimeType || f.mimeType.startsWith('image/')));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '미디어를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [client, source]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toItem = (f: FileRow): MediaItem => ({ id: f.id, url: f.url, filename: f.originalName });

  const choose = (f: FileRow) => {
    if (multi) {
      setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
        return next;
      });
      return;
    }
    onSelect?.(toItem(f));
  };

  const confirmMulti = () => {
    const chosen = items.filter((f) => picked.has(f.id)).map(toItem);
    onSelectMulti?.(chosen);
  };

  const handleUpload = async (file: File) => {
    if (!client) return;
    setUploading(true);
    setError(null);
    try {
      // Mandatory client-side resize → JPEG before R2 (see resize-image.ts).
      const { file: resized } = await resizeImage(file, 'content');
      const result = await client.uploadFile(resized, 'media');
      if (!result?.url) throw new Error('업로드 응답에 URL이 없습니다');
      // Newly uploaded image jumps to the front; single-pick mode selects
      // it immediately (operator's intent on upload is "use this one").
      const row: FileRow = { id: result.id ?? result.url, url: result.url, originalName: file.name, mimeType: file.type };
      setItems((prev) => [row, ...prev]);
      if (!multi) onSelect?.(toItem(row));
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">미디어 라이브러리</h3>
            {/* Source tabs — 내 미디어(테넌트) / 공용 라이브러리(슈퍼어드민 큐레이션) */}
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setSource('tenant')}
                className={`px-3 py-1.5 font-medium transition-colors ${source === 'tenant' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                내 미디어
              </button>
              <button
                type="button"
                onClick={() => setSource('shared')}
                className={`px-3 py-1.5 font-medium transition-colors ${source === 'shared' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                공용 라이브러리
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Upload only into the tenant's own library (shared is super-admin only). */}
            {source === 'tenant' && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {uploading ? '업로드 중…' : '↑ 업로드'}
              </button>
            )}
            <button type="button" onClick={load} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50" title="새로고침">
              ↻
            </button>
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
              닫기
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">불러오는 중…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {source === 'shared'
                ? '공용 라이브러리에 이미지가 없습니다.'
                : <>아직 업로드된 이미지가 없습니다. 위의 <strong>업로드</strong> 버튼으로 추가하세요.</>}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {items.map((f) => {
                const isPicked = picked.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => choose(f)}
                    title={f.originalName ?? ''}
                    className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-gray-50 transition-colors ${
                      isPicked ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-blue-300'
                    }`}
                  >
                    <img src={f.url} alt={f.originalName ?? ''} className="h-full w-full object-cover" loading="lazy" />
                    {isPicked && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (multi-select) */}
        {multi && (
          <div className="flex items-center justify-between border-t px-5 py-3">
            <span className="text-xs text-gray-500">{picked.size}개 선택됨</span>
            <button
              type="button"
              onClick={confirmMulti}
              disabled={picked.size === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              선택 적용
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
