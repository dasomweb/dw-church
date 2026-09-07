/**
 * TenantAddonRequests — 이 테넌트의 부가기능(애드온) 신청 목록을 슈퍼어드민이
 * 승인/거절하는 페이지. 승인하면 서버가 feature_overrides 에 반영(=활성)하고,
 * 청구는 기능 권한 페이지의 'Stripe 청구 반영'으로 확정한다.
 * (대표님 2026-09-07 애드온 자가신청 흐름.)
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

interface AddonReq {
  id: string; feature_key: string; feature_label: string; status: string;
  note: string; requested_by: string; resolved_by: string; created_at: string; resolved_at: string | null;
}

const STATUS_LABEL: Record<string, string> = { requested: '검토 대기', approved: '승인됨', rejected: '거절됨' };

export default function TenantAddonRequests() {
  const session = useAuthStore((s) => s.session);
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const baseUrl = host.startsWith('admin.') ? `https://api.${host.replace('admin.', '')}` : (import.meta.env.VITE_API_BASE_URL as string) || '';
  const authHeaders = { Authorization: `Bearer ${session?.accessToken ?? ''}` };

  const [rows, setRows] = useState<AddonReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/addon-requests?tenantId=${tenant.id}`, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(((await res.json())?.data ?? []) as AddonReq[]);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '로딩 실패');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, baseUrl]);

  useEffect(() => { void load(); }, [load]);

  const resolve = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(id);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/addon-requests/${id}`, {
        method: 'PUT', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', status === 'approved' ? '승인 완료 — 기능이 활성화되었습니다. (청구는 기능 권한에서 Stripe 반영)' : '신청을 거절했습니다.');
      await load();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '처리 실패');
    } finally {
      setBusy(null);
    }
  };

  const pending = rows.filter((r) => r.status === 'requested');
  const resolved = rows.filter((r) => r.status !== 'requested');

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">애드온 신청</h1>
      <p className="text-sm text-gray-500 mb-6">이 교회가 신청한 부가기능입니다. 승인하면 즉시 활성화되고, 청구는 <b>기능 권한</b>에서 확정합니다.</p>

      {loading ? (
        <div className="text-sm text-gray-400">로딩 중…</div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">검토 대기 <span className="text-gray-400">· {pending.length}</span></h2>
          {pending.length === 0 ? (
            <div className="mb-6 text-sm text-gray-400">대기 중인 신청이 없습니다.</div>
          ) : (
            <ul className="mb-6 space-y-2">
              {pending.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{r.feature_label}</div>
                    <div className="text-[11px] text-gray-500">
                      신청: {r.requested_by || '—'} · {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      {r.note ? <span className="text-gray-400"> · “{r.note}”</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => resolve(r.id, 'approved')} disabled={busy === r.id}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">승인</button>
                    <button type="button" onClick={() => resolve(r.id, 'rejected')} disabled={busy === r.id}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-50">거절</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {resolved.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">처리 내역</h2>
              <ul className="space-y-1.5">
                {resolved.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-4 py-2 text-sm">
                    <span className="text-gray-800">{r.feature_label}</span>
                    <span className={`text-xs font-semibold ${r.status === 'approved' ? 'text-green-600' : 'text-gray-400'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                      {r.resolved_at ? <span className="ml-1 font-normal text-gray-400">· {new Date(r.resolved_at).toLocaleDateString('ko-KR')}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
