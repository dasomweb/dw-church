/**
 * Tenant Backups — super-admin backup / restore console for a single tenant.
 * Backend: /admin/tenants/:slug/backups (see modules/backups). A backup is an
 * in-database copy of the tenant's content + settings; restore replaces the
 * current data with a chosen version and auto-captures a pre-restore safety
 * backup first (so a restore is itself reversible).
 *
 * Media files in R2 are retained separately and are NOT affected by restore.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

interface Backup {
  id: string;
  kind: 'manual' | 'auto';
  note: string | null;
  tableCount: number;
  sizeBytes: number;
  createdBy: string | null;
  createdAt: string;
}

function humanSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function TenantBackups() {
  const session = useAuthStore((s) => s.session);
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();
  const slug = tenant?.slug ?? '';

  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string>(''); // '' | 'create' | 'restore:<id>' | 'delete:<id>'

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const baseUrl = host.startsWith('admin.')
    ? `https://api.${host.replace('admin.', '')}`
    : (import.meta.env.VITE_API_BASE_URL as string) || '';
  const authHeaders = { Authorization: `Bearer ${session?.accessToken ?? ''}` };

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/backups`, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBackups((json.data ?? []) as Backup[]);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '백업 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, baseUrl]);

  useEffect(() => { void load(); }, [load]);

  const createBackup = async () => {
    if (!slug || busy) return;
    setBusy('create');
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/backups`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '백업을 만들었습니다.');
      setNote('');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '백업 실패');
    } finally {
      setBusy('');
    }
  };

  const restore = async (b: Backup) => {
    if (!slug || busy) return;
    const when = fmtDate(b.createdAt);
    if (!window.confirm(
      `${when} 백업으로 복원합니다.\n\n현재 데이터는 이 백업의 내용으로 완전히 대체됩니다.\n(복원 직전 상태는 자동으로 백업되어 되돌릴 수 있습니다.)\n\n계속하시겠습니까?`,
    )) return;
    setBusy(`restore:${b.id}`);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/backups/${b.id}/restore`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '복원이 완료되었습니다. (복원 직전 상태도 자동 백업됨)');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '복원 실패');
    } finally {
      setBusy('');
    }
  };

  const remove = async (b: Backup) => {
    if (!slug || busy) return;
    if (!window.confirm(`${fmtDate(b.createdAt)} 백업을 삭제합니다. 되돌릴 수 없습니다.`)) return;
    setBusy(`delete:${b.id}`);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/backups/${b.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '백업을 삭제했습니다.');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">백업 / 복원</h1>
        <p className="text-sm text-gray-500 mt-1">
          이 테넌트의 콘텐츠·설정을 백업하고, 원하는 시점으로 복원합니다.
        </p>
      </div>

      {/* Create */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800">새 백업 만들기</h2>
        <p className="mt-1 text-xs text-gray-500">
          현재 상태를 한 버전으로 저장합니다. (최근 20개까지 보관되며, 초과 시 오래된 백업부터 자동 삭제)
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모(선택) — 예: 리디자인 전, 주보 대량등록 전"
            maxLength={200}
            disabled={busy === 'create'}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500"
          />
          <button
            onClick={createBackup}
            disabled={!slug || busy === 'create'}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {busy === 'create' ? '백업 중…' : '백업 만들기'}
          </button>
        </div>
      </section>

      {/* Scope note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        백업 범위는 <b>데이터베이스 콘텐츠·설정</b>(페이지, 설교/주보/앨범/행사/교역자 등)입니다.
        업로드된 이미지·PDF 등 미디어 파일은 별도로 보존되며 복원의 영향을 받지 않습니다.
      </div>

      {/* List */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">백업 목록 ({backups.length})</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-400">로딩 중…</div>
        ) : backups.length === 0 ? (
          <div className="p-6 text-sm text-gray-400">아직 백업이 없습니다. 위에서 첫 백업을 만드세요.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {backups.map((b) => {
              const isRestoring = busy === `restore:${b.id}`;
              const isDeleting = busy === `delete:${b.id}`;
              return (
                <div key={b.id} className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{fmtDate(b.createdAt)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        b.kind === 'auto' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {b.kind === 'auto' ? '자동' : '수동'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 truncate">
                      {b.note || (b.kind === 'auto' ? '복원 직전 자동 백업' : '메모 없음')}
                      <span className="text-gray-300"> · </span>
                      {b.tableCount}개 테이블 · {humanSize(b.sizeBytes)}
                      {b.createdBy && <> · {b.createdBy}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => restore(b)}
                      disabled={!!busy}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isRestoring ? '복원 중…' : '복원'}
                    </button>
                    <button
                      onClick={() => remove(b)}
                      disabled={!!busy}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      {isDeleting ? '삭제 중…' : '삭제'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
