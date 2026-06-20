import { useMemo, useState } from 'react';
import { useUsers } from '@dw-church/api-client';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

// Super-admin per-tenant console: OWNER-ONLY surface. The super-admin manages
// the owner account here; admin/editor accounts are created + managed by each
// church itself (in the tenant admin, gated by the plan's account limit). This
// replaces the full user-list management that used to live on this route.

// Client mirror of the server's PLAN_LIMITS.maxAdmins (owner included).
const PLAN_MAX_ACCOUNTS: Record<string, number> = { light: 2, basic: 3, plus: 5, pro: 10 };
const PLAN_ALIASES: Record<string, string> = {
  free: 'light', starter: 'light', essential: 'light', light: 'light',
  basic: 'basic', ministry: 'basic', plus: 'plus',
  pro: 'pro', outreach: 'pro', enterprise: 'pro',
};
function planMax(plan?: string): number {
  return PLAN_MAX_ACCOUNTS[PLAN_ALIASES[(plan ?? '').toLowerCase().trim()] ?? 'light'] ?? 2;
}

export default function TenantOwnerPanel() {
  const { tenant } = useSuperAdminTenant();
  const session = useAuthStore((s) => s.session);
  const { showToast } = useToast();
  const { data: users, isLoading } = useUsers();

  const owner = (users ?? []).find((u) => u.role === 'owner') ?? null;
  const accountCount = users?.length ?? 0;
  const maxAccounts = planMax(tenant?.plan);

  const baseUrl = useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  }, []);

  const [rotating, setRotating] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; expiresAt: string } | null>(null);

  const rotateSupport = async () => {
    if (!tenant?.id || rotating) return;
    setRotating(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${tenant.id}/rotate-support-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.accessToken ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCreds(await res.json());
      showToast('success', '지원용 임시 로그인 비밀번호를 발급했습니다 (24시간).');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '발급 실패');
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">오너 계정</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          슈퍼어드민은 각 교회의 <strong>오너 계정</strong>만 관리합니다. 관리자·편집자 계정은 각 교회가
          직접 추가·관리합니다(플랜별 계정 수 제한 적용).
        </p>
      </div>

      {/* Owner card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">오너 계정</h2>
        {isLoading ? (
          <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
        ) : owner ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-bold text-gray-900">{owner.name || '(이름 없음)'}</p>
              <p className="text-sm text-gray-500">{owner.email}</p>
            </div>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">소유자(Owner)</span>
          </div>
        ) : (
          <p className="text-sm text-gray-400">오너 계정을 찾을 수 없습니다.</p>
        )}
        <p className="mt-3 text-[11px] text-gray-400">오너 이메일·이름 변경은 ‘교회 관리’ 탭의 교회 상세에서 수정합니다.</p>
      </div>

      {/* Plan account quota */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">플랜 계정 한도</h2>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{(tenant?.plan ?? 'light').toUpperCase()}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{accountCount}</span>
          <span className="text-sm text-gray-400">/ {maxAccounts} 계정 (오너 포함)</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${accountCount >= maxAccounts ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, Math.round((accountCount / maxAccounts) * 100))}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          교회는 오너를 포함해 최대 {maxAccounts}개의 로그인 계정을 만들 수 있습니다. 더 필요하면 플랜을 업그레이드하세요.
        </p>
      </div>

      {/* Support login */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">지원용 임시 로그인</h2>
        <p className="text-xs text-gray-500 mb-3">
          교회를 대신해 점검/지원할 때 사용하는 24시간 임시 계정입니다. 오너의 실제 비밀번호는 변경되지 않습니다.
        </p>
        <button
          type="button"
          onClick={rotateSupport}
          disabled={rotating}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {rotating ? '발급 중…' : '임시 로그인 비밀번호 발급'}
        </button>
        {creds && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="text-amber-800"><span className="font-semibold">이메일:</span> <span className="font-mono">{creds.email}</span></p>
            <p className="text-amber-800"><span className="font-semibold">비밀번호:</span> <span className="font-mono">{creds.password}</span></p>
            <p className="mt-1 text-[11px] text-amber-600">만료: {new Date(creds.expiresAt).toLocaleString('ko-KR')} · 한 번만 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
