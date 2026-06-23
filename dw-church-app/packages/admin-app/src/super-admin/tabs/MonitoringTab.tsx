import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useAdminApi } from '../shared/use-admin-api';
import { StatCard, Spinner } from '../shared/admin-ui';
import { formatBytes } from '../shared/format';
import { PLAN_COLORS } from '../shared/constants';
import type { GlobalStats, Application } from '../shared/types';
import type { SupportTicket } from '../shared/support';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Monitoring (시스템 모니터링) ────────────────────────
// ═══════════════════════════════════════════════════════════
// Live platform health (GET /health, polled) + aggregated KPIs (/admin/stats)
// + operational queues (신규 신청 / 이단 의심 / 미처리 지원). App-level metrics
// only — there's no Railway infra integration. Health polls every 30s.

function formatUptime(seconds?: number): string {
  if (!seconds || seconds < 0) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export default function MonitoringTab({
  stats,
  loading,
  onRefresh,
}: {
  stats: GlobalStats | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const apiFetch = useAdminApi();
  const session = useAuthStore((s) => s.session);
  const [health, setHealth] = useState<{ status: string; version?: string; uptime?: number } | null>(null);
  const [healthErr, setHealthErr] = useState(false);
  const [newCount, setNewCount] = useState<number | null>(null);
  const [cultAlertCount, setCultAlertCount] = useState<number | null>(null);
  const [openSupportCount, setOpenSupportCount] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [services, setServices] = useState<{ key: string; label: string; status: string }[] | null>(null);

  const baseUrl = (() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  })();

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Authorization: `Bearer ${session?.accessToken || ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setHealth({ status: j.status ?? 'ok', version: j.version, uptime: j.uptime });
      setHealthErr(false);
    } catch {
      setHealth(null);
      setHealthErr(true);
    }
    setLastUpdated(new Date());
  }, [baseUrl, session?.accessToken]);

  const loadOps = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: Application[] } | Application[]>('/applications');
      const apps = Array.isArray(res) ? res : res.data ?? [];
      setNewCount(apps.filter((a) => a.status === 'new').length);
      setCultAlertCount(apps.filter((a) => a.denominationStatus === 'cult' && !a.denominationVerified).length);
    } catch {
      setNewCount(0);
      setCultAlertCount(0);
    }
    try {
      const res = await apiFetch<{ data: SupportTicket[] } | SupportTicket[]>('/support-tickets');
      const list = Array.isArray(res) ? res : res.data ?? [];
      setOpenSupportCount(list.filter((t) => t.status === 'open' || t.status === 'in_progress').length);
    } catch {
      setOpenSupportCount(0);
    }
  }, [apiFetch]);

  const loadServices = useCallback(async () => {
    try {
      type Svc = { key: string; label: string; status: string };
      const res = await apiFetch<{ data?: { services: Svc[] }; services?: Svc[] }>('/services-health');
      setServices(res.data?.services ?? res.services ?? []);
    } catch {
      setServices([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadHealth();
    void loadOps();
    void loadServices();
    // Poll health + service status every 30s so the dots stay live.
    const h = setInterval(() => { void loadHealth(); void loadServices(); }, 30000);
    return () => clearInterval(h);
  }, [loadHealth, loadOps, loadServices]);

  const refreshAll = () => {
    onRefresh();
    void loadHealth();
    void loadOps();
    void loadServices();
  };

  const ok = !!health && health.status === 'ok' && !healthErr;
  const inactiveTenants = stats ? Math.max(0, stats.totalTenants - stats.activeTenants) : 0;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">시스템 모니터링</h2>
          <p className="text-xs text-gray-500">
            {lastUpdated ? `마지막 업데이트 ${lastUpdated.toLocaleTimeString('ko-KR')}` : '불러오는 중…'} · 상태 30초마다 자동 갱신
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-3M20 15a8 8 0 01-14 3" /></svg>
          새로고침
        </button>
      </div>

      {/* System health banner */}
      <div className={`rounded-xl border p-5 ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`relative grid h-10 w-10 place-items-center rounded-full ${ok ? 'bg-green-100' : 'bg-red-100'}`}>
              <span className={`h-3 w-3 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
              {ok && <span className="absolute h-3 w-3 rounded-full bg-green-400 animate-ping" />}
            </span>
            <div>
              <p className={`text-base font-bold ${ok ? 'text-green-700' : 'text-red-700'}`}>
                {ok ? 'API 서버 정상' : 'API 서버 응답 없음'}
              </p>
              <p className={`text-xs ${ok ? 'text-green-600' : 'text-red-600'}`}>
                {ok ? 'api.truelight.app · /health 200 OK' : '/health 응답 실패 — 서버/네트워크 확인 필요'}
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-[11px] font-medium text-gray-500">버전</p>
              <p className="text-sm font-bold text-gray-900">{health?.version ?? '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">가동 시간</p>
              <p className="text-sm font-bold text-gray-900">{formatUptime(health?.uptime)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-service status — api / db / web / agents pinged server-side */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">서비스 상태</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(services ?? [{ key: 'api', label: 'API 서버', status: '' }, { key: 'db', label: '데이터베이스', status: '' }, { key: 'web', label: '웹사이트', status: '' }, { key: 'agents', label: 'AI 빌더(에이전트)', status: '' }]).map((s) => {
            const up = s.status === 'ok';
            const down = s.status === 'down';
            const unknown = s.status === 'unknown' || s.status === '';
            return (
              <div key={s.key} className={`flex items-center gap-2.5 rounded-lg border p-3 ${up ? 'border-green-200 bg-green-50/50' : down ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-gray-50'}`}>
                <span className={`relative grid h-2.5 w-2.5 place-items-center`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${up ? 'bg-green-500' : down ? 'bg-red-500' : 'bg-gray-300'}`} />
                  {up && <span className="absolute h-2.5 w-2.5 rounded-full bg-green-400 animate-ping" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.label}</p>
                  <p className={`text-[11px] ${up ? 'text-green-600' : down ? 'text-red-600' : 'text-gray-400'}`}>
                    {unknown ? '확인 중…' : up ? '정상' : '응답 없음'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational queues — surface anything that needs action */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-5 ${(newCount ?? 0) > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-sm font-medium text-gray-500">신규 신청서</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{newCount ?? '-'}</p>
          <p className="mt-0.5 text-xs text-gray-400">검토 대기 중인 신청</p>
        </div>
        <div className={`rounded-xl border p-5 ${(cultAlertCount ?? 0) > 0 ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-sm font-medium text-gray-500">이단 의심 신청</p>
          <p className={`mt-1 text-3xl font-bold ${(cultAlertCount ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>{cultAlertCount ?? '-'}</p>
          <p className="mt-0.5 text-xs text-gray-400">미확인 cult 분류</p>
        </div>
        <div className={`rounded-xl border p-5 ${(openSupportCount ?? 0) > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-sm font-medium text-gray-500">미처리 지원</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{openSupportCount ?? '-'}</p>
          <p className="mt-0.5 text-xs text-gray-400">대기 + 처리중</p>
        </div>
      </div>

      {/* Platform KPIs */}
      {loading && !stats ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard title="전체 교회" value={stats?.totalTenants ?? 0} color="blue" />
          <StatCard title="활성 교회" value={stats?.activeTenants ?? 0} color="green" subtitle={`비활성 ${inactiveTenants}`} />
          <StatCard title="전체 사용자" value={stats?.totalUsers ?? 0} color="indigo" />
          <StatCard title="전체 설교" value={stats?.totalSermons ?? 0} color="purple" />
          <StatCard title="총 저장공간" value={formatBytes(stats?.totalStorage ?? 0)} color="cyan" />
          <StatCard title="DB 크기" value={formatBytes(stats?.totalDbSize ?? 0)} color="rose" />
        </div>
      )}

      {/* Plan distribution */}
      {stats && stats.planBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">플랜 분포</h3>
          <div className="space-y-2.5">
            {stats.planBreakdown.map((p) => {
              const total = stats.totalTenants || 1;
              const pct = Math.round((p.count / total) * 100);
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <span className={`inline-flex w-20 justify-center px-2 py-1 rounded-md text-xs font-bold ${PLAN_COLORS[p.plan] || 'bg-gray-100 text-gray-600'}`}>
                    {p.plan.toUpperCase()}
                  </span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.plan === 'pro' ? 'bg-purple-500' : p.plan === 'basic' ? 'bg-blue-500' : p.plan === 'plus' ? 'bg-indigo-500' : p.plan === 'light' ? 'bg-cyan-500' : 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-bold text-gray-900">{p.count}</span>
                  <span className="w-9 text-right text-xs text-gray-400">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
