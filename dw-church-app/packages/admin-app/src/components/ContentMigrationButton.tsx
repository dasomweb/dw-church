import { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { useToast } from './index';

/**
 * Per-module content migration trigger. Lives on a content management page
 * (칼럼/설교/주보/앨범/…) and imports ONLY that one content type from a source
 * site via POST /migration/migrate-content. The agent is scoped to the single
 * type → small, reliable extraction; re-import is idempotent (source_url).
 *
 * The request goes to the api-server's Railway-direct domain (not the
 * Cloudflare edge): a content migration runs 60-130s and would hit Cloudflare's
 * ~100s proxy timeout → "Failed to fetch".
 */
export function ContentMigrationButton({
  contentType,
  label,
  onDone,
}: {
  contentType: string;
  label: string;
  onDone?: () => void;
}) {
  const session = useAuthStore((s) => s.session);
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const tenantSlug = session?.user?.tenantSlug ?? '';

  const baseUrl = (() => {
    const override = (import.meta.env.VITE_MIGRATION_DIRECT_BASE_URL as string)
      || (import.meta.env.VITE_PLANNER_DIRECT_BASE_URL as string) || '';
    if (override) return override;
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host === 'admin.truelight.app') return 'https://api-server-production-c612.up.railway.app';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  })();

  const run = async () => {
    const url = sourceUrl.trim();
    if (!url) { showToast('error', '원본 사이트 URL을 입력하세요.'); return; }
    if (!tenantSlug) { showToast('error', '테넌트를 확인할 수 없습니다.'); return; }
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/migration/migrate-content`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceUrl: url, tenantSlug, contentType }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      const applied = Number(body?.data?.applied ?? 0);
      setResult(applied);
      showToast('success', `${label} ${applied}개를 가져왔습니다.`);
      onDone?.();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '가져오기 실패');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setSourceUrl(''); setResult(null); setOpen(true); }}
        className="px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
      >
        📥 URL에서 가져오기
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !running && setOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">{label} 가져오기</h3>
            <p className="mt-2 text-sm text-gray-600">
              원본 교회 사이트 URL을 입력하면 <strong>{label}</strong>만 자동으로 가져옵니다.
              이미지는 R2에 업로드되고, 다시 실행해도 중복 없이 갱신됩니다(멱등).
            </p>
            <input
              autoFocus
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void run(); }}
              placeholder="https://example-church.org"
              disabled={running}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {running && (
              <p className="mt-3 text-xs text-gray-500">가져오는 중… (60~130초 소요될 수 있습니다)</p>
            )}
            {result !== null && !running && (
              <p className="mt-3 text-sm font-medium text-green-700">✅ {result}개 적용됨</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={running}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                닫기
              </button>
              <button onClick={() => void run()} disabled={running || !sourceUrl.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {running ? '가져오는 중…' : '가져오기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
