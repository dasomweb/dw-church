import { useState, useEffect } from 'react';
import { useAdminApi } from '../shared/use-admin-api';
import { StatCard, Spinner } from '../shared/admin-ui';
import { formatBytes } from '../shared/format';
import { PLAN_PRICES, PLAN_COLORS } from '../shared/constants';
import type { GlobalStats, Application } from '../shared/types';
import type { SupportTicket } from '../shared/support';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Overview ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function OverviewTab({
  stats,
  loading,
  onCreateChurch,
  onGoToApplications,
}: {
  stats: GlobalStats | null;
  loading: boolean;
  onCreateChurch: () => void;
  onGoToApplications: () => void;
}) {
  const apiFetch = useAdminApi();
  // 운영 대시보드용 신청서 요약 — 신규 신청 수 + 이단 의심(미확인) 경보 수.
  const [newCount, setNewCount] = useState<number | null>(null);
  const [cultAlertCount, setCultAlertCount] = useState<number | null>(null);
  // 미처리 지원 — open/in_progress 상태의 support 티켓 수.
  const [openSupportCount, setOpenSupportCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ data: Application[] } | Application[]>('/applications');
        const apps = Array.isArray(res) ? res : res.data ?? [];
        if (cancelled) return;
        setNewCount(apps.filter((a) => a.status === 'new').length);
        setCultAlertCount(
          apps.filter((a) => a.denominationStatus === 'cult' && !a.denominationVerified).length,
        );
      } catch {
        // non-fatal — overview just won't show the application metrics
        if (!cancelled) {
          setNewCount(0);
          setCultAlertCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ data: SupportTicket[] } | SupportTicket[]>('/support-tickets');
        const list = Array.isArray(res) ? res : res.data ?? [];
        if (cancelled) return;
        setOpenSupportCount(
          list.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
        );
      } catch {
        // non-fatal — overview just won't show the support metric
        if (!cancelled) setOpenSupportCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  if (loading && !stats) return <Spinner />;

  const mrr = stats
    ? stats.planBreakdown.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] ?? 0) * p.count, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* 이단 의심 경보 배너 — 미확인 cult 신청이 1건 이상이면 노출 */}
      {cultAlertCount != null && cultAlertCount > 0 && (
        <button
          onClick={onGoToApplications}
          className="w-full text-left rounded-xl border border-red-300 bg-red-50 px-5 py-4 hover:bg-red-100 transition-colors"
        >
          <p className="text-sm font-bold text-red-700">
            🚩 이단 의심 신청 {cultAlertCount}건 — 확인이 필요합니다.
          </p>
          <p className="mt-0.5 text-xs text-red-600">클릭하여 신청서 탭에서 검토하세요.</p>
        </button>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-4">
        <StatCard title="전체 교회" value={stats?.totalTenants ?? 0} color="blue" />
        <StatCard title="활성 교회" value={stats?.activeTenants ?? 0} color="green" />
        <StatCard title="전체 사용자" value={stats?.totalUsers ?? 0} color="indigo" />
        <StatCard title="전체 설교" value={stats?.totalSermons ?? 0} color="purple" />
        <StatCard title="총 저장공간" value={formatBytes(stats?.totalStorage ?? 0)} color="cyan" />
        <StatCard title="DB 크기" value={formatBytes(stats?.totalDbSize ?? 0)} color="rose" />
        <StatCard title="월 매출(MRR)" value={`$${mrr.toLocaleString()}`} color="amber" />
      </div>

      {/* 운영 지표 — 신청서 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="신규 신청서" value={newCount ?? '-'} color="blue" subtitle="status = 신규" />
        <StatCard
          title="🚩 이단 의심 신청"
          value={cultAlertCount ?? '-'}
          color="rose"
          subtitle="미확인 cult 분류"
        />
        <StatCard
          title="🎧 미처리 지원"
          value={openSupportCount ?? '-'}
          color="amber"
          subtitle="대기 + 처리중"
        />
      </div>

      {/* Plan Distribution */}
      {stats && stats.planBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">플랜 분포</h2>
          <div className="flex flex-wrap gap-4">
            {stats.planBreakdown.map((p) => {
              const total = stats.totalTenants || 1;
              const pct = Math.round((p.count / total) * 100);
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ${PLAN_COLORS[p.plan] || 'bg-gray-100'}`}>
                    {p.plan.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{p.count}</span>
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.plan === 'pro' ? 'bg-purple-500' : p.plan === 'basic' ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">빠른 작업</h2>
        <div className="flex gap-3">
          <button
            onClick={onCreateChurch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 교회 추가
          </button>
        </div>
      </div>
    </div>
  );
}
