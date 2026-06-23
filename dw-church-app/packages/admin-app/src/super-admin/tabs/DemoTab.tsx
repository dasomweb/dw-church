import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';

// ─── 데모 체험 (CRM 신청 + dasom 스냅샷/초기화 + 공유 접속정보) ──────────────
interface DemoRequest {
  id: string; name: string; churchName?: string; email: string;
  phone?: string; message?: string; status: string; memo?: string; createdAt: string;
}
const DEMO_STATUS_LABELS: Record<string, string> = {
  new: '신규', contacted: '연락함', sent: '접속정보 발송', archived: '보관',
};
const DEMO_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700', archived: 'bg-gray-100 text-gray-500',
};

export default function DemoTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [reqs, setReqs] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [snap, setSnap] = useState<{ exists: boolean; takenAt: string | null; tableCount: number | null } | null>(null);
  const [cfg, setCfg] = useState({ loginUrl: '', loginEmail: '', loginPassword: '', messageBody: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s, c] = await Promise.all([
        apiFetch<{ data: DemoRequest[] } | DemoRequest[]>('/demo-requests'),
        apiFetch<{ data: { exists: boolean; takenAt: string | null; tableCount: number | null } }>('/demo-tenant/status'),
        apiFetch<{ data: Record<string, string> | null }>('/demo-config'),
      ]);
      setReqs(Array.isArray(r) ? r : r.data ?? []);
      setSnap(s.data ?? null);
      const cc = c.data ?? {};
      setCfg({
        loginUrl: cc.loginUrl || '', loginEmail: cc.loginEmail || '',
        loginPassword: cc.loginPassword || '', messageBody: cc.messageBody || '',
      });
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);
  useEffect(() => { void load(); }, [load]);

  const doSnapshot = async () => {
    if (!window.confirm('현재 dasom의 상태를 "골든 스냅샷"으로 저장합니다. 이후 매일 밤 이 상태로 복원됩니다. 진행할까요?')) return;
    setBusy('snapshot');
    try {
      const r = await apiFetch<{ data: { tables: number } }>('/demo-tenant/snapshot', { method: 'POST', body: JSON.stringify({}) });
      showToast('success', `스냅샷 저장 완료 (${r.data.tables}개 테이블)`);
      await load();
    } catch (e) { showToast('error', e instanceof Error ? e.message : '스냅샷 실패'); } finally { setBusy(''); }
  };
  const doReset = async () => {
    if (!window.confirm('데모(dasom)를 마지막 스냅샷 상태로 즉시 초기화합니다.\n그 이후 쌓인 테스트 데이터는 모두 삭제됩니다. 진행할까요?')) return;
    setBusy('reset');
    try {
      const r = await apiFetch<{ data: { tables: number } }>('/demo-tenant/reset', { method: 'POST', body: JSON.stringify({}) });
      showToast('success', `초기화 완료 (${r.data.tables}개 테이블)`);
    } catch (e) { showToast('error', e instanceof Error ? e.message : '초기화 실패'); } finally { setBusy(''); }
  };
  const saveCfg = async () => {
    setBusy('cfg');
    try {
      await apiFetch('/demo-config', { method: 'PUT', body: JSON.stringify(cfg) });
      showToast('success', '데모 접속정보를 저장했습니다');
    } catch (e) { showToast('error', e instanceof Error ? e.message : '저장 실패'); } finally { setBusy(''); }
  };
  const sendAccess = async (id: string) => {
    setBusy('send-' + id);
    try {
      await apiFetch(`/demo-requests/${id}/send-access`, { method: 'POST' });
      showToast('success', '접속정보를 발송했습니다');
      await load();
    } catch (e) { showToast('error', e instanceof Error ? e.message : '발송 실패'); } finally { setBusy(''); }
  };
  const setStatus = async (id: string, status: string) => {
    try { await apiFetch(`/demo-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); }
    catch (e) { showToast('error', e instanceof Error ? e.message : '상태 변경 실패'); }
  };
  const del = async (id: string) => {
    if (!window.confirm('이 신청을 삭제할까요?')) return;
    try { await apiFetch(`/demo-requests/${id}`, { method: 'DELETE' }); await load(); }
    catch (e) { showToast('error', e instanceof Error ? e.message : '삭제 실패'); }
  };

  const fmt = (iso: string | null) => {
    if (!iso) return '없음';
    try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'America/New_York' }) + ' (ET)'; } catch { return iso; }
  };

  return (
    <div className="space-y-6">
      {/* 데모 테넌트 관리 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-900">데모 테넌트 (dasom) 관리</h3>
        <p className="mt-1 text-xs text-gray-500">
          매일 밤 <strong>새벽 3시(미 동부시간)</strong> 마지막 스냅샷 상태로 자동 복원됩니다. 데모 콘텐츠를 정리한 뒤 "스냅샷 저장"을 눌러 기준 상태를 갱신하세요.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${snap?.exists ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {snap?.exists ? `스냅샷 있음 · ${snap.tableCount ?? '?'}개 테이블` : '스냅샷 없음'}
          </span>
          <span className="text-xs text-gray-500">마지막 저장: {fmt(snap?.takenAt ?? null)}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={doSnapshot} disabled={busy === 'snapshot'}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
            {busy === 'snapshot' ? '저장 중…' : '현재 상태 스냅샷 저장'}
          </button>
          <button onClick={doReset} disabled={busy === 'reset' || !snap?.exists}
            className="rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
            {busy === 'reset' ? '초기화 중…' : '지금 초기화'}
          </button>
        </div>
      </div>

      {/* 데모 접속 안내 설정 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-900">데모 접속 안내 설정</h3>
        <p className="mt-1 text-xs text-gray-500">"접속정보 보내기"를 누르면 신청자별 임시 계정이 자동 발급됩니다.</p>
        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-800 leading-relaxed">
          • 아이디 = <strong>신청자 이메일</strong><br />
          • 비밀번호 = <strong>24시간 임시 난수</strong> (발송 시 자동 생성)<br />
          • 계정은 <strong>발급 후 24시간이 지나면 자동 삭제</strong>되며, 안내 메일에도 명시됩니다.
        </div>
        <div className="mt-3 grid gap-3">
          <label className="text-xs font-medium text-gray-600">접속 주소(URL)
            <input value={cfg.loginUrl} onChange={(e) => setCfg({ ...cfg, loginUrl: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="https://admin.truelight.app/t/dasom/login" />
          </label>
          <label className="text-xs font-medium text-gray-600">안내 메시지(선택)
            <textarea value={cfg.messageBody} onChange={(e) => setCfg({ ...cfg, messageBody: e.target.value })} rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="비워두면 기본 안내문이 발송됩니다." />
          </label>
        </div>
        <button onClick={saveCfg} disabled={busy === 'cfg'}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {busy === 'cfg' ? '저장 중…' : '안내 설정 저장'}
        </button>
      </div>

      {/* 데모 체험 신청 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">데모 체험 신청 ({reqs.length})</h3>
        </div>
        {loading ? <Spinner /> : reqs.length === 0 ? (
          <EmptyState message="아직 데모 체험 신청이 없습니다" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">이름 / 교회</th>
                  <th className="px-5 py-3">연락처</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">신청일</th>
                  <th className="px-5 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reqs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 align-top">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      {r.churchName && <div className="text-xs text-gray-500">{r.churchName}</div>}
                      {r.message && <div className="mt-1 text-xs text-gray-400 max-w-xs whitespace-pre-line">{r.message}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <div>{r.email}</div>
                      {r.phone && <div className="text-xs text-gray-400">{r.phone}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}
                        className={`rounded-md px-2 py-1 text-xs font-medium border-0 ${DEMO_STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {Object.entries(DEMO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{fmt(r.createdAt)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => sendAccess(r.id)} disabled={busy === 'send-' + r.id}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                        {busy === 'send-' + r.id ? '발송 중…' : '접속정보 보내기'}
                      </button>
                      <button onClick={() => del(r.id)} className="ml-2 text-xs text-gray-400 hover:text-red-600">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
