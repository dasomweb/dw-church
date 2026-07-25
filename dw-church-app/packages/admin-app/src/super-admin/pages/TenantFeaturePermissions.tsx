/**
 * Tenant Feature Permissions — per-tenant exceptions on top of the PLAN defaults.
 * The plan (라이트/기본/플러스/프로) decides the baseline (server
 * config/plan-limits.ts FEATURE_TIERS); here a super-admin can grant or revoke
 * individual features for one tenant. Persisted to tenants.feature_overrides via
 * /admin/tenants/:id/feature-overrides, and consumed by GET /admin/entitlements
 * which gates the tenant's sidebar nav + page-editor block picker.
 *
 * Raw fetch (not the api-client) so the server's snake_case feature keys survive.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

// Display labels + grouping for the gated feature keys (must match server keys).
const FEATURES: { key: string; label: string; group: string }[] = [
  { key: 'albums', label: '사진 앨범', group: '기본 이상' },
  { key: 'history', label: '교회 연혁', group: '기본 이상' },
  { key: 'columns', label: '목회 칼럼', group: '기본 이상' },
  { key: 'video', label: '영상 게시판', group: '기본 이상' },
  { key: 'boards', label: '게시판(공지/선교 등)', group: '기본 이상' },
  { key: 'events', label: '행사', group: '기본 이상' },
  { key: 'banners', label: '메인 배너 슬라이드', group: '기본 이상' },
  { key: 'cells', label: '목장(셀) 관리', group: '플러스 이상' },
  { key: 'newcomer', label: '새가족 안내·등록 폼', group: '플러스 이상' },
  { key: 'newcomer_registration', label: '새가족 온라인 등록·교인관리', group: '프로' },
  { key: 'pwa', label: '모바일 앱(PWA)', group: '프로' },
];

const PLAN_LABEL: Record<string, string> = { light: '라이트', basic: '기본', plus: '플러스', pro: '프로' };

export default function TenantFeaturePermissions() {
  const session = useAuthStore((s) => s.session);
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const baseUrl = host.startsWith('admin.') ? `https://api.${host.replace('admin.', '')}` : (import.meta.env.VITE_API_BASE_URL as string) || '';
  const authHeaders = { Authorization: `Bearer ${session?.accessToken ?? ''}` };

  const [plan, setPlan] = useState('');
  const [defaults, setDefaults] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [prices, setPrices] = useState<Record<string, number>>({}); // feature_key → 월 단가
  const [planMonthly, setPlanMonthly] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [ovRes, priceRes, billRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/admin/tenants/${tenant.id}/feature-overrides`, { headers: authHeaders }),
        fetch(`${baseUrl}/api/v1/admin/feature-pricing`, { headers: authHeaders }),
        fetch(`${baseUrl}/api/v1/admin/tenants/${tenant.id}/billing-summary`, { headers: authHeaders }),
      ]);
      if (!ovRes.ok) throw new Error(`HTTP ${ovRes.status}`);
      const d = (await ovRes.json())?.data ?? {};
      setPlan(d.plan ?? '');
      setDefaults(d.defaults ?? {});
      setOverrides(d.overrides ?? {});
      const priceRows = ((await priceRes.json())?.data ?? []) as { feature_key: string; monthly: number }[];
      setPrices(Object.fromEntries(priceRows.map((r) => [r.feature_key, Number(r.monthly)])));
      setPlanMonthly(Number((await billRes.json())?.data?.planPrice?.monthly ?? 0));
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '로딩 실패');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, baseUrl]);

  useEffect(() => { void load(); }, [load]);

  const effective = (key: string) => (key in overrides ? overrides[key] : defaults[key]) ?? false;
  const isOverridden = (key: string) => key in overrides;
  // Billable add-on = enabled now but NOT included in the plan → charged at its
  // à-la-carte price (plan is a discounted bundle; plan features never charge).
  const isAddon = (key: string) => effective(key) && !(defaults[key] ?? false);
  const addonMonthly = FEATURES.reduce((s, f) => (isAddon(f.key) ? s + (prices[f.key] ?? 0) : s), 0);

  // Toggle the effective state. If the new value matches the plan default, drop
  // the override (follow the plan); otherwise record it as an explicit exception.
  const toggle = (key: string) => {
    const next = !effective(key);
    setOverrides((prev) => {
      const copy = { ...prev };
      if (next === (defaults[key] ?? false)) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  };

  const resetKey = (key: string) => setOverrides((prev) => { const c = { ...prev }; delete c[key]; return c; });

  const save = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${tenant.id}/feature-overrides`, {
        method: 'PUT', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ overrides }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '기능 권한을 저장했습니다.');
      await load();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '저장 실패');
    } finally { setSaving(false); }
  };

  const groups = Array.from(new Set(FEATURES.map((f) => f.group)));

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">기능 권한</h1>
      <p className="text-sm text-gray-500 mb-1">
        플랜(<b>{PLAN_LABEL[plan] ?? (plan || '...')}</b>)이 기본 사용 범위를 정합니다. 여기서 이 테넌트에만 개별 기능을 켜거나 끌 수 있습니다.
      </p>
      <p className="text-xs text-gray-400 mb-6">끄면 해당 기능이 테넌트 관리자 메뉴와 페이지 편집기 블록 목록에서 숨겨집니다.</p>

      {loading ? (
        <div className="text-sm text-gray-400">로딩 중…</div>
      ) : (
        <>
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <header className="px-4 py-2.5 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider">{group}</header>
                <ul className="divide-y divide-gray-100">
                  {FEATURES.filter((f) => f.group === group).map((f) => (
                    <li key={f.key} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {f.label}
                          {isOverridden(f.key) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">예외</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          플랜 기본: {defaults[f.key] ? '사용 가능' : '미포함'}
                          <span className="text-gray-300"> · </span>단가 ${prices[f.key] ?? 0}/월
                          {isAddon(f.key) && (
                            <span className="ml-1.5 font-semibold text-amber-600">애드온 +${prices[f.key] ?? 0}/월 청구</span>
                          )}
                          {isOverridden(f.key) && (
                            <button onClick={() => resetKey(f.key)} className="ml-2 text-blue-500 hover:underline">기본값으로</button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggle(f.key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${effective(f.key) ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${effective(f.key) ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* 예상 월요금 = 플랜(패키지) + 플랜 밖 애드온 개별 단가 합 */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">플랜 ({PLAN_LABEL[plan] ?? plan})</span>
              <span className="font-medium text-gray-900">${planMonthly}/월</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-gray-600">애드온 (플랜 밖 기능 {FEATURES.filter((f) => isAddon(f.key)).length}개)</span>
              <span className="font-medium text-amber-600">+${addonMonthly}/월</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
              <span className="font-semibold text-gray-900">예상 월요금</span>
              <span className="text-base font-bold text-gray-900">${planMonthly + addonMonthly}/월</span>
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">단가는 요금 관리(요금제)에서 수정합니다. 실제 청구(Stripe 자동 반영)는 다음 단계에서 연결됩니다.</p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? '저장 중…' : '저장'}
            </button>
            <span className="text-xs text-gray-400">예외 {Object.keys(overrides).length}개</span>
          </div>
        </>
      )}
    </div>
  );
}
