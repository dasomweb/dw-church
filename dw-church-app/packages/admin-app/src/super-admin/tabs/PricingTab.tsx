import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Pricing (상품/가격) ────────────────────────────
// ═══════════════════════════════════════════════════════════
// 가격 단일 출처(single source of truth). 여기서 정한 가격이 신청 폼과
// 신청서 결제 링크(Stripe Checkout) 생성에 그대로 적용된다. 금액은 모두
// "달러 정수" 단위(monthly 99 = $99/월, yearly 79 = 연 청구 시 $79/월,
// setupFee 500 = 1회 $500).
interface Plan {
  id: string;
  planKey: string;
  label: string;
  monthly: number;
  yearly: number;
  setupFee: number;
  sortOrder: number;
  isActive: boolean;
}

// 단일 플랜 편집 카드 — 로컬 편집 후 "저장" 클릭 시에만 서버에 PATCH(자동저장 없음).
function PricingPlanCard({ plan, onSaved }: { plan: Plan; onSaved: () => void }) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [label, setLabel] = useState(plan.label);
  const [monthly, setMonthly] = useState(String(plan.monthly));
  const [yearly, setYearly] = useState(String(plan.yearly));
  const [setupFee, setSetupFee] = useState(String(plan.setupFee));
  const [isActive, setIsActive] = useState(plan.isActive);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/pricing/${plan.planKey}`, {
        method: 'PATCH',
        body: JSON.stringify({
          label,
          // 정수 달러로 강제. 빈 입력/NaN 은 0 처리.
          monthly: Math.max(0, Math.round(Number(monthly) || 0)),
          yearly: Math.max(0, Math.round(Number(yearly) || 0)),
          setupFee: Math.max(0, Math.round(Number(setupFee) || 0)),
          isActive,
        }),
      });
      showToast('success', `${label || plan.planKey} 가격이 저장되었습니다.`);
      onSaved();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '가격 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border p-5 ${isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-blue-100 text-blue-700">
          {plan.planKey}
        </span>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          활성
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">표시명(label)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="플랜 이름"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">월 가격($/월)</label>
            <input
              type="number"
              min={0}
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">연 가격($/월, 연 청구)</label>
            <input
              type="number"
              min={0}
              value={yearly}
              onChange={(e) => setYearly(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">셋업비($, 1회)</label>
            <input
              type="number"
              min={0}
              value={setupFee}
              onChange={(e) => setSetupFee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}

const PROMO_PLAN_OPTIONS = [
  { key: 'light', label: '라이트' },
  { key: 'basic', label: '기본' },
  { key: 'plus', label: '플러스' },
  { key: 'pro', label: '프로' },
];

// 셋업비 할인 쿠폰(기간 한정) 관리. 신청자가 /apply 에서 코드를 입력하면 대상
// 플랜의 셋업비가 할인된다. 마감일이 지나면 자동으로 적용되지 않는다.
function PromoCard() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(false);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [discount, setDiscount] = useState('30');
  const [targets, setTargets] = useState<string[]>(['light', 'basic']);
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch<{ data: Record<string, unknown> | null } | Record<string, unknown>>('/admin/promo');
        const p = ((res as { data?: Record<string, unknown> }).data ?? res) as Record<string, unknown> | null;
        if (p && Object.keys(p).length) {
          setActive(!!p.active);
          setCode((p.code as string) || '');
          setLabel((p.label as string) || '');
          setDiscount(String(p.discountPercent ?? 30));
          setTargets(Array.isArray(p.targetPlans) ? (p.targetPlans as string[]) : ['light', 'basic']);
          setEndsAt(p.endsAt ? String(p.endsAt).slice(0, 10) : '');
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [apiFetch]);

  const toggleTarget = (k: string) =>
    setTargets((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/promo', {
        method: 'PUT',
        body: JSON.stringify({
          active,
          code: code.trim(),
          label: label.trim(),
          discountPercent: Math.max(0, Math.min(100, Number(discount) || 0)),
          targetPlans: targets,
          endsAt: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : null,
        }),
      });
      showToast('success', '프로모션을 저장했습니다.');
    } catch {
      showToast('error', '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;
  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full';

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-amber-800">🎟️ 프로모션 (셋업비 할인 쿠폰)</h3>
        <label className="flex items-center gap-2 text-sm font-medium text-amber-800">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
          활성화
        </label>
      </div>
      <p className="text-xs text-amber-700">신청자가 쿠폰 코드를 입력하면 아래 대상 플랜의 셋업비가 할인됩니다. 마감일이 지나면 자동으로 적용되지 않습니다.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">쿠폰 코드</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="예: OPEN30" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">할인율 (%)</label>
          <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputCls} min={0} max={100} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">안내 문구</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="오픈 기념 — 디자인 셋업비 30% 할인" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">마감일</label>
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">대상 플랜</label>
        <div className="flex flex-wrap gap-2">
          {PROMO_PLAN_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => toggleTarget(o.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${targets.includes(o.key) ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => void save()}
        disabled={saving}
        className="bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
      >
        {saving ? '저장 중...' : '프로모션 저장'}
      </button>
    </div>
  );
}

export default function PricingTab() {
  const apiFetch = useAdminApi();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Plan[] } | Plan[]>('/pricing');
      const list = Array.isArray(res) ? res : res.data ?? [];
      // sortOrder 오름차순으로 정렬해 표시.
      setPlans([...list].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      // non-fatal — 빈 상태로 표시
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">
          여기서 정한 가격이 신청서 결제 링크(Stripe)와 신청 폼에 적용됩니다.
          Stripe 대시보드에 상품을 따로 만들 필요가 없습니다.
        </p>
      </div>

      <PromoCard />

      {plans.length === 0 ? (
        <EmptyState message="등록된 가격 플랜이 없습니다." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((p) => (
            <PricingPlanCard key={p.planKey} plan={p} onSaved={() => void load()} />
          ))}
        </div>
      )}
    </div>
  );
}
