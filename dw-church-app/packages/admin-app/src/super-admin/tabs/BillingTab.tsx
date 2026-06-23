import { useState, useEffect } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState, StatCard } from '../shared/admin-ui';
import { PLAN_COLORS } from '../shared/constants';
import type { Tenant, TenantsResponse, Application } from '../shared/types';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Billing (과금) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════
// Phase 3 — 프론트엔드 집계 전용. 신규 백엔드 없음.
// MRR/ARR 는 활성 테넌트의 plan × 월 요금으로 산출하고, 셋업비는 신청서
// (status = paid/converted) 의 plan × 셋업비를 누적한다.

// ─── Billing constants (Phase 3) ─────────────────────────
// 4-tier 가격표 (2026-06 확정, 신청서/과금 집계용). PLAN_PRICES(개요 MRR용,
// basic/pro 2-tier 레거시)와 별개 — 과금 탭은 light/basic/plus/pro 4단계로 집계.
const BILLING_MONTHLY: Record<string, number> = { light: 59, basic: 99, plus: 149, pro: 199 };
const BILLING_SETUP: Record<string, number> = { light: 300, basic: 500, plus: 700, pro: 1000 };
// 과금 탭에 노출할 플랜 순서 (enterprise/free 등 그 외는 '기타'로 합산).
const BILLING_PLAN_ORDER = ['light', 'basic', 'plus', 'pro'] as const;
const BILLING_PLAN_LABELS: Record<string, string> = {
  light: 'Light', basic: 'Basic', plus: 'Plus', pro: 'Pro', 기타: '기타',
};

export default function BillingTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // TenantsTab 와 동일한 호출 형태({ data, meta }). 집계를 위해 전체 페이지를
        // 순회한다(과금 계산은 표본이 아닌 전수가 필요).
        const allTenants: Tenant[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await apiFetch<TenantsResponse>(`/tenants?page=${page}&perPage=100`);
          allTenants.push(...res.data);
          totalPages = res.meta?.totalPages ?? 1;
          page += 1;
        } while (page <= totalPages);

        const appRes = await apiFetch<{ data: Application[] } | Application[]>('/applications');
        const apps = Array.isArray(appRes) ? appRes : appRes.data ?? [];

        if (cancelled) return;
        setTenants(allTenants);
        setApplications(apps);
      } catch (err) {
        if (!cancelled) showToast('error', err instanceof Error ? err.message : '과금 데이터 로딩 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, showToast]);

  if (loading) return <Spinner />;

  // ── MRR: 활성 테넌트만 plan 별 집계. 알 수 없는 plan 은 '기타' 로 합산(요금 0). ──
  const activeTenants = tenants.filter((t) => t.isActive);
  type Tier = (typeof BILLING_PLAN_ORDER)[number] | '기타';
  const tierCounts: Record<string, number> = {};
  for (const t of activeTenants) {
    const plan = (t.plan || '').toLowerCase();
    const tier: Tier = (BILLING_PLAN_ORDER as readonly string[]).includes(plan) ? (plan as Tier) : '기타';
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  }
  const mrrRows = [...BILLING_PLAN_ORDER, ...(tierCounts['기타'] ? (['기타'] as const) : [])].map((tier) => {
    const count = tierCounts[tier] ?? 0;
    const monthly = BILLING_MONTHLY[tier] ?? 0; // '기타' → 0
    return { tier, count, total: count * monthly };
  });
  const mrr = mrrRows.reduce((sum, r) => sum + r.total, 0);
  const arr = mrr * 12;

  // ── 셋업비 수금: 신청서 status=paid|converted 의 plan 별 셋업비 누적. ──
  const paidApps = applications.filter((a) => a.status === 'paid' || a.status === 'converted');
  const collectedSetup = paidApps.reduce((sum, a) => sum + (a.plan ? BILLING_SETUP[a.plan] ?? 0 : 0), 0);
  // 승인됐지만 아직 미결제(=결제 대기) 신청서 수.
  const pendingPaymentCount = applications.filter((a) => a.status === 'approved').length;

  // ── Stripe 연동: 테넌트 응답에 stripe 필드가 있으면 연동/미연동 카운트, 없으면 안내. ──
  const hasStripeField = tenants.some(
    (t) => 'stripeSubscriptionId' in (t as object) || 'stripeCustomerId' in (t as object),
  );
  const stripeConnected = hasStripeField
    ? tenants.filter(
        (t) =>
          !!(t as { stripeSubscriptionId?: string }).stripeSubscriptionId ||
          !!(t as { stripeCustomerId?: string }).stripeCustomerId,
      ).length
    : 0;
  const stripeNotConnected = tenants.length - stripeConnected;

  return (
    <div className="space-y-6">
      {/* 핵심 지표 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="월 매출 (MRR)" value={`$${mrr.toLocaleString()}`} color="amber" subtitle="활성 교회 기준" />
        <StatCard title="연 매출 (ARR)" value={`$${arr.toLocaleString()}`} color="green" subtitle="MRR × 12" />
        <StatCard
          title="수금된 셋업비 (누적)"
          value={`$${collectedSetup.toLocaleString()}`}
          color="purple"
          subtitle={`결제완료/전환 신청 ${paidApps.length}건`}
        />
        <StatCard
          title="결제 대기 신청"
          value={pendingPaymentCount}
          color="rose"
          subtitle="status = 승인"
        />
      </div>

      {/* MRR by tier */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">플랜별 월 매출 (MRR)</h2>
        </div>
        {mrrRows.every((r) => r.count === 0) ? (
          <EmptyState message="활성 교회가 없습니다" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">플랜</th>
                  <th className="px-5 py-3">교회 수</th>
                  <th className="px-5 py-3">월 요금</th>
                  <th className="px-5 py-3 text-right">월 합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mrrRows.map((r) => (
                  <tr key={r.tier}>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[r.tier] || 'bg-gray-100 text-gray-600'}`}>
                        {BILLING_PLAN_LABELS[r.tier] ?? r.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{r.count}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {BILLING_MONTHLY[r.tier] ? `$${BILLING_MONTHLY[r.tier]}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">${r.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-gray-900">
                  <td className="px-5 py-3" colSpan={3}>합계 (MRR)</td>
                  <td className="px-5 py-3 text-right">${mrr.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Stripe 연동 상태 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Stripe 연동 상태</h2>
        {hasStripeField ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stripeConnected}</p>
              <p className="text-xs text-green-500 mt-1">연동됨</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{stripeNotConnected}</p>
              <p className="text-xs text-gray-500 mt-1">미연동</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 leading-relaxed">
            구독 결제(MRR 실수금)·결제 실패 현황은 Stripe 연동 활성화 후 표시됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
