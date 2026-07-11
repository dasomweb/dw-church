// Tenant reference photos — super-admin > 참조 사진. These are operator-
// uploaded photos of the real church (sanctuary, congregation, staff, events)
// that the AI website builder reads (files.kind='reference', matched by tags)
// to generate / match on-brand images. List + tagged upload + delete via
// /api/v1/files (kind=reference). Replaces the SuperAdminPlaceholder.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';
import { useToast } from '../../components';
import { resizeImage } from '../../utils/resize-image.js';

interface RefRow {
  id: string;
  url: string;
  originalName?: string;
  tags?: string[] | null;
  description?: string | null;
}

// Suggested tags help the operator describe what each photo depicts so the
// AI matcher can pick the right reference per section.
const SUGGESTED_TAGS = ['예배당', '성도', '교역자', '행사', '외관', '주차장', '교육관', '카페', '어린이', '찬양대'];

export default function TenantReferencePhotos() {
  const client = useDWChurchClient();
  const { showToast } = useToast();
  const [items, setItems] = useState<RefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const res = await client.adapter.get<{ data: RefRow[] }>('/api/v1/files', { kind: 'reference', perPage: 100, page: 1 });
      setItems(res?.data ?? []);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '참조 사진을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [client, showToast]);

  useEffect(() => { void load(); }, [load]);

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleUpload = async (files: FileList) => {
    if (!client || files.length === 0) return;
    // Reach the client's auth headers + base URL to POST multipart with the
    // ?kind=reference&tags= query (uploadFile() has no kind/tags option).
    const fa = (client as unknown as { fetchAdapter?: { baseUrl: string; headers: Record<string, string> } }).fetchAdapter;
    if (!fa) { showToast('error', 'API 클라이언트가 준비되지 않았습니다'); return; }
    setUploading(true);
    let ok = 0;
    try {
      const qs = `entityType=reference&kind=reference${tags.length ? `&tags=${encodeURIComponent(tags.join(','))}` : ''}`;
      for (const file of Array.from(files)) {
        try {
          // Reference photos are high-detail masters (AI references / become
          // backgrounds) → resize at the larger 1920px 'background' target,
          // JPEG. Still mandatory — no phone-camera originals to R2.
          const { file: resized } = await resizeImage(file, 'background');
          const fd = new FormData();
          fd.append('file', resized);
          // Drop Content-Type so the browser sets the multipart boundary.
          const headers: Record<string, string> = { ...fa.headers };
          delete headers['Content-Type'];
          delete headers['content-type'];
          const res = await fetch(`${fa.baseUrl}/api/v1/files/upload?${qs}`, { method: 'POST', headers, body: fd });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json() as { data?: RefRow } | RefRow;
          const row = ('data' in json ? json.data : json) as RefRow;
          if (row?.url) { setItems((prev) => [{ ...row, tags }, ...prev]); ok++; }
        } catch (e) {
          showToast('error', `${file.name}: ${e instanceof Error ? e.message : '업로드 실패'}`);
        }
      }
      if (ok > 0) showToast('success', `${ok}장 업로드됨${tags.length ? ` (태그: ${tags.join(', ')})` : ''}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (f: RefRow) => {
    if (!client) return;
    if (!window.confirm('이 참조 사진을 삭제할까요?')) return;
    try {
      await client.adapter.delete(`/api/v1/files/${f.id}`);
      setItems((prev) => prev.filter((x) => x.id !== f.id));
      showToast('success', '삭제됨');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '삭제 실패');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">참조 사진</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          실제 교회 사진(예배당·성도·교역자·행사 등)을 올려두면 AI 웹사이트 빌더가 이미지를 생성·매칭할 때 참고합니다.
          태그를 달면 더 정확히 매칭됩니다.
        </p>
      </div>

      {/* Upload bar with tag picker */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTED_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                tags.includes(t) ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {uploading ? '업로드 중…' : '↑ 참조 사진 업로드'}
          </button>
          <span className="text-xs text-gray-500">
            {tags.length ? `선택 태그: ${tags.join(', ')}` : '태그를 먼저 선택한 뒤 업로드하세요 (선택)'}
          </span>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files) void handleUpload(e.target.files); }} />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
          아직 참조 사진이 없습니다. 위에서 태그를 고르고 업로드하세요.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="aspect-square bg-gray-50">
                <img src={f.url} alt={f.originalName ?? ''} className="h-full w-full object-cover" loading="lazy" />
              </div>
              {f.tags && f.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 p-1.5">
                  {f.tags.slice(0, 4).map((t) => (
                    <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{t}</span>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => remove(f)} title="삭제"
                className="absolute right-1 top-1 hidden rounded bg-white/95 px-1.5 py-0.5 text-[11px] text-red-600 shadow group-hover:block">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
