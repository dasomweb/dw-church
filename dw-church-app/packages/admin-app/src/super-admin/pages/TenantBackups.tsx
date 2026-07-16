/**
 * Tenant Backups — super-admin backup/restore console for one tenant. TWO tiers:
 *
 *  1. 전체 백업 (R2 Full Backup) — durable DB + media snapshot in a dedicated R2
 *     backup bucket. Survives total DB / content-bucket loss and can recreate a
 *     deleted tenant. Restore is a full overwrite (slug-confirmed). Also runs
 *     nightly + automatically before a tenant delete.
 *     Backend: /admin/tenants/:slug/full-backups
 *
 *  2. 빠른 스냅샷 (In-DB) — same-database schema copy; fast day-to-day undo, but
 *     lives in the operational DB so it is NOT disaster-proof.
 *     Backend: /admin/tenants/:slug/backups
 *
 * Super-admin only (mounted under the /super-admin/t/:slug console).
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

interface FullBackup {
  snapshotId: string;
  createdAt: string;
  kind: 'manual' | 'pre-delete' | 'pre-build' | 'nightly';
  includesFiles: boolean;
  tableCount: number;
  rowCount: number;
  fileCount: number;
  fileBytes: number;
  note: string | null;
  createdBy: string | null;
}
interface QuickBackup {
  id: string;
  kind: 'manual' | 'auto';
  note: string | null;
  tableCount: number;
  sizeBytes: number;
  createdBy: string | null;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  manual: '수동', 'pre-delete': '삭제 전', 'pre-build': '빌드 전', nightly: '야간', auto: '자동',
};
const KIND_CLASS: Record<string, string> = {
  manual: 'bg-blue-100 text-blue-700', 'pre-delete': 'bg-red-100 text-red-700',
  'pre-build': 'bg-purple-100 text-purple-700', nightly: 'bg-gray-100 text-gray-600',
  auto: 'bg-gray-100 text-gray-600',
};

function humanSize(bytes: number): string {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), u.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function TenantBackups() {
  const session = useAuthStore((s) => s.session);
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();
  const slug = tenant?.slug ?? '';

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const baseUrl = host.startsWith('admin.')
    ? `https://api.${host.replace('admin.', '')}`
    : (import.meta.env.VITE_API_BASE_URL as string) || '';
  const authHeaders = { Authorization: `Bearer ${session?.accessToken ?? ''}` };
  const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [full, setFull] = useState<FullBackup[]>([]);
  const [quick, setQuick] = useState<QuickBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [includeFiles, setIncludeFiles] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [statusRes, fullRes, quickRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/admin/backups/status`, { headers: authHeaders }),
        fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/full-backups`, { headers: authHeaders }),
        fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/backups`, { headers: authHeaders }),
      ]);
      setConfigured(Boolean((await statusRes.json())?.data?.configured));
      setFull(((await fullRes.json())?.data ?? []) as FullBackup[]);
      setQuick(((await quickRes.json())?.data ?? []) as QuickBackup[]);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '백업 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, baseUrl]);

  useEffect(() => { void load(); }, [load]);

  // ── Full backup (R2) ────────────────────────────────────────────────
  const createFull = async () => {
    if (!slug || busy) return;
    setBusy('create-full');
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/full-backups`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ includeFiles, note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      showToast('success', `전체 백업 완료${includeFiles ? ' (파일 포함)' : ' (DB만)'}`);
      setNote('');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '백업 실패');
    } finally { setBusy(''); }
  };

  const restoreFull = async (b: FullBackup) => {
    if (!slug || busy) return;
    const typed = window.prompt(
      `⚠️ ${fmtDate(b.createdAt)} 시점으로 완전히 되돌립니다.\n현재 데이터는 모두 이 백업으로 대체되며, 이후 생긴 내용은 사라집니다 (되돌릴 수 없음).\n\n계속하려면 테넌트 슬러그 "${slug}" 를 입력하세요:`,
    );
    if (typed === null) return;
    if (typed.trim() !== slug) { showToast('error', '슬러그가 일치하지 않아 취소되었습니다.'); return; }
    const restoreFiles = b.includesFiles
      ? window.confirm('미디어 파일도 함께 복원할까요?\n확인 = 현재 파일을 백업 시점으로 교체 / 취소 = DB만 복원')
      : false;
    setBusy(`restore-full:${b.snapshotId}`);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/full-backups/${b.snapshotId}/restore`, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ restoreFiles }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      const j = await res.json();
      const r = j?.data ?? {};
      showToast('success', `복원 완료 — ${r.rows ?? 0}행${restoreFiles ? `, 파일 ${r.filesRestored ?? 0}개` : ''}`);
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '복원 실패');
    } finally { setBusy(''); }
  };

  const deleteFull = async (b: FullBackup) => {
    if (!slug || busy) return;
    if (!window.confirm(`${fmtDate(b.createdAt)} 전체 백업을 삭제합니다. 되돌릴 수 없습니다.`)) return;
    setBusy(`delete-full:${b.snapshotId}`);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/full-backups/${b.snapshotId}`, {
        method: 'DELETE', headers: authHeaders,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '백업을 삭제했습니다.');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    } finally { setBusy(''); }
  };

  // ── Quick in-DB snapshot ────────────────────────────────────────────
  const createQuick = async () => {
    if (!slug || busy) return;
    setBusy('create-quick');
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/backups`, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '빠른 스냅샷을 만들었습니다.');
      setNote('');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '스냅샷 실패');
    } finally { setBusy(''); }
  };
  const restoreQuick = async (b: QuickBackup) => {
    if (!slug || busy) return;
    if (!window.confirm(`${fmtDate(b.createdAt)} 스냅샷으로 복원합니다.\n현재 데이터가 대체됩니다. (복원 직전 상태는 자동 스냅샷되어 되돌릴 수 있습니다.)\n계속할까요?`)) return;
    setBusy(`restore-quick:${b.id}`);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/backups/${b.id}/restore`, { method: 'POST', headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '복원 완료 (복원 직전 상태도 자동 스냅샷됨)');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '복원 실패');
    } finally { setBusy(''); }
  };
  const deleteQuick = async (b: QuickBackup) => {
    if (!slug || busy) return;
    if (!window.confirm(`${fmtDate(b.createdAt)} 스냅샷을 삭제합니다.`)) return;
    setBusy(`delete-quick:${b.id}`);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${slug}/backups/${b.id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '스냅샷을 삭제했습니다.');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    } finally { setBusy(''); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">백업 / 복원</h1>
        <p className="text-sm text-gray-500 mt-1">이 테넌트를 백업하고 원하는 시점으로 복원합니다. (슈퍼어드민 전용)</p>
      </div>

      {/* ── Tier 1: R2 full backup ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">전체 백업 (재해 복구)</h2>
          <span className="text-[11px] text-gray-400">DB + 미디어 · 별도 R2 버킷</span>
        </div>

        {configured === false && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            백업 버킷이 설정되지 않았습니다. 서버 환경변수 <code className="font-mono">R2_BACKUP_BUCKET_NAME</code> 을 지정해야 전체 백업이 동작합니다.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-800">새 전체 백업</h3>
          <p className="mt-1 text-xs text-gray-500">
            DB 전체 + R2 미디어 파일을 별도 백업 버킷에 자기완결로 저장합니다. 운영 DB가 통째로 유실돼도 이 백업만으로 복구·재생성됩니다.
            (야간 자동 백업이 매일 실행되며 최근 7개 보관, 삭제 직전에도 자동 백업)
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
              placeholder="메모(선택)"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
              <input type="checkbox" checked={includeFiles} onChange={(e) => setIncludeFiles(e.target.checked)} />
              미디어 파일 포함
            </label>
            <button
              onClick={createFull}
              disabled={!slug || configured === false || busy === 'create-full'}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {busy === 'create-full' ? '백업 중…' : '전체 백업 만들기'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">전체 백업 목록 ({full.length})</h3>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-400">로딩 중…</div>
          ) : full.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">전체 백업이 없습니다.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {full.map((b) => (
                <div key={b.snapshotId} className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{fmtDate(b.createdAt)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${KIND_CLASS[b.kind]}`}>{KIND_LABEL[b.kind] ?? b.kind}</span>
                      {b.includesFiles
                        ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">파일 포함</span>
                        : <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">DB만</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 truncate">
                      {b.note || '메모 없음'}<span className="text-gray-300"> · </span>
                      {b.tableCount}테이블 · {b.rowCount.toLocaleString()}행
                      {b.includesFiles && <> · 파일 {b.fileCount.toLocaleString()}개 ({humanSize(b.fileBytes)})</>}
                      {b.createdBy && <> · {b.createdBy}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => restoreFull(b)} disabled={!!busy}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                      {busy === `restore-full:${b.snapshotId}` ? '복원 중…' : '복원'}
                    </button>
                    <button onClick={() => deleteFull(b)} disabled={!!busy}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
                      {busy === `delete-full:${b.snapshotId}` ? '삭제 중…' : '삭제'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Tier 2: quick in-DB snapshot ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">빠른 스냅샷</h2>
          <span className="text-[11px] text-gray-400">동일 DB 내 · 일상 되돌리기용 (재해 복구 아님)</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">DB 콘텐츠만 같은 데이터베이스 안에 빠르게 복사합니다. 최근 20개 보관.</p>
            <button onClick={createQuick} disabled={!slug || busy === 'create-quick'}
              className="px-3 py-1.5 rounded-lg border border-blue-600 text-blue-700 text-xs font-semibold hover:bg-blue-50 disabled:opacity-50 whitespace-nowrap">
              {busy === 'create-quick' ? '스냅샷 중…' : '빠른 스냅샷'}
            </button>
          </div>
          {quick.length > 0 && (
            <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
              {quick.map((b) => (
                <div key={b.id} className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{fmtDate(b.createdAt)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${KIND_CLASS[b.kind]}`}>{KIND_LABEL[b.kind] ?? b.kind}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 truncate">
                      {b.note || (b.kind === 'auto' ? '복원 직전 자동 스냅샷' : '메모 없음')}
                      <span className="text-gray-300"> · </span>{b.tableCount}테이블 · {humanSize(b.sizeBytes)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => restoreQuick(b)} disabled={!!busy}
                      className="px-2.5 py-1 rounded-lg border border-blue-600 text-blue-700 text-xs font-medium hover:bg-blue-50 disabled:opacity-50">복원</button>
                    <button onClick={() => deleteQuick(b)} disabled={!!busy}
                      className="px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
