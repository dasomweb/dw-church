// Tenant media library — super-admin > 미디어. Browses, uploads, and deletes
// the tenant's R2-backed files via /api/v1/files (GET/POST/DELETE). The
// api-client carries X-Tenant-Slug (set by SuperAdminTenantLayout), so all
// calls target the correct tenant. Replaces the SuperAdminPlaceholder stub.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';
import { useToast } from '../../components';
import { resizeImage } from '../../utils/resize-image.js';

interface FileRow {
  id: string;
  url: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt?: string;
}

const PER_PAGE = 60;

function isImage(f: FileRow): boolean {
  return !f.mimeType || f.mimeType.startsWith('image/');
}

function prettySize(n?: number): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function TenantMediaLibrary() {
  const client = useDWChurchClient();
  const { showToast } = useToast();
  const [items, setItems] = useState<FileRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (pageNum: number, append: boolean) => {
    if (!client) return;
    setLoading(true);
    try {
      const res = await client.adapter.get<{ data: FileRow[]; pagination?: { totalPages?: number } }>(
        '/api/v1/files', { perPage: PER_PAGE, page: pageNum },
      );
      const rows = res?.data ?? [];
      setItems((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(Boolean(res?.pagination?.totalPages && pageNum < res.pagination.totalPages));
      setPage(pageNum);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '미디어를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [client, showToast]);

  useEffect(() => { void load(1, false); }, [load]);

  const handleUpload = async (files: FileList) => {
    if (!client || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const file of Array.from(files)) {
        try {
          // Mandatory client-side resize → JPEG before R2 (resize-image.ts).
          const { file: resized } = await resizeImage(file, 'content');
          const r = await client.uploadFile(resized);
          if (r?.url) {
            setItems((prev) => [{ id: r.id ?? r.url, url: r.url, originalName: resized.name, mimeType: resized.type, sizeBytes: resized.size }, ...prev]);
            ok++;
          }
        } catch (e) {
          showToast('error', `${file.name}: ${e instanceof Error ? e.message : '업로드 실패'}`);
        }
      }
      if (ok > 0) showToast('success', `${ok}개 업로드됨`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (f: FileRow) => {
    if (!client) return;
    if (!window.confirm(`"${f.originalName ?? '파일'}"을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await client.adapter.delete(`/api/v1/files/${f.id}`);
      setItems((prev) => prev.filter((x) => x.id !== f.id));
      showToast('success', '삭제됨');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const [backfilling, setBackfilling] = useState(false);
  const handleBackfill = async () => {
    if (!client) return;
    setBackfilling(true);
    try {
      const res = await client.adapter.post<{ data: { added: number; total: number } }>(
        '/api/v1/files/backfill-migration', {},
      );
      const added = res?.data?.added ?? 0;
      showToast('success', added > 0 ? `누락된 이미지 ${added}개를 라이브러리에 등록했습니다.` : '새로 등록할 이미지가 없습니다.');
      if (added > 0) void load(1, false);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '등록 실패');
    } finally {
      setBackfilling(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('success', 'URL 복사됨');
    } catch {
      showToast('error', 'URL 복사 실패');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">미디어 라이브러리</h1>
          <p className="text-xs text-gray-500 mt-0.5">이 테넌트의 업로드 파일 (R2 저장). 이미지·PDF 등.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleBackfill()}
            disabled={backfilling}
            title="R2에 있지만 라이브러리에 누락된 이미지(마이그레이션·import 등)를 모두 등록합니다"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {backfilling ? '등록 중…' : '🚚 누락 이미지 등록'}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {uploading ? '업로드 중…' : '↑ 파일 업로드'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) void handleUpload(e.target.files); }}
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-500">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-sm text-gray-400">
          아직 업로드된 파일이 없습니다. 위의 <strong>파일 업로드</strong> 버튼으로 추가하세요.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((f) => (
              <div key={f.id} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="aspect-square bg-gray-50">
                  {isImage(f) ? (
                    <img src={f.url} alt={f.originalName ?? ''} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
                      <span className="text-2xl">📄</span>
                      <span className="px-2 text-[10px] uppercase">{(f.mimeType ?? '').split('/')[1] || 'file'}</span>
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <div className="truncate text-[11px] text-gray-700" title={f.originalName ?? ''}>{f.originalName ?? '(이름 없음)'}</div>
                  <div className="text-[10px] text-gray-400">{prettySize(f.sizeBytes)}</div>
                </div>
                {/* Hover actions */}
                <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => copyUrl(f.url)} title="URL 복사"
                    className="rounded bg-white/95 px-1.5 py-0.5 text-[11px] text-gray-700 shadow hover:bg-white">URL</button>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" title="새 탭에서 열기"
                    className="rounded bg-white/95 px-1.5 py-0.5 text-[11px] text-gray-700 shadow hover:bg-white">↗</a>
                  <button type="button" onClick={() => remove(f)} title="삭제"
                    className="rounded bg-white/95 px-1.5 py-0.5 text-[11px] text-red-600 shadow hover:bg-white">×</button>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => void load(page + 1, true)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? '불러오는 중…' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
